/* ===== Kalkulátor – 3D nézet (three.js) ===== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const host = document.getElementById('cx-3d');
const C = window.CALC;
(function main() {
  if (!host || !C) return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { window.CALC3D = { ok: false, msg: 'A 3D nézethez WebGL-képes böngésző szükséges.' }; const m = host.querySelector('.cx-3dmsg'); if (m) m.textContent = window.CALC3D.msg; return; }
  const F = C.F, NB = ' ', u_ = C.util.u_;
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const lblHost = document.createElement('div'); lblHost.className = 'c3-lbls'; host.appendChild(lblHost);
  const msg = host.querySelector('.cx-3dmsg'); if (msg) msg.remove();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(34, 1.6, 0.05, 2000);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.09; controls.minPolarAngle = 0.05; controls.maxPolarAngle = Math.PI * 0.62; controls.screenSpacePanning = true;
  scene.add(new THREE.HemisphereLight(0xe6ecff, 0x6b5a44, 1.05));
  const sun = new THREE.DirectionalLight(0xfff2de, 2.3); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006; scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xffffff, 0.55); scene.add(fill);
  const ROOT = new THREE.Group(); scene.add(ROOT);
  let DET = null, visible = false, active = false, dirty = true, raf = 0, lastKey = '', anim = null;
  const TRASH = []; const LBL = [];

  // ---------------- színek, anyagok ----------------
  const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888';
  let COL = {};
  const readCol = () => { COL = { act: css('--c1'), res: css('--c3'), perm: css('--plum2'), water: css('--water'), pres: css('--c2'), bad: css('--bad'), ok: css('--ok'), warn: css('--warn'), ink: css('--ink'), c4: css('--c4') }; };
  function speckTex(base, spots, n, sz, seed, lines = 0) {
    const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    g.fillStyle = base; g.fillRect(0, 0, S, S);
    for (let i = 0; i < n; i++) { g.fillStyle = spots[Math.floor(r() * spots.length)]; const rr = sz * (0.4 + r()); g.beginPath(); g.ellipse(r() * S, r() * S, rr, rr * (0.6 + r() * 0.4), r() * 3, 0, 7); g.fill(); }
    for (let k = 0; k < lines; k++) { const y = (k + 0.5) * S / lines; g.fillStyle = 'rgba(60,45,25,0.22)'; g.fillRect(0, y, S, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const TX = {
    sand: speckTex('#c8ab79', ['#b89a66', '#d6bd8e', '#a98c5c', '#dfc9a0'], 2600, 2.2, 7),
    clay: speckTex('#8a7562', ['#7d6957', '#96816d', '#6f5d4d'], 900, 4, 5),
    loess: speckTex('#d6c39b', ['#c9b48a', '#e2d2b0', '#bfa87c'], 2400, 2, 11),
    soil2: speckTex('#a58a63', ['#957a55', '#b39a72', '#8a704d'], 1600, 3, 23, 3),
    rock: speckTex('#9a958c', ['#7e7a72', '#b3ada3', '#6d6a64', '#c2bdb3'], 500, 8, 3),
    conc: speckTex('#c4c0b8', ['#b2aea6', '#d4d0c8', '#a5a199'], 1600, 1.2, 17),
    grass: speckTex('#7c9a46', ['#6d8a3c', '#8bab52', '#5f7a33'], 1800, 2.5, 19),
  };
  const keep = (o) => { TRASH.push(o); return o; };
  function mat(t, rep = 0.5, color = 0xffffff, opts = {}) { const m = keep(new THREE.MeshStandardMaterial({ map: t.clone(), color, roughness: 0.93, ...opts })); m.map.repeat.set(rep, rep); m.map.needsUpdate = true; keep(m.map); return m; }
  function boxMats(m) { const c = keep(m.clone()); c.color = m.color.clone().multiplyScalar(0.72); return [m, m, m, m, c, m]; }
  function secPair(m) { const c = keep(m.clone()); c.color = m.color.clone().multiplyScalar(0.84); c.roughness = 1; return [c, m]; }
  function basic(color, op = 1, extra = {}) { return keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(color), transparent: op < 1, opacity: op, depthWrite: op >= 1, ...extra })); }
  function geo(g) { return keep(g); }

  // ---------------- geometriai segédek ----------------
  // 2D profil (x, y) kihúzása z mentén z1 → z0
  function ext(pts, z0, z1, holes = []) { const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))); holes.forEach(h => s.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1]))))); const g = new THREE.ExtrudeGeometry(s, { depth: z0 - z1, bevelEnabled: false, curveSegments: 24 }); g.translate(0, 0, z1); return geo(g); }
  // alaprajzi (x, z) alakzat kihúzása függőlegesen y0 → y1
  function extY(pts, y0, y1) { const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], -p[1]))); const g = new THREE.ExtrudeGeometry(s, { depth: y1 - y0, bevelEnabled: false, curveSegments: 32 }); g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return geo(g); }
  function mesh(g, m, sh = true) { const o = new THREE.Mesh(g, m); o.castShadow = sh; o.receiveShadow = true; ROOT.add(o); return o; }
  function boxAt(x0, x1, y0, y1, z0, z1, m, sh = true) { const g = geo(new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0))); const o = mesh(g, m, sh); o.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return o; }
  function overlay(pts, color, op, z = 0.012, ro = 3) { if (!pts || pts.length < 3) return null; const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))); const o = new THREE.Mesh(geo(new THREE.ShapeGeometry(s)), basic(color, op, { side: THREE.DoubleSide })); o.position.z = z; o.renderOrder = ro; ROOT.add(o); return o; }
  function line(pts, color, opts = {}) { const g = geo(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], p[1], p[2] || 0)))); const m = keep(opts.dash ? new THREE.LineDashedMaterial({ color: new THREE.Color(color), dashSize: opts.dash, gapSize: opts.gap || opts.dash * 0.6, transparent: true, opacity: opts.op ?? 1, depthTest: !opts.top }) : new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity: opts.op ?? 1, depthTest: !opts.top })); const o = new THREE.Line(g, m); if (opts.dash) o.computeLineDistances(); o.renderOrder = opts.top ? 12 : 4; ROOT.add(o); return o; }
  function tube(pts, r, color, top = false) { const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2] || 0))); const o = new THREE.Mesh(geo(new THREE.TubeGeometry(curve, Math.max(16, pts.length * 2), r, 8, false)), basic(color, 1, { depthTest: !top })); o.renderOrder = top ? 11 : 4; ROOT.add(o); return o; }
  function arrow(from, dir, len, color, k = 1) { if (!(len > 0.02)) return null; const d = new THREE.Vector3(...dir).normalize(), g = new THREE.Group(), m = basic(color, 1, { depthTest: false }); const hl = Math.min(0.42 * k, len * 0.45), r = 0.055 * k; const sh = new THREE.Mesh(geo(new THREE.CylinderGeometry(r, r, Math.max(0.01, len - hl), 12)), m); sh.position.y = (len - hl) / 2; const hd = new THREE.Mesh(geo(new THREE.ConeGeometry(r * 2.9, hl, 18)), m); hd.position.y = len - hl / 2; g.add(sh, hd); g.position.set(...from); g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); g.renderOrder = 10; sh.renderOrder = 10; hd.renderOrder = 10; ROOT.add(g); return g; }
  function sphere(p, r, color, top = false) { const o = new THREE.Mesh(geo(new THREE.SphereGeometry(r, 20, 14)), basic(color, 1, { depthTest: !top })); o.position.set(...p); o.renderOrder = top ? 11 : 4; ROOT.add(o); return o; }
  function label(p, html, cls = '') { const el = document.createElement('div'); el.className = 'c3-l ' + cls; el.innerHTML = html; lblHost.appendChild(el); LBL.push({ el, p: new THREE.Vector3(...p) }); return el; }
  function grassHole(X0, X1, Z0, Z1, y, h) { if (!h) return grass(X0, X1, Z0, Z1, y); grass(X0, h[0], Z0, Z1, y); grass(h[1], X1, Z0, Z1, y); if (h[2] > Z0) grass(h[0], h[1], Z0, h[2], y); }
  function grass(x0, x1, z0, z1, y) { if (!(x1 - x0 > 0.01 && z1 - z0 > 0.01)) return null; const t = mat(TX.grass, 0.18); const o = mesh(geo(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2)), t, false); o.position.set((x0 + x1) / 2, y + 0.004, (z0 + z1) / 2); return o; }
  function clipBelow(pts, y) { const out = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], fa = y - a[1], fb = y - b[1]; if (fa >= 0) out.push(a); if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } } return out; }
  function clipAbove(pts, y) { return clipBelow(pts.map(p => [p[0], -p[1]]), -y).map(p => [p[0], -p[1]]); }
  const rich = (s) => s; // a címkék HTML-ben kapják az alsó indexet
  const notchRect = (W, Dz, w, d) => [[-W / 2, 0], [-w / 2, 0], [-w / 2, -d], [w / 2, -d], [w / 2, 0], [W / 2, 0], [W / 2, -Dz], [-W / 2, -Dz]];
  const notchCirc = (W, Dz, r) => { const p = [[-W / 2, 0], [-r, 0]]; for (let i = 1; i < 32; i++) { const t = Math.PI - Math.PI * i / 32; p.push([r * Math.cos(t), -r * Math.sin(t)]); } p.push([r, 0], [W / 2, 0], [W / 2, -Dz], [-W / 2, -Dz]); return p; };

  function clear() { while (ROOT.children.length) ROOT.remove(ROOT.children[0]); TRASH.splice(0).forEach(o => o.dispose && o.dispose()); LBL.splice(0); lblHost.innerHTML = ''; }

  // ================== ELCSÚSZÁS ==================
  function buildSliding(R) {
    const p = R.input, v = R.v, B = v.B, D = v.D, hf = v.hf, yft = -D + hf, bw = Math.min(0.45, Math.max(0.25, 0.22 * B));
    const Wx = B + 2 * Math.max(1.3 * B, 2.2), yb = -D - Math.max(1.4, 0.8 * B), Yt = Math.max(0.8, 0.34 * B, 0.5 * D, hf - D + 0.5);
    const soilM = mat(p.an === 'drained' ? TX.sand : TX.clay, 0.45), concM = mat(TX.conc, 0.7);
    let Lz;
    if (v.strip) {
      Lz = Math.max(3.2, 1.5 * B);
      const slot = yft < 0 ? [[-bw / 2, 0], [-bw / 2, yft], [-B / 2, yft], [-B / 2, -D], [B / 2, -D], [B / 2, yft], [bw / 2, yft], [bw / 2, 0]] : [[-B / 2, 0], [-B / 2, -D], [B / 2, -D], [B / 2, 0]];
      mesh(ext([[-Wx / 2, 0], ...slot, [Wx / 2, 0], [Wx / 2, yb], [-Wx / 2, yb]], 0, -Lz), secPair(soilM));
      const body = yft < Yt ? [[-B / 2, -D], [B / 2, -D], [B / 2, yft], [bw / 2, yft], [bw / 2, Yt], [-bw / 2, Yt], [-bw / 2, yft], [-B / 2, yft]] : [[-B / 2, -D], [B / 2, -D], [B / 2, yft], [-B / 2, yft]];
      mesh(ext(body, 0.004, -Lz), secPair(concM));
      // 1 m-es szakasz jelölése
      line([[bw / 2 + 0.03, Yt + 0.02, -1], [bw / 2 + 0.03, Yt + 0.02, 0]], COL.ink, { op: 0.6 }); label([bw / 2 + 0.55, Yt + 0.02, -0.5], 'vizsgált 1 m', 'mute');
    } else {
      Lz = v.L / 2 + Math.max(1.3 * B, 2.2);
      mesh(extY([[-Wx / 2, 0], [Wx / 2, 0], [Wx / 2, -Lz], [-Wx / 2, -Lz]], yb, -D), secPair(soilM));
      mesh(extY(notchRect(Wx, Lz, B, v.L / 2), -D, 0), secPair(soilM));
      boxAt(-B / 2, B / 2, -D, yft, -v.L / 2, v.L / 2, concM); boxAt(-bw / 2, bw / 2, yft, Yt, -bw / 2, bw / 2, concM);
    }
    grassHole(-Wx / 2, Wx / 2, -Lz, -0.02, 0, v.strip ? null : [-B / 2, B / 2, -v.L / 2]);
    // víz
    if (p.water && v.zw < -yb && v.zw > -Yt) { const yw = -v.zw; const sec = v.strip ? [[-Wx / 2, 0], [-B / 2, 0], [-B / 2, -D], [B / 2, -D], [B / 2, 0], [Wx / 2, 0], [Wx / 2, yb], [-Wx / 2, yb]] : [[-Wx / 2, 0], [-B / 2, 0], [-B / 2, -D], [B / 2, -D], [B / 2, 0], [Wx / 2, 0], [Wx / 2, yb], [-Wx / 2, yb]];
      overlay(clipBelow(sec, yw), COL.water, 0.32); line([[-Wx / 2, yw, 0.02], [-B / 2, yw, 0.02]], COL.water, { dash: 0.25 }); line([[B / 2, yw, 0.02], [Wx / 2, yw, 0.02]], COL.water, { dash: 0.25 }); label([-Wx / 2 + 0.3, yw + 0.1, 0.05], 'talajvíz', 'wat'); }
    // földellenállás – ék a homlokfal előtt
    if (v.nu > 0 && v.hp > 0) { const wedge = D / Math.tan((45 - p.phiP / 2) * Math.PI / 180); const zf = v.strip ? 0.014 : v.L / 2 + 0.01; const tri = [[B / 2, -D], [B / 2 + Math.min(wedge, Wx / 2 - B / 2 - 0.05), 0], [B / 2, 0]];
      const o = overlay(tri, COL.res, 0.3, zf); line([[B / 2, -D, zf + 0.01], [B / 2 + Math.min(wedge, Wx / 2 - B / 2 - 0.05), 0, zf + 0.01]], COL.res, { dash: 0.12 });
      const Rp = v.dr ? v.RpD : v.RpU, zp = v.dr ? v.zpD : v.zpU; }
    // erők
    const maxH = Math.max(v.Hd, v.dr ? v.RdD : 0, v.ud ? v.RdU : 0, 1e-6), kH = 0.36 * Wx / maxH, k = Math.max(0.6, Math.min(1.6, B / 2.2)), zA = v.strip ? 0.35 : v.L / 2 + 0.25;
    const yH = v.char ? Math.min(-D + Math.max(0, p.hH), Yt - 0.1) : -D + hf * 0.5, xH = yH > yft ? -bw / 2 : -B / 2;
    if (v.Hd > 0) { const L = Math.max(0.5, v.Hd * kH); arrow([xH - 0.05 - L, yH, zA], [1, 0, 0], L, COL.act, k); label([xH - 0.05 - L, yH + 0.25 * k, zA], `H<sub>d</sub> = ${u_(v.Hd, 1, v.un)}`, 'act'); }
    const Lv = Math.max(0.8, 0.9 * k); arrow([0, Yt + Lv + 0.08, v.strip ? 0.2 : 0], [0, -1, 0], Lv, COL.perm, k); label([0, Yt + Lv + 0.2, v.strip ? 0.2 : 0], v.dr ? `V′<sub>k</sub> = ${u_(v.Vke, 1, v.un)}` : `V<sub>d</sub> = ${u_(v.Vd, 1, v.un)}`, 'perm');
    let yr = -D - 0.22 * k; const rd = []; if (v.dr) rd.push([v.RdD, 'drénezett']); if (v.ud) rd.push([v.RdU, 'drénezetlen']);
    rd.forEach(([Rv, t]) => { const L = Math.max(0.4, Rv * kH); arrow([L / 2, yr, zA], [-1, 0, 0], L, COL.res, k); label([L / 2 + 0.9 * k, yr - 0.05, zA], `R<sub>d</sub> = ${u_(Rv, 1, v.un)}${rd.length > 1 ? ' · ' + t : ''}`, 'res'); yr -= 0.42 * k; });
    if (v.nu > 0 && v.hp > 0) { const Rp = v.dr ? v.RpD : v.RpU, zp = v.dr ? v.zpD : v.zpU, L = Math.max(0.4, Rp * kH); arrow([B / 2 + 0.08 + L, -zp, zA], [-1, 0, 0], L, COL.res, k); label([B / 2 + 0.1 + L, -zp + 0.2, zA], `R<sub>p;d</sub> = ${u_(Rp, 1, v.un)}`, 'res'); }
    if (v.ud && v.Bp < B - 1e-6) { const zz = v.strip ? 0.02 : v.L / 2 + 0.02; const g = tube([[B / 2 - v.Bp + 0.03, -D + 0.04, zz], [B / 2 - 0.03, -D + 0.04, zz]], 0.035 * k, COL.res); label([B / 2 - v.Bp / 2, -D + 0.25, zz], `B′ = ${u_(v.Bp, 2, 'm')}`, 'res'); }
    return { box: new THREE.Box3(new THREE.Vector3(-Wx / 2, yb, -Lz), new THREE.Vector3(Wx / 2, Yt + Lv + 0.3, v.strip ? 0.4 : v.L / 2 + 0.3)), iso: [0.62, 0.42, 1], key: ['s', v.strip, Math.round(B * 4), Math.round(D * 4)].join() };
  }

  // ================== FELBORULÁS ==================
  function buildOverturn(R) {
    const p = R.input, v = R.v, B = v.B, L = v.circ ? v.B : v.L, Df = p.Df, hf = p.hf, circ = v.circ, base = -Df, yft = base + hf;
    const hs = [p.hQ, p.hG, v.two ? p.hQL : 0, v.two ? p.hGL : 0].filter(isFinite), hmax = Math.max(hf + 0.6, ...hs.map(x => x + 0.4));
    const Wx = B + 2 * Math.max(1.1 * B, 2.2), Lz = L / 2 + Math.max(1.1 * B, 2.2), yb = base - Math.max(1.6, 0.8 * B);
    const soilM = mat(p.ground === 'rock' ? TX.rock : TX.clay, 0.4), concM = mat(TX.conc, 0.6);
    mesh(extY([[-Wx / 2, 0], [Wx / 2, 0], [Wx / 2, -Lz], [-Wx / 2, -Lz]], yb, base), secPair(soilM));
    if (Df > 0) mesh(extY(circ ? notchCirc(Wx, Lz, v.Rr) : notchRect(Wx, Lz, B, L / 2), base, 0), secPair(soilM));
    grassHole(-Wx / 2, Wx / 2, -Lz, -0.02, 0, Df > 0 ? [-B / 2, B / 2, -L / 2] : null);
    const xg = p.eGB || 0, zg = -(v.two ? p.eGL : 0), bp = Math.min(0.6, Math.max(0.3, 0.18 * B)), ytop = base + hmax;
    if (circ) { const o = mesh(geo(new THREE.CylinderGeometry(v.Rr, v.Rr, hf, 48)), concM); o.position.set(0, base + hf / 2, 0); const c = mesh(geo(new THREE.CylinderGeometry(bp / 2, bp / 2, ytop - yft, 24)), concM); c.position.set(xg, (yft + ytop) / 2, zg); }
    else { boxAt(-B / 2, B / 2, base, yft, -L / 2, L / 2, concM); boxAt(xg - bp / 2, xg + bp / 2, yft, ytop, zg - bp / 2, zg + bp / 2, concM); }
    // talpfeszültség-oszlopok (karakterisztikus)
    const ct = v.ct; let smax = ct.smax;
    if (ct.ok && !ct.lost && isFinite(smax) && smax > 0) { const n = 16, kz = Math.min(1.4, 0.45 * B) / smax, m = keep(new THREE.MeshStandardMaterial({ color: new THREE.Color(COL.pres), roughness: 0.6, transparent: true, opacity: 0.88 })); const dx = B / n, dz = L / n; const g = geo(new THREE.BoxGeometry(dx * 0.82, 1, dz * 0.82)); const list = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = -B / 2 + (i + 0.5) * dx, z = -L / 2 + (j + 0.5) * dz; if (circ && x * x + z * z > v.Rr * v.Rr) continue; const yP = -z; const s = ct.full || ct.a !== undefined ? Math.max(0, ct.a + ct.b * x + ct.c * yP) : 0; if (s > 1e-6) list.push([x, z, s]); }
      const im = new THREE.InstancedMesh(g, m, list.length); const M4 = new THREE.Matrix4(), col = new THREE.Color(); list.forEach(([x, z, s], i) => { const h = s * kz; M4.makeScale(1, h, 1); M4.setPosition(x, base - 0.02 - h / 2, z); im.setMatrixAt(i, M4); col.set(s > 0.75 * smax ? COL.bad : COL.pres); im.setColorAt(i, col); }); im.castShadow = false; ROOT.add(im);
      label([B / 2, base - Math.min(1.4, 0.45 * B) - 0.15, L / 2], `σ<sub>max</sub> = ${u_(smax, 1, 'kPa')}`, 'pres'); }
    // belső mag, határ, eredő – a talp síkján (mindig látszik)
    const yk = yft + 0.02, kern = circ ? Array.from({ length: 65 }, (_, i) => [v.Rr / 4 * Math.cos(i / 64 * 2 * Math.PI), yk, -v.Rr / 4 * Math.sin(i / 64 * 2 * Math.PI)]) : [[B / 6, yk, 0], [0, yk, -L / 6], [-B / 6, yk, 0], [0, yk, L / 6], [B / 6, yk, 0]];
    line(kern, COL.ok, { top: true }); const lim = Array.from({ length: 97 }, (_, i) => { const t = i / 96 * 2 * Math.PI; return circ ? [0.6 * v.Rr * Math.cos(t), yk, 0.6 * v.Rr * Math.sin(t)] : [B / 3 * Math.cos(t), yk, L / 3 * Math.sin(t)]; }); line(lim, COL.bad, { top: true, dash: 0.12 });
    const ex = Math.max(-B * 0.6, Math.min(B * 0.6, v.eB)), ez = -Math.max(-L * 0.6, Math.min(L * 0.6, v.eL)), zc = v.allowed ? (v.kern ? COL.ok : COL.warn) : COL.bad;
    sphere([ex, yk, ez], Math.max(0.06, 0.035 * B), zc, true); line([[ex, ytop + 0.3, ez], [ex, base - 0.05, ez]], zc, { top: true, dash: 0.15, op: 0.8 }); label([ex, yk + 0.15, ez], `e = ${u_(v.e, 3, 'm')}`, '');
    // forgáspont (él)
    const g = v.gov; if (circ) { const nx = g.nx, nz = -g.ny; const cx = nx * g.dp, cz = nz * g.dp, tx = -nz, tz = nx, hl = Math.sqrt(Math.max(0, v.Rr ** 2 - g.dp ** 2)); tube([[cx - tx * hl, base, cz - tz * hl], [cx + tx * hl, base, cz + tz * hl]], 0.035, COL.bad, true); label([cx, base - 0.1, cz], 'forgáspont', 'bad'); }
    else if (g.nx) { const xp = g.nx * g.dp; tube([[xp, base, -L / 2], [xp, base, L / 2]], Math.max(0.025, 0.012 * B), COL.bad, true); label([xp, base - 0.15, L / 2], 'forgáspont', 'bad'); }
    else { const zp = -g.ny * g.dp; tube([[-B / 2, base, zp], [B / 2, base, zp]], Math.max(0.025, 0.012 * B), COL.bad, true); label([B / 2, base - 0.15, zp], 'forgáspont', 'bad'); }
    // erők
    const kk = Math.max(0.6, Math.min(2, B / 2.4)); const Lh = (H) => Math.max(0.7, Math.min(0.55 * Wx, 0.7 + Math.abs(H) / Math.max(1, v.Vk) * 4 * B));
    const hor = (H, h, ux, uz, lab) => { if (!H || !isFinite(h)) return; const s = Math.sign(H), L0 = Lh(H), y = base + h, x0 = xg - s * ux * (bp / 2 + 0.05 + L0), z0 = zg - s * uz * (bp / 2 + 0.05 + L0); arrow([x0, y, z0], [s * ux, 0, s * uz], L0, COL.act, kk); label([x0, y + 0.3 * kk, z0], lab, 'act'); };
    hor(p.HQk, p.hQ, 1, 0, `H<sub>Q;k</sub> = ${u_(p.HQk, 1, 'kN')}`); hor(p.HGk, p.hG, 1, 0, `H<sub>G;k</sub> = ${u_(p.HGk, 1, 'kN')}`);
    if (v.two) { hor(p.HQLk, p.hQL, 0, -1, `H<sub>Q;L;k</sub> = ${u_(p.HQLk, 1, 'kN')}`); hor(p.HGLk, p.hGL, 0, -1, `H<sub>G;L;k</sub> = ${u_(p.HGLk, 1, 'kN')}`); }
    const Lv = 1.1 * kk; arrow([xg, ytop + Lv + 0.08, zg], [0, -1, 0], Lv, COL.perm, kk); label([xg, ytop + Lv + 0.25, zg], `G<sub>k</sub> = ${u_(p.Gk, 1, 'kN')}`, 'perm');
    return { box: new THREE.Box3(new THREE.Vector3(-Wx / 2, yb, -Lz), new THREE.Vector3(Wx / 2, ytop + Lv + 0.4, L / 2 + 0.5)), iso: [0.8, 0.24, 1], key: ['o', circ, Math.round(B * 4), Math.round(hmax)].join() };
  }

  // ================== FELÚSZÁS ==================
  function buildUplift(R) {
    const p = R.input, v = R.v, B = v.B, L = v.L, Bo = v.Bo, Lo = v.Lo, D = v.D, Hb = v.H, geom = v.geom;
    const tb = geom ? p.tb : 0.6, tw = geom ? p.tw : 0.4, tr = geom ? p.tr : 0.35, ni = geom ? Math.max(0, Math.round(p.ni)) : 0, ti = p.ti;
    const yb = -D, yt = -D + Hb, Wx = Bo + 2 * Math.max(0.45 * B, 4), Lz = Lo / 2 + Math.max(0.3 * L, 4), ybot = yb - Math.max(3, 0.5 * D);
    const soilM = mat(TX.sand, 0.12), concM = mat(TX.conc, 0.25), cutM = mat(TX.conc, 0.25, 0xa9a39a);
    const cmat = [concM, concM, concM, concM, cutM, concM]; // +z oldal = metszet
    mesh(extY([[-Wx / 2, 0], [Wx / 2, 0], [Wx / 2, -Lz], [-Wx / 2, -Lz]], ybot, yb), secPair(soilM));
    mesh(extY(notchRect(Wx, Lz, Bo, Lo / 2), yb, Math.min(yb + tb, 0)), secPair(soilM));
    if (yb + tb < 0) mesh(extY(notchRect(Wx, Lz, B, L / 2), yb + tb, 0), secPair(soilM));
    grassHole(-Wx / 2, Wx / 2, -Lz, -0.02, 0, [-B / 2, B / 2, -L / 2]);
    if (p.tc > 0 && yt + p.tc >= -0.01) grass(-B / 2, B / 2, zb, -0.02, yt + p.tc);
    // a műtárgy fele (a metszősík z = 0)
    const zb = -L / 2;
    boxAt(-Bo / 2, Bo / 2, yb, yb + tb, -Lo / 2, 0, cmat);
    boxAt(-B / 2, -B / 2 + tw, yb + tb, yt - tr, zb, 0, cmat); boxAt(B / 2 - tw, B / 2, yb + tb, yt - tr, zb, 0, cmat); boxAt(-B / 2 + tw, B / 2 - tw, yb + tb, yt - tr, zb, zb + tw, cmat);
    if (tr > 0) boxAt(-B / 2, B / 2, yt - tr, yt, zb, 0, cmat);
    for (let i = 1; i <= ni; i++) { const y = yb + tb + (Hb - tb - tr) * i / (ni + 1); boxAt(-B / 2 + tw, B / 2 - tw, y - ti / 2, y + ti / 2, zb + tw, 0, cmat); }
    if (p.tc > 0) boxAt(-B / 2, B / 2, yt, yt + p.tc, zb, 0, boxMats(soilM));
    // oszlopok a belső térben
    const colM = mat(TX.conc, 0.4); for (const fx of [-0.25, 0.25]) for (const fz of [0.3, 0.65]) { const x = fx * B, z = zb + fz * L / 2 * 1.0; if (z > -0.4) continue; boxAt(x - 0.22, x + 0.22, yb + tb, yt - tr, z - 0.22, z + 0.22, colM); }
    // víz
    const ywl = -v.zw, top = Math.max(yt + p.tc, 0);
    if (v.zw < D + 1e-6) { const sec = [[-Wx / 2, 0], [-B / 2, 0], [-B / 2, yb + tb], [-Bo / 2, yb + tb], [-Bo / 2, yb], [Bo / 2, yb], [Bo / 2, yb + tb], [B / 2, yb + tb], [B / 2, 0], [Wx / 2, 0], [Wx / 2, ybot], [-Wx / 2, ybot]];
      overlay(clipBelow(sec, Math.min(ywl, 0)), COL.water, 0.34, 0.02);
      const wp = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.water), transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      if (ywl > 0) { const o = new THREE.Mesh(geo(new THREE.BoxGeometry(Wx, ywl, Lz)), wp); o.position.set(0, ywl / 2, -Lz / 2); o.renderOrder = 6; ROOT.add(o); }
      line([[-Wx / 2, Math.min(ywl, 0), 0.03], [-Bo / 2, Math.min(ywl, 0), 0.03]], COL.water, { dash: 0.6 }); line([[Bo / 2, Math.min(ywl, 0), 0.03], [Wx / 2, Math.min(ywl, 0), 0.03]], COL.water, { dash: 0.6 });
      label([-Wx / 2 + 1, ywl + 0.3, 0.05], 'tervezési talajvízszint', 'wat'); }
    if (p.hb > 0) { const h = Math.min(p.hb, Hb - tb - tr); const o = new THREE.Mesh(geo(new THREE.BoxGeometry(B - 2 * tw, h, L / 2 - tw)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(COL.water), transparent: true, opacity: 0.38, depthWrite: false }))); o.position.set(0, yb + tb + h / 2, zb + tw + (L / 2 - tw) / 2); o.renderOrder = 6; ROOT.add(o); label([0, yb + tb + h + 0.2, -1], `ballasztvíz ${u_(p.hb, 2, 'm')}`, 'wat'); }
    // felhajtóerő-nyilak
    const kk = Math.max(0.8, Math.min(3, Bo / 10));
    if (v.hw > 0) { const La = Math.min(2.6, 0.7 + v.hw * 0.3) * kk * 0.7, na = Math.max(4, Math.min(9, Math.round(Bo / 2.2))); for (let i = 0; i < na; i++) { const x = -Bo / 2 + (i + 0.5) * Bo / na; arrow([x, yb - 0.08 - La, 0.35], [0, 1, 0], La, COL.water, kk * 0.75); } overlay([[-Bo / 2, yb - 0.06], [Bo / 2, yb - 0.06], [Bo / 2, yb - 0.06 - La], [-Bo / 2, yb - 0.06 - La]], COL.water, 0.18, 0.3); label([0, yb - 0.45 - La, 0.35], `V<sub>dst;d</sub> = ${u_(v.Vdst, 0, 'kN')}`, 'wat'); }
    // súrlódás
    if (p.fric && v.Td > 0) { for (const sx of [-1, 1]) for (const fy of [0.25, 0.6]) arrow([sx * (Bo / 2 + 0.35), -D * fy + 0.6 * kk, 0.3], [0, -1, 0], 1.2 * kk, COL.res, kk * 0.65); label([Bo / 2 + 0.6, -D * 0.2, 0.3], `T<sub>d</sub> = ${u_(v.Td, 0, 'kN')}`, 'res'); }
    // horgonyok
    if (v.n > 0) { const shown = Math.max(1, Math.round(v.n / 2)), nxA = Math.max(1, Math.round(Math.sqrt(shown * Bo / (Lo / 2)))), nzA = Math.max(1, Math.ceil(shown / nxA)), La = Math.max(3, 0.6 * D), am = keep(new THREE.MeshStandardMaterial({ color: 0x8a929b, metalness: 0.5, roughness: 0.45 })), gm = mat(TX.conc, 1, 0xd0ccc4);
      let k = 0; for (let i = 0; i < nxA; i++) for (let j = 0; j < nzA; j++) { if (k++ >= shown) break; const x = -Bo / 2 + (i + 0.5) * Bo / nxA, z = -(j + 0.5) * (Lo / 2) / nzA; const r = mesh(geo(new THREE.CylinderGeometry(0.06 * kk, 0.06 * kk, La, 8)), am, false); r.position.set(x, yb - La / 2, z); const gb = mesh(geo(new THREE.CylinderGeometry(0.2 * kk, 0.2 * kk, La * 0.45, 12)), gm, false); gb.position.set(x, yb - La * 0.78, z); }
      label([-Bo / 2, yb - La * 0.7, 0.2], `${v.n} × P<sub>d;1</sub> = ${u_(v.Pd, 0, 'kN')}`, 'res'); }
    // önsúly
    const Lg = 2.2 * kk; arrow([0, top + Lg + 0.2, -L / 4], [0, -1, 0], Lg, COL.perm, kk); label([0, top + Lg + 0.6, -L / 4], `G<sub>stb;d</sub> = ${u_(v.Gstb, 0, 'kN')}`, 'perm');
    return { box: new THREE.Box3(new THREE.Vector3(-Wx / 2, ybot, -Lz), new THREE.Vector3(Wx / 2, top + Lg + 1, 1)), iso: [0.55, 0.5, 1], key: ['u', Math.round(Bo), Math.round(Lo), Math.round(D)].join() };
  }

  // ================== ÁLTALÁNOS ÁLLÉKONYSÁG ==================
  function buildSlope(R) {
    const p = R.input, v = R.v, m = v.m, c = v.crit, H = m.H, LX = m.LX;
    const xl = Math.min(-0.6 * H, ...m.loads.map(l => l.x0 - 2.5), c.x0 - 2), xr = Math.max(LX + 0.45 * H, c.x1 + 2.5), Lz = Math.max(12, 1.3 * H), yB = m.yBot;
    const gpts = (xa, xb) => { const q = [[xa, m.ground(xa)]]; if (xa < 0 && xb > 0) q.push([0, 0]); if (xa < LX && xb > LX) q.push([LX, -H]); q.push([xb, m.ground(xb)]); return q; };
    const yA = (x) => c.yc - Math.sqrt(Math.max(0, c.R * c.R - (x - c.xc) ** 2)); const arc = []; for (let i = 0; i <= 64; i++) { const x = c.x0 + (c.x1 - c.x0) * i / 64; arc.push([x, yA(x)]); }
    const stable = [...gpts(xl, c.x0).slice(0, -1), ...arc, ...gpts(c.x1, xr).slice(1), [xr, yB], [xl, yB]];
    const mass = [...gpts(c.x0, c.x1), ...arc.slice(1, -1).reverse()];
    const m1 = mat(TX.loess, 0.22), m2 = mat(TX.soil2, 0.22), mm = mat(TX.loess, 0.22, c.F < 1 ? 0xffb3a8 : 0xe9d4ff);
    if (p.lay2 && m.y2 > yB) { const up = clipAbove(stable, m.y2), dn = clipBelow(stable, m.y2); if (up.length > 2) mesh(ext(up, 0, -Lz), secPair(m1)); if (dn.length > 2) mesh(ext(dn, 0, -Lz), secPair(m2)); }
    else mesh(ext(stable, 0, -Lz), secPair(m1));
    const massMesh = mesh(ext(mass, 0.006, -Lz), secPair(mm));
    mesh(ext([[xl, yB], [xr, yB], [xr, yB - 1], [xl, yB - 1]], 0, -Lz), secPair(mat(TX.rock, 0.3)));
    grass(xl, 0, -Lz, -0.02, 0); grass(LX, xr, -Lz, -0.02, -H);
    // víz
    if (m.wPh) { const wp = []; for (let i = 0; i <= 60; i++) { const x = xl + (xr - xl) * i / 60; wp.push([x, m.yw(x)]); } overlay([...wp, [xr, yB], [xl, yB]], COL.water, 0.3, 0.016); line(wp.map(q => [q[0], q[1], 0.02]), COL.water, { dash: 0.5 }); label([xl + 1, m.yw(xl) + 0.4, 0.05], 'talajvízszint', 'wat'); }
    else if (m.wRu && m.ru > 0) { overlay([...gpts(xl, xr), [xr, yB], [xl, yB]], COL.water, 0.1 + m.ru * 0.5, 0.016); }
    // lamellák, csúszólap
    const S = c.slices; if (S) { const b = S[0].b, segs = []; for (let i = 1; i < S.length; i++) { const x = c.x0 + i * b; segs.push(new THREE.Vector3(x, m.ground(x), 0.02), new THREE.Vector3(x, yA(x), 0.02)); } const g = geo(new THREE.BufferGeometry().setFromPoints(segs)); const ls = new THREE.LineSegments(g, keep(new THREE.LineBasicMaterial({ color: new THREE.Color(c.F < 1 ? COL.bad : COL.perm), transparent: true, opacity: 0.55 }))); ls.renderOrder = 5; ROOT.add(ls); }
    tube(arc.map(q => [q[0], q[1], 0.04]), Math.max(0.05, H * 0.009), c.F < 1 ? COL.bad : COL.perm);
    tube(arc.map(q => [q[0], q[1], -Lz - 0.04]), Math.max(0.04, H * 0.007), c.F < 1 ? COL.bad : COL.perm);
    // középpontok
    const gr = v.sr.grid.filter(q => q.F != null); const sg = geo(new THREE.SphereGeometry(Math.max(0.07, H * 0.012), 10, 8)), smat = keep(new THREE.MeshBasicMaterial({ color: 0xffffff })); const im = new THREE.InstancedMesh(sg, smat, gr.length); const M4 = new THREE.Matrix4(), col = new THREE.Color();
    gr.forEach((q, i) => { M4.makeTranslation(q.xc, q.yc, 0.05); im.setMatrixAt(i, M4); const t = Math.max(0, Math.min(1, (q.F - 0.85) / 0.75)); col.setHSL((4 + 128 * t) / 360, 0.68, 0.5 - 0.06 * t); im.setColorAt(i, col); }); ROOT.add(im);
    sphere([c.xc, c.yc, 0.06], Math.max(0.14, H * 0.022), c.F < 1 ? COL.bad : COL.perm); const xm = (c.x0 + c.x1) / 2; line([[c.xc, c.yc, 0.06], [xm, yA(xm), 0.06]], c.F < 1 ? COL.bad : COL.perm, { dash: 0.3 });
    label([c.xc, c.yc + 0.6, 0.06], `F<sub>d</sub> = ${F(c.F, 3)} · Λ = ${F(1 / c.F, 3)}`, c.F < 1 ? 'bad' : 'perm');
    // alapok, ház, terhek
    const concM = mat(TX.conc, 0.6); const hz0 = -Math.min(Lz - 1, 9), hz1 = -1.0;
    m.loads.forEach((l) => { const hf2 = Math.min(Math.max(l.Df, 0.25), 0.5); boxAt(l.x0, l.x1, -l.Df, -l.Df + hf2, -Lz, 0.008, boxMats(concM)); if (l.Df > hf2) { const xm2 = (l.x0 + l.x1) / 2, wb = Math.min(0.3, l.B * 0.5); boxAt(xm2 - wb / 2, xm2 + wb / 2, -l.Df + hf2, 0.02, -Lz, 0.008, boxMats(concM)); } });
    if (m.loads.length) { const xs0 = Math.min(...m.loads.map(l => (l.x0 + l.x1) / 2)) - 0.15, xs1 = Math.max(...m.loads.map(l => (l.x0 + l.x1) / 2)) + 0.15, w = Math.max(1.2, xs1 - xs0), hh = Math.min(2.8, Math.max(2.2, 0.28 * H)); const wm = keep(new THREE.MeshStandardMaterial({ color: 0xeee2c6, roughness: 0.9 })), rm = keep(new THREE.MeshStandardMaterial({ color: 0xc0603d, roughness: 0.8 }));
      boxAt(xs0, xs0 + w, 0, hh, hz0, hz1, wm); const sh = new THREE.Shape([new THREE.Vector2(xs0 - 0.4, 0), new THREE.Vector2(xs0 + w + 0.4, 0), new THREE.Vector2(xs0 + w / 2, Math.min(2, w * 0.5))]); const rg = geo(new THREE.ExtrudeGeometry(sh, { depth: hz1 - hz0 + 0.8, bevelEnabled: false })); const roof = mesh(rg, rm); roof.position.set(0, hh, hz0 - 0.4);
      const kk = Math.max(0.8, H / 8); m.loads.forEach((l, i) => { arrow([(l.x0 + l.x1) / 2, hh + 0.2 + 1.6 * kk + (i ? 0 : 0), 0.4], [0, -1, 0], 1.6 * kk, COL.act, kk * 0.9); }); const same = m.loads.length === 2 && Math.abs(m.loads[0].Pd - m.loads[1].Pd) < 1e-6; label([xs0 - 0.5, hh + 0.4 + 1.6 * kk, 0.4], same ? `P<sub>d</sub> = ${u_(m.loads[0].Pd, 1, 'kN/m')} alaponként` : m.loads.map((l, i) => `P<sub>d;${i + 1}</sub> = ${u_(l.Pd, 1, 'kN/m')}`).join(' · '), 'act'); }
    const ytopV = Math.max(c.yc + 1.2, 4);
    return { box: new THREE.Box3(new THREE.Vector3(xl, yB - 1, -Lz), new THREE.Vector3(xr, ytopV, 0.5)), iso: [0.5, 0.32, 1], key: ['g', Math.round(H), Math.round(LX), Math.round(c.yc / 2)].join() };
  }

  const BUILD = { sliding: buildSliding, overturn: buildOverturn, uplift: buildUplift, slope: buildSlope };
  let FIT = null;
  function build() {
    if (!DET || !DET.result) return; const R = DET.result; clear();
    if (R.err && R.err.length) { label([0, 0, 0], 'Javítsd a bemenő adatokat.', 'bad'); dirty = true; return; }
    readCol();
    let info; try { info = BUILD[DET.tab](R); } catch (e) { console.error('3D építési hiba', e); return; }
    FIT = info; const key = DET.tab + '|' + info.key;
    // fény a jelenet méretéhez
    const sph = info.box.getBoundingSphere(new THREE.Sphere()), r = sph.radius, c = sph.center;
    sun.position.set(c.x - r * 0.9, c.y + r * 1.6, c.z + r * 1.3); sun.target.position.copy(c); Object.assign(sun.shadow.camera, { left: -r * 1.3, right: r * 1.3, top: r * 1.3, bottom: -r * 1.3, near: 0.1, far: r * 5 }); sun.shadow.camera.updateProjectionMatrix();
    fill.position.set(c.x + r, c.y + r * 0.4, c.z + r * 2);
    if (key !== lastKey) { lastKey = key; setCam('iso', false); }
    controls.maxDistance = r * 6; controls.minDistance = r * 0.25;
    dirty = true;
  }
  function camFor(preset) { if (!FIT) return null; const b = FIT.box, c = b.getCenter(new THREE.Vector3()); const dir = new THREE.Vector3(...(preset === 'front' ? [0, 0.03, 1] : preset === 'top' ? [0.0001, 1, 0.06] : FIT.iso)).normalize();
    const up = new THREE.Vector3(0, 1, 0); const right = new THREE.Vector3().crossVectors(up, dir); if (right.lengthSq() < 1e-6) right.set(1, 0, 0); right.normalize(); const upv = new THREE.Vector3().crossVectors(dir, right).normalize();
    const tv = Math.tan(camera.fov * Math.PI / 360) * 0.86, th = tv * (camera.aspect || 1.6); let d = 0; const q = new THREE.Vector3();
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) { q.set(x, y, z).sub(c); const f = q.dot(dir), rr = Math.abs(q.dot(right)), uu = Math.abs(q.dot(upv)); d = Math.max(d, f + rr / th, f + uu / tv); }
    return { pos: c.clone().add(dir.multiplyScalar(d * 1.02)), tgt: c }; }
  function setCam(preset, animate = true) { const q = camFor(preset); if (!q) return; if (!animate) { camera.position.copy(q.pos); controls.target.copy(q.tgt); controls.update(); dirty = true; return; } anim = { t0: performance.now(), p0: camera.position.clone(), t0g: controls.target.clone(), p1: q.pos, t1: q.tgt }; kick(); }
  function resize() { const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); dirty = true; }
  const vtmp = new THREE.Vector3();
  function placeLabels() { const w = host.clientWidth, h = host.clientHeight; for (const L of LBL) { vtmp.copy(L.p).project(camera); if (vtmp.z > 1 || vtmp.z < -1) { L.el.style.display = 'none'; continue; } L.el.style.display = ''; const x = (vtmp.x * 0.5 + 0.5) * w, y = (-vtmp.y * 0.5 + 0.5) * h; L.el.style.transform = `translate(${Math.round(Math.min(w - 4 - L.el.offsetWidth, Math.max(4, x - L.el.offsetWidth / 2)))}px, ${Math.round(Math.min(h - 24, Math.max(4, y - 26)))}px)`; } }
  function frame() {
    raf = 0; if (!(visible && active) || held) return;
    if (anim) { const t = Math.min(1, (performance.now() - anim.t0) / 550), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; camera.position.lerpVectors(anim.p0, anim.p1, e); controls.target.lerpVectors(anim.t0g, anim.t1, e); dirty = true; if (t >= 1) anim = null; }
    const moved = controls.update(); if (moved || dirty) { renderer.render(scene, camera); placeLabels(); dirty = false; }
    raf = requestAnimationFrame(frame);
  }
  let held = false;   // videó lejátszása közben nem rajzol
  function kick() { if (!raf && visible && active && !held) raf = requestAnimationFrame(frame); }
  window.addEventListener('sims:pause', () => { held = true; });
  window.addEventListener('sims:resume', () => { held = false; dirty = true; kick(); });
  let pend = 0; const schedule = () => { cancelAnimationFrame(pend); pend = requestAnimationFrame(() => { if (active) { resize(); build(); kick(); } }); };
  window.addEventListener('calc:update', (e) => { DET = e.detail; active = DET.view === '3d'; if (active) schedule(); });
  window.addEventListener('calc:view', (e) => { active = e.detail.view === '3d'; if (active) { const d = C.current && C.current(); if (d) DET = d; schedule(); } });
  window.addEventListener('calc:camera', (e) => setCam(e.detail.preset, true));
  window.addEventListener('themechange', () => { if (active) build(); });
  controls.addEventListener('change', () => { dirty = true; kick(); });
  new ResizeObserver(() => { resize(); kick(); }).observe(host);
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }, { threshold: 0.02 }).observe(host);
  window.CALC3D = { ok: true, renderer, scene, camera, controls, setCam, rebuild: build, get info() { return { children: ROOT.children.length, labels: LBL.length, visible, active }; } };
  // ha a 3D már aktív (pl. lassú betöltés)
  if (C.view === '3d') { DET = C.current(); active = true; schedule(); }
})();
