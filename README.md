# Síkalapok állékonyságvizsgálata

Interaktív tananyag a BME Építőmérnöki Kar *Alapozás* tárgyához – a *Síkalapok állékonyság- és stabilitásvizsgálata* jegyzet és az előadás diái alapján, webes forrásokkal kiegészítve.

**Élő oldal:** https://sikalapokallekonysagvizsgalata.vercel.app

## Tartalom
- négy 3D szimulátor (three.js): szögtámfal elcsúszása (drénezett/drénezetlen, monolit/előregyártott, földellenállás), reklámtábla felborulása (talaj: B/10 pont, kőzet: sarokpont), mélygarázs felúszása (túlnyújtás, mikrocölöp, leszívás, elárasztás), ház a löszrézsű tetején (egyszerűsített Bishop, csúszólap-keresés)
- „igazolólap”: a négy szimulátor kihasználtsága (Λ = E<sub>d</sub>/R<sub>d</sub>) mindig látható sávban
- interaktív ábrák: alap–talaj érintkezés, mobilizált földellenállás, külpontosság és talpfeszültség, budapesti árvízszintek, 2D csúszólap-keresés
- az új Eurocode 7 (igazolási esetek VC1–VC4, MFA/RFA, ütemterv)
- 5 animációs videó (`video/v1–v5.html`, önálló HTML-lejátszók, MP4 exporttal)
- fejezetenkénti kvízek, „melyik a kritikus?” feladat, 40 igaz/hamis állítás

## Felépítés
- `src/` – források: `index.src.html`, `style.css`, `app.js`, `mech.js` (számítások), `widgets.js`, `data.js`, `sim3d.js`
- `build.py` – a forrásokból összeállítja az egyfájlos `index.html`-t (`python3 build.py`)
- `img/`, `video/` – bélyegképek, videólejátszók

A `main` ágra történő push után a Vercel automatikusan frissíti az oldalt.
