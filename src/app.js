/* ===== Síkalapok állékonyságvizsgálata – alap UI ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const fmt = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString('hu-HU', { minimumFractionDigits: d, maximumFractionDigits: d });
function H(tag, attrs = {}, html) { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
const css = (name, el = document.documentElement) => getComputedStyle(el).getPropertyValue(name).trim();
function fillRange(r) { const p = (r.value - r.min) / (r.max - r.min) * 100; r.style.setProperty('--p', p + '%'); }
function bindRange(id, onInput, fmtFn) {
  const r = document.getElementById(id); if (!r) return null; const out = document.querySelector(`[data-out="${id}"]`);
  const upd = () => { fillRange(r); if (out) out.textContent = fmtFn ? fmtFn(+r.value) : (r.dataset.fmt ? fmt(+r.value, +r.dataset.fmt) : r.value) + (r.dataset.u || ''); onInput && onInput(+r.value); };
  r.addEventListener('input', upd); upd(); return r;
}
function seg(container, onPick) { const el = typeof container === 'string' ? document.getElementById(container) : container; if (!el) return; el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || !el.contains(b)) return; $$('button', el).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); onPick(b.dataset.v, b); }); }
// HiDPI vászon: logikai méret (w×h), visszaad: ctx
// vászon: alsó index jelölés „H_d”, „R_{p;d}” – a fillText/measureText index-tudatos
function richCtx(ctx) {
  if (ctx.__rich) return ctx; ctx.__rich = true;
  const ofill = ctx.fillText.bind(ctx), omeas = ctx.measureText.bind(ctx);
  const parse = (s) => { const out = []; let i = 0, buf = ''; while (i < s.length) { const ch = s[i]; if (ch === '_' && i + 1 < s.length) { if (buf) { out.push({ t: buf, k: 0 }); buf = ''; } if (s[i + 1] === '{') { const j = s.indexOf('}', i + 2); out.push({ t: s.slice(i + 2, j < 0 ? s.length : j), k: 1 }); i = j < 0 ? s.length : j + 1; } else { out.push({ t: s[i + 1], k: 1 }); i += 2; } continue; } buf += ch; i++; } if (buf) out.push({ t: buf, k: 0 }); return out; };
  const fsz = () => { const m = /(\d+(?:\.\d+)?)px/.exec(ctx.font); return m ? +m[1] : 14; };
  const sub = (f, z) => f.replace(/(\d+(?:\.\d+)?)px/, (z * 0.66).toFixed(2) + 'px');
  const width = (parts, f, z) => { let w = 0; for (const p of parts) { if (p.k) { ctx.font = sub(f, z); w += omeas(p.t).width + 1; ctx.font = f; } else w += omeas(p.t).width; } return w; };
  ctx.fillText = (s, x, y, mw) => { s = String(s); if (s.indexOf('_') < 0) return ofill(s, x, y, mw);
    const parts = parse(s), f = ctx.font, z = fsz(), W = width(parts, f, z), al = ctx.textAlign, bl = ctx.textBaseline;
    let cx = al === 'center' ? x - W / 2 : (al === 'right' || al === 'end') ? x - W : x; const dy = bl === 'top' || bl === 'hanging' ? z * 0.5 : bl === 'middle' ? z * 0.3 : z * 0.2;
    ctx.textAlign = 'left'; for (const p of parts) { if (p.k) { ctx.font = sub(f, z); ofill(p.t, cx + 0.5, y + dy); cx += omeas(p.t).width + 1; ctx.font = f; } else { ofill(p.t, cx, y); cx += omeas(p.t).width; } } ctx.textAlign = al; };
  ctx.measureText = (s) => { s = String(s); if (s.indexOf('_') < 0) return omeas(s); return { width: width(parse(s), ctx.font, fsz()) }; };
  return ctx;
}
function hiCanvas(cv, w, h) { const dpr = Math.min(2, devicePixelRatio || 1); cv.width = w * dpr; cv.height = h * dpr; const g = richCtx(cv.getContext('2d')); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g; }
// sortörés-őr: képlet, szám + mértékegység, jelölés soha ne törjön meg (NBSP / U+202F / U+2011)
const NB = '\u00A0', NN = '\u202F', UNITS = 'kN/m³|kN/m²|kN/m|kNm|kPa|MPa|MNm|MN|mBf|m²|m³|mm|cm|km|kN|m|°|%|db';
const G_OPS = /\s([=≤≥<>≈×±→+−\/])\s/g, G_DOT = /\s·\s(?![A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű]{3})/g, G_RAT = /(\d)\s:\s(\d)/g, G_UNIT = new RegExp('(\\d)\\s(' + UNITS + ')(?![A-Za-z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ])', 'g'), G_FN = /(^|[\s(])(tg|ctg|sin|cos|tan|kb\.|pl\.|ill\.|ún\.|max\.|min\.)\s/g, G_ART = /(^|\s)(a|az|s|e|egy|és|A|Az|Egy)\s/g, G_NUM = /(^|[\s(])(két|kettő|három|négy|öt|hat|hét|nyolc|kilenc|tíz|tizenkét|húsz|harminc|száz|ezer|első|második|harmadik|negyedik|ötödik|mindkét|néhány|Két|Három|Négy|Öt|Hat|Hét|Nyolc|Kilenc|Tíz|Első|Második|Harmadik|Negyedik|Ötödik|Mindkét|Néhány)\s/g, G_DIGW = /(\d)\s(?=[a-záéíóöőúüű]{2,})/g, G_THOU = /(\d)\s(\d{3})(?!\d)/g, G_ID = /\b(DA|EN|MSZ EN|STR|GEO)-(\d)/g;
function guardText(root = document.body) {
  if (!root) return; const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => n.parentElement && !n.parentElement.closest('script,style,textarea,code,pre,option') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
  let n; const todo = []; while ((n = w.nextNode())) todo.push(n);
  for (const nd of todo) { const t0 = nd.nodeValue; if (!/[\s-]/.test(t0)) continue;
    let t = t0.replace(G_OPS, NB + '$1' + NB).replace(G_OPS, NB + '$1' + NB).replace(G_DOT, NB + '·' + NB).replace(G_RAT, '$1' + NB + ':' + NB + '$2').replace(/-([a-záéíóöőúüű]{1,5})(?=[\s.,;:!?)]|$)/g, '\u2011$1').replace(/\(([^\s()]{1,12}) /g, '(' + '$1' + NB).replace(G_UNIT, '$1' + NB + '$2').replace(G_FN, '$1$2' + NB).replace(G_ART, '$1$2' + NB).replace(G_NUM, '$1$2' + NB).replace(G_DIGW, '$1' + NB).replace(G_THOU, '$1\u202F$2').replace(G_ID, '$1\u2011$2');
    t = t.replace(/([0-9A-Za-zÀ-ž½⅓⅔¼¾])–([0-9A-Za-zÀ-ž½⅓⅔¼¾])/g, '$1\u2060–\u2060$2');
    t = t.replace(/^\s([=≤≥<>≈×±→+−])/, NB + '$1').replace(/([=≤≥<>≈×±→+−])\s$/, '$1' + NB);
    if (t !== t0) nd.nodeValue = t; }
}
// összetartozó szócsoportok: felsorolás-tagok (· és ; között), rövid zárójeles részek, szakkifejezések egy egységben
const BLOCKSEL = 'p,li,td,th,dd,dt,figcaption,h2,h3,h4,label,.w>div,.expl,.sub,.ro span,.opt,.tf,.small,.note,.lead,.vi span,.case p';
const TERMS = ['kedvező esetleges', 'kedvezőtlen esetleges', 'kedvező állandó', 'kedvezőtlen állandó', 'esetleges teher', 'esetleges hatás', 'állandó teher', 'esetleges felborító', 'kritikus állapotbeli', 'drénezetlen nyírószilárdság', 'belső mag', 'belső magon', 'hasznos szélesség', 'hasznos alapfelület', 'passzív földellenállás', 'aktív földnyomás', 'tervezési érték', 'tervezési értéke', 'karakterisztikus érték', 'karakterisztikus értéke', 'parciális tényező', 'általános állékonyság', 'tervezési módszer', 'nemzeti melléklet', 'globális biztonság', 'talpfeszültség', 'nyomott hossz'];
const TERM_RX = new RegExp('(' + TERMS.map(x => x.replace(/ /g, '\\s')).join('|') + ')', 'gi');
function groupGuard(block) {
  const nodes = []; const w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null); let n; while ((n = w.nextNode())) { const pe = n.parentElement; if (!pe || pe.closest('script,style,textarea,code,pre') || pe.closest(BLOCKSEL) !== block) continue; nodes.push(n); }
  if (!nodes.length) return; const full = nodes.map(x => x.nodeValue).join(''); if (full.length < 8) return;
  const mark = new Uint8Array(full.length);
  const fs = parseFloat(getComputedStyle(block).fontSize) || 16, cpl = (block.clientWidth || 600) / (0.5 * fs);
  const SEG = Math.max(14, Math.min(38, Math.round(cpl * 0.42))), PAR = Math.max(12, Math.min(24, Math.round(cpl * 0.3)));
  const markSpaces = (a, b) => { for (let i = a; i < b; i++) if (full[i] === ' ') mark[i] = 1; };
  // felsorolás-tagok
  const sepRx = / · |; | – /g; let last = 0, m; const segs = [];
  while ((m = sepRx.exec(full))) { segs.push([last, m.index]); last = m.index + m[0].length; } segs.push([last, full.length]);
  if (segs.length > 1) for (const [a, b] of segs) { const txt = full.slice(a, b).trim(); if (txt.length && txt.length <= SEG) markSpaces(a, b); }
  // rövid zárójeles részek
  const parRx = new RegExp('\\([^()]{1,' + PAR + '}\\)', 'g'); while ((m = parRx.exec(full))) markSpaces(m.index, m.index + m[0].length);
  // szakkifejezések
  TERM_RX.lastIndex = 0; while ((m = TERM_RX.exec(full))) markSpaces(m.index, m.index + m[0].length);
  // címke: rövid érték („hiány: 6345 kN”)
  const lab = /([A-Za-zÀ-ž]{3,}):\s(\S{1,12})(?=\s|$)/g; while ((m = lab.exec(full))) markSpaces(m.index, m.index + m[0].length);
  let pos = 0; for (const nd of nodes) { const v = nd.nodeValue; let out = '', ch = false; for (let i = 0; i < v.length; i++) { if (mark[pos + i] && v[i] === ' ') { out += NB + WJ; ch = true; } else out += v[i]; } if (ch) nd.nodeValue = out; pos += v.length; }
}
// elválasztás (magyar minták, Hyphenopoly): csak sorkizárt blokkokban; összetartozó csoportba (NBSP+WJ) nem kerül lágy kötőjel
const WJ = '\u2060', SHY = '\u00AD', ZW = /\u200B/g;
const JSEL = 'main p, main li, main dd, main figcaption, main .note, main .eq .w > div, main .verdict, main .fb, footer p';
const NOHY = 'sub,sup,code,pre,script,style,button,label,output,td,th,.nw,.formula,.eq .f,.hud,.lbl3';
let HYPH = null;
function hyphBlock(block) {
  if (!HYPH) return; const w = document.createTreeWalker(block, NodeFilter.SHOW_TEXT, null); let n;
  while ((n = w.nextNode())) { const v0 = n.nodeValue; if (v0.length < 6) continue; const pe = n.parentElement; if (!pe || pe.closest(NOHY)) continue;
    // idempotens: a korábbi futásokból maradt nulla szélességű szóközöket eltávolítjuk, újat nem teszünk be
    const v = v0.replace(ZW, ''); const out = v.split(' ').map(tok => {
      if (tok.indexOf(SHY) >= 0 || tok.length < 6) return tok;
      if (tok.indexOf(WJ) >= 0) { if (tok.length <= 16) return tok; const k = tok.lastIndexOf(WJ); const last = tok.slice(k + 1); return /^[\p{L}]{6,}/u.test(last) ? tok.slice(0, k + 1) + HYPH(last) : tok; }
      return tok.split(NB).map(p => p.length >= 6 && /^[\p{L}]/u.test(p) ? HYPH(p) : p).join(NB); }).join(' ').replace(ZW, '');
    if (out !== v0) n.nodeValue = out; }
}
function hyphAll(root) { if (!HYPH || !root.querySelectorAll) return; const list = root.matches && root.matches(JSEL) ? [root] : []; list.push(...root.querySelectorAll(JSEL)); const anc = root.closest && root.closest(JSEL); if (anc) list.push(anc); list.forEach(hyphBlock); }
function guardAll(root) { guardText(root); const list = root.matches && root.matches(BLOCKSEL) ? [root] : []; root.querySelectorAll && list.push(...root.querySelectorAll(BLOCKSEL)); list.forEach(groupGuard); hyphAll(root); }
addEventListener('DOMContentLoaded', () => { const H = window.Hyphenopoly; if (!H || !H.hyphenators) return; const pr = H.hyphenators.hu; if (!pr) return; pr.then((f) => { HYPH = (t) => f(t, '.hyphenate'); hyphAll(document.body); if (MO) MO.takeRecords(); }).catch(() => {}); });
let MO = null;
window.U = { $, $$, clamp, lerp, fmt, H, css, bindRange, fillRange, seg, hiCanvas, richCtx, guardText, guardAll };
document.addEventListener('DOMContentLoaded', () => { guardAll(document.body); let pend = new Set(), sch = false;
  // a saját módosításaink által keltett változásokat eldobjuk (takeRecords), így az őr nem hívhatja meg önmagát újra és újra
  MO = new MutationObserver((ms) => { for (const m of ms) pend.add(m.target.nodeType === 3 ? m.target.parentNode : m.target); if (!sch) { sch = true; requestAnimationFrame(() => { sch = false; const L = [...pend]; pend = new Set(); L.forEach((e) => { if (!e || !e.isConnected) return; const b = e.closest ? (e.closest(BLOCKSEL) || e) : e; guardAll(b); }); MO.takeRecords(); }); } }); MO.observe(document.body, { childList: true, subtree: true, characterData: true }); });

// --- téma ---
(function theme() {
  const root = document.documentElement; let saved = null; try { saved = localStorage.getItem('sk-theme'); } catch (e) { }
  if (saved && !root.hasAttribute('data-theme')) root.setAttribute('data-theme', saved);
  const btn = $('#themeBtn'); if (!btn) return;
  const isDark = () => root.getAttribute('data-theme') ? root.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const label = () => { btn.textContent = isDark() ? 'Világos téma' : 'Sötét téma'; };
  btn.addEventListener('click', () => { const t = isDark() ? 'light' : 'dark'; root.setAttribute('data-theme', t); try { localStorage.setItem('sk-theme', t); } catch (e) { } label(); dispatchEvent(new Event('themechange')); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { label(); dispatchEvent(new Event('themechange')); });
  label();
})();
(function totop() { const b = $('.totop'); if (!b) return; addEventListener('scroll', () => b.classList.toggle('on', scrollY > 900), { passive: true }); b.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' })); })();

// --- igazolólap: a négy szimulátor aktuális kihasználtsága ---
window.LEDGER = {
  set(mode, v) { const c = document.querySelector(`.lc[data-mode="${mode}"]`); if (!c) return; c.querySelector('.v').textContent = (v > 9.99 ? '> 9,99' : fmt(v, 2)) + (v > 1 ? ' ✗' : ' ✓'); c.querySelector('.bar i').style.width = clamp(v / 1.5, 0, 1) * 100 + '%'; c.classList.toggle('fail', v > 1); c.classList.toggle('warn', v > 0.9 && v <= 1); c.title = `Kihasználtság: ${fmt(v, 2)}`; },
};
// a 3D-től függetlenül is kiszámoljuk a kezdőértékeket (ha nincs WebGL)
addEventListener('DOMContentLoaded', () => { const M = window.MECH; if (!M) return; LEDGER.set('csuszas', M.sliding({}).lam); LEDGER.set('borulas', M.overturn({}).lam); LEDGER.set('feluszas', M.uplift({}).lam); setTimeout(() => LEDGER.set('altalanos', M.slope({}).lam), 50); });

// --- videók ---
const VIDEOS = {
  v1: { t: 'Elcsúszás az alapsíkon', s: 'drénezett és drénezetlen eset, δ, 0,4·V<sub>d</sub>, földellenállás', d: '2:39', k: 'k1' },
  v2: { t: 'Felborulás és külpontosság', s: 'EQU-tényezők, forgáspont, B/6 és B/3, élfeszültség', d: '2:45', k: 'k2' },
  v3: { t: 'Felúszás', s: 'UPL, talajvízszint, túlnyújtás, horgony, leszívás, elárasztás', d: '2:51', k: 'k3' },
  v4: { t: 'Általános állékonyság', s: 'csúszólap, lamellák, DA-3, víz, hazai esetek', d: '2:36', k: 'k4' },
  v5: { t: 'Összefoglaló és kvíz', s: 'négy határállapot egy telephelyen, tervezési módszerek, kvíz', d: '2:43', k: 'k5' },
};
window.VIDEOS = VIDEOS;
(function videos() {
  const modal = $('#vmodal'); if (!modal) return; const frame = $('.frame', modal), title = $('.mh span', modal);
  let last = null;
  const open = (k, from) => { const v = VIDEOS[k]; if (!v) return; last = from; window.dispatchEvent(new Event('sims:pause')); title.textContent = v.t; frame.innerHTML = ''; frame.appendChild(H('iframe', { src: `video/${k}.html#autoplay`, title: v.t, allow: 'autoplay; fullscreen' })); modal.classList.add('on'); document.body.style.overflow = 'hidden'; $('#vclose').focus(); };
  const close = () => { modal.classList.remove('on'); frame.innerHTML = ''; document.body.style.overflow = ''; if (last) last.focus(); setTimeout(() => window.dispatchEvent(new Event('sims:resume')), 60); };
  $('#vclose').addEventListener('click', close); modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('on')) close(); });
  addEventListener('message', (e) => { if (e.data === 'vclose') close(); });
  $('#vfs').addEventListener('click', () => { const f = $('iframe', frame); if (f && f.requestFullscreen) f.requestFullscreen().catch(() => { }); });
  $$('.vcard[data-video]').forEach(c => { const v = VIDEOS[c.dataset.video]; c.classList.add(v.k); c.innerHTML = `<div class="vthumb"><img src="img/thumb-${c.dataset.video}.jpg" alt="" loading="lazy"><div class="pl"><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="#fff"/></svg></div><span class="d">${v.d}</span></div><div class="vi"><b>${v.t}</b><span>${v.s}</span></div>`; });
  $$('.vlink[data-video]').forEach(b => { const v = VIDEOS[b.dataset.video]; b.innerHTML = `<i aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="#fff"/></svg></i>Videó: ${v.t} (${v.d})`; });
  $$('[data-video]').forEach(b => b.addEventListener('click', () => open(b.dataset.video, b)));
})();

// --- kvízmotor ---
function quiz(el, items) {
  if (!el) return; let i = 0; const res = items.map(() => null), pick = items.map(() => null);
  const body = H('div'); el.appendChild(body); const dots = $('.dots', el);
  const draw = () => {
    body.innerHTML = '';
    if (i >= items.length) { const ok = res.filter(x => x === true).length; body.appendChild(H('div', { class: 'qres' }, `<span class="muted">Eredmény</span><b>${ok} / ${items.length}</b><p class="muted">${ok === items.length ? 'Hibátlan.' : ok >= items.length * .6 ? 'Jó eredmény – a hibás válaszok magyarázatát érdemes újraolvasni.' : 'Olvasd át újra a fejezetet, és próbáld meg még egyszer.'}</p><div class="qnav" style="justify-content:center"><button data-a="restart">Újrakezdés</button></div>`)); }
    else {
      const it = items[i]; const q = H('div', {}, `<div class="qn">${i + 1}. kérdés a ${items.length}-ből</div><div class="qt">${it.q}</div>`);
      const opts = H('div', { class: 'opts' }); it.o.forEach((o, k) => { const b = H('button', { class: 'opt' }, `<span class="kk">${'ABCD'[k]}</span><span>${o}</span>`); b.addEventListener('click', () => answer(k, opts, q)); opts.appendChild(b); });
      q.appendChild(opts); q.appendChild(H('div', { class: 'expl' }, it.e)); body.appendChild(q);
      body.appendChild(H('div', { class: 'qnav' }, `<button class="sec" data-a="prev" ${i === 0 ? 'disabled' : ''}>Előző</button><button data-a="next" ${res[i] === null ? 'disabled' : ''}>${i === items.length - 1 ? 'Eredmény' : 'Következő'}</button>`));
      if (res[i] !== null) reveal(opts, q, pick[i]);
    }
    if (dots) dots.innerHTML = items.map((_, k) => `<i class="${res[k] === true ? 'ok' : res[k] === false ? 'no' : ''} ${k === i ? 'cur' : ''}"></i>`).join('');
  };
  const reveal = (opts, q, picked) => { const it = items[i]; $$('.opt', opts).forEach((b, k) => { b.disabled = true; if (k === it.a) b.classList.add('ok'); else if (k === picked) b.classList.add('no'); }); $('.expl', q).classList.add('on'); };
  const answer = (k, opts, q) => { if (res[i] !== null) return; res[i] = k === items[i].a; pick[i] = k; reveal(opts, q, k); $('[data-a="next"]', el).disabled = false; if (dots) dots.children[i].className = (res[i] ? 'ok' : 'no') + ' cur'; };
  el.addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a; if (a === 'next') i++; else if (a === 'prev') i = Math.max(0, i - 1); else if (a === 'restart') { i = 0; res.fill(null); pick.fill(null); } draw(); });
  draw();
}
// --- igaz/hamis ---
function trueFalse(grid, items, scoreEl) {
  if (!grid) return; let done = 0, ok = 0;
  const upd = () => { const pct = done ? Math.round(ok / done * 100) : 0; scoreEl.innerHTML = `<b>${ok}</b> helyes a megválaszolt <b>${done}</b>-ből (összesen ${items.length})${done === items.length ? ` – ${pct >= 90 ? 'kiváló, mehetsz vizsgázni!' : pct >= 75 ? 'jó eredmény.' : 'nézd át a hibás állításokat.'}` : ''}`; };
  items.forEach((it, k) => {
    const c = H('div', { class: 'tf' }, `<div class="st"><span class="no">${k + 1}.</span>${it.s}</div><div class="bt"><button data-v="1">Igaz</button><button data-v="0">Hamis</button></div><div class="fb">${it.e}</div>`);
    c.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || c.dataset.done) return; c.dataset.done = 1; done++; const right = (b.dataset.v === '1') === it.t; if (right) ok++; c.classList.add(right ? 'ok' : 'no'); $$('button', c).forEach(x => { if ((x.dataset.v === '1') === it.t) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); x.disabled = true; }); upd(); });
    grid.appendChild(c);
  });
  upd();
  const r = $('#tfReset'); if (r) r.onclick = () => { grid.innerHTML = ''; trueFalse(grid, items, scoreEl); };
}
// --- melyik határállapot? (osztályozó) ---
function sorter(el, items) {
  if (!el) return; const names = ['Elcsúszás', 'Felborulás', 'Felúszás', 'Általános'];
  items.forEach(it => {
    const c = H('div', { class: 'scard' }, `<div>${it.s}</div><div class="sb">${names.map((n, k) => `<button class="k${k + 1}" data-k="${k}">${n}</button>`).join('')}</div><div class="why">${it.e}</div>`);
    c.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || c.dataset.done) return; c.dataset.done = 1; const right = +b.dataset.k === it.a; c.classList.add(right ? 'ok' : 'no'); $$('button', c).forEach((x, k) => { x.disabled = true; x.style.opacity = k === it.a ? 1 : 0.35; if (k === it.a) x.style.background = 'var(--k)', x.style.color = '#fff'; }); });
    el.appendChild(c);
  });
}
addEventListener('DOMContentLoaded', () => {
  const D = window.DATA; if (!D) return;
  quiz($('#q1'), D.q1); quiz($('#q2'), D.q2); quiz($('#q3'), D.q3); quiz($('#q4'), D.q4); quiz($('#q5'), D.q5); quiz($('#q6'), D.q6);
  trueFalse($('#tfgrid'), D.tf, $('#tfscore')); sorter($('#sorter'), D.sorter);
});
