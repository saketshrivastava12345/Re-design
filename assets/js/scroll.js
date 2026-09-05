/* ===========================================================================
   GML — global scroll director
   ---------------------------------------------------------------------------
   One scroll timeline for the whole document. The <body> is the only scroll
   surface: nothing traps the wheel, nothing nests a second scroller, and every
   pinned stage is an ordinary `position: sticky` child of a normal-flow
   section. That means the browser's own scrolling — wheel, trackpad, touch,
   keyboard, scrollbar drag, find-in-page — keeps working untouched.

   What it does, in ScrollTrigger terms: each registered element gets a scrub
   value written to it as a CSS custom property, so the animation itself is
   authored in CSS and the JS only ever writes one number.

       <div data-sc="top bottom | bottom top" data-sc-var="--p">

   `start | end` use GSAP's grammar: the first word is the edge of the element,
   the second the edge of the viewport. `top bottom` means "progress starts when
   the element's top reaches the bottom of the viewport".

   Performance contract:
     - ONE requestAnimationFrame loop for the entire site, shared with the
       frame-sequence journey through onTick()
     - element geometry is measured on refresh (load / resize / font swap),
       never per frame; a scroll frame is arithmetic only
     - a custom property is written only when its value actually moved
     - passive scroll listener, no layout reads in the scroll handler
   =========================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var triggers = [];        // registered scrub targets
  var ticks = [];           // per-frame subscribers (the journey canvas)
  var docEl = document.documentElement;

  /* ------------------------------------------------------------ geometry --
     Resolve one edge keyword against the element box and the viewport. */
  function edge(word, base, size) {
    if (word === 'top')    return base;
    if (word === 'center') return base + size / 2;
    if (word === 'bottom') return base + size;
    var pct = parseFloat(word);
    return isFinite(pct) ? base + size * (pct / 100) : base;
  }

  function resolve(t) {
    var el = t.el;
    // offsetTop chain is stable under `position: sticky`; getBoundingClientRect
    // during a refresh is fine because refresh is rare.
    var rect = el.getBoundingClientRect();
    var top = rect.top + window.scrollY;
    var h = rect.height;
    var vh = window.innerHeight;

    t.a = edge(t.s0, top, h) - edge(t.s1, 0, vh);
    t.b = edge(t.e0, top, h) - edge(t.e1, 0, vh);
    if (t.b - t.a < 1) t.b = t.a + 1;      // never divide by zero

    if (t.shiftFrom) {
      // Horizontal storytelling: how far the track must travel so its last
      // panel finishes flush with the right edge of the stage. The stage is
      // padded by the page gutter, so the distance is measured against its
      // CONTENT width — clientWidth would leave the last panel short by one
      // gutter on each side.
      var track = el.querySelector(t.shiftFrom);
      var stage = el.querySelector(t.shiftIn) || el;
      if (track && stage) {
        var cs = getComputedStyle(stage);
        var inner = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        var d = Math.max(0, track.scrollWidth - inner);
        if (d !== t.shift) {
          t.shift = d;
          el.style.setProperty('--sc-shift', d);
        }
      }
    }
  }

  /* -------------------------------------------------------------- writes -- */
  function write(t, p) {
    if (Math.abs(p - t.p) < 0.0015 && t.p >= 0) return;
    t.p = p;
    t.el.style.setProperty(t.varName, p.toFixed(4));

    var state = p <= 0 ? 0 : p >= 1 ? 2 : 1;
    if (state !== t.state) {
      t.state = state;
      t.el.classList.toggle('sc-active', state === 1);
      t.el.classList.toggle('sc-past', state === 2);
    }
  }

  /* ---------------------------------------------------------- registration -- */
  function register(el) {
    if (el.__sc) return el.__sc;

    var spec = (el.dataset.sc || 'top bottom | bottom top').split('|');
    var s = (spec[0] || 'top bottom').trim().split(/\s+/);
    var e = (spec[1] || 'bottom top').trim().split(/\s+/);

    var t = {
      el: el,
      s0: s[0] || 'top',    s1: s[1] || 'bottom',
      e0: e[0] || 'bottom', e1: e[1] || 'top',
      varName: el.dataset.scVar || '--p',
      ease: el.hasAttribute('data-sc-ease'),
      shiftFrom: el.dataset.scTrack || null,
      shiftIn: el.dataset.scStage || null,
      shift: -1,
      a: 0, b: 1, p: -1, smooth: -1, state: -1
    };
    el.__sc = t;
    triggers.push(t);
    resolve(t);
    return t;
  }

  function refresh() {
    for (var i = 0; i < triggers.length; i++) resolve(triggers[i]);
    measureChapters();
    dirty = true;
  }

  /* ------------------------------------------------------------- chapters --
     The rail that tells the reader where they are in a very long page. Driven
     by the same loop; a chapter is current once its section has crossed the
     upper third of the viewport. */
  var railLinks = [], chapters = [], chapterAt = -1, railFill = null;

  function measureChapters() {
    chapters.length = 0;
    for (var i = 0; i < railLinks.length; i++) {
      var id = railLinks[i].getAttribute('href').slice(1);
      var sec = document.getElementById(id);
      if (!sec) continue;
      var r = sec.getBoundingClientRect();
      chapters.push({ link: railLinks[i], top: r.top + window.scrollY, i: chapters.length });
    }
  }

  function updateChapters(y) {
    if (!chapters.length) return;
    var line = y + window.innerHeight * 0.34;
    var active = 0;
    for (var i = 0; i < chapters.length; i++) if (line >= chapters[i].top) active = i;
    if (active === chapterAt) return;
    if (chapterAt >= 0) chapters[chapterAt].link.classList.remove('is-on');
    chapters[active].link.classList.add('is-on');
    chapters[active].link.setAttribute('aria-current', 'true');
    if (chapterAt >= 0) chapters[chapterAt].link.removeAttribute('aria-current');
    chapterAt = active;
  }

  /* ----------------------------------------------------------------- loop -- */
  var dirty = true, lastY = -1, lastTick = 0, running = false;

  function frame(y) {
    var i, t;

    for (i = 0; i < triggers.length; i++) {
      t = triggers[i];
      var raw = (y - t.a) / (t.b - t.a);
      raw = raw < 0 ? 0 : raw > 1 ? 1 : raw;

      if (t.ease && !reduced) {
        // trail the target so a trackpad flick reads as camera inertia
        if (t.smooth < 0) t.smooth = raw;
        t.smooth += (raw - t.smooth) * 0.14;
        if (Math.abs(raw - t.smooth) < 0.0002) t.smooth = raw;
        write(t, t.smooth);
        if (t.smooth !== raw) dirty = true;
      } else {
        write(t, raw);
      }
    }

    // whole-document progress, for the header rule and the rail fill
    var max = Math.max(1, docEl.scrollHeight - window.innerHeight);
    var page = y / max;
    page = page < 0 ? 0 : page > 1 ? 1 : page;
    docEl.style.setProperty('--page', page.toFixed(4));
    if (railFill) railFill.style.transform = 'scaleY(' + page.toFixed(4) + ')';

    updateChapters(y);

    for (i = 0; i < ticks.length; i++) ticks[i](y, page);
  }

  function tick(ts) {
    lastTick = ts || performance.now();
    // Run every frame unconditionally. Subscribers carry their own easing —
    // the frame sequence trails the scroll position so a flick reads as camera
    // inertia — and skipping frames while the document is momentarily still
    // would freeze them part-way through settling. The work is arithmetic plus
    // one rect read; write() and the canvas both no-op when nothing moved.
    lastY = window.scrollY;
    dirty = false;
    frame(lastY);
    requestAnimationFrame(tick);
  }

  /* Some embedded webviews and occluded panes suspend rAF entirely while still
     dispatching scroll. Fall back to a direct update when frames have clearly
     stopped arriving, so the page can never freeze mid-story. */
  window.addEventListener('scroll', function () {
    if (performance.now() - lastTick > 250) { lastY = -1; frame(window.scrollY); }
  }, { passive: true });

  /* ---------------------------------------------------------------- boot -- */
  function boot() {
    // Only now is it safe for CSS to start animating on --p: if this script had
    // never run, the page would have stayed a complete static document.
    if (!reduced) docEl.classList.add('has-sc');

    var els = document.querySelectorAll('[data-sc]');
    for (var i = 0; i < els.length; i++) register(els[i]);

    railLinks = Array.prototype.slice.call(document.querySelectorAll('[data-chapter]'));
    railFill = document.getElementById('railFill');
    measureChapters();

    frame(window.scrollY);
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  var ro = null;
  if ('ResizeObserver' in window) {
    // Section heights move when fonts swap in or a details panel opens.
    ro = new ResizeObserver(function () { refresh(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.addEventListener('load', function () {
    refresh();
    if (ro) ro.observe(document.body);
  });

  var rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(refresh, 120);
  }, { passive: true });
  window.addEventListener('orientationchange', function () { setTimeout(refresh, 220); }, { passive: true });

  document.addEventListener('toggle', function (e) {
    if (e.target && e.target.tagName === 'DETAILS') refresh();
  }, true);

  /* --------------------------------------------------------------- public -- */
  window.GMLScroll = {
    reduced: reduced,
    refresh: refresh,
    register: register,
    /** Subscribe to the shared animation frame. fn(scrollY, pageProgress). */
    onTick: function (fn) { ticks.push(fn); },
    /** Scrub value of an element, 0..1. */
    progressOf: function (el) { return el && el.__sc ? el.__sc.p : 0; },
    /** Force one synchronous pass — used by the QA harness. */
    sync: function () { lastY = -1; dirty = true; frame(window.scrollY); }
  };
})();
