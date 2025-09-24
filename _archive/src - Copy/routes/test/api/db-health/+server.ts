/**
 * Database Health Check API Endpoint
 * Tests direct PostgreSQL connection
 */

import { json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RequestHandler } from './$types';

// Only allow in development
if (!dev) {
  throw new Error('Database health check API is only available in development mode');
}

export const GET: RequestHandler = async () => {
  try {
    // Dynamic import to avoid bundling pg in production
    const { Client } = await import('pg');
    
    const dbConfig = {
      connectionString: 'postgresql://supabase_admin:kam8nkm2lwhsz6rsudtv6q5a5zw3tmzyuxz9w7wszm4etd8gn0zcm4a22vfyhsdk@mainline.proxy.rlwy.net:36402/postgres',
      ssl: false,
      connectTimeoutMillis: 5000
    };

    const client = new Client(dbConfig);

    try {
      await client.connect();
      
      // Test basic query
      const healthResult = await client.query('SELECT NOW() as current_time, version() as pg_version;');
      
      // Check tables
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('sessions', 'topics', 'mind_maps', 'sources', 'content_progress', 'ai_generations')
        ORDER BY table_name;
      `);
      
      // Check roles
      const rolesResult = await client.query(`
        SELECT rolname FROM pg_roles 
        WHERE rolname IN ('anon', 'authenticated', 'service_role', 'supabase_admin')
        ORDER BY rolname;
      `);

      await client.end();

      return json({
        success: true,
        data: {
          current_time: healthResult.rows[0].current_time,
          pg_version: healthResult.rows[0].pg_version,
          tables: tablesResult.rows.map(row => row.table_name),
          roles: rolesResult.rows.map(row => row.rolname),
          table_count: tablesResult.rows.length,
          role_count: rolesResult.rows.length
        }
      });

    } catch (dbError) {
      await client.end().catch(() => {}); // Ignore cleanup errors
      
      return json({
        success: false,
        error: `Database connection failed: ${dbError.message}`,
        details: {
          code: dbError.code,
          message: dbError.message
        }
      }, { status: 500 });
    }

  } catch (error) {
    return json({
      success: false,
      error: `Health check failed: ${error.message}`
    }, { status: 500 });
  }
};
