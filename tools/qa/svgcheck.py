"""SVG-ábrák feliratütközés-vizsgálója: minden <text> befoglalóját összeveti a többi felirattal és a vonalakkal
(line, polyline, path – mintavételezve). Kiírja: felirat–felirat átfedés, feliratot keresztező vonal, a képből kilógó felirat.
Használat: python3 tools/qa/svgcheck.py <url> <mappa> [szélesség] [--shots]
Az app állapotait a STATES lista járja be (mintapéldák, kalkulátorfülek) – más appnál ezt kell átírni."""
import asyncio, sys, os, json
from playwright.async_api import async_playwright
url, out = sys.argv[1], sys.argv[2]
W = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 1440
SHOTS = '--shots' in sys.argv
os.makedirs(out, exist_ok=True)
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
JS = r"""
(sel) => {
  const res = [];
  document.querySelectorAll(sel).forEach((svg, si) => {
    const sr = svg.getBoundingClientRect(); if (sr.width < 40) return;
    const T = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim() && t.getBoundingClientRect().width > 0).map(t => { const r = t.getBoundingClientRect(); const pad = -1.5;
      return { el: t, s: t.textContent.replace(/​/g, '').trim().slice(0, 40), x0: r.left - pad, x1: r.right + pad, y0: r.top + 2.5, y1: r.bottom - 2.5 }; });
    const hit = [], seen = new Set();
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) { const a = T[i], b = T[j]; if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1) hit.push(`SZÖVEG×SZÖVEG „${a.s}” × „${b.s}”`); }
    for (const t of T) { if (t.x0 < sr.left - 1 || t.x1 > sr.right + 1 || t.y0 < sr.top - 1 || t.y1 > sr.bottom + 1) hit.push(`KILÓG „${t.s}”`); }
    const inT = (x, y) => T.filter(t => x > t.x0 && x < t.x1 && y > t.y0 && y < t.y1);
    const geo = [...svg.querySelectorAll('line, polyline, path, polygon, circle')].filter(g => !g.closest('defs, pattern, clipPath'));
    for (const g of geo) {
      const cs = getComputedStyle(g); if (cs.stroke === 'none' || parseFloat(cs.strokeWidth) < 0.5 || parseFloat(cs.opacity) < 0.2 || cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (parseFloat(cs.strokeOpacity) < 0.3) continue;
      let L = 0; try { L = g.getTotalLength(); } catch (e) { continue; } if (!(L > 2)) continue;
      const m = g.getScreenCTM(); if (!m) continue; const n = Math.min(400, Math.max(8, Math.round(L / 2)));
      for (let k = 0; k <= n; k++) { const p = g.getPointAtLength(L * k / n); const x = m.a * p.x + m.c * p.y + m.e, y = m.b * p.x + m.d * p.y + m.f;
        for (const t of inT(x, y)) { const key = t.s + '|' + (g.getAttribute('class') || g.parentNode.getAttribute('class') || g.tagName); if (!seen.has(key)) { seen.add(key); hit.push(`VONAL×SZÖVEG „${t.s}” ← ${(g.getAttribute('class') || g.parentNode.getAttribute('class') || g.tagName)}`); } } }
    }
    res.push({ i: si, w: Math.round(sr.width), n: T.length, hit });
  });
  return res;
}
"""
async def main():
    tot = 0
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': W, 'height': 1000}, device_scale_factor=2)
        pg = await ctx.new_page()
        await pg.goto(url, wait_until='networkidle'); await pg.wait_for_timeout(1500)
        await pg.evaluate("document.documentElement.style.scrollBehavior='auto'")
        async def check(name, sel):
            nonlocal tot
            el = pg.locator(sel).first
            try: await el.scroll_into_view_if_needed(timeout=5000)
            except Exception: print(name, 'nincs ilyen ábra'); return
            await pg.wait_for_timeout(500)
            r = await pg.evaluate(JS, sel)
            for s in r:
                tot += len(s['hit'])
                print(f"{name} [{s['w']}px, {s['n']} felirat]: {len(s['hit'])} találat")
                for h in s['hit']: print('    ', h)
            if SHOTS:
                try: await el.screenshot(path=f'{out}/{name}.png')
                except Exception as e: print('   SHOT', str(e)[:80])
        n = await pg.locator('#mpIdx button').count()
        for i in range(n):
            await pg.evaluate("(i) => document.querySelectorAll('#mpIdx button')[i].click()", i); await pg.wait_for_timeout(700)
            await check(f'mp{i+1}', '#mpView svg.cv')
        for tab in ['sliding', 'overturn', 'uplift', 'slope']:
            await pg.evaluate("(t) => document.querySelector(`.cx-tab[data-tab=\"${t}\"]`).click()", tab); await pg.wait_for_timeout(900)
            await check(f'calc_{tab}', '#cx-2d svg.cv')
        if '--extra' in sys.argv:
            await check('oldal', 'main svg:not(.cv)')
        await b.close()
    print('ÖSSZESEN', tot)
asyncio.run(main())
