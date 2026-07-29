/* eslint-disable @typescript-eslint/no-require-imports */
const autocannon = require('autocannon');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function runTest(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url: opts.url,
        connections: opts.connections,
        duration: opts.duration || 10,
        method: opts.method || 'GET',
        headers: opts.headers || {},
        body: opts.body || undefined,
        title: opts.title,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    autocannon.track(instance, { renderProgressBar: false });
  });
}

function printResult(title, result) {
  const lat = result.latency;
  const errors = result.errors || 0;
  const timeouts = result.timeouts || 0;
  console.log(`\n── ${title} ──`);
  console.log(`  Requests/sec : ${result.requests.average}`);
  console.log(`  Latency avg  : ${lat.average} ms`);
  console.log(`  Latency p50  : ${lat.p50} ms`);
  console.log(`  Latency p99  : ${lat.p99} ms`);
  console.log(`  Errors       : ${errors}  Timeouts: ${timeouts}`);
  console.log(`  Total reqs   : ${result.requests.total}`);
}

async function main() {
  console.log(`Load testing against ${BASE_URL}\n`);

  // 1. Health check — 100 concurrent
  const health = await runTest({
    title: 'GET /api/health (100 concurrent)',
    url: `${BASE_URL}/api/health`,
    connections: 100,
    duration: 10,
  });
  printResult('GET /api/health (100 concurrent)', health);

  // 2. Login — 50 concurrent (POST)
  const login = await runTest({
    title: 'POST /api/auth/login (50 concurrent)',
    url: `${BASE_URL}/api/auth/login`,
    connections: 50,
    duration: 10,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'loadtest@example.com',
      password: 'LoadTest123!',
    }),
  });
  printResult('POST /api/auth/login (50 concurrent)', login);

  // 3. Medications — 20 concurrent (authenticated)
  const cookie = process.env.AUTH_COOKIE || '';
  const meds = await runTest({
    title: 'GET /api/medications (20 concurrent, authenticated)',
    url: `${BASE_URL}/api/medications`,
    connections: 20,
    duration: 10,
    headers: cookie ? { Cookie: cookie } : {},
  });
  printResult('GET /api/medications (20 authenticated)', meds);

  // Summary
  console.log('\n════════════════════════════════════════════');
  console.log('  Summary');
  console.log('════════════════════════════════════════════');
  console.log(`  Health  : ${health.requests.average} req/s  |  avg ${health.latency.average}ms`);
  console.log(`  Login   : ${login.requests.average} req/s  |  avg ${login.latency.average}ms`);
  console.log(`  Meds    : ${meds.requests.average} req/s  |  avg ${meds.latency.average}ms`);
  console.log('════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Load test failed:', err.message);
  process.exit(1);
});
