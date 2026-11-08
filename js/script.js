/* =========================================================
   CLASSIC GARAGE — script.js (página Sobre nós)
   Mesma lógica técnica da home: header, indicador, menu lateral e reveal.
   ========================================================= */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- HEADER ---------- */
  const header = $('#header');
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 30);
    // não esconde durante a transição do velocímetro
    header.classList.toggle('is-hidden', y > lastY && y > 500
      && !document.body.classList.contains('menu-open')
      && !document.body.classList.contains('is-warping'));
    lastY = y;
  }, { passive: true });

  /* ---------- INDICADOR DO MENU (Sobre nós fica marcado) ---------- */
  const navLinks = $$('.nav__link');
  const navList = $('#navList');
  const indicator = $('#navIndicator');
  const activeLink = $('.nav__link.is-active');
  let hoverLink = null;

  const pop = () => { indicator.classList.remove('is-pop'); void indicator.offsetWidth; indicator.classList.add('is-pop'); };
  function placeIndicator() {
    const t = hoverLink || activeLink;
    if (!t) return indicator.classList.remove('is-visible');
    indicator.style.setProperty('--x', t.parentElement.offsetLeft + 'px');
    indicator.style.setProperty('--w', t.parentElement.offsetWidth + 'px');
    indicator.classList.add('is-visible');
    requestAnimationFrame(() => indicator.classList.add('is-ready'));
  }
  navLinks.forEach(a => {
    a.addEventListener('mouseenter', () => { hoverLink = a; placeIndicator(); });
    a.addEventListener('focus', () => { hoverLink = a; placeIndicator(); });
    a.addEventListener('click', () => { hoverLink = a; placeIndicator(); pop(); });
  });
  navList.addEventListener('mouseleave', () => { hoverLink = null; placeIndicator(); });
  navList.addEventListener('focusout', () => { hoverLink = null; placeIndicator(); });
  window.addEventListener('resize', placeIndicator);
  window.addEventListener('load', () => { placeIndicator(); pop(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeIndicator);
  placeIndicator();

  /* ---------- MENU LATERAL ---------- */
  const burger = $('#burger'), drawer = $('#drawer'), overlay = $('#overlay'), drawerClose = $('#drawerClose');
  function toggleMenu(open) {
    drawer.classList.toggle('is-open', open);
    overlay.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    drawer.setAttribute('aria-hidden', String(!open));
    if (open) drawerClose.focus(); else burger.focus({ preventScroll: true });
  }
  burger.addEventListener('click', () => toggleMenu(true));
  drawerClose.addEventListener('click', () => toggleMenu(false));
  overlay.addEventListener('click', () => toggleMenu(false));
  $$('a', drawer).forEach(a => a.addEventListener('click', () => toggleMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth > 960) toggleMenu(false); });

  /* ---------- ANIMAÇÃO AO ROLAR ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('is-visible'));

  /* ---------- TRANSIÇÃO DO VELOCÍMETRO ----------
     Ao clicar nos links do menu (menos "Entrar em contato"), um velocímetro cobre a tela,
     o ponteiro acelera, a página pula para a seção e o velocímetro some. */
  const warp = $('#warp');
  const needle = $('#warpNeedle');

  // ===== AJUSTES (mexa aqui se quiser) =====
  const ACCEL_MS = 1300;   // tempo até o limite de giro (chega nos 100 em ~1 segundo)
  const LIMITER_MS = 1100; // tempo "cortando giro" (batendo no limite) antes de trocar de página
  const BOUNCES = 7;       // quantas batidas no limitador
  const LIMIT_HIGH = 150;  // onde o ponteiro bate (escala de 0 a 160)
  const LIMIT_LOW = 138;   // até onde ele cai a cada batida
  const DROP_MS = 900;     // tempo do ponteiro voltando a zero
  const ZERO_ANGLE = 169.7; // ângulo (graus) do "0" no mostrador; cada unidade = 1 grau
  const NEEDLE_BASE = 27.4; // ângulo (graus) em que o ponteiro está desenhado na imagem
  // =========================================

  let warping = false;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const setSpeed = v => {
    // rotação CSS (horária) = ângulo desejado - ângulo desenhado
    needle.style.setProperty('--a', (v - (ZERO_ANGLE - NEEDLE_BASE)) + 'deg');
  };

  const tween = (ms, fn) => new Promise(resolve => {
    const t0 = performance.now();
    const step = now => {
      const t = Math.min((now - t0) / ms, 1);
      fn(t);
      t < 1 ? requestAnimationFrame(step) : resolve();
    };
    requestAnimationFrame(step);
  });

  async function warpTo(target, href, url) {
    warping = true;
    document.body.classList.add('is-warping');
    warp.classList.remove('is-leaving');
    setSpeed(0);
    warp.classList.add('is-on');

    let speed = 0;
    const set = v => { speed = v; setSpeed(v); };

    // 1) acelera até o limite de giro
    await tween(ACCEL_MS, t => set(LIMIT_HIGH * Math.pow(t, 1.6)));

    // 2) corta giro: o ponteiro sobe, bate no limite e cai, várias vezes
    await tween(LIMITER_MS, t => {
      const wave = Math.pow(Math.abs(Math.cos(t * BOUNCES * Math.PI)), 0.6); // começa no topo e cai/sobe a cada batida
      set(LIMIT_LOW + (LIMIT_HIGH - LIMIT_LOW) * wave);
    });

    // link para outra página (ex.: portfolio.html): o ponteiro começa a voltar ao zero com a tela
    // ainda coberta e, enquanto ele está voltando, a página troca (não espera chegar ao zero)
    if (url) {
      const peak = speed;
      const CUT = 0.4;   // quanto da volta acontece antes de trocar de página (0 = já, 1 = só no zero)
      await tween(DROP_MS * CUT, t => setSpeed(peak * Math.pow(1 - t * CUT, 2)));
      window.location.href = url;
      return;
    }

    // com a tela coberta, pula para a seção (sem rolagem suave)
    const root = document.documentElement;
    root.style.scrollBehavior = 'auto';
    target.scrollIntoView();
    root.style.scrollBehavior = '';
    history.replaceState(null, '', href);

    // solta o acelerador: o velocímetro some e o ponteiro volta ao zero
    warp.classList.add('is-leaving');
    warp.classList.remove('is-on');
    const from = speed;
    await tween(DROP_MS, t => setSpeed(from * Math.pow(1 - t, 2)));
    setSpeed(0);

    setTimeout(() => {
      document.body.classList.remove('is-warping');
      warping = false;
    }, 100);
  }

  // não deixa rolar a página por baixo do velocímetro
  ['wheel', 'touchmove'].forEach(ev =>
    warp.addEventListener(ev, e => e.preventDefault(), { passive: false }));

  // links que ativam a transição: só as outras páginas do site (.html).
  // Links para seções da mesma página (#servicos, #contato...) rolam suavemente, sem o velocímetro.
  $$('a[href*=".html"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href.length < 2) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const isPage = !href.startsWith('#');
      const target = isPage ? null : document.querySelector(href);
      if ((!isPage && !target) || reduceMotion.matches) return;   // sem animação: comportamento normal
      e.preventDefault();
      if (!warping) warpTo(target, href, isPage ? a.href : null);
    });
  });

  // voltar pelo botão do navegador não pode trazer o velocímetro junto
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    warp.classList.remove('is-on', 'is-leaving');
    document.body.classList.remove('is-warping');
    setSpeed(0);
    warping = false;
  });
})();