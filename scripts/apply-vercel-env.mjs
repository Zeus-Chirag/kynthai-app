#!/usr/bin/env node
// Apply env vars to a Vercel project across all 3 environments.
//
// Reads definitions from a JSON file (gitignored) so secrets never get
// committed. Schema:
//   { "projectId": "prj_xxx", "vars": [ { "key": "...", "value": "...", "type": "plain"|"sensitive" } ] }
//
// Usage:
//   VERCEL_TOKEN=... node scripts/apply-vercel-env.mjs scripts/.vercel-env.local.json
//
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) { console.error('VERCEL_TOKEN env var not set'); process.exit(1); }

const INPUT = process.argv[2] || 'scripts/.vercel-env.local.json';
const HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};
const BASE = 'https://api.vercel.com';

const cfg = JSON.parse(readFileSync(resolve(INPUT), 'utf8'));
const PROJECT_ID = cfg.projectId;
if (!PROJECT_ID) { console.error('projectId missing in input JSON'); process.exit(1); }
if (!Array.isArray(cfg.vars) || cfg.vars.length === 0) { console.error('vars[] missing or empty'); process.exit(1); }

const TARGETS_ALL  = ['production', 'preview', 'development'];
const TARGETS_PROD = ['production', 'preview'];   // Vercel policy: sensitive vars cannot target development

async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...HEADERS, ...(opts.headers || {}) } });
  const text = await res.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  return body;
}

async function getExisting() {
  const { envs } = await api(`/v9/projects/${PROJECT_ID}/env`);
  return new Map(envs.map((e) => [e.key, e]));
}

async function upsertVar(v, existing) {
  if (existing.has(v.key)) {
    const e = existing.get(v.key);
    // PATCH must keep the existing type — Vercel rejects type changes on sensitive vars.
    const type = e.type;
    const target = type === 'sensitive' ? TARGETS_PROD : TARGETS_ALL;
    await api(`/v9/projects/${PROJECT_ID}/env/${e.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ value: v.value, target }),
    });
    return 'updated';
  } else {
    const target = v.type === 'sensitive' ? TARGETS_PROD : TARGETS_ALL;
    await api(`/v9/projects/${PROJECT_ID}/env`, {
      method: 'POST',
      body: JSON.stringify({ key: v.key, value: v.value, type: v.type, target }),
    });
    return 'created';
  }
}

(async () => {
  const existing = await getExisting();
  console.log(`Project ${PROJECT_ID} — existing env vars: ${existing.size}`);
  console.log(`Applying ${cfg.vars.length} definitions from ${INPUT}…\n`);

  let created = 0, updated = 0, failed = 0;
  for (const v of cfg.vars) {
    try {
      const action = await upsertVar(v, existing);
      if (action === 'created') created++; else updated++;
      console.log(`  ${action.padEnd(7)}  ${v.key}`);
    } catch (err) {
      failed++;
      console.error(`  FAILED   ${v.key}: ${err.message}`);
    }
  }
  console.log(`\nDone. created=${created} updated=${updated} failed=${failed}`);
  if (failed) process.exit(1);
})();
