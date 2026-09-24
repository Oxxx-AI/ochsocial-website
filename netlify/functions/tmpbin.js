// Bild-Bridge abgeraeumt. Die Binaerdateien des Quizfunnels liegen seit dem
// 24.09.2026 im Repo unter sofortleads/kapitalanleger-leads/.
exports.handler = async function () {
  return { statusCode: 410, headers: { "Content-Type": "text/plain" }, body: "weg" };
};
