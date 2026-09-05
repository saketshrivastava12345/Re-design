/* ===========================================================================
   GML — client authentication interface
   ---------------------------------------------------------------------------
   Tab routing, validation, password visibility and error/success states for
   the Login and Register views.

   THERE IS NO AUTHENTICATION BACKEND. Nothing in this file signs anybody in,
   stores a credential, or reports a successful sign-in. `AUTH.endpoint` is the
   one place a real API gets wired in; until it is set, a valid submission says
   plainly that no service is connected. Credentials are never written to
   storage, logged, or put in a URL.

   Routing: both views live on both pages. `#login` / `#register` select the
   view, and the URL is rewritten to the matching file so every state is
   linkable, bookmarkable and reachable with the back button.
   =========================================================================== */
(function () {
  'use strict';

  var AUTH = window.GML_AUTH = window.GML_AUTH || {
    /* POST target for real authentication. While null, the interface refuses
       to claim anything happened. Expected to return 2xx on success. */
    endpoint: null,
    /* Where a real "forgot password" flow lives, once there is one. */
    forgotUrl: null
  };

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var tabs   = $$('.auth__tabs button');
  var inkbar = $('.auth__ink');
  var panels = { login: $('#panel-login'), register: $('#panel-register') };
  var VIEWS  = ['login', 'register'];
  var FILE   = { login: 'login.html', register: 'register.html' };

  if (!tabs.length || !panels.login || !panels.register) return;

  var current = null;

  /* ------------------------------------------------------------- routing -- */
  function viewFromLocation() {
    var h = (location.hash || '').replace('#', '').toLowerCase();
    if (VIEWS.indexOf(h) > -1) return h;
    return document.body.dataset.authDefault === 'register' ? 'register' : 'login';
  }

  function show(view, pushUrl) {
    if (view === current) return;
    var from = current;
    current = view;

    tabs.forEach(function (t) {
      t.setAttribute('aria-selected', t.dataset.view === view ? 'true' : 'false');
    });
    inkbar.style.setProperty('--ink-x', view === 'register' ? '100%' : '0%');

    VIEWS.forEach(function (v) {
      var p = panels[v];
      p.hidden = v !== view;
      p.classList.remove('is-enter');
    });

    if (from) {
      // the incoming panel sweeps in from the side the tab moved towards
      var p = panels[view];
      p.style.setProperty('--from', VIEWS.indexOf(view) > VIEWS.indexOf(from) ? '22px' : '-22px');
      // restart the animation
      void p.offsetWidth;
      p.classList.add('is-enter');
    }

    document.title = (view === 'register' ? 'Create an account' : 'Client login') +
      ' — Greenwich Meridian Logistics (India) Pvt. Ltd.';

    if (pushUrl) {
      history.pushState({ view: view }, '', FILE[view] + '#' + view);
      var first = panels[view].querySelector('input');
      if (first) first.focus();
    }
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () { show(t.dataset.view, true); });
    t.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var i = (VIEWS.indexOf(t.dataset.view) + d + VIEWS.length) % VIEWS.length;
      tabs[i].focus();
      show(VIEWS[i], true);
    });
  });

  window.addEventListener('popstate', function () { show(viewFromLocation(), false); });
  window.addEventListener('hashchange', function () { show(viewFromLocation(), false); });
  show(viewFromLocation(), false);

  /* -------------------------------------------------- password visibility -- */
  $$('.auth__peek').forEach(function (btn) {
    var input = document.getElementById(btn.dataset.for);
    if (!input) return;
    btn.addEventListener('click', function () {
      var shown = input.type === 'text';
      input.type = shown ? 'password' : 'text';
      btn.textContent = shown ? 'Show' : 'Hide';
      btn.setAttribute('aria-label', (shown ? 'Show' : 'Hide') + ' password');
      btn.setAttribute('aria-pressed', shown ? 'false' : 'true');
      input.focus();
    });
  });

  /* ------------------------------------------------------------ validation -- */
  var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setError(input, message) {
    var field = input.closest('.field');
    var err = field ? field.querySelector('.field__err') : null;
    if (field) field.classList.toggle('is-bad', !!message);
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (err) {
      err.textContent = message || '';
      err.hidden = !message;
    }
    return !message;
  }

  function validate(input) {
    var v = input.value.trim();
    var name = input.dataset.rule || input.type;

    if (input.required && !v) return setError(input, 'This field is required.');
    if (!v) return setError(input, '');

    if (name === 'email' && !EMAIL.test(v)) return setError(input, 'Enter a valid email address.');
    if (name === 'tel' && v.replace(/[^\d]/g, '').length < 7) return setError(input, 'Enter a valid phone number.');
    if (name === 'password' && input.value.length < 8) return setError(input, 'Use at least 8 characters.');
    if (name === 'confirm') {
      var pw = document.getElementById(input.dataset.match);
      if (pw && input.value !== pw.value) return setError(input, 'The two passwords do not match.');
    }
    return setError(input, '');
  }

  $$('.auth__panel input').forEach(function (input) {
    input.addEventListener('blur', function () { validate(input); });
    input.addEventListener('input', function () {
      if (input.getAttribute('aria-invalid') === 'true') validate(input);
    });
  });

  /* ---------------------------------------------------------------- submit -- */
  $$('.auth__panel form').forEach(function (form) {
    var notice = form.querySelector('.auth__notice');
    var submit = form.querySelector('[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      notice.hidden = true;

      var inputs = $$('input', form).filter(function (i) { return i.type !== 'checkbox'; });
      var ok = true, firstBad = null;
      inputs.forEach(function (i) {
        if (!validate(i)) { ok = false; if (!firstBad) firstBad = i; }
      });

      if (!ok) {
        if (firstBad) firstBad.focus();
        return;
      }

      if (!AUTH.endpoint) {
        // No service is connected. Say exactly that rather than invent a
        // session, a token or a redirect.
        notice.innerHTML =
          '<b>This is the interface only.</b> No authentication service is connected to this ' +
          'build, so nothing has been submitted and no account has been created or signed in. ' +
          'Point <code>GML_AUTH.endpoint</code> in <code>assets/js/auth.js</code> at the real API ' +
          'and this form will post to it unchanged.';
        notice.hidden = false;
        notice.focus();
        return;
      }

      submit.disabled = true;
      fetch(AUTH.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
        credentials: 'same-origin'
      })
        .then(function (res) {
          if (!res.ok) throw new Error(res.status);
          return res.json().catch(function () { return {}; });
        })
        .then(function (data) {
          if (data && data.redirect) { window.location.assign(data.redirect); return; }
          notice.textContent = 'Signed in.';
          notice.hidden = false;
        })
        .catch(function () {
          notice.textContent = 'We could not complete that request. Please check your details and try again, or email info@gmlindia.net.';
          notice.hidden = false;
          notice.focus();
        })
        .then(function () { submit.disabled = false; });
    });
  });

  /* Forgot password only leads somewhere once a real flow exists. */
  var forgot = $('#authForgot');
  if (forgot) {
    forgot.addEventListener('click', function (e) {
      if (AUTH.forgotUrl) { window.location.assign(AUTH.forgotUrl); return; }
      e.preventDefault();
      var notice = $('#noticeLogin');
      notice.innerHTML =
        '<b>Password recovery is not connected yet.</b> Please email ' +
        '<a href="mailto:info@gmlindia.net">info@gmlindia.net</a> or call ' +
        '<a href="tel:+912261489999">+91 22 6148 9999</a> and our team will help.';
      notice.hidden = false;
      notice.focus();
    });
  }

  /* Brand logo drop-in slot, same contract as the homepage. */
  $$('[data-brand-logo]').forEach(function (img) {
    function ok() { img.classList.add('is-ok'); }
    if (img.complete && img.naturalWidth) ok();
    img.addEventListener('load', ok);
  });

  var yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
