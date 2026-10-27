// Pre-order cart: state in localStorage, header badge, slide-in drawer,
// and handing the cart contents over to the pre-order form.
window.Cart = (function () {
  'use strict';

  const STORAGE_KEY = 'honigkorn-cart';
  const MAX_QTY = 99;
  const data = window.BakeryData;
  const App = window.App;

  const drawer = document.getElementById('cart-drawer');
  const toggle = document.getElementById('cart-toggle');
  const badge = document.getElementById('cart-count');
  const list = document.getElementById('cart-list');
  const empty = document.getElementById('cart-empty');
  const foot = document.getElementById('cart-foot');
  const totalEl = document.getElementById('cart-total');
  const drawerCount = document.getElementById('cart-drawer-count');

  let items = load();

  // ---------- State ----------

  function cakeKey(cfg) {
    return 'cake:' + [cfg.size, cfg.sponge, cfg.cream, cfg.filling, cfg.date, cfg.text].join('|');
  }

  function sanitize(raw) {
    if (!Array.isArray(raw)) return [];
    const clean = [];
    raw.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      const qty = Math.min(MAX_QTY, Math.max(1, parseInt(item.qty, 10) || 0));
      if (item.type === 'product' && data.getProduct(item.id)) {
        clean.push({ key: item.id, type: 'product', id: item.id, qty: qty });
      } else if (item.type === 'cake') {
        const config = data.normalizeCake(item.config);
        if (config) clean.push({ key: cakeKey(config), type: 'cake', config: config, qty: qty });
      }
    });
    return clean;
  }

  function load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return sanitize(stored && stored.items);
    } catch (e) {
      return [];
    }
  }

  function save() {
    try {
      const stored = items.map(function (item) {
        return item.type === 'cake'
          ? { type: 'cake', config: item.config, qty: item.qty }
          : { type: 'product', id: item.id, qty: item.qty };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, items: stored }));
    } catch (e) { /* storage unavailable – the cart still works for this visit */ }
  }

  function find(key) {
    for (let i = 0; i < items.length; i++) if (items[i].key === key) return items[i];
    return null;
  }

  function count() {
    return items.reduce(function (sum, item) { return sum + item.qty; }, 0);
  }

  function unitPrice(item) {
    return item.type === 'cake' ? data.cakePrice(item.config) : data.getProduct(item.id).price;
  }

  function total() {
    return items.reduce(function (sum, item) { return sum + unitPrice(item) * item.qty; }, 0);
  }

  function itemName(item) {
    return item.type === 'cake'
      ? App.t('cake.name', { size: item.config.size })
      : App.t(item.id + '.name');
  }

  function cakeDetails(cfg) {
    const parts = [
      App.t('cake.sponge.' + cfg.sponge),
      App.t('cake.cream.' + cfg.cream),
      cfg.filling === 'none' ? App.t('cake.noFruit') : App.t('cake.filling.' + cfg.filling)
    ];
    if (cfg.text) parts.push(App.t('cake.inscription', { text: cfg.text }));
    parts.push(App.t('cake.pickup', { date: App.formatDate(cfg.date) }));
    return parts.join(' · ');
  }

  function itemsLabel(n) {
    return App.t(n === 1 ? 'cart.items.one' : 'cart.items.other', { n: n });
  }

  // ---------- Mutations ----------

  function commit(options) {
    save();
    render(options);
  }

  function addProduct(id, sourceButton) {
    if (!data.getProduct(id)) return;
    const existing = find(id);
    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + 1);
    else items.push({ key: id, type: 'product', id: id, qty: 1 });
    commit({ bump: true });
    confirmAdded(sourceButton, App.t(id + '.name'));
  }

  function addCake(config, sourceButton) {
    const cfg = data.normalizeCake(config);
    if (!cfg) return false;
    const key = cakeKey(cfg);
    const existing = find(key);
    if (existing) existing.qty = Math.min(MAX_QTY, existing.qty + 1);
    else items.push({ key: key, type: 'cake', config: cfg, qty: 1 });
    commit({ bump: true });
    confirmAdded(sourceButton, App.t('cake.name', { size: cfg.size }));
    return true;
  }

  function setQty(key, qty) {
    const item = find(key);
    if (!item) return;
    item.qty = Math.min(MAX_QTY, Math.max(1, qty));
    commit();
    App.announce(App.t('cart.qtyChanged', { name: itemName(item), n: item.qty }));
  }

  function remove(key) {
    const item = find(key);
    if (!item) return;
    const name = itemName(item);
    items = items.filter(function (other) { return other.key !== key; });
    commit({ removedKey: key });
    App.announce(App.t('cart.removed', { name: name }));
  }

  function clear(options) {
    items = [];
    commit();
    if (!options || !options.silent) App.announce(App.t('cart.cleared'));
  }

  // ---------- Feedback ----------

  function confirmAdded(button, name) {
    App.announce(App.t('cart.addedAnnounce', { name: name }));
    if (!button) return;
    const label = button.querySelector('[data-add-label]');
    button.classList.add('is-added');
    if (label) label.textContent = App.t('cart.added');
    window.clearTimeout(button._addedTimer);
    button._addedTimer = window.setTimeout(function () {
      button.classList.remove('is-added');
      if (label) label.textContent = App.t(label.dataset.i18n || 'cart.add');
    }, 1600);
  }

  function bumpBadge() {
    if (App.reduceMotion) return;
    [badge, toggle].forEach(function (el) {
      el.classList.remove('bump');
      void el.offsetWidth; // restart the animation
      el.classList.add('bump');
    });
  }

  // ---------- Rendering ----------

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function iconButton(className, action, key, label, svg) {
    const button = el('button', className);
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.key = key;
    button.setAttribute('aria-label', label);
    button.innerHTML = svg;
    return button;
  }

  function thumb(item) {
    const wrap = el('div', 'cart-thumb');
    if (item.type === 'cake') {
      // Same 3D render as the cake builder still for the chosen fruit.
      const base = data.findById(data.cake.fillings, item.config.filling).image;
      wrap.innerHTML = '<picture><source type="image/webp" srcset="' + base + '.webp">' +
        '<img src="' + base + '.jpg" width="1400" height="1120" alt="" loading="lazy" decoding="async"></picture>';
    } else {
      const base = data.getProduct(item.id).image;
      wrap.innerHTML = '<picture><source type="image/webp" srcset="' + base + '.webp">' +
        '<img src="' + base + '.jpg" width="800" height="600" alt="" loading="lazy" decoding="async"></picture>';
    }
    return wrap;
  }

  const ICON_MINUS = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
  const ICON_PLUS = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const ICON_TRASH = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';

  function renderItem(item) {
    const name = itemName(item);
    const li = el('li', 'cart-item');
    li.dataset.key = item.key;
    li.appendChild(thumb(item));

    const info = el('div', 'cart-info');
    info.appendChild(el('p', 'cart-name', name));
    if (item.type === 'cake') info.appendChild(el('p', 'cart-details', cakeDetails(item.config)));
    info.appendChild(el('p', 'cart-unit', App.t('cart.each', { price: App.formatPrice(unitPrice(item)) })));

    const qty = el('div', 'cart-qty');
    qty.setAttribute('role', 'group');
    qty.setAttribute('aria-label', App.t('cart.qtyLabel', { name: name }));
    const minus = iconButton('qty-btn', 'decrease', item.key, App.t('cart.decrease', { name: name }), ICON_MINUS);
    minus.disabled = item.qty <= 1;
    const plus = iconButton('qty-btn', 'increase', item.key, App.t('cart.increase', { name: name }), ICON_PLUS);
    plus.disabled = item.qty >= MAX_QTY;
    qty.appendChild(minus);
    qty.appendChild(el('span', 'qty-value', String(item.qty)));
    qty.appendChild(plus);
    info.appendChild(qty);
    li.appendChild(info);

    const side = el('div', 'cart-side');
    side.appendChild(el('strong', 'cart-line-total', App.formatPrice(unitPrice(item) * item.qty)));
    side.appendChild(iconButton('icon-btn icon-btn-sm', 'remove', item.key, App.t('cart.remove', { name: name }), ICON_TRASH));
    li.appendChild(side);
    return li;
  }

  function render(options) {
    options = options || {};
    const active = document.activeElement;
    const focusKey = active && list.contains(active) ? active.dataset.key : null;
    const focusAction = focusKey ? active.dataset.action : null;
    const oldKeys = items.map(function (item) { return item.key; });

    const n = count();
    badge.textContent = String(n);
    badge.hidden = n === 0;
    toggle.setAttribute('aria-label', App.t('cart.toggle', { items: itemsLabel(n) }));
    drawerCount.textContent = n ? itemsLabel(n) : '';

    list.textContent = '';
    items.forEach(function (item) { list.appendChild(renderItem(item)); });
    list.hidden = items.length === 0;
    empty.hidden = items.length !== 0;
    foot.hidden = items.length === 0;
    totalEl.textContent = App.formatPrice(total());

    // Keep keyboard focus stable across re-renders.
    if (focusKey) {
      let target = list.querySelector('[data-key="' + cssEscape(focusKey) + '"][data-action="' + focusAction + '"]');
      if (target && target.disabled) target = list.querySelector('[data-key="' + cssEscape(focusKey) + '"][data-action="increase"]');
      if (!target && options.removedKey) {
        const index = oldKeys.indexOf(options.removedKey);
        const next = items[Math.min(index, items.length - 1)];
        target = next ? list.querySelector('[data-key="' + cssEscape(next.key) + '"][data-action="remove"]') : null;
      }
      if (!target && Dialog.isOpen(drawer)) target = items.length ? null : empty.querySelector('button');
      if (target) target.focus();
    }

    if (options.bump) bumpBadge();
  }

  function cssEscape(value) {
    return window.CSS && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, '\\$&');
  }

  // ---------- Hand-over to the pre-order form ----------

  function orderText() {
    const lines = items.map(function (item) {
      const details = item.type === 'cake' ? ' (' + cakeDetails(item.config) + ')' : '';
      return item.qty + ' × ' + itemName(item) + details + ' – ' + App.formatPrice(unitPrice(item) * item.qty);
    });
    lines.push('', App.t('cart.orderTotal') + ': ' + App.formatPrice(total()));
    return lines.join('\n');
  }

  function goToOrder() {
    const textarea = document.getElementById('f-order');
    const dateInput = document.getElementById('f-date');
    const section = document.getElementById('vorbestellen');
    const text = orderText();

    // The success message may still be showing from a previous demo order;
    // reset first, because resetting clears the fields.
    const form = document.getElementById('order-form');
    if (form.hidden) document.getElementById('form-reset').click();

    // Replace an earlier hand-over, but never throw away something the visitor typed.
    const current = textarea.value.trim();
    if (!current || current === textarea.dataset.prefilled) textarea.value = text;
    else textarea.value = current + '\n\n' + text;
    textarea.dataset.prefilled = textarea.value.trim();
    textarea.rows = Math.min(12, Math.max(3, textarea.value.split('\n').length + 1));

    // A cake fixes the pickup day: suggest the earliest cake date if none is chosen yet.
    const cakeDates = items.filter(function (i) { return i.type === 'cake'; })
      .map(function (i) { return i.config.date; }).sort();
    if (!dateInput.value && cakeDates.length) dateInput.value = cakeDates[0];

    [textarea, dateInput].forEach(function (input) {
      if (input.dataset.touched || input.value) {
        input.dataset.touched = '1';
        App.validateField(input);
      }
    });

    Dialog.close({ restoreFocus: false });
    section.scrollIntoView({ behavior: App.reduceMotion ? 'auto' : 'smooth', block: 'start' });
    textarea.focus({ preventScroll: true });
    textarea.classList.remove('is-prefilled');
    void textarea.offsetWidth;
    textarea.classList.add('is-prefilled');
    App.announce(App.t('cart.prefilled'));
  }

  // ---------- Wiring ----------

  function open() {
    Dialog.open(drawer, {
      returnTo: toggle,
      initialFocus: drawer.querySelector('.drawer-close'),
      onClose: function () { toggle.setAttribute('aria-expanded', 'false'); }
    });
    toggle.setAttribute('aria-expanded', 'true');
  }

  toggle.addEventListener('click', open);

  list.addEventListener('click', function (e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const item = find(button.dataset.key);
    if (!item) return;
    if (button.dataset.action === 'increase') setQty(item.key, item.qty + 1);
    else if (button.dataset.action === 'decrease') setQty(item.key, item.qty - 1);
    else if (button.dataset.action === 'remove') remove(item.key);
  });

  document.getElementById('cart-checkout').addEventListener('click', goToOrder);
  document.getElementById('cart-clear').addEventListener('click', function () {
    clear();
    drawer.querySelector('.drawer-close').focus();
  });
  document.getElementById('cart-browse').addEventListener('click', function () {
    Dialog.close({ restoreFocus: false });
    const target = document.getElementById('sortiment');
    target.scrollIntoView({ behavior: App.reduceMotion ? 'auto' : 'smooth' });
    const firstTab = target.querySelector('[role="tab"][aria-selected="true"]');
    if (firstTab) firstTab.focus({ preventScroll: true });
  });

  // "In den Warenkorb" buttons on the product cards (and anywhere else).
  document.addEventListener('click', function (e) {
    const button = e.target.closest('[data-add-to-cart]');
    if (button) addProduct(button.dataset.addToCart, button);
  });

  document.addEventListener('app:langchange', function () { render(); });
  document.addEventListener('app:order-submitted', function () { clear({ silent: true }); });

  // Another tab changed the cart.
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY) {
      items = load();
      render();
    }
  });

  render();

  return {
    addProduct: addProduct,
    addCake: addCake,
    open: open,
    clear: clear,
    count: count
  };
})();
