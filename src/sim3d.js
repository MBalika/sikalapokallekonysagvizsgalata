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
  resize() { const w = this.view.clientWidth, h = this.view.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.dirty = true; }
  loop() { if (this._raf) return; const step = () => { this._raf = null; if (!this.visible) return; const t = (performance.now() - this.t0) / 1000; this.controls.update(); if (this.tick) this.tick(t); this.renderer.render(this.scene, this.camera); this._raf = requestAnimationFrame(step); }; this._raf = requestAnimationFrame(step); }
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
    setArrow(this.aP, new THREE.Vector3(G.x1 + 0.3 + r.Rpd * k, G.yb / 2, 0.4), new THREE.Vector3(-1, 0, 0), r.Rpd * k);
    this.truck.visible = q > 0.5; this.truck.position.set(-6.5, G.ftop, -3);
    this.slide = r.lam > 1 ? Math.min(0.6, 0.25 + (r.lam - 1) * 1.2) : 0;
    this.setHud([`H<sub>d</sub> = ${fmt(r.Hd, 0)} kN/m`, `R<sub>d</sub> = ${fmt(r.Rd, 0)} kN/m`, `R<sub>p;d</sub> = ${fmt(r.Rpd, 0)} kN/m`]);
    this.lam(r.lam, drained ? `V′<sub>k</sub> = ${fmt(r.Vk, 0)} kN/m · δ = ${fmt(r.delta, 1)}°` : `A<sub>c</sub>·c<sub>u</sub>/1,1 = ${fmt(r.Rcu, 0)} · 0,4·V<sub>d</sub> = ${fmt(r.R04, 0)} kN/m`);
  }

  // ===================== FELBORULÁS: reklámtábla =====================
  build_borulas() {
    const S = this.scene; this.camera.position.set(11, 4.6, 24); this.controls.target.set(0, 4.4, -1); this.controls.minDistance = 8; this.controls.maxDistance = 36;
    this.mConc = mat(this.T.conc, 0.8); this.mClay = mat(this.T.clay, 0.5); this.mRock = mat(this.T.rock, 0.4);
    this.gr = this.ground(-30, 30, 0, -26, -6.01); this.gr2 = this.ground(-30, -9, 0, -6, 26); this.gr3 = this.ground(9, 30, 0, -6, 26);
    this.piv = new THREE.Group(); S.add(this.piv); this.bb = new THREE.Group(); this.piv.add(this.bb);
    const steel = new THREE.MeshStandardMaterial({ color: 0x59616b, metalness: 0.6, roughness: 0.4 });
    this.foot = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.mConc); this.foot.castShadow = true; this.bb.add(this.foot);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 8.3, 20), steel); col.position.y = 3.95; col.castShadow = true; this.bb.add(col);
    const c = document.createElement('canvas'); c.width = 600; c.height = 300; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 600, 300); gr.addColorStop(0, '#2a1b4d'); gr.addColorStop(1, '#7b3fe0'); g.fillStyle = gr; g.fillRect(0, 0, 600, 300); g.fillStyle = '#fff'; g.font = '800 64px Archivo, Arial'; g.fillText('ÁLLÉKONY?', 30, 130); g.font = '600 30px Arial'; g.fillStyle = '#e6dcff'; g.fillText('Mdst ≤ Mstb', 32, 190);
    const ct = new THREE.CanvasTexture(c); ct.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3, 6), [steel, steel, steel, steel, steel, new THREE.MeshStandardMaterial({ map: ct, roughness: 0.6 })]); board.rotation.y = -Math.PI / 2; board.position.y = 9.5; board.castShadow = true;
    // a képes oldal −x felé nézzen
    board.rotation.y = Math.PI / 2; this.bb.add(board);
    this.aW = arrow(0x2a86d4); this.aG = arrow(0x1f8f54); S.add(this.aW, this.aG);
    this.pres = new THREE.Group(); S.add(this.pres);
    this.state = { bo_soil: 'S' };
    this.bindAll(['bo_w', 'bo_B'], () => this.calc_borulas()); this.segAll(['bo_soil'], () => this.calc_borulas());
    this.calc_borulas();
    this.tick = (t) => { const tgt = this.tiltT ?? 0; this.tilt = (this.tilt ?? 0) + (tgt - (this.tilt ?? 0)) * 0.06; this.piv.rotation.z = -this.tilt; this.bb.children[3] && (this.bb.children[3].rotation.x = Math.sin(t * 6) * 0.004 * this.w); };
  }
  calc_borulas() {
    const v = (id) => +this.ctl(id).value, s = this.state; const w = v('bo_w'), B = v('bo_B'); this.w = w; const soil = s.bo_soil === 'S';
    const r = M.overturn({ w, B, soil });
    const yb = -1.2, h = 1.0;
    if (this._B !== B || this._soil !== soil) { this._B = B; this._soil = soil;
      if (this.soilG) { this.scene.remove(this.soilG); this.soilG.geometry.dispose(); }
      const pts = [[-12, -7], [12, -7], [12, 0], [0.25, 0], [0.25, yb + h], [B / 2, yb + h], [B / 2, yb], [-B / 2, yb], [-B / 2, yb + h], [-0.25, yb + h], [-0.25, 0], [-12, 0]];
      this.soilG = new THREE.Mesh(ext(pts, 0, -6), sec(soil ? this.mClay : this.mRock)); this.soilG.receiveShadow = true; this.scene.add(this.soilG);
      this.foot.scale.set(B, h, B); this.foot.position.set(0, yb + h / 2, -B / 2 + 0.02 + 0);
    }
    this.piv.position.set(B / 2, yb, 0); this.bb.position.set(-B / 2, -yb, 0);
    setArrow(this.aW, new THREE.Vector3(-0.2 - r.Fd / 10, 9.5, 0.6), new THREE.Vector3(1, 0, 0), r.Fd / 10);
    setArrow(this.aG, new THREE.Vector3(0, 3.0, 0.6), new THREE.Vector3(0, -1, 0), r.Gk / 120);
    // talpfeszültség-oszlopok
    this.pres.clear(); const n = 16, sm = Math.max(1, r.smax);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, x = (u - 0.5) * B; const sg = r.sig(x); if (sg <= 0.01) continue; const hh = sg / 60; const m = new THREE.Mesh(new THREE.BoxGeometry(B / n * 0.8, hh, 0.12), new THREE.MeshBasicMaterial({ color: sg > 0.7 * sm && r.e > B / 6 ? 0xd23c3c : 0xb48cff, transparent: true, opacity: 0.85 })); m.position.set(x, yb - 0.05 - hh / 2, 0.35); this.pres.add(m); }
    this.tiltT = r.lam > 1 ? Math.min(1.2, 0.35 + (r.lam - 1) * 2.5) : (r.e > B / 6 ? 0.01 * clamp((r.e - B / 6) / (B / 6), 0, 2) : 0);
    this.pres.visible = r.lam <= 1;
    this.setHud([`e = ${fmt(r.e, 2)} m`, `B/6 = ${fmt(B / 6, 2)} · B/3 = ${fmt(B / 3, 2)}`, `σ<sub>max</sub> = ${r.e < B / 2 ? fmt(r.smax, 0) + ' kPa' : '∞'}`]);
    this.lam(r.lam, `M<sub>dst;d</sub> = ${fmt(r.Mdst, 0)} · M<sub>stb;d</sub> = ${fmt(r.Mstb, 0)} kNm · ${r.e <= B / 6 ? 'teljes talp nyomott' : r.e <= B / 3 ? 'részleges elemelkedés' : 'e > B/3 – óvintézkedés'}`);
  }

  // ===================== FELÚSZÁS: mélygarázs =====================
  build_feluszas() {
    const S = this.scene; this.camera.position.set(14, 6, 38); this.controls.target.set(0, -3, -3); this.controls.minDistance = 16; this.controls.maxDistance = 70;
    this.mConc = mat(this.T.conc, 0.4); this.mSoil = mat(this.T.sand, 0.3);
    this.gr = this.ground(-60, 60, 0, -60, -8.51);
    this.box = new THREE.Group(); S.add(this.box);
    this.wMat = new THREE.MeshBasicMaterial({ color: 0x2a86d4, transparent: true, opacity: 0.3, depthWrite: false });
    this.wL = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.wMat); this.wR = this.wL.clone(); this.wB = this.wL.clone(); [this.wL, this.wR, this.wB].forEach(m => { m.position.z = 0.05; m.renderOrder = 5; S.add(m); });
    this.inW = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x3aa0ee, transparent: true, opacity: 0.4, depthWrite: false })); this.inW.renderOrder = 6; S.add(this.inW);
    this.anch = new THREE.Group(); S.add(this.anch);
    this.state = {};
    this.bindAll(['fu_gw', 'fu_t', 'fu_o', 'fu_n', 'fu_f'], () => this.calc_feluszas());
    this.calc_feluszas();
    this.tick = (t) => { const tgt = this.liftT ?? 0; this.lift = (this.lift ?? 0) + (tgt - (this.lift ?? 0)) * 0.05; this.box.position.y = this.lift; this.inW.position.y = this._inY + this.lift; this.anch.position.y = 0; };
  }
  calc_feluszas() {
    const v = (id) => +this.ctl(id).value; const gw = v('fu_gw'), t = v('fu_t'), o = v('fu_o'), n = Math.round(v('fu_n')), f = v('fu_f');
    const r = M.uplift({ gw, t, o, n, f });
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
    this.liftT = r.lam > 1 ? Math.min(0.9, 0.2 + (r.lam - 1) * 1.5) : 0;
    this.setHud([`talajvíz ${fmt(gw, 1)} m`, `V<sub>dst;d</sub> = ${fmt(r.V, 0)} kN`, `G<sub>stb;d</sub> + R<sub>d</sub> = ${fmt(r.R, 0)} kN`]);
    this.lam(r.lam, `önsúly ${fmt(r.Gk, 0)} kN · perem-talaj ${fmt(r.Grim, 0)} kN · horgony ${fmt(r.Pd, 0)} kN · víz ${fmt(r.Wf, 0)} kN`);
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
