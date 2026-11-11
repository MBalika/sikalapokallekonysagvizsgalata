#!/usr/bin/env python3
"""Összeállítja az index.html-t (magyar) és az en.html-t (angol, /en): a CSS és JS forrásokat beágyazza.

Használat:  python3 build.py            (előfeltétel egyszer: cd i18n && npm install)
Az angol változat a magyar src/ forrásokból készül: az i18n/apply.mjs a fordítási egységeket (HTML-szövegek,
attribútumok, JS-karakterláncok) az i18n/en_*.tsv párjai szerint cseréli. Hiányzó fordításnál vagy hibás párnál
az angol build leáll, a hiányzó egységek az i18n/missing.tsv-be kerülnek.
"""
import os, pathlib, re, shutil, subprocess, sys
R = pathlib.Path(__file__).parent
SRC = R / 'src'
CLASSIC = ['app.js', 'mech.js', 'widgets.js', 'data.js', 'calc.js', 'examples.js']
MODULES = ['sim3d.js', 'calc3d.js']
SITE = 'https://sikalapokallekonysagvizsgalata.vercel.app'
ALT = f"""<link rel="alternate" hreflang="hu" href="{SITE}/">
<link rel="alternate" hreflang="en" href="{SITE}/en">
<link rel="alternate" hreflang="x-default" href="{SITE}/">
"""
COMMON = """<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'%3E%3Crect width='34' height='34' rx='9' fill='%233b2360'/%3E%3Cpath d='M8 24h18M11 24v-4h12v4M17 20V9' stroke='white' stroke-width='2.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M10 11l14 -3' stroke='%23ff8a4c' stroke-width='2.6' stroke-linecap='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500;62..125,700;62..125,800;62..125,900&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<script src="vendor/hyphenopoly/Hyphenopoly_Loader.js"></script>
<script>if (window.Hyphenopoly) Hyphenopoly.config({ require: { @LANG@: "FORCEHYPHENOPOLY" }, setup: { hide: "none", selectors: { ".hyphenate": { minWordLength: 6, compound: "auto" } } } });</script>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
"""
HEAD = {
  'hu': """<title>Síkalapok állékonyságvizsgálata</title>
<meta name="description" content="Interaktív tananyag: elcsúszás, felborulás, felúszás és általános állékonyság – EC7 szerinti igazolás 3D szimulátorokkal, animációs videókkal és kvízekkel.">
<meta name="theme-color" content="#3b2360">
<meta property="og:title" content="Síkalapok állékonyságvizsgálata">
<meta property="og:description" content="BME Alapozás – interaktív tananyag négy 3D szimulátorral, öt animációs videóval és kvízekkel.">
""" + ALT + """<script>/*nyelv*/try{if(localStorage.getItem('alap-lang')==='en'&&!/[?&]hu\\b/.test(location.search))location.replace('en'+location.hash)}catch(e){}</script>
""" + COMMON.replace('@LANG@', 'hu'),
  'en-GB': """<title>Stability of shallow foundations</title>
<meta name="description" content="Interactive learning module: sliding, overturning, uplift and overall stability – verification to EC7 with 3D simulators, animated videos and quizzes.">
<meta name="theme-color" content="#3b2360">
<meta property="og:title" content="Stability of shallow foundations">
<meta property="og:description" content="BME Foundation Engineering – interactive module with four 3D simulators, five animated videos and quizzes.">
""" + ALT + COMMON.replace('@LANG@', '"en-gb"'),
}


def build(src, out, lang):
    css = (src / 'style.css').read_text() + '\n' + (src / 'calc.css').read_text()
    body = (src / 'index.src.html').read_text().replace('<!--CALC-->', (src / 'calc.src.html').read_text())
    classic = ''.join(f"<script>\n{(src / f).read_text()}\n</script>\n" for f in CLASSIC)
    module = ''.join(f"<script type=\"module\">\n{(src / f).read_text()}\n</script>\n" for f in MODULES)
    full_body = body.replace('<!--SCRIPTS-->', classic + module)
    if lang != 'hu':   # a nyelvváltó a magyar oldalra mutat
        a = 'id="langSw" href="en" hreflang="en" lang="en"'
        assert full_body.count(a) == 1
        full_body = full_body.replace(a, 'id="langSw" href="./" hreflang="hu" lang="hu"')
    html = f"""<!doctype html>
<html lang="{lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{HEAD[lang]}<style>
{css}
</style>
</head>
<body>
{full_body}
</body>
</html>
"""
    out.write_text(html)
    print(out.name, len(html) // 1024, 'KB')
    return html


build(SRC, R / 'index.html', 'hu')

# ---- angol változat: fordított források az i18n/.en/ mappába, abból en.html ----
I = R / 'i18n'
EN = I / '.en'
shutil.rmtree(EN, ignore_errors=True); EN.mkdir(parents=True)
for f in ['style.css', 'calc.css']:
    shutil.copy(SRC / f, EN / f)
files = ['index.src.html', 'calc.src.html'] + CLASSIC + MODULES
tsv = ','.join(str(p) for p in sorted(I.glob('en_*.tsv')))
r = subprocess.run(['node', str(I / 'apply.mjs'), str(SRC), str(EN), tsv, *files], capture_output=True, text=True,
                   env={**os.environ, 'STRICT': '1', 'NUMFIX': '1'})
print(r.stdout.strip())
if r.returncode:
    print(r.stderr[-3000:]); print('Az angol változat nem készült el (a hiányzó fordítások: i18n/missing.tsv).'); sys.exit(1)
(I / 'missing.tsv').unlink(missing_ok=True)

# tizedesvessző → pont a le nem fordított HTML-szövegekben (képletek, számok): csak a címkék közötti szövegben
for f in ['index.src.html', 'calc.src.html']:
    p = EN / f; t = p.read_text()
    p.write_text(re.sub(r'>([^<]*)<', lambda m: '>' + re.sub(r'(?<=\d),(?=\d)', '.', m.group(1)) + '<', t))
# attribútumban álló mértékegység (csúszka-kijelzés): darab → piles
p = EN / 'index.src.html'; t = p.read_text(); assert t.count('data-u=" db"') == 1; p.write_text(t.replace('data-u=" db"', 'data-u=" piles"'))
# a JS-ben a képletrészletek (behelyettesítés, tényezők) is ponttal (karakterlánc-literálok és sablonrészek, acorn), a tg függvénynév angolul tan
r = subprocess.run(['node', str(I / 'numfix_js.mjs'), *[str(EN / f) for f in CLASSIC + MODULES]], capture_output=True, text=True)
print(r.stdout.strip().replace('\n', ' · '))
if r.returncode: print(r.stderr); sys.exit(1)
TG = re.compile(r"\btg(?=²|\$\{NB\}|' \+ NB|\u00a0| [δφ]|&nbsp;)")
for f in CLASSIC + MODULES:
    p = EN / f; p.write_text(TG.sub('tan', p.read_text()))

# magyar rövidítésű alsó indexek angolul: G_sz (szerkezet) → G_str, G_t (talaj) → G_soil, W_b → W_c, W_t → W_s
SUBS = [(re.compile(r"(G<sub>|G_\{|sb\('G', ')sz;"), r"\1str;"), (re.compile(r"(G<sub>|G_\{|sb\('G', ')t;"), r"\1soil;"),
        (re.compile(r"sb\('W', 'b'\)"), "sb('W', 'c')"), (re.compile(r"sb\('W', 't'\)"), "sb('W', 's')")]   # W_b (beton) → W_c, W_t (talaj) → W_s
nsub = 0
for f in CLASSIC + MODULES + ['index.src.html', 'calc.src.html']:
    p = EN / f; t = p.read_text()
    for rx, rp in SUBS: t, n = rx.subn(rp, t); nsub += n
    p.write_text(t)
print('alsó indexek (sz/t → str/soil):', nsub)
build(EN, R / 'en.html', 'en-GB')
# a társoldalak angol változatára mutató hivatkozások (…/en, a fejezet-horgonnyal együtt)
p = R / 'en.html'; t = p.read_text(); tot = 0
for site in ['sikalapoktervezese', 'sikalapok-teherbirasszamitasa', 'talajfelderites', 'kedvezotlen-altalaj', 'sikalapok-sullyedesszamitasa']:
    t, n = re.subn(rf'https://{site}\.vercel\.app/(#[\w-]+)?(?=["\'])', lambda m, s=site: f'https://{s}.vercel.app/en' + (m.group(1) or ''), t); tot += n
p.write_text(t); print('társoldal-linkek → /en:', tot)
