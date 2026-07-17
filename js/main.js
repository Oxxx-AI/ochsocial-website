/* ochsocial.de — Shared JS: Lenis Smooth Scroll, GSAP Reveals, Tool-Ring, Modal, Nav */
(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  /* ---------- WhatsApp Konfiguration ----------
     TODO: Echte Nummer eintragen (internationales Format ohne +, z.B. 4915112345678) */
  var WHATSAPP_NUMBER = '491624932082';
  var WHATSAPP_TEXT = 'Hi ochsocial Team! Ich interessiere mich für euer Meta Ads Management und möchte mehr erfahren. Können wir sprechen?';

  document.querySelectorAll('[data-whatsapp]').forEach(function (el) {
    var waText = el.getAttribute('data-wa-text') || WHATSAPP_TEXT;
    el.setAttribute('href', 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(waText));
    el.setAttribute('target', '_blank');
    el.setAttribute('rel', 'noopener');
  });

  /* ---------- Lenis Smooth Scroll ---------- */
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.35,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true
    });
  }

  /* ---------- GSAP + ScrollTrigger ---------- */
  var hasGsap = window.gsap && window.ScrollTrigger;
  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger);

    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    }

    /* Scroll Reveals */
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      var type = el.getAttribute('data-reveal-type') || el.getAttribute('data-reveal') || 'up';
      var delay = parseFloat(el.getAttribute('data-delay') || 0);
      var from = { opacity: 0, y: 48, duration: 1.1, delay: delay, ease: 'power3.out' };
      if (type === 'tilt') { from.rotationX = 8; from.transformPerspective = 900; from.transformOrigin = '50% 100%'; }
      if (type === 'left') { from.y = 0; from.x = -56; }
      if (type === 'right') { from.y = 0; from.x = 56; }
      if (type === 'scale') { from.y = 0; from.scale = 0.92; }
      gsap.fromTo(el, from, {
        opacity: 1, y: 0, x: 0, scale: 1, rotationX: 0,
        duration: from.duration, delay: from.delay, ease: from.ease,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });

    /* Hero Intro (ohne ScrollTrigger, direkt beim Laden) */
    var heroEls = document.querySelectorAll('[data-hero]');
    if (heroEls.length) {
      gsap.fromTo(heroEls, { opacity: 0, y: 56 }, {
        opacity: 1, y: 0, duration: 1.2, ease: 'power3.out', stagger: 0.14, delay: 0.15
      });
    }

    /* Zahlen hochzählen */
    document.querySelectorAll('[data-count]').forEach(function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-suffix') || '';
      var obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: 2, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        onUpdate: function () {
          el.textContent = Math.round(obj.v).toLocaleString('de-DE') + suffix;
        }
      });
    });
  } else {
    document.querySelectorAll('[data-reveal], [data-hero]').forEach(function (el) { el.style.opacity = 1; });
  }

  /* ---------- 3D Tool Ring ---------- */
  var ring = document.querySelector('.ring');
  if (ring) {
    var items = ring.querySelectorAll('.ring-item');
    var n = items.length;
    var isMobile = window.matchMedia('(max-width: 640px)').matches;
    var radius = isMobile ? 300 : 430;
    items.forEach(function (item, i) {
      var angle = (360 / n) * i;
      item.style.transform = 'rotateY(' + angle + 'deg) translateZ(' + radius + 'px)';
    });
  }

  /* ---------- Mobile Nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.querySelector('.mobile-nav');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', function () {
      mobileNav.classList.toggle('open');
      document.body.style.overflow = mobileNav.classList.contains('open') ? 'hidden' : '';
      if (lenis) { mobileNav.classList.contains('open') ? lenis.stop() : lenis.start(); }
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        mobileNav.classList.remove('open');
        document.body.style.overflow = '';
        if (lenis) lenis.start();
      });
    });
  }

  /* ---------- Lead Modal ---------- */
  var overlay = document.querySelector('.modal-overlay');
  if (overlay) {
    function openModal() {
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
    }
    function closeModal() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
      if (lenis) lenis.start();
    }
    document.querySelectorAll('[data-open-form]').forEach(function (btn) {
      btn.addEventListener('click', function (e) { e.preventDefault(); openModal(); });
    });
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

    /* Formular-Flow (Feedback 14):
       1. Lead-Daten an Make-Webhook (Mail an miriam@ochsocial.de + Trello-Karte via Make)
       2. Danach Calendly eingebettet zeigen (Terminbuchung direkt im Modal)
       3. Bucht der Lead einen Termin, geht ein zweites Event an den Webhook
       TODO: WEBHOOK_URL (Make) und CALENDLY_URL eintragen. */
    var WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/10002468/4u71cgp/';
    var CALENDLY_URL = 'https://calendly.com/miriam-ochs/erstgesprach-website';
    var form = overlay.querySelector('form');
    if (form) {
      var leadData = null;
      function sendEvent(eventName) {
        if (!WEBHOOK_URL || !leadData) return;
        var payload = {};
        for (var k in leadData) payload[k] = leadData[k];
        payload.event = eventName;
        try {
          fetch(WEBHOOK_URL, {
            method: 'POST', mode: 'no-cors',
            body: JSON.stringify(payload),
            keepalive: true
          });
        } catch (err) {}
      }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        leadData = {
          quelle: 'Website ochsocial.de',
          seite: location.pathname.split('/').pop() || 'index.html',
          utm: location.search || '',
          zeitpunkt: new Date().toISOString()
        };
        form.querySelectorAll('input, textarea, select').forEach(function (el) {
          if (el.name && el.type !== 'checkbox') leadData[el.name] = el.value;
        });
        var werbung = form.querySelector('[name="werbung"]');
        leadData.tags = (werbung && werbung.checked) ? 'website-anfrage, werbe-einwilligung' : 'website-anfrage';
        leadData.werbe_einwilligung = (werbung && werbung.checked) ? 'ja' : 'nein';
        sendEvent('lead');
        var q = 'vn=' + encodeURIComponent(leadData.vorname || '') +
                '&em=' + encodeURIComponent(leadData.email || '') +
                (location.search ? '&' + location.search.slice(1) : '');
        window.location.href = 'danke.html?' + q;
      });
    }
  }

  /* ---------- Consent-Banner + Meta Pixel (nur nach Opt-in) ---------- */
  var PIXEL_ID = '760767924722009'; /* Ochsocial Pixel Allgemein */
  function loadMetaPixel() {
    if (window.fbq) return;
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0';
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', PIXEL_ID);
    fbq('track', 'PageView');
  }
  var consentState = null;
  try { consentState = localStorage.getItem('os_consent'); } catch (e) {}
  if (consentState === 'yes') {
    loadMetaPixel();
  } else if (consentState !== 'no') {
    var cb = document.createElement('div');
    cb.className = 'consent-banner';
    cb.innerHTML = '<p><strong>Cookies & Marketing:</strong> Wir nutzen den Meta-Pixel, um unsere Werbung zu verbessern. ' +
      'Details in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>' +
      '<div class="consent-actions"><button class="consent-yes">Akzeptieren</button>' +
      '<button class="consent-no">Nur notwendige</button></div>';
    document.body.appendChild(cb);
    cb.querySelector('.consent-yes').addEventListener('click', function () {
      try { localStorage.setItem('os_consent', 'yes'); } catch (e) {}
      cb.remove(); loadMetaPixel();
    });
    cb.querySelector('.consent-no').addEventListener('click', function () {
      try { localStorage.setItem('os_consent', 'no'); } catch (e) {}
      cb.remove();
    });
  }

  /* ---------- FAQ Accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (o) {
        o.classList.remove('open');
        o.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });


  /* ---------- Faden 2.0: Pfad laeuft durch die Karten und gabelt sich in die CTA-Buttons ---------- */
  function buildThread() {
    var svg = document.querySelector('.thread-svg');
    var wrap = document.querySelector('.thread-wrap');
    if (!svg || !wrap) return;
    var W = wrap.offsetWidth, H = wrap.offsetHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var wr = wrap.getBoundingClientRect();
    var pts = [];
    wrap.querySelectorAll('.thread-step').forEach(function (el) {
      var r = el.getBoundingClientRect();
      pts.push({ x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 });
    });
    if (!pts.length) return;
    var d = 'M ' + (W / 2) + ' 0';
    var prev = { x: W / 2, y: 0 };
    pts.forEach(function (p) {
      var midY = (prev.y + p.y) / 2;
      d += ' C ' + prev.x + ' ' + midY + ', ' + p.x + ' ' + midY + ', ' + p.x + ' ' + p.y;
      prev = p;
    });
    var paths = svg.querySelectorAll('path');
    var branches = ['', ''];
    var b1 = wrap.querySelector('.thread-end-1'), b2 = wrap.querySelector('.thread-end-2');
    [b1, b2].forEach(function (btn, i) {
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var e = { x: r.left - wr.left + r.width / 2, y: r.top - wr.top - 4 };
      var midY = (prev.y + e.y) / 2;
      branches[i] = 'M ' + prev.x + ' ' + prev.y + ' C ' + prev.x + ' ' + midY + ', ' + e.x + ' ' + midY + ', ' + e.x + ' ' + e.y;
    });
    paths[0].setAttribute('d', d); paths[1].setAttribute('d', d);
    paths[2].setAttribute('d', branches[0]); paths[3].setAttribute('d', branches[0]);
    paths[4].setAttribute('d', branches[1]); paths[5].setAttribute('d', branches[1]);
/* Draw-Scrub (Feedback 07): durchgezogene Linie zeichnet sich beim Scrollen
       vor und zurueck, mit leuchtendem Kopf an der Spitze — wie im Beispiel */
    var clip = svg.querySelector('.thread-cliprect');
    if (clip) { clip.setAttribute('width', W); }
    var head = svg.querySelector('.thread-head');
    if (!head) {
      head = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      head.setAttribute('class', 'thread-head');
      head.setAttribute('r', '7');
      head.setAttribute('fill', '#F3F8FF');
      svg.appendChild(head);
    }
    if (hasGsap) {
      var mainLen = paths[0].getTotalLength();
      var b1Len = paths[2].getTotalLength ? paths[2].getTotalLength() : 0;
      var b2Len = paths[4].getTotalLength ? paths[4].getTotalLength() : 0;
      [[paths[0], mainLen], [paths[2], b1Len], [paths[4], b2Len]].forEach(function (cfg) {
        cfg[0].style.strokeDasharray = cfg[1];
        cfg[0].style.strokeDashoffset = cfg[1];
      });
      var state = { p: 0.10 }; /* 10% vorgezeichnet, damit es nie leer aussieht */
      function render() {
        var drawnMain = Math.min(1, state.p / 0.82) * mainLen;
        paths[0].style.strokeDashoffset = mainLen - drawnMain;
        var bp = Math.max(0, (state.p - 0.82) / 0.18);
        paths[2].style.strokeDashoffset = b1Len - bp * b1Len;
        paths[4].style.strokeDashoffset = b2Len - bp * b2Len;
        var tip = state.p < 0.82 ? paths[0].getPointAtLength(drawnMain) : paths[2].getPointAtLength(bp * b1Len);
        head.setAttribute('cx', tip.x); head.setAttribute('cy', tip.y);
        head.setAttribute('opacity', state.p >= 0.999 ? 0 : 1);
        if (clip) { clip.setAttribute('height', state.p >= 0.999 ? H : Math.max(0, tip.y + 20)); }
      }
      render();
      if (window.__threadST) { window.__threadST.kill(); }
      var threadTween = gsap.to(state, {
        p: 1, ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top 78%', end: 'bottom 97%', scrub: 0.6 },
        onUpdate: render
      });
      window.__threadST = threadTween.scrollTrigger;
    } else {
      paths.forEach(function (p) { p.style.strokeDasharray = 'none'; });
      if (clip) { clip.setAttribute('height', H); }
    }

    /* Fluss: heller Glanz wandert kontinuierlich die blaue Linie entlang,
       an die Scrollgeschwindigkeit gekoppelt (Feedback 09) */
    paths[1].style.strokeDasharray = '120 340';
    if (!window.__flowRunning) {
      window.__flowRunning = true;
      window.__flowVel = 0;
      if (lenis) { lenis.on('scroll', function (e) { window.__flowVel += (e.velocity || 0) * 0.5; }); }
      var fo = 0;
      (function flowTick() {
        fo -= 1.6 + window.__flowVel;
        window.__flowVel *= 0.9;
        paths[1].style.strokeDashoffset = fo;
        requestAnimationFrame(flowTick);
      })();
    }
  }

  window.addEventListener('load', buildThread);
  var thResize;
  window.addEventListener('resize', function () {
    clearTimeout(thResize);
    thResize = setTimeout(function () {
      buildThread();
    }, 250);
  });

  /* ---------- Dashboard: Kurve zeichnet sich beim Scrollen ---------- */
  if (hasGsap) {
    document.querySelectorAll('.draw-path').forEach(function (p) {
      var len = p.getTotalLength();
      p.style.strokeDasharray = len;
      p.style.strokeDashoffset = len;
      gsap.to(p.style, {
        strokeDashoffset: 0, duration: 1.8, ease: 'power2.out',
        scrollTrigger: { trigger: p, start: 'top 85%', once: true }
      });
    });
  }

  /* ---------- Budget-Rechner (Ergebnisse) ---------- */
  var calcRange = document.getElementById('calcBudget');
  if (calcRange) {
    var calcSel = document.getElementById('calcBranche');
    var outB = document.getElementById('calcBudgetOut');
    var outA = document.getElementById('calcAnfragen');
    var outK = document.getElementById('calcKunden');
    function calcUpd() {
      var budget = parseInt(calcRange.value, 10);
      var cpl = parseFloat(calcSel.value);
      var anfragen = Math.round(budget / cpl);
      var kunden = Math.max(1, Math.floor(anfragen * 0.10));
      outB.textContent = budget.toLocaleString('de-DE') + ' €';
      outA.textContent = anfragen.toLocaleString('de-DE');
      outK.textContent = kunden.toLocaleString('de-DE');
    }
    calcRange.addEventListener('input', calcUpd);
    calcSel.addEventListener('change', calcUpd);
    calcUpd();
  }

  /* ---------- Lead-Magnet: E-Mail-Gate + Download ---------- */
  var magnetForm = document.querySelector('.magnet-form');
  if (magnetForm) {
    magnetForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var vn = magnetForm.querySelector('[name="vorname"]');
      var em = magnetForm.querySelector('[name="email"]');
      if (!em.value || em.value.indexOf('@') < 1) { em.focus(); return; }
      var MAGNET_WEBHOOK = 'https://hooks.zapier.com/hooks/catch/10002468/4u7a2hn/'; /* Zap: Leadmagnet -> Guide-Mail */
      if (MAGNET_WEBHOOK) {
        try {
          fetch(MAGNET_WEBHOOK, {
            method: 'POST', mode: 'no-cors',
            body: JSON.stringify({ event: 'leadmagnet', vorname: vn.value, email: em.value, quelle: 'Website ochsocial.de', utm: location.search || '', zeitpunkt: new Date().toISOString() }),
            keepalive: true
          });
        } catch (err) {}
      }
      if (window.fbq) fbq('track', 'Lead', { content_name: 'Leadmagnet 7 Fehler' });
      var ok = document.createElement('p');
      ok.className = 'magnet-success';
      ok.innerHTML = 'Fast geschafft! Wir haben dir eine E-Mail geschickt. <strong>Bestätige kurz deine Adresse</strong>, direkt danach bekommst du den Guide.';
      magnetForm.parentNode.insertBefore(ok, magnetForm.nextSibling);
      magnetForm.style.display = 'none';
    });
  }

  /* ---------- Done-For-You Drehscheibe ---------- */
  var dfyDial = document.querySelector('.dfy-dial');
  if (dfyDial) {
    var dfyWheel = dfyDial.querySelector('.dfy-wheel');
    var dfyItems = Array.prototype.slice.call(dfyWheel.querySelectorAll('.dfy-item'));
    var dfyPanels = document.querySelectorAll('.dfy-panel');
    var dfyNum = dfyDial.querySelector('.dfy-num');
    var dfyN = dfyItems.length, dfyStep = 360 / dfyN, dfyTurn = 0, dfyAct = 0;
    function dfyPaint() {
      var R = dfyDial.offsetWidth / 2 - 40;
      var rot = -dfyTurn * dfyStep;
      dfyWheel.style.transform = 'rotate(' + rot + 'deg)';
      dfyItems.forEach(function (it, k) {
        var a = k * dfyStep;
        it.style.transform = 'rotate(' + a + 'deg) translateX(' + R + 'px)';
        it.querySelector('.dfy-item-inner').style.transform =
          'translate(-50%, -50%) rotate(' + (-(rot + a)) + 'deg)';
        it.classList.toggle('active', k === dfyAct);
      });
      dfyPanels.forEach(function (p, k) { p.classList.toggle('active', k === dfyAct); });
      if (dfyNum) dfyNum.textContent = (dfyAct + 1);
    }
    dfyPaint();
    var dfyHover = false;
    var dfyLayout = document.querySelector('.dfy-layout');
    if (dfyLayout) {
      dfyLayout.addEventListener('mouseenter', function () { dfyHover = true; });
      dfyLayout.addEventListener('mouseleave', function () { dfyHover = false; });
    }
    setInterval(function () {
      if (!dfyHover && !document.hidden) { dfyTurn += 1; dfyAct = dfyTurn % dfyN; dfyPaint(); }
    }, 4200);
    dfyItems.forEach(function (it, k) {
      it.addEventListener('click', function () {
        if (k === dfyAct) return;
        dfyTurn += (k - dfyAct + dfyN) % dfyN;
        dfyAct = k;
        dfyPaint();
      });
    });
    window.addEventListener('resize', dfyPaint);
  }

  /* ---------- Danke-Seite: Pixel-Conversion + Calendly + Termin-Event ---------- */
  var dankeBox = document.getElementById('dankeCalendly');
  if (dankeBox) {
    var params = new URLSearchParams(location.search);
    if (window.fbq) fbq('track', 'Lead');
    var CAL_URL = 'https://calendly.com/miriam-ochs/erstgesprach-website';
    var pre = CAL_URL + '?name=' + encodeURIComponent(params.get('vn') || '') +
              '&email=' + encodeURIComponent(params.get('em') || '');
    dankeBox.innerHTML = '<div class="calendly-inline-widget" data-url="' + pre + '" style="min-width:300px;height:700px;"></div>';
    var cs = document.createElement('script');
    cs.src = 'https://assets.calendly.com/assets/external/widget.js';
    cs.async = true;
    document.head.appendChild(cs);
    window.addEventListener('message', function (ev) {
      if (ev.data && ev.data.event === 'calendly.event_scheduled') {
        if (window.fbq) fbq('track', 'Schedule');
        var WH = 'https://hooks.zapier.com/hooks/catch/10002468/4u7f5ey/'; /* Zap: Termin gebucht -> EG offen */
        if (WH) {
          try {
            fetch(WH, { method: 'POST', mode: 'no-cors',
              body: JSON.stringify({ event: 'termin_gebucht', vorname: params.get('vn') || '', email: params.get('em') || '', quelle: 'Website ochsocial.de', zeitpunkt: new Date().toISOString() }), keepalive: true });
          } catch (err) {}
        }
      }
    });
  }

  /* ---------- 3D-Elemente (Three.js, lazy): Logo-Chip, Funnel, Stern ---------- */
  var THREE_SRC = 'vendor/three.min.js';
  var threeLoading = false, threeReady = false, threeQueue = [];
  function withThree(fn) {
    if (threeReady) return fn();
    threeQueue.push(fn);
    if (threeLoading) return;
    threeLoading = true;
    var s = document.createElement('script');
    s.src = THREE_SRC;
    s.onload = function () { threeReady = true; threeQueue.forEach(function (f) { f(); }); threeQueue = []; };
    document.head.appendChild(s);
  }
  function scene3d(el, build, opts) {
    opts = opts || {};
    try {
      var W = el.clientWidth || 240, H = el.clientHeight || 240;
      var scene = new THREE.Scene();
      var cam = new THREE.PerspectiveCamera(38, W / H, 0.1, 100);
      cam.position.set(0, 0, opts.camZ || 7);
      var ren = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      ren.setSize(W, H);
      ren.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      el.appendChild(ren.domElement);
      var group = new THREE.Group();
      scene.add(group);
      build(group);
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3, 4, 5); scene.add(key);
      var rim = new THREE.DirectionalLight(0xF0D9A0, 0.9); rim.position.set(-4, -2, 3); scene.add(rim);
      var mx = 0, my = 0;
      window.addEventListener('mousemove', function (e) {
        mx = (e.clientX / window.innerWidth - 0.5) * 0.9;
        my = (e.clientY / window.innerHeight - 0.5) * 0.6;
      });
      var t = Math.random() * 10;
      (function tick() {
        t += 0.01;
        if (opts.spin) {
          group.rotation.y += 0.008;
          group.rotation.x = Math.sin(t * 0.5) * 0.12 + my * 0.3;
        } else {
          group.rotation.y += (mx * 0.9 + Math.sin(t * 0.6) * 0.35 - group.rotation.y) * 0.05;
          group.rotation.x += (my * 0.7 + Math.cos(t * 0.5) * 0.12 - group.rotation.x) * 0.05;
        }
        group.position.y = Math.sin(t) * 0.12;
        ren.render(scene, cam);
        requestAnimationFrame(tick);
      })();
    } catch (e) { el.style.display = 'none'; }
  }
  function lazy3d(id, build, opts) {
    var el = document.getElementById(id);
    if (!el || !('IntersectionObserver' in window)) return;
    var done = false;
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting || done) return;
      done = true;
      io.disconnect();
      withThree(function () { scene3d(el, build, opts); });
    }, { rootMargin: '200px' });
    io.observe(el);
  }
  /* Logo-Chip im CTA-Panel (ohne goldenen Ring) */
  lazy3d('logo3d', function (group) {
    var chip = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 2.1, 0.55, 6, 1),
      new THREE.MeshStandardMaterial({ color: 0x1E4FBA, metalness: 0.75, roughness: 0.28 })
    );
    chip.rotation.x = Math.PI / 2;
    group.add(chip);
    new THREE.TextureLoader().load('assets/logo/icon_only_weiss.webp', function (tex) {
      var logo = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
      logo.position.z = 0.29;
      group.add(logo);
    });
  });
  /* Funnel: drei Metallic-Trichterringe */
  /* Stern: Champagne-Metallic */


  /* ---------- DNA-Helix: leuchtende Partikel (Startseite) ---------- */
  lazy3d('dna3d', function (group) {
    function spriteTex(r, g, b) {
      var cv = document.createElement('canvas'); cv.width = cv.height = 64;
      var ctx = cv.getContext('2d');
      var gr = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.25, 'rgba(' + r + ',' + g + ',' + b + ',0.9)');
      gr.addColorStop(0.6, 'rgba(' + r + ',' + g + ',' + b + ',0.25)');
      gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, 64, 64);
      var t = new THREE.CanvasTexture(cv); return t;
    }
    var texGold = spriteTex(240, 217, 160), texBlue = spriteTex(111, 168, 245);
    var SPAN = 11.5, R = 1.3, TWIST = Math.PI * 6.4;
    function helixPoint(f, off, jit) {
      var y = -SPAN / 2 + f * SPAN;
      var a = f * TWIST + off;
      return [
        Math.cos(a) * R + (Math.random() - 0.5) * jit,
        y + (Math.random() - 0.5) * jit,
        Math.sin(a) * R + (Math.random() - 0.5) * jit
      ];
    }
    function cloud(pts, tex, size, op) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      var mat = new THREE.PointsMaterial({
        size: size, map: tex, transparent: true, opacity: op,
        blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
      });
      var p = new THREE.Points(g, mat); group.add(p); return p;
    }
    /* Strang 1 gold, Strang 2 blau: dichte Partikelbaender */
    var s1 = [], s2 = [];
    for (var i = 0; i < 2600; i++) {
      var f = Math.random();
      s1.push.apply(s1, helixPoint(f, 0, 0.22));
      s2.push.apply(s2, helixPoint(f, Math.PI, 0.22));
    }
    cloud(s1, texGold, 0.14, 0.85);
    cloud(s2, texBlue, 0.13, 0.8);
    /* Sprossen als Partikellinien */
    var rungs = [];
    for (var r2 = 0; r2 < 26; r2++) {
      var fr = r2 / 25, ar = fr * TWIST;
      var ax = Math.cos(ar) * R, az = Math.sin(ar) * R, ay = -SPAN / 2 + fr * SPAN;
      for (var k = 0; k <= 18; k++) {
        var t2 = k / 18;
        rungs.push(ax - 2 * ax * t2 + (Math.random() - 0.5) * 0.09,
                   ay + (Math.random() - 0.5) * 0.09,
                   az - 2 * az * t2 + (Math.random() - 0.5) * 0.09);
      }
    }
    cloud(rungs, texGold, 0.085, 0.55);
    /* Staub drumherum */
    var dust = [];
    for (var d = 0; d < 500; d++) {
      var fd = Math.random(), rd = R + 0.4 + Math.random() * 2.2, ad = Math.random() * Math.PI * 2;
      dust.push(Math.cos(ad) * rd, -SPAN / 2 + fd * SPAN, Math.sin(ad) * rd);
    }
    var dustCloud = cloud(dust, texGold, 0.07, 0.0);
    dustCloud.material.opacity = 0.28;
    /* Funkeln */
    var tw = 0;
    group.children[0].onBeforeRender = function () {
      tw += 0.02;
      group.children[0].material.opacity = 0.75 + Math.sin(tw * 1.7) * 0.15;
      group.children[1].material.opacity = 0.7 + Math.sin(tw * 1.3 + 2) * 0.15;
      group.children[3].material.opacity = 0.2 + Math.sin(tw * 0.9 + 4) * 0.1;
    };
  }, { spin: true, camZ: 14.5 });

  /* ---------- Reichweite: aufpoppende Avatare ---------- */
  (function () {
    var viz = document.querySelector('.reach-viz');
    if (!viz) return;
    var avs = Array.prototype.slice.call(viz.querySelectorAll('.reach-av'));
    if (!avs.length) return;
    var slots = [];
    [152, 200, 262].forEach(function (r, ri) {
      var n = 5 + ri * 2;
      for (var s = 0; s < n; s++) {
        var a = (s / n) * Math.PI * 2 + ri * 0.7;
        if (r < 190 && Math.abs(Math.cos(a)) > 0.82) continue; /* nicht in die Logos */
        slots.push([Math.round(Math.cos(a) * r), Math.round(Math.sin(a) * r)]);
      }
    });
    var used = {};
    function place(el) {
      var free = [];
      for (var s = 0; s < slots.length; s++) if (!used[s]) free.push(s);
      if (!free.length) return;
      if (el._slot !== undefined) delete used[el._slot];
      var pick = free[Math.floor(Math.random() * free.length)];
      used[pick] = true; el._slot = pick;
      el.style.left = 'calc(50% + ' + (slots[pick][0] - 23) + 'px)';
      el.style.top = 'calc(50% + ' + (slots[pick][1] - 23) + 'px)';
    }
    avs.forEach(place);
    var running = false, idx = 0;
    function cycle() {
      var el = avs[idx % avs.length]; idx++;
      if (el.classList.contains('pop')) {
        el.classList.remove('pop');
        if (el._slot !== undefined) { delete used[el._slot]; el._slot = undefined; }
        setTimeout(function () { place(el); el.classList.add('pop'); }, 600);
      } else { place(el); el.classList.add('pop'); }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting && !running) {
          running = true;
          for (var k = 0; k < 6; k++) setTimeout(cycle, k * 280);
          setInterval(cycle, 850);
        }
      }, { threshold: 0.25 }).observe(viz);
    }
  })();


  /* ---------- Cursor-Leuchtschimmer ---------- */
  (function () {
    var glow = document.querySelector('.cursor-glow');
    if (!glow || !window.matchMedia('(hover: hover)').matches) return;
    var gx = -1000, gy = -1000, cx = gx, cy = gy, on = false;
    document.addEventListener('mousemove', function (e) {
      gx = e.clientX; gy = e.clientY;
      if (!on) { on = true; glow.style.opacity = '1'; }
    });
    document.addEventListener('mouseleave', function () { on = false; glow.style.opacity = '0'; });
    (function loop() {
      cx += (gx - cx) * 0.09; cy += (gy - cy) * 0.09;
      glow.style.transform = 'translate(' + cx + 'px,' + cy + 'px)';
      requestAnimationFrame(loop);
    })();
  })();

  /* ---------- Creatives V1: Einflug ins Raster ---------- */
  if (hasGsap) {
    document.querySelectorAll('.cshow-fly .ad-card').forEach(function (card, i) {
      var seed = (i * 137.5) % 360;
      var dx = Math.cos(seed) * (220 + (i % 3) * 130);
      var dy = 260 + ((i * 71) % 240);
      var rot = ((i * 53) % 44) - 22;
      gsap.fromTo(card,
        { x: dx, y: dy, rotation: rot, opacity: 0, scale: 0.7 },
        { x: 0, y: 0, rotation: 0, opacity: 1, scale: 1, ease: 'power2.out',
          scrollTrigger: { trigger: '.cshow-fly', start: 'top 92%', end: 'top 38%', scrub: 0.6 } });
    });

  /* ---------- Scroll-Uebergang zwischen Sektionen ---------- */
    if (window.matchMedia('(min-width: 1000px)').matches) {
      document.querySelectorAll('.reveal-mask').forEach(function (sec) {
        gsap.fromTo(sec,
          { clipPath: 'inset(5% 7% 8% 7% round 42px)', scale: 0.965 },
          { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, ease: 'none',
            scrollTrigger: { trigger: sec, start: 'top 95%', end: 'top 42%', scrub: 0.5 } });
      });
    }
  }



  /* ---------- Creatives: Hover-Zoom-Overlay ---------- */
  (function () {
    if (!window.matchMedia('(hover: hover)').matches) return;
    var cards = document.querySelectorAll('.ad-card img');
    if (!cards.length) return;
    var zoom = document.createElement('div');
    zoom.className = 'cr-zoom';
    var zimg = document.createElement('img');
    zoom.appendChild(zimg);
    document.body.appendChild(zoom);
    var hideT;
    cards.forEach(function (img) {
      img.parentElement.addEventListener('mouseenter', function () {
        clearTimeout(hideT);
        zimg.src = img.src;
        zoom.classList.add('show');
      });
      img.parentElement.addEventListener('mouseleave', function () {
        hideT = setTimeout(function () { zoom.classList.remove('show'); }, 80);
      });
    });
  })();

  /* ---------- Aktiver Nav-Link ---------- */
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-header nav a').forEach(function (a) {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
})();
