// kód-osztályú egységek, amelyekben mégis szavak vannak (ellenőrzéshez)
import { collect } from './catalog.mjs'; const [root, ...files] = process.argv.slice(2); const seen = new Set();
for (const u of collect(root, files)) { if (u.cls !== 'code' || seen.has(u.id)) continue; seen.add(u.id); const t = u.t.replace(/\$\{[^}]*\}/g, ' ');
  if (/\p{L}{3,}/u.test(t) && /\s/.test(t.trim()) && !/^(M|m|L|l|C|c|Q|q|H|V|A|a)?[\d\s.,-]+/.test(t.trim()) && !/[{};]|px|rgba|var\(|translate|rotate|url\(/.test(t)) console.log(u.id + '\t' + u.file + ':' + u.line + '\t' + u.t.slice(0, 100)); }
