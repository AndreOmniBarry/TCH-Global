  // Theme toggle. Light is the default for every visitor regardless of OS
  // preference; dark only applies once someone explicitly picks it (then
  // it's remembered for their next visit).
  (function () {
    var root = document.documentElement;
    var toggle = document.getElementById('theme-toggle');
    var stored = null;
    try { stored = localStorage.getItem('tch-theme'); } catch (e) {}
    var initial = stored === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', initial);
    // Pages with no site header (e.g. /studio, which is Sanity's own
    // full-page UI) have no #theme-toggle — this script still loads
    // globally there, so bail instead of throwing on a null element,
    // which would otherwise halt every script below this one on that page.
    if (!toggle) return;
    toggle.dataset.active = initial;

    function currentIsDark() {
      return root.getAttribute('data-theme') === 'dark';
    }
    toggle.addEventListener('click', function () {
      var next = currentIsDark() ? 'light' : 'dark';
      function apply() {
        root.setAttribute('data-theme', next);
        toggle.dataset.active = next;
        try { localStorage.setItem('tch-theme', next); } catch (e) {}
      }
      var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!document.startViewTransition || reduce) { apply(); return; }
      // Circular wipe from the toggle to the farthest corner.
      var r = toggle.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.startViewTransition(apply).ready.then(function () {
        document.documentElement.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 650, easing: 'cubic-bezier(.7,0,.25,1)', pseudoElement: '::view-transition-new(root)' }
        );
      });
    });
  })();

  // Header account link: "Sign in", or the member's first name.
  (function () {
    var links = document.querySelectorAll('[data-account-link]');
    if (!links.length) return;
    fetch('/api/auth/me', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.member) return;
      var first = String(d.member.name || '').split(' ')[0] || 'Account';
      Array.prototype.forEach.call(links, function (a) { a.textContent = first; a.classList.add('is-member'); });
    }).catch(function () {});
  })();

  // Segmented switches: a pill that glides to the selected option (works
  // for React-rendered switches too, since it watches class changes).
  (function () {
    var SEL = '.account-switch, .publish-mode, .pl-tabs, .tw-tabs, .an-seg';
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function place(group, instant) {
      var on = group.querySelector('button.on, button[aria-selected="true"], button[aria-checked="true"]');
      var pill = group.querySelector(':scope > .seg-pill');
      if (!pill) { pill = document.createElement('span'); pill.className = 'seg-pill'; pill.setAttribute('aria-hidden', 'true'); group.prepend(pill); instant = true; }
      if (!on) { pill.style.opacity = '0'; return; }
      if (instant || reduce) pill.style.transition = 'none';
      pill.style.opacity = '1';
      pill.style.width = on.offsetWidth + 'px';
      pill.style.height = on.offsetHeight + 'px';
      pill.style.transform = 'translate(' + on.offsetLeft + 'px,' + on.offsetTop + 'px)';
      if (instant || reduce) { void pill.offsetWidth; pill.style.transition = ''; }
    }
    function wire(group) {
      if (group.dataset.seg) return;
      group.dataset.seg = '1';
      group.classList.add('seg');
      place(group, true);
      new MutationObserver(function () { place(group); }).observe(group, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected', 'aria-checked'] });
      group.addEventListener('scroll', function () { place(group, true); }, { passive: true });
    }
    function scan() { Array.prototype.forEach.call(document.querySelectorAll(SEL), wire); }
    scan();
    new MutationObserver(function () { scan(); }).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', function () { Array.prototype.forEach.call(document.querySelectorAll('.seg'), function (g) { place(g, true); }); });

    // First visit to the sign-up switch: a cursor glides over and taps
    // "Create account", like an onboarding hint.
    if (reduce) return;
    var seen = false;
    try { seen = localStorage.getItem('tch_seg_demo') === '1'; } catch (e) {}
    if (seen) return;
    var tries = 0;
    var t = setInterval(function () {
      var g = document.querySelector('.account-switch');
      if (!g && ++tries < 20) return;
      clearInterval(t);
      if (!g) return;
      var target = g.querySelector('button.on') || g.querySelector('button');
      var cur = document.createElement('span');
      cur.className = 'seg-cursor';
      cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 3l14 8-6.2 1.6L10 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
      g.appendChild(cur);
      var x = target.offsetLeft + target.offsetWidth * 0.62, y = target.offsetTop + target.offsetHeight * 0.55;
      cur.style.transform = 'translate(' + (g.offsetWidth + 20) + 'px,' + (g.offsetHeight + 30) + 'px)';
      requestAnimationFrame(function () {
        cur.classList.add('go');
        cur.style.transform = 'translate(' + x + 'px,' + y + 'px)';
        setTimeout(function () { cur.classList.add('tap'); g.classList.add('seg-bump'); }, 900);
        setTimeout(function () { cur.classList.add('out'); g.classList.remove('seg-bump'); }, 1500);
        setTimeout(function () { cur.remove(); }, 2100);
      });
      try { localStorage.setItem('tch_seg_demo', '1'); } catch (e) {}
    }, 150);
  })();

  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      mainNav.classList.toggle('open');
    });
  }

  // Volunteer / Prayer / Join / Give forms all POST to /api/forms and
  // are stored in Vercel KV (see lib/forms.ts) — previously these just
  // hid the form and showed a fake "thank you" with nothing saved
  // anywhere. Field values are read from each input/select/textarea's
  // id, stripped of its "<type>-" prefix (e.g. "volunteer-name" -> "name").
  // Inline status line under a form (replaces window.alert).
  function formStatus(form, kind, text) {
    var el = form.parentNode.querySelector('.form-status[data-for="' + (form.id || form.dataset.source) + '"]');
    if (!el) {
      el = document.createElement('p');
      el.className = 'form-status';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.dataset.for = form.id || form.dataset.source || '';
      form.parentNode.insertBefore(el, form.nextSibling);
    }
    el.dataset.kind = kind;
    el.textContent = text;
  }

  // One automatic retry: phones on patchy data often drop the first
  // request, which used to surface as a scary "network error".
  function postForm(type, fields, honeypot, attempt) {
    attempt = attempt || 1;
    return fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, fields: fields, website: honeypot || '' }),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, data: data || {} };
      });
    }, function (err) {
      if (attempt < 2) {
        return new Promise(function (r) { setTimeout(r, 1200); }).then(function () { return postForm(type, fields, honeypot, attempt + 1); });
      }
      throw err;
    });
  }

  // Volunteer team chips: "Other" reveals a free-text box.
  Array.prototype.forEach.call(document.querySelectorAll('[data-other-toggle]'), function (box) {
    var input = box.closest('fieldset').querySelector('.chip-other-input');
    box.addEventListener('change', function () {
      input.hidden = !box.checked;
      var field = input.querySelector('textarea, input') || input;
      if (box.checked) field.focus();
    });
  });

  // Newsletter sign-ups (home footer, blog index, every post).
  Array.prototype.forEach.call(document.querySelectorAll('#newsletter-form, form.js-newsletter'), function (form) {
    var btn = form.querySelector('button[type="submit"]');
    var label = btn ? btn.textContent : '';
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = form.querySelector('input[type="email"]');
      var hp = form.querySelector('input[name="website"]');
      if (btn) { btn.disabled = true; btn.textContent = '…'; }
      postForm('newsletter', { email: email ? email.value : '', source: form.dataset.source || location.pathname }, hp ? hp.value : '')
        .then(function (r) {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          if (r.ok) {
            form.reset();
            formStatus(form, 'ok', 'You’re in — look out for the next reflection in your inbox.');
          } else {
            formStatus(form, 'error', r.data.error || 'Something went wrong. Please try again.');
          }
        })
        .catch(function () {
          if (btn) { btn.disabled = false; btn.textContent = label; }
          formStatus(form, 'error', 'We couldn’t reach the server. Check your internet connection and tap the button again.');
        });
    });
  });

  function wireForm(formId, doneId) {
    var form = document.getElementById(formId);
    var done = document.getElementById(doneId);
    if (!form) return;
    var type = formId.replace(/-form$/, '');
    var submitBtn = form.querySelector('button[type="submit"]');
    var originalLabel = submitBtn ? submitBtn.textContent : '';

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var fields = {};
      var teamBoxes = form.querySelectorAll('input[type="checkbox"][name="team"]');
      if (teamBoxes.length) {
        var picked = [];
        var missingOther = false;
        Array.prototype.forEach.call(teamBoxes, function (b) {
          if (!b.checked) return;
          if (b.value === '__other') {
            var o = form.querySelector('#volunteer-other');
            if (!o || !o.value.trim()) { missingOther = true; return; }
            picked.push('New team idea: ' + o.value.trim());
          } else picked.push(b.value);
        });
        if (missingOther) {
          formStatus(form, 'error', 'Describe the team you have in mind, or untick “Not listed”.');
          return;
        }
        if (!picked.length) {
          formStatus(form, 'error', 'Pick at least one team, or choose “Not listed” and describe it.');
          return;
        }
        fields.team = picked.join(', ');
      }
      Array.prototype.forEach.call(form.querySelectorAll('input, select, textarea'), function (el) {
        if (!el.id || el.type === 'submit' || el.type === 'checkbox' || el.name === 'website' || el.id === 'volunteer-other') return;
        var prefix = type + '-';
        var key = el.id.indexOf(prefix) === 0 ? el.id.slice(prefix.length) : el.id;
        fields[key] = el.value;
      });

      var honeypot = form.querySelector('input[name="website"]');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      postForm(type, fields, honeypot ? honeypot.value : '')
        .then(function (result) {
          if (result.ok) {
            var st = form.parentNode.querySelector('.form-status');
            if (st) st.remove();
            form.hidden = true;
            if (done) done.hidden = false;
          } else {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalLabel;
            }
            formStatus(form, 'error', result.data.error || 'Something went wrong. Please try again.');
          }
        })
        .catch(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          }
          formStatus(form, 'error', 'We couldn’t reach the server. Check your internet connection and tap the button again.');
        });
    });
  }
  wireForm('prayer-form', 'prayer-done');
  wireForm('join-form', 'join-done');
  wireForm('give-form', 'give-done');
  wireForm('volunteer-form', 'volunteer-done');
  wireForm('testimony-form', 'testimony-done');


  // Pop-up book depth engine. Every scroll frame, each layer's transform is
  // derived fresh from the live scroll position — nothing here is a
  // one-shot trigger. Scrolling down unfolds cards off the page like a
  // pop-up book; scrolling back up folds them flat again.
  (function () {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var parallaxLayers = Array.prototype.slice.call(document.querySelectorAll('[data-speed]'));
    var popEls = Array.prototype.slice.call(document.querySelectorAll('.pop'));
    var btnEls = Array.prototype.slice.call(document.querySelectorAll('.btn'));

    if (prefersReducedMotion || (!parallaxLayers.length && !popEls.length && !btnEls.length)) {
      popEls.forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
      // Buttons' filled/empty state under reduced motion is handled
      // entirely by CSS (prefers-reduced-motion override), not here.
      return;
    }

    var ticking = false;

    function updateFrame() {
      var scrollY = window.scrollY || window.pageYOffset;
      var vh = window.innerHeight;

      parallaxLayers.forEach(function (el) {
        var speed = parseFloat(el.dataset.speed) || 0;
        el.style.transform = 'translateY(' + (scrollY * speed) + 'px)';
      });

      var start = vh * 0.94;
      var end = vh * 0.52;

      popEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var raw = (start - rect.top) / (start - end);
        var progress = Math.min(Math.max(raw, 0), 1);
        var translateY = 40 * (1 - progress);
        var rotateX = 14 * (1 - progress);
        var scale = 0.94 + 0.06 * progress;
        el.style.opacity = 0.001 + progress * 0.999;
        el.style.transform =
          'translateY(' + translateY.toFixed(2) + 'px) rotateX(' + rotateX.toFixed(2) + 'deg) scale(' + scale.toFixed(3) + ')';
      });

      // Liquid-fill buttons: same progress formula as the .pop reveal,
      // written to --fill (a percentage) which .btn::before reads via
      // clip-path — fills as a button scrolls into view, drains back on
      // scroll-out. A faster start/end window than .pop so buttons feel
      // responsive rather than lagging the section around them.
      var btnStart = vh * 0.86;
      var btnEnd = vh * 0.5;
      btnEls.forEach(function (el) {
        var rect = el.getBoundingClientRect();
        var raw = rect.top + scrollY < vh * 0.95 ? Math.max((btnStart - rect.top) / (btnStart - btnEnd), document.documentElement.classList.contains('splash-lock') ? 0 : 1) : (btnStart - rect.top) / (btnStart - btnEnd);
        var progress = Math.min(Math.max(raw, 0), 1);
        el.style.setProperty('--fill', (progress * 100).toFixed(1) + '%');
      });

      ticking = false;
    }

    function requestFrame() {
      if (!ticking) {
        window.requestAnimationFrame(updateFrame);
        ticking = true;
      }
    }

    window.addEventListener('scroll', requestFrame, { passive: true });
    window.addEventListener('resize', requestFrame);
    updateFrame();
  })();

  // Live map — OpenStreetMap via Leaflet, no API key required. Leaflet
  // (JS + CSS) is only fetched when the map is about to scroll into
  // view, so it never delays the first paint of any page.
  (function () {
    var el = document.getElementById('church-map');
    if (!el) return;
    function init() {
      // 6°21'13.0"N 5°41'51.0"E — Grace Dome Church, Benin City
      var lat = 6.353611, lng = 5.6975;
      var map = L.map(el, { scrollWheelZoom: false }).setView([lat, lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      L.marker([lat, lng]).addTo(map).bindPopup('The Comforters House Global &mdash; Benin<br>Grace Dome Church').openPopup();
    }
    function load() {
      var css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      css.crossOrigin = '';
      document.head.appendChild(css);
      var js = document.createElement('script');
      js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      js.crossOrigin = '';
      js.onload = init;
      document.body.appendChild(js);
    }
    if (!('IntersectionObserver' in window)) return load();
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); load(); }
    }, { rootMargin: '600px 0px' });
    io.observe(el);
  })();

// Between-page loading bar: shows the moment an internal link to
// another page is followed, until the next page takes over.
(function () {
  var bar = document.createElement('div');
  bar.id = 'nav-bar';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    bar.classList.remove('go'); void bar.offsetWidth; bar.classList.add('go');
    var from = location.pathname + location.search, n = 0;
    var watch = setInterval(function () {
      n += 1;
      if (location.pathname + location.search !== from || n > 80) { clearInterval(watch); done(); }
    }, 100);
  });
  function done() {
    bar.style.transition = 'transform .25s ease, opacity .35s .2s';
    bar.style.transform = 'scaleX(1)';
    bar.style.opacity = '0';
    setTimeout(function () { bar.classList.remove('go'); bar.style.cssText = ''; }, 600);
  }
  window.addEventListener('pageshow', function () { bar.classList.remove('go'); });
})();
