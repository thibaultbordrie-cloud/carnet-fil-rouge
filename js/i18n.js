import fr from "./i18n/fr.js";
import en from "./i18n/en.js";
import { LANGUES } from "./i18n/langues.js";
import { lire, langueInterface } from "./prefs.js";

const DICOS = { fr, en };
export function t(cle, vars = {}) {
  const l = langueInterface();
  let v = (DICOS[l] || fr)[cle] ?? fr[cle] ?? cle;
  if (typeof v === "object") v = v[lire().adresse] ?? v.tu;
  return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}
export const unite = (l = langueInterface()) => (LANGUES[l] || LANGUES.fr).unite;
export const nombre = (n) => new Intl.NumberFormat(langueInterface()).format(n);
export function dateLongue(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(langueInterface(), { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(a, m - 1, j));
}
export function dateCourte(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(langueInterface(), { day: "numeric", month: "long", year: "numeric" }).format(new Date(a, m - 1, j));
}
// Échappement HTML pour tout texte inséré dans un gabarit.
export const e = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
