// Zet de tekst van het eindscherm, versleuteld met de code.
// Gebruik: node tools/eindscherm-instellen.mjs "12.3456, -7.8901" eindscherm.json
// eindscherm.json: { "boven": "...", "land": "...", "regio": "...", "datum": "...", "punten": ["..."], "slot": "..." }
// Zet eindscherm.json zelf NIET in deze openbare repository.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';

const [code, jsonPad] = process.argv.slice(2);
if (!code || !jsonPad) { console.error('Gebruik: node tools/eindscherm-instellen.mjs "<code>" eindscherm.json'); process.exit(1); }
const cijfers = code.replace(/\D/g, '');
if (cijfers.length !== 11) { console.error(`De code moet 11 cijfers hebben (nu ${cijfers.length}).`); process.exit(1); }
const pad = ['instellingen.js', 'kluis/instellingen.js'].find((p) => existsSync(p));
if (!pad) { console.error('instellingen.js niet gevonden.'); process.exit(1); }
const require = createRequire(import.meta.url);
const G = require(join(process.cwd(), dirname(pad), 'sha256.js'));
const inhoud = JSON.parse(readFileSync(jsonPad, 'utf8'));
let s = readFileSync(pad, 'utf8');
if (!/eindGeheim: '[^']*'/.test(s)) { console.error('eindGeheim ontbreekt in instellingen.js.'); process.exit(1); }
s = s.replace(/eindGeheim: '[^']*'/, `eindGeheim: '${G.versleutel(JSON.stringify(inhoud), 'eind|' + cijfers)}'`);
writeFileSync(pad, s);
console.log(`Klaar: eindscherm versleuteld in ${pad}.`);
