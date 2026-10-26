// Accessible dialog helper shared by the cart drawer and the product modal:
// focus trap, Esc / backdrop close, page scroll lock, inert background, focus return.
window.Dialog = (function () {
  'use strict';

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const BACKGROUND = ['#site-header', '#main', '.site-footer', '#to-top'];
  let current = null;

  function focusables(root) {
    return Array.prototype.filter.call(root.querySelectorAll(FOCUSABLE), function (el) {
      return el.getClientRects().length > 0;
    });
  }

  function setBackgroundInert(on) {
    BACKGROUND.forEach(function (selector) {
      const el = document.querySelector(selector);
      if (!el) return;
      if (on) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  function lockScroll(on) {
    const root = document.documentElement;
    if (on) {
      // Keep the layout from jumping when the scrollbar disappears.
      root.style.setProperty('--scrollbar-gap', (window.innerWidth - root.clientWidth) + 'px');
      root.classList.add('scroll-locked');
    } else {
      root.classList.remove('scroll-locked');
      root.style.removeProperty('--scrollbar-gap');
    }
  }

  function onKeydown(e) {
    if (!current) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables(current.el);
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && (document.activeElement === first || !current.el.contains(document.activeElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function onClick(e) {
    if (current && e.target.closest('[data-dialog-close]')) close();
  }

  function open(el, options) {
    options = options || {};
    if (current && current.el !== el) close({ restoreFocus: false });
    if (current && current.el === el) return;

    current = {
      el: el,
      onClose: options.onClose,
      returnTo: options.returnTo || document.activeElement
    };
    el.hidden = false;
    // Force a style flush so the opening transition runs.
    void el.offsetWidth;
    el.classList.add('is-open');
    lockScroll(true);
    setBackgroundInert(true);
    document.addEventListener('keydown', onKeydown);
    el.addEventListener('click', onClick);

    const target = options.initialFocus || focusables(el)[0] || el;
    target.focus({ preventScroll: true });
  }

  function close(options) {
    if (!current) return;
    options = options || {};
    const state = current;
    current = null;
    const el = state.el;

    el.classList.remove('is-open');
    document.removeEventListener('keydown', onKeydown);
    el.removeEventListener('click', onClick);
    setBackgroundInert(false);
    lockScroll(false);

    const hide = function () { if (!el.classList.contains('is-open')) el.hidden = true; };
    if (window.App && window.App.reduceMotion) hide();
    else window.setTimeout(hide, 320);

    if (options.restoreFocus !== false && state.returnTo && document.contains(state.returnTo)) {
      state.returnTo.focus({ preventScroll: true });
    }
    if (state.onClose) state.onClose();
  }

  function isOpen(el) { return Boolean(current && (!el || current.el === el)); }

  return { open: open, close: close, isOpen: isOpen };
})();
