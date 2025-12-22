// No-flicker: apply stored classes ASAP if script is loaded early
try {
  const d = document.documentElement;
  const on = k => localStorage.getItem(k) === 'active';
  if (on('divergify_interference')) d.classList.add('reduced-interference');
  if (on('divergify_tinfoil')) d.classList.add('tin-foil-mode');
} catch {}

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const btnInterf = document.getElementById('btn-interference');
  const btnTin = document.getElementById('btn-tinfoil');
  const live = document.getElementById('live');

  const save = (k, v) => { try { localStorage.setItem(k, v ? 'active' : 'inactive'); } catch {} };
  const pressed = (btn, on) => btn && btn.setAttribute('aria-pressed', String(on));

  function setInterference(on, init) {
    root.classList.toggle('reduced-interference', on);
    if (btnInterf) {
      pressed(btnInterf, on);
      const icon = btnInterf.querySelector('.icon');
      if (icon) icon.textContent = on ? '📖' : '👁️';
    }
    if (!init) save('divergify_interference', on);
  }

  function blockAnalytics() {
    try {
      window['ga-disable-UA-XXXXX-Y'] = true; // TODO: replace with real UA id
      window['ga-disable-G-XXXXXXX'] = true;  // TODO: replace with real GA4 id
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push = () => {};
      window.gtag = window.ga = () => {};
      const block = url => /google-analytics\.com|googletagmanager\.com|stats\.g|plausible\.io|segment\.com/i.test(String(url));
      const ofetch = window.fetch;
      if (ofetch) window.fetch = (...a) => block(a[0]) ? Promise.resolve(new Response(null, { status: 204 })) : ofetch(...a);
      const ob = navigator.sendBeacon && navigator.sendBeacon.bind(navigator);
      if (ob) navigator.sendBeacon = (u, d) => block(u) ? false : ob(u, d);
      const open = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(m, u, ...r) { if (block(u)) this.send = () => {}; return open.call(this, m, u, ...r); };
    } catch {}
  }

  function setTinFoil(on, init) {
    root.classList.toggle('tin-foil-mode', on);
    if (btnTin) {
      pressed(btnTin, on);
      btnTin.classList.toggle('shield-active', on);
    }
    if (on) {
      blockAnalytics();
      if (live) live.textContent = 'Shields Up: Tracking blocked.';
    } else if (live) {
      live.textContent = '';
    }
    if (!init) save('divergify_tinfoil', on);
  }

  // initialize from storage
  setInterference(localStorage.getItem('divergify_interference') === 'active', true);
  setTinFoil(localStorage.getItem('divergify_tinfoil') === 'active', true);

  // wire up events
  btnInterf && btnInterf.addEventListener('click', () => setInterference(!root.classList.contains('reduced-interference')));
  btnTin && btnTin.addEventListener('click', () => setTinFoil(!root.classList.contains('tin-foil-mode')));
});

