/* FIL-ITALIA anti-spam layer
   Load this file AFTER script.js on register.html and camp-register.html. */
(function () {
  'use strict';

  function tx(key) {
    return window.FilitaliaI18n && typeof window.FilitaliaI18n.t === 'function' ? window.FilitaliaI18n.t(key) : key;
  }

  const MIN_FILL_TIME_MS = 3500;
  const MAX_FILL_TIME_MS = 2 * 60 * 60 * 1000;

  function addHiddenField(form, name, value) {
    let input = form.querySelector(`[name="${name}"]`);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value;
    return input;
  }

  function addHoneypot(form) {
    if (form.querySelector('[name="website"]')) return;

    const wrapper = document.createElement('div');
    wrapper.setAttribute('aria-hidden', 'true');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-10000px';
    wrapper.style.width = '1px';
    wrapper.style.height = '1px';
    wrapper.style.overflow = 'hidden';
    wrapper.style.opacity = '0';
    wrapper.style.pointerEvents = 'none';

    const label = document.createElement('label');
    label.textContent = 'Website';

    const input = document.createElement('input');
    input.type = 'text';
    input.name = 'website';
    input.tabIndex = -1;
    input.autocomplete = 'off';

    label.appendChild(input);
    wrapper.appendChild(label);
    form.appendChild(wrapper);
  }

  function normalizeText(value, maxLength) {
    return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLength);
  }

  function validateForm(form) {
    const startedAt = Number(form.querySelector('[name="formStartedAt"]')?.value || 0);
    const elapsed = Date.now() - startedAt;
    const honeypot = form.querySelector('[name="website"]')?.value.trim();

    if (honeypot) return { ok: false, silent: true };
    if (!startedAt || elapsed < MIN_FILL_TIME_MS || elapsed > MAX_FILL_TIME_MS) {
      return { ok: false, message: tx('invalidSubmission') };
    }

    const emailInputs = form.querySelectorAll('input[type="email"]');
    for (const input of emailInputs) {
      if (input.value && !input.checkValidity()) {
        return { ok: false, message: tx('invalidEmails') };
      }
    }

    const fileInputs = form.querySelectorAll('input[type="file"]');
    for (const input of fileInputs) {
      const file = input.files && input.files[0];
      if (!file) continue;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        return { ok: false, message: tx('errorPhotoType') };
      }
      if (file.size > 5 * 1024 * 1024) {
        return { ok: false, message: tx('errorPhotoSize') };
      }
    }

    return { ok: true };
  }

  function prepareForm(form) {
    addHoneypot(form);
    addHiddenField(form, 'formStartedAt', String(Date.now()));
    addHiddenField(form, 'securityVersion', '2026-07-18');

    form.querySelectorAll('input:not([type="file"]), textarea').forEach(field => {
      field.addEventListener('blur', () => {
        if (field.type !== 'email' && field.type !== 'date' && field.type !== 'checkbox') {
          field.value = normalizeText(field.value, field.tagName === 'TEXTAREA' ? 2000 : 250);
        }
      });
    });

    form.addEventListener('submit', event => {
      const result = validateForm(form);
      if (result.ok) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!result.silent) {
        const status = form.querySelector('.form-status');
        if (status) {
          status.className = 'form-status error';
          status.textContent = result.message;
        } else {
          alert(result.message);
        }
      }
    }, true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.site-registration-form').forEach(prepareForm);
  });
})();
