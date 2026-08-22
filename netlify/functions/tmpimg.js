// Ausgedient. War nur die einmalige Bild-Bridge fuer den Upload der
// Finanzberater-Screenshots (assets/cases/fin_erg_*.webp) am 22.08.2026.
// Die Bilder liegen jetzt als Binaerdateien im Repo. Datei kann geloescht werden.
exports.handler = async () => ({ statusCode: 410, body: "gone" });
