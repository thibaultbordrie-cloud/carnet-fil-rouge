// Applique les réglages avant le premier affichage (évite un flash de thème ou de police).
(function () {
  try {
    var p = JSON.parse(localStorage.getItem("carnet.prefs") || "{}"), d = document.documentElement.dataset;
    ["police", "lettres", "mots", "paragraphes", "theme", "fil", "animations", "densite"].forEach(function (k) { if (p[k]) d[k] = p[k]; });
    if (p.taille) document.documentElement.style.setProperty("--taille-page", p.taille + "px");
    if (p.interligne) document.documentElement.style.setProperty("--interligne", p.interligne);
    if (p.largeur) document.documentElement.style.setProperty("--largeur", p.largeur + "ch");
  } catch (e) {}
})();
