// Outils d'affichage communs.
import { t } from "./i18n.js";

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const etat = { flash: null, installer: null, majPrete: null, deverrouille: false, premiereDispo: null };

const ICONES = {
  aujourdhui: '<path d="M4 20h16M6 20V9l6-5 6 5v11"/><path d="M10 20v-5h4v5"/>',
  carnet: '<path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6z"/><path d="M9 3v18"/>',
  confort: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
};
export const icone = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONES[n]}</svg>`;

export function annoncer(texte) {
  const a = $("#annonce");
  a.textContent = "";
  setTimeout(() => (a.textContent = texte), 50);
}
export const flash = (texte) => (etat.flash = texte);

// Affiche un écran : titre de document, contenu, focus sur le titre (lecteurs d'écran).
export function ecran(titre, html, { nav = true, focus = true } = {}) {
  document.title = `${titre} · ${t("app.nom")}`;
  const main = $("#contenu");
  const msg = etat.flash ? `<p class="message" role="status">${etat.flash}</p>` : "";
  etat.flash = null;
  main.onclick = null; main.onchange = null;
  main.innerHTML = msg + html;
  $("#barre").hidden = !nav;
  $("#tete").hidden = !nav;
  if (focus && etat.dejaAffiche) {
    const h = main.querySelector("h1");
    if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); }
  }
  etat.dejaAffiche = true;
  window.scrollTo(0, 0);
  return main;
}

export function route() {
  const h = location.hash.replace(/^#\/?/, "");
  const [chemin, q] = h.split("?");
  const [nom, arg] = chemin.split("/");
  return { nom: nom || "", arg: arg ? decodeURIComponent(arg) : null, params: new URLSearchParams(q || "") };
}
export const aller = (h) => { if (location.hash === h) window.dispatchEvent(new HashChangeEvent("hashchange")); else location.hash = h; };

export const estInstalle = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const estIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const joursEntre = (a, b) => Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / 864e5);
