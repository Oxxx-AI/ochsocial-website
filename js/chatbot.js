/* ochsocial.de Klick-Chatbot (26.11.2026). Keine KI, feste Antworten, Anfrage geht wie das Formular ins CRM. */
(function () {
  'use strict';
  if (window.__osChat) return; window.__osChat = true;
  var WA = 'https://wa.me/4915679359801?text=' + encodeURIComponent('Hi ochsocial Team! Ich komme vom Chat auf eurer Website und habe eine Frage.');
  var ZAP = 'https://hooks.zapier.com/hooks/catch/10002468/4u71cgp/';
  var CRM = 'https://n8n.srv1286795.hstgr.cloud/webhook/crm-lead';
  var thema = 'Allgemein';
  var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var css = `
.osc-btn{position:fixed;right:22px;bottom:22px;z-index:9990;width:62px;height:62px;border-radius:50%;border:0;cursor:pointer;background:#14163A;color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 18px 40px -14px rgba(20,22,58,.6);transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
.osc-btn svg{width:28px;height:28px}
.osc-btn .osc-dot{position:absolute;top:10px;right:11px;width:11px;height:11px;border-radius:50%;background:#6FA8F5;border:2px solid #14163A}
@media (hover:hover){.osc-btn:hover{transform:scale(1.07)}}
.osc-btn:focus-visible,.osc-win button:focus-visible,.osc-win a:focus-visible,.osc-win input:focus-visible{outline:3px solid #6FA8F5;outline-offset:2px}
.osc-tip{position:fixed;right:96px;bottom:34px;z-index:9990;background:#fff;color:#14163A;font:700 .9rem/1.35 Manrope,system-ui,sans-serif;padding:11px 15px;border-radius:16px 16px 4px 16px;box-shadow:0 18px 40px -18px rgba(20,22,58,.45);border:1px solid rgba(20,22,58,.06);opacity:0;transform:translateY(8px);transition:opacity .4s,transform .4s;pointer-events:none;max-width:230px}
.osc-tip.on{opacity:1;transform:none}
.osc-win{position:fixed;right:22px;bottom:96px;z-index:9991;width:370px;max-width:calc(100vw - 24px);height:min(560px,calc(100vh - 130px));background:#F3F5F9;border-radius:24px;box-shadow:0 40px 90px -30px rgba(20,22,58,.55);border:1px solid rgba(20,22,58,.08);display:flex;flex-direction:column;overflow:hidden;font-family:Manrope,system-ui,sans-serif;opacity:0;transform:translateY(16px) scale(.98);pointer-events:none;transition:opacity .3s,transform .35s cubic-bezier(.22,1,.36,1)}
.osc-win.on{opacity:1;transform:none;pointer-events:auto}
.osc-head{display:flex;align-items:center;gap:12px;padding:16px 18px;background:#14163A;color:#fff}
.osc-av{width:38px;height:38px;border-radius:50%;background:#F0D9A0;color:#14163A;display:flex;align-items:center;justify-content:center;flex:none}
.osc-av svg{width:20px;height:20px}
.osc-head b{display:block;font-size:.98rem}
.osc-head small{display:flex;align-items:center;gap:6px;font-size:.76rem;color:rgba(255,255,255,.7)}
.osc-head small i{width:7px;height:7px;border-radius:50%;background:#6FA8F5}
.osc-x{margin-left:auto;width:44px;height:44px;border:0;border-radius:12px;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-size:1.2rem}
.osc-body{flex:1;overflow-y:auto;padding:18px 16px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}
.osc-m{max-width:86%;padding:11px 14px;border-radius:18px;font-size:.92rem;line-height:1.5;animation:oscIn .4s cubic-bezier(.22,1,.36,1)}
.osc-m.bot{align-self:flex-start;background:#fff;color:#14163A;border:1px solid rgba(20,22,58,.06);border-bottom-left-radius:5px}
.osc-m.me{align-self:flex-end;background:#14163A;color:#fff;border-bottom-right-radius:5px}
.osc-m a{color:#1E4FBA;font-weight:700}
.osc-typ{align-self:flex-start;display:inline-flex;gap:4px;padding:13px 15px;background:#fff;border-radius:18px;border-bottom-left-radius:5px;border:1px solid rgba(20,22,58,.06)}
.osc-typ i{width:6px;height:6px;border-radius:50%;background:#14163A;opacity:.35;animation:oscDot 1s infinite}
.osc-typ i:nth-child(2){animation-delay:.15s}.osc-typ i:nth-child(3){animation-delay:.3s}
.osc-opts{display:flex;flex-direction:column;align-items:flex-end;gap:8px;animation:oscIn .4s cubic-bezier(.22,1,.36,1)}
.osc-opt{min-height:44px;padding:10px 16px;border-radius:100px;border:1.5px solid rgba(20,22,58,.14);background:#fff;color:#14163A;font:700 .88rem Manrope,system-ui,sans-serif;cursor:pointer;text-align:right;text-decoration:none;display:inline-flex;align-items:center;transition:border-color .25s,background .25s}
.osc-opt.main{background:linear-gradient(180deg,#F5E3B5,#F0D9A0);border-color:#E8CF8E}
@media (hover:hover){.osc-opt:hover{border-color:#14163A}}
.osc-form{align-self:stretch;background:#fff;border:1px solid rgba(20,22,58,.06);border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:10px;animation:oscIn .4s cubic-bezier(.22,1,.36,1)}
.osc-form label{font-size:.78rem;font-weight:700;color:#14163A;display:flex;flex-direction:column;gap:5px}
.osc-form input[type=text],.osc-form input[type=email],.osc-form input[type=tel]{font:16px Manrope,system-ui,sans-serif;padding:11px 12px;border-radius:12px;border:1.5px solid rgba(20,22,58,.14);background:#F3F5F9;color:#14163A}
.osc-form .ck{flex-direction:row;align-items:flex-start;gap:8px;font-weight:600;color:rgba(20,22,58,.7);font-size:.76rem;line-height:1.45}
.osc-form .ck input{margin-top:2px;width:18px;height:18px;flex:none}
.osc-form .ck a{color:#1E4FBA}
.osc-send{min-height:46px;border:0;border-radius:14px;background:linear-gradient(135deg,#2E63D6,#1E4FBA);color:#fff;font:800 .95rem Manrope,system-ui,sans-serif;cursor:pointer}
.osc-err{font-size:.78rem;color:#D64545;font-weight:700;display:none}
.osc-foot{padding:10px 16px 14px;font-size:.72rem;color:rgba(20,22,58,.45);text-align:center}
@keyframes oscIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes oscDot{0%,60%,100%{opacity:.3;transform:none}30%{opacity:.9;transform:translateY(-3px)}}
@media (max-width:767px){.osc-btn{right:14px;bottom:84px;width:56px;height:56px}.osc-tip{display:none}.osc-win{right:12px;left:12px;width:auto;bottom:150px;height:min(540px,calc(100vh - 180px))}}
@media (prefers-reduced-motion:reduce){.osc-m,.osc-opts,.osc-form,.osc-typ i{animation:none}}
`;
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var botIco = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="7" width="16" height="12" rx="3"/><path d="M12 3v4M9 12h.01M15 12h.01M9 16h6"/></svg>';
  var btn = document.createElement('button');
  btn.className = 'osc-btn'; btn.type = 'button';
  btn.setAttribute('aria-label', 'Chat \u00f6ffnen'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg><span class="osc-dot"></span>';
  var tip = document.createElement('div'); tip.className = 'osc-tip'; tip.setAttribute('aria-hidden', 'true');
  tip.textContent = 'Fragen? Ich helfe dir gern weiter.';
  var win = document.createElement('div');
  win.className = 'osc-win'; win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', 'Chat mit Ochsocial'); win.setAttribute('data-lenis-prevent', '');
  win.innerHTML = '<div class="osc-head"><span class="osc-av">' + botIco + '</span><span><b>Ochsocial Assistent</b><small><i></i>antwortet sofort</small></span><button class="osc-x" type="button" aria-label="Chat schlie\u00dfen">&#10005;</button></div><div class="osc-body" aria-live="polite"></div><div class="osc-foot">Pers\u00f6nliche Antwort vom Gr\u00fcnderteam.</div>';
  document.body.appendChild(tip); document.body.appendChild(btn); document.body.appendChild(win);
  var body = win.querySelector('.osc-body');
  var started = false, open = false;

  function scroll() { body.scrollTop = body.scrollHeight; }
  function say(html, cb) {
    var t = document.createElement('div'); t.className = 'osc-typ'; t.innerHTML = '<i></i><i></i><i></i>';
    body.appendChild(t); scroll();
    setTimeout(function () { t.remove(); var m = document.createElement('div'); m.className = 'osc-m bot'; m.innerHTML = html; body.appendChild(m); scroll(); if (cb) cb(); }, rm ? 0 : 650);
  }
  function me(text) { var m = document.createElement('div'); m.className = 'osc-m me'; m.textContent = text; body.appendChild(m); scroll(); }
  function opts(list) {
    var w = document.createElement('div'); w.className = 'osc-opts';
    list.forEach(function (o) {
      var b;
      if (o.href) { b = document.createElement('a'); b.href = o.href; if (o.blank) { b.target = '_blank'; b.rel = 'noopener'; } }
      else { b = document.createElement('button'); b.type = 'button'; }
      b.className = 'osc-opt' + (o.main ? ' main' : ''); b.textContent = o.t;
      if (!o.href) b.addEventListener('click', function () { w.remove(); me(o.t); o.go(); });
      w.appendChild(b);
    });
    body.appendChild(w); scroll();
  }
  var ERST = { t: 'Kostenloses Erstgespr\u00e4ch', main: true, go: function () { formular(); } };
  var WAO = { t: 'Lieber per WhatsApp', href: WA, blank: true };
  var ZUR = { t: 'Andere Frage', go: function () { start(true); } };

  function start(again) {
    if (!again) thema = 'Allgemein';
    say(again ? 'Klar, wobei kann ich dir sonst helfen?' : 'Hallo! Ich bin der Assistent von Ochsocial. Wobei k\u00f6nnen wir dir helfen?', function () {
      opts([
        { t: 'Mehr Kunden \u00fcber Meta-Werbung', go: meta },
        { t: 'KI und Automation f\u00fcr meinen Betrieb', go: ki },
        { t: 'Was kostet das?', go: preis },
        { t: 'Wie l\u00e4uft eine Zusammenarbeit ab?', go: ablauf },
        WAO
      ]);
    });
  }
  function meta() {
    thema = 'Meta-Werbung';
    say('Wir gewinnen \u00fcber Werbung auf Facebook und Instagram neue Kunden f\u00fcr dich. Unsere KI meldet sich bei jeder Anfrage sofort und bucht nur passende Termine in deinen Kalender.', function () {
      say('\u00dcber 450 Projekte in der Kundengewinnung, 5,0 Sterne auf Google. Sollen wir uns deinen Fall ansehen?', function () { opts([ERST, { t: 'Wie l\u00e4uft das ab?', go: ablauf }, ZUR]); });
    });
  }
  function ki() {
    thema = 'KI und Automation';
    say('Wir bauen dir KI-Mitarbeiter, Chatbots f\u00fcr WhatsApp und Website und Abl\u00e4ufe, die Anfragen beantworten, nachfassen und neue Kunden automatisch anlegen.', function () {
      say('Im Erstgespr\u00e4ch finden wir die zwei, drei Stellen, an denen dir KI sofort Arbeit abnimmt.', function () { opts([ERST, { t: 'Beispiele ansehen', href: '/ki-automatisierung.html' }, ZUR]); });
    });
  }
  function preis() {
    say('Das h\u00e4ngt davon ab, was du brauchst. Im kostenlosen Erstgespr\u00e4ch schauen wir uns deine Situation an, danach bekommst du ein festes Angebot. Keine versteckten Kosten.', function () { opts([ERST, WAO, ZUR]); });
  }
  function ablauf() {
    say('So l\u00e4uft es ab:<br>1. Kostenloses Erstgespr\u00e4ch mit dem Gr\u00fcnderteam<br>2. Wir bauen dein System: Werbung, Anfrage-Strecke und KI<br>3. Livegang und jede Woche Optimierung', function () { opts([ERST, ZUR]); });
  }
  function formular() {
    say('Super! Trag dich kurz ein, wir melden uns pers\u00f6nlich bei dir.', function () {
      var f = document.createElement('form'); f.className = 'osc-form'; f.noValidate = true;
      f.innerHTML = '<label>Vorname*<input type="text" name="vorname" autocomplete="given-name" required></label>' +
        '<label>E-Mail*<input type="email" name="email" autocomplete="email" required></label>' +
        '<label>Telefon (optional)<input type="tel" name="telefon" autocomplete="tel"></label>' +
        '<label class="ck"><input type="checkbox" name="ds" required><span>Ich bin mit der Verarbeitung meiner Daten gem\u00e4\u00df der <a href="/datenschutz.html" target="_blank" rel="noopener">Datenschutzerkl\u00e4rung</a> einverstanden.*</span></label>' +
        '<span class="osc-err" role="alert"></span><button class="osc-send" type="submit">Erstgespr\u00e4ch anfragen</button>';
      body.appendChild(f); scroll();
      f.vorname.focus({ preventScroll: true });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var err = f.querySelector('.osc-err'), b = f.querySelector('.osc-send');
        var vn = f.vorname.value.trim(), em = f.email.value.trim();
        var msg = !vn ? 'Bitte gib deinen Vornamen ein.' : !/^\S+@\S+\.\S+$/.test(em) ? 'Bitte gib eine g\u00fcltige E-Mail ein.' : !f.ds.checked ? 'Bitte best\u00e4tige die Datenschutzerkl\u00e4rung.' : '';
        if (msg) { err.textContent = msg; err.style.display = 'block'; return; }
        err.style.display = 'none'; b.disabled = true; b.textContent = 'Wird gesendet \u2026';
        var d = { event: 'lead', quelle: 'Chatbot ochsocial.de', seite: location.pathname.split('/').pop() || 'index.html', utm: location.search || '', zeitpunkt: new Date().toISOString(),
          vorname: vn, nachname: '', firma: '', telefon: f.telefon.value.trim(), email: em, nachricht: 'Chatbot: ' + thema, angebot: 'Chatbot: ' + thema, tags: 'website-anfrage, chatbot', werbe_einwilligung: 'nein' };
        var done = false, offen = 2;
        function erfolg() {
          if (done) return; done = true;
          window.location.href = '/danke.html?vn=' + encodeURIComponent(vn) + '&em=' + encodeURIComponent(em) + (location.search ? '&' + location.search.slice(1) : '');
        }
        function fehler() {
          if (done || --offen > 0) return;
          b.disabled = false; b.textContent = 'Erstgespr\u00e4ch anfragen';
          err.innerHTML = 'Das hat nicht geklappt. Schreib uns gern direkt per <a href="' + WA + '" target="_blank" rel="noopener">WhatsApp</a>.'; err.style.display = 'block';
        }
        [[ZAP, { method: 'POST', body: JSON.stringify(d) }], [CRM, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }]].forEach(function (z) {
          fetch(z[0], z[1]).then(function (r) { if (r.ok) erfolg(); else fehler(); }).catch(fehler);
        });
        if (window.plausible) try { window.plausible('Chatbot Anfrage'); } catch (x) {}
      });
    });
  }
  function toggle(v) {
    open = v; win.classList.toggle('on', v); btn.setAttribute('aria-expanded', v); tip.classList.remove('on');
    if (v && !started) { started = true; start(false); if (window.plausible) try { window.plausible('Chatbot geoeffnet'); } catch (x) {} }
    if (v) setTimeout(function () { var x = win.querySelector('.osc-opt, input'); if (x) x.focus({ preventScroll: true }); }, 900);
    else btn.focus({ preventScroll: true });
  }
  btn.addEventListener('click', function () { toggle(!open); });
  win.querySelector('.osc-x').addEventListener('click', function () { toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(false); });
  /* Hinweis-Blase einmal pro Sitzung nach 12 Sekunden */
  try { if (!sessionStorage.getItem('osc_tip')) setTimeout(function () { if (!open) { tip.classList.add('on'); sessionStorage.setItem('osc_tip', '1'); setTimeout(function () { tip.classList.remove('on'); }, 7000); } }, 12000); } catch (x) {}
})();
