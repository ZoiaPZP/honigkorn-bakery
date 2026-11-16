/* TEMPORARY – remove before merging fix-scroll-top.
   Loaded only with ?debug=tap. Shows what a phone really delivers when the
   back-to-top button is tapped: media queries, events, button state. */
(function () {
  'use strict';
  const btn = document.getElementById('to-top');
  const box = document.createElement('pre');
  box.setAttribute('aria-hidden', 'true');
  box.style.cssText = 'position:fixed;left:6px;right:6px;top:6px;z-index:2147483647;margin:0;padding:6px 8px;' +
    'max-height:45vh;overflow:hidden;background:rgba(0,0,0,.82);color:#9f9;font:11px/1.35 ui-monospace,Menlo,monospace;' +
    'white-space:pre-wrap;pointer-events:none;border-radius:6px';
  document.body.appendChild(box);

  const mq = function (q) { return matchMedia(q).matches ? 'yes' : 'no'; };
  let newCss = 'unknown';
  try {
    newCss = [].some.call(document.styleSheets, function (s) {
      return [].some.call(s.cssRules || [], function (r) {
        return r.media && /hover: hover/.test(r.media.mediaText) && /to-top:hover/.test(r.cssText);
      });
    }) ? 'yes' : 'NO (old CSS!)';
  } catch (e) { newCss = 'error ' + e.message; }

  const head = 'new CSS: ' + newCss + ' | hover:hover ' + mq('(hover: hover)') + ' | pointer:fine ' + mq('(pointer: fine)') +
    ' | coarse ' + mq('(pointer: coarse)');
  const lines = [];
  const t0 = performance.now();
  function state() {
    if (!btn) return 'no button';
    const cs = getComputedStyle(btn);
    const r = btn.getBoundingClientRect();
    return 'btn[' + btn.className.replace('to-top', '').trim() + '] op=' + (+cs.opacity).toFixed(2) + ' vis=' + cs.visibility +
      ' bg=' + cs.backgroundColor.replace(/rgba?\(|\)| /g, '') + ' bottomGap=' + Math.round(innerHeight - r.bottom);
  }
  function render() {
    box.textContent = head + '\nscrollY=' + Math.round(scrollY) + ' innerH=' + innerHeight +
      (window.visualViewport ? ' vvH=' + Math.round(visualViewport.height) : '') + '\n' + state() + '\n—\n' + lines.join('\n');
  }
  function log(msg) {
    lines.unshift(((performance.now() - t0) / 1000).toFixed(2) + 's ' + msg);
    lines.length = Math.min(lines.length, 16);
    render();
  }
  function who(el) {
    if (!el || !el.tagName) return '?';
    if (btn && (el === btn || btn.contains(el))) return 'TO-TOP';
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList.length ? '.' + el.classList[0] : '');
  }
  ['touchstart', 'touchend', 'touchcancel', 'pointerdown', 'pointerup', 'pointercancel', 'mouseover', 'mousedown', 'click']
    .forEach(function (type) {
      document.addEventListener(type, function (e) {
        const p = e.touches || e.changedTouches;
        const y = p && p[0] ? p[0].clientY : e.clientY;
        log(type + ' → ' + who(e.target) + (y != null ? ' y=' + Math.round(y) : '') + (e.pointerType ? ' (' + e.pointerType + ')' : '') +
          (who(e.target) === 'TO-TOP' ? ' | ' + state() : ''));
      }, { capture: true, passive: true });
    });
  if (btn) {
    new MutationObserver(function () { log('class → [' + btn.className + ']'); })
      .observe(btn, { attributes: true, attributeFilter: ['class'] });
  }
  addEventListener('resize', function () { log('resize innerH=' + innerHeight); });
  if (window.visualViewport) visualViewport.addEventListener('resize', function () { log('vv resize h=' + Math.round(visualViewport.height)); });
  let st = 0;
  addEventListener('scroll', function () { clearTimeout(st); st = setTimeout(render, 80); }, { passive: true });
  render();
})();
