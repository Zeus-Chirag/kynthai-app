import https from 'https'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set as environment variables.')
  process.exit(1)
}

function execSQL(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql })
    const options = {
      hostname: SUPABASE_URL,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
        'Content-Length': Buffer.byteLength(body),
      },
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 204) {
          resolve(true)
        } else if (res.statusCode === 404) {
          // exec_sql function doesn't exist - need to create it first or use Management API
          console.log('    exec_sql not found (404)')
          resolve(false)
        } else {
          console.log(`    Error ${res.statusCode}: ${data.slice(0, 150)}`)
          resolve(false)
        }
      })
    })

    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

async function main() {
  // Try a simple SELECT first
  console.log('Testing connectivity...')
  const result = await execSQL('SELECT 1 as test')
  console.log('Result:', result)
}

main().catch(console.error)
