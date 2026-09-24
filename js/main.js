document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');

  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
  }

  var giveButtons = document.querySelectorAll('.give-options button');
  var customAmount = document.getElementById('amount');

  giveButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      giveButtons.forEach(function (b) {
        b.classList.remove('active');
      });
      button.classList.add('active');
      if (customAmount) {
        customAmount.value = button.dataset.amount || '';
      }
    });
  });

  var year = document.getElementById('year');
  if (year) {
    year.textContent = new Date().getFullYear();
  }
});
