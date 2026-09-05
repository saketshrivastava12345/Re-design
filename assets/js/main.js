/* ===========================================================================
   GML — site behaviour
   ---------------------------------------------------------------------------
   Header, navigation, reveals, counters, the global network panel, and the
   working instruments (tracking hand-off, dimension calculator, quote form).

   Integration points live in GML_CONFIG so a backend can be wired in one place
   without touching the rest of the file. Nothing here invents a result: the
   tracking form hands the reference to the official service, and the quote
   form composes a real message rather than reporting a submission that did
   not happen.
   =========================================================================== */
(function () {
  'use strict';

  var GML_CONFIG = window.GML_CONFIG = window.GML_CONFIG || {
    // Where "Start Tracking" sends the reference. Until GML's tracking API is
    // wired up this hands off to the official site rather than faking a result.
    trackUrl: 'https://www.gmlindia.net/',
    // POST endpoint for the quote form. While null the form composes a mail
    // draft to the real address instead of pretending to have submitted.
    quoteEndpoint: null,
    quoteMailto: 'info@gmlindia.net',
    // Set true once the official certification marks are present in
    // assets/brand/certs/. Left false so the page never requests a file that
    // is not there. See assets/brand/README.md.
    certLogos: false
  };

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ============================================================ BRAND ===
     assets/brand/gml-logo.svg is the single drop-in slot for the official
     artwork. If it resolves it is the logo; if it ever fails to load the
     drawn meridian mark beside it stays visible instead. */
  $$('[data-brand-logo]').forEach(function (img) {
    function ok() { img.classList.add('is-ok'); }
    if (img.complete && img.naturalWidth) ok();
    img.addEventListener('load', ok);
    img.addEventListener('error', function () { img.classList.remove('is-ok'); });
  });

  /* Certification marks are only requested when the real files are in place,
     so the page never fires a request for artwork that does not exist. */
  if (GML_CONFIG.certLogos) {
    $$('[data-cert-logos] li[data-logo]').forEach(function (li) {
      var img = new Image();
      img.className = 'cert__logo';
      img.alt = '';
      img.addEventListener('load', function () {
        img.classList.add('is-ok');
        li.insertBefore(img, li.firstChild);
      });
      img.src = 'assets/brand/certs/' + li.dataset.logo + '.svg';
    });
  }

  /* =========================================================== HEADER === */
  var hdr = $('#hdr');
  var journey = $('#journey');
  var lastY = window.scrollY;

  function onScroll() {
    var y = window.scrollY;
    // The header only turns solid once the cinematic chapter is behind us;
    // over the footage it stays transparent with a scrim.
    var threshold = journey ? journey.offsetHeight - window.innerHeight * 0.6 : 80;
    hdr.classList.toggle('is-solid', y > threshold);
    if (y > threshold + 240) {
      hdr.classList.toggle('is-hidden', y > lastY && y - lastY > 4);
    } else {
      hdr.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- desktop mega menus: hover + keyboard, one open at a time ---- */
  $$('.nav__item.has-menu').forEach(function (item) {
    var trigger = $('.nav__trigger', item);
    var closeTimer;

    function open() {
      clearTimeout(closeTimer);
      $$('.nav__item.is-open').forEach(function (o) { if (o !== item) close(o); });
      item.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    }
    function close(el) {
      var t = el || item;
      t.classList.remove('is-open');
      var tr = $('.nav__trigger', t);
      if (tr) tr.setAttribute('aria-expanded', 'false');
    }

    item.addEventListener('mouseenter', open);
    item.addEventListener('mouseleave', function () { closeTimer = setTimeout(function () { close(); }, 140); });
    trigger.addEventListener('click', function (e) {
      e.preventDefault();
      if (item.classList.contains('is-open')) close(); else open();
    });
    item.addEventListener('focusin', open);
    item.addEventListener('focusout', function (e) {
      if (!item.contains(e.relatedTarget)) close();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    $$('.nav__item.is-open').forEach(function (o) {
      o.classList.remove('is-open');
      var t = $('.nav__trigger', o); if (t) t.setAttribute('aria-expanded', 'false');
    });
    if (mnav && !mnav.hidden) closeMobile();
  });

  /* ------------------------------ mobile sheet ------------------------------ */
  var burger = $('#burger');
  var mnav = $('#mnav');
  var lastFocus = null;

  function openMobile() {
    lastFocus = document.activeElement;
    mnav.hidden = false;
    document.body.classList.add('is-locked');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Close menu');
    var first = $('a, summary', mnav); if (first) first.focus();
  }
  function closeMobile() {
    mnav.hidden = true;
    document.body.classList.remove('is-locked');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    if (lastFocus) lastFocus.focus();
  }
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      if (mnav.hidden) openMobile(); else closeMobile();
    });
    mnav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') closeMobile();
    });
    mnav.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = $$('a, summary, button', mnav).filter(function (n) { return n.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---- in-page anchors must clear the fixed header ---- */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var t = document.querySelector(id);
      if (!t) return;
      e.preventDefault();
      if (mnav && !mnav.hidden) closeMobile();
      var hdrH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--hdr-h'), 10) || 74;
      var top = t.getBoundingClientRect().top + window.scrollY - hdrH - 12;
      window.scrollTo({ top: top, behavior: reduced ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ========================================================== REVEALS === */
  var revealables = $$('.reveal');

  if (revealables.length && !reduced) {
    // Only now is it safe to hide anything: had this script failed to run, the
    // CSS would have left every section visible.
    document.documentElement.classList.add('has-reveal');
  }

  function show(el) {
    if (el.classList.contains('is-in')) return;
    var sibs = Array.prototype.filter.call(el.parentNode.children, function (n) { return n.classList.contains('reveal'); });
    var i = sibs.indexOf(el);
    el.style.transitionDelay = (Math.max(0, i) * 70) + 'ms';
    el.classList.add('is-in');
  }

  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(show);
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        show(en.target);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    revealables.forEach(function (el) { io.observe(el); });

    /* Safety net. IntersectionObserver callbacks are part of the rendering
       lifecycle, so an occluded or throttled tab can leave them pending — and
       a pending observer here would mean permanently invisible content. A
       cheap geometric sweep guarantees anything on screen becomes visible
       either way. */
    var pending = revealables.slice();
    var lastSweep = 0;
    function sweep() {
      lastSweep = Date.now();
      var h = window.innerHeight;
      for (var i = pending.length - 1; i >= 0; i--) {
        var el = pending[i];
        if (el.classList.contains('is-in')) { pending.splice(i, 1); continue; }
        if (el.getBoundingClientRect().top < h * 0.94) { show(el); io.unobserve(el); pending.splice(i, 1); }
      }
    }
    window.addEventListener('scroll', function () {
      if (pending.length && Date.now() - lastSweep > 120) sweep();
    }, { passive: true });
    window.addEventListener('resize', function () { if (pending.length) sweep(); }, { passive: true });
    setTimeout(sweep, 400);
  }

  /* ========================================================= COUNTERS === */
  var counters = $$('[data-count]');
  if (counters.length && !reduced && 'IntersectionObserver' in window) {
    var DUR = 1400;
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        cio.unobserve(el);
        if (el.dataset.plain === '1') return;

        // These are the company's real published figures. The tween is
        // decoration; the true value is the contract. If the animation frame
        // stalls this guarantees the correct number is what remains on screen.
        var final = el.textContent;
        var settle = setTimeout(function () { el.textContent = final; }, DUR + 300);

        var to = parseFloat(el.dataset.count);
        var suffix = el.dataset.suffix || '';
        var t0 = null;
        function step(ts) {
          if (!t0) t0 = ts;
          var k = Math.min((ts - t0) / DUR, 1);
          var eased = 1 - Math.pow(1 - k, 3);
          if (k < 1) {
            el.textContent = Math.round(to * eased) + suffix;
            requestAnimationFrame(step);
          } else {
            clearTimeout(settle);
            el.textContent = final;
          }
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* =================================================== GLOBAL NETWORK ===
     Four regions. Clicking a tab selects one; while the reader is simply
     scrolling the chapter, the regions light up in turn on their own. A click
     ends the automatic walk so the panel never fights the reader. */
  var netSection = $('#locations');
  if (netSection) {
    var regionBtns = $$('.net__region-btn', netSection);
    var regionOrder = regionBtns.map(function (b) { return b.dataset.region; });
    var manual = false;
    var current = -1;

    var svg = $('.net__svg', netSection);

    /* Move the camera to the region's real bounding box. The translate/scale
       triple was computed from the actual latitudes and longitudes and lives
       on the group in the markup, so nothing here invents geography. */
    function frameRegion(view) {
      if (!svg || !view) return;
      var v = view.split(/\s+/);
      svg.style.setProperty('--k', v[0]);
      svg.style.setProperty('--tx', v[1]);
      svg.style.setProperty('--ty', v[2]);
    }

    function selectRegion(i, fromUser) {
      if (i === current) return;
      current = i;
      regionBtns.forEach(function (b, n) {
        b.setAttribute('aria-selected', n === i ? 'true' : 'false');
        var pane = document.getElementById(b.getAttribute('aria-controls'));
        if (pane) pane.hidden = n !== i;
      });
      $$('.net__region', netSection).forEach(function (g) {
        var on = g.dataset.region === regionOrder[i];
        g.classList.toggle('is-on', on);
        if (on) frameRegion(g.dataset.view);
      });
      if (fromUser) {
        var pane = document.getElementById(regionBtns[i].getAttribute('aria-controls'));
        if (pane) pane.focus({ preventScroll: true });
      }
    }

    regionBtns.forEach(function (b, i) {
      b.addEventListener('click', function () { manual = true; selectRegion(i, true); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        manual = true;
        var n = (i + d + regionBtns.length) % regionBtns.length;
        regionBtns[n].focus();
        selectRegion(n, true);
      });
    });

    // open on the whole network, so the arcs out of Mumbai read first
    if (svg && svg.dataset.world) frameRegion(svg.dataset.world);
    selectRegion(0, false);
    if (svg && svg.dataset.world) frameRegion(svg.dataset.world);

    if (window.GMLScroll && !reduced) {
      var STEPS = [0.14, 0.38, 0.60, 0.80];
      var worldShown = true;
      window.GMLScroll.onTick(function () {
        if (manual) return;
        var p = window.GMLScroll.progressOf(netSection);
        if (p <= 0 || p >= 1) return;
        if (p < STEPS[0]) {
          if (!worldShown) { worldShown = true; frameRegion(svg.dataset.world); }
          return;
        }
        var want = 0;
        for (var i = 0; i < STEPS.length; i++) if (p >= STEPS[i]) want = i;
        if (worldShown) {
          // coming off the world view, re-frame even if the region is unchanged
          worldShown = false;
          var g = $('.net__region.is-on', netSection);
          if (want === current && g) frameRegion(g.dataset.view);
        }
        selectRegion(want, false);
      });
    }
  }

  /* ======================================================== TRACKING === */
  var trackForm = $('#trackForm');
  if (trackForm) {
    var refInput = $('#trackRef');
    var refLabel = $('#trackRefLabel');
    var trackErr = $('#trackErr');
    var refType = 'HBL No.';

    $$('.tool__tabs button', trackForm).forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.tool__tabs button', trackForm).forEach(function (b) { b.setAttribute('aria-selected', 'false'); });
        btn.setAttribute('aria-selected', 'true');
        refType = btn.dataset.ref;
        refLabel.textContent = refType;
        refInput.focus();
      });
    });

    trackForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = refInput.value.trim();
      trackErr.hidden = true;
      if (!v) {
        trackErr.textContent = 'Enter a ' + refType + ' to track.';
        trackErr.hidden = false;
        refInput.focus();
        return;
      }
      // Hand off to the official tracking service. Nothing is invented here:
      // the reference travels in the URL so the destination can pick it up
      // once the endpoint is wired.
      var url = GML_CONFIG.trackUrl +
        (GML_CONFIG.trackUrl.indexOf('?') > -1 ? '&' : '?') +
        'ref=' + encodeURIComponent(v) + '&type=' + encodeURIComponent(refType);
      window.open(url, '_blank', 'noopener');
    });
  }

  /* ============================================ DIMENSION CALCULATOR === */
  var calcForm = $('#calcForm');
  if (calcForm) {
    var out = $('#calcOut');
    var fields = ['#calcL', '#calcW', '#calcH', '#calcQty', '#calcWt', '#calcMode'].map(function (s) { return $(s); });

    function num(el, fallback) {
      var v = parseFloat(el.value);
      return isFinite(v) && v >= 0 ? v : fallback;
    }

    function recalc() {
      var L = num(fields[0], 0), W = num(fields[1], 0), H = num(fields[2], 0);
      var qty = Math.max(1, Math.round(num(fields[3], 1)));
      var gross = num(fields[4], 0);
      var mode = fields[5].value;

      var cbm = (L * W * H) / 1e6 * qty;                 // cm -> m3, per piece
      // Air uses the IATA volumetric divisor of 6000 cm3/kg.
      // Sea/LCL is charged on the greater of CBM or weight tonnes (1 CBM = 1000 kg).
      var volKg = mode === 'air' ? (L * W * H) / 6000 * qty : cbm * 1000;
      var chargeable = Math.max(gross, volKg);

      out.innerHTML =
        '<div>Volume <em>' + cbm.toFixed(3) + ' CBM</em></div>' +
        '<div>Volumetric weight <em>' + volKg.toFixed(1) + ' kg</em></div>' +
        '<div>Gross weight <em>' + gross.toFixed(1) + ' kg</em></div>' +
        '<div><b>Chargeable weight</b> <em><b>' + chargeable.toFixed(1) + ' kg</b></em></div>';
    }

    fields.forEach(function (el) {
      el.addEventListener('input', recalc);
      el.addEventListener('change', recalc);
    });
    calcForm.addEventListener('submit', function (e) { e.preventDefault(); recalc(); });
    recalc();
  }

  /* ====================================================== QUOTE FORM ===
     Four declared steps over the one original form. Every field the live site
     asks for is still present and still submitted; the steps only decide what
     is on screen at once, and every step stays reachable by keyboard. */
  var quoteForm = $('#quoteForm');
  if (quoteForm) {
    var qErr = $('#quoteErr');
    var tabs = $$('.qform__steps button', quoteForm);
    var panels = $$('.qform__panel', quoteForm);
    var btnPrev = $('#qPrev'), btnNext = $('#qNext'), btnSubmit = $('#qSubmit');
    var summary = $('#qSummary');
    var step = 0;

    function collect() {
      var fd = new FormData(quoteForm);
      var nature = fd.getAll('nature');
      return {
        'Direction': fd.get('direction') || '',
        'Load type': fd.get('load') || '',
        'Movement': fd.get('movement') || '',
        'Cargo nature': nature.length ? nature.join(', ') : '',
        'Commodities Details': (fd.get('Commodities Details') || '').trim(),
        'Name': (fd.get('Name') || '').trim(),
        'Company Name': (fd.get('Company Name') || '').trim(),
        'Email': (fd.get('Email') || '').trim(),
        'Mobile': (fd.get('Mobile') || '').trim(),
        'Requirement': (fd.get('Requirement') || '').trim()
      };
    }

    function renderSummary() {
      var d = collect();
      var rows = ['Direction', 'Load type', 'Movement', 'Cargo nature', 'Name', 'Company Name', 'Email', 'Mobile'];
      summary.innerHTML = rows.map(function (k) {
        return '<div>' + k + ' <em>' + (d[k] ? escapeHtml(d[k]) : '—') + '</em></div>';
      }).join('');
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function goto(i, focusPanel) {
      step = Math.max(0, Math.min(panels.length - 1, i));
      tabs.forEach(function (t, n) {
        t.setAttribute('aria-selected', n === step ? 'true' : 'false');
        t.classList.toggle('is-done', n < step);
      });
      panels.forEach(function (p, n) { p.hidden = n !== step; });
      btnPrev.hidden = step === 0;
      btnNext.hidden = step === panels.length - 1;
      btnSubmit.hidden = step !== panels.length - 1;
      if (step === panels.length - 1) renderSummary();
      if (focusPanel) panels[step].focus({ preventScroll: true });
      if (window.GMLScroll) window.GMLScroll.refresh();
    }

    tabs.forEach(function (t, i) { t.addEventListener('click', function () { goto(i, true); }); });
    btnNext.addEventListener('click', function () { goto(step + 1, true); });
    btnPrev.addEventListener('click', function () { goto(step - 1, true); });

    function markBad(input, bad) {
      var f = input.closest('.field');
      if (f) f.classList.toggle('is-bad', bad);
    }

    function stepOf(el) {
      for (var i = 0; i < panels.length; i++) if (panels[i].contains(el)) return i;
      return 0;
    }

    quoteForm.addEventListener('submit', function (e) {
      e.preventDefault();
      qErr.hidden = true;

      var required = [
        { el: $('#qName'), label: 'Name' },
        { el: $('#qEmail'), label: 'Email' },
        { el: $('#qMobile'), label: 'Mobile' },
        { el: $('#qReq'), label: 'Requirement' }
      ];
      var missing = [];
      var firstBad = null;
      required.forEach(function (r) {
        var empty = !r.el.value.trim();
        var badEmail = r.label === 'Email' && r.el.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.el.value.trim());
        markBad(r.el, empty || badEmail);
        if (empty || badEmail) {
          missing.push(badEmail ? 'a valid Email' : r.label);
          if (!firstBad) firstBad = r.el;
        }
      });

      if (missing.length) {
        qErr.textContent = 'Please provide ' + missing.join(', ') + '.';
        qErr.hidden = false;
        goto(stepOf(firstBad), false);
        firstBad.focus();
        return;
      }

      var data = collect();
      var files = $('#qFiles').files;

      if (GML_CONFIG.quoteEndpoint) {
        fetch(GML_CONFIG.quoteEndpoint, { method: 'POST', body: new FormData(quoteForm) })
          .then(function (res) {
            if (!res.ok) throw new Error(res.status);
            quoteForm.innerHTML =
              '<div class="qform__done"><h3 class="h3">Thank you.</h3>' +
              '<p>Your request has reached our team. We will come back to you shortly.</p></div>';
          })
          .catch(function () {
            qErr.textContent = 'We could not send that. Please email info@gmlindia.net directly.';
            qErr.hidden = false;
          });
        return;
      }

      // No endpoint configured: compose a real message rather than show a
      // success state that did not happen.
      var lines = [];
      Object.keys(data).forEach(function (k) { if (data[k]) lines.push(k + ': ' + data[k]); });
      if (files && files.length) {
        var names = [];
        for (var i = 0; i < files.length; i++) names.push(files[i].name);
        lines.push('Attach Documents: ' + names.join(', ') + ' (please attach before sending)');
      }
      var subject = 'Quote request — ' + data['Load type'] + ' ' + data['Direction'] +
                    (data['Company Name'] ? ' — ' + data['Company Name'] : '');
      window.location.href = 'mailto:' + GML_CONFIG.quoteMailto +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));
    });

    $$('#quoteForm input, #quoteForm textarea').forEach(function (el) {
      el.addEventListener('input', function () { markBad(el, false); });
    });

    goto(0, false);
  }

  /* ============================================================ MISC === */
  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
