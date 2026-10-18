/* ===== 3D szimulátorok (three.js) – elcsúszás, felborulás, felúszás, általános állékonyság ===== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const U = window.U, M = window.MECH;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = (v, d = 2) => U.fmt(v, d);
// ---- textúrák ----
function speckTex(base, spots, n, sz, seed, lines = 0) {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'); let s = seed; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = base; g.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) { g.fillStyle = spots[Math.floor(r() * spots.length)]; const rr = sz * (0.4 + r()); g.beginPath(); g.ellipse(r() * S, r() * S, rr, rr * (0.6 + r() * 0.4), r() * 3, 0, 7); g.fill(); }
  for (let k = 0; k < lines; k++) { const y = (k + 0.5) * S / lines; g.fillStyle = 'rgba(60,45,25,0.25)'; g.fillRect(0, y, S, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let TX = null;
function tex() {
  if (TX) return TX;
  TX = {
    sand: speckTex('#c8ab79', ['#b89a66', '#d6bd8e', '#a98c5c', '#dfc9a0'], 2600, 2.2, 7),
    clay: speckTex('#6e5e52', ['#62544a', '#7a6a5d', '#584b42'], 700, 4.5, 5),
    loess: speckTex('#d6c39b', ['#c9b48a', '#e2d2b0', '#bfa87c'], 2400, 2, 11),
    rock: speckTex('#9a958c', ['#7e7a72', '#b3ada3', '#6d6a64', '#c2bdb3'], 500, 8, 3),
    fill: speckTex('#b39468', ['#9f8257', '#c6a87a', '#8c7350'], 2200, 2.4, 13, 4),
    conc: speckTex('#bcb8b0', ['#aaa69e', '#cfcbc2', '#9d9991'], 1600, 1.2, 17),
    grass: speckTex('#7c9a46', ['#6d8a3c', '#8bab52', '#5f7a33'], 1800, 2.5, 19),
  };
  return TX;
}
function mat(t, rep = 0.5, color = 0xffffff, opts = {}) { const m = new THREE.MeshStandardMaterial({ map: t.clone(), color, roughness: 0.92, ...opts }); m.map.repeat.set(rep, rep); m.map.needsUpdate = true; return m; }
function sec(m) { if (!m._sec) { const c = m.clone(); c.color = m.color.clone().multiplyScalar(0.6); c.roughness = 1; m._sec = c; } return [m._sec, m]; }
function ext(pts, z0 = 0, z1 = -6, holes = []) { const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))); holes.forEach(h => s.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1]))))); const g = new THREE.ExtrudeGeometry(s, { depth: z0 - z1, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, z1); return g; }
function box(w, h, d, m, x = 0, y = 0, z = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; return o; }
function arrow(color) { const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true }); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 10), m); sh.position.y = 0.5; const hd = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.4, 14), m); hd.position.y = 1.15; g.add(sh, hd); g.renderOrder = 10; sh.renderOrder = 10; hd.renderOrder = 10; g.userData = { sh, hd }; return g; }
function setArrow(a, from, dir, len) { const d = dir.clone().normalize(); a.position.copy(from); a.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d); const L = Math.max(0.05, len - 0.4); a.userData.sh.scale.y = L; a.userData.sh.position.y = L / 2; a.userData.hd.position.y = L + 0.2; a.visible = len > 0.05; }
function house(w = 6, d = 7, h = 2.8) { const g = new THREE.Group(); const wm = new THREE.MeshStandardMaterial({ color: 0xeee2c6, roughness: 0.9 }), rm = new THREE.MeshStandardMaterial({ color: 0xc0603d, roughness: 0.8 }), gl = new THREE.MeshStandardMaterial({ color: 0x2e3a46, roughness: 0.2 });
  g.add(box(w, h, d, wm, 0, h / 2, -d / 2)); const sh = new THREE.Shape([new THREE.Vector2(-w / 2 - 0.4, 0), new THREE.Vector2(w / 2 + 0.4, 0), new THREE.Vector2(0, 2.0)]); const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: d + 0.8, bevelEnabled: false }), rm); roof.position.set(0, h, -d - 0.4); roof.castShadow = true; g.add(roof);
  g.add(box(1.1, 1.1, 0.06, gl, -w / 4, 1.5, 0.02)); g.add(box(0.9, 1.9, 0.06, new THREE.MeshStandardMaterial({ color: 0x6b4a2c }), w / 4, 0.95, 0.02)); return g; }

class Sim {
  constructor(root, mode) {
    this.root = root; this.mode = mode; this.view = root.querySelector('.view'); this.hud = root.querySelector('.hud');
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); this.renderer.setPixelRatio(Math.min(2, devicePixelRatio)); this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05; this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.view.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(38, 1.6, 0.1, 500);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement); this.controls.enableDamping = true; this.controls.dampingFactor = 0.08; this.controls.minPolarAngle = 0.25; this.controls.maxPolarAngle = 1.62; this.controls.enablePan = false;
    const hemi = new THREE.HemisphereLight(0xdfe8ff, 0x6b5a44, 1.1); this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(-12, 22, 18); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 }); this.scene.add(sun); this.sun = sun;
    const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(6, 4, 20); this.scene.add(fill);
    this.T = tex(); this.state = {}; this.anim = 0; this.visible = false; this.dirty = true; this.t0 = performance.now();
    new ResizeObserver(() => this.resize()).observe(this.view); this.resize();
    new IntersectionObserver((es) => { this.visible = es[0].isIntersecting; if (this.visible) this.loop(); }, { threshold: 0.05 }).observe(this.view);
    this['build_' + mode]();
  }
  resize() { const w = this.view.clientWidth, h = this.view.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.dirty = true; this.fitView(); }
  // a kezdő nézet a panel arányához igazodik: a megadott szélesség és magasság biztosan beleférjen
  fitView() { const F = this.fit; if (!F || this._userCam || !this.controls) return; const vf = this.camera.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * this.camera.aspect);
    const d = Math.max(F.h / 2 / Math.tan(vf), F.w / 2 / Math.tan(hf)); const dir = this.camera.position.clone().sub(this.controls.target).normalize(); this.camera.position.copy(this.controls.target).addScaledVector(dir, d); }
  loop() { if (this._raf) return; const step = () => { this._raf = null; if (!this.visible) return; const t = (performance.now() - this.t0) / 1000; this.controls.update(); if (this.tick) this.tick(t); this.renderer.render(this.scene, this.camera); if (this.post) this.post(t); this._raf = requestAnimationFrame(step); }; this._raf = requestAnimationFrame(step); }
  setHud(items) { this.hud.innerHTML = items.map(s => `<span>${s}</span>`).join(''); }
  ctl(id) { return this.root.querySelector('#' + id); }
  bindAll(ids, fn) { ids.forEach(id => { const e = this.ctl(id); if (!e) return; if (e.type === 'range') U.bindRange(id, () => fn()); }); }
  segAll(ids, fn) { ids.forEach(id => U.seg(this.root.querySelector('#' + id), (v) => { this.state[id] = v; fn(); })); }
  lam(v, sub) { const el = this.root.querySelector('.lam'); if (!el) return; const b = el.querySelector('b'), bar = el.querySelector('.bar i'), s = el.querySelector('.sub'); b.textContent = (v > 9.99 ? '> 9,99' : fmt(v, 2)); bar.style.width = clamp(v / 1.5, 0, 1) * 100 + '%'; el.classList.toggle('fail', v > 1); el.classList.toggle('warn', v > 0.9 && v <= 1); if (s && sub) s.innerHTML = sub; window.LEDGER && window.LEDGER.set(this.mode, v); }
  ground(x0, x1, y, z0 = -26, z1 = 26) { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), mat(this.T.grass, 0.25)); m.position.set((x0 + x1) / 2, y - 0.005, (z0 + z1) / 2 - 0); m.receiveShadow = true; this.scene.add(m); return m; }

  // ===================== ELCSÚSZÁS: szögtámfal =====================
  build_csuszas() {
    const S = this.scene; this.camera.position.set(4.6, 2.5, 10.8); this.controls.target.set(-0.4, 0.1, -1); this.controls.minDistance = 6; this.controls.maxDistance = 24;
    this.mConc = mat(this.T.conc, 0.8); this.mSoil = mat(this.T.sand, 0.6); this.mClay = mat(this.T.clay, 0.6); this.mFill = mat(this.T.fill, 0.7);
    this.wall = new THREE.Group(); S.add(this.wall);
    this.soilG = null; this.fillG = null; this.gr = this.ground(4, 30, 0, -6, 6);
    this.grB = this.ground(-30, -0.5, 0, -26, -6.01); this.grB.visible = false;
    this.aH = arrow(0xd23c3c); this.aR = arrow(0x1f8f54); this.aP = arrow(0x2a86d4); S.add(this.aH, this.aR, this.aP);
    // passzív földellenállás: ék + teljes (körvonal) és mobilizált (kitöltött) nyomásábra a homlokfal előtt
    this.pasWedge = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: 0x2a86d4, transparent: true, opacity: 0.2, emissive: 0x174f80, emissiveIntensity: 0.3, depthWrite: false, side: THREE.DoubleSide })); S.add(this.pasWedge);
    this.pasEdge = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x9fd0ff, dashSize: 0.14, gapSize: 0.09, depthTest: false, transparent: true })); S.add(this.pasEdge);
    this.pasFull = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x2a86d4, depthTest: false, transparent: true, opacity: 0.85 })); S.add(this.pasFull);
    this.pasFill = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.6, depthTest: false, side: THREE.DoubleSide })); S.add(this.pasFill);
    this.pasArrows = []; for (let i = 0; i < 4; i++) { const a = arrow(0x0f5fae); a.scale.setScalar(0.42); S.add(a); this.pasArrows.push(a); }
    this.truck = new THREE.Group(); { const y = new THREE.MeshStandardMaterial({ color: 0xe8a51c }), d = new THREE.MeshStandardMaterial({ color: 0x23262b }); this.truck.add(box(3.6, 1.0, 1.6, y, 0, 1.1, 0), box(1.3, 1.1, 1.6, y, 2.3, 1.2, 0)); for (const x of [-1.2, 1.2, 2.3]) for (const z of [-0.8, 0.8]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.3, 14).rotateX(Math.PI / 2), d); w.position.set(x, 0.4, z); this.truck.add(w); } } S.add(this.truck);
    const ids = ['cs_h', 'cs_B', 'cs_phi', 'cs_q', 'cs_cu'];
    this.state = { cs_typ: 'mono', cs_rp: '0', cs_dr: 'd' };
    this.bindAll(ids, () => this.calc_csuszas()); this.segAll(['cs_typ', 'cs_rp', 'cs_dr'], () => this.calc_csuszas());
    this.calc_csuszas();
    this.tick = (t) => { const u = this.slide; const tgt = u; this.uNow = (this.uNow ?? 0) + (tgt - (this.uNow ?? 0)) * 0.08; this.wall.position.x = this.uNow + Math.sin(t * 40) * (u > 0.01 ? 0.004 : 0); };
  }
  calc_csuszas() {
    const v = (id) => +this.ctl(id).value, s = this.state;
    const h = v('cs_h'), B = v('cs_B'), phi = v('cs_phi'), q = v('cs_q'), cu = v('cs_cu'); const drained = s.cs_dr === 'd';
    const r = M.sliding({ h, B, phi, q, cu, precast: s.cs_typ === 'pre', rp: +s.cs_rp, drained });
    this.root.querySelector('[data-out="cs_cu"]').closest('.rg').style.display = drained ? 'none' : '';
    // geometria: talp alja −0,9, talp 0,5, orr 0,7, szár 0,35
    const D = 0.9, tB = 0.5, toe = 0.7, st = 0.35, x1 = 1.0, x0 = x1 - B, xs1 = x1 - toe, xs0 = xs1 - st, ftop = h - D;
    const key = [h, B].join('|');
    if (key !== this._key) { this._key = key;
      if (this.soilG) { this.scene.remove(this.soilG); this.soilG.geometry.dispose(); } if (this.fillG) { this.scene.remove(this.fillG); this.fillG.geometry.dispose(); }
      const yb = -D, yt = -D + tB;
      const pts = [[-12, -6], [12, -6], [12, 0], [xs1, 0], [xs1, yt], [x1, yt], [x1, yb], [x0, yb], [x0, yt], [xs0, yt], [xs0, 0], [-12, 0]];
      this.soilG = new THREE.Mesh(ext(pts), sec(drained ? this.mSoil : this.mClay)); this.soilG.receiveShadow = true; this.scene.add(this.soilG);
      this.fillG = new THREE.Mesh(ext([[-12, 0], [xs0, 0], [xs0, ftop], [-12, ftop]]), sec(this.mFill)); this.fillG.receiveShadow = true; this.fillG.castShadow = true; this.scene.add(this.fillG);
      this.wall.clear();
      const prof = [[x0, yb], [x1, yb], [x1, yt], [xs1, yt], [xs1 - 0.03, ftop + 0.1], [xs0, ftop + 0.1], [xs0, yt], [x0, yt]];
      const w = new THREE.Mesh(ext(prof, 0.02, -6), this.mConc); w.castShadow = true; w.receiveShadow = true; this.wall.add(w);
      this.geo = { x0, x1, xs0, xs1, yb, yt, ftop, D };
    }
    this.soilG.material = sec(drained ? this.mSoil : this.mClay);
    const G = this.geo;
    // erőnyilak (méretarány: 1 m / 40 kN)
    const k = 1 / 40;
    setArrow(this.aH, new THREE.Vector3(G.x0 - 0.2 - r.Hd * k, G.yb + 0.25, 0.4), new THREE.Vector3(1, 0, 0), r.Hd * k);
    setArrow(this.aR, new THREE.Vector3(G.x1 - 0.2, G.yb - 0.25, 0.4), new THREE.Vector3(-1, 0, 0), r.Rd * k);
    const rpOn = r.Rpd > 0.01; this.aP.visible = rpOn;
    setArrow(this.aP, new THREE.Vector3(G.x1 + 0.2 + r.Rpd * k, G.yb / 3, 0.45), new THREE.Vector3(-1, 0, 0), r.Rpd * k);
    { const D = -G.yb, phR = (drained ? phi : 0) * Math.PI / 180, L = D / Math.tan(Math.PI / 4 - phR / 2), x1 = G.x1 + 0.02, z0 = 0.03, z1 = -5.5;
      const P = [[x1, G.yb], [x1, 0.01], [x1 + L, 0.01]]; const pos = [];
      const tri = (a, b, c) => pos.push(...a, ...b, ...c);
      const A0 = [P[0][0], P[0][1], z0], B0 = [P[1][0], P[1][1], z0], C0 = [P[2][0], P[2][1], z0], A1 = [P[0][0], P[0][1], z1], B1 = [P[1][0], P[1][1], z1], C1 = [P[2][0], P[2][1], z1];
      tri(A0, B0, C0); tri(A1, C1, B1); tri(A0, C0, C1); tri(A0, C1, A1); tri(B0, B1, C1); tri(B0, C1, C0);
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); this.pasWedge.geometry.dispose(); this.pasWedge.geometry = g;
      this.pasEdge.geometry.dispose(); this.pasEdge.geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x1, G.yb, 0.05), new THREE.Vector3(x1 + L, 0.02, 0.05)]); this.pasEdge.computeLineDistances();
      // nyomásábra a homlokfal előtt (a metszet síkjában): teljes = körvonal, mobilizált = kitöltés
      const sc = 0.045, pmax = r.EpFull ? 2 * r.EpFull / Math.max(0.1, D) : 0, frac = +s.cs_rp;
      const pt = (yy, f) => new THREE.Vector3(x1 + 0.0 + f * pmax * sc * ((-yy) / D), yy, 0.06);
      this.pasFull.geometry.dispose(); this.pasFull.geometry = new THREE.BufferGeometry().setFromPoints([pt(0, 0), pt(G.yb, 1), new THREE.Vector3(x1, G.yb, 0.06)]);
      const fp = [], A = pt(0, 0), Bp = pt(G.yb, frac), Cp = new THREE.Vector3(x1, G.yb, 0.06); fp.push(A.x, A.y, A.z, Bp.x, Bp.y, Bp.z, Cp.x, Cp.y, Cp.z);
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fp, 3)); this.pasFill.geometry.dispose(); this.pasFill.geometry = fg;
      this.pasArrows.forEach((a, i) => { const yy = G.yb * (i + 0.75) / 4.4, len = frac * pmax * sc * (-yy / D); a.visible = rpOn && len > 0.15; setArrow(a, new THREE.Vector3(x1 + len, yy, 0.08), new THREE.Vector3(-1, 0, 0), len); });
      for (const m of [this.pasWedge, this.pasEdge, this.pasFull, this.pasFill]) m.visible = rpOn; }
    this.truck.visible = q > 0.5; this.truck.position.set(-6.5, G.ftop, -3);
    this.slide = r.lam > 1 ? Math.min(0.6, 0.25 + (r.lam - 1) * 1.2) : 0;
    this.setHud([`H<sub>d</sub> = ${fmt(r.Hd, 0)} kN/m`, `R<sub>d</sub> = ${fmt(r.Rd, 0)} kN/m`, `R<sub>p;d</sub> = ${fmt(r.Rpd, 0)} kN/m`]);
    this.lam(r.lam, drained ? `V′<sub>k</sub> = ${fmt(r.Vk, 0)} kN/m · δ = ${fmt(r.delta, 1)}°` : `A<sub>c</sub>·c<sub>u</sub>/1,1 = ${fmt(r.Rcu, 0)} · 0,4·V<sub>d</sub> = ${fmt(r.R04, 0)} kN/m`);
  }

  // ===================== FELBORULÁS: reklámtábla – átlátszó talajtömb, 3D talpfeszültség-test, kis ablakban az egész tábla =====================
  build_borulas() {
    const S = this.scene, SZ = 6.5, DEP = 6.2; this.root.classList.add('tall'); this.resize();
    this.controls.minDistance = 5; this.controls.maxDistance = 42; this.controls.maxPolarAngle = 1.72;
    this.mConc = mat(this.T.conc, 0.8);
    // terepasztal (diorama): elöl z = SZ-nél elvágva; a tábla körüli tömb átlátszó (röntgen), körülötte rétegzett, átlátszatlan talaj
    const XW = 22, ZB = -26, mk = (t, rep, col) => mat(t, rep, col);
    this.layO = { S: [mk(this.T.clay, 0.5, 0x5b4a3c), mk(this.T.clay, 0.45), mk(this.T.sand, 0.35, 0xd8c9a8)], K: [mk(this.T.clay, 0.5, 0x5b4a3c), mk(this.T.rock, 0.4, 0xd0ccc4), mk(this.T.rock, 0.4)] };
    this.layY = [[0, -0.45], [-0.45, -3.6], [-3.6, -DEP]];
    this.terr = new THREE.Group(); S.add(this.terr); this.terrM = [];
    for (const [x0, x1, z0, z1] of [[-XW, -SZ, ZB, SZ], [SZ, XW, ZB, SZ], [-SZ, SZ, ZB, -SZ]]) {
      const gm = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2), mat(this.T.grass, 0.25)); gm.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2); gm.receiveShadow = true; this.terr.add(gm);
      this.layY.forEach(([y0, y1], i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y0 - y1, z1 - z0), this.layO.S[i]); m.position.set((x0 + x1) / 2, (y0 + y1) / 2 - 0.004, (z0 + z1) / 2); m.receiveShadow = true; m.userData.li = i; this.terr.add(m); this.terrM.push(m); });
    }
    // járda és út a tábla mögött (léptékadó)
    const walk = box(2 * XW, 0.06, 2.2, new THREE.MeshStandardMaterial({ color: 0xb9b4aa, roughness: 0.95 }), 0, 0.03, -SZ - 2.2); walk.castShadow = false; S.add(walk);
    const road = box(2 * XW, 0.04, 7, new THREE.MeshStandardMaterial({ color: 0x3d3f45, roughness: 0.9 }), 0, 0.02, -SZ - 7); road.castShadow = false; S.add(road);
    for (let i = -5; i <= 5; i++) { const st = box(2.2, 0.05, 0.16, new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }), i * 4, 0.045, -SZ - 7); st.castShadow = false; S.add(st); }
    // átlátszó talajtömb (röntgen-nézet): oldalak és alj áttetsző, a teteje áttetsző fű
    this.mSoilX = new THREE.MeshStandardMaterial({ map: this.T.clay.clone(), color: 0xffffff, transparent: true, opacity: 0.2, roughness: 1, depthWrite: false, side: THREE.DoubleSide });
    this.mSoilX.map.repeat.set(0.35, 0.35); this.mSoilX.map.needsUpdate = true;
    this.mRockX = new THREE.MeshStandardMaterial({ map: this.T.rock.clone(), color: 0xffffff, transparent: true, opacity: 0.24, roughness: 1, depthWrite: false, side: THREE.DoubleSide });
    this.mRockX.map.repeat.set(0.3, 0.3); this.mRockX.map.needsUpdate = true;
    const inv = new THREE.MeshBasicMaterial({ visible: false });
    this.blk = new THREE.Mesh(new THREE.BoxGeometry(2 * SZ, DEP, 2 * SZ), [inv, inv, inv, this.mSoilX, this.mSoilX, inv]); this.blk.position.y = -DEP / 2; this.blk.renderOrder = 5; S.add(this.blk);
    const topM = new THREE.MeshStandardMaterial({ map: this.T.grass.clone(), transparent: true, opacity: 0.38, depthWrite: false, roughness: 1, side: THREE.DoubleSide }); topM.map.repeat.set(3.2, 3.2); topM.map.needsUpdate = true;
    this.top = new THREE.Mesh(new THREE.PlaneGeometry(2 * SZ, 2 * SZ).rotateX(-Math.PI / 2), topM); this.top.position.y = 0.002; this.top.renderOrder = 6; S.add(this.top);
    const eg = []; for (const [x0, y0, z0, x1, y1, z1] of [[-SZ, 0, SZ, SZ, 0, SZ], [-SZ, -DEP, SZ, SZ, -DEP, SZ], [-SZ, 0, SZ, -SZ, -DEP, SZ], [SZ, 0, SZ, SZ, -DEP, SZ], [-SZ, 0, -SZ, SZ, 0, -SZ], [-SZ, 0, -SZ, -SZ, 0, SZ], [SZ, 0, -SZ, SZ, 0, SZ]]) eg.push(x0, y0, z0, x1, y1, z1);
    for (const y of [-0.45, -3.6]) eg.push(-SZ, y, SZ, SZ, y, SZ);
    this.blkE = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(eg, 3)), new THREE.LineBasicMaterial({ color: 0x4a3420, transparent: true, opacity: 0.75 })); S.add(this.blkE);
    // a billenő szerkezet: forgástengely-csoport → tábla
    this.piv = new THREE.Group(); S.add(this.piv); this.bb = new THREE.Group(); this.piv.add(this.bb);
    const steel = new THREE.MeshStandardMaterial({ color: 0x5d6570, metalness: 0.65, roughness: 0.38 }), dark = new THREE.MeshStandardMaterial({ color: 0x30353c, metalness: 0.5, roughness: 0.5 });
    this.foot = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mConc); this.foot.castShadow = true; this.foot.receiveShadow = true; this.bb.add(this.foot);
    this.footE = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0x3b3f46 })); this.bb.add(this.footE);
    this.bb.add(box(0.95, 0.06, 0.95, dark, 0, -0.17, 0));
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 8.2, 28), steel); col.position.y = 3.9; col.castShadow = true; this.bb.add(col);
    // tábla: −x felé néző képes oldal, hátul acél rácsváz, alatta járórács és két lámpa
    const c = document.createElement('canvas'); c.width = 800; c.height = 400; const g = window.U.richCtx(c.getContext('2d'));
    const gr = g.createLinearGradient(0, 0, 800, 400); gr.addColorStop(0, '#24163f'); gr.addColorStop(1, '#7b3fe0'); g.fillStyle = gr; g.fillRect(0, 0, 800, 400);
    g.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(640, 330, 60 + i * 46, 0, 7); g.lineWidth = 10; g.strokeStyle = 'rgba(255,255,255,0.06)'; g.stroke(); }
    g.fillStyle = '#fff'; g.font = '800 92px Archivo, Arial'; g.fillText('ÁLLÉKONY?', 40, 170); g.font = '600 44px Arial'; g.fillStyle = '#e6dcff'; g.fillText('M_{dst;d} ≤ M_{stb;d}', 44, 250);
    g.fillStyle = '#ffcf5a'; g.fillRect(44, 290, 220, 10);
    const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace; ct.anisotropy = 4;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3, 6), [new THREE.MeshStandardMaterial({ map: ct, roughness: 0.55 }), steel, steel, steel, steel, steel]); board.position.set(-0.32, 9.5, 0); board.castShadow = true; board.rotation.y = Math.PI; this.bb.add(board); this.board = board;
    for (const z of [-2.4, 0, 2.4]) this.bb.add(box(0.14, 3.0, 0.14, steel, 0, 9.5, z));
    for (const y of [8.25, 9.5, 10.75]) this.bb.add(box(0.14, 0.14, 6.0, steel, 0, y, 0));
    this.bb.add(box(1.1, 0.06, 6.2, dark, -0.2, 7.9, 0));
    for (const z of [-1.8, 1.8]) { const arm = box(1.3, 0.06, 0.06, dark, -0.95, 7.95, z); this.bb.add(arm); const lamp = box(0.32, 0.12, 0.5, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff2c0, emissiveIntensity: 0.25 }), -1.55, 8.0, z); this.bb.add(lamp); }
    // talpfeszültség-test és jelölések (nem billen)
    this.sg = new THREE.Group(); S.add(this.sg);
    this.aW = arrow(0x2a86d4); this.aG = arrow(0x1f8f54); this.aR = arrow(0xd99a00); S.add(this.aW, this.aG, this.aR);
    this.aW.scale.setScalar(1.6); this.aR.scale.setScalar(1.25);
    const ovl = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity });
    this.dot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 12), ovl(0xd99a00)); this.dot.renderOrder = 12; S.add(this.dot);
    this.pivAx = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 10).rotateX(Math.PI / 2), ovl(0xd23c3c, 0.95)); this.pivAx.renderOrder = 11; S.add(this.pivAx);
    // szél: mozgó áramvonalak a tábla előtt
    this.nW = 46; this.wp = []; const wpos = new Float32Array(this.nW * 6); let sd = 7; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < this.nW; i++) this.wp.push({ x: -16 + rr() * 15.5, y: 7.7 + rr() * 3.6, z: -3.4 + rr() * 6.8, l: 0.8 + rr() * 1.4, v: 0.7 + rr() * 0.6 });
    this.wl = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(wpos, 3)), new THREE.LineBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.75 })); this.wl.frustumCulled = false; S.add(this.wl);
    // HTML-címkék és kis ablak
    this.initLabels([['w', 'w'], ['g', 'g'], ['r', 'r'], ['e', 'r'], ['smax', 's'], ['smin', 's'], ['up', 'x'], ['piv', 'p'], ['k6', 'k6'], ['k3', 'k3']]);
    this.pip = document.createElement('button'); this.pip.type = 'button'; this.pip.className = 'pip'; this.pip.innerHTML = '<span></span>'; this.view.appendChild(this.pip);
    // nézetek: célpont, irány és a beférő szélesség/magasság – a távolság a panel arányából adódik
    this.presets = { base: { t: [0.5, -1.9, 0], d: [8.0, 3.8, 15.2], w: 11.5, h: 10 }, all: { t: [0.4, 4.6, 0], d: [17.1, 1.9, 22.6], w: 14, h: 16.5 } };
    this.vmode = 'base'; this.icam = new THREE.PerspectiveCamera(34, 0.8, 0.1, 300);
    this.presetPos = (cam, key) => { const P = this.presets[key], vf = cam.fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * cam.aspect), dist = Math.max(P.h / 2 / Math.tan(vf), P.w / 2 / Math.tan(hf)); const dir = new THREE.Vector3(...P.d).normalize(); return { p: new THREE.Vector3(...P.t).addScaledVector(dir, dist), t: new THREE.Vector3(...P.t) }; };
    const applyPreset = (cam, key, tgt) => { const q = this.presetPos(cam, key); cam.position.copy(q.p); if (tgt) tgt.copy(q.t); cam.lookAt(q.t); };
    this.applyPreset = applyPreset; this.controls.addEventListener('start', () => { this._userCam = true; });
    applyPreset(this.camera, 'base', this.controls.target); this.controls.update();
    const setPip = () => { const o = this.vmode === 'base' ? 'all' : 'base'; applyPreset(this.icam, o); this.pip.querySelector('span').textContent = o === 'all' ? 'egész tábla – kattints' : 'alaptest – kattints'; };
    setPip();
    this.pip.addEventListener('click', () => { const from = { p: this.camera.position.clone(), t: this.controls.target.clone() }; this.vmode = this.vmode === 'base' ? 'all' : 'base'; this.camTw = { from, to: this.presetPos(this.camera, this.vmode), t0: performance.now() }; this._userCam = false; setPip(); });
    this.setPip = setPip; this.fitView = () => { if (!this._userCam && !this.camTw && this.applyPreset) this.applyPreset(this.camera, this.vmode, this.controls.target); };
    this.state = { bo_soil: 'S' };
    this.bindAll(['bo_w', 'bo_B'], () => this.calc_borulas()); this.segAll(['bo_soil'], () => this.calc_borulas());
    this.calc_borulas();
    const proj = new THREE.Vector3();
    this.tick = (t) => {
      const tgt = this.tiltT ?? 0; this.tilt = (this.tilt ?? 0) + (tgt - (this.tilt ?? 0)) * 0.06; this.piv.rotation.z = -this.tilt;
      if (this.board) this.board.rotation.x = Math.sin(t * 7) * 0.0035 * this.w;
      if (this.camTw) { const k = clamp((performance.now() - this.camTw.t0) / 900, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; this.camera.position.lerpVectors(this.camTw.from.p, this.camTw.to.p, e); this.controls.target.lerpVectors(this.camTw.from.t, this.camTw.to.t, e); if (k >= 1) this.camTw = null; }
      // szél-áramvonalak
      const a = this.wl.geometry.attributes.position.array, sp = 3 + this.w * 5;
      for (let i = 0; i < this.nW; i++) { const q = this.wp[i]; q.x += sp * q.v / 60; if (q.x + q.l > -0.5) { q.x = -16; } const j = i * 6; a[j] = q.x; a[j + 1] = q.y; a[j + 2] = q.z; a[j + 3] = Math.min(-0.5, q.x + q.l); a[j + 4] = q.y; a[j + 5] = q.z; }
      this.wl.geometry.attributes.position.needsUpdate = true; this.wl.visible = this.vmode === 'all' || true;
    };
    this.post = () => {
      const W = this.view.clientWidth, Hh = this.view.clientHeight, r = this.renderer;
      // kis ablak (jobb alsó sarok)
      const iw = Math.round(clamp(W * 0.27, 130, 230)), ih = Math.round(iw * 1.22), x = W - iw - 12, y = 12;
      Object.assign(this.pip.style, { width: iw + 'px', height: ih + 'px' });
      if (Math.abs(this.icam.aspect - iw / ih) > 1e-3) { this.icam.aspect = iw / ih; this.icam.updateProjectionMatrix(); this.setPip(); }
      const dark = document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
      r.setScissorTest(true); r.setScissor(x, y, iw, ih); r.setViewport(x, y, iw, ih); r.setClearColor(dark ? 0x262a3a : 0xdfe6f1, 1); r.clear(); r.render(this.scene, this.icam);
      r.setScissorTest(false); r.setViewport(0, 0, W, Hh); r.setClearColor(0x000000, 0);
      this.updLabels([x - 30, Hh - y - ih - 14]);
    };
  }
  initLabels(defs) { this.lbls = document.createElement('div'); this.lbls.className = 'lbls'; this.view.appendChild(this.lbls); this.L = {}; this._pv = new THREE.Vector3();
    for (const [k, cls] of defs) { const el = document.createElement('span'); el.className = 'lbl3 ' + cls; this.lbls.appendChild(el); this.L[k] = { el, p: new THREE.Vector3(), on: false }; } }
  updLabels(ex) { const W = this.view.clientWidth, Hh = this.view.clientHeight, pv = this._pv;
    for (const k in this.L) { const L = this.L[k]; if (!L.on) { L.el.style.display = 'none'; continue; } pv.copy(L.p).project(this.camera); const sx = (pv.x + 1) / 2 * W, sy = (1 - pv.y) / 2 * Hh; const hide = pv.z > 1 || sx < 0 || sx > W || sy < 0 || sy > Hh || (ex && sx > ex[0] && sy > ex[1]); L.el.style.display = hide ? 'none' : ''; if (!hide) L.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%)`; } }
  setLbl(k, html, x, y, z, on = true) { const L = this.L[k]; L.on = on; if (!on) return; if (L.h !== html) { L.el.innerHTML = html; L.h = html; } L.p.set(x, y, z); }
  calc_borulas() {
    const v = (id) => +this.ctl(id).value, s = this.state; const w = v('bo_w'), B = v('bo_B'); this.w = w; const soil = s.bo_soil === 'S';
    const r = M.overturn({ w, B, soil }); const yb = -1.2, h = 1.0, ok = r.lam <= 1;
    this.blk.material = this.blk.material.map(m => m.visible === false ? m : (soil ? this.mSoilX : this.mRockX)); this.terrM.forEach(m => { m.material = this.layO[soil ? 'S' : 'K'][m.userData.li]; });
    this.foot.scale.set(B, h, B); this.foot.position.set(0, yb + h / 2, 0); this.footE.scale.copy(this.foot.scale); this.footE.position.copy(this.foot.position);
    const pX = soil ? B / 2 - B / 10 : B / 2;
    this.piv.position.set(pX, yb, 0); this.bb.position.set(-pX, -yb, 0);
    // erők
    setArrow(this.aW, new THREE.Vector3(-1.0 - r.Fd / 9, 9.5, 0), new THREE.Vector3(1, 0, 0), r.Fd / 9 / 1.6);
    setArrow(this.aG, new THREE.Vector3(-0.75, 1.5, 0), new THREE.Vector3(0, -1, 0), Math.min(1.7, 0.6 + r.Gk / 400));
    this.setLbl('w', `F<sub>w;d</sub> = ${fmt(r.Fd, 0)} kN`, -1.6 - r.Fd / 9, 10.35, 0);
    this.setLbl('g', `G<sub>k</sub> = ${fmt(r.Gk, 0)} kN`, -0.75, 1.85, 0);
    // talpfeszültség-test
    this.sg.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.sg.clear();
    const inside = r.e < B / 2;
    if (inside) {
      const x0 = r.e <= B / 6 ? -B / 2 : B / 2 - 3 * (B / 2 - r.e), sR = r.sig(B / 2), sL = r.e <= B / 6 ? r.sig(-B / 2) : 0;
      const k = Math.min(1 / 30, 4.2 / Math.max(1, sR)); this.kS = k;
      const pts = [[x0, 0], [B / 2, 0], [B / 2, -k * sR], [x0, -k * sL]]; if (sL < 1e-3) pts.pop();
      const geo = ext(pts, B / 2, -B / 2); geo.translate(0, yb - 0.004, 0);
      const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), cc = new THREE.Color();
      const stops = [[0, 0xe9e0ff], [40, 0xb48cff], [90, 0x7b3fe0], [150, 0xf08a3c], [260, 0xd7263d]];
      const heat = (sv) => { for (let i = 1; i < stops.length; i++) if (sv <= stops[i][0] || i === stops.length - 1) { const u = clamp((sv - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]), 0, 1); return cc.set(stops[i - 1][1]).lerp(new THREE.Color(stops[i][1]), u); } };
      for (let i = 0; i < pos.count; i++) { const sv = r.sig(clamp(pos.getX(i), -B / 2, B / 2) + (pos.getX(i) <= x0 + 1e-6 ? 1e-6 : 0)); heat(sv); col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pm = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, emissive: 0x1d1030, emissiveIntensity: 0.6, transparent: true, opacity: 0.94 })); pm.renderOrder = 4; this.sg.add(pm);
      // rácsvonalak: ordináták az elülső lapon, hosszvonalak az alsó ferde lapon
      const L1 = [], L2 = [], N = 10; const yS = (x) => yb - k * r.sig(x <= x0 ? x0 + 1e-6 : x);
      for (let i = 0; i <= N; i++) { const x = x0 + (B / 2 - x0) * i / N, yy = yS(x); L1.push(x, yb, B / 2 + 0.01, x, yy, B / 2 + 0.01); L2.push(x, yy - 0.005, -B / 2, x, yy - 0.005, B / 2); }
      for (let j = 0; j <= 4; j++) { const z = -B / 2 + B * j / 4; L2.push(x0, yS(x0) - 0.005, z, B / 2, yS(B / 2) - 0.005, z); }
      const ln = (arr, color, op) => { const o = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op })); this.sg.add(o); return o; };
      ln(L1, 0xffffff, 0.85); ln(L2, 0x2a1b4d, 0.5);
      const ol = []; const P = pts.map(p => [p[0], yb + p[1] - 0.004]); for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; ol.push(a[0], a[1], B / 2 + 0.012, b[0], b[1], B / 2 + 0.012); } ln(ol, 0xffffff, 1);
      this.setLbl('smax', `σ<sub>max</sub> = ${fmt(sR, 0)} kPa`, B / 2 + 0.25, yb - k * sR - 0.3, B / 2);
      this.setLbl('smin', `σ<sub>min</sub> = ${fmt(sL, 0)} kPa`, -B / 2 - 0.2, yb - k * sL - 0.3, B / 2, r.e <= B / 6);
      // elemelkedő rész
      if (x0 > -B / 2 + 1e-3) { const wU = x0 + B / 2; const up = new THREE.Mesh(new THREE.BoxGeometry(wU, 0.07, B), new THREE.MeshBasicMaterial({ color: 0xe0302a, transparent: true, opacity: 0.55, depthWrite: false })); up.position.set(-B / 2 + wU / 2, yb - 0.04, 0); up.renderOrder = 7; this.sg.add(up); this.setLbl('up', 'elemelkedő rész', -B / 2 + wU / 2, yb - 0.45, B / 2 + 0.2); } else this.setLbl('up', '', 0, 0, 0, false);
      // mag (B/6) és B/3 határ a talpsíkban, eredő döféspontja
      const ov = (arr, color, op = 1) => { const o = ln(arr, color, op); o.material.depthTest = false; o.renderOrder = 13; return o; };
      const zz = B / 2 + 0.35; ov([-B / 6, yb, -zz, -B / 6, yb, zz, B / 6, yb, -zz, B / 6, yb, zz], 0x1fbf73); ov([B / 3, yb, -zz, B / 3, yb, zz], 0xf0a020);
      ov([0, yb, zz + 0.25, Math.min(r.e, B / 2), yb, zz + 0.25, 0, yb - 0.12, zz + 0.25, 0, yb + 0.12, zz + 0.25, r.e, yb - 0.12, zz + 0.25, r.e, yb + 0.12, zz + 0.25], 0xd99a00);
      this.setLbl('k6', '±B/6', -B / 6, yb + 0.2, zz + 0.12); this.setLbl('k3', 'B/3', B / 3, yb + 0.2, zz + 0.12);
    } else { for (const k of ['smax', 'smin', 'up', 'k6', 'k3']) this.setLbl(k, '', 0, 0, 0, false); }
    const eP = Math.min(r.e, B / 2), d = new THREE.Vector3(r.Fk, -r.Gk, 0).normalize();
    this.dot.position.set(eP, yb, 0); this.dot.material.color.set(r.e <= B / 6 ? 0x1fbf73 : r.e <= B / 3 ? 0xd99a00 : 0xd23c3c);
    setArrow(this.aR, new THREE.Vector3(eP, yb, 0).addScaledVector(d, -3.6), d, 3.6 / 1.25);
    this.setLbl('r', `R<sub>k</sub> eredő`, eP - d.x * 3.9, yb - d.y * 3.9 + 0.2, 0);
    this.setLbl('e', `e = ${fmt(r.e, 2)} m`, eP / 2, yb - 0.5, B / 2 + 0.6);
    this.pivAx.scale.set(1, 1, B + 1.0); this.pivAx.position.set(pX, yb, 0);
    this.setLbl('piv', soil ? 'forgástengely (B/10)' : 'forgástengely (sarok)', pX + 0.3, yb - 0.25, -B / 2 - 0.9);
    this.sg.visible = ok; this.aR.visible = ok; this.dot.visible = ok;
    for (const k of ['smax', 'smin', 'up', 'k6', 'k3', 'e', 'r']) if (!ok) this.L[k].on = false;
    this.tiltT = r.lam > 1 ? Math.min(0.9, 0.35 + (r.lam - 1) * 2.5) : (r.e > B / 6 ? 0.012 * clamp((r.e - B / 6) / (B / 6), 0, 2) : 0);
    this.setHud([`e = ${fmt(r.e, 2)} m`, `B/6 = ${fmt(B / 6, 2)} · B/3 = ${fmt(B / 3, 2)} m`, `σ<sub>max</sub> = ${inside ? fmt(r.smax, 0) + ' kPa' : '∞'}`, inside && ok ? `lépték: 1 m ≙ ${fmt(1 / this.kS, 0)} kPa` : 'a tábla felborul']);
    this.lam(r.lam, `M<sub>dst;d</sub> = ${fmt(r.Mdst, 0)} · M<sub>stb;d</sub> = ${fmt(r.Mstb, 0)} kNm · ${r.e <= B / 6 ? 'teljes talp nyomott' : r.e <= B / 3 ? `nyomott hossz ${fmt(3 * (B / 2 - r.e), 2)} m` : r.e < B / 2 ? 'e > B/3 – óvintézkedés kell' : 'e > B/2'}`);
  }

  // ===================== FELÚSZÁS: mélygarázs =====================
  build_feluszas() {
    const S = this.scene; this.camera.position.set(8, 3.5, 44); this.controls.target.set(0, -2.6, -3); this.controls.minDistance = 16; this.controls.maxDistance = 110; this.fit = { w: 48, h: 21 }; this.fitView(); this.controls.addEventListener('start', () => { this._userCam = true; });
    this.mConc = mat(this.T.conc, 0.4); this.mSoil = mat(this.T.sand, 0.3);
    this.gr = this.ground(-60, 60, 0, -60, -8.51);
    this.box = new THREE.Group(); S.add(this.box);
    this.wMat = new THREE.MeshBasicMaterial({ color: 0x2f8fe0, transparent: true, opacity: 0.42, depthWrite: false });
    this.wL = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.wMat); this.wR = this.wL.clone(); this.wB = this.wL.clone(); [this.wL, this.wR, this.wB].forEach(m => { m.position.z = 0.05; m.renderOrder = 5; S.add(m); });
    this.inW = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x3aa0ee, transparent: true, opacity: 0.4, depthWrite: false })); this.inW.renderOrder = 6; S.add(this.inW);
    this.anch = new THREE.Group(); S.add(this.anch);
    this.fric = new THREE.Group(); S.add(this.fric); this.fArr = []; this.pArr = [];
    for (let i = 0; i < 24; i++) { const a = arrow(0x1f9d55); a.scale.setScalar(2.0); this.fric.add(a); this.fArr.push(a); const b = arrow(0x2a86d4); b.scale.setScalar(1.7); this.fric.add(b); this.pArr.push(b); }
    this.upA = []; for (let i = 0; i < 9; i++) { const a = arrow(0x2a86d4); a.scale.setScalar(2.2); S.add(a); this.upA.push(a); }
    this.gA = arrow(0x1f8f54); this.gA.scale.setScalar(2.6); S.add(this.gA);
    this.gwL = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0x1f6fd0, dashSize: 0.8, gapSize: 0.4, depthTest: false, transparent: true })); this.gwL.renderOrder = 11; S.add(this.gwL);
    this.initLabels([['gw', 'w'], ['up', 'w'], ['g', 'g'], ['pr', 'w'], ['fr', 'g']]); this.post = () => this.updLabels();
    this.pOut = []; for (let i = 0; i < 2; i++) { const l = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x2a86d4, depthTest: false, transparent: true })); l.renderOrder = 11; this.fric.add(l); this.pOut.push(l); }
    this.state = { fu_fr: '0' };
    this.segAll(['fu_fr'], () => this.calc_feluszas());
    this.bindAll(['fu_gw', 'fu_t', 'fu_o', 'fu_n', 'fu_f'], () => this.calc_feluszas());
    this.calc_feluszas();
    this.tick = (t) => { const tgt = this.liftT ?? 0; this.lift = (this.lift ?? 0) + (tgt - (this.lift ?? 0)) * 0.05; this.box.position.y = this.lift; this.inW.position.y = this._inY + this.lift; this.anch.position.y = 0; };
  }
  calc_feluszas() {
    const v = (id) => +this.ctl(id).value; const gw = v('fu_gw'), t = v('fu_t'), o = v('fu_o'), n = Math.round(v('fu_n')), f = v('fu_f');
    const fr = this.state.fu_fr === '1' ? 1 : 0; const r = M.uplift({ gw, t, o, n, f, fr });
    const bot = -6, X = 15 + o;
    const key = [t, o].join('|');
    if (key !== this._key) { this._key = key;
      if (this.soilG) { this.scene.remove(this.soilG); this.soilG.geometry.dispose(); }
      this.soilG = new THREE.Mesh(ext([[-36, -18], [36, -18], [36, 0], [X, 0], [X, bot], [-X, bot], [-X, 0], [-36, 0]], 0, -8.5), sec(this.mSoil)); this.soilG.receiveShadow = true; this.scene.add(this.soilG);
      this.box.clear(); const D = 8.5, z = 0.02, m = this.mConc;
      const add = (w, h, d, x, y, zz) => { this.box.add(box(w, h, d, m, x, y, zz)); };
      add(30, 0.35, D, 0, -0.175, z - D / 2); add(23.2, 0.3, D, -3, -3.0, z - D / 2); add(0.4, 6, D, -14.8, -3, z - D / 2); add(0.4, 6, D, 14.8, -3, z - D / 2); add(30, 6, 0.4, 0, -3, z - D + 0.2);
      add(30 + 2 * o, t, D, 0, bot + t / 2, z - D / 2);
      for (const x of [-9, -3, 3, 9]) { add(0.45, 2.6, 0.45, x, -1.6, -3.5); add(0.45, 6 - 3.3 - t, 0.45, x, (bot + t - 3.15) / 2, -3.5); }
      const cc = [0xc0392b, 0x2e86de, 0xdfe4ea, 0x2d3436, 0xf0a33a, 0x6c5ce7]; let k = 0; for (const y of [-2.85, bot + t]) for (const x of [-11, -5, 1]) { const car = new THREE.Group(); const cm = new THREE.MeshStandardMaterial({ color: cc[k++ % 6], roughness: 0.4, metalness: 0.3 }); car.add(box(4.2, 0.65, 1.8, cm, 0, 0.55, 0), box(2.2, 0.55, 1.6, new THREE.MeshStandardMaterial({ color: 0x24303a }), -0.2, 1.15, 0)); car.position.set(x, y, -2.4); this.box.add(car); }
    }
    // horgonyok
    this.anch.clear(); const sm = new THREE.MeshStandardMaterial({ color: 0x8a929b, metalness: 0.6, roughness: 0.4 }); const nv = Math.min(n, 14);
    for (let i = 0; i < nv; i++) { const x = nv === 1 ? 0 : -13 + 26 * i / (nv - 1); const a = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 8, 8), sm); a.position.set(x, bot - 4, -0.3); this.anch.add(a); }
    // talajvíz
    const top = Math.min(gw, 0), hw = Math.max(0, top - (-18));
    this.wL.scale.set(36 - X, hw, 1); this.wL.position.set(-(X + 36) / 2, -18 + hw / 2, 0.05); this.wR.scale.copy(this.wL.scale); this.wR.position.set((X + 36) / 2, -18 + hw / 2, 0.05);
    const hb = Math.max(0.001, Math.min(top, bot) - (-18)); this.wB.scale.set(2 * X, hb, 1); this.wB.position.set(0, -18 + hb / 2, 0.05);
    this.inW.visible = f > 0.01; this.inW.scale.set(29.0, Math.max(0.001, f), 8.0); this._inY = bot + t + f / 2; this.inW.position.set(0, this._inY, -4.25);
    // oldalfal-súrlódás: földnyomás (kék, a fal felé) és súrlódás (zöld, lefelé) a metszetsíkban, a fal külső oldalán
    this.fric.visible = !!fr;
    if (fr) { const sv = (d) => d <= r.zw ? 19 * d : 19 * r.zw + 10 * (d - r.zw), sc = 0.16, depths = [0.7, 2.1, 3.5, 4.9];
      let k = 0; for (const sgn of [-1, 1]) { const xw = sgn * X; const pts = [new THREE.Vector3(xw - sgn * 0.02, 0, 0.12)];
        for (let d = 0; d <= 6.001; d += 0.25) pts.push(new THREE.Vector3(xw - sgn * (0.02 + sc * r.K0 * sv(d) * 0.5), -d, 0.12)); pts.push(new THREE.Vector3(xw - sgn * 0.02, -6, 0.12));
        this.pOut[sgn < 0 ? 0 : 1].geometry.setFromPoints(pts.map(p => new THREE.Vector3(2 * xw - p.x, p.y, p.z)));
        depths.forEach((d, i) => { const ph = r.K0 * sv(d), len = Math.max(0.25, sc * ph * 0.5), a = this.pArr[k], b = this.fArr[k]; k++;
          setArrow(a, new THREE.Vector3(xw + sgn * (len + 0.05), -d, 0.12), new THREE.Vector3(-sgn, 0, 0), len / 1.7); a.visible = true;
          const tl = Math.max(0.6, ph * r.tgd * 0.2), dm = Math.min(5.6, d + 0.7); setArrow(b, new THREE.Vector3(xw + sgn * 0.3, -dm + tl / 2, 0.14), new THREE.Vector3(0, -1, 0), tl / 2.0); b.visible = true; }); }
      for (; k < 24; k++) { this.pArr[k].visible = false; this.fArr[k].visible = false; } }
    if (fr) { this.setLbl('pr', `földnyomás σ′<sub>h</sub> = K<sub>0</sub> · σ′<sub>v</sub>`, -X - 3.2, -2.2, 0.2); this.setLbl('fr', `súrlódás τ = σ′<sub>h</sub> · tg δ – lefelé hat`, X + 1.2, -6.9, 0.2); } else { this.setLbl('pr', '', 0, 0, 0, false); this.setLbl('fr', '', 0, 0, 0, false); }
    // talajvízszint, felhajtóerő (víznyomás a lemez alatt), önsúly
    const hwB = Math.max(0, Math.min(gw, 0) - bot); this.gwL.visible = gw > -18; this.gwL.geometry.setFromPoints([new THREE.Vector3(-36, Math.min(gw, 0), 0.15), new THREE.Vector3(36, Math.min(gw, 0), 0.15)]); this.gwL.computeLineDistances();
    this.setLbl('gw', `▽ tervezési talajvízszint ${fmt(gw, 1)} m`, -X - 9, Math.min(gw, 0) + 0.7, 0.2);
    this.upA.forEach((a, i) => { const x = -X + 1.5 + (2 * X - 3) * i / 8, len = hwB * 0.5; a.visible = len > 0.2; setArrow(a, new THREE.Vector3(x, bot - 0.08 - len, 0.2), new THREE.Vector3(0, 1, 0), len / 2.2); });
    this.setLbl('up', `víznyomás alulról: u = γ<sub>w</sub> · h<sub>w</sub> = ${fmt(10 * hwB, 0)} kPa → V<sub>dst;d</sub>`, 0, bot - hwB * 0.5 - 1.3, 0.2, hwB > 0.2);
    setArrow(this.gA, new THREE.Vector3(5.5, 5.5, 0.2), new THREE.Vector3(0, -1, 0), 4.6 / 2.6); this.setLbl('g', `G<sub>stb;d</sub> = 0,9 · G<sub>k</sub>`, 5.5, 6.4, 0.2);
    this.liftT = r.lam > 1 ? Math.min(0.9, 0.2 + (r.lam - 1) * 1.5) : 0;
    this.setHud([`talajvíz ${fmt(gw, 1)} m`, `V<sub>dst;d</sub> = ${fmt(r.V, 0)} kN`, `G<sub>stb;d</sub> + R<sub>d</sub> = ${fmt(r.R, 0)} kN`].concat(fr ? [`T<sub>d</sub> = ${fmt(r.Td, 0)} kN`] : []));
    this.lam(r.lam, `önsúly ${fmt(r.Gk, 0)} kN · perem-talaj ${fmt(r.Grim, 0)} kN · horgony ${fmt(r.Pd, 0)} kN · víz ${fmt(r.Wf, 0)} kN · súrlódás ${fmt(r.Td, 0)} kN`);
  }

  // ===================== ÁLTALÁNOS ÁLLÉKONYSÁG: ház a rézsű koronáján =====================
  build_altalanos() {
    const S = this.scene; this.camera.position.set(14, 4, 30); this.controls.target.set(2, -3, -3); this.controls.minDistance = 12; this.controls.maxDistance = 60;
    this.mSoil = mat(this.T.loess, 0.35); this.mMass = mat(this.T.loess, 0.35, 0xffd9c4);
    this.piv = new THREE.Group(); S.add(this.piv); this.inner = new THREE.Group(); this.piv.add(this.inner);
    this.h = house(3.0, 7, 2.6); this.inner.add(this.h);
    this.arcLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xd23c3c, dashSize: 0.5, gapSize: 0.3, linewidth: 2, depthTest: false })); this.arcLine.renderOrder = 9; S.add(this.arcLine);
    this.state = { al_slope: '1.5', al_gm: '1.35' };
    this.bindAll(['al_s', 'al_ru'], () => this.calc_altalanos()); this.segAll(['al_slope', 'al_gm'], () => this.calc_altalanos());
    this.calc_altalanos();
    this.tick = (t) => { const tgt = this.rotT ?? 0; this.rot = (this.rot ?? 0) + (tgt - (this.rot ?? 0)) * 0.05; this.piv.rotation.z = this.rot; };
  }
  calc_altalanos() {
    const v = (id) => +this.ctl(id).value, st = this.state; const s = v('al_s'), ru = v('al_ru'), n = +st.al_slope, gm = +st.al_gm;
    const r = M.slope({ s, ru, n, gm });
    const H = 8, LX = H * n; const c = r.circ;
    const XA = c ? c.xc - Math.sqrt(Math.max(0, c.r * c.r - c.yc * c.yc)) : -4;
    const arc = (a0, a1, k = 40) => { const p = []; for (let i = 0; i <= k; i++) { const a = a0 + (a1 - a0) * i / k; p.push([c.xc + c.r * Math.cos(a), c.yc + c.r * Math.sin(a)]); } return p; };
    [this.stG, this.msG, this.grA, this.grB, this.grC].forEach(o => { if (o) { (o.parent || this.scene).remove(o); o.geometry.dispose(); } });
    if (c) {
      const aT = Math.atan2(-H - c.yc, c.x1 - c.xc), aA = Math.atan2(-c.yc, XA - c.xc);
      const yExit = -H * Math.min(1, Math.max(0, c.x1 / LX));
      const surfPts = (xa, xb) => { const p = [[xa, 0]]; if (xa < 0 && xb > 0) p.push([0, 0]); if (xb > LX) p.push([LX, -H]); p.push([xb, xb <= 0 ? 0 : xb >= LX ? -H : -H * xb / LX]); return p; };
      const stable = [[-24, -20], [-24, 0], ...arc(aA, aT).slice(0, -1), [c.x1, yExit], ...(c.x1 < LX ? [[LX, -H]] : []), [30, -H], [30, -20]];
      const mass = [...surfPts(XA, c.x1), ...arc(aT, aA).slice(1, -1)];
      this.stG = new THREE.Mesh(ext(stable, 0, -10), sec(this.mSoil)); this.msG = new THREE.Mesh(ext(mass, 0.01, -10), this.mMass);
      this.stG.receiveShadow = true; this.msG.receiveShadow = true; this.msG.castShadow = true; this.scene.add(this.stG);
      this.piv.position.set(c.xc, c.yc, 0); this.inner.position.set(-c.xc, -c.yc, 0); this.inner.add(this.msG);
      const ap = arc(aA, aT, 60).map(p => new THREE.Vector3(p[0], p[1], 0.08)); this.arcLine.geometry.dispose(); this.arcLine.geometry = new THREE.BufferGeometry().setFromPoints(ap); this.arcLine.computeLineDistances();
    }
    this.grA = this.ground(-60, -24, 0, -60, 60); this.grB = this.ground(30, 60, -H, -60, 60);
    const gm2 = mat(this.T.grass, 0.25); this.grC = new THREE.Mesh(new THREE.PlaneGeometry(54, 50).rotateX(-Math.PI / 2), gm2); this.grC.position.set(3, -H - 0.01, -35); this.scene.add(this.grC);
    // ház (a csúszó tömegen, ha rajta van)
    this.h.position.set(-s - 1.2, 0, 0.01);
    this.rotT = r.lam > 1 ? Math.min(0.22, 0.05 + (r.lam - 1) * 0.5) : 0;
    this.setHud([`F<sub>d</sub> = ${fmt(r.F, 2)}`, `hátrahúzás ${fmt(s, 1)} m`, `r<sub>u</sub> = ${fmt(ru, 2)}`]);
    this.lam(r.lam, `mértékadó kör: középpont (${fmt(c ? c.xc : 0, 1)}; ${fmt(c ? c.yc : 0, 1)}) m, r = ${fmt(c ? c.r : 0, 1)} m · egyszerűsített Bishop`);
  }
}
document.querySelectorAll('.sim[data-sim]').forEach(el => { try { el._sim = new Sim(el, el.dataset.sim); } catch (e) { console.error('3D hiba', e); el.querySelector('.view').innerHTML = '<p style="padding:20px">A 3D nézethez WebGL kell.</p>'; } });
