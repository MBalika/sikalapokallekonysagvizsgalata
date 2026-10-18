/* ===== Kalkulátor – elcsúszás, felborulás, felúszás, általános állékonyság (MSZ EN 1997‑1 + NA) ===== */
(function () {
  'use strict';
  const G_ = typeof window !== 'undefined' ? window : globalThis;
  const U = G_.U || {};
  const isDOM = typeof document !== 'undefined';
  const GW = 10; // γw [kN/m³]
  const NB = ' ', NN = ' ', NBH = '‑';
  const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI, tg = (d) => Math.tan(rad(d));
  const fmtL = U.fmt || ((v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('hu-HU', { minimumFractionDigits: d, maximumFractionDigits: d }));
  // számformázás: tizedesvessző, ezres tagolás keskeny nem törő szóközzel
  const F = (v, d = 1) => { if (v === Infinity) return '∞'; if (v === -Infinity) return '−∞'; if (!isFinite(v)) return '–'; let r = Math.round(v * 10 ** d) / 10 ** d; if (r === 0) r = 0; return fmtL(r, d).replace(/[  ]/g, NN).replace('-', '−'); };
  const sb = (b, s) => `${b}<sub>${s}</sub>`;
  const nw = (s) => `<span class="nw">${s}</span>`;
  const u_ = (v, d, unit) => F(v, d) + (unit === '°' ? '' : NB) + unit;          // szám + mértékegység (fok: szóköz nélkül)
  const DA2 = 'DA' + NBH + '2*', DA3 = 'DA' + NBH + '3', EN = 'MSZ' + NB + 'EN' + NB + '1997' + NBH + '1';
  // képletsor: szimbólum = képlet = behelyettesítés = eredmény (egészében nem törhet)
  const fl = (...parts) => `<div class="cx-fl nw">${parts.filter(Boolean).join(' = ').replace(/ = /g, NB + '=' + NB)}</div>`;
  const mk = () => ({ err: [], warn: [], info: [], checks: [], steps: [], v: {} });
  const soilCol = (z1, z2, zw, g, gs) => { if (!(z2 > z1)) return 0; const a = Math.min(z2, Math.max(z1, zw)); return g * (a - z1) + gs * (z2 - a); };
  const integ = (f, z1, z2, brk = []) => { const pts = [z1, ...brk.filter(b => b > z1 && b < z2).sort((a, b) => a - b), z2]; let s = 0; for (let i = 1; i < pts.length; i++) s += (f(pts[i - 1]) + f(pts[i])) / 2 * (pts[i] - pts[i - 1]); return s; };
  const num = (v, d) => { const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : +v; return isFinite(x) ? x : d; };
  const merge = (def, p) => { const o = { ...def }; if (p) for (const k in p) if (k in def) o[k] = typeof def[k] === 'number' ? num(p[k], def[k]) : typeof def[k] === 'boolean' ? !!p[k] : String(p[k]); return o; };

  // ============================== ALAPÉRTÉKEK ==============================
  const DEF = {
    sliding: { shape: 'strip', B: 2.2, L: 3.0, D: 1.2, hf: 0.6, cast: 'cast', load: 'char',
      Gk: 160, Qk: 40, qWith: false, HGk: 40, HQk: 10, hH: 1.2, selfw: true,
      Vk: 280, Hd: 90, Vd: 400, eB: 0, eL: 0,
      an: 'both', phicv: 26, cu: 70, gam: 19, gsat: 20, phiP: 26, cP: 0, water: false, dw: 1.0,
      nu: 0, pH: 'full' },
    overturn: { shape: 'rect', B: 3.0, L: 3.0, Dc: 3.4, Df: 1.2, hf: 1.0, ground: 'soil', gam: 19, selfw: true,
      Gk: 25, eGB: 0, Qk: 0, qWith: false, HGk: 0, hG: 2.0, HQk: 14.4, hQ: 10.7,
      two: false, eGL: 0, HGLk: 0, hGL: 2.0, HQLk: 5.0, hQL: 10.7 },
    uplift: { L: 30, B: 15, H: 6.0, D: 6.0, dw: 1.0, gMode: 'geom', tb: 0.7, tw: 0.4, tr: 0.35, ni: 1, ti: 0.3, Gk: 11000, Gadd: 0,
      tc: 0, o: 0.5, gam: 19, gsat: 20, hb: 0, Qdst: 0, fric: true, phiS: 30, kAuto: 'auto', K0: 0.5, delta: 20, n: 0, Rk: 600 },
    slope: { H: 8, n: 1.5, an: 'drained', gam: 19, c: 14, phi: 28, cu: 40,
      lay2: false, z2: 9, gam2: 20, c2: 25, phi2: 24, cu2: 80, dR: 6,
      water: 'none', ru: 0, wd: 3, wt: 0, gm: 1.35, gcu: 1.4,
      f1: true, f1B: 0.6, f1a: 0.5, f1D: 0.8, f1G: 72, f1Q: 18,
      f2: true, f2B: 0.6, f2a: 2.9, f2D: 0.8, f2G: 72, f2Q: 18, fine: false },
  };

  // ============================== ELCSÚSZÁS ==============================
  function sliding(p0) {
    const p = merge(DEF.sliding, p0), R = mk(), v = R.v; R.input = p;
    const strip = p.shape === 'strip', B = p.B, L = strip ? 1 : p.L, D = p.D, hf = p.hf, un = strip ? 'kN/m' : 'kN';
    if (!(B > 0) || !(L > 0)) R.err.push('Az alaptest méretei (B, L) legyenek pozitívak.');
    if (!(D >= 0)) R.err.push('Az alapozási mélység (D) nem lehet negatív.');
    if (!(hf > 0)) R.err.push('Az alaptest magassága (h) legyen pozitív.');
    if (R.err.length) return R;
    const zw = p.water ? p.dw : Infinity, A = B * L, char = p.load !== 'design';
    let Vk = 0, Vke, Hd, Vd, e = 0, eL = 0, Wc = 0, Wf = 0, Uk = 0, Hk = 0, Mk = 0, Qv = 0;
    if (char) {
      Wc = p.selfw ? A * hf * 25 : 0; Wf = p.selfw ? A * soilCol(0, Math.max(0, D - hf), zw, p.gam, p.gsat) : 0;
      Uk = isFinite(zw) ? A * GW * Math.max(0, D - zw) : 0; Qv = p.qWith ? p.Qk : 0;
      Vk = p.Gk + Qv + Wc + Wf; Vke = Vk - Uk;
      Hd = 1.35 * Math.max(0, p.HGk) + 1.5 * Math.max(0, p.HQk); Hk = p.HGk + p.HQk; Mk = Hk * p.hH;
      e = Vk > 0 ? Mk / Vk : Infinity; Vd = 1.0 * (p.Gk + Wc + Wf);
      if (p.HGk < 0 || p.HQk < 0) R.warn.push('A vízszintes erők összetevőit pozitívnak (a csúszás irányába mutatónak) kell megadni.');
      if (p.hH < 0) R.warn.push('A vízszintes erő támadáspontja az alapsík alatt van – ellenőrizd a h<sub>H</sub> értéket.');
    } else { Vke = p.Vk; Hd = p.Hd; Vd = p.Vd; e = p.eB; eL = strip ? 0 : p.eL; }
    const dr = p.an !== 'undrained', ud = p.an !== 'drained';
    const delta = p.cast === 'precast' ? p.phicv * 2 / 3 : p.phicv;
    const RdD = Math.max(0, Vke) * tg(delta) / 1.1;
    const Bp = Math.max(0, B - 2 * Math.abs(e)), Lp = strip ? 1 : Math.max(0, L - 2 * Math.abs(eL)), Ac = Bp * Lp;
    const Rd0 = Ac * p.cu / 1.1, cap = 0.4 * Math.max(0, Vd), RdU = Math.min(Rd0, cap), capGov = cap < Rd0;
    const nu = p.nu, z1 = p.pH === 'face' ? Math.max(0, D - hf) : 0, z2 = D, hp = Math.max(0, z2 - z1);
    const sv = (z) => (zw < 0 ? GW * (-zw) : 0) + soilCol(0, z, zw, p.gam, p.gsat), uu = (z) => isFinite(zw) ? GW * Math.max(0, z - zw) : 0;
    const Kp = tg(45 + p.phiP / 2) ** 2;
    const epD = (z) => Math.max(0, Kp * (sv(z) - uu(z)) + 2 * p.cP * Math.sqrt(Kp)), epU = (z) => Math.max(0, sv(z) + 2 * p.cu);
    const brk = isFinite(zw) ? [zw] : [];
    const EpD = hp > 0 ? L * integ(epD, z1, z2, brk) : 0, EpU = hp > 0 ? L * integ(epU, z1, z2, brk) : 0;
    const zbar = (f) => { let s = 0, m = 0; const n = 60; for (let i = 0; i < n; i++) { const z = z1 + (i + 0.5) * hp / n, q = f(z); s += q; m += q * z; } return s > 0 ? m / s : (z1 + z2) / 2; };
    const RpD = nu * EpD / 1.4, RpU = nu * EpU / 1.4;
    Object.assign(v, { strip, B, L, D, hf, A, zw, char, Vk, Vke, Hd, Vd, e, eL, Wc, Wf, Uk, Hk, Mk, Qv, delta, RdD, Bp, Lp, Ac, Rd0, cap, RdU, capGov, nu, z1, z2, hp, Kp, EpD, EpU, RpD, RpU, epD, epU, un, dr, ud, zpD: zbar(epD), zpU: zbar(epU) });
    // ---- figyelmeztetések ----
    if (p.phicv < 15 || p.phicv > 40) R.warn.push(`Szokatlan φ′<sub>cv;k</sub> = ${u_(p.phicv, 0, '°')} – jellemzően 20–36° közötti.`);
    if (ud && (p.cu < 10 || p.cu > 250)) R.warn.push(`Szokatlan c<sub>u;k</sub> = ${u_(p.cu, 0, 'kPa')} – ellenőrizd az értéket.`);
    if (dr && Vke <= 0) R.err.push('V′<sub>k</sub> ≤ 0: az alapsíkon nincs nyomóerő, így súrlódási ellenállás sem – vizsgáld a felúszást, vagy növeld a leterhelést.');
    if (char && Vk <= 0) R.err.push('A függőleges teher nem pozitív.');
    if (hf > D) R.info.push('Az alaptest teteje a terepszint fölé ér.');
    if (char && Uk > 0) R.info.push(`A talajvíz az alapsík felett van: V′<sub>k</sub>-ból levontuk az alapsíkon működő víznyomás eredőjét (U<sub>k</sub> = ${u_(Uk, 1, un)}).`);
    if (p.water && p.dw < 0) R.warn.push('A talajvízszint a terepszint felett van.');
    if (char && p.qWith && p.Qk > 0) R.info.push('Az esetleges függőleges terhet csak akkor szabad V′<sub>k</sub>-ban figyelembe venni, ha a vízszintes erővel biztosan együtt működik.');
    if (nu > 0) R.warn.push('A földellenállás csak akkor vehető figyelembe, ha a homlokfal előtti talaj tartósan megmarad (erózió, közműárok, zsugorodás miatti elválás kizárható).');
    if (nu > 0 && (p.phiP < 15 || p.phiP > 45)) R.warn.push(`Szokatlan φ′<sub>k</sub> = ${u_(p.phiP, 0, '°')} a homlokfal előtt.`);
    if (Math.abs(e) > B / 3 && isFinite(e)) R.warn.push(`Nagy külpontosság: e = ${u_(e, 2, 'm')} > B/3 – külön óvintézkedés kell (lásd a Felborulás fület).`);
    if (ud && Ac <= 0) R.err.push('A nyomott alapfelület nulla (e ≥ B/2) – a drénezetlen ellenállás nem számítható.');
    if (ud && capGov) R.info.push(`Drénezetlen állapotban a 0,4·V<sub>d</sub> korlát a mértékadó (${u_(cap, 1, un)} < ${u_(Rd0, 1, un)}).`);
    if (Hd <= 0) R.info.push('Nincs vízszintes erő – az elcsúszás nem mértékadó.');
    if (ud && char) R.info.push('Drénezetlen állapotban a korláthoz V<sub>d</sub> = 1,0·(G<sub>k</sub> + önsúly): a függőleges teher itt kedvező hatás, az esetleges rész kedvező esetben 0.');
    if (R.err.length) return R;
    // ---- igazolások ----
    const lamOf = (E, Rr) => Rr > 0 ? E / Rr : (E > 0 ? Infinity : 0);
    if (dr) R.checks.push({ key: 'dr', title: 'Drénezett állapot', sub: 'hosszú távú, φ′<sub>cv;k</sub>', tag: 'GEO · ' + DA2, E: Hd, R: RdD + RpD, lam: lamOf(Hd, RdD + RpD), Es: sb('H', 'd'), Rs: nu > 0 ? sb('R', 'd') + ' + ' + sb('R', 'p;d') : sb('R', 'd'), unit: un });
    if (ud) R.checks.push({ key: 'ud', title: 'Drénezetlen állapot', sub: 'rövid távú, c<sub>u;k</sub>', tag: 'GEO · ' + DA2, E: Hd, R: RdU + RpU, lam: lamOf(Hd, RdU + RpU), Es: sb('H', 'd'), Rs: nu > 0 ? sb('R', 'd') + ' + ' + sb('R', 'p;d') : sb('R', 'd'), unit: un });
    // ---- részletes számítás ----
    const S = R.steps, Vks = 'V′<sub>k</sub>';
    if (char) {
      let b = '';
      if (p.selfw) b += fl(sb('W', 'b'), `A · h · 25`, `${F(A, 2)} · ${F(hf, 2)} · 25`, u_(Wc, 1, un)) + fl(sb('W', 't'), `A · Σγ·Δz`, u_(Wf, 1, un)) + `<p class="cx-c">A talp feletti visszatöltés súlya${isFinite(zw) && zw < D - hf ? ' (a talajvíz alatt γ<sub>sat</sub>-tal)' : ''}.</p>`;
      if (Uk > 0) b += fl(sb('U', 'k'), 'γ<sub>w</sub> · (D − d<sub>w</sub>) · A', `10 · ${F(D - zw, 2)} · ${F(A, 2)}`, u_(Uk, 1, un));
      b += fl(sb('V', 'k'), `G<sub>k</sub>${p.qWith ? ' + Q<sub>k</sub>' : ''}${p.selfw ? ' + W<sub>b</sub> + W<sub>t</sub>' : ''}`, u_(Vk, 1, un));
      b += fl(Vks, `V<sub>k</sub> − U<sub>k</sub>`, u_(Vke, 1, un));
      b += `<p class="cx-c">Az esetleges függőleges teher (Q<sub>k</sub> = ${u_(p.Qk, 1, un)}) ${p.qWith ? 'biztosan együtt működik a vízszintes erővel, ezért figyelembe vettük.' : 'nem működik biztosan együtt a vízszintes erővel, ezért V′<sub>k</sub>-ban nem szerepel.'}</p>`;
      S.push({ t: 'A függőleges erő karakterisztikus értéke', b });
      S.push({ t: 'A vízszintes erő tervezési értéke (A1: γ<sub>G</sub> = 1,35; γ<sub>Q</sub> = 1,5)', b: fl(sb('H', 'd'), 'γ<sub>G</sub> · H<sub>G;k</sub> + γ<sub>Q</sub> · H<sub>Q;k</sub>', `1,35 · ${F(p.HGk, 1)} + 1,5 · ${F(p.HQk, 1)}`, u_(Hd, 1, un)) });
      S.push({ t: `Külpontosság karakterisztikus hatásokból (${DA2})`, b: fl('e', 'H<sub>k</sub> · h<sub>H</sub> / V<sub>k</sub>', `${F(Hk, 1)} · ${F(p.hH, 2)} / ${F(Vk, 1)}`, u_(e, 3, 'm')) + fl('B′', 'B − 2e', `${F(B, 2)} − 2 · ${F(Math.abs(e), 3)}`, u_(Bp, 3, 'm')) + (strip ? '' : fl('L′', 'L', u_(Lp, 2, 'm'))) + fl(sb('A', 'c'), strip ? 'B′ · 1 m' : 'B′ · L′', u_(Ac, 3, strip ? 'm²/m' : 'm²')) });
    } else {
      S.push({ t: 'Megadott tervezési adatok', b: fl(Vks, u_(Vke, 1, un)) + fl(sb('H', 'd'), u_(Hd, 1, un)) + (ud ? fl(sb('V', 'd'), u_(Vd, 1, un)) + fl('B′', 'B − 2e', `${F(B, 2)} − 2 · ${F(Math.abs(e), 3)}`, u_(Bp, 3, 'm')) + (strip ? '' : fl('L′', 'L − 2e<sub>L</sub>', u_(Lp, 3, 'm'))) + fl(sb('A', 'c'), strip ? 'B′ · 1 m' : 'B′ · L′', u_(Ac, 3, strip ? 'm²/m' : 'm²')) : '') });
    }
    if (dr) S.push({ t: 'Drénezett nyírási ellenállás az alapsíkon (γ<sub>R;h</sub> = 1,1)', b: `<p class="cx-c">${p.cast === 'precast' ? 'Sima, előregyártott alaptest: ' + nw('δ<sub>k</sub> = ⅔ · φ′<sub>cv;k</sub>') : 'Helyben betonozott alaptest: ' + nw('δ<sub>k</sub> = φ′<sub>cv;k</sub>')}. A c′ hatékony kohéziót figyelmen kívül hagyjuk.</p>` + fl(sb('δ', 'k'), p.cast === 'precast' ? `⅔ · ${u_(p.phicv, 1, '°')}` : '', u_(delta, 2, '°')) + fl(sb('R', 'd'), `${Vks} · tg${NB}δ<sub>k</sub> / γ<sub>R;h</sub>`, `${F(Math.max(0, Vke), 1)} · tg${NB}${F(delta, 2)}° / 1,1`, `${F(Math.max(0, Vke), 1)} · ${F(tg(delta), 4)} / 1,1`, u_(RdD, 1, un)) });
    if (ud) S.push({ t: 'Drénezetlen nyírási ellenállás és a 0,4·V<sub>d</sub> korlát', b: fl(sb('R', 'd;0'), 'A<sub>c</sub> · c<sub>u;k</sub> / γ<sub>R;h</sub>', `${F(Ac, 3)} · ${F(p.cu, 1)} / 1,1`, u_(Rd0, 1, un)) + fl('0,4 · V<sub>d</sub>', `0,4 · ${F(Vd, 1)}`, u_(cap, 1, un)) + fl(sb('R', 'd'), `min(${F(Rd0, 1)}; ${F(cap, 1)})`, u_(RdU, 1, un)) + (capGov ? '<p class="cx-c">A korlát a mértékadó: az alap és a talaj között hézag nyílhat, ezért nem számíthatunk a függőleges erő 40%-ánál nagyobb ellenállásra.</p>' : '') });
    if (nu > 0) {
      let b = `<p class="cx-c">Működési magasság: ${p.pH === 'face' ? 'az alaptest homloka' : 'a terepszinttől az alapsíkig'} (${nw(`${F(z1, 2)}…${F(z2, 2)}${NB}m`)}); mobilizált hányad ν = ${nu === 0.5 ? '½' : '⅔'}; γ<sub>R;e</sub> = 1,4.</p>`;
      if (dr) b += fl(sb('K', 'p'), `tg²(45° + φ′<sub>k</sub>/2)`, `tg²(45° + ${F(p.phiP, 1)}°/2)`, F(Kp, 3)) + fl(sb('E', 'p;k') + ' (drénezett)', `∫(K<sub>p</sub> · σ′<sub>v</sub> + 2c′√K<sub>p</sub>) dz${strip ? '' : ' · L'}`, u_(EpD, 2, un)) + fl(sb('R', 'p;d'), `ν · E<sub>p;k</sub> / γ<sub>R;e</sub>`, `${F(nu, 3)} · ${F(EpD, 2)} / 1,4`, u_(RpD, 1, un));
      if (ud) b += fl(sb('E', 'p;k') + ' (drénezetlen)', `∫(σ<sub>v</sub> + 2c<sub>u;k</sub>) dz${strip ? '' : ' · L'}`, u_(EpU, 2, un)) + fl(sb('R', 'p;d'), `${F(nu, 3)} · ${F(EpU, 2)} / 1,4`, u_(RpU, 1, un));
      S.push({ t: 'Földellenállás a homlokfalon', b });
    }
    S.push({ t: 'Igazolás', b: R.checks.map(c => fl(`Λ (${c.key === 'dr' ? 'drénezett' : 'drénezetlen'})`, `${c.Es} / (${c.Rs})`, `${F(c.E, 1)} / ${F(c.R, 1)}`, `<b>${F(c.lam, 3)}</b>`) + `<p class="cx-c">${c.lam <= 1 + 1e-9 ? nw(`${c.Es} = ${u_(c.E, 1, un)} ≤ ${u_(c.R, 1, un)}`) + ' → megfelel.' : nw(`${c.Es} = ${u_(c.E, 1, un)} > ${u_(c.R, 1, un)}`) + ' → nem felel meg.'}</p>`).join('') });
    return R;
  }

  // ============================== KONTAKTFESZÜLTSÉG (húzást nem vevő talp) ==============================
  function contact(shape, B, L, Rr, V, ex, ey) {
    if (!(V > 0)) return { ok: false };
    const circ = shape === 'circ';
    const A = circ ? Math.PI * Rr * Rr : B * L;
    const Iy = circ ? Math.PI * Rr ** 4 / 4 : L * B ** 3 / 12, Ix = circ ? Iy : B * L ** 3 / 12;
    const e = Math.hypot(ex, ey);
    // teljes felület nyomott?
    const kern = circ ? e <= Rr / 4 + 1e-12 : Math.abs(ex) / B + Math.abs(ey) / L <= 1 / 6 + 1e-12;
    if (kern) {
      const a = V / A, b = V * ex / Iy, c = V * ey / Ix;
      const smax = circ ? a + Math.hypot(b, c) * Rr : a + Math.abs(b) * B / 2 + Math.abs(c) * L / 2;
      const smin = circ ? a - Math.hypot(b, c) * Rr : a - Math.abs(b) * B / 2 - Math.abs(c) * L / 2;
      return { ok: true, full: true, a, b, c, smax, smin: Math.max(0, smin), ratio: 1 };
    }
    if (!circ && (Math.abs(ey) < 1e-9 || Math.abs(ex) < 1e-9)) { // egyirányú, zárt alak
      const alongX = Math.abs(ey) < 1e-9, Bd = alongX ? B : L, Ld = alongX ? L : B, ee = alongX ? ex : ey;
      if (Math.abs(ee) >= Bd / 2) return { ok: true, full: false, smax: Infinity, ratio: 0, lost: true };
      const cc = Bd / 2 - Math.abs(ee), len = 3 * cc, smax = 2 * V / (3 * cc * Ld);
      // sík: σ = smax·(s − s0)/len, s0 = sign·(Bd/2 − len) a nyomott él felől
      const sg = Math.sign(ee) || 1, s0 = sg * (Bd / 2) - sg * len; const k = sg * smax / len; // σ(s) = k·(s − s0)
      const a = -k * s0; const b = alongX ? k : 0, c = alongX ? 0 : k;
      return { ok: true, full: false, a, b, c, smax, smin: 0, ratio: len / Bd, len };
    }
    // általános eset: Newton-iteráció rácson
    const N = circ ? 120 : 100, cells = []; const hx = circ ? 2 * Rr / N : B / N, hy = circ ? 2 * Rr / N : L / N, dA = hx * hy;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const x = (circ ? -Rr : -B / 2) + (i + 0.5) * hx, y = (circ ? -Rr : -L / 2) + (j + 0.5) * hy; if (circ && x * x + y * y > Rr * Rr) continue; cells.push(x, y); }
    const Atot = cells.length / 2 * dA; let a = V / Atot, b = V * ex / Iy, c = V * ey / Ix, okc = false;
    for (let it = 0; it < 80; it++) {
      let f0 = -V, f1 = -V * ex, f2 = -V * ey; const J = [0, 0, 0, 0, 0, 0];
      for (let k = 0; k < cells.length; k += 2) { const x = cells[k], y = cells[k + 1], s = a + b * x + c * y; if (s <= 0) continue; f0 += s * dA; f1 += s * x * dA; f2 += s * y * dA; J[0] += dA; J[1] += x * dA; J[2] += y * dA; J[3] += x * x * dA; J[4] += x * y * dA; J[5] += y * y * dA; }
      if (J[0] <= 0) break;
      const M = [[J[0], J[1], J[2]], [J[1], J[3], J[4]], [J[2], J[4], J[5]]], d = solve3(M, [-f0, -f1, -f2]); if (!d) break;
      let t = 1; a += t * d[0]; b += t * d[1]; c += t * d[2];
      if (Math.abs(f0) / V < 1e-9 && Math.abs(f1) / V < 1e-9 * (B || Rr) && Math.abs(f2) / V < 1e-9 * (L || Rr)) { okc = true; break; }
    }
    let Ac = 0; for (let k = 0; k < cells.length; k += 2) if (a + b * cells[k] + c * cells[k + 1] > 0) Ac += dA;
    const smax = circ ? a + Math.hypot(b, c) * Rr : a + Math.abs(b) * B / 2 + Math.abs(c) * L / 2;
    if (!okc && !(Ac > 0)) return { ok: true, full: false, smax: Infinity, ratio: 0, lost: true };
    return { ok: true, full: false, a, b, c, smax, smin: 0, ratio: Ac / Atot };
  }
  function solve3(M, r) {
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D0 = det(M); if (Math.abs(D0) < 1e-14) return null;
    return [0, 1, 2].map(k => det(M.map((row, i) => row.map((x, j) => j === k ? r[i] : x))) / D0);
  }

  // ============================== FELBORULÁS + KÜLPONTOSSÁG ==============================
  function overturn(p0) {
    const p = merge(DEF.overturn, p0), R = mk(), v = R.v; R.input = p;
    const circ = p.shape === 'circ', B = circ ? p.Dc : p.B, L = circ ? p.Dc : p.L, Rr = p.Dc / 2;
    if (!(B > 0) || !(L > 0)) { R.err.push('Az alaptest méretei legyenek pozitívak.'); return R; }
    if (!(p.hf > 0)) { R.err.push('Az alaptest magassága (h) legyen pozitív.'); return R; }
    const A = circ ? Math.PI * Rr * Rr : B * L;
    const Wc = p.selfw ? A * p.hf * 25 : 0, Wf = p.selfw ? A * Math.max(0, p.Df - p.hf) * p.gam : 0, W = Wc + Wf;
    const two = p.two, eGL = two ? p.eGL : 0;
    const HGL = two ? p.HGLk : 0, HQL = two ? p.HQLk : 0;
    const Vk = p.Gk + W + (p.qWith ? p.Qk : 0);
    const MxK = p.HGk * p.hG + p.HQk * p.hQ + p.Gk * p.eGB, MyK = HGL * p.hGL + HQL * p.hQL + p.Gk * eGL;
    if (Vk <= 0) { R.err.push('A függőleges teher (V<sub>k</sub>) legyen pozitív – a felborulás és a külpontosság csak nyomott talpra értelmezhető.'); return R; }
    const eB = MxK / Vk, eL = MyK / Vk, e = Math.hypot(eB, eL);
    const fp = p.ground === 'rock' ? 0 : 0.1;
    // EQU: egy irány (n egységvektor) – forgáspont a talp szélétől fp·(teljes méret) távolságra
    function equ(nx, ny) {
      const half = circ ? Rr : Math.abs(nx) * B / 2 + Math.abs(ny) * L / 2, full = circ ? 2 * Rr : Math.abs(nx) * B + Math.abs(ny) * L;
      const dp = half - fp * full; let dG = 0, dQ = 0, sG = 0; const parts = [];
      const hor = (H, h, ux, uy, perm, name) => { if (!H) return; const m = H * h * (ux * nx + uy * ny); if (Math.abs(m) < 1e-12) return; if (m > 0) { if (perm) dG += m; else dQ += m; parts.push({ name, m, dst: true, perm }); } else if (perm) { sG += -m; parts.push({ name, m: -m, dst: false, perm }); } else parts.push({ name, m: -m, dst: false, perm, zero: true }); };
      hor(p.HGk, p.hG, 1, 0, true, 'H<sub>G;k</sub>'); hor(p.HQk, p.hQ, 1, 0, false, 'H<sub>Q;k</sub>'); hor(HGL, p.hGL, 0, 1, true, 'H<sub>G;L;k</sub>'); hor(HQL, p.hQL, 0, 1, false, 'H<sub>Q;L;k</sub>');
      const armG = dp - (p.eGB * nx + eGL * ny);
      if (p.Gk) { const m = p.Gk * armG; if (m >= 0) { sG += m; parts.push({ name: 'G<sub>k</sub>', m, dst: false, perm: true, arm: armG }); } else { dG += -m; parts.push({ name: 'G<sub>k</sub>', m: -m, dst: true, perm: true, arm: armG }); } }
      if (W) { sG += W * dp; parts.push({ name: 'W (önsúly)', m: W * dp, dst: false, perm: true, arm: dp }); }
      const Mdst = 1.1 * dG + 1.5 * dQ, Mstb = 0.9 * sG;
      return { nx, ny, dp, dG, dQ, sG, Mdst, Mstb, lam: Mstb > 0 ? Mdst / Mstb : (Mdst > 0 ? Infinity : 0), parts };
    }
    const dirs = [];
    if (circ) { const n = e > 1e-9 ? [eB / e, eL / e] : [1, 0]; dirs.push(equ(n[0], n[1])); }
    else { dirs.push(equ(Math.sign(MxK) || 1, 0)); if (two && Math.abs(MyK) > 1e-9) dirs.push(equ(0, Math.sign(MyK) || 1)); }
    const gov = dirs.reduce((a, b) => (b.lam > a.lam ? b : a));
    // külpontosság
    const kernV = circ ? e / (Rr / 4) : Math.abs(eB) / B + Math.abs(eL) / L, kern = circ ? e <= Rr / 4 + 1e-9 : kernV <= 1 / 6 + 1e-9;
    const limV = circ ? e / (0.6 * Rr) : Math.hypot(eB / B, eL / L) / (1 / 3), allowed = limV <= 1 + 1e-9;
    const ct = contact(circ ? 'circ' : 'rect', B, L, Rr, Vk, eB, eL);
    const Bp = Math.max(0, B - 2 * Math.abs(eB)), Lp = Math.max(0, L - 2 * Math.abs(eL));
    const Aeff = circ ? (e < Rr ? 2 * (Rr * Rr * Math.acos(e / Rr) - e * Math.sqrt(Rr * Rr - e * e)) : 0) : Bp * Lp;
    Object.assign(v, { circ, B, L, Rr, A, Wc, Wf, W, Vk, MxK, MyK, eB, eL, e, fp, dirs, gov, kern, kernV, limV, allowed, ct, Bp, Lp, Aeff, two });
    // figyelmeztetések
    if (p.Df < p.hf) R.info.push('Az alaptest teteje a terepszint fölé ér.');
    if (!p.HGk && !p.HQk && !HGL && !HQL && !p.eGB && !eGL) R.info.push('Nincs felborító hatás – a teher központos.');
    if (p.ground === 'soil') R.info.push('Talajon álló alap: a forgáspont első közelítésben a talp szélétől B/10 távolságra van.');
    if (!allowed) R.warn.push(circ ? `e = ${u_(e, 3, 'm')} > 0,6·r = ${u_(0.6 * Rr, 3, 'm')}: a szabvány szerint külön óvintézkedés szükséges.` : `A külpontosság meghaladja a B/3 határt${two ? ' (kétirányú esetben az (e<sub>B</sub>/B)² + (e<sub>L</sub>/L)² ≤ 1/9 feltételt)' : ''}: külön óvintézkedés szükséges.`);
    else if (!kern) R.info.push('Az eredő a belső magon kívül van: a talp egy része elemelkedik (a régi hazai gyakorlat ezt nem engedte meg).');
    if (ct.lost) R.err.push('Az eredő a talpon kívül esik (e ≥ B/2) – az alap nem egyensúlyozható ki talpfeszültséggel.');
    R.info.push('Talajon a nagy külpontosság a teherbírásban is megjelenik: a teherbírást a B′ = B − 2e hasznos mérettel külön ellenőrizni kell.');
    if (p.qWith && p.Qk > 0) R.info.push('A függőleges esetleges teher az EQU-vizsgálatban kedvező hatás (γ<sub>Q;stb</sub> = 0), a külpontosság számításában viszont – a beállítás szerint – szerepel.');
    if (p.hQ < 0 || p.hG < 0) R.warn.push('Negatív teherkar – ellenőrizd a magasságokat.');
    if (R.err.length) return R;
    R.checks.push({ key: 'equ', title: 'Felborulás', sub: p.ground === 'rock' ? 'forgáspont a sarokban' : 'forgáspont a saroktól B/10-re', tag: 'EQU', E: gov.Mdst, R: gov.Mstb, lam: gov.lam, Es: sb('M', 'dst;d'), Rs: sb('M', 'stb;d'), unit: 'kNm' });
    R.checks.push({ key: 'ecc', title: 'A külpontosság korlátozása', sub: kern ? 'belső magon belül' : allowed ? 'részleges elemelkedés' : 'óvintézkedés kell', tag: 'GEO · ' + DA2 + ' · karakterisztikus', E: circ ? e : Math.hypot(eB / B, eL / L), R: circ ? 0.6 * Rr : 1 / 3, lam: limV, Es: circ ? 'e' : (two ? '√((e<sub>B</sub>/B)² + (e<sub>L</sub>/L)²)' : 'e/B'), Rs: circ ? '0,6 · r' : '1/3', unit: circ ? 'm' : '', d: 3 });
    // lépések
    const S = R.steps;
    S.push({ t: 'Függőleges teher (karakterisztikus)', b: (p.selfw ? fl(sb('W', 'b'), `A · h · 25`, `${F(A, 3)} · ${F(p.hf, 2)} · 25`, u_(Wc, 1, 'kN')) + fl(sb('W', 't'), `A · (D − h) · γ`, `${F(A, 3)} · ${F(Math.max(0, p.Df - p.hf), 2)} · ${F(p.gam, 1)}`, u_(Wf, 1, 'kN')) : '') + fl(sb('V', 'k'), `G<sub>k</sub>${p.selfw ? ' + W<sub>b</sub> + W<sub>t</sub>' : ''}${p.qWith ? ' + Q<sub>k</sub>' : ''}`, u_(Vk, 1, 'kN')) });
    dirs.forEach((d, i) => {
      const dir = circ ? 'az eredő külpontosság irányában' : d.nx ? 'B irányban' : 'L irányban';
      let b = `<p class="cx-c">Forgáspont ${dir}: a talp középpontjától ${nw(u_(d.dp, 3, 'm'))} (${p.ground === 'rock' ? 'szilárd kőzet – a talp széle' : 'talaj – a széltől ' + (circ ? 'D/10' : 'B/10') + ' távolságra'}).</p>`;
      b += '<div class="tblw cx-tw"><table class="tbl cx-tbl"><thead><tr><th>Hatás</th><th>Karakterisztikus nyomaték</th><th>Jelleg</th><th>γ</th><th>Tervezési</th></tr></thead><tbody>' + d.parts.map(q => { const g = q.dst ? (q.perm ? 1.1 : 1.5) : (q.perm ? 0.9 : 0); return `<tr><td>${q.name}</td><td>${u_(q.m, 1, 'kNm')}</td><td>${q.dst ? 'felborító' : 'stabilizáló'}</td><td>${F(g, 1)}</td><td>${u_(q.m * g, 1, 'kNm')}</td></tr>`; }).join('') + '</tbody></table></div>';
      b += fl(sb('M', 'dst;d'), '1,1 · ΣM<sub>G;dst</sub> + 1,5 · ΣM<sub>Q;dst</sub>', `1,1 · ${F(d.dG, 1)} + 1,5 · ${F(d.dQ, 1)}`, u_(d.Mdst, 1, 'kNm')) + fl(sb('M', 'stb;d'), '0,9 · ΣM<sub>G;stb</sub>', `0,9 · ${F(d.sG, 1)}`, u_(d.Mstb, 1, 'kNm')) + fl('Λ', `M<sub>dst;d</sub> / M<sub>stb;d</sub>`, `<b>${F(d.lam, 3)}</b>`);
      S.push({ t: `EQU-vizsgálat ${dir}${dirs.length > 1 ? (d === gov ? ' (mértékadó)' : '') : ''}`, b });
    });
    let b = fl(sb('M', 'B;k'), `H<sub>G;k</sub> · h<sub>G</sub> + H<sub>Q;k</sub> · h<sub>Q</sub> + G<sub>k</sub> · e<sub>G;B</sub>`, u_(MxK, 1, 'kNm')) + fl(sb('e', 'B'), `M<sub>B;k</sub> / V<sub>k</sub>`, `${F(MxK, 1)} / ${F(Vk, 1)}`, u_(eB, 3, 'm'));
    if (two || circ) b += fl(sb('M', 'L;k'), u_(MyK, 1, 'kNm')) + fl(sb('e', 'L'), `${F(MyK, 1)} / ${F(Vk, 1)}`, u_(eL, 3, 'm'));
    if (circ) b += fl('e', `√(e<sub>B</sub>² + e<sub>L</sub>²)`, u_(e, 3, 'm')) + `<p class="cx-c">Belső mag: ${nw('e ≤ r/4 = ' + u_(Rr / 4, 3, 'm'))}; korlát: ${nw('e ≤ 0,6 · r = ' + u_(0.6 * Rr, 3, 'm'))}.</p>`;
    else if (two && Math.abs(eL) > 1e-9) b += `<p class="cx-c">Belső mag (rombusz): ${nw(`|e<sub>B</sub>|/B + |e<sub>L</sub>|/L = ${F(kernV, 3)} ${kern ? '≤' : '>'} 1/6 = 0,167`)}. A B/3 határ kétirányú általánosítása: ${nw(`(e<sub>B</sub>/B)² + (e<sub>L</sub>/L)² = ${F((eB / B) ** 2 + (eL / L) ** 2, 4)} ${allowed ? '≤' : '>'} 1/9 = 0,1111`)} (a hézag legfeljebb a súlypontig ér).</p>`;
    else b += `<p class="cx-c">${nw(`B/6 = ${u_(B / 6, 3, 'm')}`)}, ${nw(`B/3 = ${u_(B / 3, 3, 'm')}`)} → ${kern ? nw('e ≤ B/6') + ': az eredő a belső magon belül van, a teljes talp nyomott.' : allowed ? nw('B/6 < e ≤ B/3') + ': megengedett, de a talp egy része elemelkedik.' : nw('e > B/3') + ': külön óvintézkedés szükséges.'}</p>`;
    S.push({ t: `Külpontosság karakterisztikus hatásokból (${DA2})`, b });
    let c = '';
    if (ct.full) c = (circ || (two && eL)) ? fl(sb('σ', 'max'), u_(ct.smax, 1, 'kPa')) + fl(sb('σ', 'min'), u_(ct.smin, 1, 'kPa')) : fl(`σ<sub>max/min</sub>`, `V<sub>k</sub>/(B · L) · (1 ± 6e/B)`, `${F(Vk / A, 1)} · (1 ± ${F(6 * Math.abs(eB) / B, 3)})`, `${u_(ct.smax, 1, 'kPa')} / ${u_(ct.smin, 1, 'kPa')}`);
    else if (ct.len) c = fl('c', 'B/2 − e', u_(B / 2 - Math.abs(eB), 3, 'm')) + fl('nyomott hossz', '3c', `${u_(ct.len, 3, 'm')} (${F(ct.ratio * 100, 0)}${NB}%)`) + fl(sb('σ', 'max'), '2V<sub>k</sub> / (3 · c · L)', `2 · ${F(Vk, 1)} / (3 · ${F(B / 2 - Math.abs(eB), 3)} · ${F(L, 2)})`, u_(ct.smax, 1, 'kPa'));
    else if (!ct.lost) c = `<p class="cx-c">A nyomott felület és a feszültség síkja iterációval (húzást nem vevő talp, lineáris eloszlás):</p>` + fl('nyomott felület', `${F(ct.ratio * 100, 0)}${NB}%`) + fl(sb('σ', 'max'), u_(ct.smax, 1, 'kPa'));
    c += fl(sb('σ', 'átl'), `V<sub>k</sub> / A`, `${F(Vk, 1)} / ${F(A, 3)}`, u_(Vk / A, 1, 'kPa'));
    c += circ ? fl("A′ (hasznos felület)", u_(Aeff, 3, 'm²')) : fl('B′ × L′', `(B − 2e<sub>B</sub>) × (L − 2e<sub>L</sub>)`, `${F(Bp, 3)} × ${F(Lp, 3)}`, u_(Aeff, 3, 'm²'));
    S.push({ t: 'Talpfeszültség (karakterisztikus)', b: c });
    return R;
  }

  // ============================== FELÚSZÁS ==============================
  function uplift(p0) {
    const p = merge(DEF.uplift, p0), R = mk(), v = R.v; R.input = p;
    const { L, B, H, D, o } = p;
    if (!(L > 0 && B > 0 && H > 0)) { R.err.push('A műtárgy méretei (L, B, H) legyenek pozitívak.'); return R; }
    if (!(D > 0)) { R.err.push('A beágyazási mélység (D) legyen pozitív.'); return R; }
    if (o < 0) { R.err.push('A talplemez túlnyújtása nem lehet negatív.'); return R; }
    const geom = p.gMode === 'geom';
    if (geom && (p.tb <= 0 || p.tw <= 0 || p.tr < 0)) { R.err.push('A lemez- és falvastagságok legyenek pozitívak.'); return R; }
    if (geom && (H - p.tb - p.tr <= 0 || 2 * p.tw >= Math.min(L, B))) { R.err.push('A szerkezeti vastagságok nem férnek el a megadott külső méretekben.'); return R; }
    const Lo = L + 2 * o, Bo = B + 2 * o, Ab = Lo * Bo, Ar = L * B, tw = geom ? p.tw : 0.4, Ai = Math.max(0, (L - 2 * tw) * (B - 2 * tw)), Arim = Ab - Ar;
    const zw = p.dw, hw = Math.max(0, D - zw);
    const Vg = GW * hw * Ab, Vdst = 1.0 * Vg + 1.5 * Math.max(0, p.Qdst);
    let Gs, Gsl = 0, Gwa = 0, Gro = 0, Gin = 0;
    if (geom) { Gsl = 25 * Ab * p.tb; Gwa = 25 * 2 * ((L - tw) + (B - tw)) * tw * (H - p.tb - p.tr); Gro = 25 * Ar * p.tr; Gin = 25 * Math.max(0, Math.round(p.ni)) * p.ti * Ai; Gs = Gsl + Gwa + Gro + Gin; }
    else Gs = p.Gk;
    const zt = D - H, top = zt - p.tc;
    const Gcov = Ar * soilCol(top, zt, zw, p.gam, p.gsat);
    const Gwt = zw < top ? GW * (top - zw) * Ar : 0;
    const Grim = Arim > 0 ? Arim * (soilCol(0, Math.max(0, D - (geom ? p.tb : 0.6)), zw, p.gam, p.gsat) + (zw < 0 ? GW * (-zw) : 0)) : 0;
    const Gbal = GW * Math.max(0, p.hb) * Ai;
    const Gsum = Gs + Gcov + Gwt + Grim + Gbal + Math.max(0, p.Gadd), Gstb = 0.9 * Gsum;
    const Pout = 2 * (Lo + Bo), auto = p.kAuto !== 'man', Ke = auto ? 1 - Math.sin(rad(p.phiS)) : p.K0, de = auto ? p.phiS * 2 / 3 : p.delta;
    const sef = (z) => { const s = (zw < 0 ? GW * (-zw) : 0) + soilCol(0, z, zw, p.gam, p.gsat), u = GW * Math.max(0, z - zw); return Math.max(0, s - u); };
    const tau = (z) => Ke * sef(z) * tg(de);
    const Tk = p.fric ? Pout * integ(tau, 0, D, [zw]) : 0, Td = Tk / 1.4;
    const n = Math.max(0, Math.round(p.n)), Pd1 = p.Rk / 1.4, Pd = n * Pd1;
    const Rd = Td + Pd, lam = Vdst / Math.max(1e-9, Gstb + Rd);
    const def = Vdst - Gstb - Rd;
    const tbReq = geom ? p.tb + def / (0.9 * 25 * Ai) : null;
    const nReq = Pd1 > 0 ? Math.max(0, Math.ceil((Vdst - Gstb - Td) / Pd1 - 1e-9)) : null;
    const hbReq = Math.max(0, p.hb) + def / (0.9 * GW * Math.max(1e-9, Ai));
    // kritikus vízszint (Λ = 1)
    const lamAt = (z) => { const q = { ...p, dw: z }; return uplift.core(q); };
    let zc = null; const lo = lamAt(D), hi = lamAt(-3);
    if (lo >= 1) zc = 'lo'; else if (hi < 1) zc = 'hi'; else { let a = -3, b2 = D; for (let i = 0; i < 50; i++) { const m = (a + b2) / 2; if (lamAt(m) >= 1) a = m; else b2 = m; } zc = (a + b2) / 2; }
    Object.assign(v, { Ke, de, auto, L, B, H, D, o, Lo, Bo, Ab, Ar, Ai, Arim, zw, hw, Vg, Vdst, Gs, Gsl, Gwa, Gro, Gin, Gcov, Gwt, Grim, Gbal, Gsum, Gstb, Pout, Tk, Td, n, Pd1, Pd, Rd, lam, def, tbReq, nReq, hbReq, zc, geom, tw, zt, top });
    // figyelmeztetések
    if (zw >= D) R.info.push('A talajvízszint az alaplemez alsó síkja alatt van – nincs felhajtóerő.');
    if (zw < 0) R.warn.push('A tervezési vízszint a terepszint felett van (árvíz) – a műtárgyon álló víz súlyát stabilizáló hatásként vettük figyelembe.');
    if (hw > H + p.tc) R.info.push('A víz a födém (takarás) felett áll.');
    if (H > D) R.info.push('A műtárgy kiáll a terepből.');
    if (p.tc > 0 && D > H && Math.abs(p.tc - (D - H)) > 0.05) R.info.push('A födém feletti takarás nem a terepszintig ér.');
    if (D > H && p.tc === 0) R.warn.push('A födém a terepszint alatt van, de takarás nincs megadva.');
    if (p.fric && (Ke < 0.2 || Ke > 1.5)) R.warn.push(`Szokatlan földnyomás-szorzó: K = ${F(Ke, 2)}.`);
    if (p.fric && (de < 5 || de > 35)) R.warn.push(`Szokatlan fal–talaj súrlódási szög: δ = ${u_(de, 1, '°')}.`);
    if (p.fric && auto && (p.phiS < 15 || p.phiS > 42)) R.warn.push(`Szokatlan φ′<sub>k</sub> = ${u_(p.phiS, 1, '°')} a visszatöltésben.`);
    if (p.fric) R.info.push('Az oldalsúrlódást csak akkor szabad figyelembe venni, ha a visszatöltés és a fal–talaj kapcsolat tartósan biztosított.');
    if (n > 0) R.info.push('A horgonyok (húzott cölöpök) kihúzódási és szerkezeti ellenállását, valamint az alaplemez hajlítását külön igazolni kell.');
    if (p.gsat < p.gam) R.warn.push('A telített térfogatsúly kisebb a nedvesnél – ellenőrizd.');
    R.info.push('A felúszással szembeni globális biztonság csak 1,0/0,9 = 1,11 – a tervezési talajvízszintet óvatosan kell felvenni.');
    R.checks.push({ key: 'upl', title: 'Felúszás', sub: 'felhajtóerő ↔ önsúly, leterhelés, súrlódás, horgony', tag: 'UPL', E: Vdst, R: Gstb + Rd, lam, Es: sb('V', 'dst;d'), Rs: sb('G', 'stb;d') + ' + ' + sb('R', 'd'), unit: 'kN', d: 0 });
    // lépések
    const S = R.steps;
    S.push({ t: 'Felhajtóerő (γ<sub>G;dst</sub> = 1,00)', b: fl(sb('A', 'k'), o > 0 ? '(L + 2o) · (B + 2o)' : 'L · B', `${F(Lo, 2)} · ${F(Bo, 2)}`, u_(Ab, 2, 'm²')) + fl(sb('h', 'w'), 'D − d<sub>w</sub>', `${F(D, 2)} − ${F(zw, 2)}`, u_(hw, 2, 'm')) + fl(sb('V', 'dst;d'), `γ<sub>G;dst</sub> · γ<sub>w</sub> · h<sub>w</sub> · A<sub>k</sub>${p.Qdst > 0 ? ' + 1,5 · Q<sub>dst;k</sub>' : ''}`, `1,0 · 10 · ${F(hw, 2)} · ${F(Ab, 2)}${p.Qdst > 0 ? ' + 1,5 · ' + F(p.Qdst, 1) : ''}`, u_(Vdst, 0, 'kN')) });
    let g = '';
    if (geom) g += fl('alaplemez', `25 · ${F(Ab, 2)} · ${F(p.tb, 2)}`, u_(Gsl, 0, 'kN')) + fl('falak', `25 · ${F(2 * ((L - tw) + (B - tw)), 2)} · ${F(tw, 2)} · ${F(H - p.tb - p.tr, 2)}`, u_(Gwa, 0, 'kN')) + fl('födém', `25 · ${F(Ar, 2)} · ${F(p.tr, 2)}`, u_(Gro, 0, 'kN')) + (Gin ? fl('közbenső födém', `25 · ${Math.round(p.ni)} · ${F(p.ti, 2)} · ${F(Ai, 2)}`, u_(Gin, 0, 'kN')) : '') + fl(sb('G', 'sz;k'), u_(Gs, 0, 'kN'));
    else g += fl(sb('G', 'sz;k') + ' (megadva)', u_(Gs, 0, 'kN'));
    if (Gcov) g += fl(sb('G', 't;k') + ' (takarás)', `${F(Ar, 2)} · Σγ·Δz (t = ${u_(p.tc, 2, 'm')})`, u_(Gcov, 0, 'kN'));
    if (Gwt) g += fl('víz a födémen', u_(Gwt, 0, 'kN'));
    if (Grim) g += fl(sb('G', 'perem;k'), `${F(Arim, 2)} · Σγ·Δz`, u_(Grim, 0, 'kN')) + `<p class="cx-c">A túlnyújtott peremre ráülő talaj (víz felett γ, alatta γ<sub>sat</sub>).</p>`;
    if (Gbal) g += fl('ballasztvíz', `10 · ${F(p.hb, 2)} · ${F(Ai, 2)}`, u_(Gbal, 0, 'kN'));
    if (p.Gadd > 0) g += fl('egyéb állandó', u_(p.Gadd, 0, 'kN'));
    g += fl(sb('G', 'stb;d'), `γ<sub>G;stb</sub> · ΣG<sub>k</sub>`, `0,9 · ${F(Gsum, 0)}`, u_(Gstb, 0, 'kN'));
    S.push({ t: 'Stabilizáló állandó hatások (γ<sub>G;stb</sub> = 0,90)', b: g });
    if (p.fric) S.push({ t: 'Oldalsúrlódás (γ<sub>s;t</sub> = 1,4)', b: (auto ? fl('K = K<sub>0</sub>', `1 − sin${NB}φ′<sub>k</sub>`, `1 − sin${NB}${F(p.phiS, 1)}°`, F(Ke, 3)) + fl('δ', `⅔ · φ′<sub>k</sub>`, `⅔ · ${u_(p.phiS, 1, '°')}`, u_(de, 2, '°')) : fl('K', F(Ke, 3)) + fl('δ', u_(de, 2, '°'))) + `<p class="cx-c">${nw('τ(z) = K · σ′<sub>v</sub>(z) · tg' + NB + 'δ')}, a ${nw(u_(Pout, 1, 'm'))} külső kerületen, a terepszinttől az alapsíkig (${nw(u_(D, 2, 'm'))}).</p>` + fl(sb('T', 'k'), `U · ∫ K · σ′<sub>v</sub> · tg${NB}δ dz`, `${F(Pout, 1)} · ${F(Tk / Pout, 2)}`, u_(Tk, 0, 'kN')) + fl(sb('T', 'd'), 'T<sub>k</sub> / γ<sub>s;t</sub>', `${F(Tk, 0)} / 1,4`, u_(Td, 0, 'kN')) });
    if (n > 0) S.push({ t: 'Horgonyzás (γ<sub>a</sub> = 1,4)', b: fl(sb('P', 'd;1'), 'R<sub>k</sub> / γ<sub>a</sub>', `${F(p.Rk, 0)} / 1,4`, u_(Pd1, 1, 'kN')) + fl(sb('P', 'd'), `n · P<sub>d;1</sub>`, `${n} · ${F(Pd1, 1)}`, u_(Pd, 0, 'kN')) });
    S.push({ t: 'Igazolás', b: fl('Λ', `V<sub>dst;d</sub> / (G<sub>stb;d</sub> + T<sub>d</sub> + P<sub>d</sub>)`, `${F(Vdst, 0)} / (${F(Gstb, 0)} + ${F(Td, 0)} + ${F(Pd, 0)})`, `<b>${F(lam, 3)}</b>`) + `<p class="cx-c">${lam <= 1 + 1e-9 ? 'Megfelel' : 'Nem felel meg'} – ${def > 0 ? 'hiányzó ellenállás: ' + nw(u_(def, 0, 'kN')) : 'tartalék: ' + nw(u_(-def, 0, 'kN'))}.</p>` });
    let q = '';
    if (geom) q += fl('Λ = 1-hez tartozó alaplemez-vastagság', 't<sub>b</sub> + ΔG / (0,9 · 25 · A<sub>belső</sub>)', u_(Math.max(0, tbReq), 2, 'm')) + `<p class="cx-c">A lemezt befelé vastagítva (a külső méretek változatlanok, a felhajtóerő nem nő).</p>`;
    if (nReq !== null) q += fl('szükséges horgonyszám', `(V<sub>dst;d</sub> − G<sub>stb;d</sub> − T<sub>d</sub>) / P<sub>d;1</sub>`, `${nReq}${NB}db`);
    q += fl('Λ = 1-hez tartozó ballasztvíz', u_(Math.max(0, hbReq), 2, 'm'));
    if (typeof zc === 'number') q += fl('kritikus talajvízszint (Λ = 1)', `${u_(zc, 2, 'm')} a terepszint ${zc >= 0 ? 'alatt' : 'felett'}`.replace('−', ''));
    S.push({ t: 'Mennyi kellene? (Λ = 1)', b: q });
    return R;
  }
  // gyors mag a kritikus vízszint kereséséhez
  uplift.core = function (p) {
    const geom = p.gMode === 'geom', { L, B, H, D, o } = p, Lo = L + 2 * o, Bo = B + 2 * o, Ab = Lo * Bo, Ar = L * B, tw = geom ? p.tw : 0.4, Ai = Math.max(0, (L - 2 * tw) * (B - 2 * tw)), Arim = Ab - Ar, zw = p.dw, hw = Math.max(0, D - zw);
    const Vdst = GW * hw * Ab + 1.5 * Math.max(0, p.Qdst);
    const Gs = geom ? 25 * (Ab * p.tb + 2 * ((L - tw) + (B - tw)) * tw * (H - p.tb - p.tr) + Ar * p.tr + Math.max(0, Math.round(p.ni)) * p.ti * Ai) : p.Gk;
    const zt = D - H, top = zt - p.tc; const Gcov = Ar * soilCol(top, zt, zw, p.gam, p.gsat), Gwt = zw < top ? GW * (top - zw) * Ar : 0;
    const Grim = Arim > 0 ? Arim * (soilCol(0, Math.max(0, D - (geom ? p.tb : 0.6)), zw, p.gam, p.gsat) + (zw < 0 ? GW * (-zw) : 0)) : 0;
    const Gstb = 0.9 * (Gs + Gcov + Gwt + Grim + GW * Math.max(0, p.hb) * Ai + Math.max(0, p.Gadd));
    const sef = (z) => Math.max(0, (zw < 0 ? GW * (-zw) : 0) + soilCol(0, z, zw, p.gam, p.gsat) - GW * Math.max(0, z - zw));
    const au = p.kAuto !== 'man', Ke = au ? 1 - Math.sin(rad(p.phiS)) : p.K0, de = au ? p.phiS * 2 / 3 : p.delta;
    const Td = p.fric ? 2 * (Lo + Bo) * integ((z) => Ke * sef(z) * tg(de), 0, D, [zw]) / 1.4 : 0;
    return Vdst / Math.max(1e-9, Gstb + Td + Math.max(0, Math.round(p.n)) * p.Rk / 1.4);
  };

  // ============================== ÁLTALÁNOS ÁLLÉKONYSÁG (egyszerűsített Bishop) ==============================
  function slopeModel(p) {
    const H = p.H, n = p.n, LX = H * n, und = p.an === 'undrained';
    const gm = und ? p.gcu : p.gm;
    const y2 = p.lay2 ? -p.z2 : -Infinity, yBot = -H - Math.max(0.5, p.dR);
    const ground = (x) => x <= 0 ? 0 : x >= LX ? -H : -H * x / LX;
    const L1 = { g: p.gam, c: und ? p.cu / gm : p.c / gm, t: und ? 0 : Math.tan(rad(p.phi)) / gm }, L2 = { g: p.gam2, c: und ? p.cu2 / gm : p.c2 / gm, t: und ? 0 : Math.tan(rad(p.phi2)) / gm };
    const layerAt = (y) => (y < y2 ? L2 : L1);
    const colW = (x, ya) => { const yg = ground(x); if (yg <= ya) return 0; if (yg <= y2) return L2.g * (yg - ya); if (ya >= y2) return L1.g * (yg - ya); return L1.g * (yg - y2) + L2.g * (y2 - ya); };
    const wPh = p.water === 'phreatic' && !und, wRu = p.water === 'ru' && !und;
    const yw = (x) => { let y = x <= 0 ? -p.wd : x >= LX ? -H - p.wt : -p.wd + (-H - p.wt + p.wd) * x / LX; return Math.min(y, ground(x)); };
    const loads = [];
    for (const k of ['f1', 'f2']) if (p[k] && p[k + 'B'] > 0) { const B = p[k + 'B'], a = p[k + 'a'], Pd = 1.0 * p[k + 'G'] + 1.3 * p[k + 'Q']; loads.push({ k, x0: -a - B, x1: -a, B, a, Df: Math.max(0, p[k + 'D']), Pd, q: Pd / B, G: p[k + 'G'], Q: p[k + 'Q'] }); }
    return { H, n, LX, und, gm, y2, yBot, ground, L1, L2, layerAt, colW, wPh, wRu, yw, ru: p.ru, loads, ns: 30 };
  }
  // körív és terep metszése; null, ha érvénytelen
  function circleGeom(m, xc, yc, R) {
    if (!(R > 0.3)) return null;
    if (yc - R < m.yBot - 1e-6) return null;            // a merev réteg alá nem mehet
    if (yc <= m.ground(xc) + 0.3) return null;
    if (m.ground(xc - R) >= yc || m.ground(xc + R) >= yc) return null;
    const segs = [[-1e9, 0, 0, 0], [0, m.LX, -m.H / m.LX, 0], [m.LX, 1e9, 0, -m.H]]; // [xa, xb, k, q]  y = kx+q
    const xs = [];
    for (const [xa, xb, k, q] of segs) { const A = 1 + k * k, Bq = 2 * (k * (q - yc) - xc), C = xc * xc + (q - yc) ** 2 - R * R, D = Bq * Bq - 4 * A * C; if (D < 0) continue; const s = Math.sqrt(D); for (const x of [(-Bq - s) / (2 * A), (-Bq + s) / (2 * A)]) if (x >= xa - 1e-9 && x <= xb + 1e-9 && k * x + q <= yc) xs.push(x); }
    xs.sort((a, b) => a - b); if (xs.length < 2) return null;
    const x0 = xs[0], x1 = xs[xs.length - 1];
    const yA = (x) => yc - Math.sqrt(Math.max(0, R * R - (x - xc) ** 2));
    for (let i = 1; i < xs.length; i++) { const xm = (xs[i - 1] + xs[i]) / 2; if (xs[i] - xs[i - 1] > 1e-6 && yA(xm) > m.ground(xm) + 1e-9) return null; }
    if (x1 - x0 < 1.0) return null;
    // minimális mélység
    let hmax = 0; for (let i = 1; i < 12; i++) { const x = x0 + (x1 - x0) * i / 12; hmax = Math.max(hmax, m.ground(x) - yA(x)); } if (hmax < Math.max(0.5, 0.05 * m.H)) return null;
    // a csúszólap nem metszheti az alaptesteket
    for (const Ld of m.loads) { if (Ld.Df <= 0) continue; const a = Math.max(Ld.x0, x0), b = Math.min(Ld.x1, x1); if (b <= a) continue; for (const x of [a, (a + b) / 2, b]) if (yA(x) > -Ld.Df - 1e-9) return null; }
    return { x0, x1, yA };
  }
  function bishop(m, xc, yc, R, detail) {
    const gq = circleGeom(m, xc, yc, R); if (!gq) return null;
    const { x0, x1, yA } = gq, ns = m.ns, b = (x1 - x0) / ns; const S = []; let den = 0;
    for (let i = 0; i < ns; i++) {
      const xl = x0 + i * b, xr = xl + b, xm = xl + b / 2, ya = yA(xm), yg = m.ground(xm), h = yg - ya; if (h <= 1e-6) continue;
      const W = b * m.colW(xm, ya); let P = 0; for (const Ld of m.loads) { const ov = Math.min(xr, Ld.x1) - Math.max(xl, Ld.x0); if (ov > 0) P += Ld.q * ov; }
      const al = Math.atan2(xc - xm, yc - ya); const L = m.layerAt(ya);
      const u = m.wRu ? m.ru * W / b : m.wPh ? GW * Math.max(0, m.yw(xm) - ya) : 0;
      S.push({ xm, b, h, W, P, al, u, c: L.c, t: L.t, ya, yg, lay2: L === m.L2 }); den += (W + P) * Math.sin(al);
    }
    if (!(den > 1e-6)) return null;
    let Fs = 1.5, num = 0;
    for (let it = 0; it < 80; it++) { num = 0; for (const s of S) { let ma = Math.cos(s.al) + Math.sin(s.al) * s.t / Fs; s.ma = ma < 0.2 ? 0.2 : ma; s.N = Math.max(0, s.W + s.P - s.u * s.b); s.num = (s.c * s.b + s.N * s.t) / s.ma; num += s.num; } const Fn = num / den; if (Math.abs(Fn - Fs) < 1e-6) { Fs = Fn; break; } Fs = Fn; }
    const res = { F: Fs, xc, yc, R, x0, x1, den, num };
    if (detail) res.slices = S;
    return res;
  }
  function slopeSearch(m, opt = {}) {
    const fine = !!opt.fine, H = m.H, LX = m.LX;
    const xb = m.loads.length ? Math.min(...m.loads.map(l => l.x0)) : 0;
    const xmin = Math.min(-0.4 * H, xb - 0.35 * H), xmax = LX + 0.5 * H, ymin = 0.05 * H, ymax = 2.4 * H + Math.max(0, -m.yBot - H) * 0.5;
    const nx = fine ? 34 : 22, ny = fine ? 28 : 17, nr = fine ? 22 : 14;
    const toe = [LX, -H]; const grid = []; const cand = [], candF = [];
    const involves = (r) => m.loads.some(l => Math.min(r.x1, l.x1) - Math.max(r.x0, l.x0) > 1e-6);
    const lv = []; for (let k = 0; k < nr; k++) lv.push(m.yBot + (Math.min(-0.6, -0.04 * H) - m.yBot) * k / (nr - 1));
    for (const l of m.loads) lv.push(-l.Df - 0.4, -l.Df - 1.2);
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
      const xc = xmin + (xmax - xmin) * i / (nx - 1), yc = ymin + (ymax - ymin) * j / (ny - 1);
      let cb = null, cf = null; const radii = [Math.hypot(xc - toe[0], yc - toe[1]), ...lv.map(yt => yc - yt)];
      for (const R of radii) { const r = bishop(m, xc, yc, R); if (!r || r.F < 0.05) continue; if (!cb || r.F < cb.F) cb = r; if (m.loads.length && involves(r) && (!cf || r.F < cf.F)) cf = r; }
      grid.push({ xc, yc, F: cb ? cb.F : null }); if (cb) cand.push(cb); if (cf) candF.push(cf);
    }
    const gx = (xmax - xmin) / (nx - 1), gy = (ymax - ymin) / (ny - 1);
    const refine = (r0, cond) => { if (!r0) return null; let cur = r0; let st = [gx, gy, 0.6];
      for (let lev = 0; lev < 10; lev++) { let imp = true, guard = 0; while (imp && guard++ < 40) { imp = false; for (const [dx, dy, dr] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [1, 1, 0], [-1, -1, 0], [1, -1, 0], [-1, 1, 0], [0, 1, 1], [0, -1, -1], [1, 0, 1], [-1, 0, -1]]) { const r = bishop(m, cur.xc + dx * st[0], cur.yc + dy * st[1], cur.R + dr * st[2]); if (r && r.F > 0.05 && r.F < cur.F - 1e-7 && (!cond || cond(r))) { cur = r; imp = true; } } } st = st.map(s => s / 2); }
      return cur; };
    // többszörös indítás: a háló legjobb, egymástól távoli körei
    const multi = (list, K, cond) => { list.sort((a, b) => a.F - b.F); const picks = []; for (const c of list) { if (picks.length >= K) break; if (picks.every(q => Math.abs(q.xc - c.xc) > 1.5 * gx || Math.abs(q.yc - c.yc) > 1.5 * gy)) picks.push(c); } let b = null; for (const c of picks) { const r = refine(c, cond); if (r && (!b || r.F < b.F)) b = r; } return b; };
    const best = multi(cand, fine ? 8 : 5), bestF = m.loads.length ? multi(candF, 3, involves) : null;
    return { best, bestF, grid, nx, ny, xmin, xmax, ymin, ymax, involves: best ? involves(best) : false };
  }
  function slope(p0, opt = {}) {
    const p = merge(DEF.slope, p0), R = mk(), v = R.v; R.input = p;
    if (!(p.H > 0.5) || !(p.n > 0.05)) { R.err.push('A rézsű magassága és hajlása legyen pozitív.'); return R; }
    const und = p.an === 'undrained';
    if (und ? !(p.cu > 0) : !(p.phi >= 0 && p.c >= 0 && (p.phi > 0 || p.c > 0))) { R.err.push('A nyírószilárdsági paraméterek nem lehetnek negatívak (és legalább az egyik legyen pozitív).'); return R; }
    if (!(p.gam > 0)) { R.err.push('A térfogatsúly legyen pozitív.'); return R; }
    const m = slopeModel(p);
    const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    const sr = slopeSearch(m, { fine: p.fine });
    if (!sr.best) { R.err.push('Nem található érvényes csúszólap – ellenőrizd a geometriát (pl. túl nagy alapozási mélység vagy túl sekély merev réteg).'); return R; }
    const crit = bishop(m, sr.best.xc, sr.best.yc, sr.best.R, true);
    const critF = sr.bestF ? bishop(m, sr.bestF.xc, sr.bestF.yc, sr.bestF.R, true) : null;
    let F0 = null; if (m.loads.length && opt.noLoad !== false) { const m0 = slopeModel({ ...p, f1: false, f2: false }); const s0 = slopeSearch(m0, {}); F0 = s0.best ? s0.best.F : null; }
    const ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    const Fd = crit.F, lam = 1 / Fd;
    const phid = und ? 0 : deg(Math.atan(Math.tan(rad(p.phi)) / p.gm)), cd = und ? p.cu / p.gcu : p.c / p.gm;
    Object.assign(v, { m, sr, crit, critF, F0, Fd, lam, phid, cd, ms, und, phid2: und ? 0 : deg(Math.atan(Math.tan(rad(p.phi2)) / p.gm)), cd2: und ? p.cu2 / p.gcu : p.c2 / p.gm });
    // figyelmeztetések
    if (!und && (p.phi < 10 || p.phi > 42)) R.warn.push(`Szokatlan φ′<sub>k</sub> = ${u_(p.phi, 1, '°')}.`);
    if (!und && p.c > 60) R.warn.push(`Nagy hatékony kohézió (c′<sub>k</sub> = ${u_(p.c, 0, 'kPa')}) – a rézsű biztonságát erősen túlbecsülheti.`);
    if (und && p.water !== 'none') R.info.push('Drénezetlen (teljes feszültségű) vizsgálatban a pórusvíznyomás nem szerepel külön – a víz hatása a c<sub>u</sub> értékében van.');
    if (!und && p.water === 'ru' && (p.ru < 0 || p.ru > 0.6)) R.warn.push(`Szokatlan pórusvíznyomás-arány: r<sub>u</sub> = ${F(p.ru, 2)}.`);
    if (p.n < 1) R.warn.push('1 : 1-nél meredekebb rézsű – ellenőrizd, hogy körhengeres csúszólap reális-e.');
    if (!sr.involves && m.loads.length) R.info.push(`A mértékadó csúszólap nem érinti az alapokat – a rézsű önmagában is ezen a felületen a leggyengébb. Az alapokat is magába foglaló legkedvezőtlenebb csúszólapon F<sub>d</sub> = ${critF ? F(critF.F, 2) : '–'}.`);
    if (crit.slices.some(s => s.ma <= 0.2 + 1e-9)) R.warn.push('A mértékadó csúszólap kilépési szakasza nagyon meredek (m<sub>α</sub> &lt; 0,2) – az egyszerűsített Bishop-módszer itt pontatlan lehet.');
    if (Math.abs(crit.yc - crit.R - m.yBot) < 0.05) R.info.push('A mértékadó csúszólap érinti a merev réteget (a vizsgált tartomány alját).');
    const gx = (sr.xmax - sr.xmin) / (sr.nx - 1), gy = (sr.ymax - sr.ymin) / (sr.ny - 1);
    if (crit.xc <= sr.xmin + gx * 0.5 || crit.xc >= sr.xmax - gx * 0.5 || crit.yc >= sr.ymax - gy * 0.5) R.warn.push('A mértékadó kör középpontja a keresési háló szélén van – a valódi minimum a hálón kívül lehet.');
    for (const Ld of m.loads) if (Ld.a < 0) R.warn.push('Az alap a rézsűél elé nyúlik (a &lt; 0) – ezt a modell nem kezeli helyesen.');
    R.info.push('Szemléltető számítás: tervezéshez igazolt rézsűállékonysági programot használj, és vizsgálj drénezett és drénezetlen állapotot is.');
    R.checks.push({ key: 'gen', title: 'Általános állékonyság', sub: und ? 'drénezetlen, c<sub>u</sub>' : 'drénezett, c′ – φ′', tag: 'GEO · ' + DA3, E: 1, R: Fd, lam, Es: 'E<sub>d</sub>', Rs: 'R<sub>d</sub>', unit: '', fd: true });
    if (critF && sr.bestF && !sr.involves) R.checks.push({ key: 'genf', title: 'Az alapokat is érintő csúszólap', sub: 'legkedvezőtlenebb, az alapok alatt', tag: 'GEO · ' + DA3, E: 1, R: critF.F, lam: 1 / critF.F, Es: 'E<sub>d</sub>', Rs: 'R<sub>d</sub>', unit: '', fd: true });
    // lépések
    const S = R.steps;
    S.push({ t: `Tervezési szilárdsági paraméterek (${DA3}, M2)`, b: und ? fl(sb('c', 'u;d'), `c<sub>u;k</sub> / γ<sub>cu</sub>`, `${F(p.cu, 1)} / ${F(p.gcu, 2)}`, u_(cd, 2, 'kPa')) + (p.lay2 ? fl(sb('c', 'u;d;2'), `${F(p.cu2, 1)} / ${F(p.gcu, 2)}`, u_(v.cd2, 2, 'kPa')) : '') : fl(`tg${NB}φ′<sub>d</sub>`, `tg${NB}φ′<sub>k</sub> / γ<sub>φ′</sub>`, `tg${NB}${F(p.phi, 1)}° / ${F(p.gm, 2)}`, `${F(Math.tan(rad(p.phi)) / p.gm, 4)} → φ′<sub>d</sub> = ${u_(phid, 2, '°')}`) + fl(sb('c′', 'd'), `c′<sub>k</sub> / γ<sub>c′</sub>`, `${F(p.c, 1)} / ${F(p.gm, 2)}`, u_(cd, 2, 'kPa')) + (p.lay2 ? fl('2. réteg: φ′<sub>d</sub>', u_(v.phid2, 2, '°')) + fl(sb('c′', 'd'), u_(v.cd2, 2, 'kPa')) : '') });
    if (m.loads.length) S.push({ t: 'Az alapok terhe (γ<sub>G</sub> = 1,0; γ<sub>Q</sub> = 1,3)', b: m.loads.map((l, i) => fl(`${i + 1}. sávalap: q<sub>d</sub>`, `(1,0 · G<sub>k</sub> + 1,3 · Q<sub>k</sub>) / B`, `(${F(l.G, 1)} + 1,3 · ${F(l.Q, 1)}) / ${F(l.B, 2)}`, u_(l.q, 1, 'kPa')) + `<p class="cx-c">${nw(`${F(l.Pd, 1)}${NB}kN/m`)} a rézsűéltől ${nw(u_(l.a, 2, 'm'))}–${nw(u_(l.a + l.B, 2, 'm'))} között, ${nw(u_(l.Df, 2, 'm'))} mélyen.</p>`).join('') });
    S.push({ t: 'Csúszólap-keresés', b: `<p class="cx-c">${sr.nx} × ${sr.ny} középpontú háló, középpontonként a rézsűlábon átmenő és ${sr.nx ? (p.fine ? 22 : 14) : 0} különböző mélységet érintő kör, majd mintakereséses finomítás. ${nw(sb('n', 'lamella') + ' = ' + m.ns)}. Számítási idő: ${nw(F(ms, 0) + NB + 'ms')}.</p>` + `<div class="cx-fl nw">mértékadó kör: O(${F(crit.xc, 2)}; ${F(crit.yc, 2)})${NB}m, r = ${u_(crit.R, 2, 'm')}</div><div class="cx-fl nw">belépés: ${u_(-crit.x0, 2, 'm')} a rézsűél mögött</div><div class="cx-fl nw">kilépés: ${Math.abs(crit.x1 - m.LX) < 0.05 ? 'a rézsűlábnál' : crit.x1 > m.LX ? u_(crit.x1 - m.LX, 2, 'm') + ' a rézsűláb előtt' : 'a rézsűn, ' + u_(m.H + m.ground(crit.x1), 2, 'm') + '-rel a láb felett'}</div><p class="cx-c">A koordináták origója a rézsűél; x a rézsűláb felé, y felfelé pozitív.</p>` });
    S.push({ t: 'Egyszerűsített Bishop-módszer', b: fl(sb('F', 'd'), `Σ [c<sub>d</sub>·b + (W + P − u·b)·tg${NB}φ<sub>d</sub>] / m<sub>α</sub> / Σ (W + P)·sin${NB}α`) + fl(sb('m', 'α'), `cos${NB}α + sin${NB}α · tg${NB}φ<sub>d</sub> / F<sub>d</sub>`) + sliceTable(crit, m) + fl(sb('F', 'd'), `${F(crit.num, 1)} / ${F(crit.den, 1)}`, `<b>${F(Fd, 3)}</b>`) });
    S.push({ t: 'Igazolás', b: fl('Λ', `1 / F<sub>d</sub>`, `1 / ${F(Fd, 3)}`, `<b>${F(lam, 3)}</b>`) + `<p class="cx-c">${Fd >= 1 - 1e-9 ? nw('F<sub>d</sub> ≥ 1,0') + ' → az általános állékonyság megfelel.' : nw('F<sub>d</sub> < 1,0') + ' → nem felel meg.'}${F0 ? ' Az alapok terhe nélkül: ' + nw('F<sub>d</sub> = ' + F(F0, 3)) + '.' : ''}</p>` });
    return R;
  }
  function sliceTable(c, m) {
    const rows = c.slices.map((s, i) => `<tr><td>${i + 1}</td><td>${F(s.xm, 2)}</td><td>${F(s.h, 2)}</td><td>${F(s.W, 1)}</td><td>${s.P ? F(s.P, 1) : '–'}</td><td>${F(deg(s.al), 1)}</td><td>${s.u ? F(s.u, 1) : '–'}</td><td>${F(s.ma, 3)}</td><td>${F(s.num, 1)}</td><td>${F((s.W + s.P) * Math.sin(s.al), 1)}</td></tr>`).join('');
    return `<div class="tblw cx-tw cx-scroll"><table class="tbl cx-tbl cx-num"><thead><tr><th>#</th><th>x [m]</th><th>h [m]</th><th>W [kN/m]</th><th>P [kN/m]</th><th>α [°]</th><th>u [kPa]</th><th>m<sub>α</sub></th><th>ellenálló tag</th><th>(W+P)·sin${NB}α</th></tr></thead><tbody>${rows}<tr class="cx-tsum"><td colspan="8">Összesen (b = ${u_(c.slices[0] ? c.slices[0].b : 0, 3, 'm')})</td><td>${F(c.num, 1)}</td><td>${F(c.den, 1)}</td></tr></tbody></table></div>`;
  }

  const SOLVE = { sliding, overturn, uplift, slope };
  G_.CALC = Object.assign(G_.CALC || {}, { solve: SOLVE, DEF, F, fmt: F, contact, slopeModel, bishop, circleGeom, slopeSearch, util: { sb, nw, fl, u_, NB, NN, NBH, DA2, DA3, EN, tg, rad, deg } });
  if (!isDOM) return;
  // ============================== SZÖVEGŐR – képlet, szám, mértékegység nem törhet ==============================
  const UNITS = 'kN/m³|kN/m²|kN/m|kNm|kPa|MPa|MN|mBf|m²/m|m²|m³|mm|cm|km|kN|ms|m|°|%|db';
  function guard(root) {
    if (!root) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement && !n.parentElement.closest('script,style,textarea,input,select,option,code,pre,svg') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const ops = /[ \t\n]([=≤≥<>≈·×±→+−:\/])[ \t\n]/g, unit = new RegExp('(\\d)[ \\t\\n](' + UNITS + ')(?![\\wáéíóöőúüű])', 'g');
    const fn = /\b(tg|ctg|sin|cos|tan|ln|log|kb\.|pl\.|ill\.|ún\.|max\.|min\.)[ \t\n]/g, art = /(^|[ \t\n ])(a|az|A|Az|s|e|egy|Egy|és)[ \t\n]/g, thou = /(\d)[ \t\n](\d{3})(?!\d)/g;
    let n; while ((n = w.nextNode())) { const t0 = n.nodeValue; if (!/[ \t\n]/.test(t0)) continue;
      let t = t0.replace(ops, NB + '$1' + NB).replace(unit, '$1' + NB + '$2').replace(fn, '$1' + NB).replace(art, '$1$2' + NB).replace(thou, '$1' + NN + '$2');
      t = t.replace(/^[ \t\n]([=≤≥<>≈·×±→+−])/, NB + '$1').replace(/([=≤≥<>≈·×±→+−])[ \t\n]$/, '$1' + NB);
      if (t !== t0) n.nodeValue = t; }
  }

  // ============================== SVG-RAJZOLÓ ==============================
  let SVGID = 0;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function rich(s, fs) { const parts = String(s).split(/(_\{[^}]*\})/); let out = '', sub = false; const dy = Math.round(fs * 0.32 * 10) / 10;
    for (const q of parts) { if (!q) continue; if (q.startsWith('_{')) { out += `<tspan class="cv-sb" dy="${sub ? 0 : dy}">${esc(q.slice(2, -1))}</tspan>`; sub = true; } else { out += sub ? `<tspan dy="${-dy}">${esc(q)}</tspan>` : esc(q); sub = false; } }
    if (sub) out += `<tspan dy="${-dy}">​</tspan>`; return out; }
  const tw = (s, fs) => { let w = 0; String(s).split(/(_\{[^}]*\})/).forEach(q => { if (!q) return; if (q.startsWith('_{')) w += (q.length - 3) * fs * 0.42; else w += q.length * fs * 0.55; }); return w; };
  const r1 = (v) => Math.round(v * 10) / 10, PTS = (pts) => pts.map(p => r1(p[0]) + ',' + r1(p[1])).join(' ');
  function Sv(W, H) {
    const id = 'cv' + (++SVGID), o = [], k = W < 480 ? 0.86 : W < 640 ? 0.93 : 1;
    const S = { W, H, id, o, k, add: (s) => o.push(s),
      line: (x1, y1, x2, y2, c, ex = '') => o.push(`<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" class="${c}" ${ex}/>`),
      poly: (pts, c, ex = '') => o.push(`<polygon points="${PTS(pts)}" class="${c}" ${ex}/>`),
      pl: (pts, c, ex = '') => o.push(`<polyline points="${PTS(pts)}" class="${c}" ${ex}/>`),
      path: (d, c, ex = '') => o.push(`<path d="${d}" class="${c}" ${ex}/>`),
      rect: (x, y, w, h, c, ex = '') => o.push(`<rect x="${r1(Math.min(x, x + w))}" y="${r1(Math.min(y, y + h))}" width="${r1(Math.abs(w))}" height="${r1(Math.abs(h))}" class="${c}" ${ex}/>`),
      circ: (x, y, rr, c, ex = '') => o.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(rr)}" class="${c}" ${ex}/>`),
      text: (x, y, s, c = '', a = 'start', fs = 13, ex = '') => { fs = Math.round(fs * k * 10) / 10; const w = tw(s, fs); let xx = x; if (a === 'start') xx = Math.min(Math.max(x, 4), W - 4 - w); else if (a === 'end') xx = Math.max(Math.min(x, W - 4), 4 + w); else xx = Math.min(Math.max(x, 4 + w / 2), W - 4 - w / 2); o.push(`<text x="${r1(xx)}" y="${r1(y)}" class="cv-t ${c}" text-anchor="${a}" font-size="${fs}" ${ex}>${rich(s, fs)}</text>`); return { x: xx, w }; },
      textR: (x, y, s, c = '', fs = 12) => (fs = Math.round(fs * k * 10) / 10, o.push(`<text x="${r1(x)}" y="${r1(y)}" class="cv-t ${c}" text-anchor="middle" font-size="${fs}" transform="rotate(-90 ${r1(x)} ${r1(y)})">${rich(s, fs)}</text>`)),
      arrow: (x1, y1, x2, y2, c, w = 2.6, hd = 11) => { const L = Math.hypot(x2 - x1, y2 - y1); if (L < 3) return; const ux = (x2 - x1) / L, uy = (y2 - y1) / L, h = Math.min(hd, L * 0.7), bx = x2 - ux * h, by = y2 - uy * h, px = -uy * h * 0.42, py = ux * h * 0.42; o.push(`<g class="cv-ar ${c}"><line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(bx + ux)}" y2="${r1(by + uy)}" stroke-width="${w}"/><polygon points="${PTS([[x2, y2], [bx + px, by + py], [bx - px, by - py]])}"/></g>`); },
      dim: (x1, y1, x2, y2, s, c = '', fs = 12) => { const L = Math.hypot(x2 - x1, y2 - y1); if (L < 4) return; const ux = (x2 - x1) / L, uy = (y2 - y1) / L, t = 4; o.push(`<g class="cv-dim ${c}"><line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}"/><line x1="${r1(x1 - t * (ux - uy))}" y1="${r1(y1 - t * (uy + ux))}" x2="${r1(x1 + t * (ux - uy))}" y2="${r1(y1 + t * (uy + ux))}"/><line x1="${r1(x2 - t * (ux - uy))}" y1="${r1(y2 - t * (uy + ux))}" x2="${r1(x2 + t * (ux - uy))}" y2="${r1(y2 + t * (uy + ux))}"/></g>`); const mx = (x1 + x2) / 2, my = (y1 + y2) / 2; if (Math.abs(ux) > 0.7) S.text(mx, my - 5, s, 'cv-dt ' + c, 'middle', fs); else S.textR(mx - 5, my, s, 'cv-dt ' + c, fs); },
      ext: (x1, y1, x2, y2) => o.push(`<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" class="cv-ext"/>`),
      svg: (cls = '', label = '') => `<svg class="cv ${cls}" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cv-gs0"/><stop offset="1" class="cv-gs1"/></linearGradient><linearGradient id="${id}g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="cv-g2s0"/><stop offset="1" class="cv-g2s1"/></linearGradient><pattern id="${id}d" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="2" cy="3" r=".9" class="cv-dot"/><circle cx="7" cy="8" r=".75" class="cv-dot"/><circle cx="8" cy="1.5" r=".55" class="cv-dot"/></pattern><pattern id="${id}h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="cv-hl"/></pattern><pattern id="${id}c" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r=".8" class="cv-cdot"/><path d="M9 9l2 -1l.6 1.8z" class="cv-cdot"/></pattern></defs>${o.join('')}</svg>`,
    };
    S.soil = (pts, lay2) => { S.poly(pts, 'cv-soil', `fill="url(#${id}${lay2 ? 'g2' : 'g'})"`); S.poly(pts, 'cv-soild', `fill="url(#${id}d)"`); };
    S.conc = (pts) => { S.poly(pts, 'cv-conc'); S.poly(pts, 'cv-concp', `fill="url(#${id}c)"`); };
    S.hatch = (pts) => S.poly(pts, 'cv-hatch', `fill="url(#${id}h)"`);
    S.gh = (x1, x2, y, step = 9, up = false) => { let d = ''; for (let x = x1 + 3; x < x2 - 2; x += step) d += `M${r1(x)} ${r1(y)}l${-5} ${up ? -5 : 5}`; if (d) o.push(`<path d="${d}" class="cv-gh"/>`); };
    S.water = (x, y, lab) => { o.push(`<g class="cv-wsym"><polygon points="${PTS([[x, y - 1], [x - 6, y - 10], [x + 6, y - 10]])}"/><line x1="${r1(x - 6)}" y1="${r1(y + 4)}" x2="${r1(x + 6)}" y2="${r1(y + 4)}"/><line x1="${r1(x - 3.5)}" y1="${r1(y + 8)}" x2="${r1(x + 3.5)}" y2="${r1(y + 8)}"/></g>`); if (lab) S.text(x + 10, y - 4, lab, 'cv-wt', 'start', 12); };
    S.brk = (x1, x2, y) => { const m = (x1 + x2) / 2, k = Math.min(8, (x2 - x1) / 5); o.push(`<polyline points="${PTS([[x1 - 4, y], [m - k, y], [m - k / 2, y - k], [m + k / 2, y + k], [m + k, y], [x2 + 4, y]])}" class="cv-brk"/>`); };
    return S;
  }
  function fit(ext, W, H, m) { const aw = W - m[3] - m[1], ah = H - m[0] - m[2]; const s = Math.min(aw / (ext.x1 - ext.x0), ah / (ext.y1 - ext.y0)); const ox = m[3] + (aw - (ext.x1 - ext.x0) * s) / 2, oy = m[0] + (ah - (ext.y1 - ext.y0) * s) / 2;
    return { s, X: (x) => ox + (x - ext.x0) * s, Y: (y) => oy + (ext.y1 - y) * s, wx: (px) => ext.x0 + (px - ox) / s, wy: (py) => ext.y1 - (py - oy) / s }; }
  // fejléc: hosszú sorok tördelése a „·” elválasztóknál (egy tag soha nem törik)
  function head(S, W, items, x0 = 12) { let y = 20; for (const [t, c, fs] of items) { const f = fs * S.k, parts = String(t).split(/\s{2,}·\s{2,}/); let cur = ''; const out = []; for (const q of parts) { const cand = cur ? cur + '   ·   ' + q : q; if (cur && tw(cand, f) > W - x0 - 10) { out.push(cur); cur = q; } else cur = cand; } if (cur) out.push(cur); out.forEach(l => { S.text(x0, y, l, c, 'start', fs); y += f + 4; }); y += 1; } return y; }
  const msgSvg = (W, H, t) => { const S = Sv(W, H); S.text(W / 2, H / 2, t, 'cv-msg', 'middle', 15); return S.svg('', t); };
  const fcol = (Fv) => { const t = Math.max(0, Math.min(1, (Fv - 0.85) / 0.75)); const h = 4 + 128 * t; return `hsl(${h.toFixed(0)} 68% ${(50 - 6 * t).toFixed(0)}%)`; };

  // ---------------------------------- ELCSÚSZÁS 2D ----------------------------------
  function dSliding(R, W, H, opt = {}) {
    if (R.err.length || !R.v.B) return msgSvg(W, H, 'Javítsd a bemenő adatokat – az ábra így nem rajzolható.');
    const S = Sv(W, H), p = R.input, v = R.v, B = v.B, D = v.D, hf = v.hf, yft = -D + hf;
    const bw = Math.min(0.45, Math.max(0.25, 0.22 * B)), wedge = D > 0 ? D / Math.tan(rad(45 - p.phiP / 2)) : 0;
    const inset = !v.strip && W > 560 && v.ud, mR = inset ? Math.min(W * 0.27, 230) : 0;
    const Yt = Math.max(0.7, 0.34 * B, 0.5 * D, hf - D + 0.5);
    const ext = { x0: -B / 2 - Math.max(1.05 * B, 1.7), x1: B / 2 + Math.max(0.95 * B, v.nu > 0 ? wedge * 1.08 : 0, 1.5), y0: -D - Math.max(0.95, 0.6 * B), y1: Yt + 0.2 };
    const lv = Math.max(34, Math.min(0.13 * H, 62));
    const t1 = v.dr ? `δ_{k} = ${u_(v.delta, 1, '°')} (${p.cast === 'precast' ? 'előregyártott: ⅔·φ′_{cv;k}' : 'helyben betonozott: φ′_{cv;k}'})` : '', t2 = v.ud ? `c_{u;k} = ${u_(p.cu, 0, 'kPa')}` : '';
    const hy = head(S, W - mR, [[[t1, t2].filter(Boolean).join('   ·   '), 'cv-hd', 12.5], [v.strip ? 'sávalap – 1 m-es szakasz' : `pilléralap ${F(B, 2)} × ${F(v.L, 2)}${NB}m`, 'cv-mt', 11.5]]);
    const T = fit(ext, W - mR, H, [hy + 14 + lv, 12, 26, 12]), X = T.X, Y = T.Y;
    const L0 = T.wx(0), L1 = T.wx(W - mR), Yb = T.wy(H);
    // talaj
    const slot = yft < 0 ? [[-bw / 2, 0], [-bw / 2, yft], [-B / 2, yft], [-B / 2, -D], [B / 2, -D], [B / 2, yft], [bw / 2, yft], [bw / 2, 0]] : [[-B / 2, 0], [-B / 2, -D], [B / 2, -D], [B / 2, 0]];
    const soil = [[L0, 0], ...slot, [L1, 0], [L1, Yb], [L0, Yb]].map(q => [X(q[0]), Y(q[1])]);
    S.soil(soil);
    if (p.water && v.zw < -Yb && v.zw > -Yt) { const yw = Math.max(-v.zw, Yb); S.add(`<clipPath id="${S.id}w"><polygon points="${PTS(soil)}"/></clipPath>`); S.rect(X(L0), Y(-v.zw), X(L1) - X(L0), Y(Yb) - Y(-v.zw), 'cv-water', `clip-path="url(#${S.id}w)"`); S.line(X(L0), Y(-v.zw), X(-B / 2 - 0.05), Y(-v.zw), 'cv-wl'); S.line(X(B / 2 + 0.05), Y(-v.zw), X(L1), Y(-v.zw), 'cv-wl'); S.water(X(L0) + 26, Y(-v.zw), 'talajvíz'); }
    // terepvonal + sraffozás
    const xa = yft < 0 ? -bw / 2 : -B / 2, xb = -xa;
    S.line(X(L0), Y(0), X(xa), Y(0), 'cv-gl'); S.line(X(xb), Y(0), X(L1), Y(0), 'cv-gl'); S.gh(X(L0), X(xa), Y(0)); S.gh(X(xb), X(L1), Y(0));
    // földellenállás
    if (v.nu > 0 && v.hp > 0) {
      const f = v.dr ? v.epD : v.epU, emax = Math.max(1e-6, f(v.z2), f(v.z1)), kx = Math.max(0.7, 0.55 * (ext.x1 - B / 2)) / emax; const pts = [];
      for (let i = 0; i <= 24; i++) { const z = v.z1 + v.hp * i / 24; pts.push([X(B / 2 + f(z) * kx), Y(-z)]); }
      S.poly([[X(B / 2), Y(-v.z1)], ...pts, [X(B / 2), Y(-v.z2)]], 'cv-pass');
      S.line(X(B / 2), Y(-D), X(B / 2 + wedge), Y(0), 'cv-wedge'); S.text(X(B / 2 + wedge * 0.62) + 6, Y(-D * 0.38) , 'passzív ék', 'cv-mt', 'start', 11);
      const zp = v.dr ? v.zpD : v.zpU, Rp = v.dr ? v.RpD : v.RpU, xs = X(B / 2 + f(zp) * kx) + 34;
      S.arrow(xs, Y(-zp), X(B / 2) + 2, Y(-zp), 'cv-res', 2.6);
      S.text(xs + 4, Y(-zp) + 4, `R_{p;d} = ${u_(Rp, 1, v.un)}`, 'cv-rt', 'start', 12);
    }
    // alaptest
    const body = yft < Yt ? [[-B / 2, -D], [B / 2, -D], [B / 2, yft], [bw / 2, yft], [bw / 2, Yt], [-bw / 2, Yt], [-bw / 2, yft], [-B / 2, yft]] : [[-B / 2, -D], [B / 2, -D], [B / 2, yft], [-B / 2, yft]];
    S.conc(body.map(q => [X(q[0]), Y(q[1])])); if (yft < Yt) S.brk(X(-bw / 2), X(bw / 2), Y(Yt) + 1);
    // erők – közös lépték
    const hmax = Math.max(v.Hd, v.dr ? v.RdD : 0, v.ud ? v.RdU : 0, 1e-6), kH = Math.min(0.3 * (W - mR), 190) / hmax, len = (F0) => Math.max(F0 > 0 ? 22 : 0, F0 * kH);
    // H_d
    const yH = v.char ? Math.min(-D + Math.max(0, p.hH), Yt - 0.08) : -D + hf * 0.5, xH = yH > yft ? -bw / 2 : -B / 2;
    if (v.Hd > 0) { const l = len(v.Hd); S.arrow(X(xH) - l - 2, Y(yH), X(xH) - 2, Y(yH), 'cv-act', 3); S.text(X(xH) - l - 2, Y(yH) - 9, `H_{d} = ${u_(v.Hd, 1, v.un)}`, 'cv-at', 'start', 13); }
    // V
    S.arrow(X(0), Y(Yt) - lv - 6, X(0), Y(Yt) - 4, 'cv-perm', 3);
    S.text(X(0) + 9, Y(Yt) - lv + 4, v.dr ? `V′_{k} = ${u_(v.Vke, 1, v.un)}` : `V_{d} = ${u_(v.Vd, 1, v.un)}`, 'cv-pt', 'start', 13);
    if (v.dr && v.ud && v.char) S.text(X(0) + 9, Y(Yt) - lv + 20, `V_{d} = ${u_(v.Vd, 1, v.un)} (korláthoz)`, 'cv-pt cv-small', 'start', 11);
    // R_d a talp alatt (H-val szemben)
    let yR = Y(-D) + 15; const lab = [];
    if (v.dr) lab.push([v.RdD, `R_{d} = ${u_(v.RdD, 1, v.un)}`, v.ud ? ' drénezett' : '']);
    if (v.ud) lab.push([v.RdU, `R_{d} = ${u_(v.RdU, 1, v.un)}`, v.dr ? ' drénezetlen' : '']);
    lab.forEach(([F0, t, s2]) => { const l = len(F0), x0 = X(0) + l / 2; S.arrow(x0, yR, x0 - l, yR, 'cv-res', 3); S.text(x0 + 6, yR + 4, t + s2, 'cv-rt', 'start', 12); yR += 19; });
    // B′ (drénezetlen)
    if (v.ud && v.Bp < B - 1e-6) { const xr = B / 2, xl = B / 2 - v.Bp; S.line(X(xl) + 2, Y(-D) - 5, X(xr) - 2, Y(-D) - 5, 'cv-bp'); if ((Y(-D) - Y(yft)) > 26) S.text((X(xl) + X(xr)) / 2, Y(-D) - 12, `B′ = ${u_(v.Bp, 2, 'm')}`, 'cv-bt', 'middle', 11); }
    // méretvonalak
    const showD = (k) => !opt.dims || opt.dims.includes(k);
    const yd = Math.min(H - 10, yR + 8); if (showD('B')) { S.ext(X(-B / 2), Y(-D) + 3, X(-B / 2), yd + 4); S.ext(X(B / 2), Y(-D) + 3, X(B / 2), yd + 4); S.dim(X(-B / 2), yd, X(B / 2), yd, `B = ${u_(B, 2, 'm')}`); }
    if (D > 0 && showD('D')) { const xdd = Math.max(X(L0) + 16, X(-B / 2) - 18); S.ext(X(-B / 2) - 2, Y(-D), xdd - 4, Y(-D)); S.dim(xdd, Y(0), xdd, Y(-D), `D = ${u_(D, 2, 'm')}`); }
    if (v.char && p.hH > 0 && v.Hd > 0 && showD('h')) { const xs0 = X(xH) - len(v.Hd) - 2, xh = Math.min(xs0, X(-B / 2)) - 40; if (xh > 24) { S.ext(xh - 4, Y(yH), xs0, Y(yH)); S.ext(xh - 4, Y(-D), X(-B / 2) - 2, Y(-D)); S.dim(xh, Y(-D), xh, Y(yH), `h_{H} = ${u_(p.hH, 2, 'm')}`, 'cv-dimh'); } }
    // fejléc
    // alaprajz (pilléralap, drénezetlen: nyomott felület)
    if (inset) { const pw = mR - 30, ph = Math.min(H * 0.5, pw * 1.1), sc = Math.min(pw / v.B, (ph - 40) / v.L), cx = W - mR / 2 - 6, cy = 40 + (ph - 30) / 2; const w = v.B * sc, h = v.L * sc;
      S.rect(cx - w / 2, cy - h / 2, w, h, 'cv-plan'); S.rect(cx + w / 2 - v.Bp * sc, cy - v.Lp * sc / 2, v.Bp * sc, v.Lp * sc, 'cv-ac');
      S.text(cx, cy - h / 2 - 10, 'alaprajz', 'cv-mt', 'middle', 11.5); S.text(cx, cy + h / 2 + 18, `A_{c} = ${u_(v.Ac, 2, 'm²')}`, 'cv-bt', 'middle', 12); S.arrow(cx - w / 2 - 4, cy, cx - w / 2 + Math.min(30, w * 0.4), cy, 'cv-act', 2, 8); }
    return S.svg('cv-sl', 'Elcsúszás: az alaptest metszete az erőkkel');
  }

  // ---------------------------------- FELBORULÁS 2D ----------------------------------
  function dOverturn(R, W, H, opt = {}) {
    if (R.err.length || !R.v.B) return msgSvg(W, H, 'Javítsd a bemenő adatokat – az ábra így nem rajzolható.');
    const S = Sv(W, H), p = R.input, v = R.v, B = v.B, Df = p.Df, hf = p.hf, circ = v.circ;
    const side = W / H > 1.12, pw = side ? Math.min(W * 0.36, 300) : W, ph = side ? H : Math.min(H * 0.38, 230);
    const sw = side ? W - pw : W, sh = side ? H : H - ph;
    const hs = [p.hQ, p.hG, v.two ? p.hQL : 0, v.two ? p.hGL : 0].filter(x => isFinite(x)); const hmax = Math.max(hf + 0.5, ...hs.map(x => x + 0.35));
    const xg = p.eGB || 0, bp = Math.min(0.55, Math.max(0.3, 0.18 * B));
    // függőleges tömörítés magas oszlopnál
    const wx = B * 2.3 + 2, lim = Math.max(1.4 * B, 0.62 * wx * (sh / sw));
    const yb0 = -Df; const cut = hmax > lim ? yb0 + lim * 0.75 : Infinity; const kc = hmax > lim ? (lim * 0.25) / (hmax - (lim * 0.75)) : 1;
    const ym = (y) => y <= cut ? y : cut + (y - cut) * kc;
    const sMax = v.ct.smax, pd = (isFinite(sMax) && sMax > 0) ? Math.min(0.55 * B, 1.3) : 0;
    const ext = { x0: -B / 2 - Math.max(0.7 * B, 1.0), x1: B / 2 + Math.max(0.7 * B, 1.0), y0: yb0 - pd - 0.7, y1: ym(yb0 + hmax) + 0.25 };
    const lvO = Math.max(34, Math.min(0.12 * sh, 56)), g0 = v.gov;
    const hy = head(S, sw, [[`M_{dst;d} = ${u_(g0.Mdst, 1, 'kNm')}   ·   M_{stb;d} = ${u_(g0.Mstb, 1, 'kNm')}`, 'cv-hd', 12.5], [`EQU: γ_{G;dst} = 1,1   ·   γ_{G;stb} = 0,9   ·   γ_{Q;dst} = 1,5`, 'cv-mt', 11]]);
    const T = fit(ext, sw, sh, [hy + 16 + lvO, 12, 12, 12]), X = T.X, Y = (y) => T.Y(ym(y));
    const L0 = T.wx(0), L1 = T.wx(sw), Yb = T.wy(sh);
    const yft = yb0 + hf; const slot = yft < 0 ? [[xg - bp / 2, 0], [xg - bp / 2, yft], [-B / 2, yft], [-B / 2, yb0], [B / 2, yb0], [B / 2, yft], [xg + bp / 2, yft], [xg + bp / 2, 0]] : [[-B / 2, 0], [-B / 2, yb0], [B / 2, yb0], [B / 2, 0]];
    const soil = [[L0, 0], ...slot, [L1, 0], [L1, Yb], [L0, Yb]].map(q => [X(q[0]), T.Y(q[1])]);
    if (p.ground === 'rock') { S.poly(soil, 'cv-rock'); S.hatch(soil); } else S.soil(soil);
    const xa = yft < 0 ? xg - bp / 2 : -B / 2, xb2 = yft < 0 ? xg + bp / 2 : B / 2;
    S.line(X(L0), Y(0), X(xa), Y(0), 'cv-gl'); S.line(X(xb2), Y(0), X(L1), Y(0), 'cv-gl'); S.gh(X(L0), X(xa), Y(0)); S.gh(X(xb2), X(L1), Y(0));
    // talpfeszültség (karakterisztikus, a B irányú középvonalon)
    const ct = v.ct; const yB = Y(yb0);
    if (ct.ok && !ct.lost && isFinite(sMax) && sMax > 0) { const ks = (pd * T.s) / sMax, n = 60, pts = []; const sg = (x) => Math.max(0, ct.a + ct.b * x);
      for (let i = 0; i <= n; i++) { const x = -B / 2 + B * i / n; pts.push([X(x), yB + sg(x) * ks]); }
      S.poly([[X(-B / 2), yB], ...pts, [X(B / 2), yB]], 'cv-pres'); S.pl(pts, 'cv-presl');
      const sR = sg(B / 2), sL = sg(-B / 2), right = sR >= sL; S.text(X(right ? B / 2 : -B / 2) + (right ? 6 : -6), yB + Math.max(sR, sL) * ks - 2, `σ_{max} = ${u_(Math.max(sR, sL), 1, 'kPa')}`, 'cv-prt', right ? 'start' : 'end', 12);
      if (ct.full) S.text(X(right ? -B / 2 : B / 2) + (right ? -6 : 6), yB + Math.min(sR, sL) * ks + 12, `σ_{min} = ${u_(Math.min(sR, sL), 1, 'kPa')}`, 'cv-prt', right ? 'end' : 'start', 11);
      else { const x0 = Math.abs(ct.b) > 1e-12 ? -ct.a / ct.b : 0; const xe = right ? -B / 2 : B / 2; S.line(X(xe), yB + 3, X(x0), yB + 3, 'cv-lift'); S.text((X(xe) + X(x0)) / 2, yB + 17, 'elemelkedik', 'cv-lt', 'middle', 11); }
    }
    // alaptest + oszlop
    const ytop = yb0 + hmax;
    S.conc([[-B / 2, yb0], [B / 2, yb0], [B / 2, yft], [-B / 2, yft]].map(q => [X(q[0]), Y(q[1])]));
    S.conc([[xg - bp / 2, yft], [xg + bp / 2, yft], [xg + bp / 2, ytop], [xg - bp / 2, ytop]].map(q => [X(q[0]), Y(q[1])]));
    if (isFinite(cut) && cut < ytop) { const yc = Y(cut + 0.0001); S.brk(X(xg - bp / 2), X(xg + bp / 2), yc); }
    // forgáspont
    const g = v.gov, sgn = circ ? Math.sign(g.nx) || 1 : (g.nx ? Math.sign(g.nx) : 1), xp = (circ ? g.dp * (g.nx || 1) : (g.nx ? g.nx * g.dp : g.dp));
    const xP = circ ? g.dp * Math.sign(g.nx || 1) : xp;
    S.circ(X(xP), yB, 5.5, 'cv-piv'); S.text(X(xP) + (sgn > 0 ? -8 : 8), yB - 9, 'forgáspont', 'cv-pvt', sgn > 0 ? 'end' : 'start', 11);
    if (v.fp > 0) { const xe = sgn * B / 2; S.dim(X(xe), yB - 22, X(xP), yB - 22, circ ? 'D/10' : 'B/10', 'cv-dimp', 10.5); }
    // erők
    const fArrow = (H0, h, lab) => { if (!H0 || !isFinite(h)) return; const y = Y(yb0 + h), dir = Math.sign(H0), l = Math.min(0.22 * sw, 34 + Math.abs(H0) / Math.max(1, v.Vk) * 0.9 * sw); const x2 = X(xg - dir * bp / 2) - dir * 2; S.arrow(x2 - dir * l, y, x2, y, 'cv-act', 3); S.text(x2 - dir * (l + 6), y + 4, lab, 'cv-at', dir > 0 ? 'end' : 'start', 12.5); };
    fArrow(p.HQk, p.hQ, `H_{Q;k} = ${u_(p.HQk, 1, 'kN')}`); fArrow(p.HGk, p.hG, `H_{G;k} = ${u_(p.HGk, 1, 'kN')}`);
    const lv = lvO, yv = Y(ytop) - 6; S.arrow(X(xg), yv - lv, X(xg), yv, 'cv-perm', 3); S.text(X(xg) + 9, yv - lv + 8, `G_{k} = ${u_(p.Gk, 1, 'kN')}`, 'cv-pt', 'start', 12.5);
    if (v.W > 0) { S.arrow(X(0) - 0, Y(yb0 + hf / 2) - 22, X(0), Y(yb0 + hf / 2) + 6, 'cv-perm2', 2.2, 8); S.text(X(B / 2) + 6, Y(yft) - 6, `W = ${u_(v.W, 1, 'kN')}`, 'cv-pt cv-small', 'start', 11); }
    // magasság méretvonal
    const hq = p.HQk ? p.hQ : p.HGk ? p.hG : null; if (hq !== null) { const xd = X(-B / 2) - 26; S.ext(xd - 4, Y(yb0 + hq), X(xg - bp / 2) - 4, Y(yb0 + hq)); S.ext(xd - 4, yB, X(-B / 2) - 3, yB); S.dim(xd, yB, xd, Y(yb0 + hq), `h = ${u_(hq, 2, 'm')}`); }
    const yd = Math.min(sh - 8, yB + pd * T.s + 26); S.ext(X(-B / 2), yB + 4, X(-B / 2), yd + 4); S.ext(X(B / 2), yB + 4, X(B / 2), yd + 4); S.dim(X(-B / 2), yd, X(B / 2), yd, `${circ ? 'D' : 'B'} = ${u_(B, 2, 'm')}`);
    // ---- alaprajz ----
    const ox = side ? sw : 0, oy = side ? 0 : sh; const cx = ox + pw / 2, cy = oy + ph / 2 + (side ? 6 : 4);
    S.rect(ox + 6, oy + 6, pw - 12, ph - 12, 'cv-pbox');
    const Lp = circ ? B : v.L, sc = Math.min((pw - 56) / B, (ph - 70) / Lp), w = B * sc, h = Lp * sc;
    const PX = (x) => cx + x * sc, PY = (y) => cy - y * sc;
    if (circ) S.circ(cx, cy, w / 2, 'cv-plan'); else S.rect(cx - w / 2, cy - h / 2, w, h, 'cv-plan');
    // nyomott tartomány
    if (ct.ok && !ct.full && !ct.lost && isFinite(ct.a)) { const pts = []; const n = 72; if (circ) { for (let i = 0; i < n; i++) { const t = i / n * 2 * Math.PI; const x = v.Rr * Math.cos(t), y = v.Rr * Math.sin(t); pts.push([x, y]); } } else pts.push([-B / 2, -Lp / 2], [B / 2, -Lp / 2], [B / 2, Lp / 2], [-B / 2, Lp / 2]);
      const cl = clipPoly(pts, (q) => ct.a + ct.b * q[0] + ct.c * q[1]); if (cl.length > 2) S.poly(cl.map(q => [PX(q[0]), PY(q[1])]), 'cv-cz'); }
    else if (ct.full) { if (circ) S.circ(cx, cy, w / 2, 'cv-cz'); else S.rect(cx - w / 2, cy - h / 2, w, h, 'cv-cz'); }
    // belső mag és határ
    if (circ) { S.circ(cx, cy, w / 8, 'cv-kern'); S.circ(cx, cy, 0.6 * w / 2, 'cv-limit'); }
    else { S.poly([[PX(B / 6), cy], [cx, PY(Lp / 6)], [PX(-B / 6), cy], [cx, PY(-Lp / 6)]], 'cv-kern'); S.add(`<ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(w / 3)}" ry="${r1(h / 3)}" class="cv-limit"/>`); }
    S.line(cx - w / 2 - 8, cy, cx + w / 2 + 8, cy, 'cv-axis'); S.line(cx, cy - h / 2 - 8, cx, cy + h / 2 + 8, 'cv-axis');
    const zc = v.allowed ? (v.kern ? 'cv-ez0' : 'cv-ez1') : 'cv-ez2', ex = Math.max(-B * 0.62, Math.min(B * 0.62, v.eB)), ey = Math.max(-Lp * 0.62, Math.min(Lp * 0.62, v.eL));
    S.line(cx, cy, PX(ex), PY(ey), 'cv-eline'); S.circ(PX(ex), PY(ey), 6, 'cv-e ' + zc);
    S.text(PX(ex) + 9, PY(ey) - 8, `e = ${u_(v.e, 3, 'm')}`, 'cv-et', 'start', 12);
    S.text(cx, oy + 24, 'alaprajz', 'cv-hd', 'middle', 12);
    const ly = Math.min(oy + ph - 14, cy + h / 2 + 22); S.text(cx, ly, circ ? 'mag: r/4 · határ: 0,6·r' : 'belső mag (B/6) · határ: B/3', 'cv-mt', 'middle', 11);
    return S.svg('cv-ot', 'Felborulás: metszet, talpfeszültség és alaprajz a belső maggal');
  }
  // Sutherland–Hodgman: a poligon f ≥ 0 része
  function clipPoly(pts, f) { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], fa = f(a), fb = f(b); if (fa >= 0) out.push(a); if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; }

  // ---------------------------------- FELÚSZÁS 2D ----------------------------------
  function dUplift(R, W, H, opt = {}) {
    if (R.err.length || !R.v.B) return msgSvg(W, H, 'Javítsd a bemenő adatokat – az ábra így nem rajzolható.');
    const S = Sv(W, H), p = R.input, v = R.v, B = v.B, Bo = v.Bo, o = v.o, D = v.D, Hb = v.H, geom = v.geom;
    const tb = geom ? p.tb : 0.6, tw = geom ? p.tw : 0.4, tr = geom ? p.tr : 0.35, ni = geom ? Math.max(0, Math.round(p.ni)) : 0, ti = p.ti;
    const yb = -D, yt = -D + Hb, yc = yt + p.tc, ywl = -v.zw;
    const up = Math.max(1.2, 0.2 * D), anc = v.n > 0 ? Math.max(2.5, 0.45 * D) : 0;
    const ext = { x0: -Bo / 2 - Math.max(0.35 * B, 2.5), x1: Bo / 2 + Math.max(0.35 * B, 2.5), y0: yb - Math.max(up, anc) - 0.6, y1: Math.max(0.6, yc + 0.4, ywl + 0.6, yt + 0.6) + Math.max(1.2, 0.12 * D) };
    const hy = head(S, W, [[`Λ = ${F(v.lam, 3)}   ·   A_{k} = ${u_(v.Ab, 1, 'm²')}${o > 0 ? `   ·   túlnyújtás ${u_(o, 2, 'm')}` : ''}`, 'cv-hd', 12.5], [`metszet a B = ${u_(B, 2, 'm')} irányban   ·   L = ${u_(v.L, 2, 'm')}`, 'cv-mt', 11]]);
    const T = fit(ext, W, H, [hy + 4, 12, 14, 12]), X = T.X, Y = T.Y, L0 = T.wx(0), L1 = T.wx(W), Yb = T.wy(H);
    // talaj (a műtárgyon kívül + takarás)
    const gy = 0, yr = Math.min(yt, gy);
    const soil = [[L0, gy], [-B / 2, gy], [-B / 2, yb + tb], [-Bo / 2, yb + tb], [-Bo / 2, yb], [Bo / 2, yb], [Bo / 2, yb + tb], [B / 2, yb + tb], [B / 2, gy], [L1, gy], [L1, Yb], [L0, Yb]];
    const soilS = soil.map(q => [X(q[0]), Y(q[1])]); S.soil(soilS);
    if (p.tc > 0) { const c0 = Math.min(yt, yc), c1 = Math.max(yt, yc); S.soil([[-B / 2, c0], [B / 2, c0], [B / 2, c1], [-B / 2, c1]].map(q => [X(q[0]), Y(q[1])])); }
    // víz
    if (v.zw < D + 0.001) { S.add(`<clipPath id="${S.id}w"><polygon points="${PTS(soilS)}"/></clipPath>`); S.rect(X(L0), Y(ywl), X(L1) - X(L0), Y(Yb) - Y(ywl), 'cv-water', `clip-path="url(#${S.id}w)"`);
      if (ywl > gy) { S.rect(X(L0), Y(ywl), X(-B / 2) - X(L0), Y(gy) - Y(ywl), 'cv-water'); S.rect(X(B / 2), Y(ywl), X(L1) - X(B / 2), Y(gy) - Y(ywl), 'cv-water'); if (ywl > yc) S.rect(X(-B / 2), Y(ywl), X(B / 2) - X(-B / 2), Y(Math.max(yc, yt)) - Y(ywl), 'cv-water'); }
      S.line(X(L0), Y(ywl), X(-Bo / 2) - 1, Y(ywl), 'cv-wl'); S.line(X(Bo / 2) + 1, Y(ywl), X(L1), Y(ywl), 'cv-wl'); S.water(X(L0) + 24, Y(ywl), 'tervezési talajvízszint'); }
    S.line(X(L0), Y(gy), X(-B / 2), Y(gy), 'cv-gl'); S.line(X(B / 2), Y(gy), X(L1), Y(gy), 'cv-gl'); S.gh(X(L0), X(-B / 2), Y(gy)); S.gh(X(B / 2), X(L1), Y(gy));
    if (p.tc > 0 && yc > 0) { S.line(X(-B / 2), Y(yc), X(B / 2), Y(yc), 'cv-gl'); }
    // műtárgy: belső tér
    S.rect(X(-B / 2 + tw), Y(yt - tr), X(B / 2 - tw) - X(-B / 2 + tw), Y(yb + tb) - Y(yt - tr), 'cv-inner');
    if (p.hb > 0) S.rect(X(-B / 2 + tw), Y(yb + tb + Math.min(p.hb, Hb - tb - tr)), X(B / 2 - tw) - X(-B / 2 + tw), Y(yb + tb) - Y(yb + tb + Math.min(p.hb, Hb - tb - tr)), 'cv-ball');
    const shell = [[-Bo / 2, yb], [Bo / 2, yb], [Bo / 2, yb + tb], [B / 2, yb + tb], [B / 2, yt], [-B / 2, yt], [-B / 2, yb + tb], [-Bo / 2, yb + tb]];
    const hole = [[-B / 2 + tw, yb + tb], [-B / 2 + tw, yt - tr], [B / 2 - tw, yt - tr], [B / 2 - tw, yb + tb]];
    S.path('M' + shell.map(q => r1(X(q[0])) + ' ' + r1(Y(q[1]))).join('L') + 'Z M' + hole.map(q => r1(X(q[0])) + ' ' + r1(Y(q[1]))).join('L') + 'Z', 'cv-conc', 'fill-rule="evenodd"');
    S.path('M' + shell.map(q => r1(X(q[0])) + ' ' + r1(Y(q[1]))).join('L') + 'Z M' + hole.map(q => r1(X(q[0])) + ' ' + r1(Y(q[1]))).join('L') + 'Z', 'cv-concp', `fill-rule="evenodd" fill="url(#${S.id}c)"`);
    for (let i = 1; i <= ni; i++) { const y = yb + tb + (Hb - tb - tr) * i / (ni + 1); S.conc([[-B / 2 + tw, y - ti / 2], [B / 2 - tw, y - ti / 2], [B / 2 - tw, y + ti / 2], [-B / 2 + tw, y + ti / 2]].map(q => [X(q[0]), Y(q[1])])); }
    if (!geom) S.text(X(0), Y((yb + yt) / 2), `G_{sz;k} = ${u_(v.Gs, 0, 'kN')}`, 'cv-pt', 'middle', 13);
    // felhajtóerő
    if (v.hw > 0) { const pu = GW * v.hw, hp = Math.min(up * 0.85, 0.4 + pu / 80) * T.s, y0 = Y(yb); S.rect(X(-Bo / 2), y0, X(Bo / 2) - X(-Bo / 2), hp, 'cv-upl');
      const na = Math.max(3, Math.min(9, Math.round((X(Bo / 2) - X(-Bo / 2)) / 46))); for (let i = 0; i < na; i++) { const x = X(-Bo / 2) + (i + 0.5) * (X(Bo / 2) - X(-Bo / 2)) / na; S.arrow(x, y0 + hp, x, y0 + 2, 'cv-wat', 2.2, 8); }
      S.text(X(Bo / 2) + 8, y0 + hp / 2 + 4, `γ_{w}·h_{w} = ${u_(pu, 1, 'kPa')}`, 'cv-wt', 'start', 12); S.text(X(0), y0 + hp + 16, `V_{dst;d} = ${u_(v.Vdst, 0, 'kN')}`, 'cv-wt cv-bold', 'middle', 13); }
    // horgonyok
    if (v.n > 0) { const nv = Math.min(v.n, 9), al = anc * T.s; for (let i = 0; i < nv; i++) { const x = X(-Bo / 2 + 0.5) + (nv === 1 ? (X(Bo / 2 - 0.5) - X(-Bo / 2 + 0.5)) / 2 : i * (X(Bo / 2 - 0.5) - X(-Bo / 2 + 0.5)) / (nv - 1)); S.line(x, Y(yb), x, Y(yb) + al, 'cv-anc'); S.rect(x - 3.5, Y(yb) + al * 0.55, 7, al * 0.45, 'cv-ancb'); }
      S.text(X(-Bo / 2) - 6, Y(yb) + al * 0.8, `${v.n} × P_{d;1} = ${u_(v.Pd, 0, 'kN')}`, 'cv-rt', 'end', 12); }
    // súrlódás
    if (p.fric && v.Td > 0) { const n = 4; for (const sx of [-1, 1]) for (let i = 0; i < n; i++) { const y = Y(gy) + (Y(yb) - Y(gy)) * (i + 0.5) / n, x = X(sx * Bo / 2) + sx * 7; S.arrow(x, y - 12, x, y + 10, 'cv-res', 2, 7); } S.text(X(Bo / 2) + 16, Y(gy) + (Y(yb) - Y(gy)) * 0.22, `T_{d} = ${u_(v.Td, 0, 'kN')}`, 'cv-rt', 'start', 12); }
    // önsúly
    const lg = Math.min(0.15 * H, 56), ytop = Y(Math.max(yt, yc)) - 6; S.arrow(X(0), ytop - lg, X(0), ytop, 'cv-perm', 3.2); S.text(X(0) + 10, ytop - lg + 6, `G_{stb;d} = ${u_(v.Gstb, 0, 'kN')}`, 'cv-pt', 'start', 13);
    // méretek
    const xd = X(-Bo / 2) - Math.min(48, 0.07 * W) - (p.fric ? 16 : 0); S.ext(xd - 4, Y(yb), X(-Bo / 2) - 3, Y(yb)); S.dim(xd, Y(gy), xd, Y(yb), `D = ${u_(D, 2, 'm')}`);
    if (v.hw > 0) { const xw = X(Bo / 2) + Math.min(46, 0.07 * W) + (p.fric ? 18 : 0); S.ext(X(Bo / 2) + 3, Y(yb), xw + 4, Y(yb)); S.dim(xw, Y(ywl), xw, Y(yb), `h_{w} = ${u_(v.hw, 2, 'm')}`, 'cv-dimw'); }
    const yd = Y(yt) - 12; if (yt > gy - 0.01 || p.tc <= 0) { S.dim(X(-B / 2), Math.min(yd, Y(Math.max(yt, yc)) - 12), X(B / 2), Math.min(yd, Y(Math.max(yt, yc)) - 12), `B = ${u_(B, 2, 'm')}`); } else S.dim(X(-B / 2), Y(yc) - 12, X(B / 2), Y(yc) - 12, `B = ${u_(B, 2, 'm')}`);
    return S.svg('cv-up', 'Felúszás: a műtárgy metszete a felhajtóerővel és a stabilizáló hatásokkal');
  }

  // ---------------------------------- ÁLTALÁNOS ÁLLÉKONYSÁG 2D ----------------------------------
  function dSlope(R, W, H, opt = {}) {
    if (R.err.length || !R.v.crit) return msgSvg(W, H, R.err[0] ? 'Javítsd a bemenő adatokat.' : 'Számítás…');
    const S = Sv(W, H), p = R.input, v = R.v, m = v.m, c = v.crit, Hh = m.H, LX = m.LX;
    const xb = Math.min(-1, ...m.loads.map(l => l.x0 - 1.2), c.x0 - 1.0);
    const ext = { x0: Math.min(xb, -0.35 * Hh), x1: Math.max(LX + 0.32 * Hh, c.x1 + 1.2), y0: m.yBot - 0.35, y1: Math.max(c.yc + 0.9, 0.35 * Hh, 3.4) };
    const hy = head(S, W, [[`F_{d} = ${F(v.Fd, 3)}   ·   Λ = 1/F_{d} = ${F(v.lam, 3)}   ·   ${m.und ? `c_{u;d} = ${u_(v.cd, 1, 'kPa')}` : `φ′_{d} = ${u_(v.phid, 1, '°')}   ·   c′_{d} = ${u_(v.cd, 1, 'kPa')}`}`, 'cv-hd', 12.5], ['egyszerűsített Bishop-módszer   ·   a négyzetek színe: a középpontú körök legkisebb F értéke', 'cv-mt', 11]]);
    const T = fit(ext, W, H, [hy + 22, 14, 12, 14]), X = T.X, Y = T.Y, L0 = T.wx(0), L1 = T.wx(W), Yb = Math.max(T.wy(H), m.yBot - 2);
    const gpts = (xa, xb2) => { const q = [[xa, m.ground(xa)]]; if (xa < 0 && xb2 > 0) q.push([0, 0]); if (xa < LX && xb2 > LX) q.push([LX, -Hh]); q.push([xb2, m.ground(xb2)]); return q; };
    const prof = gpts(L0, L1);
    // rétegek
    const yI = p.lay2 ? Math.max(m.y2, m.yBot) : m.yBot; const l1 = [...prof, [L1, Math.min(yI, -Hh)], [L0, Math.min(yI, 0)]];
    const P = (a) => a.map(q => [X(q[0]), Y(q[1])]);
    if (p.lay2 && m.y2 > m.yBot) { const top1 = prof.map(q => [q[0], Math.max(q[1], m.y2)]); S.soil(P([...prof, [L1, m.y2 > -Hh ? m.y2 : -Hh], ...(m.y2 > -Hh ? [] : []), [L0, m.y2]].filter(Boolean)));
      const p2 = prof.map(q => [q[0], Math.min(q[1], m.y2)]); S.soil(P([...p2, [L1, m.yBot], [L0, m.yBot]]), true); S.line(X(L0), Y(m.y2), X(L1), Y(m.y2), 'cv-lay'); S.text(X(L1) - 8, Y(m.y2) + 14, '2. réteg', 'cv-mt', 'end', 11); }
    else S.soil(P([...prof, [L1, m.yBot], [L0, m.yBot]]));
    // merev réteg
    S.hatch(P([[L0, m.yBot], [L1, m.yBot], [L1, Yb], [L0, Yb]])); S.line(X(L0), Y(m.yBot), X(L1), Y(m.yBot), 'cv-hard'); S.text(X(L1) - 8, Y(m.yBot) + 14, 'merev réteg', 'cv-mt', 'end', 11);
    // víz
    if (m.wPh) { const wp = []; for (let i = 0; i <= 60; i++) { const x = L0 + (L1 - L0) * i / 60; wp.push([x, m.yw(x)]); } S.poly(P([...wp, [L1, m.yBot], [L0, m.yBot]]), 'cv-water'); S.pl(P(wp), 'cv-wl'); S.water(X(L0) + 24, Y(m.yw(L0)), 'talajvízszint'); }
    else if (m.wRu && m.ru > 0) { S.poly(P([...prof, [L1, m.yBot], [L0, m.yBot]]), 'cv-water', `style="fill-opacity:${(0.06 + m.ru * 0.5).toFixed(2)}"`); S.text(X(LX * 0.75), Y(-Hh * 0.75) + 30, `r_{u} = ${F(m.ru, 2)}`, 'cv-wt', 'start', 12); }
    // középpont-háló
    const gr = v.sr.grid, cs = Math.max(3, Math.min(7, ((v.sr.xmax - v.sr.xmin) / (v.sr.nx - 1)) * T.s * 0.32));
    for (const q of gr) { if (q.F == null) continue; const x = X(q.xc), y = Y(q.yc); if (x < 2 || x > W - 2 || y < hy + 6 || y > H) continue; S.rect(x - cs / 2, y - cs / 2, cs, cs, 'cv-gc', `style="fill:${fcol(q.F)}"`); }
    // csúszó tömeg + lamellák
    const yA = (x) => c.yc - Math.sqrt(Math.max(0, c.R * c.R - (x - c.xc) ** 2)), arc = []; for (let i = 0; i <= 80; i++) { const x = c.x0 + (c.x1 - c.x0) * i / 80; arc.push([x, yA(x)]); }
    const top = gpts(c.x0, c.x1); S.poly(P([...top, ...arc.slice().reverse()]), c.F < 1 ? 'cv-mass cv-bad' : 'cv-mass');
    if (c.slices) { const b = c.slices[0].b; for (let i = 1; i < c.slices.length; i++) { const x = c.x0 + i * b; S.line(X(x), Y(m.ground(x)), X(x), Y(yA(x)), 'cv-slice'); } }
    // második kör (az alapokat érintő)
    if (v.critF && !v.sr.involves) { const f = v.critF, ya = (x) => f.yc - Math.sqrt(Math.max(0, f.R * f.R - (x - f.xc) ** 2)), q = []; for (let i = 0; i <= 60; i++) { const x = f.x0 + (f.x1 - f.x0) * i / 60; q.push([x, ya(x)]); } S.pl(P(q), 'cv-arc2'); }
    S.pl(P(arc), c.F < 1 ? 'cv-arc cv-bad' : 'cv-arc');
    // terepvonal
    S.pl(P(prof), 'cv-gl'); S.gh(X(L0), X(0), Y(0)); S.gh(X(LX), X(L1), Y(-Hh));
    // középpont, sugár
    const xm = (c.x0 + c.x1) / 2, ymA = yA(xm); S.line(X(c.xc), Y(c.yc), X(xm), Y(ymA), 'cv-rad'); S.circ(X(c.xc), Y(c.yc), 5, c.F < 1 ? 'cv-ctr cv-bad' : 'cv-ctr');
    S.text(X(c.xc) + 10, Y(c.yc) - 8, `F_{d} = ${F(c.F, 3)}`, c.F < 1 ? 'cv-ft cv-badt' : 'cv-ft', 'start', 15);
    S.text(X(c.xc) + 10, Y(c.yc) + 10, `r = ${u_(c.R, 2, 'm')}`, 'cv-mt', 'start', 11.5);
    // alapok, ház, terhek
    const ls = m.loads; ls.forEach((l, i) => { const hf2 = Math.min(Math.max(l.Df, 0.25), 0.5), y0 = -l.Df, y1 = -l.Df + hf2; S.conc(P([[l.x0, y0], [l.x1, y0], [l.x1, y1], [l.x0, y1]])); if (l.Df > hf2) { const wb = Math.min(0.3, l.B * 0.5), xm2 = (l.x0 + l.x1) / 2; S.conc(P([[xm2 - wb / 2, y1], [xm2 + wb / 2, y1], [xm2 + wb / 2, 0], [xm2 - wb / 2, 0]])); } });
    if (ls.length) { const xs0 = Math.min(...ls.map(l => (l.x0 + l.x1) / 2)) - 0.15, xs1 = Math.max(...ls.map(l => (l.x0 + l.x1) / 2)) + 0.15; const hh = Math.min(2.6, Math.max(1.6, 0.25 * Hh)); if (xs1 - xs0 > 0.8) { S.rect(X(xs0), Y(hh), X(xs1) - X(xs0), Y(0) - Y(hh), 'cv-house'); S.poly(P([[xs0 - 0.35, hh], [xs1 + 0.35, hh], [(xs0 + xs1) / 2, hh + Math.min(1.6, (xs1 - xs0) * 0.32)]]), 'cv-roof'); } }
    ls.forEach((l, i) => { const n = Math.max(2, Math.min(4, Math.round((X(l.x1) - X(l.x0)) / 12))); for (let k = 0; k < n; k++) { const x = X(l.x0 + (l.x1 - l.x0) * (k + 0.5) / n); S.arrow(x, Y(0) - 26, x, Y(-l.Df + Math.min(Math.max(l.Df, 0.25), 0.5)) - 1, 'cv-act', 2, 7); } }); const same = ls.length === 2 && Math.abs(ls[0].Pd - ls[1].Pd) < 1e-6; const hhL = Math.min(2.6, Math.max(1.6, 0.25 * Hh)); if (ls.length) { const xl = Math.min(...ls.map(l => l.x0)); S.text(X(xl) - 8, Y(hhL * 0.55), same ? `P_{d} = ${u_(ls[0].Pd, 1, 'kN/m')} alaponként` : ls.map((l, i) => `P_{d;${i + 1}} = ${u_(l.Pd, 1, 'kN/m')}`).join('  ·  '), 'cv-at', 'end', 11.5); }
    // méretek
    const xH = X(LX) + 16; S.ext(X(LX) + 3, Y(-Hh), xH + 4, Y(-Hh)); S.ext(X(0) + 3, Y(0), xH + 4, Y(0)); S.dim(xH, Y(0), xH, Y(-Hh), `H = ${u_(Hh, 2, 'm')}`);
    S.text(X(LX * 0.5) + 10, Y(-Hh * 0.5) - 8, `1 : ${F(m.n, 2)}`, 'cv-mt', 'start', 12);
    if (ls[0]) { const l = ls.reduce((a, b) => (b.a < a.a ? b : a)), hh = Math.min(2.6, Math.max(1.6, 0.25 * Hh)), yy = Y(hh + 1.9) - 6; if (X(0) - X(l.x1) > 6) { S.ext(X(l.x1), Y(-l.Df), X(l.x1), yy - 4); S.ext(X(0), Y(0), X(0), yy - 4); S.dim(X(l.x1), yy, X(0), yy, `a = ${u_(l.a, 2, 'm')}`, '', 11); } }
    // színskála
    const lx = 14, ly = H - 36; if (W > 420) { for (let i = 0; i < 30; i++) S.rect(lx + i * 4, ly, 4.2, 7, 'cv-gc', `style="fill:${fcol(0.85 + 0.75 * i / 29)}"`); S.text(lx, ly + 22, '0,85', 'cv-mt', 'start', 10); S.text(lx + 60, ly + 22, '1,2', 'cv-mt', 'middle', 10); S.text(lx + 120, ly + 22, '≥ 1,6', 'cv-mt', 'end', 10); }
    return S.svg('cv-so', 'Általános állékonyság: rézsű a mértékadó csúszólappal');
  }
  const DRAW = { sliding: dSliding, overturn: dOverturn, uplift: dUplift, slope: dSlope };

  const guardAll = (el) => { if (!el) return; if (G_.U && G_.U.guardAll) G_.U.guardAll(el); else guard(el); };
  // ============================== ŰRLAPOK ==============================
  const n_ = (k, lab, d, u, min, max, st, sl, dec, x = {}) => ({ k, lab, d, u, min, max, st, sl, dec, ...x });
  const s_ = (k, lab, o, x = {}) => ({ s: k, lab, o, ...x }), c_ = (k, lab, x = {}) => ({ c: k, lab, ...x });
  const uL = (s) => (s.shape === 'strip' ? 'kN/m' : 'kN');
  const FORMS = {
    sliding: [
      { g: 'Alaptest', open: true, f: [
        s_('shape', 'Típus', [['strip', 'Sávalap (1 m)'], ['pad', 'Pilléralap B × L']]),
        s_('cast', 'Kivitel', [['cast', 'Helyben betonozott'], ['precast', 'Előregyártott']], { show: s => s.an !== 'undrained' }),
        n_('B', 'B', 'alapszélesség', 'm', 0.4, 8, 0.05, [0.5, 6], 2), n_('L', 'L', 'alaphossz', 'm', 0.4, 12, 0.05, [0.5, 8], 2, { show: s => s.shape === 'pad' }),
        n_('D', 'D', 'az alapsík mélysége', 'm', 0, 6, 0.05, [0, 4], 2), n_('hf', 'h', 'az alaptest magassága', 'm', 0.2, 3, 0.05, [0.2, 2], 2)] },
      { g: 'Terhek', open: true, f: [
        s_('load', 'Megadás', [['char', 'Karakterisztikus terhek'], ['design', 'Tervezési értékek']]),
        n_('Gk', 'G<sub>k</sub>', 'állandó függőleges teher', uL, 0, 20000, 5, [0, 1500], 1, { show: s => s.load === 'char' }),
        n_('Qk', 'Q<sub>k</sub>', 'esetleges függőleges teher', uL, 0, 20000, 5, [0, 600], 1, { show: s => s.load === 'char' }),
        c_('qWith', 'Q<sub>k</sub> biztosan együtt működik a vízszintes erővel', { show: s => s.load === 'char' }),
        n_('HGk', 'H<sub>G;k</sub>', 'állandó vízszintes (pl. földnyomás)', uL, 0, 10000, 1, [0, 400], 1, { show: s => s.load === 'char' }),
        n_('HQk', 'H<sub>Q;k</sub>', 'esetleges vízszintes (pl. szél, fékezés)', uL, 0, 10000, 1, [0, 300], 1, { show: s => s.load === 'char' }),
        n_('hH', 'h<sub>H</sub>', 'a vízszintes erő karja az alapsík felett', 'm', 0, 20, 0.05, [0, 6], 2, { show: s => s.load === 'char' }),
        c_('selfw', 'Az alaptest (25 kN/m³) és a ráterhelő föld súlya', { show: s => s.load === 'char' }),
        n_('Vk', 'V′<sub>k</sub>', 'függőleges erő (karakterisztikus, hatékony)', uL, 0, 50000, 5, [0, 1500], 1, { show: s => s.load === 'design' && s.an !== 'undrained' }),
        n_('Hd', 'H<sub>d</sub>', 'vízszintes erő (tervezési)', uL, 0, 20000, 5, [0, 600], 1, { show: s => s.load === 'design' }),
        n_('Vd', 'V<sub>d</sub>', 'függőleges erő (tervezési, a 0,4·V<sub>d</sub> korláthoz)', uL, 0, 50000, 5, [0, 1500], 1, { show: s => s.load === 'design' && s.an !== 'drained' }),
        n_('eB', 'e<sub>B</sub>', 'külpontosság B irányban (karakterisztikus)', 'm', 0, 5, 0.01, [0, 1.5], 3, { show: s => s.load === 'design' && s.an !== 'drained' }),
        n_('eL', 'e<sub>L</sub>', 'külpontosság L irányban', 'm', 0, 5, 0.01, [0, 1.5], 3, { show: s => s.load === 'design' && s.an !== 'drained' && s.shape === 'pad' })] },
      { g: 'Altalaj', open: true, f: [
        s_('an', 'Vizsgált állapot', [['drained', 'Drénezett'], ['undrained', 'Drénezetlen'], ['both', 'Mindkettő']]),
        n_('phicv', 'φ′<sub>cv;k</sub>', 'kritikus állapotú súrlódási szög', '°', 15, 40, 0.5, [15, 40], 1, { show: s => s.an !== 'undrained' }),
        n_('cu', 'c<sub>u;k</sub>', 'drénezetlen nyírószilárdság az alapsíkon', 'kPa', 10, 250, 1, [10, 200], 0, { show: s => s.an !== 'drained' }),
        n_('gam', 'γ', 'a visszatöltés és a homlokfal előtti talaj térfogatsúlya', 'kN/m³', 14, 23, 0.1, [15, 22], 1),
        c_('water', 'Talajvíz'),
        n_('dw', 'd<sub>w</sub>', 'a talajvízszint mélysége a terepszint alatt', 'm', -1, 10, 0.05, [0, 4], 2, { show: s => s.water }),
        n_('gsat', 'γ<sub>sat</sub>', 'telített térfogatsúly (a víz alatt)', 'kN/m³', 15, 24, 0.1, [16, 23], 1, { show: s => s.water })] },
      { g: 'Földellenállás a homlokfalon', open: false, f: [
        s_('nu', 'Figyelembe vett hányad', [[0, 'Nincs'], [0.5, '½'], [0.6667, '⅔']]),
        s_('pH', 'Működési magasság', [['full', 'Terepszinttől'], ['face', 'Csak a talp homloka']], { show: s => s.nu > 0 }),
        n_('phiP', 'φ′<sub>k</sub>', 'belső súrlódási szög a homlokfal előtt', '°', 15, 45, 0.5, [15, 42], 1, { show: s => s.nu > 0 && s.an !== 'undrained' }),
        n_('cP', 'c′<sub>k</sub>', 'hatékony kohézió a homlokfal előtt', 'kPa', 0, 50, 1, [0, 30], 0, { show: s => s.nu > 0 && s.an !== 'undrained' })] },
    ],
    overturn: [
      { g: 'Alaptest', open: true, f: [
        s_('shape', 'Alaprajz', [['rect', 'Téglalap'], ['circ', 'Kör']]),
        n_('B', 'B', 'szélesség (a vizsgált irányban)', 'm', 0.5, 20, 0.05, [0.8, 8], 2, { show: s => s.shape === 'rect' }), n_('L', 'L', 'hosszúság', 'm', 0.5, 30, 0.05, [0.8, 10], 2, { show: s => s.shape === 'rect' }),
        n_('Dc', 'D<sub>k</sub>', 'átmérő (r = D<sub>k</sub>/2)', 'm', 0.5, 40, 0.05, [1, 25], 2, { show: s => s.shape === 'circ' }),
        n_('Df', 'D', 'alapozási mélység', 'm', 0, 6, 0.05, [0, 4], 2), n_('hf', 'h', 'az alaptest magassága', 'm', 0.2, 4, 0.05, [0.2, 3], 2),
        s_('ground', 'Altalaj', [['soil', 'Talaj (forgáspont B/10)'], ['rock', 'Szilárd kőzet (sarok)']]),
        c_('selfw', 'Önsúly: alaptest (25 kN/m³) + ráterhelő föld'), n_('gam', 'γ', 'a ráterhelő föld térfogatsúlya', 'kN/m³', 14, 23, 0.1, [15, 22], 1, { show: s => s.selfw })] },
      { g: 'Függőleges terhek (karakterisztikus)', open: true, f: [
        n_('Gk', 'G<sub>k</sub>', 'állandó (szerkezet, oszlop)', 'kN', 0, 1e6, 5, [0, 3000], 1), n_('eGB', 'e<sub>G;B</sub>', 'a G külpontossága B irányban', 'm', -10, 10, 0.01, [-1, 1], 3),
        n_('Qk', 'Q<sub>k</sub>', 'esetleges függőleges', 'kN', 0, 1e6, 5, [0, 2000], 1), c_('qWith', 'Q<sub>k</sub> szerepeljen a külpontosság számításában')] },
      { g: 'Vízszintes terhek – B irány', open: true, f: [
        n_('HQk', 'H<sub>Q;k</sub>', 'esetleges (pl. szél)', 'kN', -1e5, 1e5, 0.5, [0, 300], 1), n_('hQ', 'h<sub>Q</sub>', 'karja az alapsík felett', 'm', 0, 200, 0.05, [0, 20], 2),
        n_('HGk', 'H<sub>G;k</sub>', 'állandó (pl. földnyomás)', 'kN', -1e5, 1e5, 0.5, [0, 300], 1), n_('hG', 'h<sub>G</sub>', 'karja az alapsík felett', 'm', 0, 200, 0.05, [0, 10], 2)] },
      { g: 'Kétirányú külpontosság – L irány', open: false, f: [
        c_('two', 'L irányú hatások figyelembevétele'),
        n_('eGL', 'e<sub>G;L</sub>', 'a G külpontossága L irányban', 'm', -10, 10, 0.01, [-1, 1], 3, { show: s => s.two }),
        n_('HQLk', 'H<sub>Q;L;k</sub>', 'esetleges, L irányú', 'kN', -1e5, 1e5, 0.5, [0, 200], 1, { show: s => s.two }), n_('hQL', 'h<sub>Q;L</sub>', 'karja', 'm', 0, 200, 0.05, [0, 20], 2, { show: s => s.two }),
        n_('HGLk', 'H<sub>G;L;k</sub>', 'állandó, L irányú', 'kN', -1e5, 1e5, 0.5, [0, 200], 1, { show: s => s.two }), n_('hGL', 'h<sub>G;L</sub>', 'karja', 'm', 0, 200, 0.05, [0, 10], 2, { show: s => s.two })] },
    ],
    uplift: [
      { g: 'Műtárgy', open: true, f: [
        n_('L', 'L', 'hosszúság', 'm', 2, 200, 0.5, [4, 80], 2), n_('B', 'B', 'szélesség (metszet iránya)', 'm', 2, 100, 0.5, [3, 40], 2),
        n_('H', 'H', 'külső magasság', 'm', 1, 30, 0.05, [2, 15], 2), n_('D', 'D', 'az alaplemez alsó síkjának mélysége', 'm', 0.5, 30, 0.05, [1, 15], 2),
        n_('o', 'o', 'a talplemez túlnyújtása a falakon túl', 'm', 0, 5, 0.05, [0, 2], 2)] },
      { g: 'Önsúly', open: true, f: [
        s_('gMode', 'Megadás', [['geom', 'Vastagságokból (25 kN/m³)'], ['direct', 'G<sub>k</sub> közvetlenül']]),
        n_('tb', 't<sub>b</sub>', 'alaplemez', 'm', 0.2, 3, 0.01, [0.25, 2], 2, { show: s => s.gMode === 'geom' }), n_('tw', 't<sub>w</sub>', 'falak', 'm', 0.15, 2, 0.01, [0.2, 1.2], 2, { show: s => s.gMode === 'geom' }),
        n_('tr', 't<sub>r</sub>', 'födém', 'm', 0, 2, 0.01, [0, 1], 2, { show: s => s.gMode === 'geom' }),
        n_('ni', 'n<sub>k</sub>', 'közbenső födémek száma', 'db', 0, 8, 1, [0, 5], 0, { int: true, show: s => s.gMode === 'geom' }), n_('ti', 't<sub>k</sub>', 'közbenső födém vastagsága', 'm', 0.1, 1, 0.01, [0.15, 0.6], 2, { show: s => s.gMode === 'geom' && s.ni > 0 }),
        n_('Gk', 'G<sub>sz;k</sub>', 'a szerkezet súlya', 'kN', 0, 1e7, 50, [0, 60000], 0, { show: s => s.gMode === 'direct' }),
        n_('Gadd', 'G<sub>egyéb;k</sub>', 'egyéb állandó (burkolat, gépek)', 'kN', 0, 1e7, 50, [0, 10000], 0)] },
      { g: 'Víz és leterhelés', open: true, f: [
        n_('dw', 'd<sub>w</sub>', 'tervezési talajvízszint a terepszint alatt (negatív: felette)', 'm', -3, 30, 0.05, [-2, 8], 2),
        n_('tc', 't<sub>t</sub>', 'földtakarás a födémen', 'm', 0, 5, 0.05, [0, 3], 2),
        n_('gam', 'γ', 'a talaj térfogatsúlya (víz felett)', 'kN/m³', 14, 23, 0.1, [15, 22], 1), n_('gsat', 'γ<sub>sat</sub>', 'telített térfogatsúly (víz alatt)', 'kN/m³', 15, 24, 0.1, [16, 23], 1),
        n_('hb', 'h<sub>b</sub>', 'ballasztvíz (elárasztás) mélysége az alsó szinten', 'm', 0, 10, 0.05, [0, 4], 2),
        n_('Qdst', 'Q<sub>dst;k</sub>', 'esetleges felfelé ható teher', 'kN', 0, 1e6, 50, [0, 5000], 0)] },
      { g: 'Oldalsúrlódás', open: false, f: [
        c_('fric', 'Súrlódás a falakon (γ<sub>s;t</sub> = 1,4)'),
        n_('phiS', 'φ′<sub>k</sub>', 'a visszatöltés belső súrlódási szöge', '°', 15, 42, 0.5, [18, 40], 1, { show: s => s.fric && s.kAuto !== 'man' }),
        s_('kAuto', 'K és δ', [['auto', 'K<sub>0</sub> = 1 − sin' + NB + 'φ′, δ = ⅔φ′'], ['man', 'Kézi megadás']], { show: s => s.fric }),
        n_('K0', 'K', 'földnyomás-szorzó a falon', '–', 0.2, 1.5, 0.01, [0.3, 1.0], 2, { show: s => s.fric && s.kAuto === 'man' }),
        n_('delta', 'δ', 'fal–talaj súrlódási szög', '°', 5, 35, 0.5, [5, 35], 1, { show: s => s.fric && s.kAuto === 'man' })] },
      { g: 'Lehorgonyzás', open: false, f: [
        n_('n', 'n', 'horgonyok / húzott cölöpök száma', 'db', 0, 500, 1, [0, 60], 0, { int: true }), n_('Rk', 'R<sub>k</sub>', 'egy elem karakterisztikus húzási ellenállása (γ<sub>a</sub> = 1,4)', 'kN', 10, 5000, 10, [50, 1500], 0)] },
    ],
    slope: [
      { g: 'Rézsű', open: true, f: [
        n_('H', 'H', 'rézsűmagasság', 'm', 1, 40, 0.1, [2, 20], 1), n_('n', '1 : n', 'hajlás (vízszintes vetület / magasság)', '–', 0.5, 5, 0.05, [0.6, 4], 2),
        n_('dR', 'd<sub>R</sub>', 'merev réteg mélysége a rézsűláb alatt', 'm', 0.5, 30, 0.1, [0.5, 15], 1)] },
      { g: 'Talaj', open: true, f: [
        s_('an', 'Vizsgálat', [['drained', 'Drénezett (c′, φ′)'], ['undrained', 'Drénezetlen (c<sub>u</sub>)']]),
        n_('gam', 'γ', 'térfogatsúly', 'kN/m³', 14, 23, 0.1, [15, 22], 1),
        n_('c', 'c′<sub>k</sub>', 'hatékony kohézió', 'kPa', 0, 100, 0.5, [0, 50], 1, { show: s => s.an === 'drained' }), n_('phi', 'φ′<sub>k</sub>', 'belső súrlódási szög', '°', 0, 45, 0.5, [10, 42], 1, { show: s => s.an === 'drained' }),
        n_('cu', 'c<sub>u;k</sub>', 'drénezetlen nyírószilárdság', 'kPa', 5, 300, 1, [10, 200], 0, { show: s => s.an === 'undrained' }),
        c_('lay2', 'Második (alsó) réteg'),
        n_('z2', 'z<sub>2</sub>', 'a réteghatár mélysége a korona alatt', 'm', 0.5, 60, 0.1, [1, 25], 1, { show: s => s.lay2 }), n_('gam2', 'γ<sub>2</sub>', 'térfogatsúly', 'kN/m³', 14, 24, 0.1, [15, 23], 1, { show: s => s.lay2 }),
        n_('c2', 'c′<sub>k;2</sub>', 'hatékony kohézió', 'kPa', 0, 150, 0.5, [0, 60], 1, { show: s => s.lay2 && s.an === 'drained' }), n_('phi2', 'φ′<sub>k;2</sub>', 'belső súrlódási szög', '°', 0, 45, 0.5, [10, 42], 1, { show: s => s.lay2 && s.an === 'drained' }),
        n_('cu2', 'c<sub>u;k;2</sub>', 'drénezetlen nyírószilárdság', 'kPa', 5, 400, 1, [10, 250], 0, { show: s => s.lay2 && s.an === 'undrained' })] },
      { g: 'Víz és parciális tényezők', open: true, f: [
        s_('water', 'Pórusvíznyomás', [['none', 'Nincs'], ['ru', 'r<sub>u</sub>-val'], ['phreatic', 'Talajvízszint']], { show: s => s.an === 'drained' }),
        n_('ru', 'r<sub>u</sub>', 'pórusvíznyomás-arány (u = r<sub>u</sub>·γ·h)', '–', 0, 0.6, 0.01, [0, 0.5], 2, { show: s => s.an === 'drained' && s.water === 'ru' }),
        n_('wd', 'd<sub>w</sub>', 'a talajvízszint mélysége a korona mögött', 'm', 0, 40, 0.1, [0, 15], 1, { show: s => s.an === 'drained' && s.water === 'phreatic' }),
        n_('wt', 'd<sub>w;láb</sub>', 'a talajvízszint mélysége a rézsűláb előtt', 'm', 0, 20, 0.1, [0, 6], 1, { show: s => s.an === 'drained' && s.water === 'phreatic' }),
        s_('gm', 'γ<sub>φ′</sub> = γ<sub>c′</sub>', [[1.35, '1,35'], [1.25, '1,25 – EN' + NB + '1997' + NBH + '1 ajánlott érték']], { show: s => s.an === 'drained' }),
        { note: `Drénezetlen vizsgálatban ${nw('γ<sub>cu</sub> = 1,4')}; a hatások: ${nw('γ<sub>G</sub> = 1,0')}, ${nw('γ<sub>Q</sub> = 1,3')}.` }] },
      { g: '1. sávalap (a rézsűélhez közelebbi)', open: true, f: [
        c_('f1', '1. sávalap'), n_('f1B', 'B<sub>1</sub>', 'szélesség', 'm', 0.2, 6, 0.05, [0.3, 3], 2, { show: s => s.f1 }), n_('f1a', 'a<sub>1</sub>', 'távolság a rézsűéltől (a közelebbi szélig)', 'm', 0, 40, 0.05, [0, 12], 2, { show: s => s.f1 }),
        n_('f1D', 'D<sub>1</sub>', 'alapozási mélység', 'm', 0, 5, 0.05, [0, 3], 2, { show: s => s.f1 }), n_('f1G', 'G<sub>k;1</sub>', 'állandó teher', 'kN/m', 0, 5000, 1, [0, 400], 1, { show: s => s.f1 }), n_('f1Q', 'Q<sub>k;1</sub>', 'esetleges teher', 'kN/m', 0, 5000, 1, [0, 200], 1, { show: s => s.f1 })] },
      { g: '2. sávalap', open: false, f: [
        c_('f2', '2. sávalap'), n_('f2B', 'B<sub>2</sub>', 'szélesség', 'm', 0.2, 6, 0.05, [0.3, 3], 2, { show: s => s.f2 }), n_('f2a', 'a<sub>2</sub>', 'távolság a rézsűéltől (a közelebbi szélig)', 'm', 0, 40, 0.05, [0, 15], 2, { show: s => s.f2 }),
        n_('f2D', 'D<sub>2</sub>', 'alapozási mélység', 'm', 0, 5, 0.05, [0, 3], 2, { show: s => s.f2 }), n_('f2G', 'G<sub>k;2</sub>', 'állandó teher', 'kN/m', 0, 5000, 1, [0, 400], 1, { show: s => s.f2 }), n_('f2Q', 'Q<sub>k;2</sub>', 'esetleges teher', 'kN/m', 0, 5000, 1, [0, 200], 1, { show: s => s.f2 })] },
      { g: 'Keresés', open: false, f: [c_('fine', 'Sűrűbb keresőháló (pontosabb, lassabb)')] },
    ],
  };
  const TABS = [
    { id: 'sliding', name: 'Elcsúszás', k: 'k1', tag: 'GEO · ' + DA2 },
    { id: 'overturn', name: 'Felborulás', k: 'k2', tag: 'EQU + külpontosság' },
    { id: 'uplift', name: 'Felúszás', k: 'k3', tag: 'UPL' },
    { id: 'slope', name: 'Általános állékonyság', k: 'k4', tag: 'GEO · ' + DA3 },
  ];
  const CONV = {
    sliding: `<p><b>GEO határállapot, ${DA2}</b> (${EN} és a nemzeti melléklet). Hatások: A1 – ${nw('γ<sub>G</sub> = 1,35')} kedvezőtlen, ${nw('1,0')} kedvező; ${nw('γ<sub>Q</sub> = 1,5')} kedvezőtlen, ${nw('0')} kedvező. Ellenállás: ${nw('γ<sub>R;h</sub> = 1,1')}, földellenállás ${nw('γ<sub>R;e</sub> = 1,4')}.</p><ul><li>Drénezett: ${nw('R<sub>d</sub> = V′<sub>k</sub> · tg' + NB + 'δ<sub>k</sub> / γ<sub>R;h</sub>')}, ${nw('δ<sub>k</sub> = φ′<sub>cv;k</sub>')} helyben betonozott, ${nw('⅔ · φ′<sub>cv;k</sub>')} sima, előregyártott alaptestnél; a c′ kohéziót elhanyagoljuk.</li><li>Drénezetlen: ${nw('R<sub>d</sub> = A<sub>c</sub> · c<sub>u;k</sub> / γ<sub>R;h</sub>')}, de ${nw('R<sub>d</sub> ≤ 0,4 · V<sub>d</sub>')}; ${nw('A<sub>c</sub> = B′ · L′')}, ${nw('B′ = B − 2e')}.</li><li>A külpontosság és a nyomott felület a hatások karakterisztikus értékéből (${DA2}).</li><li>Földellenállás: Rankine-féle ${nw('K<sub>p</sub> = tg²(45° + φ′/2)')} (drénezetlenül ${nw('σ<sub>v</sub> + 2c<sub>u</sub>')}), a teljes érték fele vagy kétharmada.</li><li>A vízszintes erő a B irányban hat; a talajvíz felhajtóereje V′<sub>k</sub>-t csökkenti.</li></ul>`,
    overturn: `<p><b>EQU határállapot.</b> ${nw('γ<sub>G;dst</sub> = 1,1')}; ${nw('γ<sub>G;stb</sub> = 0,9')}; ${nw('γ<sub>Q;dst</sub> = 1,5')}; ${nw('γ<sub>Q;stb</sub> = 0')}.</p><ul><li>Forgáspont: szilárd kőzeten a talp széle (sarokvonala), talajon első közelítésben a széltől B/10 (kör alaprajznál D/10) távolságra.</li><li>A külpontosság korlátozása a karakterisztikus hatásokból (${DA2}): ${nw('e ≤ B/6')} – a teljes talp nyomott; ${nw('B/6 < e ≤ B/3')} – megengedett, részleges elemelkedéssel; ${nw('e > B/3')} (kör: ${nw('e > 0,6 · r')}) – külön óvintézkedés.</li><li>Kétirányú külpontosság: belső mag ${nw('|e<sub>B</sub>|/B + |e<sub>L</sub>|/L ≤ 1/6')}; a B/3 határ általánosítása ${nw('(e<sub>B</sub>/B)² + (e<sub>L</sub>/L)² ≤ 1/9')}.</li><li>Talpfeszültség: lineáris eloszlás, húzást nem vevő érintkezés (karakterisztikus értékek).</li></ul>`,
    uplift: `<p><b>UPL határállapot.</b> ${nw('γ<sub>G;dst</sub> = 1,00')}; ${nw('γ<sub>G;stb</sub> = 0,90')}; ${nw('γ<sub>Q;dst</sub> = 1,50')}; ${nw('γ<sub>Q;stb</sub> = 0')}; oldalsúrlódás ${nw('γ<sub>s;t</sub> = 1,4')}; horgony ${nw('γ<sub>a</sub> = 1,4')}.</p><ul><li>${nw('V<sub>dst;d</sub> = γ<sub>G;dst</sub> · γ<sub>w</sub> · h<sub>w</sub> · A<sub>k</sub>')}, ${nw('γ<sub>w</sub> = 10 kN/m³')}; A<sub>k</sub> a túlnyújtott alaplemez teljes alapterülete.</li><li>Beton 25 kN/m³; a talaj súlya a víz felett γ, alatta γ<sub>sat</sub>.</li><li>Súrlódás: ${nw('τ = K · σ′<sub>v</sub> · tg' + NB + 'δ')} a terepszinttől az alapsíkig, a külső kerületen; alapértelmezés ${nw('K = K<sub>0</sub> = 1 − sin' + NB + 'φ′')}, ${nw('δ = ⅔ · φ′')}; tervezési érték ${nw('T<sub>d</sub> = T<sub>k</sub> / γ<sub>s;t</sub>')}.</li><li>${nw('Λ = V<sub>dst;d</sub> / (G<sub>stb;d</sub> + T<sub>d</sub> + P<sub>d</sub>)')}.</li></ul>`,
    slope: `<p><b>GEO határállapot, ${DA3}.</b> Hatások: ${nw('γ<sub>G</sub> = 1,0')}, ${nw('γ<sub>Q</sub> = 1,3')} (az alapok terhére, a talaj önsúlyára 1,0). Anyagok (M2): ${nw('tg' + NB + 'φ′<sub>d</sub> = tg' + NB + 'φ′<sub>k</sub> / γ<sub>φ′</sub>')}, ${nw('c′<sub>d</sub> = c′<sub>k</sub> / γ<sub>c′</sub>')}, ${nw('γ<sub>φ′</sub> = γ<sub>c′</sub> = 1,35')} (választható az EN${NB}1997${NBH}1 ajánlott 1,25 értéke); drénezetlenül ${nw('c<sub>u;d</sub> = c<sub>u;k</sub> / 1,4')}.</p><ul><li>Egyszerűsített Bishop-módszer körhengeres csúszólapokkal, 30 lamellával; a középpontok hálóján és több sugáron keresés, majd finomítás.</li><li>Igazolás: ${nw('F<sub>d</sub> ≥ 1,0')}, kihasználtság ${nw('Λ = 1/F<sub>d</sub>')}.</li><li>A sávalapok terhe a talpszélességen egyenletesen megoszló; a csúszólap nem metszheti az alaptestet.</li><li>Pórusvíznyomás: ${nw('u = r<sub>u</sub> · γ · h')}, vagy hidrosztatikus a talajvízszint alatt (függőleges távolsággal).</li></ul>`,
  };

  // ============================== ÁLLAPOT ÉS MEGJELENÍTÉS ==============================
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ST = {}; TABS.forEach(t => ST[t.id] = { ...DEF[t.id] });
  const RES = {}; let TAB = 'sliding', VIEW = '2d', ROOT = null; const PRESETS = [];
  const fmtIn = (v, d) => { if (!isFinite(v)) return ''; const x = Math.round(v * 10 ** d) / 10 ** d; return String(x).replace('.', ','); };
  const strip = (h) => String(h).replace(/<[^>]+>/g, '');
  function fieldHTML(tab, f) {
    if (f.note) return `<p class="cx-note">${f.note}</p>`;
    const key = f.k || f.s || f.c, id = `cx-${tab}-${key}`;
    if (f.s) return `<div class="cx-f cx-fs" data-f="${key}"><span class="cx-l">${f.lab}</span><div class="seg cx-seg" data-k="${key}" role="group" aria-label="${esc(strip(f.lab))}">${f.o.map(([val, t]) => `<button type="button" data-v="${val}" aria-pressed="false">${t}</button>`).join('')}</div></div>`;
    if (f.c) return `<label class="cx-f cx-fc" data-f="${key}"><input type="checkbox" id="${id}" data-k="${key}"><span>${f.lab}</span></label>`;
    return `<div class="cx-f cx-fn" data-f="${key}"><label for="${id}"><span class="cx-sy">${f.lab}</span><span class="cx-ds">${f.d || ''}</span></label><div class="cx-in"><input id="${id}" class="cx-num" data-k="${key}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false"><span class="cx-u"></span></div>${f.sl ? `<input type="range" class="cx-rg" data-k="${key}" min="${f.sl[0]}" max="${f.sl[1]}" step="${f.st}" aria-label="${esc(strip(f.lab))} – csúszka">` : ''}</div>`;
  }
  const fdef = (tab, key) => { for (const g of FORMS[tab]) for (const f of g.f) if ((f.k || f.s || f.c) === key) return f; return null; };
  function buildForms() {
    const host = $('#cx-form'); host.innerHTML = TABS.map(t => `<div class="cx-fm" data-tab="${t.id}" ${t.id === TAB ? '' : 'hidden'}>${FORMS[t.id].map((g, i) => `<details class="cx-g" ${g.open ? 'open' : ''}><summary>${g.g}</summary><div class="cx-gb">${g.f.map(f => fieldHTML(t.id, f)).join('')}</div></details>`).join('')}</div>`).join('');
    TABS.forEach(t => syncForm(t.id));
    host.addEventListener('input', (e) => { const el = e.target, fm = el.closest('.cx-fm'); if (!fm) return; const tab = fm.dataset.tab, k = el.dataset.k; if (!k) return; const f = fdef(tab, k);
      if (el.classList.contains('cx-num')) { const x = parseFloat(el.value.replace(/\s/g, '').replace(',', '.').replace('−', '-')); if (!isFinite(x)) { el.closest('.cx-f').classList.add('bad'); return; } el.closest('.cx-f').classList.remove('bad'); ST[tab][k] = f && f.int ? Math.round(x) : x; const rg = $(`.cx-rg[data-k="${k}"]`, fm); if (rg) { rg.value = x; fill(rg); } }
      else if (el.classList.contains('cx-rg')) { const x = +el.value; ST[tab][k] = f && f.int ? Math.round(x) : x; const ni = $(`.cx-num[data-k="${k}"]`, fm); if (ni) { ni.value = fmtIn(x, f ? f.dec : 2); ni.closest('.cx-f').classList.remove('bad'); } fill(el); }
      else if (el.type === 'checkbox') { ST[tab][k] = el.checked; vis(tab); }
      softMark(tab, k); schedule(tab); });
    host.addEventListener('change', (e) => { const el = e.target; if (el.classList.contains('cx-num')) { const fm = el.closest('.cx-fm'), tab = fm.dataset.tab, f = fdef(tab, el.dataset.k); if (f && !el.closest('.cx-f').classList.contains('bad')) el.value = fmtIn(ST[tab][el.dataset.k], f.dec); } });
    host.addEventListener('keydown', (e) => { const el = e.target; if (!el.classList.contains('cx-num') || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return; const fm = el.closest('.cx-fm'), tab = fm.dataset.tab, f = fdef(tab, el.dataset.k); if (!f) return; e.preventDefault(); const st = (f.st || 0.1) * (e.shiftKey ? 10 : 1); const x = Math.round(((+ST[tab][f.k] || 0) + (e.key === 'ArrowUp' ? st : -st)) * 1e6) / 1e6; el.value = fmtIn(x, f.dec); el.dispatchEvent(new Event('input', { bubbles: true })); });
    host.addEventListener('click', (e) => { const b = e.target.closest('.cx-seg button'); if (!b) return; const fm = b.closest('.cx-fm'), tab = fm.dataset.tab, k = b.closest('.cx-seg').dataset.k; const raw = b.dataset.v; ST[tab][k] = typeof DEF[tab][k] === 'number' ? +raw : raw; segSync(fm, k, ST[tab][k]); vis(tab); syncUnits(tab); schedule(tab); });
  }
  function fill(rg) { const p = (rg.value - rg.min) / (rg.max - rg.min) * 100; rg.style.setProperty('--p', Math.max(0, Math.min(100, p)) + '%'); }
  function segSync(fm, k, val) { $$(`.cx-seg[data-k="${k}"] button`, fm).forEach(b => { const on = typeof val === 'number' ? Math.abs(+b.dataset.v - val) < 1e-3 : b.dataset.v === String(val); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); }
  function syncUnits(tab) { const fm = $(`.cx-fm[data-tab="${tab}"]`); FORMS[tab].forEach(g => g.f.forEach(f => { if (!f.k) return; const u = $(`.cx-f[data-f="${f.k}"] .cx-u`, fm); if (u) u.textContent = typeof f.u === 'function' ? f.u(ST[tab]) : f.u; })); }
  function syncForm(tab) { const fm = $(`.cx-fm[data-tab="${tab}"]`), s = ST[tab]; FORMS[tab].forEach(g => g.f.forEach(f => {
      if (f.k) { const ni = $(`.cx-num[data-k="${f.k}"]`, fm); ni.value = fmtIn(s[f.k], f.dec); ni.closest('.cx-f').classList.remove('bad'); const rg = $(`.cx-rg[data-k="${f.k}"]`, fm); if (rg) { rg.value = s[f.k]; fill(rg); } softMark(tab, f.k); }
      else if (f.s) segSync(fm, f.s, s[f.s]); else if (f.c) $(`input[data-k="${f.c}"]`, fm).checked = !!s[f.c]; }));
    syncUnits(tab); vis(tab); }
  function vis(tab) { const fm = $(`.cx-fm[data-tab="${tab}"]`), s = ST[tab]; FORMS[tab].forEach(g => g.f.forEach(f => { const key = f.k || f.s || f.c; if (!key) return; const el = $(`.cx-f[data-f="${key}"]`, fm); if (el) el.hidden = f.show ? !f.show(s) : false; })); }
  function softMark(tab, k) { const f = fdef(tab, k); if (!f || !f.k) return; const fm = $(`.cx-fm[data-tab="${tab}"]`), el = $(`.cx-f[data-f="${k}"]`, fm), x = ST[tab][k]; if (el) el.classList.toggle('soft', x < f.min || x > f.max); }
  function softWarn(tab, R) { FORMS[tab].forEach(g => g.f.forEach(f => { if (!f.k || (f.show && !f.show(ST[tab]))) return; const x = ST[tab][f.k]; if (x < f.min || x > f.max) R.warn.unshift(`${f.lab} = ${F(x, f.dec)}${typeof f.u === 'string' && f.u !== '–' ? NB + f.u : ''} a szokásos tartományon (${F(f.min, f.dec)}…${F(f.max, f.dec)}) kívül esik.`); })); }

  let pend = null;
  function schedule(tab, delay) { clearTimeout(pend); const d = delay != null ? delay : (tab === 'slope' ? 180 : 0); if (tab === 'slope' && ROOT) ROOT.classList.add('busy'); if (d === 0) { cancelAnimationFrame(schedule._raf); schedule._raf = requestAnimationFrame(() => run(tab)); } else pend = setTimeout(() => run(tab), d); }
  function compute(tab) { const R = SOLVE[tab]({ ...ST[tab] }); softWarn(tab, R); RES[tab] = R; return R; }
  function run(tab) { const R = compute(tab); if (ROOT) ROOT.classList.remove('busy'); badge(tab, R); if (tab === TAB) { render(R); draw2d(); emit(); } }
  const lamMax = (R) => R.checks.length ? R.checks.reduce((a, c) => Math.max(a, c.lam), 0) : NaN;
  function badge(tab, R) { const b = $(`.cx-tab[data-tab="${tab}"] .cx-tl`); if (!b) return; const L = lamMax(R); b.textContent = R.err.length ? '!' : isFinite(L) ? 'Λ ' + F(L, 2) : (L === Infinity ? 'Λ > 9' : '–'); b.className = 'cx-tl ' + (R.err.length || !(L <= 1 + 1e-9) ? 'bad' : L > 0.9 ? 'warn' : 'ok'); }
  function card(c) {
    const ok = c.lam <= 1 + 1e-9, w = Math.max(0, Math.min(1, c.lam / 1.5)) * 100, d = c.d != null ? c.d : 1, cls = !ok ? 'bad' : c.lam > 0.9 ? 'warn' : 'ok';
    let iq;
    if (c.fd) iq = `F<sub>d</sub> = ${F(c.R, 3)} ${c.R >= 1 - 1e-9 ? '≥' : '<'} 1,00`;
    else if (c.key === 'ecc') iq = `${c.Es} = ${F(c.E, 3)}${c.unit ? NB + c.unit : ''} ${ok ? '≤' : '>'} ${c.Rs}${c.unit ? ' = ' + F(c.R, 3) + NB + c.unit : ''}`;
    else iq = `${c.Es} = ${u_(c.E, d, c.unit)} ${ok ? '≤' : '>'} ${c.Rs} = ${u_(c.R, d, c.unit)}`;
    return `<div class="cx-card ${cls}"><div class="cx-ct"><div><span class="cx-tag">${c.tag}</span><h4>${c.title}</h4><small>${c.sub || ''}</small></div><span class="cx-vd ${ok ? 'ok' : 'bad'}">${ok ? 'Megfelel' : 'Nem felel meg'}</span></div><div class="cx-iq nw">${iq}</div><div class="lam ${ok ? (c.lam > 0.9 ? 'warn' : '') : 'fail'}"><div class="t"><span>Kihasználtság Λ</span><b>${c.lam > 9.99 ? '> 9,99' : F(c.lam, 2)}</b></div><div class="bar"><i style="width:${w.toFixed(1)}%"></i></div><div class="scale"><span>0</span><span>1,0</span><span>1,5</span></div></div></div>`;
  }
  function readout(tab, R) { const v = R.v, ro = (lab, val, cls = '') => `<div class="ro ${cls}"><span>${lab}</span><b class="nw">${val}</b></div>`, U2 = (x, d, u) => `${F(x, d)}<small>${u}</small>`; const p = R.input;
    if (tab === 'sliding') return [ro('H<sub>d</sub>', U2(v.Hd, 1, v.un)), v.dr ? ro('V′<sub>k</sub>', U2(v.Vke, 1, v.un)) : '', v.dr ? ro('δ<sub>k</sub>', U2(v.delta, 1, '°')) : '', v.dr ? ro('R<sub>d</sub> drénezett', U2(v.RdD, 1, v.un)) : '', v.ud ? ro('A<sub>c</sub> = B′·L′', U2(v.Ac, 2, v.strip ? 'm²/m' : 'm²')) : '', v.ud ? ro('R<sub>d</sub> drénezetlen', U2(v.RdU, 1, v.un) + (v.capGov ? ' <em>0,4·V<sub>d</sub></em>' : '')) : '', v.nu > 0 ? ro('R<sub>p;d</sub>', U2(v.dr ? v.RpD : v.RpU, 1, v.un)) : ''].join('');
    if (tab === 'overturn') return [ro('V<sub>k</sub>', U2(v.Vk, 1, 'kN')), ro(v.circ ? 'e' : 'e<sub>B</sub>' + (v.two ? ' / e<sub>L</sub>' : ''), v.circ ? U2(v.e, 3, 'm') : F(v.eB, 3) + (v.two ? ' / ' + F(v.eL, 3) : '') + '<small>m</small>'), ro('M<sub>dst;d</sub>', U2(v.gov.Mdst, 1, 'kNm')), ro('M<sub>stb;d</sub>', U2(v.gov.Mstb, 1, 'kNm')), ro('σ<sub>max</sub> (kar.)', isFinite(v.ct.smax) ? U2(v.ct.smax, 0, 'kPa') : '∞'), ro('nyomott felület', U2((v.ct.ratio || 0) * 100, 0, '%')), ro(v.circ ? 'A′' : 'B′ × L′', v.circ ? U2(v.Aeff, 2, 'm²') : `${F(v.Bp, 2)} × ${F(v.Lp, 2)}<small>m</small>`)].join('');
    if (tab === 'uplift') return [ro('V<sub>dst;d</sub>', U2(v.Vdst, 0, 'kN')), ro('G<sub>stb;d</sub>', U2(v.Gstb, 0, 'kN')), ro('T<sub>d</sub>', U2(v.Td, 0, 'kN')), ro('P<sub>d</sub>', U2(v.Pd, 0, 'kN')), v.geom ? ro('t<sub>b</sub> Λ = 1-hez', U2(Math.max(0, v.tbReq), 2, 'm')) : '', ro('szükséges horgony', U2(v.nReq, 0, 'db')), ro('kritikus vízszint', typeof v.zc === 'number' ? U2(Math.abs(v.zc), 2, 'm') + `<em>${v.zc >= 0 ? ' a terep alatt' : ' a terep felett'}</em>` : v.zc === 'hi' ? '<em>terep felett 3 m-ig sem</em>' : '–')].join('');
    if (tab === 'slope') return [ro('F<sub>d</sub>', F(v.Fd, 3)), ro('Λ = 1/F<sub>d</sub>', F(v.lam, 3)), v.und ? ro('c<sub>u;d</sub>', U2(v.cd, 1, 'kPa')) : ro('φ′<sub>d</sub> · c′<sub>d</sub>', `${F(v.phid, 1)}° · ${F(v.cd, 1)}<small>kPa</small>`), ro('kör: r', U2(v.crit.R, 2, 'm')), ro('belépés a rézsűél mögött', U2(-v.crit.x0, 2, 'm')), v.F0 ? ro('F<sub>d</sub> az alapok nélkül', F(v.F0, 3)) : ''].join('');
    return ''; }
  function render(R) {
    const tab = TAB; const sum = $('#cx-sum'), res = $('#cx-res'), ro = $('#cx-ro'), msgs = $('#cx-msgs'), steps = $('#cx-steps');
    if (R.err.length) { sum.className = 'cx-sum bad'; sum.innerHTML = `<b>Hibás vagy hiányos adatok</b><span>A számítás nem végezhető el – lásd lent.</span>`; res.innerHTML = ''; ro.innerHTML = ''; steps.innerHTML = ''; }
    else { const L = lamMax(R), ok = L <= 1 + 1e-9, gov = R.checks.reduce((a, c) => (c.lam > a.lam ? c : a)); sum.className = 'cx-sum ' + (ok ? 'ok' : 'bad'); sum.innerHTML = `<b>${ok ? 'Megfelel' : 'Nem felel meg'}</b><span class="nw">${R.checks.length > 1 ? 'mértékadó: ' + gov.title.toLowerCase() + ' · ' : ''}Λ<sub>max</sub> = ${L > 9.99 ? '> 9,99' : F(L, 3)}</span>`;
      res.innerHTML = R.checks.map(card).join(''); ro.innerHTML = readout(tab, R); steps.innerHTML = R.steps.map(s => `<li><h5>${s.t}</h5>${s.b}</li>`).join(''); }
    const ic = { err: '✕', warn: '!', info: 'i' };
    msgs.innerHTML = ['err', 'warn', 'info'].map(k => R[k].map(t => `<div class="cx-m ${k}"><i>${ic[k]}</i><span>${t}</span></div>`).join('')).join('');
    $('#cx-conv').innerHTML = CONV[tab];
    [sum, res, ro, msgs, steps, $('#cx-conv')].forEach(guardAll);
    const leg = { sliding: [['act', 'hatás (H<sub>d</sub>)'], ['perm', 'függőleges erő'], ['res', 'ellenállás (R<sub>d</sub>, R<sub>p;d</sub>)'], ['water', 'talajvíz']], overturn: [['act', 'vízszintes hatás'], ['perm', 'függőleges teher'], ['pres', 'talpfeszültség'], ['kern', 'belső mag'], ['limit', 'B/3 (0,6·r) határ']], uplift: [['water', 'víz, felhajtóerő'], ['perm', 'stabilizáló súly'], ['res', 'súrlódás, horgony']], slope: [['arc', 'mértékadó csúszólap'], ['act', 'az alapok terhe'], ['grid', 'próbakörök középpontjai (szín: F)'], ['water', 'pórusvíz']] }[tab];
    $('#cx-leg').innerHTML = leg.map(([k, t]) => `<span class="cx-lg"><i class="lg-${k}"></i><span>${t}</span></span>`).join('') + `<span class="cx-lgr" id="cx-hint">${VIEW === '3d' ? 'húzással forgatható, görgővel nagyítható' : 'méretarányos metszet'}</span>`;
  }
  function draw2d() { if (VIEW !== '2d') return; const host = $('#cx-2d'); const R = RES[TAB]; if (!host || !R) return; const W = Math.max(300, Math.round(host.clientWidth)), H = Math.max(240, Math.round(host.clientHeight)); host.innerHTML = DRAW[TAB](R, W, H); }
  function emit() { const R = RES[TAB]; if (!R) return; G_.dispatchEvent(new CustomEvent('calc:update', { detail: { tab: TAB, input: { ...ST[TAB] }, result: R, view: VIEW } })); }
  function setTab(tab, noFocus) { if (!ST[tab]) return; TAB = tab; ROOT.dataset.tab = tab; TABS.forEach(t => ROOT.classList.toggle(t.k, t.id === tab)); $$('.cx-tab', ROOT).forEach(b => { const on = b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; }); $$('.cx-fm', ROOT).forEach(f => f.hidden = f.dataset.tab !== tab); refreshPresets(); const R = RES[tab]; if (R) { render(R); draw2d(); emit(); } else schedule(tab, 0); }
  function setView(vw) { VIEW = vw === '3d' ? '3d' : '2d'; ROOT.dataset.view = VIEW; segSync(ROOT, 'vmode', VIEW); $('#cx-2d').hidden = VIEW !== '2d'; $('#cx-3d').hidden = VIEW !== '3d'; $('#cx-cam').hidden = VIEW !== '3d'; const h = $('#cx-hint'); if (h) h.textContent = VIEW === '3d' ? 'húzással forgatható, görgővel nagyítható' : 'méretarányos metszet'; if (VIEW === '3d' && !(G_.CALC3D && G_.CALC3D.ok)) { const m = $('#cx-3d .cx-3dmsg'); if (m) m.textContent = G_.CALC3D && G_.CALC3D.msg ? G_.CALC3D.msg : 'A 3D nézet betöltése…'; } draw2d(); G_.dispatchEvent(new CustomEvent('calc:view', { detail: { view: VIEW, tab: TAB } })); emit(); }
  function refreshPresets() { const sel = $('#cx-preset'); if (!sel) return; const list = PRESETS.filter(q => q.tab === TAB); sel.innerHTML = `<option value="">Mintapélda betöltése…</option>` + list.map(q => `<option value="${q.id}">${esc(q.label)}</option>`).join(''); sel.disabled = !list.length; }
  function open(tab, input, opt = {}) {
    if (!ST[tab]) return; ST[tab] = { ...DEF[tab], ...(input || {}) }; syncForm(tab); RES[tab] = null; setTab(tab); schedule(tab, 0);
    if (opt.view) setView(opt.view);
    if (opt.scroll !== false) { const el = document.getElementById('kalkulator'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); ROOT.classList.remove('flash'); void ROOT.offsetWidth; ROOT.classList.add('flash'); }
  }
  function init() {
    ROOT = document.getElementById('cx'); if (!ROOT) return;
    buildForms();
    $('.cx-tabs', ROOT).addEventListener('click', (e) => { const b = e.target.closest('.cx-tab'); if (b) setTab(b.dataset.tab); });
    $('.cx-tabs', ROOT).addEventListener('keydown', (e) => { if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const i = TABS.findIndex(t => t.id === TAB), j = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length; setTab(TABS[j].id); $(`.cx-tab[data-tab="${TABS[j].id}"]`, ROOT).focus(); });
    $('#cx-vmode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(b.dataset.v); });
    $('#cx-cam').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) G_.dispatchEvent(new CustomEvent('calc:camera', { detail: { preset: b.dataset.cam } })); });
    $('#cx-reset').addEventListener('click', () => open(TAB, {}, { scroll: false }));
    $('#cx-preset').addEventListener('change', (e) => { const q = PRESETS.find(x => x.id === e.target.value); if (q) open(q.tab, q.input, { scroll: false }); e.target.value = ''; });
    let rz = 0; if (G_.ResizeObserver) new ResizeObserver(() => { cancelAnimationFrame(rz); rz = requestAnimationFrame(draw2d); }).observe($('#cx-vp'));
    guardAll($('#kalkulator'));
    // minden fül kiszámítása (a fülek jelvényeihez)
    TABS.forEach(t => { if (t.id !== 'slope') { RES[t.id] = compute(t.id); badge(t.id, RES[t.id]); } });
    setTab('sliding'); setView('2d');
    setTimeout(() => { if (!RES.slope) { RES.slope = compute('slope'); badge('slope', RES.slope); } }, 120);
  }
  Object.assign(G_.CALC, {
    draw: DRAW, guard: guardAll, open, setTab, setView, compute,
    result: (t) => RES[t || TAB],
    current: () => ({ tab: TAB, input: { ...ST[TAB] }, result: RES[TAB], view: VIEW }),
    registerPresets(list) { list.forEach(q => { const i = PRESETS.findIndex(x => x.id === q.id); if (i >= 0) PRESETS[i] = q; else PRESETS.push(q); }); refreshPresets(); },
  });
  Object.defineProperties(G_.CALC, { tab: { get: () => TAB, configurable: true }, view: { get: () => VIEW, configurable: true }, state: { get: () => ST, configurable: true } });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
