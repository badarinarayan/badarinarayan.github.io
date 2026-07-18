/* ──────────────────────────────────────────────────────────────
   Comment section (Cusdis — lightweight, no reader login).
   Readers comment with just a name; no account required.

   ONE-TIME SETUP (site owner):
     1. Create a free account at https://cusdis.com
     2. Add a website → copy its "App ID" (a UUID).
     3. Paste it below, replacing PASTE_YOUR_CUSDIS_APP_ID_HERE.
   New comments are held for your approval in the Cusdis dashboard.
   ────────────────────────────────────────────────────────────── */
(function () {
  var APP_ID = 'b0c98301-9488-431e-a147-3dbee4bf2ab3';
  var HOST = 'https://cusdis.com';

  // ── Per-page theming (via data-* on this script tag) ────────
  // Defaults match the amber / Libre Baskerville site theme; pages
  // with their own look override accent/color/font, e.g.:
  //   <script src="../comments.js"
  //           data-accent="#2563eb" data-heading-color="#0f1117"
  //           data-heading-font="'Inter',sans-serif"></script>
  var cfg = (document.currentScript && document.currentScript.dataset) || {};
  var ACCENT = cfg.accent || '#c47a0f';
  var HEAD_COLOR = cfg.headingColor || '#0f0d09';
  var HEAD_FONT = cfg.headingFont || "'Libre Baskerville',Georgia,serif";

  // ── Build the section ───────────────────────────────────────
  var section = document.createElement('section');
  section.id = 'comments-section';
  section.style.cssText = 'max-width:720px;margin:0 auto;padding:2.5rem 1.5rem 3rem;box-sizing:border-box;';

  var heading = document.createElement('div');
  heading.style.cssText = 'display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem;';
  heading.innerHTML =
    '<span style="width:24px;height:2px;background:' + ACCENT + ';flex-shrink:0;display:inline-block;"></span>' +
    '<h2 style="font-family:' + HEAD_FONT + ';font-size:1.4rem;color:' + HEAD_COLOR + ';' +
    'letter-spacing:-0.01em;margin:0;font-weight:700;">Comments</h2>';
  section.appendChild(heading);

  if (APP_ID === 'PASTE_YOUR_CUSDIS_APP_ID_HERE') {
    var note = document.createElement('div');
    note.style.cssText =
      'padding:1rem 1.25rem;background:#fdf0d5;border:1px dashed #c47a0f;border-radius:4px;' +
      "color:#7a7060;font-size:0.85rem;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,'Barlow',sans-serif;";
    note.textContent = 'Comments will appear here once setup is complete.';
    section.appendChild(note);
  } else {
    var thread = document.createElement('div');
    thread.id = 'cusdis_thread';
    thread.setAttribute('data-host', HOST);
    thread.setAttribute('data-app-id', APP_ID);
    thread.setAttribute('data-page-id', location.pathname);
    thread.setAttribute('data-page-url', location.href);
    thread.setAttribute('data-page-title', document.title);
    thread.setAttribute('data-theme', 'light');
    section.appendChild(thread);

    var s = document.createElement('script');
    s.async = true; s.defer = true;
    s.src = HOST + '/js/cusdis.es.js';
    section.appendChild(s);
  }

  // ── Place it just above the page footer ─────────────────────
  function place() {
    var footer = document.querySelector('footer, .footer');
    if (footer && footer.parentNode) { footer.parentNode.insertBefore(section, footer); return true; }
    return false;
  }
  function appendToBody() {
    var parent = document.body || document.documentElement;
    parent.appendChild(section);
    // Handle flex-centered bodies (e.g. The Bandwagon Bridge).
    try {
      var disp = getComputedStyle(parent).display;
      if (disp === 'flex' || disp === 'inline-flex') {
        if (getComputedStyle(parent).flexWrap === 'nowrap') parent.style.flexWrap = 'wrap';
        section.style.flex = '0 0 100%';
        section.style.width = '100%';
      }
    } catch (e) {}
  }
  function mount() {
    if (place()) return;
    // Some pages render their content (and footer) asynchronously — watch for it.
    var obs = new MutationObserver(function () { if (place()) obs.disconnect(); });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(function () { if (!section.parentNode) { obs.disconnect(); appendToBody(); } }, 4000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
