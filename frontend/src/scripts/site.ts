// Shared behaviour for every zyppi.in page: theme, language, small demos,
// the contact form, and loading the 3D scenes where a page has one.

const root = document.documentElement;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;
const store = {
  get(k: string) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k: string, v: string) { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};

/* ---------- theme ---------- */
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
let theme = store.get('zyppi-theme');
const effTheme = () => theme || (mq && mq.matches ? 'dark' : 'light');
const MOON = 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z';
const SUN = 'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z';
function applyTheme() {
  if (theme) root.setAttribute('data-theme', theme); else root.removeAttribute('data-theme');
  const dark = effTheme() === 'dark';
  $('themeIcon')?.setAttribute('d', dark ? SUN : MOON);
  $('theme')?.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
}
$('theme')?.addEventListener('click', () => {
  theme = effTheme() === 'dark' ? 'light' : 'dark';
  store.set('zyppi-theme', theme);
  applyTheme();
});
mq?.addEventListener?.('change', applyTheme);
applyTheme();

/* ---------- language ---------- */
let lang = store.get('zyppi-lang') === 'bn' ? 'bn' : 'en';
let cancelled = false, online = false, sosDone = false;
const L = (en: string, bn: string) => (lang === 'en' ? en : bn);
function applyLang() {
  root.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-en]').forEach((el) => { el.textContent = el.getAttribute('data-' + lang); });
  const lb = $('lang'); if (lb) lb.textContent = lang === 'en' ? 'বাংলা' : 'English';
  if (cancelled) setCancelled();
  const ol = $('onlineLabel'); if (ol) ol.textContent = online ? L('Online', 'অনলাইন') : L('Offline', 'অফলাইন');
  const sm = $('sosmsg'); if (sm && sosDone) sm.textContent = L('Help is on the way', 'সাহায্য আসছে');
}
$('lang')?.addEventListener('click', () => { lang = lang === 'en' ? 'bn' : 'en'; store.set('zyppi-lang', lang); applyLang(); });

/* ---------- demos ---------- */
function setCancelled() {
  const st = $('ost'), b = $<HTMLButtonElement>('cancelBtn'); if (!st || !b) return;
  st.textContent = L('Cancelled', 'বাতিল হয়েছে'); st.classList.add('done');
  b.textContent = L('Refund on its way', 'টাকা ফেরত আসছে'); b.disabled = true;
}
$('cancelBtn')?.addEventListener('click', () => {
  if (cancelled) return; cancelled = true; setCancelled();
  setTimeout(() => { cancelled = false; $('ost')?.classList.remove('done'); const b = $<HTMLButtonElement>('cancelBtn'); if (b) b.disabled = false; applyLang(); }, 4000);
});
const tg = $('onlineToggle');
tg?.addEventListener('click', () => { online = !online; tg.setAttribute('aria-pressed', online ? 'true' : 'false'); applyLang(); });
(() => {
  const sos = $('sos'), msg = $('sosmsg'); if (!sos || !msg) return;
  let timer: number | undefined;
  const start = (e: Event) => {
    e.preventDefault(); if (sosDone) return;
    sos.classList.add('hold'); msg.textContent = L('Keep holding…', 'ধরে রাখুন…');
    timer = window.setTimeout(() => {
      sosDone = true; msg.textContent = L('Help is on the way', 'সাহায্য আসছে');
      setTimeout(() => { sosDone = false; sos.classList.remove('hold'); msg.textContent = L('Press and hold', 'চেপে ধরে রাখুন'); }, 3500);
    }, 1400);
  };
  const stop = () => { if (sosDone) return; clearTimeout(timer); sos.classList.remove('hold'); msg.textContent = L('Press and hold', 'চেপে ধরে রাখুন'); };
  sos.addEventListener('pointerdown', start);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => sos.addEventListener(ev, stop));
  sos.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) start(e); });
  sos.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') stop(); });
})();
(() => {
  const q = $('qr'); if (!q) return;
  [1,1,1,0,1,1,1, 1,0,1,0,1,0,1, 1,1,1,0,1,1,1, 0,1,0,1,0,1,0, 1,1,1,0,1,0,1, 1,0,1,1,0,1,1, 1,1,1,0,1,1,1].forEach((v) => {
    const s = document.createElement('span'); if (!v) s.className = 'o'; q.appendChild(s);
  });
})();
if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll<SVGSVGElement>('.track svg').forEach((s) => s.pauseAnimations?.());
}

/* ---------- copy email ---------- */
$('copyMail')?.addEventListener('click', function (this: HTMLButtonElement) {
  const b = this;
  const done = () => { b.textContent = L('Copied', 'কপি হয়েছে'); setTimeout(() => { b.textContent = L('Copy', 'কপি'); }, 1600); };
  const select = () => { const r = document.createRange(); const m = $('mail'); if (!m) return; r.selectNodeContents(m); const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r); };
  if (navigator.clipboard) navigator.clipboard.writeText('admin@zyppi.in').then(done, select); else select();
});

/* ---------- contact form (Netlify Forms) ---------- */
const form = $<HTMLFormElement>('contactForm');
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const thanks = $('cfThanks'), err = $('cfError'), btn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const name = (form.elements.namedItem('name') as HTMLInputElement).value.trim();
  const msg = (form.elements.namedItem('message') as HTMLTextAreaElement).value.trim();
  if (thanks) thanks.hidden = true; if (err) err.hidden = true;
  if (!name || !msg) {
    if (err) { err.textContent = L('Please add your name and a message.', 'আপনার নাম আর বার্তা লিখুন।'); err.hidden = false; }
    return;
  }
  if (btn) btn.disabled = true;
  try {
    const body = new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
    const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!res.ok) throw new Error(String(res.status));
    form.reset(); if (thanks) thanks.hidden = false;
  } catch {
    if (err) { err.textContent = L("Couldn't send right now. Please email admin@zyppi.in instead.", 'এখন পাঠানো গেল না। admin@zyppi.in-এ ইমেল করুন।'); err.hidden = false; }
  } finally {
    if (btn) btn.disabled = false;
  }
});

/* ---------- phone menu ---------- */
(() => {
  const btn = $('menuBtn'), top = document.querySelector<HTMLElement>('.top'); if (!btn || !top) return;
  const set = (open: boolean) => {
    top.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  btn.addEventListener('click', () => set(!top.classList.contains('open')));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && top.classList.contains('open')) { set(false); btn.focus(); } });
  document.addEventListener('click', (e) => { if (top.classList.contains('open') && !top.contains(e.target as Node)) set(false); });
  $('mainNav')?.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('a')) set(false); });
  window.matchMedia?.('(min-width: 761px)').addEventListener?.('change', (m) => { if (m.matches) set(false); });
})();

/* ---------- scrolling helpers ---------- */
document.querySelectorAll<HTMLElement>('[data-scroll]').forEach((b) => b.addEventListener('click', () => {
  document.getElementById(b.dataset.scroll || '')?.scrollIntoView({ behavior: 'smooth' });
}));
$('getApp')?.addEventListener('click', () => {
  document.querySelector('.top')?.classList.remove('open'); $('menuBtn')?.setAttribute('aria-expanded', 'false');
  const g = document.querySelectorAll<HTMLElement>('.get');
  const el = g[g.length - 1] || g[0];
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); else location.href = '/#get';
});

/* ---------- home story steps ---------- */
const story = $('story');
const steps = Array.from(document.querySelectorAll<HTMLElement>('.step'));
if (story && steps.length) {
  const update = () => {
    const r = story.getBoundingClientRect();
    const s = Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
    const idx = s < 0.44 ? 0 : s < 0.7 ? 1 : 2;
    steps.forEach((el, i) => el.classList.toggle('on', i === idx));
  };
  window.addEventListener('scroll', update, { passive: true }); update();
}

applyLang();

/* ---------- 3D, only where a page has a stage ---------- */
if (document.querySelector('#stage, [data-scene]')) import('./scenes');
