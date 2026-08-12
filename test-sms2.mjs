const BASE = 'http://localhost:3002'
const COOKIE = 'kynthai-session=7370250b-5253-4b98-85a7-e995b0b470aa%3Ac321a887af0e31c0a983caaf8fe7c78ed5e903897e3c13915cdf8f8787c85d86'
const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { cookie: COOKIE } })
const csrf = await csrfRes.json()
const sc = (csrfRes.headers.get('set-cookie') || '').split(';')[0]
const t0 = Date.now()
const res = await fetch(`${BASE}/api/emergency-sos`, {
  method: 'POST',
  headers: { cookie: `${COOKIE}; ${sc}`, 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token },
  body: JSON.stringify({ location: 'SMS loop test 2', notes: 'SMS loop test 2', medicalInfo: '' }),
})
console.log('POST:', res.status, 'took', Date.now() - t0, 'ms')
console.log(JSON.stringify(await res.json()))
