/* ===== Számítások (a 3D szimulátorok, a 2D ábrák és az igazolólap közösen használja) ===== */
(function () {
  const rad = (d) => d * Math.PI / 180, tg = (d) => Math.tan(rad(d));
  // --- Elcsúszás: szögtámfal 1 m-es darabja ---
  function sliding({ h = 3.9, B = 2.6, phi = 30, q = 0, cu = 60, precast = false, rp = 0, drained = true }) {
    const g = 19, toe = 0.7, st = 0.35, tB = 0.5, heel = Math.max(0.2, B - toe - st);
    const Vk = 25 * (B * tB + st * (h - tB)) + g * heel * (h - tB);
    const Ka = tg(45 - phi / 2) ** 2, Kp = tg(45 + phi / 2) ** 2;
    const EaG = 0.5 * g * h * h * Ka, EaQ = q * h * Ka; const Hd = 1.35 * EaG + 1.5 * EaQ;
    const delta = precast ? phi * 2 / 3 : phi; const D = 0.9;
    let Rd, Rcu = null, R04 = null, Ep;
    if (drained) { Rd = Vk * tg(delta) / 1.1; Ep = 0.5 * g * D * D * Kp; }
    else { Rcu = B * cu / 1.1; R04 = 0.4 * Vk; Rd = Math.min(Rcu, R04); Ep = 0.5 * g * D * D + 2 * cu * D; }
    const Rpd = rp * Ep / 1.4;
    return { Vk, Ka, Hd, delta, Rd, Rcu, R04, Rpd, lam: Hd / (Rd + Rpd) };
  }
  // --- Felborulás: reklámtábla (tábla 6×3 m, kar 10,7 m) ---
  function overturn({ w = 0.8, B = 3.0, soil = true }) {
    const Fk = w * 18, Mk = Fk * 10.7, Fd = 1.5 * Fk, Mdst = 1.5 * Mk;
    const Gk = 25 + B * B * 25 + B * B * 0.2 * 19; const a = soil ? B / 2 - B / 10 : B / 2; const Mstb = 0.9 * Gk * a;
    const e = Mk / Gk, A = B * B;
    let smax, sig;
    if (e <= B / 6) { smax = Gk / A * (1 + 6 * e / B); sig = (x) => Gk / A * (1 + 12 * e * x / (B * B)); }
    else if (e < B / 2) { const c = 3 * (B / 2 - e); smax = 2 * Gk / (B * c); sig = (x) => { const x0 = B / 2 - c; return x < x0 ? 0 : smax * (x - x0) / c; }; }
    else { smax = Infinity; sig = () => 0; }
    return { Fk, Fd, Mk, Mdst, Gk, a, Mstb, e, smax, sig, lam: Mdst / Mstb };
  }
  // --- Felúszás: 30×15 m-es, 6 m mély mélygarázs-doboz ---
  function uplift({ gw = -1, t = 0.6, o = 0, n = 0, f = 0 }) {
    const A = (30 + 2 * o) * (15 + 2 * o), hw = Math.max(0, gw + 6); const V = 10 * A * hw;
    const Gk = 3938 + 2799 + 884 * (5.65 - t) + 25 * A * t;
    const top = Math.min(gw, 0), yS = -6 + t; const hAbove = Math.max(0, 0 - Math.max(top, yS)), hBelow = Math.max(0, top - yS);
    const Grim = (A - 450) * (19 * hAbove + 20 * hBelow); const Wf = 10 * 414.6 * f; const Pd = n * 429;
    const R = 0.9 * (Gk + Grim + Wf) + Pd;
    return { A, V, Gk, Grim, Wf, Pd, R, lam: V / Math.max(1, R) };
  }
  // --- Általános állékonyság: egyszerűsített Bishop, körhengeres csúszólap ---
  function bishop(xc, yc, r, o) {
    const { c, phi, gamma = 19, ru = 0, loads = [], ns = 30, H, LX } = o;
    const surf = (x) => x <= 0 ? 0 : x >= LX ? -H : -H * x / LX;
    const yArc = (x) => { const d = r * r - (x - xc) * (x - xc); return d < 0 ? null : yc - Math.sqrt(d); };
    const xs = []; let prev = null;
    for (let x = xc - r + 1e-6; x <= xc + r; x += 0.05) { const ya = yArc(x); const ins = ya !== null && ya < surf(x); if (prev !== null && ins !== prev) xs.push(x); prev = ins; }
    if (xs.length < 2) return null;
    const x0 = xs[0], x1 = xs[xs.length - 1], b = (x1 - x0) / ns, tp = Math.tan(phi * Math.PI / 180);
    const S = []; let den = 0;
    for (let i = 0; i < ns; i++) { const xm = x0 + (i + 0.5) * b; const ya = yArc(xm); const h = surf(xm) - ya; if (h <= 0) continue; let W = gamma * h * b; for (const L of loads) if (L.x >= xm - b / 2 && L.x < xm + b / 2) W += L.P; const al = Math.atan2(xc - xm, yc - ya); S.push({ xm, b, h, W, al, u: ru * gamma * h }); den += W * Math.sin(al); }
    if (den <= 0) return null;
    let F = 1.2; for (let it = 0; it < 50; it++) { let num = 0; for (const s of S) { const m = Math.cos(s.al) * (1 + Math.tan(s.al) * tp / F); num += (c * s.b + (s.W - s.u * s.b) * tp) / m; } const Fn = num / den; if (Math.abs(Fn - F) < 1e-5) { F = Fn; break; } F = Fn; }
    return { F, x0, x1, slices: S };
  }
  function slope({ s = 0.8, ru = 0, n = 1.5, gm = 1.35, c = 14, phi = 28, trials = false }) {
    const H = 8, LX = H * n; const cd = c / gm, phid = Math.atan(Math.tan(phi * Math.PI / 180) / gm) * 180 / Math.PI;
    const loads = [{ x: -s, P: 72 + 1.3 * 18 }, { x: -s - 2.4, P: 72 + 1.3 * 18 }];
    const o = { c: cd, phi: phid, ru, loads, H, LX };
    let best = null; const all = [];
    for (let xc = -4; xc <= LX + 3; xc += 1) for (let yc = 2; yc <= 22; yc += 1.5) for (const dr of [-2, -1, 0, 1.5]) {
      const r = Math.hypot(xc - LX, yc + H) + dr; const res = bishop(xc, yc, r, o); if (!res || res.x1 - res.x0 < 5 || res.F < 0.2) continue;
      if (trials) all.push({ xc, yc, r, F: res.F });
      if (!best || res.F < best.F) best = { xc, yc, r, F: res.F, x0: res.x0, x1: res.x1, slices: res.slices };
    }
    return { F: best ? best.F : 9.99, lam: best ? 1 / best.F : 0, circ: best, all, H, LX, loads };
  }
  window.MECH = { sliding, overturn, uplift, bishop, slope };
})();
