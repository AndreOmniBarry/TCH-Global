document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  var amountButtons = document.querySelectorAll('.amount-grid button');
  var customAmount = document.getElementById('custom-amount');

  amountButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      amountButtons.forEach(function (b) {
        b.classList.remove('active');
      });
      button.classList.add('active');
      if (customAmount) {
        customAmount.value = button.dataset.amount || '';
      }
    });
  });

  var freqButtons = document.querySelectorAll('.freq-switch button');
  freqButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      freqButtons.forEach(function (b) {
        b.classList.remove('active');
      });
      button.classList.add('active');
    });
  });

  var year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  /* Pop-up book depth engine.
     Every frame, each layer's transform is derived fresh from the current
     scroll position, so scrolling down "unfolds" cards and giant hero text
     drifts at its own depth, while scrolling back up smoothly folds it all
     back closed. Nothing here is a one-shot trigger. */
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var parallaxLayers = Array.prototype.slice.call(document.querySelectorAll('[data-speed]'));
  var popEls = Array.prototype.slice.call(document.querySelectorAll('.reveal'));

  if (prefersReducedMotion || (!parallaxLayers.length && !popEls.length)) {
    popEls.forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
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
});
