#!/usr/bin/env node

/**
 * Check Database Schema Script
 * Verifies the current state of the topics table and determines if migration is needed
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : false
});

async function checkDatabaseSchema() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database');

    // Check topics table structure
    console.log('\n📋 Checking topics table schema...');
    
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'topics' 
      ORDER BY ordinal_position;
    `);

    if (schemaResult.rows.length === 0) {
      console.log('⚠️ Topics table does not exist');
      return;
    }

    console.log('\n📊 Topics table structure:');
    schemaResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}${row.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });

    // Check if topics.id is UUID or TEXT
    const idColumn = schemaResult.rows.find(row => row.column_name === 'id');
    if (idColumn) {
      if (idColumn.data_type === 'uuid') {
        console.log('\n⚠️ MIGRATION NEEDED: topics.id is UUID type but code expects TEXT');
        console.log('   Run: node scripts/migrate-topics-to-text-ids.sql');
      } else if (idColumn.data_type === 'text') {
        console.log('\n✅ Schema OK: topics.id is TEXT type as expected');
      }
    }

    // Check sample data if exists
    console.log('\n📊 Checking sample topic IDs...');
    const dataResult = await client.query('SELECT id, title FROM topics LIMIT 3');
    
    if (dataResult.rows.length > 0) {
      console.log('\nSample topic IDs:');
      dataResult.rows.forEach(row => {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.id);
        const isTextSlug = row.id.includes(':');
        console.log(`  ${row.id} (${row.title})`);
        console.log(`    Format: ${isUuid ? 'UUID' : isTextSlug ? 'Text Slug' : 'Unknown'}`);
      });
    } else {
      console.log('  No topics found in database');
    }

    // Check mind_maps table compatibility
    console.log('\n📋 Checking mind_maps.topic_id compatibility...');
    const mindMapResult = await client.query(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mind_maps' AND column_name = 'topic_id';
    `);

    if (mindMapResult.rows.length > 0) {
      const topicIdType = mindMapResult.rows[0].data_type;
      console.log(`  mind_maps.topic_id: ${topicIdType}`);
      
      if (idColumn && idColumn.data_type !== topicIdType) {
        console.log('  ⚠️ Type mismatch between topics.id and mind_maps.topic_id');
      } else {
        console.log('  ✅ Type compatibility OK');
      }
    }

  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  } finally {
    await client.end();
  }
}

// Run the check
checkDatabaseSchema()
  .then(() => {
    console.log('\n🎯 Database schema check completed');
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
