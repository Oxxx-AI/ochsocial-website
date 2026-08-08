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
    // 1) Website-Scan + Region-Center (PLZ) parallel
    const [site, region] = await Promise.all([scrapeSite(domain), placesCenter(plz)]);
    const brand = domain.split(".")[0];   // z.B. "schmidtstallateur"

    // 2) Betrieb finden: auf die PLZ-Region begrenzt, ueber Rechtsname/Domain-Brand
    const self = await findBusiness(brand, site.legalName, region);
    const center = self?.geometry || region?.geometry;

    // 3) Konkurrenten-Suche + PageSpeed parallel (beides unabhaengig)
    const [rawComps, ps] = await Promise.all([
      findCompetitors(center, self?.place_id, site.services),
      pageSpeed(domain)
    ]);
    const rank = localRank(self, rawComps);          // {rank,total} oder null
    const top3 = (await enrichAndRank(rawComps, self)).slice(0, 3);

    // 4) Score + Ausgabe bauen
    const payload = buildPayload({ domain, plz, site, self, top3, ps, rank, city: region?.city });
    return { statusCode: 200, headers: cors, body: j(payload) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: j({ error: "analyse fehlgeschlagen", detail: String(e) }) };
  }
};

// ---------------------------------------------------------------------------
// Website + Impressum auslesen
// ---------------------------------------------------------------------------
async function scrapeSite(domain) {
  const out = { legalName: "", form: false, booking: false, hasFb: false, hasInsta: false, loadMs: null };
  const pages = [`https://${domain}/`, `https://${domain}/impressum`, `https://${domain}/kontakt`];
  const parts = await Promise.all(pages.map(async (p, idx) => {
    const t0 = Date.now();
    try { const r = await tfetch(p, 8000, { headers: { "User-Agent": "Mozilla/5.0 ochsocial-check" }, redirect: "follow" }); const txt = r.ok ? await r.text() : ""; return { txt, ms: idx === 0 ? Date.now() - t0 : null }; }
    catch { return { txt: "", ms: idx === 0 ? Date.now() - t0 : null }; }
  }));
  out.loadMs = parts[0].ms;                 // Antwortzeit der Startseite (Fallback fuer Ladezeit)
  const html = parts.map(p => p.txt).join("\n");
  const low = html.toLowerCase();
  const text = html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ");

  // Echter Firmen-Rechtsname aus dem Text (Zeile mit Rechtsform)
  out.legalName = (text.match(/([A-Z\u00c4\u00d6\u00dc][\w\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df.&\-]*(?:[ ][\w\u00c4\u00d6\u00dc\u00e4\u00f6\u00fc\u00df.&\-]+){0,4}[ ](?:GmbH(?:[ ]&[ ]Co\.?[ ]KG)?|GbR|UG|OHG|e\.[ ]?K\.|KG|Inh\.))/)?.[1] || "").replace(/\s+/g, " ").trim();

  // Anfrageformular vorhanden?
  out.form = /<form[\s\S]*?(name|mail|kontakt|anfrage|nachricht)/i.test(html) || /mailto:/i.test(low);

  // Online-Terminbuchung?
  out.booking = /(calendly|terminland|timify|shore\.com|cituro|etermin|terminvereinbarung online|termin buchen|online[- ]?termin)/i.test(low);

  // Social-Media-Praesenz (verlinkt der Betrieb Facebook / Instagram?)
  out.hasFb = /facebook\.com\/[A-Za-z0-9._%\-]/i.test(html);
  out.hasInsta = /instagram\.com\/[A-Za-z0-9._%\-]/i.test(html);

  // Branchen-Fokus des Betriebs erkennen (damit nur passende Konkurrenz verglichen wird)
  const svc = {
    heizung: /heizung|heiztechnik|heizungsbau|w(\u00e4|ae)rmepumpe|brennwert|heizk(\u00f6|oe)rper|fu(\u00df|ss)bodenheizung|gasheizung|(\u00f6|oe)lheizung/i.test(low),
    sanitaer: /sanit(\u00e4|ae)r|badsanierung|badezimmer|b(\u00e4|ae)der|installat|klempner|rohrreinigung|trinkwasser|d(u|ue)sche/i.test(low),
    klima: /klimaanlage|klimatechnik|klimager(\u00e4|ae)t|klima[- ]?service|k(\u00e4|ae)ltetechnik|k(\u00e4|ae)lteanlage|split[- ]?ger(\u00e4|ae)t|klimatisierung/i.test(low)
  };
  // Wenn nichts sicher erkennbar: als Generalist behandeln (alle Sparten), damit die Konkurrenzsuche nie leer laeuft
  if (!svc.heizung && !svc.sanitaer && !svc.klima) { svc.heizung = svc.sanitaer = svc.klima = true; }
  out.services = svc;

  return out;
}

// Lokale Platzierung: wo steht der Betrieb unter allen SHK-Betrieben der Region?
function localRank(self, comps) {
  if (!self) return null;
  const sc = c => (c.rating || 0) * Math.log10((c.reviews || 0) + 1);
  const all = [...comps.filter(c => (c.reviews || 0) >= 1), { ...self, __self: true }]
    .map(c => ({ ...c, _s: sc(c) }))
    .sort((a, b) => b._s - a._s);
  const idx = all.findIndex(c => c.__self);
  return idx >= 0 ? { rank: idx + 1, total: all.length } : null;
}

// ---------------------------------------------------------------------------
// Google Places (Legacy Web Service)
// ---------------------------------------------------------------------------
async function gfetch(u) {
  const r = await fetch(u);
  return r.ok ? r.json() : {};
}
// fetch mit hartem Timeout (verhindert, dass eine langsame Seite die Function killt)
async function tfetch(u, ms, opts = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetch(u, { ...opts, signal: ac.signal }); }
  finally { clearTimeout(t); }
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
// Reiner Klima-/Kaeltebetrieb (kein SHK-Generalist)? -> Name deutet nur auf Klima/Kaelte hin
function isKlimaOnly(name) {
  const n = (name || "").toLowerCase();
  const klima = /klima|k(\u00e4|ae)lte|clima|air ?condition/.test(n);
  const shk = /heiz|sanit|bad|installat|haustechnik|shk|klempner|rohr|gas|w(\u00e4|ae)rme/.test(n);
  return klima && !shk;
}
async function findCompetitors(center, selfId, services) {
  if (!GKEY || !center) return [];
  const svc = services || { heizung: true, sanitaer: true, klima: true };
  // Suchbegriffe passend zum Branchen-Fokus des Kunden (keine Klima-Suche, wenn Kunde kein Klima macht)
  const kws = [];
  if (svc.heizung) kws.push("Heizung", "Heizungsbau");
  if (svc.sanitaer) kws.push("Sanit\u00e4r", "Badsanierung");
  if (svc.heizung || svc.sanitaer) kws.push("Sanit\u00e4r Heizung");
  if (svc.klima) kws.push("Klimaanlage");
  if (!kws.length) kws.push("Sanit\u00e4r Heizung");
  const keywords = [...new Set(kws)];
  const seen = {};
  const out = [];
  for (const kw of keywords) {
    const d = await gfetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${center.lat},${center.lng}&radius=${RADIUS_M}&keyword=${encodeURIComponent(kw)}&language=de&key=${GKEY}`
    );
    for (const p of d.results || []) {
      if (p.place_id === selfId || seen[p.place_id]) continue;
      // Kunde macht kein Klima -> reine Klima-/Kaeltebetriebe raus (falsche Zielgruppe)
      if (!svc.klima && isKlimaOnly(p.name)) continue;
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
    const r = await tfetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}&strategy=mobile&category=performance&key=${GKEY}`, 11000);
    const d = r.ok ? await r.json() : {};
    const lcp = d.lighthouseResult?.audits?.["largest-contentful-paint"]?.numericValue;
    const perf = d.lighthouseResult?.categories?.performance?.score;
    return { lcpSec: lcp ? lcp / 1000 : null, perf: perf != null ? Math.round(perf * 100) : null };
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Score + JSON fuer das Frontend
// ---------------------------------------------------------------------------
function buildPayload({ domain, plz, site, self, top3, ps, rank, city }) {
  const avgRating = top3.length ? top3.reduce((s, c) => s + (c.rating || 0), 0) / top3.length : null;
  const avgReviews = top3.length ? Math.round(top3.reduce((s, c) => s + (c.reviews || 0), 0) / top3.length) : null;

  const metrics = [];
  let score = 50, gaps = [];

  // Lokale Suchplatzierung (staerkster Aufhaenger: erscheint der Betrieb ganz oben?)
  if (rank && rank.total >= 3) {
    const behind = rank.rank > 3;
    metrics.push({
      name: "Lokale Suchplatzierung",
      status: behind ? "gap" : "ok",
      badge: behind ? "R\u00fcckstand" : "Gut sichtbar",
      you: `Platz ${rank.rank} von ${rank.total}`,
      them: "Top 3 bekommen die Anfragen", themLabel: "Region"
    });
    if (behind) { gaps.push("Lokale Sichtbarkeit"); score -= 12; } else score += 8;
  }

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

  // Ladezeit (PageSpeed-LCP bevorzugt, sonst Antwortzeit der Startseite als Fallback)
  const lcp = (ps && ps.lcpSec != null) ? ps.lcpSec : (site.loadMs != null ? site.loadMs / 1000 : null);
  if (lcp != null) {
    const slow = lcp > 3.0;
    metrics.push({
      name: "Website-Ladezeit (Mobil)",
      status: slow ? "gap" : "ok", badge: slow ? "Zu langsam" : "Schnell",
      you: `${lcp.toFixed(1).replace(".", ",")} s`, them: "unter 2,5 s", themLabel: "Zielwert"
    });
    if (slow) { gaps.push("Ladezeit"); score -= 8; } else score += 5;
  }

  // Social-Media-Praesenz
  {
    const social = site.hasFb || site.hasInsta;
    const you = social ? [site.hasFb ? "Facebook" : null, site.hasInsta ? "Instagram" : null].filter(Boolean).join(" + ") : "Nicht verlinkt";
    metrics.push({
      name: "Social-Media-Pr\u00e4senz",
      status: social ? "ok" : "gap",
      badge: social ? "Vorhanden" : "Fehlt",
      you, them: "Facebook + Instagram", themLabel: "Top-Betriebe"
    });
    if (!social) { gaps.push("Social Media"); score -= 5; } else score += 3;
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

  // Sparten-Label aus dem erkannten Branchen-Fokus (Kunde soll sich abgeholt fuehlen)
  const sv = site.services || { heizung: true, sanitaer: true, klima: true };
  const sparten = [sv.sanitaer && "Sanit\u00e4r", sv.heizung && "Heizung", sv.klima && "Klima"].filter(Boolean);
  const spartenLabel = sparten.length ? sparten.join(" \u00b7 ") : "SHK";

  return {
    business: {
      name: self?.name || domain,
      location: `${spartenLabel} \u00b7 ${city || "PLZ " + plz}`,
      sparten: spartenLabel
    },
    score, verdict, metrics, competitors, gapSummary, cta: "/kontakt"
  };
}
