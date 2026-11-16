/* TEMPORARY – remove before merging fix-scroll-top.
   Loaded only with ?debug=tap. Shows what a phone really delivers when the
   back-to-top button is tapped: media queries, touch/pointer/click events,
   scroll activity (incl. momentum) and the button state.
   Full log: scroll inside the panel, or "Copy" to put it on the clipboard. */
(function () {
  'use strict';
  const btn = document.getElementById('to-top');
  const MAX = 400;
  const t0 = performance.now();
  const entries = [];   // oldest first
  let paused = false;
  let lastScrollAt = null;

  // ---------- panel ----------
  const panel = document.createElement('div');
  panel.setAttribute('aria-hidden', 'true');
  panel.style.cssText = 'position:fixed;left:6px;right:6px;top:6px;z-index:2147483647;background:rgba(0,0,0,.86);' +
    'color:#9f9;font:11px/1.35 ui-monospace,Menlo,monospace;border-radius:6px;padding:6px 8px;box-sizing:border-box';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:6px;margin-bottom:4px';
  function mkBtn(label, fn) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.style.cssText = 'font:600 12px/1 system-ui;padding:8px 10px;border-radius:5px;border:0;background:#2d5;color:#000';
    b.addEventListener('click', fn);
    bar.appendChild(b);
    return b;
  }
  const head = document.createElement('div');
  head.style.cssText = 'white-space:pre-wrap;color:#fff';
  const list = document.createElement('pre');
  list.style.cssText = 'margin:4px 0 0;max-height:32vh;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;' +
    'white-space:pre-wrap;user-select:text;-webkit-user-select:text';
  panel.append(bar, head, list);
  document.body.appendChild(panel);

  const copyBtn = mkBtn('Copy', function () {
    const text = headText() + '\n' + entries.join('\n');
    const done = function () { copyBtn.textContent = 'Copied ✓'; setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else fallback();
    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { copyBtn.textContent = 'Copy failed'; }
      ta.remove();
    }
  });
  mkBtn('Clear', function () { entries.length = 0; mark = 0; render(); });
  const pauseBtn = mkBtn('Pause', function () { paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; });
  const hideBtn = mkBtn('Hide', function () {
    const hidden = list.style.display === 'none';
    list.style.display = head.style.display = hidden ? '' : 'none';
    hideBtn.textContent = hidden ? 'Hide' : 'Show';
  });
  let mark = 0;
  mkBtn('Mark', function () { mark++; log('──────── MARK ' + mark + ' ────────'); });

  // ---------- helpers ----------
  const mq = function (q) { return matchMedia(q).matches ? 'yes' : 'no'; };
  let newCss = 'unknown';
  try {
    newCss = [].some.call(document.styleSheets, function (s) {
      return [].some.call(s.cssRules || [], function (r) {
        return r.media && /hover: hover/.test(r.media.mediaText) && /to-top:hover/.test(r.cssText);
      });
    }) ? 'yes' : 'NO (old CSS!)';
  } catch (e) { newCss = 'error ' + e.message; }
  function headText() {
    return 'new CSS: ' + newCss + ' | hover ' + mq('(hover: hover)') + ' | fine ' + mq('(pointer: fine)') + ' | coarse ' + mq('(pointer: coarse)') +
      '\nUA: ' + navigator.userAgent.replace(/^Mozilla\/5\.0 /, '').slice(0, 110) +
      '\nscrollY=' + Math.round(scrollY) + ' innerH=' + innerHeight + (window.visualViewport ? ' vvH=' + Math.round(visualViewport.height) : '') +
      '\n' + state();
  }
  function now() { return (performance.now() - t0) / 1000; }
  function state() {
    if (!btn) return 'no button';
    const cs = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    return 'btn[' + btn.className.replace('to-top', '').trim() + '] op=' + (+cs.opacity).toFixed(2) + ' vis=' + cs.visibility +
      ' gap=' + Math.round(innerHeight - r.bottom);
  }
  let renderQueued = false;
  function render() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      head.textContent = headText();
      const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 20;
      list.textContent = entries.join('\n');
      if (atBottom) list.scrollTop = list.scrollHeight;   // follow the newest line unless you scrolled up
    });
  }
  function log(msg) {
    if (paused) return;
    entries.push(now().toFixed(2) + 's ' + msg);
    if (entries.length > MAX) entries.splice(0, entries.length - MAX);
    render();
  }
  function who(el) {
    if (!el || !el.tagName) return '?';
    if (btn && (el === btn || btn.contains(el))) return 'TO-TOP';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList && el.classList.length ? '.' + el.classList[0] : '');
  }
  function sinceScroll() {
    return lastScrollAt == null ? '' : ' | last scroll ' + Math.round(performance.now() - lastScrollAt) + 'ms ago';
  }

  // ---------- events ----------
  ['touchstart', 'touchend', 'touchcancel', 'pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'click']
    .forEach(function (type) {
      document.addEventListener(type, function (e) {
        if (panel.contains(e.target)) return;
        const p = e.touches && e.touches.length ? e.touches : e.changedTouches;
        const y = p && p[0] ? p[0].clientY : e.clientY;
        const onBtn = who(e.target) === 'TO-TOP';
        log(type + ' → ' + who(e.target) + (y != null ? ' y=' + Math.round(y) : '') + (e.pointerType ? ' (' + e.pointerType + ')' : '') +
          (type === 'touchstart' || type === 'pointerdown' ? sinceScroll() : '') + (onBtn ? ' | ' + state() : ''));
      }, { capture: true, passive: true });
    });

  // Scroll: one "scroll start" line, then at most one line per 100 ms with speed,
  // and "scroll end" after 150 ms without scroll events (momentum shows up as
  // scroll lines with no touch on screen).
  let touching = 0;
  document.addEventListener('touchstart', function (e) { touching = e.touches.length; }, { capture: true, passive: true });
  document.addEventListener('touchend', function (e) { touching = e.touches.length; }, { capture: true, passive: true });
  document.addEventListener('touchcancel', function (e) { touching = e.touches.length; }, { capture: true, passive: true });
  let scrolling = false, lastLogAt = 0, lastY = scrollY, lastT = performance.now(), endTimer = 0;
  addEventListener('scroll', function () {
    const t = performance.now();
    const y = scrollY;
    const speed = Math.round((y - lastY) / Math.max(1, t - lastT) * 1000);
    lastScrollAt = t;
    if (!scrolling) {
      scrolling = true;
      log('scroll start y=' + Math.round(y) + (touching ? ' (finger down)' : ' (no finger)'));
      lastLogAt = t;
    } else if (t - lastLogAt >= 100) {
      log('  scroll y=' + Math.round(y) + ' v=' + speed + 'px/s' + (touching ? ' finger' : ' no finger (momentum or auto-scroll)'));
      lastLogAt = t;
    }
    lastY = y; lastT = t;
    clearTimeout(endTimer);
    endTimer = setTimeout(function () { scrolling = false; log('scroll end y=' + Math.round(scrollY)); }, 150);
  }, { passive: true });

  if (btn) {
    new MutationObserver(function () { log('btn class → [' + btn.className + ']'); })
      .observe(btn, { attributes: true, attributeFilter: ['class'] });
  }
  addEventListener('resize', function () { log('resize innerH=' + innerHeight); });
  if (window.visualViewport) visualViewport.addEventListener('resize', function () { log('vv resize h=' + Math.round(visualViewport.height)); });
  log('debug ready');
})();
