# Síkalapok állékonyságvizsgálata

Interaktív tananyag a BME Építőmérnöki Kar *Alapozás* tárgyához: elcsúszás, felborulás, felúszás és általános állékonyság az MSZ EN 1997-1 (Eurocode 7) és nemzeti melléklete szerint.

**Élő oldal:** https://sikalapokallekonysagvizsgalata.vercel.app

## Tartalom
- négy 3D szimulátor (three.js): szögtámfal elcsúszása (drénezett/drénezetlen, monolit/előregyártott, földellenállás), reklámtábla felborulása (talaj: B/10 pont, kőzet: sarokpont), mélygarázs felúszása (túlnyújtás, mikrocölöp, leszívás, elárasztás), ház a löszrézsű tetején (egyszerűsített Bishop, csúszólap-keresés)
- ragadós témasáv: a négy vizsgálat neve, kattintásra a fejezet elejére ugrik
- kilenc mintapélda (MP1–MP9) lépésenként, és kalkulátor mind a négy vizsgálathoz (2D metszet és 3D modell)
- interaktív ábrák: alap–talaj érintkezés, mobilizált földellenállás, külpontosság és talpfeszültség, budapesti árvízszintek, 2D csúszólap-keresés
- az új Eurocode 7 (igazolási esetek VC1–VC4, MFA/RFA, ütemterv)
- 5 animációs videó (`video/v1–v5.html`, önálló HTML-lejátszók, MP4 exporttal)
- fejezetenkénti kvízek, „melyik a kritikus?” feladat, 40 igaz/hamis állítás

## Felépítés
- `src/` – források: `index.src.html`, `calc.src.html`, `style.css`, `calc.css`, `app.js`, `mech.js` (a szimulátorok számításai), `widgets.js`, `data.js`, `sim3d.js`, `calc.js` (kalkulátor és a 2D ábrák), `calc3d.js`, `examples.js` (mintapéldák)
- `fonts/`, `vendor/` – a betűk (Archivo, Source Sans 3) és a three.js helyből töltődnek, külső szolgáltató nélkül
- `build.py` – a forrásokból összeállítja az egyfájlos `index.html`-t (`python3 build.py`)
- `img/`, `video/` – bélyegképek, videólejátszók

A `main` ágra történő push után a Vercel automatikusan frissíti az oldalt.

## Angol változat (`/en`)

- **Élő oldal:** https://sikalapokallekonysagvizsgalata.vercel.app/en – brit angol, EC7-terminológia; a fejléc HU | EN váltója a választást megjegyzi (`localStorage 'alap-lang'`), és a másik nyelvű oldalon ugyanannál a fejezetnél folytat.
- A magyar `src/` a forrás: a `python3 build.py` az `index.html` mellett az `en.html`-t is elkészíti. Az `i18n/apply.mjs` a fordítási egységeket (HTML-szövegek, attribútumok, JS-karakterláncok) az `i18n/en_*.tsv` párjai szerint cseréli; hiányzó fordításnál a build leáll, a hiányzók az `i18n/missing.tsv`-be kerülnek (előfeltétel egyszer: `cd i18n && npm install`).
- Az angol oldalon tizedespont (a JS-literálokban az `i18n/numfix_js.mjs`), tg → tan, angol sortörés-őr és en-gb elválasztás (`vendor/hyphenopoly/patterns/en-gb.wasm`); az alsó indexek közül G<sub>sz</sub> → G<sub>str</sub>, G<sub>t</sub> → G<sub>soil</sub>.
- Az öt videó angol változata: `video/en/v1–v5.html` (a videóforrásból, en-GB).


## Videók zenéje

A videók zenéje (2026-11) valódi hangszerek felvett mintáiból készült – zongora, vonósok, akusztikus és elektromos gitár, basszusgitár, fúvósok, akusztikus dob –, ütemre igazítva a képhez; a gép- és effekthangok a korábbi hangkönyvtárból vannak. Hangminták: Salamander Grand Piano (Alexander Holm, CC BY 3.0); tonejs-instruments (nbrosowsky; VSCO2, Karoryfer, Iowa, Freesound – CC BY 3.0); Tone.js dobminták.

## Átnézés, ellenőrző eszközök (`tools/qa/`)

Helyi szerver a repó gyökerében (`python3 -m http.server 8850`), Playwright szoftveres WebGL-lel.

- `audit.py <url> hu|en [szélességek]` – tördelés: lyukas sorkizárt sorok, tiltott sorvégek, nem középre zárt dobozcímek, vízszintes túlcsordulás, konzolhibák; angol oldalon magyar szó és tizedesvessző.
- `scan.py <url> <mappa> <szélesség>` – az egész oldal végigfényképezése; `sheet.py` – áttekintő lapok.
- `states.py <url> <mappa> <szélesség> [light|dark] [mp|calc|sims|widgets]` – állapotbejáró: mintapéldák, kalkulátorfülek 2D/3D nézetben, szimulátorok, interaktív ábrák.
- `svgcheck.py <url> <mappa> [szélesség] [--shots]` – az SVG-ábrák feliratütközései (felirat–felirat, feliratot keresztező vonal, kilógó felirat) minden mintapéldán és kalkulátorfülön; elvárás: 0 találat (a méretvonal saját végjele megengedett).
- `i18n/carry.py <régi_párok.txt> [--write]`, `i18n/carry.py --prune`, `i18n/pairs.mjs` – a magyar szöveg módosítása után a régi angol párok megkeresése, az elavult sorok törlése, a HU–EN párok kiírása végigolvasáshoz.

A 2D ábrák feliratait a `calc.js` feliratelhelyezője teszi a helyükre: minden vonal, nyíl és körvonal akadály, a felirat a legközelebbi szabad helyre kerül.
