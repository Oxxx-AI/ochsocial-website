// ============================================================================
// SHK Sichtbarkeits-Report \u2014 Live-Analyse (Netlify Function)
// POST { url, plz }  ->  JSON im Format, das shk-check.html rendert.
//
// Ben\u00f6tigte Environment-Variablen (in Netlify unter Site settings > Env):
//   GOOGLE_API_KEY   \u2014 Google Cloud Key mit: Places API + PageSpeed Insights API
//   META_TOKEN       \u2014 Meta/Facebook Access-Token mit Zugriff auf die Ad Library (ads_archive)
//
// Robust gebaut: faellt eine Quelle aus, liefert die Function trotzdem ein
// vollstaendiges Ergebnis (die betroffene Metrik wird als "unbekannt" markiert).
// ============================================================================

const GKEY = process.env.GOOGLE_API_KEY;
const META = process.env.META_TOKEN;                 // optional: direkter Fallback
const N8N_META = process.env.N8N_META_WEBHOOK;       // bevorzugt: n8n-Webhook (Meta-Token liegt dort)
const N8N_SECRET = process.env.N8N_META_SECRET || ""; // geheimer Header, damit nur wir den Webhook nutzen
const RADIUS_M = 30000;                 // 30 km Umkreis
const COUNTRY = "DE";
const ALLOWED = ["ochsocial.de", "localhost", "127.0.0.1"]; // erlaubte Hosts (Origin-Check)
const RL = new Map();                   // Best-effort Rate-Limit pro IP (pro warmer Instanz)
const RL_MAX = 5, RL_WINDOW = 60000;    // max 5 Analysen / Minute / IP

const j = (o) => JSON.stringify(o);
const num = (s) => (s || 0).toLocaleString("de-DE");
const deStar = (n) => (n == null ? "\u2013" : n.toFixed(1).replace(".", ","));

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers: cors, body: j({ error: "POST only" }) };

  // --- Origin-Check: nur Anfragen von ochsocial.de ---
  const ref = event.headers.origin || event.headers.referer || "";
  if (!ALLOWED.some(h => ref.includes(h)))
    return { statusCode: 403, headers: cors, body: j({ error: "forbidden origin" }) };

  // --- Rate-Limit (best effort, deckelt Bursts) ---
  const ip = (event.headers["x-nf-client-connection-ip"] || event.headers["x-forwarded-for"] || "ip").split(",")[0].trim();
  const now = Date.now();
  const hits = (RL.get(ip) || []).filter(t => now - t < RL_WINDOW);
  if (hits.length >= RL_MAX)
    return { statusCode: 429, headers: cors, body: j({ error: "zu viele Anfragen, bitte kurz warten" }) };
  hits.push(now); RL.set(ip, hits);

  // Ohne Google-Key keine echte Analyse -> sauberes 503, Frontend zeigt dann seinen Platzhalter
  if (!GKEY) return { statusCode: 503, headers: cors, body: j({ error: "analyse noch nicht aktiv (kein GOOGLE_API_KEY gesetzt)" }) };

  let url, plz;
  try { ({ url, plz } = JSON.parse(event.body || "{}")); }
  catch { return { statusCode: 400, headers: cors, body: j({ error: "bad json" }) }; }
  if (!url || !/^\d{5}$/.test(plz || ""))
    return { statusCode: 400, headers: cors, body: j({ error: "url + 5-stellige plz noetig" }) };

  const domain = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");

  try {
    // 1) Website + Impressum -> Rechtsname, Formular, Online-Termin, FB-Seite
    const site = await scrapeSite(domain);

    // 2) Region-Center aus der ZUVERLAESSIGEN PLZ (Places), nicht aus dem Impressum
    const region = await placesCenter(plz);
    const brand = domain.split(".")[0];   // z.B. "schmidtstallateur"

    // 3) Betrieb finden: auf die PLZ-Region begrenzt, ueber Rechtsname/Domain-Brand
    const self = await findBusiness(brand, site.legalName, region);
    const center = self?.geometry || region?.geometry;

    // 4) Konkurrenten im 30-km-Umkreis
    let comps = await findCompetitors(center, self?.place_id);
    comps = await enrichAndRank(comps, self);
    const top3 = comps.slice(0, 3);

    // 5) Meta-Werbung: eigener Betrieb + Konkurrenten
    const selfAds = await metaActiveAds(site.fbPageId, self?.name || brand);
    const compAdsFlags = await Promise.all(top3.map(c => metaActiveAds(null, c.name).then(n => n > 0)));

    // 6) PageSpeed (mobil) fuer eigene Seite
    const ps = await pageSpeed(domain);

    // 7) Score + Ausgabe bauen
    const payload = buildPayload({ domain, plz, site, self, top3, selfAds, compAdsFlags, ps, city: region?.city });
    return { statusCode: 200, headers: cors, body: j(payload) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: j({ error: "analyse fehlgeschlagen", detail: String(e) }) };
  }
};

// ---------------------------------------------------------------------------
// Website + Impressum auslesen
// ---------------------------------------------------------------------------
async function scrapeSite(domain) {
  const out = { legalName: "", form: false, booking: false, fbPageId: null };
  const pages = [`https://${domain}/`, `https://${domain}/impressum`, `https://${domain}/impressum/`, `https://${domain}/kontakt`];
  let html = "";
  for (const p of pages) {
    try {
      const r = await fetch(p, { headers: { "User-Agent": "Mozilla/5.0 ochsocial-check" }, redirect: "follow" });
      if (r.ok) html += "\n" + (await r.text());
    } catch {}
  }
  const low = html.toLowerCase();
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");

  // Echter Firmen-Rechtsname aus dem Text (Zeile mit Rechtsform)
  out.legalName = (text.match(/([A-Z\u00c4\u00d6\u00dc][\w\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df.&\-]*(?:[ ][\w\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df.&\-]+){0,4}[ ](?:GmbH(?:[ ]&[ ]Co\.?[ ]KG)?|GbR|UG|OHG|e\.[ ]?K\.|KG|Inh\.))/)?.[1] || "").replace(/\s+/g, " ").trim();

  // Anfrageformular vorhanden?
  out.form = /<form[\s\S]*?(name|mail|kontakt|anfrage|nachricht)/i.test(html) || /mailto:/i.test(low);

  // Online-Terminbuchung?
  out.booking = /(calendly|terminland|timify|shore\.com|cituro|etermin|terminvereinbarung online|termin buchen|online[- ]?termin)/i.test(low);

  // Facebook-Seite / Page-ID
  const fb = html.match(/facebook\.com\/([^"'\s?]+)/i)?.[1] || "";
  const idm = fb.match(/(\d{6,})/);
  if (idm) out.fbPageId = idm[1];

  return out;
}

// ---------------------------------------------------------------------------
// Google Places (Legacy Web Service)
// ---------------------------------------------------------------------------
async function gfetch(u) {
  const r = await fetch(u);
  return r.ok ? r.json() : {};
}
// Region-Center + Ortsname aus der PLZ (nur Places API, kein Geocoding-Key noetig)
async function placesCenter(plz) {
  if (!GKEY) return null;
  const d = await gfetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(plz + " Deutschland")}&language=de&key=${GKEY}`);
  const p = d.results?.[0];
  if (!p) return null;
  const city = (p.formatted_address || "").replace(/\d{5}/, "").replace(/,?\s*Deutschland/i, "").replace(/^[\s,]+/, "").trim();
  return { geometry: p.geometry?.location || null, city };
}
// distanz in km (Haversine)
function distKm(a, b) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
// Betrieb finden, auf die PLZ-Region begrenzt. Rechtsname zuerst, dann Domain-Brand.
async function findBusiness(brand, legalName, region) {
  if (!GKEY || !region?.geometry) return null;
  const c = region.geometry;
  const city = region.city || "";
  const tries = [];
  if (legalName) tries.push(legalName + " " + city);
  tries.push(brand + " " + city);
  tries.push(brand + " Sanitaer Heizung " + city);
  for (const q of tries) {
    const d = await gfetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&location=${c.lat},${c.lng}&radius=25000&region=de&language=de&key=${GKEY}`);
    const p = d.results?.[0];
    const loc = p?.geometry?.location;
    if (p && loc && distKm(c, loc) <= 40) {  // muss wirklich in der Region liegen
      return { place_id: p.place_id, name: p.name, rating: p.rating ?? null, reviews: p.user_ratings_total ?? 0, geometry: loc };
    }
  }
  return null;
}
async function findCompetitors(center, selfId) {
  if (!GKEY || !center) return [];
  const seen = {};
  const out = [];
  for (const kw of ["Sanit\u00e4r Heizung", "Heizungsbau", "Badsanierung", "Klimaanlage"]) {
    const d = await gfetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${center.lat},${center.lng}&radius=${RADIUS_M}&keyword=${encodeURIComponent(kw)}&language=de&key=${GKEY}`
    );
    for (const p of d.results || []) {
      if (p.place_id === selfId || seen[p.place_id]) continue;
      seen[p.place_id] = 1;
      out.push({ place_id: p.place_id, name: p.name, rating: p.rating ?? null, reviews: p.user_ratings_total ?? 0 });
    }
  }
  return out;
}
async function enrichAndRank(comps, self) {
  // Score = Rating gewichtet mit log(Anzahl Bewertungen) -> viele UND gute Bewertungen zaehlen
  const score = (c) => (c.rating || 0) * Math.log10((c.reviews || 0) + 1);
  const selfScore = self ? score(self) : 0;
  return comps
    .filter(c => (c.reviews || 0) >= 5)
    .map(c => ({ ...c, _s: score(c) }))
    .filter(c => c._s >= selfScore * 0.6)   // klar sichtbare, ernstzunehmende Betriebe
    .sort((a, b) => b._s - a._s);
}

// ---------------------------------------------------------------------------
// Meta Ad Library \u2014 Anzahl aktiver Anzeigen
// ---------------------------------------------------------------------------
async function metaActiveAds(pageId, name) {
  // Bevorzugt ueber n8n (dort liegt dein Meta-Token). Fallback: direkte Graph-API.
  if (N8N_META) {
    try {
      const r = await fetch(N8N_META, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-shk-secret": N8N_SECRET },
        body: JSON.stringify({ pageId, name, country: COUNTRY })
      });
      if (r.ok) { const d = await r.json(); if (typeof d.count === "number") return d.count; }
    } catch {}
  }
  if (!META) return null;
  try {
    const base = `https://graph.facebook.com/v19.0/ads_archive?ad_reached_countries=["${COUNTRY}"]&ad_active_status=ACTIVE&limit=100&fields=id,page_name&access_token=${META}`;
    const u = pageId ? `${base}&search_page_ids=["${pageId}"]` : `${base}&search_terms=${encodeURIComponent(name)}`;
    const r = await fetch(u);
    if (!r.ok) return null;
    const d = await r.json();
    if (!Array.isArray(d.data)) return null;
    if (pageId) return d.data.length;
    // Namenssuche: nur Treffer zaehlen, deren Seitenname grob passt
    const key = name.toLowerCase().split(/\s+/)[0];
    return d.data.filter(a => (a.page_name || "").toLowerCase().includes(key)).length;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// PageSpeed Insights (mobil)
// ---------------------------------------------------------------------------
async function pageSpeed(domain) {
  if (!GKEY) return null;
  try {
    const d = await gfetch(
      `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&strategy=mobile&category=performance&key=${GKEY}`
    );
    const lcp = d.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue;
    const perf = d.lighthouseResult?.categories?.performance?.score;
    return { lcpSec: lcp ? lcp / 1000 : null, perf: perf != null ? Math.round(perf * 100) : null };
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Score + JSON fuer das Frontend
// ---------------------------------------------------------------------------
function buildPayload({ domain, plz, site, self, top3, selfAds, compAdsFlags, ps, city }) {
  const avgRating = top3.length ? top3.reduce((s, c) => s + (c.rating || 0), 0) / top3.length : null;
  const avgReviews = top3.length ? Math.round(top3.reduce((s, c) => s + (c.reviews || 0), 0) / top3.length) : null;
  const compAdsCount = compAdsFlags.filter(Boolean).length;
  const bookingCount = 0; // Konkurrenz-Booking wird v2 aus deren Sites geprueft; hier neutral

  const metrics = [];
  let score = 50, gaps = [];

  // Google-Bewertungen
  if (self && avgReviews != null) {
    const behind = (self.reviews || 0) < avgReviews * 0.7;
    metrics.push({
      icon: "star", champ: true, name: "Google-Bewertungen",
      sub: "Anzahl entscheidet, ob du auf Karte & Suche oben stehst",
      status: behind ? "gap" : "ok", badge: behind ? "R\u00fcckstand" : "Gut aufgestellt",
      you: `${deStar(self.rating)} \u2605 \u00b7 ${num(self.reviews)} Bew.`,
      them: `${deStar(avgRating)} \u2605 \u00b7 ${num(avgReviews)} Bew.`
    });
    if (behind) { gaps.push("Google-Bewertungen"); score -= 12; } else score += 6;
  }

  // Meta-Werbung
  if (selfAds != null) {
    const ahead = selfAds >= Math.max(1, compAdsCount);
    metrics.push({
      icon: "ads", name: "Meta-Werbung (Facebook / Instagram)",
      sub: "Aktive Anzeigen in der Meta-Werbebibliothek",
      status: ahead && selfAds > 0 ? "ok" : "gap",
      badge: selfAds > 0 ? (ahead ? "Du bist vorn" : "Konkurrenz aktiver") : "Du wirbst nicht",
      you: `${selfAds} aktiv`,
      them: `${compAdsCount} von ${top3.length} werben`
    });
    if (selfAds === 0 && compAdsCount > 0) { gaps.push("Meta-Werbung"); score -= 14; }
    else if (ahead && selfAds > 0) score += 8;
  }

  // Online-Terminbuchung
  metrics.push({
    icon: "calendar", name: "Online-Terminbuchung",
    sub: "Kunde bucht selbst einen Termin, ohne anzurufen",
    status: site.booking ? "ok" : "gap",
    badge: site.booking ? "Vorhanden" : "Fehlt",
    you: site.booking ? "Vorhanden" : "Nicht vorhanden",
    them: "Standard bei Top-Betrieben", themLabel: "Top 3"
  });
  if (!site.booking) { gaps.push("Online-Termin"); score -= 8; } else score += 5;

  // Anfrageformular
  metrics.push({
    icon: "form", name: "Anfrageformular",
    sub: "Anfragen rund um die Uhr, auch ausserhalb der B\u00fcrozeiten",
    status: site.form ? "ok" : "gap",
    badge: site.form ? "Vorhanden" : "Fehlt",
    you: site.form ? "Vorhanden" : "Nicht vorhanden",
    them: "Standard bei Top-Betrieben", themLabel: "Top 3"
  });
  if (!site.form) { gaps.push("Anfrageformular"); score -= 6; } else score += 3;

  // Ladezeit
  if (ps && ps.lcpSec != null) {
    const slow = ps.lcpSec > 3.0;
    metrics.push({
      icon: "bolt", name: "Website-Ladezeit (Mobil)",
      sub: "Langsame Seiten verlieren jeden 2. Besucher",
      status: slow ? "gap" : "ok", badge: slow ? "Zu langsam" : "Schnell",
      you: `${ps.lcpSec.toFixed(1).replace(".", ",")} s`, them: "unter 2,5 s", themLabel: "Zielwert"
    });
    if (slow) { gaps.push("Ladezeit"); score -= 8; } else score += 5;
  }

  score = Math.max(18, Math.min(92, Math.round(score)));

  const verdict = gaps.length
    ? `<b>Solide Basis, aber du verschenkst Sichtbarkeit.</b> Gr\u00f6\u00dfte L\u00fccken: ${gaps.slice(0, 3).join(", ")}. Genau hier ziehen die st\u00e4rksten Betriebe deiner Region an dir vorbei.`
    : `<b>Starke Aufstellung.</b> Du liegst bei den meisten Faktoren vorn. Mit etwas Feinschliff baust du den Vorsprung weiter aus.`;

  const competitors = top3.map(c => ({
    name: c.name, rating: deStar(c.rating), reviews: num(c.reviews),
    points: [
      c.reviews ? `${num(c.reviews)} Google-Bewertungen` : "Aktives Google-Profil",
      "Sichtbar im 30-km-Umkreis",
      "Erscheint bei lokalen Suchen weit oben"
    ]
  }));

  const gapSummary = gaps.length
    ? `Zusammengefasst: In den Bereichen <b>${gaps.slice(0, 3).join("</b>, <b>")}</b> liegt deine Konkurrenz vorn. Genau da entscheidet sich, wer in deiner Region den n\u00e4chsten Auftrag bekommt.`
    : `Du bist gut aufgestellt. Der Fokus liegt jetzt darauf, den Vorsprung zu halten und auszubauen.`;

  return {
    business: {
      name: self?.name || domain,
      location: `Sanit\u00e4r \u00b7 Heizung \u00b7 Klima \u00b7 ${city || "PLZ " + plz}`
    },
    score, verdict, metrics, competitors, gapSummary, cta: "/kontakt"
  };
}
