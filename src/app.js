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
function hiCanvas(cv, w, h) { const dpr = Math.min(2, devicePixelRatio || 1); cv.width = w * dpr; cv.height = h * dpr; const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); return g; }
window.U = { $, $$, clamp, lerp, fmt, H, css, bindRange, fillRange, seg, hiCanvas };

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
  v1: { t: 'Elcsúszás az alapsíkon', s: 'drénezett és drénezetlen eset, δ, 0,4·Vd, földellenállás', d: '2:06', k: 'k1' },
  v2: { t: 'Felborulás és külpontosság', s: 'EQU-tényezők, forgáspont, B/6 és B/3, élfeszültség', d: '2:12', k: 'k2' },
  v3: { t: 'Felúszás', s: 'UPL, talajvízszint, túlnyújtás, horgony, leszívás, elárasztás', d: '2:08', k: 'k3' },
  v4: { t: 'Általános állékonyság', s: 'csúszólap, lamellák, DA-3, víz, hazai esetek', d: '2:02', k: 'k4' },
  v5: { t: 'Összefoglaló és kvíz', s: 'négy határállapot, új Eurocode, négy kvízkérdés', d: '2:02', k: 'k5' },
};
window.VIDEOS = VIDEOS;
(function videos() {
  const modal = $('#vmodal'); if (!modal) return; const frame = $('.frame', modal), title = $('.mh span', modal);
  let last = null;
  const open = (k, from) => { const v = VIDEOS[k]; if (!v) return; last = from; title.textContent = v.t; frame.innerHTML = ''; frame.appendChild(H('iframe', { src: `video/${k}.html#autoplay`, title: v.t, allow: 'autoplay; fullscreen' })); modal.classList.add('on'); document.body.style.overflow = 'hidden'; $('#vclose').focus(); };
  const close = () => { modal.classList.remove('on'); frame.innerHTML = ''; document.body.style.overflow = ''; if (last) last.focus(); };
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
  quiz($('#q1'), D.q1); quiz($('#q2'), D.q2); quiz($('#q3'), D.q3); quiz($('#q4'), D.q4); quiz($('#q5'), D.q5);
  trueFalse($('#tfgrid'), D.tf, $('#tfscore')); sorter($('#sorter'), D.sorter);
});
