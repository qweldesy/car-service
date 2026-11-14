/* Car Service — взаимодействия и Motion-анимации */
(() => {
  'use strict';

  const doc = document.documentElement;
  const M = window.Motion;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate = !!(M && typeof M.animate === 'function' && typeof M.inView === 'function' && !reduce);
  const ease = [0.22, 1, 0.36, 1];

  if (canAnimate) doc.classList.add('motion-ready');

  const on = (el, ev, fn, opts) => el && el.addEventListener(ev, fn, opts);

  /* ---------- шапка ---------- */
  const header = document.getElementById('header');
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle('is-scrolled', window.scrollY > 24);
  };
  onScroll();
  on(window, 'scroll', onScroll, { passive: true });

  /* ---------- hero ---------- */
  const heroEls = [...document.querySelectorAll('[data-hero]')];
  const startHero = () => {
    if (!canAnimate) return;
    try {
      M.animate(heroEls, { opacity: [0, 1], y: [26, 0] }, {
        duration: 1,
        delay: M.stagger(0.075, { start: 0.05 }),
        ease
      });
    } catch (err) {
      doc.classList.remove('motion-ready');
    }
  };
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 700))]).then(startHero);
  } else {
    startHero();
  }

  /* ---------- появление секций ---------- */
  if (canAnimate) {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      let done = false;
      M.inView(el, () => {
        if (done) return;
        done = true;
        M.animate(el, { opacity: [0, 1], y: [22, 0] }, { duration: 0.85, ease });
      }, { amount: 0.12 });
    });
  }

  setTimeout(() => {
    document.querySelectorAll('[data-reveal], [data-hero]').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && getComputedStyle(el).opacity === '0') {
        el.style.opacity = '1';
        el.style.transform = 'none';
      }
    });
  }, 4000);

  /* ---------- бегущая строка ---------- */
  const track = document.getElementById('tickerTrack');
  let tickerAnim = null;
  let tickerParts = null;

  const buildTicker = () => {
    if (!track || tickerParts) return;
    const group = document.createElement('div');
    group.className = 'ticker__group';
    while (track.firstChild) group.appendChild(track.firstChild);
    track.appendChild(group);
    const clone = group.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
    tickerParts = { group, clone };
  };

  const runTicker = () => {
    if (!canAnimate || !track) return;
    buildTicker();
    if (!tickerParts) return;
    if (tickerAnim && typeof tickerAnim.stop === 'function') tickerAnim.stop();
    const gap = parseFloat(getComputedStyle(track).columnGap) || 32;
    const distance = tickerParts.group.offsetWidth + gap;
    if (!distance) return;
    tickerAnim = M.animate(track, { x: [0, -distance] }, {
      duration: distance / 42,
      repeat: Infinity,
      ease: 'linear'
    });
    on(track, 'mouseenter', () => tickerAnim && tickerAnim.pause && tickerAnim.pause());
    on(track, 'mouseleave', () => tickerAnim && tickerAnim.play && tickerAnim.play());
  };

  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 900))]).then(runTicker);
  } else {
    runTicker();
  }

  let resizeTimer;
  on(window, 'resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(runTicker, 250);
  });

  /* ---------- мобильное меню ---------- */
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  let menuOpen = false;

  const setMenu = (open) => {
    if (!menu || !burger) return;
    menuOpen = open;
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    if (open) {
      menu.removeAttribute('inert');
      setTimeout(() => {
        const first = menu.querySelector('a');
        if (first) first.focus({ preventScroll: true });
      }, 180);
    } else {
      menu.setAttribute('inert', '');
      if (menu.contains(document.activeElement)) burger.focus({ preventScroll: true });
    }
  };

  on(burger, 'click', () => setMenu(!menuOpen));
  document.querySelectorAll('#menu a').forEach((a) => on(a, 'click', () => setMenu(false)));
  on(document, 'keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) setMenu(false);
    if (e.key !== 'Tab' || !menuOpen || document.body.classList.contains('lb-open')) return;
    const focusables = [burger, ...document.querySelectorAll('#menu a')].filter(Boolean);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!focusables.includes(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  });
  const desktopQuery = window.matchMedia('(min-width: 901px)');
  const onDesktop = (e) => { if (e.matches && menuOpen) setMenu(false); };
  if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', onDesktop);
  else if (desktopQuery.addListener) desktopQuery.addListener(onDesktop);

  /* ---------- лайтбокс ---------- */
  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lbImg');
  const lbCaption = document.getElementById('lbCaption');
  const lbCount = document.getElementById('lbCount');
  const lbClose = document.getElementById('lbClose');
  const lbPrev = document.getElementById('lbPrev');
  const lbNext = document.getElementById('lbNext');
  const shots = [...document.querySelectorAll('.shot')];
  let lbIndex = 0;
  let lbTrigger = null;
  let lbOpen = false;

  const renderLb = (i) => {
    if (!shots.length || !lbImg) return;
    lbIndex = (i + shots.length) % shots.length;
    const shot = shots[lbIndex];
    const img = shot.querySelector('img');
    const full = shot.dataset.full || (img && img.currentSrc) || (img && img.src);
    lbImg.src = full;
    lbImg.alt = (img && img.alt) || '';
    if (lbCaption) lbCaption.textContent = shot.dataset.caption || '';
    if (lbCount) lbCount.textContent = String(lbIndex + 1).padStart(2, '0') + ' / ' + String(shots.length).padStart(2, '0');
    [-1, 1].forEach((d) => {
      const next = shots[(lbIndex + d + shots.length) % shots.length];
      if (next) { const pre = new Image(); pre.src = next.dataset.full; }
    });
  };

  const openLb = (i, trigger) => {
    if (!lb) return;
    lbTrigger = trigger || null;
    renderLb(i);
    lbOpen = true;
    lb.classList.add('is-open');
    lb.setAttribute('aria-hidden', 'false');
    lb.removeAttribute('inert');
    document.body.classList.add('lb-open');
    if (lbClose) setTimeout(() => lbClose.focus({ preventScroll: true }), 80);
  };

  const closeLb = () => {
    if (!lb) return;
    lbOpen = false;
    lb.classList.remove('is-open');
    lb.setAttribute('aria-hidden', 'true');
    lb.setAttribute('inert', '');
    document.body.classList.remove('lb-open');
    if (lbTrigger) lbTrigger.focus({ preventScroll: true });
  };

  const stepLb = (d) => { if (lbOpen) renderLb(lbIndex + d); };

  shots.forEach((shot, i) => on(shot, 'click', () => openLb(i, shot)));
  on(lbClose, 'click', closeLb);
  on(lbPrev, 'click', () => stepLb(-1));
  on(lbNext, 'click', () => stepLb(1));
  on(lb, 'click', (e) => { if (e.target === lb) closeLb(); });

  on(document, 'keydown', (e) => {
    if (!lbOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeLb(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLb(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); stepLb(1); }
    else if (e.key === 'Tab') {
      const focusables = [lbClose, lbPrev, lbNext].filter(Boolean);
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!focusables.includes(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  });

  /* ---------- мелочи ---------- */
  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
