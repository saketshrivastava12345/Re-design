/* ===========================================================================
   GML — Scroll-controlled logistics journey
   ---------------------------------------------------------------------------
   A 240-frame sequence (truck -> port -> ship -> ocean -> aircraft) is drawn to
   a single <canvas>. Scroll position selects the frame; nothing is animated on
   a timer, so the user is genuinely driving the camera.

   Performance contract:
     - exactly one <canvas> in the DOM, never 240 <img> elements
     - frames arrive in coarse-to-fine passes so scrubbing works almost at once
     - one rAF loop; the canvas is repainted only when the frame index, the
       viewport size or the DPR actually changes
     - overlay opacity is written straight to style, never through a framework
     - decode() off the main thread where the browser supports it
   =========================================================================== */
(function () {
  'use strict';

  var FRAMES = 240;
  var section = document.getElementById('journey');
  var canvas  = document.getElementById('journeyCanvas');
  if (!section || !canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var overlay  = section.querySelectorAll('.jo__block');
  var railItems= section.querySelectorAll('.jrail__list li');
  var railFill = document.getElementById('jrailFill');
  var hint     = document.getElementById('journeyHint');
  var loadBar  = document.getElementById('journeyLoad');
  var loadFill = loadBar ? loadBar.querySelector('i') : null;

  /* --------------------------------------------------------- reduced motion --
     Scrubbing a film with the scrollbar is exactly the kind of motion this
     preference exists to switch off. Fall back to a still frame with every
     overlay legible in normal flow. */
  if (reduced) {
    section.classList.add('is-static');
    section.style.height = 'auto';
    var stage = section.querySelector('.journey__stage');
    if (stage) { stage.style.position = 'relative'; stage.style.height = 'auto'; stage.style.minHeight = '100vh'; }
    canvas.replaceWith(Object.assign(new Image(), {
      src: 'assets/frames/poster.jpg', className: 'journey__fallback', alt: '',
      style: 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover'
    }));
    for (var r = 0; r < overlay.length; r++) {
      var b = overlay[r];
      b.style.cssText += ';position:relative;opacity:1;visibility:visible;left:auto;right:auto;bottom:auto;top:auto;translate:none;margin:0 auto 3.5rem;';
    }
    var jo = section.querySelector('.jo');
    if (jo) jo.style.cssText += ';position:relative;padding:8rem var(--gut);pointer-events:auto;';
    if (hint) hint.remove();
    if (loadBar) loadBar.remove();
    var rail = section.querySelector('.jrail'); if (rail) rail.remove();
    return;
  }

  /* ------------------------------------------------------------- frame set --
     Small screens get the 854px set (8.5 MB) instead of the 1408px set
     (19.7 MB). Chosen once at load: swapping mid-session would re-download
     everything for no visible gain. */
  var mobileSet = window.matchMedia('(max-width: 900px)').matches ||
                  (window.innerWidth * (window.devicePixelRatio || 1)) < 1100;
  var DIR = mobileSet ? 'assets/frames/mobile/' : 'assets/frames/desktop/';

  var images = new Array(FRAMES);   // Image objects, sparse until loaded
  var ready  = new Uint8Array(FRAMES);
  var loaded = 0;

  var ctx = canvas.getContext('2d', { alpha: false });

  /* ------------------------------------------------------------- geometry -- */
  var cssW = 0, cssH = 0, dpr = 1;

  function resize() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    // Cap DPR at 2 — beyond that the extra pixels cost fill-rate and buy nothing
    // on photographic content.
    var d = Math.min(window.devicePixelRatio || 1, 2);
    if (w === cssW && h === cssH && d === dpr) return false;
    cssW = w; cssH = h; dpr = d;
    canvas.width  = Math.round(w * d);
    canvas.height = Math.round(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return true;
  }

  /* Draw an image cover-fit into the CSS box. */
  function paint(img) {
    if (!img || !img.naturalWidth) return;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var scale = Math.max(cssW / iw, cssH / ih);
    var dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh);
  }

  /* Nearest already-decoded frame, so an early scrub never shows a blank. */
  function nearestReady(i) {
    if (ready[i]) return i;
    for (var d2 = 1; d2 < FRAMES; d2++) {
      if (i - d2 >= 0 && ready[i - d2]) return i - d2;
      if (i + d2 < FRAMES && ready[i + d2]) return i + d2;
    }
    return -1;
  }

  /* ------------------------------------------------------- progressive load --
     Pass 1 loads every 8th frame, so the whole journey is scrubbable after
     ~30 images (~2.5 MB desktop). Later passes fill in the gaps. Within a pass
     a small concurrency window keeps the connection busy without starving the
     rest of the page. */
  var PASSES = [8, 4, 2, 1];
  var CONCURRENCY = 6;

  function load(i) {
    return new Promise(function (done) {
      if (ready[i]) return done();
      var img = new Image();
      img.decoding = 'async';

      var settled = false;
      function finish(ok) {
        if (settled) return;
        settled = true;
        if (ok) {
          images[i] = img; ready[i] = 1; loaded++;
          if (loadFill) loadFill.style.width = (loaded / FRAMES * 100) + '%';
          if (loaded === FRAMES && loadBar) loadBar.classList.add('is-done');
          dirty = true;         // a newly arrived frame may improve the view
        }
        done();
      }

      // `load` is authoritative: decode() can stay pending indefinitely in an
      // occluded tab or background pane, which would stall the whole pass.
      img.onload = function () {
        if (img.decode) { img.decode().then(function () { finish(true); }, function () { finish(true); }); }
        else finish(true);
        // never let a pending decode hold the queue
        setTimeout(function () { finish(true); }, 200);
      };
      img.onerror = function () { finish(false); };
      img.src = DIR + 'f' + String(i + 1).padStart(4, '0') + '.jpg';
    });
  }

  async function runPasses() {
    for (var p = 0; p < PASSES.length; p++) {
      var step = PASSES[p];
      var queue = [];
      for (var i = 0; i < FRAMES; i += step) if (!ready[i]) queue.push(i);
      // last pass: catch anything the strides missed (e.g. FRAMES-1)
      if (step === 1) for (var j = 0; j < FRAMES; j++) if (!ready[j] && queue.indexOf(j) < 0) queue.push(j);

      var cursor = 0;
      var workers = [];
      for (var w = 0; w < CONCURRENCY; w++) {
        workers.push((async function () {
          while (cursor < queue.length) { await load(queue[cursor++]); }
        })());
      }
      await Promise.all(workers);
    }
  }

  /* --------------------------------------------------------------- progress -- */
  function progress() {
    var r = section.getBoundingClientRect();
    var travel = r.height - window.innerHeight;
    if (travel <= 0) return 0;
    var p = -r.top / travel;
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  /* ---------------------------------------------------------- overlay copy -- */
  var blocks = [];
  for (var k = 0; k < overlay.length; k++) {
    blocks.push({
      el: overlay[k],
      in: parseFloat(overlay[k].dataset.in),
      out: parseFloat(overlay[k].dataset.out),
      a: -1
    });
  }
  var FADE = 0.035;   // fraction of total scroll spent fading a block in/out

  function blockAlpha(b, p) {
    if (p <= b.in - FADE || p >= b.out + FADE) return 0;
    if (p < b.in)  return (p - (b.in - FADE)) / FADE;
    if (p > b.out) return 1 - (p - b.out) / FADE;
    return 1;
  }

  function applyOverlay(p) {
    for (var i = 0; i < blocks.length; i++) {
      var b = blocks[i];
      var a = blockAlpha(b, p);
      if (Math.abs(a - b.a) < 0.005) continue;
      b.a = a;
      b.el.style.opacity = a.toFixed(3);
      b.el.style.visibility = a <= 0.001 ? 'hidden' : 'visible';
      // a small counter-drift keeps the copy feeling attached to the camera
      var drift = (1 - a) * 16;
      b.el.style.transform = 'translate3d(0,' + drift.toFixed(2) + 'px,0)';
    }
  }

  var railState = -1;
  function applyRail(p) {
    if (railFill) railFill.style.height = (p * 100).toFixed(2) + '%';
    var active = 0;
    for (var i = 0; i < railItems.length; i++) {
      if (p >= parseFloat(railItems[i].dataset.at)) active = i;
    }
    if (active !== railState) {
      if (railState >= 0 && railItems[railState]) railItems[railState].classList.remove('is-on');
      if (railItems[active]) railItems[active].classList.add('is-on');
      railState = active;
    }
    if (hint) hint.classList.toggle('is-off', p > 0.03);
  }

  /* ------------------------------------------------------------- rAF loop --
     `smooth` trails `target` so a trackpad flick reads as camera inertia rather
     than a jump cut. The canvas is only touched when the integer frame index
     changes, so a still scroll costs one comparison per frame. */
  var target = 0, smooth = 0, shown = -1, dirty = true;
  var EASE = 0.14;
  var lastTick = 0;

  /* One update step. `ease` false snaps straight to the target, which is what
     the fallback path below wants. */
  function update(ease) {
    target = progress();
    if (ease) {
      smooth += (target - smooth) * EASE;
      if (Math.abs(target - smooth) < 0.00015) smooth = target;
    } else {
      smooth = target;
    }

    if (resize()) dirty = true;

    var idx = Math.round(smooth * (FRAMES - 1));
    if (idx < 0) idx = 0; else if (idx > FRAMES - 1) idx = FRAMES - 1;

    if (idx !== shown || dirty) {
      var use = nearestReady(idx);
      if (use >= 0) { paint(images[use]); shown = idx; dirty = false; }
    }

    applyOverlay(smooth);
    applyRail(smooth);
  }

  function tick(ts) {
    lastTick = ts || performance.now();
    update(true);
    requestAnimationFrame(tick);
  }

  /* Some embedded webviews and background/occluded panes suspend rAF entirely.
     Scroll events still arrive there, so fall back to a direct update when the
     animation frame has clearly stopped firing. */
  window.addEventListener('scroll', function () {
    if (performance.now() - lastTick > 250) update(false);
  }, { passive: true });

  /* ---------------------------------------------------------------- start -- */
  resize();

  // Paint the poster immediately so the hero is never an empty black box.
  var poster = new Image();
  poster.src = 'assets/frames/poster.jpg';
  poster.onload = function () { if (shown < 0) paint(poster); };

  // Frame 1 first, then everything else coarse-to-fine.
  load(0).then(function () {
    if (shown < 0 && ready[0]) { paint(images[0]); shown = 0; }
    runPasses();
  });

  requestAnimationFrame(tick);

  window.addEventListener('resize', function () { dirty = true; }, { passive: true });
  window.addEventListener('orientationchange', function () { dirty = true; }, { passive: true });

  /* QA / diagnostics hook. Lets the journey be driven and inspected without a
     live animation frame (headless checks, throttled panes). */
  window.GMLJourney = {
    frames: FRAMES,
    dir: DIR,
    sync: function () { update(false); return this.state(); },
    state: function () {
      return { progress: smooth, frame: shown + 1, loaded: loaded, total: FRAMES };
    }
  };
})();
