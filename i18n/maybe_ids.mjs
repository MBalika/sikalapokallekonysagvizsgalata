import fs from 'fs'; import path from 'path'; import { collect } from './catalog.mjs';
const [root, ...files] = process.argv.slice(2); const U = collect(root, files); const cache = {};
for (const u of U) { if (u.cls !== 'maybe') continue; const s = cache[u.file] || (cache[u.file] = fs.readFileSync(path.join(root, u.file), 'utf8'));
  console.log(`${u.id}\t${u.file}:${u.line}\t«${u.t}»\t${s.slice(Math.max(0, u.s - 50), u.s - 1).replace(/\s+/g, ' ')} ⟦…⟧ ${s.slice(u.e + 1, u.e + 30).replace(/\s+/g, ' ')}`); }
