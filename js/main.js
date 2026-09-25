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
    toggle.dataset.active = initial;

    function currentIsDark() {
      return root.getAttribute('data-theme') === 'dark';
    }
    toggle.addEventListener('click', function () {
      var next = currentIsDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      toggle.dataset.active = next;
      try { localStorage.setItem('tch-theme', next); } catch (e) {}
    });
  })();

  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      mainNav.classList.toggle('open');
    });
  }

  function wireForm(formId, doneId) {
    var form = document.getElementById(formId);
    var done = document.getElementById(doneId);
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      form.hidden = true;
      if (done) done.hidden = false;
    });
  }
  wireForm('prayer-form', 'prayer-done');
  wireForm('join-form', 'join-done');
  wireForm('give-form', 'give-done');
  wireForm('volunteer-form', 'volunteer-done');

  var newsletterForm = document.getElementById('newsletter-form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      newsletterForm.querySelector('input').value = '';
      newsletterForm.querySelector('button').textContent = 'Joined!';
    });
  }

  // Pop-up book depth engine. Every scroll frame, each layer's transform is
  // derived fresh from the live scroll position — nothing here is a
  // one-shot trigger. Scrolling down unfolds cards off the page like a
  // pop-up book; scrolling back up folds them flat again.
  (function () {
    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var parallaxLayers = Array.prototype.slice.call(document.querySelectorAll('[data-speed]'));
    var popEls = Array.prototype.slice.call(document.querySelectorAll('.pop'));

    if (prefersReducedMotion || (!parallaxLayers.length && !popEls.length)) {
      popEls.forEach(function (el) { el.style.opacity = 1; el.style.transform = 'none'; });
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

  // Live map — OpenStreetMap via Leaflet, no API key required.
  (function () {
    var el = document.getElementById('church-map');
    if (!el || typeof L === 'undefined') return;
    var lat = 6.3533, lng = 5.6702;
    var map = L.map(el, { scrollWheelZoom: false }).setView([lat, lng], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    L.marker([lat, lng]).addTo(map).bindPopup('TCH Global Campus');
  })();
