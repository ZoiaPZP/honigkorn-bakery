// Cake builder: live price, photo preview (sample photo per fruit, size badge, swatches,
// inscription ribbon) and "add to cart" with all chosen options.
(function () {
  'use strict';

  const data = window.BakeryData;
  const App = window.App;
  const opts = data.cake;
  const form = document.getElementById('cake-form');
  if (!form) return;

  const shots = Array.prototype.slice.call(document.querySelectorAll('.cake-shot'));
  const sizeBadge = document.getElementById('cake-size-badge');
  const ribbon = document.getElementById('cake-ribbon');
  const ribbonText = document.getElementById('cake-ribbon-text');
  const swatchSponge = document.getElementById('swatch-sponge');
  const swatchCream = document.getElementById('swatch-cream');
  const previewDesc = document.getElementById('cake-preview-desc');
  const priceEl = document.getElementById('cake-price');
  const breakdownEl = document.getElementById('cake-breakdown');
  const textInput = document.getElementById('cake-text');
  const counter = document.getElementById('cake-text-count');
  const dateInput = document.getElementById('cake-date');
  const dateError = document.getElementById('cake-date-error');
  const addButton = document.getElementById('cake-add');

  function value(name) {
    const checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : null;
  }

  function config() {
    return {
      size: value('size'),
      sponge: value('sponge'),
      cream: value('cream'),
      filling: value('filling'),
      text: textInput.value.trim(),
      date: dateInput.value
    };
  }

  function surcharge(price) {
    return price ? '+' + App.formatPrice(price) : App.t('builder.included');
  }

  // Servings and price hints on the option chips.
  function renderMeta() {
    opts.sizes.forEach(function (o) {
      form.querySelector('[data-meta="size-' + o.id + '"]').textContent =
        App.t('builder.servings', { n: o.servings }) + ' · ' + App.formatPrice(o.price);
    });
    [['sponge', opts.sponges], ['cream', opts.creams], ['filling', opts.fillings]].forEach(function (group) {
      group[1].forEach(function (o) {
        form.querySelector('[data-meta="' + group[0] + '-' + o.id + '"]').textContent = surcharge(o.price);
      });
    });
    document.getElementById('cake-text-hint').textContent =
      App.t('builder.textHint', { max: opts.textMax, price: App.formatPrice(opts.inscriptionPrice) });
  }

  function setSwatch(item, color, key) {
    item.style.setProperty('--swatch', color);
    item.querySelector('.swatch-name').textContent = App.t(key);
  }

  function renderPreview(cfg) {
    const sponge = data.findById(opts.sponges, cfg.sponge);
    const cream = data.findById(opts.creams, cfg.cream);
    const size = data.findById(opts.sizes, cfg.size);

    // Sample photo per fruit choice; CSS cross-fades between the stacked pictures.
    shots.forEach(function (shot) {
      shot.classList.toggle('is-active', shot.dataset.shot === cfg.filling);
    });

    const badge = App.t('builder.sizeBadge', {
      size: cfg.size,
      servings: App.t('builder.servings', { n: size.servings })
    });
    if (sizeBadge.textContent !== badge) {
      sizeBadge.textContent = badge;
      pop(sizeBadge);
    }

    setSwatch(swatchSponge, sponge.color, 'cake.sponge.' + sponge.id);
    setSwatch(swatchCream, cream.color, 'cake.cream.' + cream.id);

    ribbon.classList.toggle('is-visible', Boolean(cfg.text));
    if (cfg.text) ribbonText.textContent = cfg.text;

    const parts = [
      App.t('cake.name', { size: cfg.size }),
      App.t('cake.sponge.' + cfg.sponge),
      App.t('cake.cream.' + cfg.cream),
      cfg.filling === 'none' ? App.t('cake.noFruit') : App.t('cake.filling.' + cfg.filling)
    ];
    if (cfg.text) parts.push(App.t('cake.inscription', { text: cfg.text }));
    previewDesc.textContent = App.t('builder.previewLabel', { desc: parts.join(', ') });
  }

  function pop(el) {
    el.classList.remove('is-pop');
    void el.offsetWidth;
    el.classList.add('is-pop');
  }

  function renderPrice(cfg) {
    priceEl.textContent = App.formatPrice(data.cakePrice(cfg));
    const extras = [];
    [['sponge', opts.sponges], ['cream', opts.creams], ['filling', opts.fillings]].forEach(function (group) {
      const o = data.findById(group[1], cfg[group[0]]);
      if (o && o.price) extras.push(App.t('cake.' + group[0] + '.' + o.id) + ' +' + App.formatPrice(o.price));
    });
    if (cfg.text) extras.push(App.t('builder.text') + ' +' + App.formatPrice(opts.inscriptionPrice));
    const size = data.findById(opts.sizes, cfg.size);
    breakdownEl.textContent = ['Ø ' + cfg.size + ' cm ' + App.formatPrice(size.price)].concat(extras).join(' · ');
  }

  function update() {
    const cfg = config();
    counter.textContent = textInput.value.length + '/' + opts.textMax;
    renderPreview(cfg);
    renderPrice(cfg);
  }

  function setDateBounds() {
    const b = App.dateBounds(opts.minDays, opts.maxDays);
    dateInput.min = b.min;
    dateInput.max = b.max;
    return b;
  }

  function validateDate() {
    const b = setDateBounds();
    const v = dateInput.value;
    const key = !v ? 'builder.err.dateRequired' : (v < b.min || v > b.max) ? 'builder.err.dateRange' : '';
    dateInput.setAttribute('aria-invalid', String(Boolean(key)));
    dateInput.closest('.field').classList.toggle('has-error', Boolean(key));
    dateError.dataset.key = key;
    dateError.textContent = key ? App.t(key, { days: opts.minDays }) : '';
    return !key;
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);

  dateInput.addEventListener('change', function () {
    dateInput.dataset.touched = '1';
    validateDate();
  });
  dateInput.addEventListener('blur', function () {
    if (dateInput.dataset.touched || dateInput.value) {
      dateInput.dataset.touched = '1';
      validateDate();
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    dateInput.dataset.touched = '1';
    if (!validateDate()) {
      dateInput.focus();
      return;
    }
    window.Cart.addCake(config(), addButton);
  });

  document.addEventListener('app:langchange', function () {
    renderMeta();
    update();
    if (dateError.dataset.key) dateError.textContent = App.t(dateError.dataset.key, { days: opts.minDays });
  });

  setDateBounds();
  renderMeta();
  update();
})();
