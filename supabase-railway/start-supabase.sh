#!/bin/bash
set -e

echo "🚀 Starting Supabase on Railway using Docker Compose..."

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | xargs)
fi

# Start Docker daemon in background (Railway provides Docker socket)
echo "🐳 Starting Docker services..."

# Use docker-compose to start all Supabase services
docker-compose up -d

echo "⏳ Waiting for services to be ready..."

# Wait for analytics service to be healthy (dependency for others)
until docker-compose exec analytics curl -f http://localhost:4000/health > /dev/null 2>&1; do
  echo "Analytics service not ready, waiting..."
  sleep 5
done

# Wait for database to be ready
until docker-compose exec db pg_isready -U postgres > /dev/null 2>&1; do
  echo "Database not ready, waiting..."
  sleep 5
done

echo "✅ All services are ready!"

# Initialize our application schema
echo "📊 Initializing application schema..."
if [ -f "volumes/db/init_schema.sql" ]; then
  docker-compose exec -T db psql -U postgres -d postgres < volumes/db/init_schema.sql || echo "Schema already exists"
fi

echo "🎨 Supabase Studio available on port 3000"
echo "🔗 Kong API Gateway available on port 8000"

# Keep the container running by following studio logs
docker-compose logs -f studio
