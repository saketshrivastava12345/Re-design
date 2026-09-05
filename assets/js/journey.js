/* ===========================================================================
   GML — Chapter 01: the scroll-controlled logistics journey
   ---------------------------------------------------------------------------
   A 240-frame sequence (truck -> terminal -> ship -> ocean -> aircraft) drawn
   to a single <canvas>. Scroll position selects the frame, so the reader is
   genuinely driving the camera; nothing plays on a timer.

   This is the OPENING CHAPTER of one continuous document timeline, not a
   self-contained hero. The section is an ordinary block in normal flow with a
   `position: sticky` stage inside it, and it shares its animation frame with
   the global scroll director in scroll.js — there is no nested scroller and no
   second rAF loop.

   Performance contract:
     - exactly one <canvas> in the DOM, never 240 <img> elements
     - frames arrive coarse-to-fine so scrubbing works after ~30 images
     - the canvas is repainted only when the integer frame index, the viewport
       size or the device pixel ratio actually changes
     - device pixel ratio capped at 2; small viewports load the 854px set
     - decode() off the main thread where the browser supports it
   =========================================================================== */
(function () {
  'use strict';

  var FRAMES = 240;
  var section = document.getElementById('journey');
  var canvas  = document.getElementById('journeyCanvas');
  if (!section || !canvas) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var overlay   = section.querySelectorAll('.jo__block');
  var railItems = section.querySelectorAll('.jrail__list li');
  var railFill  = document.getElementById('jrailFill');
  var hint      = document.getElementById('journeyHint');
  var loadBar   = document.getElementById('journeyLoad');
  var loadFill  = loadBar ? loadBar.querySelector('i') : null;

  /* --------------------------------------------------------- reduced motion --
     Scrubbing a film with the scrollbar is exactly the kind of motion this
     preference exists to switch off. Fall back to a still frame with every
     caption laid out legibly in normal flow — nothing is removed, only the
     motion. */
  if (reduced) {
    section.classList.add('is-static');
    canvas.replaceWith(Object.assign(new Image(), {
      src: 'assets/frames/poster.jpg', className: 'journey__fallback', alt: '',
      loading: 'eager'
    }));
    for (var r = 0; r < overlay.length; r++) overlay[r].classList.add('is-static');
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

  var images = new Array(FRAMES);
  var ready  = new Uint8Array(FRAMES);
  var loaded = 0;

  var ctx = canvas.getContext('2d', { alpha: false });

  /* ------------------------------------------------------------- geometry -- */
  var cssW = 0, cssH = 0, dpr = 1;

  function resize() {
    var w = canvas.clientWidth;
    var h = canvas.clientHeight;
    // Cap DPR at 2 — beyond that the extra pixels cost fill-rate and buy
    // nothing on photographic content.
    var d = Math.min(window.devicePixelRatio || 1, 2);
    if (w === cssW && h === cssH && d === dpr) return false;
    cssW = w; cssH = h; dpr = d;
    canvas.width  = Math.round(w * d);
    canvas.height = Math.round(h * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return true;
  }

  /* Cover-fit into the CSS box. */
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
     ~30 images (~2.5 MB desktop). Later passes fill in the gaps. A small
     concurrency window keeps the connection busy without starving the rest of
     the page — the sections below must stay responsive while this runs. */
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
          if (loadFill) loadFill.style.transform = 'scaleX(' + (loaded / FRAMES) + ')';
          if (loaded === FRAMES && loadBar) loadBar.classList.add('is-done');
          dirty = true;
        }
        done();
      }

      // `load` is authoritative: decode() can stay pending indefinitely in an
      // occluded tab, which would stall the whole pass.
      img.onload = function () {
        if (img.decode) img.decode().then(function () { finish(true); }, function () { finish(true); });
        else finish(true);
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
      if (step === 1) for (var j = 0; j < FRAMES; j++) if (!ready[j] && queue.indexOf(j) < 0) queue.push(j);

      var cursor = 0;
      var workers = [];
      for (var w = 0; w < CONCURRENCY; w++) {
        workers.push((async function () {
          while (cursor < queue.length) await load(queue[cursor++]);
        })());
      }
      await Promise.all(workers);
    }
  }

  /* --------------------------------------------------------------- progress --
     Read straight off the section's own box. The section is in normal document
     flow, so this is the document timeline — not a private scroll position. */
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
  var FADE = 0.035;

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
      b.el.style.setProperty('--a', a.toFixed(3));
      b.el.style.visibility = a <= 0.001 ? 'hidden' : 'visible';
    }
  }

  var railState = -1;
  function applyRail(p) {
    if (railFill) railFill.style.transform = 'scaleY(' + p.toFixed(4) + ')';
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

  /* ---------------------------------------------------------------- update --
     `smooth` trails `target` so a trackpad flick reads as camera inertia
     rather than a jump cut. The canvas is touched only when the integer frame
     index changes, so holding still costs one comparison per frame. */
  var target = 0, smooth = 0, shown = -1, dirty = true;
  var EASE = 0.14;

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

    // Publish the chapter progress so CSS can grade the stage and drive the
    // hand-off into the section below.
    section.style.setProperty('--jp', smooth.toFixed(4));

    applyOverlay(smooth);
    applyRail(smooth);
  }

  /* ------------------------------------------------------------------ start -- */
  resize();

  // Paint the poster immediately so the opening is never an empty black box.
  var poster = new Image();
  poster.src = 'assets/frames/poster.jpg';
  poster.onload = function () { if (shown < 0) paint(poster); };

  load(0).then(function () {
    if (shown < 0 && ready[0]) { paint(images[0]); shown = 0; }
    runPasses();
  });

  // Share the site's single animation frame rather than opening a second one.
  if (window.GMLScroll) {
    window.GMLScroll.onTick(function () { update(true); });
  } else {
    (function loop() { update(true); requestAnimationFrame(loop); })();
  }

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
