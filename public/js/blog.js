// Next.js loads this with strategy="afterInteractive", which usually runs
// AFTER the DOMContentLoaded event has already fired — so a plain
// `document.addEventListener('DOMContentLoaded', ...)` here would never
// run. Guard against that by running immediately if the DOM is already
// ready, and only waiting for the event if it genuinely hasn't fired yet.
function initBlogPage() {
  // Reading progress bar
  var progress = document.querySelector('.read-progress');
  if (progress) {
    function updateProgress() {
      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - doc.clientHeight;
      var pct = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
      progress.style.width = Math.min(100, Math.max(0, pct)) + '%';
    }
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  // Bible verse lookup — bible-api.com, free, no key, KJV by default.
  // Tap/click on desktop; a short hold (450ms) on touch counts as a
  // "long press" without blocking normal scrolling.
  (function () {
    var refs = document.querySelectorAll('.bible-ref');
    if (!refs.length) return;

    var backdrop = document.createElement('div');
    backdrop.className = 'verse-sheet-backdrop';
    backdrop.innerHTML =
      '<div class="verse-sheet" role="dialog" aria-modal="true">' +
      '<button class="close-btn" aria-label="Close">&times;</button>' +
      '<div class="handle"></div>' +
      '<span class="ref"></span>' +
      '<div class="text loading">Loading verse&hellip;</div>' +
      '<div class="source">King James Version &middot; via bible-api.com</div>' +
      '</div>';
    document.body.appendChild(backdrop);

    var sheet = backdrop.querySelector('.verse-sheet');
    var refEl = backdrop.querySelector('.ref');
    var textEl = backdrop.querySelector('.text');
    var closeBtn = backdrop.querySelector('.close-btn');
    var cache = {};

    function openSheet(reference) {
      refEl.textContent = reference;
      textEl.textContent = 'Loading verse…';
      textEl.classList.add('loading');
      backdrop.classList.add('open');
      document.body.style.overflow = 'hidden';

      if (cache[reference]) {
        renderVerse(cache[reference]);
        return;
      }

      fetch('https://bible-api.com/' + encodeURIComponent(reference) + '?translation=kjv')
        .then(function (res) {
          if (!res.ok) throw new Error('lookup failed');
          return res.json();
        })
        .then(function (data) {
          var text = (data.text || '').trim();
          cache[reference] = text;
          renderVerse(text);
        })
        .catch(function () {
          textEl.textContent = 'Could not load this verse right now. Please try again.';
          textEl.classList.remove('loading');
        });
    }

    function renderVerse(text) {
      textEl.textContent = text || 'Verse text unavailable.';
      textEl.classList.remove('loading');
    }

    function closeSheet() {
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeSheet();
    });
    closeBtn.addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSheet();
    });

    refs.forEach(function (el) {
      var reference = el.dataset.ref;
      var pressTimer = null;
      var longPressed = false;

      el.addEventListener('click', function (e) {
        if (longPressed) {
          longPressed = false;
          return;
        }
        e.preventDefault();
        openSheet(reference);
      });

      el.addEventListener('touchstart', function () {
        longPressed = false;
        pressTimer = setTimeout(function () {
          longPressed = true;
          openSheet(reference);
        }, 450);
      }, { passive: true });

      ['touchend', 'touchmove', 'touchcancel'].forEach(function (evt) {
        el.addEventListener(evt, function () {
          clearTimeout(pressTimer);
        }, { passive: true });
      });
    });
  })();

  // Share row — Web Share API where available (this is what surfaces
  // "Add to Story" for Instagram/Facebook/WhatsApp status on mobile,
  // since that's handled by the OS share sheet, not by us). Falls back
  // to direct platform links + copy-link for desktop browsers.
  (function () {
    var shareBtns = document.querySelectorAll('[data-share]');
    if (!shareBtns.length) return;

    var pageUrl = window.location.href;
    var pageTitle = document.title;

    shareBtns.forEach(function (btn) {
      var kind = btn.dataset.share;

      btn.addEventListener('click', function (e) {
        if (kind === 'native') {
          if (navigator.share) {
            e.preventDefault();
            navigator.share({ title: pageTitle, url: pageUrl }).catch(function () {});
          } else {
            // No native share sheet (most desktop browsers) — fall back to copy.
            e.preventDefault();
            copyLink(btn);
          }
          return;
        }

        if (kind === 'copy') {
          e.preventDefault();
          copyLink(btn);
        }
        // whatsapp / x / facebook use plain <a href> intent links — no JS needed.
      });
    });

    function copyLink(btn) {
      var done = function () {
        btn.classList.add('copied');
        var original = btn.getAttribute('aria-label');
        btn.setAttribute('aria-label', 'Link copied');
        setTimeout(function () {
          btn.classList.remove('copied');
          btn.setAttribute('aria-label', original);
        }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pageUrl).then(done).catch(function () {
          window.prompt('Copy this link:', pageUrl);
        });
      } else {
        window.prompt('Copy this link:', pageUrl);
      }
    }
  })();

  // Newsletter forms (front-end only for now — see README for backend status)
  document.querySelectorAll('.newsletter-form-row').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button');
      var input = form.querySelector('input');
      if (input) input.value = '';
      if (btn) btn.textContent = 'Subscribed!';
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBlogPage);
} else {
  initBlogPage();
}
