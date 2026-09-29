// Bild-Bridge abgeraeumt. Die Bilder der Mittelstand-Seite liegen seit dem
// 29.09.2026 im Repo unter assets/mittelstand/ und assets/testimonials/.
exports.handler = async function () {
  return { statusCode: 410, headers: { "Content-Type": "text/plain" }, body: "weg" };
};
