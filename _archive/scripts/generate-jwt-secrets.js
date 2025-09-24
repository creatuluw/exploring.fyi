// Generate JWT secrets for Supabase Railway deployment
// Based on: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Generate a secure JWT secret (32+ characters)
const jwtSecret = crypto.randomBytes(32).toString('hex');

console.log('🔐 Generated Supabase JWT Secrets for Railway Deployment');
console.log('='.repeat(60));
console.log();

console.log('1. JWT_SECRET (paste into AUTH_JWT_SECRET):');
console.log(jwtSecret);
console.log();

// Generate anon key
const anonPayload = {
  iss: 'supabase',
  role: 'anon',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};

const anonKey = jwt.sign(anonPayload, jwtSecret);

console.log('2. ANON_KEY (paste into SUPABASE_ANON_KEY):');
console.log(anonKey);
console.log();

// Generate service role key
const servicePayload = {
  iss: 'supabase',
  role: 'service_role',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
};

const serviceKey = jwt.sign(servicePayload, jwtSecret);

console.log('3. SERVICE_KEY (paste into SUPABASE_SERVICE_KEY):');
console.log(serviceKey);
console.log();

console.log('4. GOTRUE_SITE_URL (for now, use):');
console.log('https://your-railway-app.up.railway.app');
console.log();

console.log('🚀 Instructions:');
console.log('1. Go to https://railway.com/deploy/supabase');
console.log('2. Click "Deploy Now"');
console.log('3. Paste the above values into the respective environment variables');
console.log('4. Deploy and wait for all services to start');
console.log('5. Update your SvelteKit app to use the new Supabase URL');
console.log();

console.log('📋 Environment Variables Summary:');
console.log(`AUTH_JWT_SECRET=${jwtSecret}`);
console.log(`SUPABASE_ANON_KEY=${anonKey}`);
console.log(`SUPABASE_SERVICE_KEY=${serviceKey}`);
console.log('GOTRUE_SITE_URL=https://your-railway-app.up.railway.app');
console.log();

console.log('✅ All secrets generated successfully!');
console.log('🔗 Based on: https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys');
