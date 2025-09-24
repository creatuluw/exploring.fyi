/**
 * Create Database Tables using Direct PostgreSQL Connection
 * Uses the NEW Railway Supabase PostgreSQL database directly
 */

import pkg from 'pg';
const { Client } = pkg;

// New Railway PostgreSQL connection
const DATABASE_URL = 'postgresql://supabase_admin:b4bvb5bpmkd4bc9ohpif6xhe09x3a9pmbfn5vyrbgnhac0gjvvjqckgz5rc68cq6@shinkansen.proxy.rlwy.net:15819/postgres';

console.log('🚀 Creating database tables using direct PostgreSQL connection...');
console.log('📡 Connecting to NEW Railway PostgreSQL database...');

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: false // Railway usually doesn't require SSL for internal connections
});

async function createDatabaseTables() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL database!');

    // Enable UUID extension
    console.log('🔧 Enabling UUID extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('✅ UUID extension enabled');

    // Create all tables
    const tables = [
      {
        name: 'sessions',
        sql: `
          CREATE TABLE IF NOT EXISTS sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID DEFAULT NULL,
            settings JSONB DEFAULT '{}',
            last_activity TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            topic_count INTEGER DEFAULT 0
          );
        `
      },
      {
        name: 'topics',
        sql: `
          CREATE TABLE IF NOT EXISTS topics (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            session_id UUID NOT NULL,
            title TEXT NOT NULL,
            source_url TEXT DEFAULT NULL,
            source_type VARCHAR(10) NOT NULL CHECK (source_type IN ('topic', 'url')),
            mind_map_data JSONB DEFAULT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'mind_maps',
        sql: `
          CREATE TABLE IF NOT EXISTS mind_maps (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            topic_id UUID NOT NULL,
            nodes JSONB NOT NULL DEFAULT '[]',
            edges JSONB NOT NULL DEFAULT '[]',
            layout_data JSONB DEFAULT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'sources',
        sql: `
          CREATE TABLE IF NOT EXISTS sources (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            topic_id UUID NOT NULL,
            url TEXT NOT NULL,
            title TEXT NOT NULL,
            credibility_score NUMERIC(3,1) NOT NULL CHECK (credibility_score >= 0 AND credibility_score <= 10),
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      },
      {
        name: 'content_progress',
        sql: `
          CREATE TABLE IF NOT EXISTS content_progress (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            session_id UUID NOT NULL,
            topic_id UUID NOT NULL,
            section_id TEXT NOT NULL,
            progress_percentage NUMERIC(5,2) DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
            time_spent_seconds INTEGER DEFAULT 0,
            completed BOOLEAN DEFAULT FALSE,
            last_viewed TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(session_id, topic_id, section_id)
          );
        `
      },
      {
        name: 'ai_generations',
        sql: `
          CREATE TABLE IF NOT EXISTS ai_generations (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            topic_id UUID NOT NULL,
            content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('analysis', 'expansion', 'content_page')),
            input_data JSONB NOT NULL,
            generated_content JSONB DEFAULT NULL,
            processing_time_ms INTEGER DEFAULT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          );
        `
      }
    ];

    let successCount = 0;
    let errorCount = 0;

    // Create each table
    for (const table of tables) {
      try {
        console.log(`📊 Creating table: ${table.name}`);
        await client.query(table.sql);
        console.log(`✅ Created table: ${table.name}`);
        successCount++;
      } catch (error) {
        console.log(`❌ Error creating ${table.name}: ${error.message}`);
        errorCount++;
      }
    }

    // Create foreign key constraints
    console.log('\n🔗 Creating foreign key constraints...');
    
    const constraints = [
      {
        name: 'topics_session_id_fkey',
        sql: 'ALTER TABLE topics ADD CONSTRAINT IF NOT EXISTS topics_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;'
      },
      {
        name: 'mind_maps_topic_id_fkey',
        sql: 'ALTER TABLE mind_maps ADD CONSTRAINT IF NOT EXISTS mind_maps_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;'
      },
      {
        name: 'sources_topic_id_fkey',
        sql: 'ALTER TABLE sources ADD CONSTRAINT IF NOT EXISTS sources_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;'
      },
      {
        name: 'content_progress_session_id_fkey',
        sql: 'ALTER TABLE content_progress ADD CONSTRAINT IF NOT EXISTS content_progress_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;'
      },
      {
        name: 'content_progress_topic_id_fkey',
        sql: 'ALTER TABLE content_progress ADD CONSTRAINT IF NOT EXISTS content_progress_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;'
      },
      {
        name: 'ai_generations_topic_id_fkey',
        sql: 'ALTER TABLE ai_generations ADD CONSTRAINT IF NOT EXISTS ai_generations_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE;'
      }
    ];

    for (const constraint of constraints) {
      try {
        await client.query(constraint.sql);
        console.log(`✅ Created constraint: ${constraint.name}`);
      } catch (error) {
        console.log(`⚠️  Constraint ${constraint.name}: ${error.message}`);
      }
    }

    // Create indexes for performance
    console.log('\n⚡ Creating performance indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);',
      'CREATE INDEX IF NOT EXISTS idx_topics_session_id ON topics(session_id);',
      'CREATE INDEX IF NOT EXISTS idx_topics_created_at ON topics(created_at);',
      'CREATE INDEX IF NOT EXISTS idx_mind_maps_topic_id ON mind_maps(topic_id);',
      'CREATE INDEX IF NOT EXISTS idx_sources_topic_id ON sources(topic_id);',
      'CREATE INDEX IF NOT EXISTS idx_content_progress_session_id ON content_progress(session_id);',
      'CREATE INDEX IF NOT EXISTS idx_content_progress_topic_id ON content_progress(topic_id);',
      'CREATE INDEX IF NOT EXISTS idx_ai_generations_topic_id ON ai_generations(topic_id);'
    ];

    for (const indexSQL of indexes) {
      try {
        await client.query(indexSQL);
        console.log(`✅ Created index`);
      } catch (error) {
        console.log(`⚠️  Index: ${error.message}`);
      }
    }

    // Create update timestamp triggers
    console.log('\n🔄 Creating auto-update timestamp triggers...');
    
    // Create trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    const triggers = [
      'CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();',
      'CREATE TRIGGER update_mind_maps_updated_at BEFORE UPDATE ON mind_maps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();'
    ];

    for (const triggerSQL of triggers) {
      try {
        await client.query(triggerSQL);
        console.log(`✅ Created trigger`);
      } catch (error) {
        console.log(`⚠️  Trigger: ${error.message}`);
      }
    }

    console.log('\n📊 Final Results Summary:');
    console.log(`✅ Success: ${successCount} tables created`);
    console.log(`❌ Errors: ${errorCount} tables failed`);

    // Test the created tables
    await testTableAccess();

  } catch (error) {
    console.error('💥 Fatal error:', error.message);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

async function testTableAccess() {
  console.log('\n🧪 Testing table access and structure...');
  
  const tablesToTest = ['sessions', 'topics', 'mind_maps', 'sources', 'content_progress', 'ai_generations'];
  
  for (const tableName of tablesToTest) {
    try {
      const result = await client.query(`SELECT COUNT(*) FROM ${tableName};`);
      console.log(`✅ ${tableName}: Accessible (${result.rows[0].count} rows)`);
    } catch (error) {
      console.log(`❌ ${tableName}: ${error.message}`);
    }
  }

  // Test a basic insert to verify everything works
  console.log('\n🧪 Testing basic database operations...');
  
  try {
    // Insert a test session
    const sessionResult = await client.query(`
      INSERT INTO sessions (user_id, settings) 
      VALUES (NULL, '{"test": true}') 
      RETURNING id;
    `);
    const sessionId = sessionResult.rows[0].id;
    console.log(`✅ Test session created: ${sessionId}`);

    // Insert a test topic
    const topicResult = await client.query(`
      INSERT INTO topics (session_id, title, source_type) 
      VALUES ($1, 'Test Topic', 'topic') 
      RETURNING id;
    `, [sessionId]);
    const topicId = topicResult.rows[0].id;
    console.log(`✅ Test topic created: ${topicId}`);

    // Clean up test data
    await client.query('DELETE FROM topics WHERE title = $1;', ['Test Topic']);
    await client.query('DELETE FROM sessions WHERE id = $1;', [sessionId]);
    console.log(`✅ Test data cleaned up`);

    console.log('\n🎉 Database setup completed successfully!');
    console.log('🚀 Your application can now use the new Supabase instance!');

  } catch (error) {
    console.log(`❌ Test operations failed: ${error.message}`);
  }
}

// Run the creation process
createDatabaseTables();
