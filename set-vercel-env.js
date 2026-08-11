const { config } = require('dotenv');
config({ path: '/tmp/kynthai-touch/.env.local' });

const https = require('https');

const TOKEN = process.env.VERCEL_TOKEN || '';
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_dpUgXV1K1qALhpLePaV2p0IuWk1E';

// Environment variables to set
const vars = [
  { key: 'DATABASE_URL', value: process.env.DATABASE_URL || '' },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', value: process.env.NEXT_PUBLIC_SUPABASE_URL || '' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', value: process.env.SUPABASE_SERVICE_ROLE_KEY || '' },
  { key: 'SUPABASE_JWKS_URL', value: process.env.SUPABASE_JWKS_URL || '' },
  { key: 'ENCRYPTION_KEY', value: process.env.ENCRYPTION_KEY || '' },
  { key: 'SESSION_SECRET', value: process.env.SESSION_SECRET || '' },
  { key: 'SESSION_SIGNING_SECRET', value: process.env.SESSION_SIGNING_SECRET || '' },
  { key: 'ADMIN_EMAILS', value: process.env.ADMIN_EMAILS || 'admin@kynthai.app' },
  { key: 'ENABLE_DEMO', value: process.env.ENABLE_DEMO || 'false' },
  { key: 'NEXT_PUBLIC_ENABLE_DEMO', value: process.env.NEXT_PUBLIC_ENABLE_DEMO || 'false' },
  { key: 'CORS_ORIGIN', value: 'https://kynthai.app,https://www.kynthai.app' },
  { key: 'CLINE_API_KEY', value: process.env.CLINE_API_KEY || '' },
  { key: 'NVIDIA_API_KEY', value: process.env.NVIDIA_API_KEY || '' },
  { key: 'STRIPE_WEBHOOK_SECRET', value: process.env.STRIPE_WEBHOOK_SECRET || '' },
  { key: 'TWILIO_ACCOUNT_SID', value: process.env.TWILIO_ACCOUNT_SID || '' },
  { key: 'TWILIO_AUTH_TOKEN', value: process.env.TWILIO_AUTH_TOKEN || '' },
  { key: 'TWILIO_PHONE_NUMBER', value: process.env.TWILIO_PHONE_NUMBER || '' },
  { key: 'UPSTASH_REDIS_REST_URL', value: process.env.UPSTASH_REDIS_REST_URL || '' },
  { key: 'UPSTASH_REDIS_REST_TOKEN', value: process.env.UPSTASH_REDIS_REST_TOKEN || '' },
  { key: 'SUPABASE_URL', value: process.env.SUPABASE_URL || '' },
  { key: 'SENTRY_DSN', value: process.env.SENTRY_DSN || '' },
];

function postEnv(key, value) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ 
      key, 
      value, 
      target: ['production', 'preview', 'development'],
      gitDeploymentKey: false 
    });
    
    const req = https.request({
      hostname: 'api.vercel.com',
      port: 443,
      path: `/v9/projects/${PROJECT_ID}/env`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✓ ${key} = ${value ? value.slice(0,20)+'...' : '(empty)'}`);
          resolve();
        } else {
          console.log(`✗ ${key} failed: ${res.statusCode}`);
          resolve();
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  for (const v of vars) {
    if (v.value) {
      await postEnv(v.key, v.value);
    } else {
      console.log(`⊘ ${v.key} = (empty, skip)`);
    }
  }
  console.log('\n---\nEnvironment variables sent to Vercel.\n');
  console.log('MANUAL STEP REQUIRED: Add SENTRY_DSN from your Sentry project.');
})().catch(e => console.error(e));