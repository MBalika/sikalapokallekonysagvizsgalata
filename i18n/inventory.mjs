// áttekintés: egységek száma osztályonként (hu / maybe / code)
import { collect } from './catalog.mjs'; const [root, ...files] = process.argv.slice(2); const U = collect(root, files);
const by = {}; for (const u of U) { const k = u.cls + ':' + (u.q ? 'js' : 'html'); by[k] = by[k] || { n: 0, uniq: new Set(), c: 0 }; by[k].n++; if (!by[k].uniq.has(u.id)) { by[k].uniq.add(u.id); by[k].c += u.t.length; } }
for (const k in by) console.log(k.padEnd(12), 'egység', by[k].n, 'egyedi', by[k].uniq.size, 'karakter', by[k].c);
