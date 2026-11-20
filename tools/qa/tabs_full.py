import asyncio, sys, os
from playwright.async_api import async_playwright
# usage: tabs_full.py url outdir width '<fülgombok szelektora>' [theme]  – fejezetenként teljes oldalas kép
url, out, W, sel = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
theme = sys.argv[5] if len(sys.argv) > 5 else ''
os.makedirs(out, exist_ok=True)
ARGS = ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        pg = await b.new_page(viewport={'width': W, 'height': 1000})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(url, wait_until='networkidle'); await pg.wait_for_timeout(1500)
        if theme: await pg.evaluate(f"document.documentElement.setAttribute('data-theme','{theme}')")
        n = await pg.locator(sel).count()
        for i in range(n):
            await pg.evaluate("(a) => document.querySelectorAll(a[0])[a[1]].click()", [sel, i]); await pg.wait_for_timeout(1500)
            H = await pg.evaluate('document.documentElement.scrollHeight'); y = 0
            while y < H: await pg.evaluate(f'window.scrollTo(0,{y})'); await pg.wait_for_timeout(150); y += 800
            await pg.evaluate('window.scrollTo(0,0)'); await pg.wait_for_timeout(500)
            await pg.screenshot(path=f'{out}/ch{i}.jpg', type='jpeg', quality=72, full_page=True)
            print(i, H)
        print(errs[:5]); await b.close()
asyncio.run(main())
