// Updates the deploy cache-buster timestamp in globals.css on every build.
// This forces Turbopack to generate a new CSS content hash → new filename → cache bust.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'src', 'app', 'globals.css');
const content = fs.readFileSync(file, 'utf8');
const updated = content.replace(/deploy-[0-9]+/g, 'deploy-' + Date.now());
fs.writeFileSync(file, updated);
console.log('Cache buster updated:', file);
