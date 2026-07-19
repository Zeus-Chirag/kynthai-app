# Load Testing

Uses [autocannon](https://github.com/mcollina/autocannon) to benchmark API endpoints.

## Setup

```bash
npm install
```

## Usage

```bash
npm run load-test
```

This runs all three test suites sequentially and prints a summary report.

### Individual tests

You can also run autocannon directly:

```bash
npx autocannon -c 100 http://localhost:3000/api/health
npx autocannon -c 50 -m POST -H "Content-Type=application/json" \
  -b '{"email":"test@test.com","password":"password"}' \
  http://localhost:3000/api/auth/login
```

## Configuration

Edit `test-api.js` to change:
- `BASE_URL` — target server (default: `http://localhost:3000`)
- Concurrent connection counts per endpoint
- Duration (default: 10s per test)

## Environment

The server must be running before executing load tests. For authenticated endpoints, set a valid session cookie or token.
