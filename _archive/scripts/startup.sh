#!/bin/bash
set -e

echo "🚀 Starting Supabase-compatible service on Railway..."

# Start PostgreSQL in background
echo "📊 Starting PostgreSQL..."
su-exec postgres postgres -D /var/lib/postgresql/data &
POSTGRES_PID=$!

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10
until su-exec postgres pg_isready -h localhost; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "✅ PostgreSQL is ready!"

# Initialize schema
echo "📋 Initializing database schema..."
if [ -f "init_schema.sql" ]; then
  PGPASSWORD=$POSTGRES_PASSWORD su-exec postgres psql -h localhost -U postgres -d postgres -f init_schema.sql || echo "Schema already exists"
fi

echo "🎨 Starting Node.js API service..."
# Start Node.js service
node index.js
