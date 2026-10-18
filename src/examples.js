/* ===== Mintapéldák (MP1–MP9) – adatok, megjelenítés, kalkulátorba töltés ===== */
(function () {
  'use strict';
  const C = window.CALC; if (!C || !C.util) return;
  const { sb, nw, fl, u_, NB, NN, DA2, DA3 } = C.util, F = C.F;
  const S_ = (x) => x.replace(/ /g, NB); // rövid kifejezés egyben
  const guardAll = (el) => { if (!el) return; if (window.U && window.U.guardAll) window.U.guardAll(el); else if (C.guard) C.guard(el); };
  const Vk = 'V′<sub>k</sub>', Hd = 'H<sub>d</sub>', Rd = 'R<sub>d</sub>', Rpd = 'R<sub>p;d</sub>', phicv = 'φ′<sub>cv;k</sub>', dk = 'δ<sub>k</sub>', gRh = 'γ<sub>R;h</sub>';
  const ICON = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="3" width="15" height="14" rx="2.5"/><path d="M6 13l3-3 2 2 3-4"/></svg>';

  // ---------------- kalkulátor-bemenetek ----------------
  const P = {
    mp1: { tab: 'sliding', input: { shape: 'strip', load: 'design', Vk: 280, Hd: 90, phicv: 32, an: 'drained', cast: 'cast', nu: 0, B: 2.0, D: 1.0, hf: 0.6 } },
    mp2a: { tab: 'sliding', input: { shape: 'strip', load: 'design', Vk: 280, Hd: 105, phicv: 32, an: 'drained', cast: 'cast', nu: 0, B: 2.0, D: 1.0, hf: 0.6 } },
    mp2b: { tab: 'sliding', input: { shape: 'strip', load: 'design', Vk: 280, Hd: 105, phicv: 32, an: 'drained', cast: 'precast', nu: 0, B: 2.0, D: 1.0, hf: 0.6 } },
    mp3: { tab: 'sliding', input: { shape: 'pad', B: 2.0, L: 3.0, D: 1.2, hf: 0.8, load: 'design', Vk: 700, Vd: 700, Hd: 250, eB: 0, eL: 0, an: 'undrained', cu: 60, nu: 0 } },
    mp4a: { tab: 'sliding', input: { shape: 'strip', B: 2.2, D: 1.5, hf: 0.7, load: 'design', Vk: 250, Hd: 140, an: 'drained', cast: 'cast', phicv: 30, gam: 18, phiP: 30, cP: 0, nu: 0, pH: 'full' } },
    mp4b: { tab: 'sliding', input: { shape: 'strip', B: 2.2, D: 1.5, hf: 0.7, load: 'design', Vk: 250, Hd: 140, an: 'drained', cast: 'cast', phicv: 30, gam: 18, phiP: 30, cP: 0, nu: 0.5, pH: 'full' } },
    mp5a: { tab: 'overturn', input: { shape: 'rect', B: 2.4, L: 2.4, Df: 1.0, hf: 0.8, ground: 'soil', selfw: false, Gk: 400, eGB: 0, Qk: 0, HGk: 0, HQk: 60, hQ: 4.0, two: false } },
    mp5b: { tab: 'overturn', input: { shape: 'rect', B: 2.6, L: 2.6, Df: 1.0, hf: 0.8, ground: 'soil', selfw: false, Gk: 400, eGB: 0, Qk: 0, HGk: 0, HQk: 60, hQ: 4.0, two: false } },
    mp5c: { tab: 'overturn', input: { shape: 'rect', B: 2.4, L: 2.4, Df: 1.0, hf: 0.8, ground: 'rock', selfw: false, Gk: 400, eGB: 0, Qk: 0, HGk: 0, HQk: 60, hQ: 4.0, two: false } },
    mp6a: { tab: 'overturn', input: { shape: 'rect', B: 2.4, L: 2.4, Df: 1.0, hf: 0.8, ground: 'soil', selfw: false, Gk: 500, eGB: 0, Qk: 0, HGk: 0, HQk: 50, hQ: 3.0, two: false } },
    mp6b: { tab: 'overturn', input: { shape: 'rect', B: 2.4, L: 2.4, Df: 1.0, hf: 0.8, ground: 'soil', selfw: false, Gk: 500, eGB: 0, Qk: 0, HGk: 0, HQk: 100, hQ: 3.0, two: false } },
    mp7: { tab: 'uplift', input: { L: 30, B: 12, H: 4.2, D: 5.0, dw: 1.0, gMode: 'direct', Gk: 11000, Gadd: 0, tc: 0.8, o: 0, gam: 18, gsat: 20, hb: 0, Qdst: 0, fric: false, n: 0, Rk: 210 } },
    mp8: { tab: 'uplift', input: { L: 30, B: 12, H: 4.2, D: 4.2, dw: 0.2, gMode: 'direct', Gk: 11000, Gadd: 0, tc: 0, o: 0, gam: 18, gsat: 20, hb: 0, Qdst: 0, fric: false, n: 30, Rk: 210 } },
    mp9a: { tab: 'slope', input: { H: 8, n: 1.5, an: 'drained', gam: 19, c: 14, phi: 28, lay2: false, dR: 6, water: 'none', ru: 0, gm: 1.35, f1: true, f1B: 0.6, f1a: 0.5, f1D: 0.8, f1G: 72, f1Q: 18, f2: true, f2B: 0.6, f2a: 2.9, f2D: 0.8, f2G: 72, f2Q: 18, fine: false } },
  };
  P.mp9b = { tab: 'slope', input: { ...P.mp9a.input, water: 'ru', ru: 0.2 } };

  // ---------------- a kilenc példa ----------------
  const EX = [
    { id: 'mp1', sub: 'GEO · drénezett', n: 'MP1', k: 'k1', title: 'Elcsúszás drénezett állapotban – helyben betonozott sávalap', short: 'Drénezett elcsúszás', tags: ['GEO', DA2, 'drénezett'],
      task: `<p>Ellenőrizd az ábrán látható, helyben betonozott sávalap elcsúszási biztonságát drénezett (hosszú távú) állapotban! A terhek méterenként: ${nw(Vk + ' = 280 kN/m')} – a ${Hd}-vel biztosan együtt működő függőleges erő karakterisztikus értéke; ${nw(Hd + ' = 90 kN/m')} – a vízszintes erő tervezési értéke, benne az aktív földnyomással. Az altalaj kritikus állapotbeli súrlódási szöge ${nw(phicv + ' = 32°')}. A földellenállást nem vesszük figyelembe.</p>`,
      data: [[Vk, '280 kN/m'], [Hd, '90 kN/m'], [phicv, '32°'], ['kivitel', 'helyben betonozott'], [gRh, '1,1']],
      fig: { p: 'mp1', dims: [], cap: 'Helyben betonozott sávalap: a súrlódás a talajban jön létre, δ<sub>k</sub> = φ′<sub>cv;k</sub>.' },
      steps: [
        { t: 'A súrlódási szög az alapsíkon', r: dk + ' = 32°', b: `<p>Helyben betonozott alaptestnél a talp érdes, a nyírás a talajban jön létre, ezért a teljes kritikus állapotbeli súrlódási szög figyelembe vehető:</p>${fl(dk, phicv, '32°')}${fl('tg' + NB + dk, 'tg' + NB + '32°', '0,6249')}` },
        { t: 'A nyírási ellenállás tervezési értéke', r: Rd + ' = 159,1 kN/m', b: `${fl(Rd, `${Vk} · tg${NB}${dk} / ${gRh}`, '280 · 0,6249 / 1,1', u_(159.06, 1, 'kN/m'))}<p>A c′ hatékony kohéziót az ${nw('MSZ EN 1997‑1')} szerint figyelmen kívül hagyjuk: a talaj és a beton közötti tapadás a víztartalomtól erősen függ, nem megbízható.</p>` },
        { t: 'Igazolás', r: 'Λ = 0,57', b: `${fl(Hd + ' = 90 kN/m ≤ ' + Rd + ' = 159,1 kN/m')}${fl('Λ', `${Hd} / ${Rd}`, '90 / 159,1', '<b>0,57</b>')}` },
      ],
      res: [{ ok: true, h: `${nw(Hd + ' = 90 kN/m < ' + Rd + ' = 159,1 kN/m')} – az alap elcsúszásra megfelel, a kihasználtság 57%.` }],
      open: [{ p: 'mp1', l: 'Megnyitás a kalkulátorban' }] },

    { id: 'mp2', sub: 'GEO · δ = ⅔·φ′', n: 'MP2', k: 'k1', title: 'Monolit vagy előregyártott? – drénezett elcsúszás', short: 'Monolit vagy előregyártott', tags: ['GEO', DA2, 'δ = ⅔·φ′'],
      task: `<p>Az előző példa alapjára most nagyobb vízszintes erő jut: ${nw(Hd + ' = 105 kN/m')} (${nw(Vk + ' = 280 kN/m')}, ${nw(phicv + ' = 32°')}). Ellenőrizd az elcsúszási biztonságot <b>a)</b> helyben betonozott és <b>b)</b> sima felületű, előregyártott alaptest esetén!</p>`,
      data: [[Vk, '280 kN/m'], [Hd, '105 kN/m'], [phicv, '32°'], [gRh, '1,1']],
      fig: { p: 'mp2b', dims: [], cap: 'A b) változat: sima, előregyártott talpnál a súrlódási szög csak ⅔·φ′<sub>cv;k</sub>.' },
      steps: [
        { t: 'a) Helyben betonozott alaptest', r: 'Λ = 0,66', b: `${fl(dk, phicv, '32°')}${fl(Rd, `280 · tg${NB}32° / 1,1`, u_(159.06, 1, 'kN/m'))}${fl('Λ', '105 / 159,1', '<b>0,66</b>')}` },
        { t: 'b) Sima, előregyártott alaptest', r: 'Λ = 1,06', b: `<p>A sima betonfelület és a talaj között kisebb a súrlódás:</p>${fl(dk, `⅔ · ${phicv}`, '⅔ · 32°', '21,33°')}${fl(Rd, `280 · tg${NB}21,33° / 1,1`, '280 · 0,3906 / 1,1', u_(99.41, 1, 'kN/m'))}${fl('Λ', '105 / 99,4', '<b>1,06</b>')}` },
      ],
      res: [{ ok: true, h: `a) ${nw(Hd + ' = 105 kN/m ≤ ' + Rd + ' = 159,1 kN/m')} – megfelel (Λ = 0,66).` }, { ok: false, h: `b) ${nw(Hd + ' = 105 kN/m > ' + Rd + ' = 99,4 kN/m')} – nem felel meg (Λ = 1,06). Ugyanaz az alap helyben betonozva megfelelt!` }],
      notes: [{ h: `<b>Tanulság.</b> Az alaptest kivitele a ${dk} súrlódási szögön keresztül jelentősen befolyásolja az elcsúszási ellenállást: itt az ellenállás 159,1 kN/m-ről 99,4 kN/m-re csökkent. Ha az előregyártott változat nem felel meg, segíthet a helyben betonozott kialakítás, a fogazat, a nagyobb leterhelés vagy a szélesebb alap.` }],
      open: [{ p: 'mp2a', l: 'a) megnyitása' }, { p: 'mp2b', l: 'b) megnyitása' }] },

    { id: 'mp3', sub: 'GEO · drénezetlen', n: 'MP3', k: 'k1', title: 'Elcsúszás drénezetlen állapotban – a 0,4·V<sub>d</sub> korlát', short: 'Drénezetlen, 0,4·V<sub>d</sub>', tags: ['GEO', DA2, 'drénezetlen'],
      task: `<p>Ellenőrizd a ${nw('2,0 × 3,0 m')}-es pilléralap elcsúszási biztonságát drénezetlen (rövid távú) állapotban! A teljes alapfelület nyomott: ${nw('A<sub>c</sub> = 6,0 m²')}. A drénezetlen nyírószilárdság az alapsíkon ${nw('c<sub>u;k</sub> = 60 kPa')}. A terhek tervezési értéke: ${nw('V<sub>d</sub> = 700 kN')}, ${nw(Hd + ' = 250 kN')}.</p>`,
      data: [['B × L', '2,0 × 3,0 m'], ['A<sub>c</sub>', '6,0 m²'], ['c<sub>u;k</sub>', '60 kPa'], ['V<sub>d</sub>', '700 kN'], [Hd, '250 kN']],
      fig: { p: 'mp3', dims: ['B'], cap: 'Drénezetlen állapotban a nyomott felületen ébredő nyírás áll ellen; az alaprajzon a nyomott felület A<sub>c</sub>.' },
      steps: [
        { t: 'Nyírási ellenállás a nyomott felületen', r: '327,3 kN', b: fl(Rd, `A<sub>c</sub> · c<sub>u;k</sub> / ${gRh}`, '6,0 · 60 / 1,1', u_(327.27, 1, 'kN')) },
        { t: 'A 0,4·V<sub>d</sub> korlát', r: Rd + ' = 280 kN', b: `<p>Az alap és a talaj között hézag nyílhat (erózió, zsugorodás, víz vagy levegő juthat a talp alá), ezért nem számíthatunk a függőleges erő 40%-ánál nagyobb nyírási ellenállásra:</p>${fl('0,4 · V<sub>d</sub>', '0,4 · 700', u_(280, 1, 'kN'))}<p>Mivel ${nw('327,3 kN > 280 kN')}, a korlát a mértékadó: ${nw(Rd + ' = 280 kN')}.</p>` },
        { t: 'Igazolás', r: 'Λ = 0,89', b: `${fl(Hd + ' = 250 kN ≤ ' + Rd + ' = 280 kN')}${fl('Λ', '250 / 280', '<b>0,89</b>')}` },
      ],
      res: [{ ok: true, h: `${nw(Hd + ' = 250 kN < ' + Rd + ' = 280 kN')} – megfelel. A 0,4·V<sub>d</sub> korlát nélkül tévesen 327 kN ellenállással számoltunk volna.` }],
      open: [{ p: 'mp3', l: 'Megnyitás a kalkulátorban' }] },

    { id: 'mp4', sub: 'GEO · R<sub>p;d</sub>', n: 'MP4', k: 'k1', title: 'Elcsúszás földellenállással', short: 'Földellenállással', tags: ['GEO', DA2, 'γ<sub>R;e</sub> = 1,4'],
      task: `<p>A helyben betonozott sávalapra ${nw(Vk + ' = 250 kN/m')} és ${nw(Hd + ' = 140 kN/m')} jut; ${nw(phicv + ' = 30°')}. Az alapsík ${nw('D = 1,5 m')} mélyen van, a homlokfal előtti talaj ${nw('γ = 18 kN/m³')}, ${nw('φ′<sub>k</sub> = 30°')}. Ellenőrizd az elcsúszást <b>a)</b> földellenállás nélkül, és <b>b)</b> a teljes passzív földellenállás felének figyelembevételével (${nw('γ<sub>R;e</sub> = 1,4')})!</p>`,
      data: [[Vk, '250 kN/m'], [Hd, '140 kN/m'], [phicv, '30°'], ['D', '1,5 m'], ['γ (homlokfal előtt)', '18 kN/m³'], ['φ′<sub>k</sub> (homlokfal előtt)', '30°'], ['figyelembe vett hányad', '½']],
      fig: { p: 'mp4b', dims: ['D'], cap: 'A földellenállás a vízszintes erővel szemközti (homlok)oldalon ébred, és azzal ellentétes irányú.' },
      steps: [
        { t: 'a) Nyírási ellenállás az alapsíkon', r: Rd + ' = 131,2 kN/m', b: `${fl(dk, phicv, '30°')}${fl(Rd, `250 · tg${NB}30° / 1,1`, u_(131.22, 1, 'kN/m'))}<p>${nw(Rd + ' = 131,2 kN/m < ' + Hd + ' = 140 kN/m')}: önmagában nem elég (${nw('Λ = 1,07')}).</p>` },
        { t: 'A passzív földnyomás szorzója', r: 'K<sub>p</sub> = 3,0', b: fl('K<sub>p</sub>', 'tg²(45° + φ′<sub>k</sub>/2)', 'tg²' + NB + '60°', '3,0') },
        { t: 'A teljes passzív földellenállás', r: 'E<sub>p;k</sub> = 60,75 kN/m', b: fl('E<sub>p;k</sub>', '0,5 · γ · D² · K<sub>p</sub>', '0,5 · 18 · 1,5² · 3,0', u_(60.75, 2, 'kN/m')) },
        { t: 'A figyelembe vehető földellenállás', r: Rpd + ' = 21,7 kN/m', b: `<p>A teljes passzív ellenállás csak nagy elmozdulásnál ébredne, ezért csak a felét vesszük figyelembe:</p>${fl(Rpd, '½ · E<sub>p;k</sub> / γ<sub>R;e</sub>', '0,5 · 60,75 / 1,4', u_(21.70, 1, 'kN/m'))}` },
        { t: 'b) Igazolás', r: 'Λ = 0,92', b: `${fl(Rd + ' + ' + Rpd, '131,2 + 21,7', u_(152.9, 1, 'kN/m'))}${fl('Λ', `${Hd} / (${Rd} + ${Rpd})`, '140 / 152,9', '<b>0,92</b>')}` },
      ],
      res: [{ ok: false, h: `a) Földellenállás nélkül ${nw(Hd + ' = 140 kN/m > ' + Rd + ' = 131,2 kN/m')} – nem felel meg (Λ = 1,07).` }, { ok: true, h: `b) ${nw(Hd + ' = 140 kN/m < ' + Rd + ' + ' + Rpd + ' = 152,9 kN/m')} – megfelel (Λ = 0,92).` }],
      notes: [{ cls: 'warn', h: '<b>Vigyázat:</b> a megfelelőség itt a földellenálláson múlik. Ha a homlokfal előtti talajt elhordhatják (közműárok, erózió), vagy az agyag a zsugorodás miatt elválhat a faltól, R<sub>p;d</sub> nem vehető figyelembe – és az alap nem felel meg. A földellenállásra alapozott igazolás csak akkor fogadható el, ha a talaj megmaradása a szerkezet teljes élettartama alatt biztosított.' }],
      open: [{ p: 'mp4a', l: 'a) megnyitása' }, { p: 'mp4b', l: 'b) megnyitása' }] },

    { id: 'mp5', sub: 'EQU · forgáspont', n: 'MP5', k: 'k2', title: 'Felborulás vizsgálata (EQU)', short: 'Felborulás, B/10', tags: ['EQU', 'γ<sub>G;stb</sub> = 0,9', 'γ<sub>Q;dst</sub> = 1,5'],
      task: `<p>Egy magas, karcsú szerkezet (például reklámtábla) ${nw('B = 2,4 m')} oldalú, négyzetes, talajon álló alapjára a szerkezet és az alaptest együttes súlya ${nw('G<sub>k</sub> = 400 kN')} (központos), a szélteher ${nw('H<sub>k</sub> = 60 kN')} (esetleges hatás), amely az alapsík felett ${nw('h = 4,0 m')} magasan hat. Ellenőrizd a felborulási biztonságot EQU határállapotban!</p>`,
      data: [['B × B', '2,4 × 2,4 m'], ['G<sub>k</sub>', '400 kN'], ['H<sub>k</sub> (esetleges)', '60 kN'], ['h', '4,0 m'], ['γ<sub>G;stb</sub>', '0,9'], ['γ<sub>Q;dst</sub>', '1,5']],
      fig: { p: 'mp5a', cap: 'Talajon a forgáspont a sarok helyett a saroktól B/10 távolságra van.' },
      steps: [
        { t: 'A forgáspont helye', r: 'kar = 0,96 m', b: `<p>Talajon álló alapnál – mivel a sarok alatt a talaj benyomódik – a nyomatékot első közelítésben a saroktól B/10 távolságra lévő pontra írjuk fel. A stabilizáló súlyerő karja:</p>${fl('a', 'B/2 − B/10', '1,20 − 0,24', u_(0.96, 2, 'm'))}` },
        { t: 'Stabilizáló és felborító nyomaték', r: 'Λ = 1,04', b: `${fl('M<sub>stb;d</sub>', 'γ<sub>G;stb</sub> · G<sub>k</sub> · a', '0,9 · 400 · 0,96', u_(345.6, 1, 'kNm'))}${fl('M<sub>dst;d</sub>', 'γ<sub>Q;dst</sub> · H<sub>k</sub> · h', '1,5 · 60 · 4,0', u_(360, 1, 'kNm'))}${fl('Λ', '360,0 / 345,6', '<b>1,04</b>')}` },
        { t: 'Javítás: szélesebb alap, B = 2,6 m', r: 'Λ = 0,96', b: `${fl('a', '1,30 − 0,26', u_(1.04, 2, 'm'))}${fl('M<sub>stb;d</sub>', '0,9 · 400 · 1,04', u_(374.4, 1, 'kNm'))}${fl('Λ', '360,0 / 374,4', '<b>0,96</b>')}<p>A pontosabb számításban a nagyobb alaptest önsúly-többlete tovább növelné ${sb('M', 'stb;d')}-t.</p>` },
      ],
      res: [{ ok: false, h: `${nw('B = 2,4 m')}: ${nw('M<sub>dst;d</sub> = 360,0 kNm > M<sub>stb;d</sub> = 345,6 kNm')} – nem felel meg.` }, { ok: true, h: `${nw('B = 2,6 m')}: ${nw('M<sub>dst;d</sub> = 360,0 kNm < M<sub>stb;d</sub> = 374,4 kNm')} – megfelel.` }],
      notes: [{ h: `<b>Kőzeten más a helyzet.</b> Szilárd kőzeten álló alapnál a nyomatékot a talp szélére írnánk fel: a kar ${nw('B/2 = 1,2 m')}, ${nw('M<sub>stb;d</sub> = 0,9 · 400 · 1,2 = 432 kNm')}, így az eredeti ${nw('B = 2,4 m')} is megfelelne. Talajon a forgáspont helye bizonytalan – ezért a B/10-es közelítés.` }],
      open: [{ p: 'mp5a', l: 'B = 2,4 m megnyitása' }, { p: 'mp5b', l: 'B = 2,6 m' }, { p: 'mp5c', l: 'kőzeten' }] },

    { id: 'mp6', sub: DA2 + ' · e ≤ B/3', n: 'MP6', k: 'k2', title: 'A külpontosság korlátozása és a talpfeszültség', short: 'Külpontosság, élfeszültség', tags: ['GEO', DA2, 'karakterisztikus'],
      task: `<p>A ${nw('B × L = 2,4 × 2,4 m')}-es alapra ${nw('V<sub>k</sub> = 500 kN')} függőleges erő és az alapsík felett ${nw('h = 3,0 m')} magasan ható vízszintes erő jut. A ${DA2} módszer szerint a külpontosságot a hatások <b>karakterisztikus</b> értékéből számítjuk. Határozd meg és minősítsd a külpontosságot, és számítsd ki a talpfeszültségeket <b>a)</b> ${nw('H<sub>k</sub> = 50 kN')} és <b>b)</b> ${nw('H<sub>k</sub> = 100 kN')} esetén!</p>`,
      data: [['B × L', '2,4 × 2,4 m'], ['V<sub>k</sub>', '500 kN'], ['h', '3,0 m'], ['H<sub>k</sub>', 'a) 50 kN · b) 100 kN']],
      fig: { p: 'mp6b', cap: 'A b) eset: az eredő a belső magon kívül, de a B/3 határon belül metszi az alapsíkot – a talp egy része elemelkedik.' },
      steps: [
        { t: 'a) H<sub>k</sub> = 50 kN – a belső magon belül', r: 'e = 0,30 m', b: `${fl('M<sub>k</sub>', '50 · 3,0', u_(150, 0, 'kNm'))}${fl('e', 'M<sub>k</sub> / V<sub>k</sub>', '150 / 500', u_(0.30, 2, 'm'))}<p>${nw('B/6 = 0,40 m')} → ${nw('e < B/6')}: az eredő a belső magon belül van, a teljes talpfelület nyomott (a korábbi, szigorúbb hazai követelmény is teljesül).</p>` },
        { t: 'a) Trapéz alakú talpfeszültség', r: 'σ<sub>max</sub> = 151,9 kPa', b: `${fl('σ<sub>max/min</sub>', 'V<sub>k</sub> / (B · L) · (1 ± 6e/B)', '86,8 · (1 ± 0,75)')}${fl('σ<sub>max</sub>', u_(151.9, 1, 'kPa'))}${fl('σ<sub>min</sub>', u_(21.7, 1, 'kPa'))}` },
        { t: 'b) H<sub>k</sub> = 100 kN – a magon kívül, a korláton belül', r: 'e = 0,60 m', b: `${fl('M<sub>k</sub>', '100 · 3,0', u_(300, 0, 'kNm'))}${fl('e', '300 / 500', u_(0.60, 2, 'm'))}<p>${nw('B/6 = 0,40 m < e ≤ B/3 = 0,80 m')}: megengedett, de a talp egy része elemelkedik.</p>` },
        { t: 'b) Háromszög alakú talpfeszültség', r: 'σ<sub>max</sub> = 231,5 kPa', b: `${fl('c', 'B/2 − e', '1,20 − 0,60', u_(0.60, 2, 'm'))}${fl('nyomott hossz', '3c', u_(1.80, 2, 'm') + ' (a talp 75%-a)')}${fl('σ<sub>max</sub>', '2 · V<sub>k</sub> / (3 · c · L)', '2 · 500 / (3 · 0,60 · 2,4)', u_(231.5, 1, 'kPa'))}<p>Az élfeszültség a központos esethez (86,8 kPa) képest 2,7-szeresére nőtt.</p>` },
      ],
      res: [{ ok: true, h: `a) ${nw('e = 0,30 m ≤ B/6 = 0,40 m')} – belső magon belül, ${nw('σ<sub>max</sub> = 151,9 kPa')}.` }, { ok: true, h: `b) ${nw('B/6 < e = 0,60 m ≤ B/3')} – megengedett, részleges elemelkedéssel, ${nw('σ<sub>max</sub> = 231,5 kPa')}.` }],
      notes: [{ cls: 'warn', h: `<b>Ha e > B/3</b> (itt 0,80 m felett), az alapsík fele sem dolgozna – ilyenkor külön óvintézkedés szükséges. Kör alaprajznál a korlát ${nw('e ≤ 0,6 · r')}.` },
        { h: `<b>A külpontossági korlát nem helyettesíti az EQU-vizsgálatot.</b> Ha a b) esetben a vízszintes erő esetleges (például szél), az EQU-tényezőkkel ${nw('M<sub>dst;d</sub> = 1,5 · 100 · 3,0 = 450 kNm')}, míg ${nw('M<sub>stb;d</sub> = 0,9 · 500 · 0,96 = 432 kNm')} – a felborulás nem teljesül. A kalkulátor a két vizsgálatot együtt végzi el.` }],
      open: [{ p: 'mp6a', l: 'a) megnyitása' }, { p: 'mp6b', l: 'b) megnyitása' }] },

    { id: 'mp7', sub: 'UPL · leterhelés', n: 'MP7', k: 'k3', title: 'Felúszás leterheléssel (UPL)', short: 'Felúszás, földtakarás', tags: ['UPL', 'γ<sub>G;dst</sub> = 1,0', 'γ<sub>G;stb</sub> = 0,9'],
      task: `<p>Egy ${nw('B × L = 12 × 30 m')} alaprajzú földalatti garázs alaplemezének alsó síkja felett a mértékadó talajvízszint ${nw('h<sub>w</sub> = 4,0 m')} magasan van. A szerkezet önsúlya ${nw('G<sub>sz;k</sub> = 11' + NN + '000 kN')}, a födémen ${nw('t = 0,8 m')} vastag földtakarás van (${nw('γ = 18 kN/m³')}, a talajvíz felett). Ellenőrizd a felúszási biztonságot UPL határállapotban! (${nw('γ<sub>w</sub> = 10 kN/m³')})</p>`,
      data: [['B × L', '12 × 30 m'], ['h<sub>w</sub>', '4,0 m'], ['G<sub>sz;k</sub>', '11' + NN + '000 kN'], ['földtakarás t', '0,8 m'], ['γ (takarás)', '18 kN/m³']],
      fig: { p: 'mp7', cap: 'A felhajtóerő az alaplemez alsó síkjára ható víznyomás eredője; ellene a szerkezet és a födémen lévő föld súlya dolgozik.' },
      steps: [
        { t: 'Felhajtóerő', r: 'V<sub>dst;d</sub> = 14' + NN + '400 kN', b: `${fl('A<sub>k</sub>', '12 · 30', u_(360, 0, 'm²'))}${fl('V<sub>dst;d</sub>', 'γ<sub>G;dst</sub> · γ<sub>w</sub> · h<sub>w</sub> · A<sub>k</sub>', '1,0 · 10 · 4,0 · 360', u_(14400, 0, 'kN'))}` },
        { t: 'Stabilizáló hatások', r: 'G<sub>stb;d</sub> = 14' + NN + '566 kN', b: `${fl('G<sub>t;k</sub>', '360 · 0,8 · 18', u_(5184, 0, 'kN'))}${fl('G<sub>stb;d</sub>', 'γ<sub>G;stb</sub> · (G<sub>sz;k</sub> + G<sub>t;k</sub>)', `0,9 · (11${NN}000 + 5184)`, u_(14565.6, 0, 'kN'))}` },
        { t: 'Igazolás', r: 'Λ = 0,989', b: `${fl('V<sub>dst;d</sub> = 14' + NN + '400 kN ≤ G<sub>stb;d</sub> + R<sub>d</sub> = 14' + NN + '566 kN')}<p>Súrlódást és horgonyt nem veszünk figyelembe: ${nw('R<sub>d</sub> = 0')}.</p>${fl('Λ', `14${NN}400 / 14${NN}566`, '<b>0,989</b>')}` },
      ],
      res: [{ ok: true, h: `${nw('V<sub>dst;d</sub> < G<sub>stb;d</sub>')} – megfelel, de a kihasználtság 99%!` }],
      notes: [{ cls: 'warn', h: `<b>Tanulság.</b> A tartalék minimális, miközben a globális biztonság eleve csak ${nw('1,0/0,9 = 1,11')}. A talajvízszint geometriai adat: ha a mértékadó vízszintet csak 5 cm-rel magasabbra kell felvenni (${nw('h<sub>w</sub> > 4,046 m')}), az igazolás már nem teljesül. Ezért kell a vízszintet óvatosan felvenni, vagy védekezési megoldást (leterhelés, lehorgonyzás, leszívás, elárasztás) alkalmazni.` }],
      open: [{ p: 'mp7', l: 'Megnyitás a kalkulátorban' }] },

    { id: 'mp8', sub: 'UPL · horgonyok', n: 'MP8', k: 'k3', title: 'Felúszás lehorgonyzással (UPL)', short: 'Felúszás, horgonyok', tags: ['UPL', 'γ<sub>a</sub> = 1,4'],
      task: `<p>Az előző példa garázsa földtakarás nélkül épül (a födém egyben térszín). Mekkora lehorgonyzó erőre van szükség a felúszási biztonsághoz, és hány horgonyelem kell, ha egy elem karakterisztikus húzási ellenállása ${nw('R<sub>k</sub> = 210 kN')} (${nw('γ<sub>a</sub> = 1,4')})?</p>`,
      data: [['A<sub>k</sub>', '360 m²'], ['h<sub>w</sub>', '4,0 m'], ['G<sub>sz;k</sub>', '11' + NN + '000 kN'], ['R<sub>k</sub> (egy elem)', '210 kN'], ['γ<sub>a</sub>', '1,4']],
      fig: { p: 'mp8', cap: 'Lehorgonyzás húzott cölöpökkel vagy talajhorgonyokkal: az ábra a horgonyok egy részét mutatja.' },
      steps: [
        { t: 'Felhajtóerő és önsúly', r: '14' + NN + '400 / 9900 kN', b: `${fl('V<sub>dst;d</sub>', '1,0 · 10 · 4,0 · 360', u_(14400, 0, 'kN') + ' (változatlan)')}${fl('G<sub>stb;d</sub>', `0,9 · 11${NN}000`, u_(9900, 0, 'kN') + ' (nincs leterhelő talaj)')}` },
        { t: 'A szükséges lehorgonyzó erő', r: 'P<sub>d</sub> = 4500 kN', b: `${fl('V<sub>dst;d</sub> ≤ G<sub>stb;d</sub> + T<sub>d</sub> + P<sub>d</sub>')}${fl('P<sub>d;szüks</sub>', `14${NN}400 − 9900`, u_(4500, 0, 'kN'))}<p>A falakon ébredő súrlódást a biztonság javára elhanyagoljuk: ${nw('T<sub>d</sub> = 0')}.</p>` },
        { t: 'Egy elem tervezési ellenállása', r: 'P<sub>d;1</sub> = 150 kN', b: fl('P<sub>d;1</sub>', 'R<sub>k</sub> / γ<sub>a</sub>', '210 / 1,4', u_(150, 0, 'kN')) },
        { t: 'A horgonyok száma', r: 'n = 30 db', b: `${fl('n', '4500 / 150', '30' + NB + 'db')}<p>A horgonyelemeket (húzott cölöp vagy talajhorgony) egyenletesen osztjuk el az alaplemezen.</p>` },
      ],
      res: [{ ok: true, h: `30 db horgonnyal ${nw('G<sub>stb;d</sub> + P<sub>d</sub> = 9900 + 4500 = 14' + NN + '400 kN = V<sub>dst;d</sub>')} – megfelel (Λ = 1,00). A gyakorlatban ennél tartalékot is hagyunk, és a lemez hajlítása miatt sűrűbb horgonykiosztás adódik.` }],
      notes: [{ dyn: 'mp8fric' }],
      open: [{ p: 'mp8', l: 'Megnyitás a kalkulátorban' }] },

    { id: 'mp9', sub: DA3 + ' · Bishop', n: 'MP9', k: 'k4', title: 'Általános állékonyság – ház a rézsű koronáján', short: 'Ház a rézsű koronáján', tags: ['GEO', DA3, 'Bishop-módszer'], dyn: true,
      task: `<p>Egy ${nw('8 m')} magas, ${nw('1 : 1,5')} hajlású löszrézsű koronáján családi ház épül, két ${nw('0,6 m')} széles sávalappal. A sávalapok ${nw('0,8 m')} mélyen vannak; a rézsűélhez közelebbi alap széle ${nw('0,5 m')}-re, a másiké ${nw('2,9 m')}-re van a rézsűéltől (tengelytávolság ${nw('2,4 m')}). Mindkét alap terhe ${nw('G<sub>k</sub> = 72 kN/m')} állandó és ${nw('Q<sub>k</sub> = 18 kN/m')} esetleges teher. A talaj: ${nw('γ = 19 kN/m³')}, ${nw('c′<sub>k</sub> = 14 kPa')}, ${nw('φ′<sub>k</sub> = 28°')}; a merev réteg a rézsűláb alatt ${nw('6 m')} mélyen van. Ellenőrizd az általános állékonyságot ${DA3} szerint, egyszerűsített Bishop-módszerrel, <b>a)</b> száraz állapotban és <b>b)</b> tartós átázás esetén (${nw('r<sub>u</sub> = 0,2')})!</p>`,
      data: [['H; hajlás', '8 m; 1 : 1,5'], ['γ; c′<sub>k</sub>; φ′<sub>k</sub>', '19 kN/m³; 14 kPa; 28°'], ['sávalapok: B; D', '0,6 m; 0,8 m'], ['távolság a rézsűéltől', '0,5 m és 2,9 m'], ['terhek alaponként', '72 + 18 kN/m'], ['γ<sub>G</sub>; γ<sub>Q</sub>; γ<sub>φ′</sub> = γ<sub>c′</sub>', '1,0; 1,3; 1,35']],
      fig: { p: 'mp9a', cap: 'A mértékadó csúszólap (a) eset), a lamellák és a próbakörök középpontjai, a színük a legkisebb F értéket mutatja.' },
      open: [{ p: 'mp9a', l: 'a) megnyitása' }, { p: 'mp9b', l: 'b) megnyitása' }] },
  ];

  // ---------------- MP9 lépései (élő számítás) ----------------
  let R9 = null;
  function mp9() {
    if (!R9) R9 = { a: C.solve.slope(P.mp9a.input), b: C.solve.slope(P.mp9b.input, { noLoad: false }) };
    const a = R9.a.v, b = R9.b.v, c = a.crit, sl = c.slices, g = 5, rows = [];
    for (let i = 0; i < sl.length; i += g) { const q = sl.slice(i, i + g); const x0 = q[0].xm - q[0].b / 2, x1 = q[q.length - 1].xm + q[0].b / 2; const W = q.reduce((s, x) => s + x.W, 0), Pp = q.reduce((s, x) => s + x.P, 0), num = q.reduce((s, x) => s + x.num, 0), den = q.reduce((s, x) => s + (x.W + x.P) * Math.sin(x.al), 0), al = q.reduce((s, x) => s + x.al, 0) / q.length * 180 / Math.PI;
      rows.push(`<tr><td>${i + 1}–${i + q.length}</td><td>${F(x0, 2)} … ${F(x1, 2)}</td><td>${F(W, 1)}</td><td>${Pp ? F(Pp, 1) : '–'}</td><td>${F(al, 1)}</td><td>${F(num, 1)}</td><td>${F(den, 1)}</td></tr>`); }
    const tbl = `<div class="tblw cx-tw"><table class="tbl mp-tbl"><thead><tr><th>lamellák</th><th>x [m]</th><th>ΣW [kN/m]</th><th>ΣP [kN/m]</th><th>α<sub>átl</sub> [°]</th><th>Σ ellenálló tag</th><th>Σ (W+P)·sin${NB}α</th></tr></thead><tbody>${rows.join('')}<tr class="cx-tsum"><td colspan="5">Összesen (30 lamella, b = ${u_(sl[0].b, 3, 'm')})</td><td>${F(c.num, 1)}</td><td>${F(c.den, 1)}</td></tr></tbody></table></div>`;
    const ld = a.m.loads[0], drop = a.F0 ? (1 - a.Fd / a.F0) * 100 : 0;
    const exitTxt = Math.abs(c.x1 - a.m.LX) < 0.05 ? 'a rézsűlábnál lép ki' : c.x1 > a.m.LX ? `${u_(c.x1 - a.m.LX, 2, 'm')}-rel a rézsűláb előtt lép ki` : 'a rézsűn lép ki';
    return {
      steps: [
        { t: 'Tervezési szilárdsági paraméterek (M2)', r: 'φ′<sub>d</sub> = ' + u_(a.phid, 1, '°'), b: `${fl('tg' + NB + 'φ′<sub>d</sub>', 'tg' + NB + 'φ′<sub>k</sub> / γ<sub>φ′</sub>', 'tg' + NB + '28° / 1,35', F(Math.tan(28 * Math.PI / 180) / 1.35, 4))}${fl('φ′<sub>d</sub>', u_(a.phid, 2, '°'))}${fl('c′<sub>d</sub>', 'c′<sub>k</sub> / γ<sub>c′</sub>', '14 / 1,35', u_(a.cd, 2, 'kPa'))}` },
        { t: 'Az alapok tervezési terhe', r: 'P<sub>d</sub> = ' + u_(ld.Pd, 1, 'kN/m'), b: `${fl('P<sub>d</sub>', 'γ<sub>G</sub> · G<sub>k</sub> + γ<sub>Q</sub> · Q<sub>k</sub>', '1,0 · 72 + 1,3 · 18', u_(ld.Pd, 1, 'kN/m'))}<p>Alaponként, a ${nw('0,6 m')} széles talpon egyenletesen megoszlva: ${nw('q<sub>d</sub> = ' + u_(ld.q, 1, 'kPa'))}. A talaj önsúlyát ${nw('γ<sub>G</sub> = 1,0')} tényezővel vesszük figyelembe.</p>` },
        { t: 'A mértékadó csúszólap keresése', r: `r = ${u_(c.R, 1, 'm')}`, b: `<p>A körközéppontokat ${a.sr.nx} × ${a.sr.ny} pontos hálón vettük fel; minden középpontra a rézsűlábon átmenő és ${14} különböző mélységet érintő kört vizsgáltunk, majd a legkedvezőtlenebb körök környezetében finomítottunk. Az alaptestet metsző köröket kizártuk.</p><div class="cx-fl nw">középpont: O(${F(c.xc, 2)}; ${F(c.yc, 2)})${NB}m a rézsűéltől, sugár ${u_(c.R, 2, 'm')}</div><p>A csúszólap ${nw(u_(-c.x0, 2, 'm'))}-re a rézsűél mögött, mindkét sávalap mögött lép be, és ${exitTxt}: a ház teljes egészében a csúszó tömegen áll.</p>` },
        { t: 'Lamellás számítás (30 lamella, csoportosítva)', r: 'F<sub>d</sub> = ' + F(a.Fd, 3), b: `${fl('F<sub>d</sub>', `Σ [c′<sub>d</sub> · b + (W + P − u · b) · tg${NB}φ′<sub>d</sub>] / m<sub>α</sub> / Σ (W + P) · sin${NB}α`)}${fl('m<sub>α</sub>', `cos${NB}α + sin${NB}α · tg${NB}φ′<sub>d</sub> / F<sub>d</sub>`)}${tbl}<p>Az iteráció (F<sub>d</sub> mindkét oldalon szerepel) néhány lépésben konvergál:</p>${fl('F<sub>d</sub>', `${F(c.num, 1)} / ${F(c.den, 1)}`, `<b>${F(a.Fd, 3)}</b>`)}` },
        { t: 'a) Igazolás – száraz állapot', r: 'Λ = ' + F(a.lam, 2), b: `${fl('Λ', '1 / F<sub>d</sub>', `1 / ${F(a.Fd, 3)}`, `<b>${F(a.lam, 3)}</b>`)}<p>${a.Fd >= 1 ? nw('F<sub>d</sub> ≥ 1,0') + ': az általános állékonyság megfelel.' : nw('F<sub>d</sub> < 1,0') + ': nem felel meg.'} A ház nélkül ugyanez a rézsű ${nw('F<sub>d</sub> = ' + F(a.F0, 3))} biztonságú lenne: a két sávalap terhe kb. ${F(drop, 0)}%-kal csökkenti a biztonságot.</p>` },
        { t: 'b) Tartós átázás, r<sub>u</sub> = 0,2', r: 'F<sub>d</sub> = ' + F(b.Fd, 3), b: `<p>A pórusvíznyomás ${nw('u = r<sub>u</sub> · γ · h')} csökkenti a lamellák talpán a hatékony normálerőt, így a súrlódási ellenállást is. A keresést újra elvégezve:</p>${fl('F<sub>d</sub>', `<b>${F(b.Fd, 3)}</b>`)}${fl('Λ', `1 / ${F(b.Fd, 3)}`, `<b>${F(b.lam, 3)}</b>`)}` },
      ],
      res: [{ ok: a.Fd >= 1, h: `a) ${nw('F<sub>d</sub> = ' + F(a.Fd, 3) + (a.Fd >= 1 ? ' ≥ 1,0' : ' < 1,0'))} – ${a.Fd >= 1 ? 'megfelel' : 'nem felel meg'} (${nw('Λ = ' + F(a.lam, 2))}).` }, { ok: b.Fd >= 1, h: `b) ${nw('F<sub>d</sub> = ' + F(b.Fd, 3) + (b.Fd >= 1 ? ' ≥ 1,0' : ' < 1,0'))} – ${b.Fd >= 1 ? 'megfelel' : 'nem felel meg'} (${nw('Λ = ' + F(b.lam, 2))}): tartós átázásnál a ház alatt a rézsű nem állékony.` }],
      notes: [{ cls: 'warn', h: '<b>Mit tehetünk?</b> Rendezett felszíni vízelvezetés és csapadékvíz-elvezetés (az átázás megelőzése), a ház távolabb helyezése a rézsűéltől, mélyebb alapozás a csúszólap alá, illetve a rézsű laposítása vagy megtámasztása. Mindegyik hatása kipróbálható a kalkulátorban.' }],
    };
  }
  function mp8fric() {
    const r = C.solve.uplift({ ...P.mp8.input, fric: true, n: 0, phiS: 30, kAuto: 'auto' }).v;
    return `<b>Súrlódással kevesebb is elég.</b> Ha a falak mentén a súrlódást is figyelembe vesszük (${nw('K = K<sub>0</sub> = 1 − sin' + NB + 'φ′')}, ${nw('δ = ⅔ · φ′')}, ${nw('φ′<sub>k</sub> = 30°')}, ${nw('γ<sub>s;t</sub> = 1,4')}), akkor ${nw('T<sub>d</sub> = ' + u_(r.Td, 0, 'kN'))}, és ${nw(r.nReq + NB + 'db')} horgony is elegendő – a kalkulátorban az Oldalsúrlódás kapcsolóval kipróbálható. A súrlódásra csak akkor szabad számítani, ha a visszatöltés és a fal–talaj kapcsolat tartósan biztosított.`;
  }

  // ---------------- megjelenítés ----------------
  const idx = document.getElementById('mpIdx'), view = document.getElementById('mpView'); if (!idx || !view) { reg(); return; }
  let cur = 0;
  const tagText = (e) => e.tags.join(' · ');
  idx.innerHTML = EX.map((e, i) => `<button type="button" class="mp-tile ${e.k}" role="tab" data-i="${i}" aria-selected="false"><span class="n">${e.n}</span><b>${e.short}</b><small>${e.sub}</small></button>`).join('');
  function html(e) {
    const d = e.dyn ? mp9() : {};
    const steps = e.steps || d.steps, res = e.res || d.res, notes = (e.notes || []).concat(d.notes || []);
    const fig = e.fig ? `<figure class="mp-fig"><div class="mp-cv" data-p="${e.fig.p}"></div><figcaption>${e.fig.cap}</figcaption></figure>` : '';
    return `<article class="mp ${e.k}" id="mp-${e.id.slice(2)}" aria-labelledby="mph-${e.id}">
      <div class="mp-h"><span class="n">${e.n}</span><h3 id="mph-${e.id}">${e.title}</h3><div class="tags">${e.tags.map(t => `<span>${t}</span>`).join('')}</div></div>
      <div class="mp-b">
        <div class="mp-top${fig ? '' : ' nofig'}"><div class="mp-task"><p class="mp-sec">Feladat</p>${e.task}<table class="mp-data">${e.data.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table></div>${fig}</div>
        <div class="mp-sol"><div class="mp-solh"><p class="mp-sec">Megoldás lépésről lépésre</p><button type="button" class="mp-all" aria-pressed="false">Összes lépés kibontása</button></div>
          <div class="mp-steps">${steps.map(s => `<details class="mp-st"><summary><b>${s.t}</b><span class="r nw">${s.r || ''}</span></summary><div>${s.b}</div></details>`).join('')}</div>
          ${res.map(r => `<div class="mp-res ${r.ok ? 'ok' : 'bad'}"><span class="v">${r.ok ? 'Megfelel' : 'Nem felel meg'}</span><p>${r.h}</p></div>`).join('')}
          ${notes.map(n => `<div class="note mp-note ${n.cls || ''}">${n.dyn === 'mp8fric' ? mp8fric() : n.h}</div>`).join('')}
        </div>
        <div class="mp-act">${e.open.map((o, i) => `<button type="button" class="mp-open${i ? ' sec' : ''}" data-p="${o.p}">${i ? '' : ICON}${o.l}</button>`).join('')}</div>
      </div></article>`;
  }
  function drawFigs() { view.querySelectorAll('.mp-cv[data-p]').forEach(el => { const q = P[el.dataset.p], e = EX[cur]; const W = Math.round(el.clientWidth), H = Math.round(el.clientHeight); if (!W || !H) return; const R = (q.tab === 'slope' && R9 && el.dataset.p === 'mp9a') ? R9.a : C.solve[q.tab](q.input); el.innerHTML = C.draw[q.tab](R, W, H, { dims: e.fig && e.fig.dims, fig: true }); }); }
  function show(i, scroll) {
    cur = Math.max(0, Math.min(EX.length - 1, i)); const e = EX[cur];
    view.innerHTML = html(e); idx.querySelectorAll('.mp-tile').forEach((b, k) => { b.classList.toggle('on', k === cur); b.setAttribute('aria-selected', k === cur); });
    document.getElementById('mpPrev').disabled = cur === 0; document.getElementById('mpNext').disabled = cur === EX.length - 1;
    drawFigs(); guardAll(view);
    if (scroll) { const a = document.getElementById('mpIdx'); if (a) a.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  }
  idx.addEventListener('click', (ev) => { const b = ev.target.closest('.mp-tile'); if (b) show(+b.dataset.i); });
  document.getElementById('mpPrev').addEventListener('click', () => show(cur - 1, true));
  document.getElementById('mpNext').addEventListener('click', () => show(cur + 1, true));
  view.addEventListener('click', (ev) => {
    const o = ev.target.closest('.mp-open'); if (o) { const q = P[o.dataset.p]; if (q && C.open) C.open(q.tab, q.input); return; }
    const a = ev.target.closest('.mp-all'); if (a) { const on = a.getAttribute('aria-pressed') !== 'true'; view.querySelectorAll('.mp-st').forEach(d => d.open = on); a.setAttribute('aria-pressed', on); a.textContent = on ? 'Összes lépés becsukása' : 'Összes lépés kibontása'; }
  });
  let rz = 0; if (window.ResizeObserver) new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(drawFigs); }).observe(view);
  function reg() { if (C.registerPresets) C.registerPresets(Object.keys(P).map(id => { const e = EX.find(x => id.startsWith(x.id)); const suf = id.length > e.id.length ? ` ${id.slice(-1)})` : ''; return { id, tab: P[id].tab, label: `${e.n}${suf} – ${e.short.replace(/<[^>]+>/g, '')}`, input: P[id].input }; })); }
  reg();
  const m = /^#mp-(\d)$/.exec(location.hash || ''); show(m ? +m[1] - 1 : 0, false); if (m) setTimeout(() => { const el = document.getElementById('mp-' + m[1]); if (el) el.scrollIntoView({ block: 'start' }); }, 300);
  window.EXAMPLES = { list: EX, presets: P, show, get current() { return cur; } };
})();
