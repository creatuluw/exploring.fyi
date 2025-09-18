#!/bin/bash
set -e

echo "🚀 Deploying Supabase to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo "🔐 Checking Railway authentication..."
railway login

# Create or link to Railway project
echo "📦 Setting up Railway project..."
if [ ! -f ".railway" ]; then
    railway init exploring-fyi-supabase
else
    railway link
fi

# Set environment variables
echo "🔧 Setting up environment variables..."
railway variables set POSTGRES_PASSWORD="$(openssl rand -base64 32)"
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set SECRET_KEY_BASE="$(openssl rand -base64 32)"
railway variables set VAULT_ENC_KEY="$(openssl rand -base64 32)"
railway variables set DASHBOARD_PASSWORD="$(openssl rand -base64 16)"

# Use the existing demo keys (for development)
railway variables set ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
railway variables set SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

# Set other configuration
railway variables set POSTGRES_HOST="db"
railway variables set POSTGRES_DB="postgres"
railway variables set POSTGRES_PORT="5432"
railway variables set KONG_HTTP_PORT="8000"
railway variables set KONG_HTTPS_PORT="8443"
railway variables set ENABLE_ANONYMOUS_USERS="true"
railway variables set ENABLE_EMAIL_AUTOCONFIRM="true"

# Deploy to Railway
echo "🚢 Deploying to Railway..."
railway up --detach

echo "✅ Deployment initiated!"
echo "🔗 Check deployment status: railway logs"
echo "🌐 Your Supabase instance will be available at: $(railway domain)"

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
sleep 30

# Show the public URL
PUBLIC_URL=$(railway domain 2>/dev/null || echo "")
if [ -n "$PUBLIC_URL" ]; then
    echo "🎉 Supabase deployed successfully!"
    echo "📊 Supabase Studio: $PUBLIC_URL"
    echo "🔌 API Endpoint: $PUBLIC_URL/rest/v1/"
    echo "🔐 Auth Endpoint: $PUBLIC_URL/auth/v1/"
    echo "📡 Realtime Endpoint: $PUBLIC_URL/realtime/v1/"
else
    echo "⚠️ Deployment in progress. Check 'railway logs' for status."
fi
