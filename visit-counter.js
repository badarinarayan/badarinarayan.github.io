/* ──────────────────────────────────────────────────────────────
   Site-wide visitor counter (CounterAPI v1 — free, no backend).
   Shows a total visit count at the bottom of every page.

   • Counts once per browser session (shared across all pages of
     the site), so refreshes and page-to-page navigation don't
     inflate the number.
   • Ignores the owner's own machine: open any page once with
     ?owner  (e.g. https://badarinarayan.github.io/?owner) to mark
     this browser as the owner. It will still SEE the count, but
     its visits are never added. Undo with ?owner=off .
   ────────────────────────────────────────────────────────────── */
(function () {
  var BASE = 'https://api.counterapi.dev/v1/badarinarayan-github-io/visits';

  // ── Owner opt-out (per browser, persisted) ──────────────────
  try {
    var q = (location.search + '&' + location.hash).toLowerCase();
    if (/[?&#]owner=off\b/.test(q)) localStorage.removeItem('bnj_owner');
    else if (/[?&#]owner\b/.test(q)) localStorage.setItem('bnj_owner', '1');
  } catch (e) {}

  var isOwner = false, counted = false;
  try { isOwner = localStorage.getItem('bnj_owner') === '1'; } catch (e) {}
  try { counted = sessionStorage.getItem('bnj_counted') === '1'; } catch (e) {}

  var doIncrement = !isOwner && !counted;
  var url = BASE + (doIncrement ? '/up' : '/');

  // ── Badge ───────────────────────────────────────────────────
  var el = document.createElement('div');
  el.id = 'visit-counter';
  el.style.cssText =
    'background:#1a160e;border-top:2px solid #c47a0f;color:rgba(248,245,239,0.55);' +
    "font-family:'Barlow Condensed',sans-serif;font-size:0.72rem;letter-spacing:0.16em;" +
    'text-transform:uppercase;text-align:center;padding:0.9rem 1rem;';
  el.innerHTML =
    '<span style="color:#c47a0f;">&#128065;</span>&nbsp; Visitors: ' +
    '<strong id="visit-count" style="color:#f8f5ef;font-weight:600;">&hellip;</strong>' +
    (isOwner ? '&nbsp;<span style="opacity:0.5;">(owner &mdash; not counted)</span>' : '');

  function mount() {
    var parent = document.body || document.documentElement;
    parent.appendChild(el);
    // Some pages center their body with flexbox (align/justify center),
    // which would float the counter into the middle. Force it full-width
    // on its own row at the bottom in that case.
    try {
      var disp = getComputedStyle(parent).display;
      if (disp === 'flex' || disp === 'inline-flex') {
        if (getComputedStyle(parent).flexWrap === 'nowrap') parent.style.flexWrap = 'wrap';
        el.style.flex = '0 0 100%';
        el.style.width = '100%';
        el.style.marginTop = 'auto';
      }
    } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  // ── Fetch & render ──────────────────────────────────────────
  fetch(url)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var c = document.getElementById('visit-count');
      if (d && typeof d.count === 'number') {
        if (c) c.textContent = d.count.toLocaleString();
        if (doIncrement) { try { sessionStorage.setItem('bnj_counted', '1'); } catch (e) {} }
      } else if (c) { c.textContent = '—'; }
    })
    .catch(function () {
      var c = document.getElementById('visit-count');
      if (c) c.textContent = '—';
    });
})();
