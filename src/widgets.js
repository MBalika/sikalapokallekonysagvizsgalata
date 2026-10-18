/* ===== 2D ábrák: hős-animáció és fejezetenkénti interaktív ábrák ===== */
(function () {
  const { $, $$, clamp, lerp, fmt, css, bindRange, seg, hiCanvas } = window.U; const M = window.MECH;
  const visMap = new WeakMap(); const io = new IntersectionObserver((es) => es.forEach((e) => visMap.set(e.target, e.isIntersecting)), { rootMargin: '120px' });
  const vis = (el) => { if (!visMap.has(el)) { visMap.set(el, false); io.observe(el); } return visMap.get(el) && !document.hidden; };
  const sm = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const col = () => ({ ink: css('--ink'), ink2: css('--ink2'), mute: css('--mute'), line: css('--line'), card: css('--card'), paper: css('--paper2'), c1: css('--c1'), c2: css('--c2'), c3: css('--c3'), c4: css('--c4'), ok: css('--ok'), bad: css('--bad'), water: css('--water'), soil: css('--soil'), soil2: css('--soil2'), conc: css('--conc'), plum: css('--plum2') });
  function arrow(g, x0, y0, x1, y1, c, w = 4, hd = 12) { const a = Math.atan2(y1 - y0, x1 - x0); g.save(); g.strokeStyle = c; g.fillStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - Math.cos(a) * hd * 0.8, y1 - Math.sin(a) * hd * 0.8); g.stroke(); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a - 0.45) * hd, y1 - Math.sin(a - 0.45) * hd); g.lineTo(x1 - Math.cos(a + 0.45) * hd, y1 - Math.sin(a + 0.45) * hd); g.closePath(); g.fill(); g.restore(); }
  function hatch(g, x, y, w, h, c1, c2) { g.save(); g.fillStyle = c1; g.fillRect(x, y, w, h); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.strokeStyle = c2; g.lineWidth = 1; g.globalAlpha = 0.35; for (let i = -h; i < w; i += 10) { g.beginPath(); g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); g.stroke(); } g.restore(); }
  function label(g, t, x, y, c, size = 14, align = 'left', w = 700) { g.save(); g.font = `${w} ${size}px Archivo, sans-serif`; g.fillStyle = c; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(t, x, y); g.restore(); }

  // ================= HŐS: négy tönkremenetel =================
  (function hero() {
    const cv = $('#heroCv'); if (!cv) return; const W = 640, Hh = 420; let g = hiCanvas(cv, W, Hh);
    const btns = $$('.modes button'); let mode = 0, auto = true, t0 = performance.now(), last = -1;
    btns.forEach((b, i) => b.addEventListener('click', () => { mode = i; auto = false; t0 = performance.now(); mark(); }));
    const mark = () => btns.forEach((b, i) => { b.classList.toggle('on', i === mode); b.setAttribute('aria-pressed', i === mode); });
    mark();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function frame(now) {
      let t = (now - t0) / 1000; if (auto && t > 5.2) { mode = (mode + 1) % 4; t0 = now; t = 0; mark(); }
      const k = reduce ? 0.6 : sm((t - 0.8) / 2.2) * (1 - sm((t - 4.4) / 0.7) * (auto ? 1 : 0));
      if (vis(cv) || last < 0) { draw(mode, k, t); last = 1; } requestAnimationFrame(frame);
    }
    const ground = 230;
    function draw(m, k, t) {
      const C = col(); g.clearRect(0, 0, W, Hh);
      const sky = g.createLinearGradient(0, 0, 0, ground); sky.addColorStop(0, C.paper); sky.addColorStop(1, C.card); g.fillStyle = sky; g.fillRect(0, 0, W, ground);
      const kc = [C.c1, C.c2, C.c3, C.c4][m];
      if (m === 0) { // elcsúszás: szögtámfal
        hatch(g, 0, ground, W, Hh - ground, C.soil, C.soil2);
        g.fillStyle = C.soil2; g.fillRect(0, ground - 120, 270, 120); hatch(g, 0, ground - 120, 270, 120, C.soil2, C.soil);
        const u = k * 46; g.save(); g.translate(u, 0); g.fillStyle = C.conc; g.strokeStyle = C.ink; g.lineWidth = 2;
        g.beginPath(); g.moveTo(170, ground + 60); g.lineTo(340, ground + 60); g.lineTo(340, ground + 30); g.lineTo(300, ground + 30); g.lineTo(298, ground - 130); g.lineTo(272, ground - 130); g.lineTo(270, ground + 30); g.lineTo(170, ground + 30); g.closePath(); g.fill(); g.stroke(); g.restore();
        for (let i = 0; i < 6; i++) { const y = ground - 110 + i * 30; arrow(g, 200 - i * 10 + u, y, 268 + u, y, C.bad, 3, 10); }
        arrow(g, 330 + u, ground + 70, 230 + u, ground + 70, C.ok, 4, 12); label(g, 'súrlódás a talp alatt', 345 + u, ground + 82, C.ok, 13, 'left', 700);
        g.save(); g.fillStyle = C.soil2; g.globalAlpha = 0.9; g.beginPath(); g.moveTo(340 + u, ground); g.quadraticCurveTo(360 + u, ground - 10 * k, 420, ground); g.fill(); g.restore();
        label(g, 'földnyomás', 120, ground - 140, C.bad, 14);
      }
      if (m === 1) { // felborulás: reklámtábla
        hatch(g, 0, ground, W, Hh - ground, C.soil, C.soil2);
        const piv = { x: 360, y: ground + 50 }, th = k * 0.5;
        for (let i = 0; i < 5; i++) { const y = 76 + i * 11, x = 50 + ((t * 160 + i * 70) % 130); arrow(g, x, y, x + 64, y, C.c2, 3, 9); }
        g.save(); g.translate(piv.x, piv.y); g.rotate(th); g.translate(-piv.x, -piv.y);
        g.fillStyle = C.conc; g.strokeStyle = C.ink; g.lineWidth = 2; g.fillRect(260, ground + 10, 100, 40); g.strokeRect(260, ground + 10, 100, 40);
        g.fillStyle = C.ink2; g.fillRect(304, ground - 110, 12, 120);
        g.fillStyle = C.c2; g.fillRect(250, ground - 170, 120, 64); g.fillStyle = C.card; g.font = '800 18px Archivo, sans-serif'; g.textAlign = 'center'; g.fillText('M_{dst} ≤ M_{stb}', 310, ground - 132);
        g.restore();
        g.fillStyle = C.c2; g.beginPath(); g.arc(piv.x, piv.y, 6, 0, 7); g.fill(); label(g, 'forgáspont', piv.x + 12, piv.y + 14, C.c2, 13);
      }
      if (m === 2) { // felúszás: földalatti tartály
        hatch(g, 0, ground, W, Hh - ground, C.soil, C.soil2);
        const wl = lerp(ground + 120, ground + 22, sm(k * 1.3)); g.save(); g.globalAlpha = 0.45; g.fillStyle = C.water; g.fillRect(0, wl, W, Hh - wl); g.restore();
        g.strokeStyle = C.water; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(0, wl); g.lineTo(W, wl); g.stroke(); g.setLineDash([]); label(g, 'talajvíz', 18, wl - 12, C.water, 13);
        const lift = sm((k - 0.45) / 0.55) * 46; g.save(); g.translate(0, -lift);
        g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 3; g.fillRect(200, ground + 20, 240, 130); g.strokeRect(200, ground + 20, 240, 130);
        g.fillStyle = C.paper; g.fillRect(212, ground + 32, 216, 106); g.restore();
        for (let i = 0; i < 6; i++) { const x = 220 + i * 40; arrow(g, x, Hh - 6, x, ground + 154 - lift, C.water, 3, 10); }
        label(g, 'felhajtóerő', 448, ground + 120, C.water, 14);
      }
      if (m === 3) { // általános állékonyság: ház a rézsű tetején
        const P = [[0, ground - 60], [250, ground - 60], [450, ground + 90], [W, ground + 90], [W, Hh], [0, Hh]];
        g.save(); g.beginPath(); P.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip(); hatch(g, 0, 0, W, Hh, C.soil, C.soil2); g.restore();
        const cx = 353.7, cy = ground - 92.3, r = 206.2, rot = -k * 0.1;
        g.save(); g.translate(cx, cy); g.rotate(rot); g.translate(-cx, -cy);
        g.save(); g.beginPath(); g.moveTo(150, ground - 60); g.lineTo(250, ground - 60); g.lineTo(450, ground + 90); for (let a = Math.atan2(ground + 90 - cy, 450 - cx); a <= Math.atan2(ground - 60 - cy, 150 - cx) + 1e-3; a += 0.02) g.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); g.closePath(); g.fillStyle = C.c4; g.globalAlpha = 0.28; g.fill(); g.restore();
        g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 2; g.fillRect(170, ground - 118, 60, 58); g.strokeRect(170, ground - 118, 60, 58); g.fillStyle = C.c1; g.beginPath(); g.moveTo(162, ground - 118); g.lineTo(200, ground - 146); g.lineTo(238, ground - 118); g.closePath(); g.fill();
        g.restore();
        g.strokeStyle = C.bad; g.lineWidth = 3; g.setLineDash([10, 7]); g.beginPath(); const aS = Math.atan2(ground - 60 - cy, 150 - cx), aE = Math.atan2(ground + 90 - cy, 450 - cx); for (let a = aE; a <= aS; a += 0.02) { const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); a === aE ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.setLineDash([]);
        label(g, 'csúszólap', 300, ground + 134, C.bad, 14, 'center');
      }
      // felirat
      const names = ['Elcsúszás az alapsíkon', 'Felborulás', 'Felúszás', 'Általános állékonyság'], sub = ['GEO – a talp alatti nyírás nem elég', 'EQU – a felborító nyomaték győz', 'UPL – a felhajtóerő legyőzi az önsúlyt', 'GEO – a talajtömeg az alappal együtt mozdul'];
      g.save(); g.fillStyle = kc; g.fillRect(20, 20, 6, 46); g.font = '800 24px Archivo, sans-serif'; g.fillStyle = C.ink; g.textBaseline = 'top'; g.fillText(names[m], 36, 20); g.font = '400 15px "Source Sans 3", sans-serif'; g.fillStyle = C.ink2; g.fillText(sub[m], 36, 50); g.restore();
    }
    addEventListener('themechange', () => { });
    requestAnimationFrame(frame);
  })();

  // ================= ELCSÚSZÁS – mikroszkóp: monolit vagy előregyártott =================
  (function micro() {
    const cv = $('#microCv'); if (!cv) return; const W = 760, Hh = 300; let g = hiCanvas(cv, W, Hh); let typ = 'mono', phi = 30;
    const grains = []; let s = 5; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 160; i++) grains.push([r() * W, 150 + r() * 150, 7 + r() * 9, r()]);
    function draw(t) {
      const C = col(); g.clearRect(0, 0, W, Hh); g.fillStyle = C.soil2; g.fillRect(0, 140, W, 160);
      grains.forEach(([x, y, rr, h]) => { g.fillStyle = h < 0.5 ? C.soil : '#d7c193'; g.beginPath(); g.ellipse(x, y, rr, rr * 0.85, h * 3, 0, 7); g.fill(); });
      const rough = typ === 'mono'; const sh = Math.sin(t * 1.4) * (rough ? 3 : 22);
      g.save(); g.translate(sh, 0); g.fillStyle = C.conc; g.beginPath(); g.moveTo(-40, 0); g.lineTo(W + 40, 0); for (let x = W + 40; x >= -40; x -= 14) { const amp = rough ? 10 * Math.sin(x * 0.13) * Math.sin(x * 0.031 + 1) + 6 : 0; g.lineTo(x, 146 + amp); } g.closePath(); g.fill(); g.restore();
      label(g, rough ? 'Helyben betonozott – érdes felület, a szemcsék beakadnak' : 'Előregyártott – sima felület, a szemcsék elcsúsznak', 16, 22, C.ink, 15);
    }
    const out = () => { const R1 = M.sliding({ phi, precast: false }), R2 = M.sliding({ phi, precast: true }); const R = typ === 'mono' ? R1 : R2;
      $('#mi_delta').innerHTML = `${fmt(R.delta, 1)}°`; $('#mi_tg').textContent = fmt(Math.tan(R.delta * Math.PI / 180), 3); $('#mi_rd').innerHTML = `${fmt(R.Rd, 0)}<small>kN/m</small>`; const ro = $('#mi_lam'); ro.innerHTML = fmt(R.lam, 2); ro.parentElement.className = 'ro ' + (R.lam <= 1 ? 'ok' : 'bad'); };
    seg('mi_typ', (v) => { typ = v; out(); }); bindRange('mi_phi', (v) => { phi = v; out(); }, (v) => v + '°');
    const loop = (now) => { if (vis(cv)) draw(now / 1000); requestAnimationFrame(loop); }; draw(0); requestAnimationFrame(loop);
  })();

  // ================= ELCSÚSZÁS – mobilizált földellenállás =================
  (function passive() {
    const cv = $('#pasCv'); if (!cv) return; const W = 760, Hh = 320; let g = hiCanvas(cv, W, Hh); let u = 1.5, lost = false;
    const draw = () => { const C = col(); g.clearRect(0, 0, W, Hh); const L = 70, R = W - 30, T = 30, B = Hh - 50; const sx = (v) => L + v / 10 * (R - L), sy = (v) => B - v * (B - T);
      g.strokeStyle = C.line; g.lineWidth = 1; for (const v of [0.5, 0.667, 1]) { g.beginPath(); g.moveTo(L, sy(v)); g.lineTo(R, sy(v)); g.stroke(); }
      g.strokeStyle = C.ink2; g.lineWidth = 1.5; g.beginPath(); g.moveTo(L, T); g.lineTo(L, B); g.lineTo(R, B); g.stroke();
      label(g, 'E_p / E_{p,max}', L - 8, T - 12, C.ink2, 13, 'left'); label(g, 'elmozdulás / alapmélység (%)', R, B + 30, C.ink2, 13, 'right');
      for (let v = 0; v <= 10; v += 2) label(g, String(v), sx(v), B + 14, C.mute, 12, 'center', 600);
      label(g, '½', L - 14, sy(0.5), C.c1, 14, 'center'); label(g, '⅔', L - 14, sy(0.667), C.c1, 14, 'center'); label(g, '1', L - 14, sy(1), C.mute, 13, 'center');
      const f = (x) => 1 - Math.exp(-x / 1.6);
      g.strokeStyle = C.water; g.lineWidth = 4; g.beginPath(); for (let x = 0; x <= 10; x += 0.1) { const X = sx(x), Y = sy(lost ? 0 : f(x)); x === 0 ? g.moveTo(X, Y) : g.lineTo(X, Y); } g.stroke();
      const v = lost ? 0 : f(u); g.fillStyle = C.water; g.beginPath(); g.arc(sx(u), sy(v), 8, 0, 7); g.fill();
      g.setLineDash([5, 5]); g.strokeStyle = C.water; g.beginPath(); g.moveTo(sx(u), B); g.lineTo(sx(u), sy(v)); g.lineTo(L, sy(v)); g.stroke(); g.setLineDash([]);
      label(g, lost ? 'a talaj eltűnt a homlokfal elől: Rp = 0' : `mobilizált: ${fmt(v * 100, 0)} %`, sx(u) + 14, sy(v) - 14, lost ? C.bad : C.ink, 14);
    };
    bindRange('pa_u', (v) => { u = v; draw(); }, (v) => fmt(v, 1) + ' %'); seg('pa_lost', (v) => { lost = v === '1'; draw(); });
    addEventListener('themechange', draw); draw();
  })();

  // ================= FELBORULÁS – külpontosság és talpfeszültség =================
  (function ecc() {
    const cv = $('#eccCv'); if (!cv) return; const W = 780, Hh = 360; let g = hiCanvas(cv, W, Hh); let er = 0.12;
    const draw = () => { const C = col(); g.clearRect(0, 0, W, Hh);
      const B = 3, e = er * B, V = 300, x0 = 60, w = 380, y0 = 120, sc = w / B; const fx = (x) => x0 + (x + B / 2) * sc;
      // alaptest
      g.fillStyle = C.conc; g.strokeStyle = C.ink; g.lineWidth = 2; g.fillRect(x0, y0, w, 46); g.strokeRect(x0, y0, w, 46);
      arrow(g, fx(Math.min(e, B / 2)), 26, fx(Math.min(e, B / 2)), y0 - 4, C.ink, 4, 13); label(g, 'V', fx(Math.min(e, B / 2)) + 10, 40, C.ink, 16);
      // talpfeszültség
      let smax, c = B; const A = B; // 1 m sáv
      if (e <= B / 6) smax = V / A * (1 + 6 * e / B); else if (e < B / 2) { c = 3 * (B / 2 - e); smax = 2 * V / c; } else smax = Infinity;
      const sig = (x) => e <= B / 6 ? V / A * (1 + 12 * e * x / (B * B)) : (x < B / 2 - c ? 0 : smax * (x - (B / 2 - c)) / c);
      const ks = 110 / (2 * V / A * 2); g.fillStyle = er <= 1 / 6 ? C.c2 : er <= 1 / 3 ? C.c4 : C.bad; g.globalAlpha = 0.35; g.beginPath(); g.moveTo(fx(-B / 2), y0 + 50); for (let i = 0; i <= 60; i++) { const x = -B / 2 + B * i / 60; g.lineTo(fx(x), y0 + 50 + Math.min(200, sig(x) * ks)); } g.lineTo(fx(B / 2), y0 + 50); g.closePath(); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = g.fillStyle; g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i <= 60; i++) { const x = -B / 2 + B * i / 60; const Y = y0 + 50 + Math.min(200, sig(x) * ks); i ? g.lineTo(fx(x), Y) : g.moveTo(fx(x), Y); } g.stroke();
      if (e > B / 6) { g.strokeStyle = C.bad; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(fx(-B / 2), y0 + 50); g.lineTo(fx(B / 2 - c), y0 + 50); g.stroke(); g.setLineDash([]); label(g, 'elemelkedik', fx(-B / 2 + (B - c) / 2), y0 + 66, C.bad, 13, 'center'); }
      label(g, 'talpfeszültség', x0, Hh - 24, C.ink2, 13);
      // alaprajz: belső mag
      const px = 560, py = 170, ps = 170; g.fillStyle = C.paper; g.strokeStyle = C.ink2; g.lineWidth = 2; g.fillRect(px - ps / 2, py - ps / 2, ps, ps); g.strokeRect(px - ps / 2, py - ps / 2, ps, ps);
      const k = ps / 6; g.fillStyle = C.ok; g.globalAlpha = 0.3; g.beginPath(); g.moveTo(px + k, py); g.lineTo(px, py + k); g.lineTo(px - k, py); g.lineTo(px, py - k); g.closePath(); g.fill(); g.globalAlpha = 1; g.strokeStyle = C.ok; g.stroke();
      g.strokeStyle = C.bad; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(px + ps / 3, py - ps / 2); g.lineTo(px + ps / 3, py + ps / 2); g.moveTo(px - ps / 3, py - ps / 2); g.lineTo(px - ps / 3, py + ps / 2); g.stroke(); g.setLineDash([]);
      g.fillStyle = er <= 1 / 6 ? C.ok : er <= 1 / 3 ? C.c4 : C.bad; g.beginPath(); g.arc(px + er * ps, py, 8, 0, 7); g.fill();
      label(g, 'alaprajz: belső mag (B/6) és B/3 határ', px, py + ps / 2 + 24, C.ink2, 13, 'center');
      $('#ec_e').textContent = fmt(er, 3); $('#ec_c').innerHTML = `${fmt(Math.min(B, 3 * (B / 2 - e)) / B * 100, 0)}<small>%</small>`; $('#ec_s').innerHTML = `${isFinite(smax) ? fmt(smax / (V / A), 2) : '∞'}<small>× átlag</small>`; $('#ec_b').innerHTML = `${fmt(Math.max(0, 1 - 2 * er) * 100, 0)}<small>%</small>`;
      const st = $('#ec_state'); st.className = 'verdict ' + (er <= 1 / 3 + 1e-9 ? 'ok' : 'bad'); st.textContent = er <= 1 / 6 + 1e-9 ? 'e ≤ B/6: a teljes talp nyomott' : er <= 1 / 3 + 1e-9 ? 'B/6 < e ≤ B/3: a talp egy része elemelkedik' : 'e > B/3: külön óvintézkedés kell';
    };
    bindRange('ec_er', (v) => { er = v; draw(); }, (v) => 'e/B = ' + fmt(v, 3)); addEventListener('themechange', draw); draw();
  })();

  // ================= FELÚSZÁS – budapesti dunai vízszintek =================
  (function duna() {
    const cv = $('#dunaCv'); if (!cv) return; const W = 1000, Hh = 400; const g = hiCanvas(cv, W, Hh);
    const v0 = 97.6, v1 = 106.0, yT = 34, yB = 372; const sy = (v) => yB - (v - v0) / (v1 - v0) * (yB - yT);
    const xBank = 330, xEnd = 760, gs = 105.0;
    const draw = () => {
      const C = col(); g.clearRect(0, 0, W, Hh);
      // talaj a part mögött
      g.fillStyle = C.soil2; g.fillRect(xBank, sy(gs), xEnd - xBank, yB - sy(gs));
      // talajvíz: a part mentén a folyóhoz közel, befelé enyhén csökken
      const gw = (x) => 103.75 - 0.75 * Math.pow((x - xBank) / (xEnd - xBank), 0.8);
      g.save(); g.beginPath(); g.moveTo(xBank, yB); for (let x = xBank; x <= xEnd; x += 6) g.lineTo(x, sy(gw(x))); g.lineTo(xEnd, yB); g.closePath(); g.globalAlpha = 0.28; g.fillStyle = C.water; g.fill(); g.restore();
      // meder és árvíz
      g.fillStyle = C.soil2; g.beginPath(); g.moveTo(0, yB); g.lineTo(0, sy(98.2)); g.quadraticCurveTo(160, sy(97.7), 300, sy(98.9)); g.lineTo(xBank, sy(98.9)); g.lineTo(xBank, yB); g.closePath(); g.fill();
      g.save(); g.globalAlpha = 0.55; g.fillStyle = C.water; g.beginPath(); g.moveTo(0, sy(103.88)); g.lineTo(xBank - 14, sy(103.88)); g.lineTo(xBank - 14, sy(98.9)); g.lineTo(300, sy(98.9)); g.quadraticCurveTo(160, sy(97.7), 0, sy(98.2)); g.closePath(); g.fill(); g.restore();
      // rakpartfal
      g.fillStyle = C.conc; g.fillRect(xBank - 14, sy(105.3), 14, yB - sy(105.3)); g.strokeStyle = C.ink2; g.lineWidth = 1.5; g.strokeRect(xBank - 14, sy(105.3), 14, yB - sy(105.3));
      const marks = [[104.24, 'MÁSZ (mértékadó árvízszint)', '104,24 mBf ≈ 927 cm', C.bad, true], [103.88, '2013. június – rekord', '103,88 mBf = 891 cm', C.c3, false], [103.57, '2006. április', '103,57 mBf = 860 cm', C.ink2, false], [103.0, 'talajvíz a parton 1965 után', '≈ 103 mBf', C.water, true]];
      let lastY = -99; const xL = xEnd + 22;
      marks.forEach(([v, nm, val, c, dash]) => { const y = sy(v); g.strokeStyle = c; g.lineWidth = 1.8; g.setLineDash(dash ? [5, 4] : []); if (v !== 103.0) { g.beginPath(); g.moveTo(0, y); g.lineTo(xBank - 14, y); g.stroke(); } g.save(); g.globalAlpha = 0.45; g.lineWidth = 1.2; g.beginPath(); g.moveTo(v === 103.0 ? xEnd - 70 : xBank, y); g.lineTo(xEnd + 6, y); g.stroke(); g.restore(); g.setLineDash([]);
        const ty = Math.max(y, lastY + 38); lastY = ty; g.beginPath(); g.moveTo(xEnd + 6, y); g.lineTo(xL - 6, ty); g.stroke();
        label(g, nm, xL, ty - 8, c, 12, 'left', 600); label(g, val, xL, ty + 8, c, 14, 'left', 800); });
      // mélygarázs
      const gx0 = 470, gx1 = 680, gb = 99.0; g.fillStyle = C.card; g.fillRect(gx0, sy(gs), gx1 - gx0, sy(gb) - sy(gs)); g.strokeStyle = C.ink; g.lineWidth = 3; g.strokeRect(gx0, sy(gs), gx1 - gx0, sy(gb) - sy(gs));
      g.lineWidth = 2; g.beginPath(); g.moveTo(gx0, sy(102)); g.lineTo(gx1, sy(102)); g.stroke();
      label(g, 'mélygarázs', (gx0 + gx1) / 2, sy(100.5), C.ink, 16, 'center');
      for (let i = 0; i < 6; i++) { const x = gx0 + 22 + i * ((gx1 - gx0 - 44) / 5); arrow(g, x, sy(gb) + 30, x, sy(gb) + 4, C.water, 3, 9); }
      label(g, 'felhajtóerő', (gx0 + gx1) / 2, sy(gb) + 44, C.water, 13, 'center');
      // terepszint
      g.strokeStyle = C.ink2; g.lineWidth = 2; g.beginPath(); g.moveTo(xBank, sy(gs)); g.lineTo(gx0, sy(gs)); g.moveTo(gx1, sy(gs)); g.lineTo(xEnd, sy(gs)); g.stroke();
      // talajvíz vonala
      g.strokeStyle = C.water; g.lineWidth = 2.5; g.setLineDash([8, 6]); g.beginPath(); for (let x = xBank; x <= xEnd; x += 6) { const y = sy(gw(x)); x === xBank ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); g.setLineDash([]);
      label(g, 'Duna', 60, sy(101.2), C.ink, 17);
      // szintvonalak a jobb oldali skálán
      // magassági skála
      g.strokeStyle = C.mute; g.lineWidth = 1; for (let v = 98; v <= 105; v++) { const y = sy(v); g.beginPath(); g.moveTo(xEnd - 6, y); g.lineTo(xEnd, y); g.stroke(); if (v % 2 === 0) label(g, String(v), xEnd - 10, y, C.mute, 11, 'right', 600); }
      label(g, 'mBf', xEnd - 10, sy(105.8), C.mute, 11, 'right', 700);
      label(g, 'a talajvíz a part mentén az árhullámot követi', xBank + 14, sy(gs) - 16, C.water, 13, 'left', 700);
    };
    addEventListener('themechange', draw); draw();
  })();

  // ================= ÁLTALÁNOS ÁLLÉKONYSÁG – csúszólap-keresés (Bishop) =================
  (function slope2d() {
    const cv = $('#slopeCv'); if (!cv) return; const W = 820, Hh = 430; const g = hiCanvas(cv, W, Hh);
    const st = { s: 0.8, ru: 0, n: 1.5, gm: 1.35, trials: true }; let res = null, pend = null;
    const calc = () => { res = M.slope({ s: st.s, ru: st.ru, n: st.n, gm: st.gm, trials: st.trials }); draw(); out(); };
    const sched = () => { clearTimeout(pend); pend = setTimeout(calc, 60); };
    function draw() {
      const C = col(); g.clearRect(0, 0, W, Hh); if (!res) return; const H = res.H, LX = res.LX; const sc = 21, ox = 260, oy = 210; const P = (x, y) => [ox + x * sc, oy - y * sc];
      // rézsű
      g.save(); g.beginPath(); [[-14, 0], [0, 0], [LX, -H], [30, -H], [30, -12], [-14, -12]].forEach((p, i) => { const q = P(...p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = C.soil; g.fill(); g.restore();
      if (st.ru > 0) { g.save(); g.globalAlpha = 0.18 + st.ru * 0.6; g.fillStyle = C.water; g.beginPath(); [[-14, -2.5], [0, -2.5], [LX, -H], [30, -H], [30, -12], [-14, -12]].forEach((p, i) => { const q = P(...p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.fill(); g.restore(); }
      // próbakörök középpontjai
      if (st.trials && res.all.length) res.all.forEach(c => { const q = P(c.xc, c.yc); g.fillStyle = c.F < 1 ? C.bad : c.F < 1.25 ? C.c4 : C.ok; g.globalAlpha = 0.55; g.fillRect(q[0] - 2, q[1] - 2, 4, 4); g.globalAlpha = 1; });
      const c = res.circ;
      if (c) { // csúszó tömeg + lamellák
        const yA = (x) => c.yc - Math.sqrt(Math.max(0, c.r * c.r - (x - c.xc) ** 2)); const surf = (x) => x <= 0 ? 0 : x >= LX ? -H : -H * x / LX;
        g.save(); g.beginPath(); const n = 60; for (let i = 0; i <= n; i++) { const x = c.x0 + (c.x1 - c.x0) * i / n; const q = P(x, surf(x)); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } for (let i = n; i >= 0; i--) { const x = c.x0 + (c.x1 - c.x0) * i / n; const q = P(x, yA(x)); g.lineTo(q[0], q[1]); } g.closePath(); g.fillStyle = c.F < 1 ? C.bad : C.c4; g.globalAlpha = 0.3; g.fill(); g.restore();
        g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 1; for (let i = 1; i < 12; i++) { const x = c.x0 + (c.x1 - c.x0) * i / 12; const a = P(x, surf(x)), b = P(x, yA(x)); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }
        g.strokeStyle = C.bad; g.lineWidth = 3; g.setLineDash([10, 6]); g.beginPath(); for (let i = 0; i <= n; i++) { const x = c.x0 + (c.x1 - c.x0) * i / n; const q = P(x, yA(x)); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); } g.stroke(); g.setLineDash([]);
        const q = P(c.xc, c.yc); g.fillStyle = C.bad; g.beginPath(); g.arc(q[0], q[1], 6, 0, 7); g.fill(); label(g, `F = ${fmt(c.F, 2)}`, q[0] + 10, q[1] - 12, C.bad, 14);
      }
      // ház
      const hx0 = -st.s - 2.4 - 0.3, hx1 = -st.s + 0.3; const a = P(hx0, 0), b = P(hx1, 0); g.fillStyle = C.card; g.strokeStyle = C.ink; g.lineWidth = 2; g.fillRect(a[0], a[1] - 50, b[0] - a[0], 50); g.strokeRect(a[0], a[1] - 50, b[0] - a[0], 50); g.fillStyle = C.c1; g.beginPath(); g.moveTo(a[0] - 6, a[1] - 50); g.lineTo((a[0] + b[0]) / 2, a[1] - 74); g.lineTo(b[0] + 6, a[1] - 50); g.closePath(); g.fill();
      res.loads.forEach(L => { const p = P(L.x, 0); arrow(g, p[0], p[1] - 12, p[0], p[1] + 16, C.ink, 3, 9); });
      label(g, `rézsű 1:${String(st.n).replace('.', ',')}, H = 8 m`, P(LX / 2, -H / 2)[0] + 30, P(LX / 2, -H / 2)[1] - 10, C.ink2, 13);
    }
    function out() { const v = res.lam; $('#sl_F').textContent = fmt(res.F, 2); const L = $('#sl_L'); L.textContent = fmt(v, 2); L.parentElement.className = 'ro ' + (v <= 1 ? 'ok' : 'bad'); $('#sl_x').innerHTML = res.circ ? `${fmt(-res.circ.x0, 1)}<small>m</small>` : '–'; }
    bindRange('sl_s', (v) => { st.s = v; sched(); }, (v) => fmt(v, 1) + ' m'); bindRange('sl_ru', (v) => { st.ru = v; sched(); }, (v) => fmt(v, 2));
    seg('sl_n', (v) => { st.n = +v; sched(); }); seg('sl_gm', (v) => { st.gm = +v; sched(); }); seg('sl_tr', (v) => { st.trials = v === '1'; sched(); });
    addEventListener('themechange', draw); calc();
  })();
})();
