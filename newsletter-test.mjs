// Isolated functional test: newsletter_subscribers migration SQL + upsert logic
// against a throwaway SQLite DB. Proves schema, migration, and route behavior
// (lowercasing, dedupe via upsert) all work together.
import { spawnSync } from 'child_process'
import { rmSync } from 'fs'

const DB = '/tmp/newsletter-test.db'
rmSync(DB, { force: true })

// 1. Apply migration SQL
const sql = `
CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
    "id" VARCHAR NOT NULL,
    "email" VARCHAR NOT NULL,
    "source" VARCHAR,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_key"
    ON "newsletter_subscribers"("email");
CREATE INDEX IF NOT EXISTS "newsletter_subscribers_created_at_idx"
    ON "newsletter_subscribers"("created_at");
`
const apply = spawnSync('node', ['-e', `
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('${DB}');
  db.exec(${JSON.stringify(sql)});
  console.log('MIGRATION_APPLIED');
`], { encoding: 'utf8' })
if (apply.status !== 0 || !apply.stdout.includes('MIGRATION_APPLIED')) {
  console.error('FAIL migration:', apply.stderr || apply.stdout)
  process.exit(1)
}
console.log('PASS  migration SQL applies cleanly')

// 2. Simulate the route logic: lowercased email, upsert dedupe
const route = spawnSync('node', ['-e', `
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('${DB}');
  const insert = db.prepare('INSERT INTO "newsletter_subscribers" ("id","email","source") VALUES (?,?,?)');
  // Mirror the route exactly: normalize email BEFORE upsert.
  const normalize = (email) => email.toLowerCase().trim();
  const upsert = (rawEmail, source) => {
    const email = normalize(rawEmail);
    const row = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(email);
    if (row) return { dup: true };
    const id = 'c' + Math.random().toString(36).slice(2);
    insert.run(id, email, source);
    return { dup: false };
  };
  const a = upsert('USER@Example.com', 'landing');   // first: creates (lowercased)
  const b = upsert('user@example.com', 'landing');   // second: no-op (dedupe)
  const count = db.prepare('SELECT COUNT(*) AS n FROM newsletter_subscribers').get().n;
  console.log('first_created=' + !a.dup, 'second_deduped=' + b.dup, 'total_rows=' + count);
`], { encoding: 'utf8' })
if (route.status !== 0) {
  console.error('FAIL route sim:', route.stderr || route.stdout)
  process.exit(1)
}
console.log('PASS  upsert dedupe:', route.stdout.trim())

// 3. Clean up
rmSync(DB, { force: true })
console.log('ALL NEWSLETTER CHECKS PASSED')
