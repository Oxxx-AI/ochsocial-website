/* sofortleads Portal: Plausible (cookielos), Meta-Pixel nur nach Einwilligung,
   Quelle merken fuer den Funnel. Einwilligung teilt sich den Schluessel sl_consent mit dem Funnel. */
(function () {
  var w = window, d = document;

  // Plausible, gleiche Site wie der Funnel
  w.plausible = w.plausible || function () { (w.plausible.q = w.plausible.q || []).push(arguments); };
  w.plausible.init = w.plausible.init || function (i) { w.plausible.o = i || {}; };
  w.plausible.init();
  var ps = d.createElement('script'); ps.async = true; ps.src = 'https://plausible.io/js/pa-ED0wEAfNvAGUBscNWiy8T.js';
  d.head.appendChild(ps);

  // Quelle aus der Anzeige merken, gleiches Format wie slQuelle() im Funnel
  try {
    var p = new URLSearchParams(location.search), q = '';
    var s = p.get('utm_source') || '', m = p.get('utm_medium') || '', c = p.get('utm_campaign') || '';
    var ad = p.get('utm_content') || p.get('ad_id') || p.get('adset_id') || '', t = p.get('utm_term') || '';
    if (s || m || c || ad || t) q = [s, m, c, ad, t].filter(Boolean).join(' / ');
    else if (p.get('fbclid')) q = 'meta / klick';
    else if (p.get('gclid')) q = 'google / klick';
    if (q) localStorage.setItem('sl_quelle', q);
  } catch (e) {}

  // Meta-Pixel nur nach Einwilligung
  function pixel() {
    if (w.__slpx) return; w.__slpx = 1;
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(w, d, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    w.fbq('init', '2301564033685877'); w.fbq('track', 'PageView');
  }
  function merken(ok) {
    try { localStorage.setItem('sl_consent', ok ? 'yes' : 'no'); } catch (e) {}
    var el = d.getElementById('sl-consent'); if (el) el.parentNode.removeChild(el);
    if (ok) pixel();
  }
  function banner() {
    var el = d.createElement('div');
    el.id = 'sl-consent';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Einwilligung');
    el.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;background:#14163A;color:#fff;padding:16px 20px;font-size:14px;line-height:1.5;box-shadow:0 -2px 12px rgba(0,0,0,.25);font-family:inherit';
    el.innerHTML = '<div style="max-width:1080px;margin:0 auto;display:flex;gap:16px;align-items:center;flex-wrap:wrap;justify-content:space-between">' +
      '<div style="flex:1;min-width:240px">Wir verwenden Cookies und den Meta-Pixel, um unsere Werbung zu messen. Details in der <a href="/datenschutz.html" style="color:#F0D9A0">Datenschutzerkl\u00e4rung</a>.</div>' +
      '<div style="display:flex;gap:10px"><button type="button" data-c="0" style="background:none;border:1px solid #6b7192;color:#fff;padding:9px 18px;border-radius:6px;cursor:pointer;font-weight:600;font-family:inherit;font-size:14px">Ablehnen</button>' +
      '<button type="button" data-c="1" style="background:#1E4FBA;border:none;color:#fff;padding:9px 18px;border-radius:6px;cursor:pointer;font-weight:700;font-family:inherit;font-size:14px">Akzeptieren</button></div></div>';
    el.addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) merken(b.getAttribute('data-c') === '1'); });
    d.body.appendChild(el);
  }
  function start() {
    var c = null; try { c = localStorage.getItem('sl_consent'); } catch (e) {}
    if (c === 'yes') pixel();
    else if (c !== 'no' && !d.getElementById('sl-consent')) banner();
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
