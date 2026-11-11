# Angol változat (en.html → /en)

A magyar `src/` a forrás. Szerkesztés után a gyökérben:

    cd i18n && npm install   # egyszer (acorn, acorn-walk, parse5)
    cd .. && python3 build.py   # → index.html + en.html

- `en_b01–b09.tsv` – a fordítási párok: `<azonosító><TAB><angol>`; az azonosító a magyar szöveg sha1-ének első 7 jegye.
  `=` → változatlan, `⏎` → sortörés, `<id>!` → kódnak minősített karakterlánc kényszerített fordítása.
- Sablonkarakterláncban a `${…}` kifejezések a magyar forrással betűre azonosak maradnak; a beágyazott karakterláncok külön egységek.
- Ha a magyar szöveg változik, a build leáll, és a hiányzó egységeket a `missing.tsv`-be írja: ezeket kell lefordítani.
- Az angol oldal: `lang="en-GB"`, en-gb elválasztás, tizedespont (`numfix_js.mjs`: JS-literálok, acornnal), tg → tan.
