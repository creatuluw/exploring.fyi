// Generate matching JWT secrets for Railway Supabase
const crypto = require('crypto')
const jwt = require('jsonwebtoken')

// Generate a consistent JWT secret
const jwtSecret = 'super-secret-jwt-key-min-32-chars-for-railway-supabase-deployment-2024'

console.log('🔐 Generating Matching JWT Secrets for Railway Supabase')
console.log('='.repeat(70))

console.log('\n1. JWT_SECRET (use in ALL services):')
console.log(jwtSecret)

// Generate anon key with this secret
const anonPayload = {
  iss: 'supabase',
  role: 'anon',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
}

const anonKey = jwt.sign(anonPayload, jwtSecret)
console.log('\n2. ANON_KEY:')
console.log(anonKey)

// Generate service role key with this secret
const servicePayload = {
  iss: 'supabase',
  role: 'service_role',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60) // 10 years
}

const serviceKey = jwt.sign(servicePayload, jwtSecret)
console.log('\n3. SERVICE_KEY:')
console.log(serviceKey)

console.log('\n🔧 Environment Variables to Set in Railway:')
console.log('='.repeat(70))
console.log('Kong Service:')
console.log(`  SUPABASE_ANON_KEY=${anonKey}`)
console.log(`  SUPABASE_SERVICE_KEY=${serviceKey}`)
console.log('')
console.log('Gotrue Auth Service:')
console.log(`  AUTH_JWT_SECRET=${jwtSecret}`)
console.log(`  GOTRUE_SITE_URL=https://kong-production-413c.up.railway.app`)
console.log('')
console.log('PostgREST Service:')
console.log(`  PGRST_JWT_SECRET=${jwtSecret}`)
console.log('')
console.log('Studio Service:')
console.log(`  AUTH_JWT_SECRET=${jwtSecret}`)
console.log(`  SUPABASE_ANON_KEY=${anonKey}`)
console.log(`  SUPABASE_SERVICE_KEY=${serviceKey}`)
console.log('')

console.log('🎯 After updating these variables:')
console.log('1. Restart all Railway services')
console.log('2. Wait for deployment to complete')
console.log('3. Run the test again: node tests/railway-supabase-test.js')
console.log('4. Update your SvelteKit app with the new keys')

// Test the generated tokens
console.log('\n🧪 Testing Generated Tokens:')
try {
  const decodedAnon = jwt.verify(anonKey, jwtSecret)
  console.log(`✅ Anon key valid: role=${decodedAnon.role}`)
  
  const decodedService = jwt.verify(serviceKey, jwtSecret)
  console.log(`✅ Service key valid: role=${decodedService.role}`)
} catch (error) {
  console.log(`❌ Token validation failed: ${error.message}`)
}
