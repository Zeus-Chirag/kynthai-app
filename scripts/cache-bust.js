// Updates the deploy cache-buster timestamp in globals.css on every build.
// This forces Turbopack to generate a new CSS content hash → new filename → cache bust.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'app', 'globals.css');
const content = fs.readFileSync(file, 'utf8');
const deployHash = '3fec38e9c7d6571f3e1e4f8a9b2c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3' + Date.now().toString(36);
const updated = content.replace(/--deploy-hash: [a-z0-9]+;/, `--deploy-hash: ${deployHash};`);
fs.writeFileSync(file, updated);
console.log('Cache buster updated:', file);
