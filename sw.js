// Service worker du Carnet Fil Rouge (généré par outils/construire.py — ne pas modifier à la main).
// Hors ligne : tout est mis en cache à l'installation. Une nouvelle version attend que la personne
// l'applique (« Appliquer maintenant ») : rien ne change sans prévenir (R15).
const CACHE = "carnet-0ae292af4160";
const FICHIERS = [
 "./",
 "css/carnet.css",
 "data/changements.json",
 "data/consignes.en.json",
 "data/consignes.fr.json",
 "fonts/Literata-400-normal.woff2",
 "fonts/OpenDyslexic-Regular.woff2",
 "fonts/atkinson-hyperlegible-next-latin-400-normal.woff2",
 "fonts/atkinson-hyperlegible-next-latin-700-normal.woff2",
 "fonts/bricolage-grotesque-latin-700-normal.woff2",
 "fonts/iAWriterQuattroS-Bold.woff2",
 "fonts/iAWriterQuattroS-Regular.woff2",
 "icons/icone-180.png",
 "icons/icone-192.png",
 "icons/icone-512.png",
 "icons/icone-masquable-512.png",
 "icons/icone.svg",
 "index.html",
 "js/aide/index.js",
 "js/app.js",
 "js/compte.js",
 "js/confort.js",
 "js/consignes.js",
 "js/db.js",
 "js/demarrage.js",
 "js/echange.js",
 "js/i18n.js",
 "js/i18n/en.js",
 "js/i18n/fr.js",
 "js/i18n/langues.js",
 "js/porte.js",
 "js/prefs.js",
 "js/seance.js",
 "js/ui.js",
 "js/version.js",
 "manifest.webmanifest"
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)));
});
self.addEventListener("activate", (ev) => {
  ev.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("carnet-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("message", (ev) => { if (ev.data === "appliquer") self.skipWaiting(); });
self.addEventListener("fetch", (ev) => {
  const r = ev.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  const url = new URL(r.url);
  // Notes de version et première page : toujours depuis le réseau si possible.
  if (url.search.includes("maj=") || url.pathname.endsWith("premiere-page-thibault.md")) {
    ev.respondWith(fetch(r).catch(() => caches.match(r, { ignoreSearch: true }).then((x) => x || new Response("", { status: 404 }))));
    return;
  }
  if (r.mode === "navigate") {
    ev.respondWith(caches.match("index.html").then((x) => x || fetch(r)));
    return;
  }
  ev.respondWith(caches.match(r, { ignoreSearch: true }).then((x) => x || fetch(r)));
});
