/* sofortleads Portal, gemeinsames Frontend-Skript */
var SL = {"stufen":[{"ab":100,"proz":30},{"ab":40,"proz":20},{"ab":20,"proz":10}],"themen":[{"id":"kapitalanleger","slug":"kapitalanleger-leads-kaufen","name":"Kapitalanleger","branche":"immobilienmakler","preis":270,"preisMin":189,"prov":9000,"quote":20,"provLabel":"Provision je Abschluss"},{"id":"finanzierung","slug":"immobilienfinanzierung-leads-kaufen","name":"Immobilienfinanzierung","branche":"immobilienmakler","preis":60,"preisMin":45,"prov":2200,"quote":18,"provLabel":"Provision je Finanzierung"},{"id":"verkaeufer","slug":"immobilien-verkaeufer-leads-kaufen","name":"Verk\u00e4ufer und Eigent\u00fcmer","branche":"immobilienmakler","preis":350,"preisMin":290,"prov":12000,"quote":15,"provLabel":"Provision je Verkaufsauftrag"},{"id":"sterbegeld","slug":"sterbegeld-leads-kaufen","name":"Sterbegeldversicherung","branche":"versicherungsmakler","preis":45,"preisMin":30,"prov":600,"quote":22,"provLabel":"Courtage je Abschluss"},{"id":"motorrad-unfall","slug":"motorrad-unfallversicherung-leads-kaufen","name":"Motorrad-Unfallversicherung","branche":"versicherungsmakler","preis":60,"preisMin":45,"prov":450,"quote":20,"provLabel":"Courtage je Abschluss"},{"id":"kinder-gesundheit","slug":"kinder-gesundheitsvorsorge-leads-kaufen","name":"Gesundheitsvorsorge f\u00fcr Kinder","branche":"versicherungsmakler","preis":60,"preisMin":45,"prov":700,"quote":18,"provLabel":"Courtage je Abschluss"},{"id":"kfz","slug":"kfz-versicherung-leads-kaufen","name":"Kfz-Versicherung","branche":"versicherungsmakler","preis":40,"preisMin":25,"prov":180,"quote":28,"provLabel":"Courtage je Abschluss"},{"id":"zahnzusatz","slug":"zahnzusatzversicherung-leads-kaufen","name":"Zahnzusatzversicherung","branche":"versicherungsmakler","preis":50,"preisMin":30,"prov":520,"quote":22,"provLabel":"Courtage je Abschluss"},{"id":"edelmetalle","slug":"edelmetall-leads-kaufen","name":"Edelmetalle und Sachwerte","branche":"finanzberater","preis":80,"preisMin":55,"prov":1400,"quote":16,"provLabel":"Marge je Abschluss"},{"id":"kindersparplan","slug":"kindersparplan-leads-kaufen","name":"Kindersparplan","branche":"finanzberater","preis":60,"preisMin":45,"prov":750,"quote":20,"provLabel":"Courtage je Abschluss"},{"id":"kredit","slug":"kredit-leads-kaufen","name":"Kreditvermittlung","branche":"finanzberater","preis":60,"preisMin":30,"prov":1800,"quote":14,"provLabel":"Provision je Vermittlung"},{"id":"partner-recruiting","slug":"vertriebspartner-leads-kaufen","name":"Vertriebspartner und Nebeneinkommen","branche":"direktvertrieb","preis":45,"preisMin":30,"prov":400,"quote":12,"provLabel":"Wert eines aktiven Partners"},{"id":"gewicht","slug":"abnehmen-leads-kaufen","name":"Gewichtsreduktion","branche":"direktvertrieb","preis":35,"preisMin":25,"prov":220,"quote":25,"provLabel":"Deckungsbeitrag je Kunde"},{"id":"nahrungsergaenzung","slug":"nahrungsergaenzung-leads-kaufen","name":"Gesundheit und Nahrungserg\u00e4nzung","branche":"direktvertrieb","preis":35,"preisMin":25,"prov":200,"quote":25,"provLabel":"Deckungsbeitrag je Kunde"},{"id":"kosmetik","slug":"kosmetik-leads-kaufen","name":"Anti-Aging und Kosmetik","branche":"direktvertrieb","preis":35,"preisMin":25,"prov":190,"quote":24,"provLabel":"Deckungsbeitrag je Kunde"},{"id":"photovoltaik","slug":"photovoltaik-leads-kaufen","name":"Photovoltaik und Speicher","branche":"energie","preis":110,"preisMin":90,"prov":2600,"quote":18,"provLabel":"Deckungsbeitrag je Anlage"},{"id":"waermepumpe","slug":"waermepumpe-leads-kaufen","name":"W\u00e4rmepumpe und Heizung","branche":"energie","preis":130,"preisMin":110,"prov":3200,"quote":16,"provLabel":"Deckungsbeitrag je Auftrag"},{"id":"klima","slug":"klimaanlage-leads-kaufen","name":"Klimaanlage","branche":"energie","preis":120,"preisMin":95,"prov":1500,"quote":20,"provLabel":"Deckungsbeitrag je Auftrag"}]};

function stufe(n){for(var i=0;i<SL.stufen.length;i++){if(n>=SL.stufen[i].ab)return SL.stufen[i];}return {ab:0,proz:0};}
function eur(v){return Math.round(v).toLocaleString('de-DE')+' \u20ac';}
function findThema(id){for(var i=0;i<SL.themen.length;i++){if(SL.themen[i].id===id)return SL.themen[i];}return null;}
function ppl(t,n){var max=t.preis,min=(t.preisMin!=null?t.preisMin:Math.round(t.preis*0.7)),sp=max-min;if(n>=100)return min;if(n>=40)return Math.round(max-sp*2/3);if(n>=20)return Math.round(max-sp/3);return max;}
function el(id){return document.getElementById(id);}

function tglNav(){el('navlinks').classList.toggle('show');}
function tglMega(e){e.preventDefault();e.stopPropagation();el('mega').classList.toggle('open');}
function tglFaq(b){b.parentElement.classList.toggle('open');}
document.addEventListener('click',function(e){var m=el('mega');if(m&&!m.contains(e.target))m.classList.remove('open');});

function slider(x){if(!x)return;var p=(x.value-x.min)/(x.max-x.min)*100;x.style.setProperty('--pct',p+'%');}

/* Kaufstrecke */
var SL_WH = 'https://n8n.srv1286795.hstgr.cloud/webhook/';
var kDaten = {};

function kGo(n){
  var panes=document.querySelectorAll('.kpane');
  for(var i=0;i<panes.length;i++){panes[i].classList.toggle('hidden',+panes[i].getAttribute('data-pane')!==n);}
  var steps=document.querySelectorAll('.kstep');
  for(var j=0;j<steps.length;j++){
    var st=+steps[j].getAttribute('data-step');
    steps[j].classList.toggle('aktiv',st===n);
    steps[j].classList.toggle('fertig',st<n);
  }
  window.scrollTo({top:0,behavior:'smooth'});
}
function kFehler(id,text){var e=el(id);if(!e)return;e.textContent=text;e.hidden=!text;}
function kWert(id){var e=el(id);return e?e.value.trim():'';}
function kTel(){return kWert('f-tel').replace(/[^0-9+]/g,'');}

function kWeiter1(){
  var pflicht=['f-vorname','f-nachname','f-firma','f-email','f-tel'],leer=false;
  pflicht.forEach(function(id){var e=el(id);if(!e.value.trim()){e.classList.add('invalid');leer=true;}else{e.classList.remove('invalid');}});
  if(leer){kFehler('err1','Bitte f\u00fcllen Sie alle Pflichtfelder aus.');return;}
  if(!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(kWert('f-email'))){kFehler('err1','Bitte pr\u00fcfen Sie Ihre E-Mail-Adresse.');el('f-email').classList.add('invalid');return;}
  if(!/^(\+|0)[0-9]{9,15}$/.test(kTel())){kFehler('err1','Bitte geben Sie eine g\u00fcltige Mobilnummer an.');el('f-tel').classList.add('invalid');return;}
  kFehler('err1','');
  kDaten={vorname:kWert('f-vorname'),nachname:kWert('f-nachname'),firma:kWert('f-firma'),email:kWert('f-email'),tel:kTel()};
  kSende('sl-send-code',{tel:kDaten.tel,name:kDaten.vorname+' '+kDaten.nachname,vorname:kDaten.vorname,nachname:kDaten.nachname,firma:kDaten.firma,email:kDaten.email,stufe:'kontakt_eingegeben',ohneSms:true});
  kGo(2);kCalc();
}
function kWeiter2(){
  kFehler('err2','');
  kCalc();
  kGo(3);
}
function kWeiter3(){
  var plz=kWert('f-plz');
  if(!/^[0-9]{5}$/.test(plz)){kFehler('err3','Bitte geben Sie eine f\u00fcnfstellige Postleitzahl an.');el('f-plz').classList.add('invalid');return;}
  kFehler('err3','');
  kCalc();
  var t=findThema(el('f-thema').value),n=+el('f-menge').value,p=ppl(t,n);
  el('k-zusammen').innerHTML=
    kZeile('Kontakt',kDaten.vorname+' '+kDaten.nachname+', '+kDaten.firma)+
    kZeile('E-Mail',kDaten.email)+
    kZeile('Mobil',kDaten.tel)+
    kZeile('Lead-Thema',t.name)+
    kZeile('Menge',n+' Leads')+
    kZeile('Gebiet',plz+', '+(el('f-radius').value==='0'?'bundesweit':el('f-radius').value+' km'))+
    kZeile('Lieferzeitraum',kZeitText())+
    kZeile('Preis je Lead',eur(p))+
    kZeile('Gesamt netto',eur(n*p),true);
  kGo(4);
}
function kZeile(a,b,stark){return '<div class="kz'+(stark?' stark':'')+'"><span>'+a+'</span><b>'+b+'</b></div>';}
function kZeitText(){var v=el('f-zeitraum');return v.options[v.selectedIndex].text;}
function kAbsenden(){
  if(!el('f-agb').checked||!el('f-sofort').checked){kFehler('err4','Bitte best\u00e4tigen Sie beide H\u00e4kchen.');return;}
  kFehler('err4','');
  var t=findThema(el('f-thema').value),n=+el('f-menge').value,p=ppl(t,n);
  kSende('sl-portal-order',{
    vorname:kDaten.vorname,nachname:kDaten.nachname,firma:kDaten.firma,email:kDaten.email,tel:kDaten.tel,
    thema:t.id,themaName:t.name,menge:n,preisJeLead:p,gesamt:n*p,
    plz:kWert('f-plz'),radius:el('f-radius').value,zeitraum:el('f-zeitraum').value
  });
  kGo(5);
}
function kSende(pfad,daten){
  try{
    fetch(SL_WH+pfad,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(daten),keepalive:true}).catch(function(){});
  }catch(e){}
}
function kCalc(){
  if(!document.querySelector('.kaufbox'))return;
  var s=el('f-thema');if(!s)return;
  var t=findThema(s.value);if(!t)return;
  var n=+el('f-menge').value,p=ppl(t,n);
  slider(el('f-menge'));
  el('f-menge-v').textContent=n+' Leads';
  el('s-thema').textContent=t.name;
  el('s-menge').textContent=n+' Leads';
  el('s-ppl').innerHTML=eur(p);
  el('s-zeit').textContent=kZeitText();
  var plz=kWert('f-plz');
  el('s-gebiet').textContent=plz?(plz+', '+(el('f-radius').value==='0'?'bundesweit':el('f-radius').value+' km')):'noch offen';
  el('s-total').innerHTML=eur(n*p);
}
(function(){
  if(!document.querySelector('.kaufbox')||!el('f-thema'))return;
  var q=(location.search.match(/thema=([a-z-]+)/)||[])[1];
  var m=(location.search.match(/menge=(\d+)/)||[])[1];
  if(q&&findThema(q))el('f-thema').value=q;
  if(m)el('f-menge').value=Math.min(150,Math.max(5,+m));
  var plz=el('f-plz');if(plz)plz.addEventListener('input',kCalc);
  var rad=el('f-radius');if(rad)rad.addEventListener('change',kCalc);
  kCalc();
})();

/* Ablauf: Karten stapeln sich beim Scrollen */
(function(){
  var karten=[].slice.call(document.querySelectorAll(".zzweg .zz"));
  if(karten.length<2||window.innerWidth<1080)return;
  var warte=false;
  function pruefen(){
    warte=false;
    for(var i=0;i<karten.length-1;i++){
      var naechste=karten[i+1].getBoundingClientRect();
      karten[i].classList.toggle("raus",naechste.top<karten[i].getBoundingClientRect().top+40);
    }
  }
  window.addEventListener("scroll",function(){if(!warte){warte=true;requestAnimationFrame(pruefen);}},{passive:true});
  pruefen();
})();

/* Branchen-Auswahl */
function brTab(id){
  var tabs=document.querySelectorAll('.btab'),panels=document.querySelectorAll('.bpanel');
  for(var i=0;i<tabs.length;i++){tabs[i].classList.toggle('aktiv',tabs[i].getAttribute('data-tab')===id);}
  for(var j=0;j<panels.length;j++){panels[j].classList.toggle('aktiv',panels[j].getAttribute('data-panel')===id);}
  var t=document.querySelector('.btab.aktiv');
  if(t&&t.parentElement.scrollWidth>t.parentElement.clientWidth){
    t.parentElement.scrollTo({left:t.offsetLeft-16,behavior:'smooth'});
  }
}

/* Pruefstufen: nacheinander einblenden, aktive Stufe hervorheben, Linie mitwachsen lassen */
(function(){
  var liste=document.querySelector('.fsteps');
  if(!liste)return;
  var steps=[].slice.call(liste.querySelectorAll('.fstep'));
  if(!steps.length)return;

  if('IntersectionObserver' in window){
    var beo=new IntersectionObserver(function(eintraege){
      eintraege.forEach(function(e){
        if(e.isIntersecting){
          var i=steps.indexOf(e.target);
          setTimeout(function(){e.target.classList.add('an');},i%6*90);
          beo.unobserve(e.target);
        }
      });
    },{threshold:.35,rootMargin:'0px 0px -12% 0px'});
    steps.forEach(function(s){beo.observe(s);});
  }else{
    steps.forEach(function(s){s.classList.add('an');});
  }

  var warte=false;
  function aktualisieren(){
    warte=false;
    var mitte=window.innerHeight*0.46,naechste=null,dist=1e9;
    steps.forEach(function(s){
      var r=s.getBoundingClientRect();
      var d=Math.abs(r.top+r.height/2-mitte);
      if(d<dist){dist=d;naechste=s;}
    });
    steps.forEach(function(s){s.classList.toggle('jetzt',s===naechste);});
    var idx=steps.indexOf(naechste);
    var lr=liste.getBoundingClientRect();
    var ar=naechste.getBoundingClientRect();
    var ziel=(ar.top+ar.height/2-lr.top)/lr.height*100;
    if(lr.bottom<window.innerHeight*0.62)ziel=100;
    if(idx===steps.length-1&&ar.top<mitte)ziel=100;
    liste.style.setProperty('--fill',Math.max(0,Math.min(100,ziel))+'%');
  }
  window.addEventListener('scroll',function(){
    if(!warte){warte=true;requestAnimationFrame(aktualisieren);}
  },{passive:true});
  steps.forEach(function(s){
    s.addEventListener('mouseenter',function(){
      steps.forEach(function(x){x.classList.remove('jetzt');});
      s.classList.add('jetzt');s.classList.add('an');
    });
  });
  aktualisieren();
})();

function setBranche(bid){
  var sb=el('k-branche'),st=el('k-thema');
  if(!sb||!st)return;
  sb.value=bid;
  var h='';
  for(var i=0;i<SL.themen.length;i++){if(SL.themen[i].branche===bid){h+='<option value="'+SL.themen[i].id+'">'+SL.themen[i].name+'</option>';}}
  st.innerHTML=h;
  calc();
}

function waehle(tid){
  var t=findThema(tid);if(!t)return;
  if(el('k-branche')){setBranche(t.branche);el('k-thema').value=tid;calc();}
  if(el('r-thema')){el('r-thema').value=tid;rthema();}
}

function calc(){
  var mEl=el('k-menge'),tEl=el('k-thema');
  if(!mEl||!tEl)return;
  var n=+mEl.value,t=findThema(tEl.value);
  if(!t)return;
  var p=ppl(t,n);
  slider(mEl);
  el('k-menge-v').textContent=n+' Leads';
  var proz2=Math.round((t.preis-p)/t.preis*100);el('k-ppl').innerHTML=proz2?'<span class="strike">'+eur(t.preis)+'</span>'+eur(p)+'<span class="savebadge">\u2212'+proz2+'%</span>':eur(p);
  el('k-total').innerHTML=eur(n*p);
  var cta=el('k-cta');
  if(cta){var b=cta.getAttribute('href').split('?')[0];cta.setAttribute('href',b+'?thema='+t.id+'&menge='+n);}
  if(el('r-thema')&&el('r-leads')){
    el('r-thema').value=t.id;
    el('r-leads').value=Math.min(n,+el('r-leads').max);
    rthema();
  }
}

function rthema(){
  var s=el('r-thema');if(!s)return;
  var t=findThema(s.value);if(!t)return;
  el('r-prov').value=t.prov;
  el('r-quote').value=t.quote;
  rcalc();
}

function rcalc(){
  var s=el('r-thema');if(!s)return;
  var t=findThema(s.value);if(!t)return;
  var n=+el('r-leads').value,q=+el('r-quote').value,p=+el('r-prov').value;
  if(!p||p<50){p=50;}
  slider(el('r-leads'));slider(el('r-quote'));
  var pw=ppl(t,n),inv=n*pw,abs=n*q/100,ums=abs*p,erg=ums-inv;
  var noetig=Math.max(1,Math.ceil(inv/p));
  el('r-prov-h').textContent=t.provLabel;
  el('r-leads-v').textContent=n;
  el('r-quote-v').textContent=q+' %';
  el('r-ppl').innerHTML=eur(pw);
  el('r-inv').innerHTML=eur(inv);
  el('r-abs').textContent=(Math.round(abs*10)/10).toLocaleString('de-DE');
  el('r-umsatz').innerHTML=eur(ums);
  var e=el('r-erg');
  e.innerHTML=(erg>=0?'+':'\u2212')+eur(Math.abs(erg));
  e.style.color=erg>=0?'#22a877':'#E0483D';
  el('r-break').innerHTML='Ab <b>'+noetig+(noetig===1?' Abschluss':' Abschl\u00fcssen')+'</b> sind Sie im Plus.';
  var max=Math.max(ums,inv,1);
  el('b-inv').style.width=(inv/max*100)+'%';
  el('b-ums').style.width=(ums/max*100)+'%';
  el('b-erg').style.width=(Math.max(erg,0)/max*100)+'%';
  el('b-inv-v').innerHTML=eur(inv);
  el('b-ums-v').innerHTML=eur(ums);
  var be=el('b-erg-v');
  be.innerHTML=(erg>=0?'+':'\u2212')+eur(Math.abs(erg));
  be.style.color=erg>=0?'#22a877':'#E0483D';
}

(function(){
  var k=el('konfigurator');
  var vor=k?k.getAttribute('data-thema'):'';
  var hash=location.hash.replace('#','');
  if(hash&&findThema(hash)){vor=hash;}
  if(!vor){
    var q=(location.search.match(/thema=([a-z-]+)/)||[])[1];
    if(q&&findThema(q))vor=q;
  }
  if(vor&&findThema(vor)){waehle(vor);}
  else{
    var start=findThema('kfz')?'kfz':SL.themen[0].id;
    var mengeEl=el('k-menge');
    if(mengeEl)mengeEl.value=15;
    if(el('k-branche'))waehle(start);
    else if(el('r-thema'))rthema();
  }
})();
