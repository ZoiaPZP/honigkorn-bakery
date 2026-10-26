// Product detail modal with ingredients and EU allergen information.
(function () {
  'use strict';

  const data = window.BakeryData;
  const App = window.App;
  const modal = document.getElementById('product-modal');
  if (!modal) return;

  const $ = function (id) { return document.getElementById(id); };
  const els = {
    source: $('modal-src'),
    img: $('modal-img'),
    tag: $('modal-tag'),
    title: $('modal-title'),
    desc: $('modal-desc'),
    weight: $('modal-weight'),
    price: $('modal-price'),
    footPrice: $('modal-foot-price'),
    ingredients: $('modal-ingredients'),
    allergens: $('modal-allergens'),
    traces: $('modal-traces'),
    tracesWrap: $('modal-traces-wrap'),
    grid: $('modal-allergen-grid'),
    add: $('modal-add')
  };
  let currentId = null;

  function icon(allergen) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      allergen.icon + '</svg>';
  }

  function badge(allergen, state) {
    const li = document.createElement('li');
    li.className = 'allergen allergen-' + state;
    li.innerHTML = icon(allergen);
    const label = document.createElement('span');
    label.textContent = App.t('allergen.' + allergen.id);
    li.appendChild(label);
    if (state !== 'contains') {
      // The grid marks state visually; spell it out for screen readers.
      const sr = document.createElement('span');
      sr.className = 'visually-hidden';
      sr.textContent = ' – ' + App.t('modal.state.' + state);
      li.appendChild(sr);
    }
    return li;
  }

  function render(id) {
    const p = data.getProduct(id);
    if (!p) return;
    const name = App.t(id + '.name');
    const price = App.formatPrice(p.price);

    // 1600px versions keep the modal photo sharp on Retina; cards stay at 800px.
    els.source.srcset = p.image + '.webp 800w, ' + p.image + '-1600.webp 1600w';
    els.img.srcset = p.image + '.jpg 800w, ' + p.image + '-1600.jpg 1600w';
    els.img.src = p.image + '.jpg';
    els.img.alt = App.t(id + '.alt');
    els.tag.textContent = App.t('filter.' + p.category);
    els.title.textContent = name;
    els.desc.textContent = App.t(id + '.long');
    els.weight.textContent = App.t(id + '.weight');
    els.price.textContent = price;
    els.footPrice.textContent = price;
    els.ingredients.textContent = App.t(id + '.ingredients');

    els.allergens.textContent = '';
    els.traces.textContent = '';
    els.grid.textContent = '';
    data.allergens.forEach(function (a) {
      const state = p.allergens.indexOf(a.id) !== -1 ? 'contains'
        : p.traces.indexOf(a.id) !== -1 ? 'traces' : 'free';
      if (state === 'contains') els.allergens.appendChild(badge(a, 'contains'));
      if (state === 'traces') els.traces.appendChild(badge(a, 'traces'));
      els.grid.appendChild(badge(a, state));
    });
    els.tracesWrap.hidden = p.traces.length === 0;

    els.add.dataset.addToCart = id;
    els.add.setAttribute('aria-label', App.t('cart.addNamed', { name: name }));
  }

  function open(id, trigger) {
    currentId = id;
    render(id);
    modal.querySelector('.modal-body').scrollTop = 0;
    Dialog.open(modal, {
      returnTo: trigger,
      initialFocus: modal.querySelector('.modal-close'),
      onClose: function () { currentId = null; }
    });
  }

  // Card name buttons (keyboard + mouse) and card photos (mouse shortcut).
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('.product-link, .product-media');
    if (!trigger) return;
    const card = trigger.closest('[data-product]');
    if (!card) return;
    // Return focus to the name button even when the photo was clicked.
    open(card.dataset.product, card.querySelector('.product-link'));
  });

  document.addEventListener('app:langchange', function () {
    if (currentId) render(currentId);
  });
})();
