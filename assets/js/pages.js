/* ===========================================================================
   GML — behaviour that only the inner pages need.

   main.js already runs on every page and owns the header, the navigation, the
   reveals, the counters, the dimension calculator (#calcForm) and the quote
   form (#quoteForm). Everything here is additive and each block is guarded, so
   a page that does not contain a given instrument costs nothing.
   =========================================================================== */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ==================================================== LIST FILTERING ===
     Shared by World Ports and Set of Containers. Any element carrying
     [data-filter] filters its [data-row] descendants against a text input and
     an optional group of toggle chips. */
  $$('[data-filter]').forEach(function (scope) {
    var input = $('[data-filter-input]', scope);
    var chips = $$('[data-filter-chip]', scope);
    var rows  = $$('[data-row]', scope);
    var count = $('[data-filter-count]', scope);
    var empty = $('[data-filter-empty]', scope);
    var group = 'all';

    function apply() {
      var q = (input && input.value || '').trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (row) {
        var hay = (row.dataset.row || row.textContent).toLowerCase();
        var inGroup = group === 'all' || (row.dataset.group || '').split(' ').indexOf(group) > -1;
        var match = inGroup && (!q || hay.indexOf(q) > -1);
        row.hidden = !match;
        if (match) shown++;
      });
      if (count) count.textContent = shown + ' of ' + rows.length;
      if (empty) empty.hidden = shown > 0;
    }

    if (input) input.addEventListener('input', apply);
    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        group = chip.dataset.filterChip;
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        apply();
      });
    });
    apply();
  });

  /* ========================================================= WORLD TIME ===
     Every clock is rendered from the IANA zone in data-tz through Intl, so the
     times are the browser's own and stay correct through daylight saving. */
  var clocks = $$('[data-tz]');
  if (clocks.length) {
    var fmtCache = {};
    function fmt(tz, opts, key) {
      var k = tz + '|' + key;
      if (!fmtCache[k]) {
        opts.timeZone = tz;
        fmtCache[k] = new Intl.DateTimeFormat('en-GB', opts);
      }
      return fmtCache[k];
    }

    function offsetOf(tz, now) {
      // Compare the same instant rendered in the target zone and in UTC.
      var f = fmt(tz, { hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit' }, 'iso');
      var p = {};
      f.formatToParts(now).forEach(function (x) { if (x.type !== 'literal') p[x.type] = x.value; });
      var asUTC = Date.UTC(+p.year, p.month - 1, +p.day, p.hour % 24, +p.minute, +p.second);
      var mins = Math.round((asUTC - now.getTime()) / 60000);
      var sign = mins < 0 ? '-' : '+';
      mins = Math.abs(mins);
      return 'UTC' + sign + String(Math.floor(mins / 60)).padStart(2, '0') + ':' + String(mins % 60).padStart(2, '0');
    }

    function tick() {
      var now = new Date();
      clocks.forEach(function (el) {
        var tz = el.dataset.tz;
        var time = $('[data-tz-time]', el);
        var date = $('[data-tz-date]', el);
        var off  = $('[data-tz-off]', el);
        try {
          if (time) {
            time.textContent = fmt(tz, { hour: '2-digit', minute: '2-digit', hour12: false }, 't').format(now);
            // A lone second field is not reliably zero-padded across engines.
            var sec = ('0' + fmt(tz, { second: '2-digit' }, 's').format(now)).slice(-2);
            time.insertAdjacentHTML('beforeend', '<small>' + sec + '</small>');
          }
          if (date) date.textContent = fmt(tz, { weekday: 'short', day: 'numeric', month: 'short' }, 'd').format(now);
          if (off && !off.textContent) off.textContent = offsetOf(tz, now);
        } catch (e) {
          // An engine without this zone must not blank the card.
          if (time && !time.textContent) time.textContent = '—';
        }
      });
    }
    tick();
    setInterval(tick, 1000);

    // "your time" comparison line
    var mine = $('[data-tz-local]');
    if (mine) {
      try { mine.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone; }
      catch (e) { mine.textContent = 'your device'; }
    }
  }

  /* ================================================== CURRENCY CONVERTER ===
     Rates are fetched from a public reference feed. Nothing is ever invented:
     if the feed cannot be reached the converter falls back to a rate the user
     types in, and says clearly which of the two it used. */
  var fx = $('#fxForm');
  if (fx) {
    var fxAmount = $('#fxAmount');
    var fxFrom   = $('#fxFrom');
    var fxTo     = $('#fxTo');
    var fxManual = $('#fxManual');
    var fxOut    = $('#fxOut');
    var fxStatus = $('#fxStatus');
    var fxSwap   = $('#fxSwap');
    var rates = null;      // rates relative to USD
    var fetchedAt = null;

    function setStatus(text, live) {
      fxStatus.textContent = text;
      fxStatus.className = 'pill' + (live ? ' pill--live' : '');
    }

    function rateBetween(from, to) {
      if (fxManual.value.trim()) {
        var m = parseFloat(fxManual.value);
        return isFinite(m) && m > 0 ? { rate: m, source: 'manual' } : null;
      }
      if (!rates || !rates[from] || !rates[to]) return null;
      return { rate: rates[to] / rates[from], source: 'live' };
    }

    function render() {
      var amt = parseFloat(fxAmount.value);
      if (!isFinite(amt)) amt = 0;
      var from = fxFrom.value, to = fxTo.value;
      var r = rateBetween(from, to);

      if (!r) {
        fxOut.innerHTML = '<p class="result__big">Rate not available</p>' +
          '<p class="result__note">The live feed could not be reached. Enter the rate from your ' +
          'contract or the customs notification in the field above and the conversion runs on that.</p>';
        return;
      }
      var val = amt * r.rate;
      var when = r.source === 'live' && fetchedAt
        ? 'Reference rate, ' + fetchedAt + '. Not a quotation — your invoice uses the rate agreed in your booking.'
        : 'Converted at the rate you entered: 1 ' + from + ' = ' + r.rate + ' ' + to + '.';

      fxOut.innerHTML =
        '<p class="result__big">' + esc(amt.toLocaleString('en-IN', { maximumFractionDigits: 2 })) + ' ' + esc(from) +
        ' = <b>' + esc(val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) + ' ' + esc(to) + '</b></p>' +
        '<p class="result__note">1 ' + esc(from) + ' = ' + r.rate.toFixed(4) + ' ' + esc(to) +
        ' &middot; 1 ' + esc(to) + ' = ' + (1 / r.rate).toFixed(4) + ' ' + esc(from) + '<br>' + esc(when) + '</p>';
    }

    fetch('https://open.er-api.com/v6/latest/USD')
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        if (!d || !d.rates) throw new Error('shape');
        rates = d.rates;
        fetchedAt = d.time_last_update_utc || 'today';
        setStatus('Live reference rates', true);
        render();
      })
      .catch(function () {
        setStatus('Live rates unavailable — enter a rate', false);
        render();
      });

    [fxAmount, fxFrom, fxTo, fxManual].forEach(function (el) {
      el.addEventListener('input', render);
      el.addEventListener('change', render);
    });
    fx.addEventListener('submit', function (e) { e.preventDefault(); render(); });
    if (fxSwap) {
      fxSwap.addEventListener('click', function () {
        var a = fxFrom.value; fxFrom.value = fxTo.value; fxTo.value = a;
        if (fxManual.value.trim()) {
          var m = parseFloat(fxManual.value);
          if (isFinite(m) && m > 0) fxManual.value = (1 / m).toFixed(6);
        }
        render();
      });
    }
    render();
  }

  /* ============================================================ TRACKING ===
     The reference is validated and echoed back with the routes that can
     actually answer it. No shipment status is displayed, because this site has
     no feed to display one from — inventing a milestone would be worse than
     saying where to ask. */
  var track = $('#trackPage');
  if (track) {
    var tRef   = $('#tRef');
    var tType  = $('#tType');
    var tErr   = $('#tErr');
    var tOut   = $('#tOut');

    // pre-fill from the homepage hand-off: tracking.html?ref=...&type=...
    try {
      var qs = new URLSearchParams(window.location.search);
      if (qs.get('ref')) tRef.value = qs.get('ref');
      if (qs.get('type')) {
        var wanted = qs.get('type');
        $$('option', tType).forEach(function (o) { if (o.value === wanted) tType.value = wanted; });
      }
    } catch (e) { /* URLSearchParams is optional here */ }

    function submitTrack(e) {
      if (e) e.preventDefault();
      var v = tRef.value.trim();
      tErr.hidden = true;
      if (!v) {
        tErr.textContent = 'Enter a ' + tType.value + ' to track.';
        tErr.hidden = false;
        tRef.focus();
        return;
      }
      var subject = 'Tracking request — ' + tType.value + ' ' + v;
      var body = tType.value + ': ' + v + '\n\nPlease send the latest status for this shipment.';
      tOut.hidden = false;
      tOut.innerHTML =
        '<p class="result__big">' + esc(tType.value) + ' <b>' + esc(v) + '</b></p>' +
        '<p class="result__note">This reference has been noted for you but no milestone is shown here: ' +
        'live status is held in our operations system, not on this website. The fastest routes are below — ' +
        'both carry the reference for you.</p>' +
        '<div class="result__acts">' +
          '<a class="btn btn--solid" href="mailto:info@gmlindia.net?subject=' + encodeURIComponent(subject) +
            '&body=' + encodeURIComponent(body) + '">Email this reference</a>' +
          '<a class="btn btn--line" href="tel:+912261489999">Call +91 22 6148 9999</a>' +
        '</div>';
      tOut.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    track.addEventListener('submit', submitTrack);
    tRef.addEventListener('input', function () { tErr.hidden = true; });
  }

  /* ====================================================== MAILTO FORMS ===
     Sailing schedule and career forms. Each composes a real message to a real
     address rather than showing a success state nothing produced.
     Configure a POST endpoint in GML_CONFIG to replace this. */
  $$('form[data-mailto]').forEach(function (form) {
    var errBox = $('[data-form-err]', form);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var missing = [];
      $$('[required]', form).forEach(function (el) {
        var bad = !el.value.trim();
        if (!bad && el.type === 'email') bad = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim());
        var field = el.closest('.field');
        if (field) field.classList.toggle('is-bad', bad);
        if (bad) missing.push(el.dataset.label || el.name || 'a required field');
      });
      if (missing.length) {
        if (errBox) {
          errBox.textContent = 'Please provide ' + missing.join(', ') + '.';
          errBox.hidden = false;
        }
        var firstBad = $('.field.is-bad input, .field.is-bad select, .field.is-bad textarea', form);
        if (firstBad) firstBad.focus();
        return;
      }
      if (errBox) errBox.hidden = true;

      var lines = [];
      $$('input, select, textarea', form).forEach(function (el) {
        if (!el.name || el.type === 'file') return;
        if ((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
        var v = el.value.trim();
        if (v) lines.push((el.dataset.label || el.name) + ': ' + v);
      });
      var files = $('input[type="file"]', form);
      if (files && files.files && files.files.length) {
        var names = [];
        for (var i = 0; i < files.files.length; i++) names.push(files.files[i].name);
        lines.push('Attachments: ' + names.join(', ') + ' (please attach before sending)');
      }

      window.location.href = 'mailto:' + form.dataset.mailto +
        '?subject=' + encodeURIComponent(form.dataset.subject || 'Website enquiry') +
        '&body=' + encodeURIComponent(lines.join('\n'));
    });

    $$('input, textarea, select', form).forEach(function (el) {
      el.addEventListener('input', function () {
        var f = el.closest('.field');
        if (f) f.classList.remove('is-bad');
      });
    });
  });

  /* ============================================================== PRINT === */
  $$('[data-print]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });

})();
