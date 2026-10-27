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
        // Kill every colour transition for this one switch: hundreds of
        // elements animating background/colour at once was the lag.
        root.classList.add('theme-switching');
        root.setAttribute('data-theme', next);
        setTimeout(function () { root.classList.remove('theme-switching'); }, 60);
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
          { duration: 520, easing: 'cubic-bezier(.65,0,.35,1)', pseudoElement: '::view-transition-new(root)' }
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

  // Desktop "More" menu: close on outside click, Escape, or choosing a link.
  document.addEventListener('click', function (e) {
    Array.prototype.forEach.call(document.querySelectorAll('.nav-more details[open]'), function (d) {
      if (!d.contains(e.target) || (e.target.closest && e.target.closest('.nav-more-menu a'))) d.removeAttribute('open');
    });
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Array.prototype.forEach.call(document.querySelectorAll('.nav-more details[open]'), function (d) { d.removeAttribute('open'); }); });

  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');
  // Mobile menu: slides down, locks the page behind it, and closes on a
  // link tap, a tap outside, Escape, or rotating to desktop width.
  if (navToggle && mainNav) {
    var scrollYAtOpen = 0;
    function setNav(open) {
      if (open === mainNav.classList.contains('open')) return;
      mainNav.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.documentElement.classList.toggle('nav-open', open);
      if (open) {
        scrollYAtOpen = window.scrollY;
        document.body.style.top = -scrollYAtOpen + 'px';
        document.body.classList.add('nav-lock');
      } else {
        document.body.classList.remove('nav-lock');
        document.body.style.top = '';
        window.scrollTo({ top: scrollYAtOpen, behavior: 'instant' });
      }
    }
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.addEventListener('click', function (e) { e.stopPropagation(); setNav(!mainNav.classList.contains('open')); });
    mainNav.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      var hash = href.indexOf('#') > -1 ? href.slice(href.indexOf('#')) : '';
      var samePage = href.charAt(0) === '#' || (href.indexOf('/#') === 0 && location.pathname === '/');
      setNav(false);
      if (samePage && hash.length > 1) {
        var target = document.querySelector(hash);
        if (target) { e.preventDefault(); history.pushState(null, '', hash); target.scrollIntoView({ behavior: 'smooth' }); }
      }
    });
    document.addEventListener('click', function (e) {
      if (mainNav.classList.contains('open') && !mainNav.contains(e.target) && !navToggle.contains(e.target)) setNav(false);
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
    window.matchMedia('(min-width: 960px)').addEventListener('change', function (m) { if (m.matches) setNav(false); });
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
  function postForm(type, fields, honeypot, attempt, extra) {
    attempt = attempt || 1;
    extra = extra || {};
    return fetch('/api/forms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type, fields: fields, website: honeypot || '', t: extra.t || 0, cf: extra.cf || '' }),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, data: data || {} };
      });
    }, function (err) {
      if (attempt < 2) {
        return new Promise(function (r) { setTimeout(r, 1200); }).then(function () { return postForm(type, fields, honeypot, attempt + 1, extra); });
      }
      throw err;
    });
  }

  // Phone country pickers (lib/phone.ts phoneFieldHtml): show the chosen
  // country's flag and code, and preselect from the visitor's time zone.
  function phoneShow(sel) {
    var box = sel.closest('.ph-cc');
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll('.ph-flag'), function (f) { f.hidden = f.dataset.iso !== sel.value; });
    var opt = sel.options[sel.selectedIndex];
    var dial = box.querySelector('.ph-dial');
    if (dial && opt) dial.textContent = '+' + opt.dataset.dial;
  }
  document.addEventListener('change', function (e) {
    if (e.target && e.target.matches && e.target.matches('select.ph-select[data-autocountry]')) phoneShow(e.target);
  });
  (function () {
    var tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (err) {}
    var map = [[/^Africa\/Accra/, 'GH'], [/^Africa\/Nairobi/, 'KE'], [/^Africa\/Johannesburg/, 'ZA'], [/^Africa\/Douala/, 'CM'],
      [/^Africa\/Porto-Novo/, 'BJ'], [/^Africa\/Lome/, 'TG'], [/^Europe\/London/, 'GB'], [/^Europe\/Dublin/, 'IE'],
      [/^Europe\/Berlin/, 'DE'], [/^Europe\/Paris/, 'FR'], [/^Europe\/Rome/, 'IT'], [/^Europe\/Amsterdam/, 'NL'],
      [/^Europe\/Madrid/, 'ES'], [/^Asia\/Dubai/, 'AE'], [/^Australia\//, 'AU'],
      [/^America\/(Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Regina|St_Johns)/, 'CA'], [/^America\//, 'US']];
    var iso = 'NG';
    for (var i = 0; i < map.length; i++) if (map[i][0].test(tz)) { iso = map[i][1]; break; }
    if (iso === 'NG') return;
    Array.prototype.forEach.call(document.querySelectorAll('select.ph-select[data-autocountry]'), function (sel) { sel.value = iso; phoneShow(sel); });
  })();

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
    // When the visitor started filling the form (a bot check: humans take
    // more than a second or two).
    var startedAt = 0;
    form.addEventListener('focusin', function () { if (!startedAt) startedAt = Date.now(); });

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
      // "Share with the church office" consent (SHEP.HRD), unticked by default.
      var share = form.querySelector('input[name="share"]');
      if (share) fields.share = share.checked ? 'yes' : 'no';
      var cfInput = form.querySelector('input[name="cf-turnstile-response"]');
      var extra = { t: startedAt ? Date.now() - startedAt : 0, cf: cfInput ? cfInput.value : '' };

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }

      postForm(type, fields, honeypot ? honeypot.value : '', 1, extra)
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
    // Only elements near the viewport are measured each frame, and every
    // read happens before any write, so the browser never has to redo
    // layout mid-frame (that was the scroll stutter on phones).
    var near = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) near.add(e.target); else near.delete(e.target); });
      requestFrame();
    }, { rootMargin: '25% 0px 25% 0px' });
    popEls.forEach(function (el) { io.observe(el); });
    btnEls.forEach(function (el) { io.observe(el); });
    var splashDone = false;

    function updateFrame() {
      var scrollY = window.scrollY || window.pageYOffset;
      var vh = window.innerHeight;
      var start = vh * 0.94, end = vh * 0.52;
      var btnStart = vh * 0.86, btnEnd = vh * 0.5;
      if (!splashDone) splashDone = !document.documentElement.classList.contains('splash-lock');

      var reads = [];
      near.forEach(function (el) { reads.push([el, el.getBoundingClientRect().top]); });
      parallaxLayers.forEach(function (el) {
        var speed = parseFloat(el.dataset.speed) || 0;
        el.style.transform = 'translate3d(0,' + (scrollY * speed).toFixed(1) + 'px,0)';
      });
      for (var i = 0; i < reads.length; i++) {
        var el = reads[i][0], top = reads[i][1];
        if (el.classList.contains('pop')) {
          var progress = Math.min(Math.max((start - top) / (start - end), 0), 1);
          if (el._p === progress) continue;
          el._p = progress;
          el.style.opacity = progress < 0.001 ? 0.001 : progress;
          el.style.transform = progress >= 1 ? 'none' :
            'translate3d(0,' + (40 * (1 - progress)).toFixed(1) + 'px,0) rotateX(' + (14 * (1 - progress)).toFixed(1) + 'deg) scale(' + (0.94 + 0.06 * progress).toFixed(3) + ')';
        } else {
          var raw = (btnStart - top) / (btnStart - btnEnd);
          if (top + scrollY < vh * 0.95 && splashDone) raw = 1;
          var f = Math.min(Math.max(raw, 0), 1);
          if (el._f !== f) { el._f = f; el.style.setProperty('--fill', (f * 100).toFixed(1) + '%'); }
        }
      }
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

// Typewriter headings: <span class="tw" data-words="a|b|c">. Types each
// phrase, holds, deletes, moves on. Static first phrase for reduced motion.
(function () {
  const els = document.querySelectorAll('.tw[data-words]');
  if (!els.length || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  els.forEach((el) => {
    const words = el.dataset.words.split('|');
    let w = 0, i = words[0].length, del = false;
    const step = () => {
      const word = words[w];
      if (!del && i === word.length) { del = true; return setTimeout(step, 2200); }
      if (del && i === 0) { del = false; w = (w + 1) % words.length; return setTimeout(step, 350); }
      i += del ? -1 : 1;
      el.textContent = word.slice(0, i);
      setTimeout(step, del ? 38 : 75 + Math.random() * 50);
    };
    setTimeout(step, 2400);
  });
})();

// Hero "TCH ____" billboard. GLOBAL owns the screen; three variations make a
// short entrance each, then it always lands back on GLOBAL. A small cube
// rolls behind the last letter as it types, and breathes with the caret.
(function () {
  const em = document.querySelector('.hero-title .hx');
  if (!em || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const MAIN = 'Global';
  const POOL = ['Youth', 'Loveforce', 'Teens', 'Kids', 'Family', 'Worship', 'Nations', 'Prayer', 'Comfort'];
  const HOLD_MAIN = 6500, HOLD_ALT = 3200, TYPE = 95, DEL = 48, GAP = 280;

  em.textContent = '';
  const text = document.createTextNode(MAIN);
  const cube = document.createElement('span'); cube.className = 'hx-cube'; cube.innerHTML = '<i></i>';
  const caret = document.createElement('i'); caret.className = 'hx-caret';
  em.append(cube, text, caret);
  const h1 = em.closest('.hero-title');

  let angle = 0, bag = [];
  const nextBatch = () => {
    if (bag.length < 3) bag = POOL.slice().sort(() => Math.random() - 0.5);
    return bag.splice(0, 3);
  };

  // Fit long words to the line before typing them (smooth font-size change).
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:inherit;letter-spacing:inherit;text-transform:inherit';
  em.appendChild(probe);
  const fit = (w) => {
    probe.textContent = w;
    const scale = Math.min(1, (h1.clientWidth * 0.96) / Math.max(1, probe.offsetWidth));
    em.style.setProperty('--hx-s', scale.toFixed(3));
  };

  const place = (dir) => {
    const n = text.data.length;
    // The cube sits behind the last letter, centred on it and about 1.35x
    // its size (the larger of its width and the capital height).
    const fs = parseFloat(getComputedStyle(em).fontSize) || 40;
    let x = 0, y = 0, side = fs * 0.72 * 1.35;
    if (n) {
      const r = document.createRange(); r.setStart(text, n - 1); r.setEnd(text, n);
      const a = r.getBoundingClientRect(), b = em.getBoundingClientRect();
      const sc = parseFloat(em.style.getPropertyValue('--hx-s')) || 1;
      const aw = a.width / sc, ah = a.height / sc;
      side = Math.max(aw, fs * 0.72) * 1.35;
      const cx = (a.left - b.left) / sc + aw / 2;
      // Middle of a capital: baseline (~78% down the glyph box) minus half the cap height.
      const cy = (a.top - b.top) / sc + ah * 0.78 - fs * 0.36;
      x = cx - side / 2; y = cy - side / 2;
    }
    cube.style.setProperty('--x', x.toFixed(1) + 'px');
    cube.style.setProperty('--y', y.toFixed(1) + 'px');
    cube.style.setProperty('--s', side.toFixed(1) + 'px');
    if (dir) {
      angle += dir * 90;
      cube.style.setProperty('--a', angle + 'deg');
      cube.classList.remove('hop'); void cube.offsetWidth; cube.classList.add('hop');
    }
  };
  const idle = (on) => { em.classList.toggle('hx-idle', on); };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  async function swap(word) {
    idle(false);
    while (text.data.length) { text.data = text.data.slice(0, -1); place(-1); await wait(DEL); }
    fit(word);
    await wait(GAP);
    for (let i = 1; i <= word.length; i++) { text.data = word.slice(0, i); place(1); await wait(TYPE + (i === 1 ? 60 : Math.random() * 40)); }
    idle(true);
  }

  async function run() {
    fit(MAIN); place(0); idle(true);
    await wait(HOLD_MAIN);
    for (;;) {
      for (const w of nextBatch()) { await swap(w); await wait(HOLD_ALT); }
      await swap(MAIN); await wait(HOLD_MAIN);
    }
  }
  addEventListener('resize', () => { fit(text.data || MAIN); place(0); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(run);
})();
