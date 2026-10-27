(function () {
  'use strict';

  const LANG_KEY = 'honigkorn-lang';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lang = 'de';

  // ---------- Language ----------

  // t('cart.remove', { name: 'Brezel' }) fills {name} placeholders.
  function t(key, vars) {
    const dict = window.I18N[lang] || window.I18N.de;
    let value = dict[key] != null ? dict[key] : window.I18N.de[key];
    if (value != null && vars) {
      value = value.replace(/\{(\w+)\}/g, function (m, name) {
        return vars[name] != null ? vars[name] : m;
      });
    }
    return value;
  }

  function formatPrice(value) {
    return new Intl.NumberFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  // "2026-10-30" → "30.10.2026" / "30 Oct 2026"
  function formatDate(iso) {
    const parts = iso.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    return new Intl.DateTimeFormat(lang === 'de' ? 'de-DE' : 'en-GB', {
      day: lang === 'de' ? '2-digit' : 'numeric',
      month: lang === 'de' ? '2-digit' : 'short',
      year: 'numeric'
    }).format(date);
  }

  function announce(message) {
    const region = document.getElementById('sr-status');
    if (!region) return;
    region.textContent = '';
    // A fresh text node in the next frame makes screen readers repeat identical messages.
    window.requestAnimationFrame(function () { region.textContent = message; });
  }

  function applyLanguage(next) {
    lang = window.I18N[next] ? next : 'de';
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      const value = t(el.dataset.i18n);
      if (value != null) el.textContent = value;
    });

    // data-i18n-attr="attr:key;attr2:key2"
    document.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.dataset.i18nAttr.split(';').forEach(function (pair) {
        const parts = pair.split(':');
        const value = t(parts[1]);
        if (value != null) el.setAttribute(parts[0], value);
      });
    });

    document.querySelectorAll('[data-price]').forEach(function (el) {
      el.textContent = formatPrice(Number(el.dataset.price));
    });

    const body = document.body;
    if (body.dataset.titleKey) document.title = t(body.dataset.titleKey);
    if (body.dataset.descKey) {
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', t(body.dataset.descKey));
    }

    document.querySelectorAll('.lang-switch [data-lang]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });

    updateMenuLabel();
    updateOpenStatus();
    refreshErrors();
    document.dispatchEvent(new CustomEvent('app:langchange', { detail: { lang: lang } }));
  }

  function initLanguage() {
    let stored = null;
    try { stored = localStorage.getItem(LANG_KEY); } catch (e) { /* storage unavailable */ }
    if (stored && stored !== 'de') applyLanguage(stored);
    else applyLanguage('de');

    document.querySelectorAll('.lang-switch [data-lang]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyLanguage(btn.dataset.lang);
        try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
      });
    });
  }

  // ---------- Header & mobile menu ----------

  const header = document.getElementById('site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('main-nav');

  function updateMenuLabel() {
    if (!menuToggle) return;
    const open = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-label', t(open ? 'nav.close' : 'nav.open'));
  }

  function setMenu(open) {
    if (!menuToggle) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    updateMenuLabel();
  }

  function initMenu() {
    if (!menuToggle || !nav) return;
    menuToggle.addEventListener('click', function () {
      setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        setMenu(false);
        menuToggle.focus();
      }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', function () {
      setMenu(false);
    });
  }

  // ---------- Scroll: header shadow, back-to-top ----------

  function initScroll() {
    const toTop = document.getElementById('to-top');
    let ticking = false;

    function onScroll() {
      const y = window.scrollY;
      if (header) header.classList.toggle('is-scrolled', y > 8);
      if (toTop) toTop.classList.toggle('is-visible', y > 600);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(onScroll);
        ticking = true;
      }
    }, { passive: true });
    onScroll();

    if (toTop) {
      toTop.addEventListener('click', function (e) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        const skip = document.querySelector('.skip-link');
        if (skip) skip.focus({ preventScroll: true });
      });
    }
  }

  // ---------- Reveal on scroll ----------

  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('is-visible');
          observer.unobserve(el);
          // Drop the stagger delay once revealed so hover effects respond instantly.
          setTimeout(function () { el.classList.add('reveal-done'); }, 1200);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    items.forEach(function (el) { observer.observe(el); });
  }

  // ---------- Product filter (ARIA tabs) ----------

  function initFilter() {
    const tabs = Array.from(document.querySelectorAll('[role="tab"][data-filter]'));
    const grid = document.getElementById('product-grid');
    if (!tabs.length || !grid) return;
    const products = grid.querySelectorAll('.product');

    function select(tab, focus) {
      tabs.forEach(function (other) {
        const active = other === tab;
        other.setAttribute('aria-selected', String(active));
        other.tabIndex = active ? 0 : -1;
      });
      grid.setAttribute('aria-labelledby', tab.id);

      const filter = tab.dataset.filter;
      products.forEach(function (card) {
        const show = filter === 'all' || card.dataset.category === filter;
        card.hidden = !show;
        if (show) {
          card.classList.add('is-visible');
          if (!reduceMotion) {
            card.classList.remove('pop');
            void card.offsetWidth; // restart the animation
            card.classList.add('pop');
          }
        }
      });
      if (focus) tab.focus();
    }

    initFilterScroll(tabs[0].parentElement);

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        let next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });
  }

  // Phones: the tab row scrolls sideways. Fade the edges that hide more tabs, let a vertical
  // mouse wheel scroll it, and nudge it once so it is clear the row can be swiped.
  function initFilterScroll(list) {
    function overflow() { return list.scrollWidth - list.clientWidth; }
    function update() {
      const max = overflow();
      list.classList.toggle('can-scroll-left', max > 1 && list.scrollLeft > 1);
      list.classList.toggle('can-scroll-right', max > 1 && list.scrollLeft < max - 1);
    }
    // Tune the tab padding (14–24px) so the first cut-off tab shows about half of itself at
    // the right edge – a clear "peek" at every phone width and in both languages.
    function fitPeek() {
      list.style.removeProperty('--tab-pad-x');
      if (overflow() <= 1 || list.scrollLeft > 1) return;
      const buttons = Array.from(list.children);
      let best = null;
      for (let pad = 14; pad <= 24; pad++) {
        list.style.setProperty('--tab-pad-x', pad + 'px');
        const left = list.getBoundingClientRect().left;
        const view = list.clientWidth;
        const cut = buttons.find(function (b) { return b.getBoundingClientRect().right - left > view; });
        if (!cut) continue;
        const box = cut.getBoundingClientRect();
        const shown = (view - (box.left - left)) / box.width;
        const score = Math.abs(shown - 0.5);
        if (shown > 0 && (!best || score < best.score)) best = { pad: pad, score: score };
      }
      if (best) list.style.setProperty('--tab-pad-x', best.pad + 'px');
      else list.style.removeProperty('--tab-pad-x');
    }
    function layout() { fitPeek(); update(); }

    list.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', layout);
    document.addEventListener('app:langchange', layout); // tab labels change width
    if (document.fonts) document.fonts.ready.then(layout);
    layout();

    list.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // trackpads scroll sideways natively
      const max = overflow();
      if (max <= 1) return;
      // At either end, let the page scroll instead.
      if ((e.deltaY < 0 && list.scrollLeft <= 0) || (e.deltaY > 0 && list.scrollLeft >= max - 1)) return;
      e.preventDefault();
      list.scrollLeft += e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    }, { passive: false });

    if (reduceMotion || !('IntersectionObserver' in window)) return;
    function stopNudge() { list.classList.remove('is-nudging'); }
    const observer = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      // After the row's own reveal; skipped when nothing is hidden or it was already scrolled.
      setTimeout(function () {
        if (overflow() <= 1 || list.scrollLeft > 1) return;
        list.classList.add('is-nudging');
        setTimeout(stopNudge, 1200);
      }, 700);
    }, { threshold: 0.9 });
    observer.observe(list);
    list.addEventListener('pointerdown', stopNudge);
  }

  // ---------- Opening hours: highlight today ----------

  function toMinutes(hhmm) {
    const parts = hhmm.split(':');
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  function updateOpenStatus() {
    const status = document.getElementById('open-status');
    if (!status) return;
    const now = new Date();
    const day = now.getDay();
    const minutes = now.getHours() * 60 + now.getMinutes();
    let open = false;

    document.querySelectorAll('.hours tr[data-days]').forEach(function (row) {
      const isToday = row.dataset.days.split(',').map(Number).indexOf(day) !== -1;
      row.classList.toggle('is-today', isToday);
      const th = row.querySelector('th');
      let badge = th.querySelector('.today-badge');
      if (isToday) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'today-badge';
          th.appendChild(badge);
        }
        badge.textContent = t('visit.today');
        open = minutes >= toMinutes(row.dataset.open) && minutes < toMinutes(row.dataset.close);
      } else if (badge) {
        badge.remove();
      }
    });

    status.hidden = false;
    status.classList.toggle('is-open', open);
    status.querySelector('.status-text').textContent = t(open ? 'visit.open' : 'visit.closed');
  }

  // ---------- Pre-order form ----------

  const form = document.getElementById('order-form');

  function isoDate(d) {
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function dateBounds(minDays, maxDays) {
    const min = new Date();
    min.setDate(min.getDate() + (minDays == null ? 1 : minDays));
    const max = new Date();
    max.setDate(max.getDate() + (maxDays == null ? 30 : maxDays));
    return { min: isoDate(min), max: isoDate(max) };
  }

  const validators = {
    name: function (v) { return v.trim().length >= 2 ? null : 'err.name'; },
    phone: function (v) {
      const value = v.trim();
      const digits = value.replace(/\D/g, '');
      return /^\+?[\d\s()/-]+$/.test(value) && digits.length >= 6 && digits.length <= 15 ? null : 'err.phone';
    },
    order: function (v) { return v.trim().length >= 3 ? null : 'err.order'; },
    date: function (v) {
      if (!v) return 'err.dateRequired';
      const b = dateBounds();
      return v >= b.min && v <= b.max ? null : 'err.dateRange';
    }
  };

  function validateField(input) {
    const errorKey = validators[input.name](input.value);
    const error = document.getElementById('e-' + input.name);
    input.setAttribute('aria-invalid', String(Boolean(errorKey)));
    input.closest('.field').classList.toggle('has-error', Boolean(errorKey));
    error.dataset.key = errorKey || '';
    error.textContent = errorKey ? t(errorKey) : '';
    return !errorKey;
  }

  function refreshErrors() {
    document.querySelectorAll('.error[data-key]').forEach(function (el) {
      el.textContent = el.dataset.key ? t(el.dataset.key) : '';
    });
  }

  function initForm() {
    if (!form) return;
    const success = document.getElementById('form-success');
    const dateInput = form.elements.date;
    const fields = Array.from(form.querySelectorAll('input, textarea'));
    const b = dateBounds();
    dateInput.min = b.min;
    dateInput.max = b.max;

    fields.forEach(function (input) {
      input.addEventListener('blur', function () {
        if (input.value || input.dataset.touched) {
          input.dataset.touched = '1';
          validateField(input);
        }
      });
      input.addEventListener('input', function () {
        if (input.dataset.touched) validateField(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      let firstInvalid = null;
      fields.forEach(function (input) {
        input.dataset.touched = '1';
        if (!validateField(input) && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }
      // Demo only: nothing is sent anywhere.
      document.dispatchEvent(new CustomEvent('app:order-submitted'));
      form.hidden = true;
      success.hidden = false;
      success.focus();
    });

    document.getElementById('form-reset').addEventListener('click', function () {
      form.reset();
      fields.forEach(function (input) {
        delete input.dataset.touched;
        input.removeAttribute('aria-invalid');
        input.closest('.field').classList.remove('has-error');
        const error = document.getElementById('e-' + input.name);
        error.textContent = '';
        error.dataset.key = '';
      });
      success.hidden = true;
      form.hidden = false;
      form.elements.name.focus();
    });
  }

  // Shared helpers for the cart, product modal and cake builder modules.
  window.App = {
    t: t,
    formatPrice: formatPrice,
    formatDate: formatDate,
    isoDate: isoDate,
    dateBounds: dateBounds,
    announce: announce,
    validateField: function (input) { return validateField(input); },
    getLang: function () { return lang; },
    reduceMotion: reduceMotion
  };

  initMenu();
  initScroll();
  initReveal();
  initFilter();
  initForm();
  initLanguage();
})();
