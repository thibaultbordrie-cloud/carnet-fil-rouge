// Réglages « Mon confort ». Stockés en localStorage (appliqués avant l'affichage, sans flash)
// et inclus dans la copie de sécurité.
export const DEFAUTS = {
  langue: "auto", langueConsignes: "meme", adresse: "tu",
  police: "quattro", taille: 19, lettres: "normal", mots: "normal", interligne: "1.6", largeur: "65", paragraphes: "espace",
  theme: "systeme", fil: "rouge",
  animations: "systeme", son: "aucun",
  densite: "aeree", nombres: "cumul",
  brouillard: "off", correcteur: "off", minuteur: "0", minuteurAffichage: "barre", compteur: "cache",
  previsible: "off",
  familles: ["obs", "inv", "souv", "jeu", "inc", "soi"],
};
const CLE = "carnet.prefs";
let courant = null;
const ecouteurs = new Set();

export function lire() {
  if (courant) return courant;
  let p = {};
  try { p = JSON.parse(localStorage.getItem(CLE) || "{}"); } catch { p = {}; }
  courant = { ...DEFAUTS, ...p };
  return courant;
}
export function ecrire(maj) {
  courant = { ...lire(), ...maj };
  try { localStorage.setItem(CLE, JSON.stringify(courant)); } catch {}
  appliquer();
  ecouteurs.forEach((f) => f(courant, maj));
}
export function remplacer(tout) { courant = { ...DEFAUTS, ...tout }; ecrire({}); }
export function reinitialiser(cles) {
  const m = {};
  (cles || Object.keys(DEFAUTS)).forEach((k) => (m[k] = Array.isArray(DEFAUTS[k]) ? [...DEFAUTS[k]] : DEFAUTS[k]));
  ecrire(m);
}
export const surChangement = (f) => ecouteurs.add(f);

export function langueInterface() {
  const p = lire();
  if (p.langue !== "auto") return p.langue;
  const n = (navigator.language || "fr").slice(0, 2);
  return n === "en" ? "en" : "fr";
}
export function langueConsignes() {
  const p = lire();
  return p.langueConsignes === "meme" ? langueInterface() : p.langueConsignes;
}

// Applique les réglages sur <html> : attributs data-* lus par la feuille de style.
export function appliquer() {
  const p = lire(), h = document.documentElement;
  const d = h.dataset;
  d.police = p.police; d.lettres = p.lettres; d.mots = p.mots; d.paragraphes = p.paragraphes;
  d.theme = p.theme; d.fil = p.fil; d.animations = p.animations; d.densite = p.densite;
  h.style.setProperty("--taille-page", p.taille + "px");
  h.style.setProperty("--interligne", p.interligne);
  h.style.setProperty("--largeur", p.largeur + "ch");
  h.lang = langueInterface();
}
