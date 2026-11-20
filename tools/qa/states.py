"""Az állékonyság-app állapotbejárója: mintapéldák (minden lépés kibontva), a kalkulátor négy füle 2D és 3D nézetben,
a négy fejezet-szimulátor és az interaktív ábrák. Használat:
  python3 tools/qa/states.py <url> <mappa> <szélesség> [light|dark] [mp|calc|sims|widgets …]"""
import asyncio, sys, os
from playwright.async_api import async_playwright
url, out, W = sys.argv[1], sys.argv[2], int(sys.argv[3])
theme = sys.argv[4] if len(sys.argv) > 4 else 'light'
what = sys.argv[5:] or ['mp', 'calc', 'sims', 'widgets']
os.makedirs(out, exist_ok=True)
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': W, 'height': 1000}, device_scale_factor=1 if W > 500 else 2, color_scheme=theme)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:300]))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text[:300]) if m.type == 'error' else None)
        await pg.goto(url, wait_until='networkidle'); await pg.wait_for_timeout(1500)
        await pg.evaluate(f"document.documentElement.setAttribute('data-theme','{theme}'); document.documentElement.style.scrollBehavior='auto'")
        async def shot(sel, name, wait=900, full=True):
            el = pg.locator(sel).first
            await el.scroll_into_view_if_needed(); await pg.wait_for_timeout(wait)
            try: await el.screenshot(path=f'{out}/{name}.jpg', type='jpeg', quality=78, timeout=60000)
            except Exception as e: errs.append(f'SHOT {name} ' + str(e)[:120])
        if 'mp' in what:
            n = await pg.locator('#mpIdx button').count()
            for i in range(n):
                await pg.evaluate("(i) => document.querySelectorAll('#mpIdx button')[i].click()", i); await pg.wait_for_timeout(500)
                await pg.evaluate("() => { const a = document.querySelector('.mp-all'); if (a && a.getAttribute('aria-pressed') !== 'true') a.click(); }"); await pg.wait_for_timeout(500)
                await shot('#mpView, .mp-view, #mintapeldak .mp', f'mp{i+1}')
        if 'calc' in what:
            for tab in ['sliding', 'overturn', 'uplift', 'slope']:
                await pg.evaluate("(t) => document.querySelector(`.cx-tab[data-tab=\"${t}\"]`).click()", tab); await pg.wait_for_timeout(700)
                await pg.evaluate("() => document.querySelectorAll('#cx details').forEach(d => d.open = true)")
                await shot('#cx', f'calc_{tab}_2d')
                await pg.evaluate("() => { const b = document.querySelector('#cx-vmode button[data-v=\"3d\"]'); if (b) b.click(); }"); await pg.wait_for_timeout(2500)
                await shot('#cx .cx-stage, #cx .cx-view, #cx', f'calc_{tab}_3d', 1500)
                await pg.evaluate("() => { const b = document.querySelector('#cx-vmode button[data-v=\"2d\"]'); if (b) b.click(); }"); await pg.wait_for_timeout(400)
        if 'sims' in what:
            for m in ['csuszas', 'borulas', 'feluszas', 'altalanos']:
                await shot(f'.sim[data-sim={m}]', f'sim_{m}', 3000)
        if 'widgets' in what:
            n = await pg.locator('.panel').count()
            for i in range(n):
                await shot(f'.panel >> nth={i}', f'panel{i}', 700)
        print('\n'.join(errs[:20]) or 'no errors')
        await b.close()
asyncio.run(main())
