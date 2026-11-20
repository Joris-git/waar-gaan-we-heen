// Stelt het wachtwoord van het wachtscherm in.
// Gebruik: node tools/wachtwoord-instellen.mjs "nieuwwachtwoord"   (leeg: "" = geen wachtscherm)
// Alleen letters en cijfers tellen; hoofdletters maken niet uit.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
const w = (process.argv[2] ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
const pad = ['instellingen.js', 'kluis/instellingen.js'].find((p) => existsSync(p));
if (!pad) { console.error('instellingen.js niet gevonden.'); process.exit(1); }
const require = createRequire(import.meta.url);
const G = require(join(process.cwd(), dirname(pad), 'sha256.js'));
let s = readFileSync(pad, 'utf8');
s = s.replace(/wachtwoordHash: '[^']*'/, `wachtwoordHash: '${w ? G.hash('boysinwonderland|wachtwoord|' + w) : ''}'`);
writeFileSync(pad, s);
console.log(w ? 'Wachtwoord ingesteld.' : 'Wachtscherm uitgezet.');
