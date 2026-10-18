#!/usr/bin/env python3
"""Összeállítja az index.html-t: a CSS és JS forrásokat beágyazza."""
import pathlib
R = pathlib.Path(__file__).parent
src = R / 'src'

css = (src / 'style.css').read_text() + '\n' + (src / 'calc.css').read_text()
body = (src / 'index.src.html').read_text().replace('<!--CALC-->', (src / 'calc.src.html').read_text())
classic = ''.join(f"<script>\n{(src / f).read_text()}\n</script>\n" for f in ['app.js', 'mech.js', 'widgets.js', 'data.js', 'calc.js', 'examples.js'])
module = ''.join(f"<script type=\"module\">\n{(src / f).read_text()}\n</script>\n" for f in ['sim3d.js', 'calc3d.js'])

head = """<title>Síkalapok állékonyságvizsgálata</title>
<meta name="description" content="Interaktív tananyag: elcsúszás, felborulás, felúszás és általános állékonyság – EC7 szerinti igazolás 3D szimulátorokkal, animációs videókkal és kvízekkel.">
<meta name="theme-color" content="#3b2360">
<meta property="og:title" content="Síkalapok állékonyságvizsgálata">
<meta property="og:description" content="BME Alapozás – interaktív tananyag négy 3D szimulátorral, öt animációs videóval és kvízekkel.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 34 34'%3E%3Crect width='34' height='34' rx='9' fill='%233b2360'/%3E%3Cpath d='M8 24h18M11 24v-4h12v4M17 20V9' stroke='white' stroke-width='2.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M10 11l14 -3' stroke='%23ff8a4c' stroke-width='2.6' stroke-linecap='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500;62..125,700;62..125,800;62..125,900&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap">
<script src="vendor/hyphenopoly/Hyphenopoly_Loader.js"></script>
<script>if (window.Hyphenopoly) Hyphenopoly.config({ require: { hu: "FORCEHYPHENOPOLY" }, setup: { hide: "none", selectors: { ".hyphenate": { minWordLength: 6 } } } });</script>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>
"""

full_body = body.replace('<!--SCRIPTS-->', classic + module)
html = f"""<!doctype html>
<html lang="hu">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{head}<style>
{css}
</style>
</head>
<body>
{full_body}
</body>
</html>
"""
(R / 'index.html').write_text(html)
print('index.html', len(html) // 1024, 'KB')
