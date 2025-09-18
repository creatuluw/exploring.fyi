# Simple Supabase-compatible API service for Railway
# Using Node.js with SQLite for reliable deployment
FROM node:18-alpine

# Install sqlite3 and other dependencies
RUN apk add --no-cache sqlite curl

# Create app directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Install additional dependencies for SQLite
RUN npm install sqlite3 better-sqlite3

# Copy application files
COPY index.js ./
COPY volumes/db/init_schema.sql ./init_schema.sql

# Create data directory
RUN mkdir -p /app/data

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=sqlite:/app/data/supabase.db

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3000/api/platform/profile || exit 1

# Start the application
CMD ["node", "index.js"]