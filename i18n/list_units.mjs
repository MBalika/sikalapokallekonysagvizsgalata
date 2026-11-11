// egyedi, fordítandó egységek listája: <id> <H|J><sor> «szöveg»  (cls = hu, vagy maybe ha MAYBE=1)
import { collect } from './catalog.mjs';
const [root, ...files] = process.argv.slice(2); const U = collect(root, files); const seen = new Set();
for (const u of U) { if (!(u.cls === 'hu' || (process.env.MAYBE && u.cls === 'maybe'))) continue; if (seen.has(u.id)) continue; seen.add(u.id); console.log(`${u.id} ${u.q ? 'J' : 'H'}${u.line} «${u.t.replace(/\n/g, '⏎')}»`); }
