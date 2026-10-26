// Cake builder: live price, SVG preview and "add to cart" with all chosen options.
(function () {
  'use strict';

  const data = window.BakeryData;
  const App = window.App;
  const opts = data.cake;
  const form = document.getElementById('cake-form');
  if (!form) return;

  const svg = document.getElementById('cake-svg');
  const body = document.getElementById('cake-body');
  const plaque = document.getElementById('cake-plaque');
  const plaqueRect = plaque.querySelector('rect');
  const plaqueText = plaque.querySelector('text');
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

  function renderPreview(cfg) {
    const sponge = data.findById(opts.sponges, cfg.sponge);
    const cream = data.findById(opts.creams, cfg.cream);
    const filling = data.findById(opts.fillings, cfg.filling);
    const size = data.findById(opts.sizes, cfg.size);

    svg.style.setProperty('--sponge', sponge.color);
    svg.style.setProperty('--cream', cream.color);
    svg.style.setProperty('--fruit', filling.color || cream.color);
    svg.dataset.filling = filling.id;
    body.style.setProperty('--cake-scale', size.scale);

    plaque.classList.toggle('is-visible', Boolean(cfg.text));
    if (cfg.text) {
      plaqueText.textContent = cfg.text;
      const width = Math.min(250, Math.max(70, plaqueText.getComputedTextLength() + 30));
      plaqueRect.setAttribute('width', width);
      plaqueRect.setAttribute('x', 200 - width / 2);
    }

    const parts = [
      App.t('cake.name', { size: cfg.size }),
      App.t('cake.sponge.' + cfg.sponge),
      App.t('cake.cream.' + cfg.cream),
      cfg.filling === 'none' ? App.t('cake.noFruit') : App.t('cake.filling.' + cfg.filling)
    ];
    if (cfg.text) parts.push(App.t('cake.inscription', { text: cfg.text }));
    previewDesc.textContent = App.t('builder.previewLabel', { desc: parts.join(', ') });
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

  // Fonts change the text width on the chocolate plaque.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);

  setDateBounds();
  renderMeta();
  update();
})();
