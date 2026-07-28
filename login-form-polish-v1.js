(function () {
  "use strict";

  function initializePasswordToggle() {
    const input = document.querySelector('#loginForm input[name="password"]');
    const button = document.getElementById('loginPasswordToggle');
    if (!input || !button || button.dataset.bound === 'true') return;

    button.dataset.bound = 'true';
    button.addEventListener('click', function () {
      const reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      button.textContent = reveal ? 'Nascondi' : 'Mostra';
      button.setAttribute('aria-label', reveal ? 'Nascondi password' : 'Mostra password');
      button.setAttribute('aria-pressed', reveal ? 'true' : 'false');
      input.focus({ preventScroll: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePasswordToggle);
  } else {
    initializePasswordToggle();
  }
})();
