/**
 * Deploy cache buster — runs on every build via prebuild script.
 * Updates deploy-hash.ts and globals.css with unique timestamps
 * to force Turbopack to generate new JS/CSS filenames on every deploy.
 */
const fs = require('fs');
const path = require('path');

const timestamp = Date.now();
const hash = 'deploy-' + timestamp;

// 1. Update deploy-hash.ts (forces new JS filename)
const hashFile = path.join(__dirname, '..', 'src', 'lib', 'deploy-hash.ts');
const hashContent = `/**
 * Deploy cache buster — forces new JS/CSS filenames on every build.
 * Updated by scripts/cache-bust.js on every deploy.
 * DO NOT EDIT — this file is auto-generated.
 */
export const DEPLOY_HASH = '${hash}'
`;
fs.writeFileSync(hashFile, hashContent);
console.log('Updated deploy-hash.ts:', hash);

// 2. Update globals.css deploy rule (forces new CSS filename)
const cssFile = path.join(__dirname, '..', 'src', 'app', 'globals.css');
const cssContent = fs.readFileSync(cssFile, 'utf8');
const updated = cssContent.replace(/\.deploy-[a-z0-9]+ \{ display: none !important; \}/, `.deploy-${hash} { display: none !important; }`);
fs.writeFileSync(cssFile, updated);
console.log('Updated globals.css deploy rule:', hash);
