// Stelt de code en de film van het codescherm in.
// Gebruik: node tools/kluis-instellen.mjs "12.3456, -7.8901" "https://youtu.be/XXXXXXXXXXX"
// De film mag ook een bestandsnaam zijn, bijvoorbeeld "film/onthulling.mp4".
// Het script zet codeHash en filmGeheim in instellingen.js. De filmlink wordt versleuteld met de code.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';

const [code, filmArg, padArg] = process.argv.slice(2);
if (!code) { console.error('Gebruik: node tools/kluis-instellen.mjs "12.3456, -7.8901" "https://youtu.be/..."'); process.exit(1); }
const cijfers = code.replace(/\D/g, '');
if (cijfers.length !== 11) { console.error(`De code moet 11 cijfers hebben (nu ${cijfers.length}).`); process.exit(1); }

const pad = padArg || ['instellingen.js', 'kluis/instellingen.js'].find((p) => existsSync(p));
if (!pad) { console.error('instellingen.js niet gevonden. Draai dit vanuit de hoofdmap van de repository.'); process.exit(1); }
const require = createRequire(import.meta.url);
const G = require(join(process.cwd(), dirname(pad), 'sha256.js'));

function youtubeId(tekst) {
  const m = String(tekst).match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{11}$/.test(tekst) ? tekst : null;
}

let s = readFileSync(pad, 'utf8');
s = s.replace(/codeHash: '[^']*'/, `codeHash: '${G.hash('boysinwonderland|kluis|' + cijfers)}'`);
if (filmArg) {
  const id = youtubeId(filmArg);
  const bron = id ? { youtube: id } : { bestand: filmArg };
  s = s.replace(/filmGeheim: '[^']*'/, `filmGeheim: '${G.versleutel(JSON.stringify(bron), 'film|' + cijfers)}'`);
  console.log(id ? `YouTube-video ${id} versleuteld.` : `Bestand ${filmArg} versleuteld.`);
}
writeFileSync(pad, s);
console.log(`Klaar: ${pad} bijgewerkt.`);
