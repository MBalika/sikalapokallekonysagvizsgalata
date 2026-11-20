import { collect } from './catalog.mjs';
import fs from 'fs';
const root = new URL('../src', import.meta.url).pathname;
const files = process.argv.slice(2);
const en = {};
for (let i = 1; i <= 9; i++) for (const l of fs.readFileSync(`${new URL('.', import.meta.url).pathname}en_b0${i}.tsv`, 'utf8').split('\n')) { const k = l.indexOf('\t'); if (k > 0) en[l.slice(0, k)] = l.slice(k + 1); }
const U = collect(root, files); const seen = new Set(); let out = '', hu = '', eno = '';
for (const f of files) { out += `\n##### ${f}\n`; hu += `\n##### ${f}\n`; eno += `\n##### ${f}\n`;
  for (const u of U) { if (u.file !== f) continue; if (seen.has(u.id)) continue; const e = en[u.id] ?? en[u.id + '!']; if (u.cls !== 'hu' && e === undefined) { if (u.cls === 'maybe') { seen.add(u.id); out += `${u.id}\t${f}:${u.line}\t[maybe]\n  HU: ${u.t.replace(/\n/g, '⏎')}\n`; } continue; } seen.add(u.id);
    const t = u.t.replace(/\n/g, '⏎');
    out += `${u.id}\t${f}:${u.line}\t${u.cls}\n  HU: ${t}\n  EN: ${e === undefined ? '<<MISSING>>' : e === '=' ? '(=)' : e}\n`; hu += `${f}:${u.line}\t${t}\n`; eno += `${u.id}\t${e === '=' ? t : e}\n`; } }
fs.writeFileSync((process.env.OUT || '/tmp') + '/pairs.txt', out); fs.writeFileSync((process.env.OUT || '/tmp') + '/hu.txt', hu); fs.writeFileSync((process.env.OUT || '/tmp') + '/en.txt', eno);
console.log(seen.size);
