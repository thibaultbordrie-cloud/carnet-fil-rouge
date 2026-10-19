// Comptage des mots, selon la langue. Aucune donnée ne sort de l'appareil.
import { LANGUES } from "./i18n/langues.js";

// Mot latin : lettres ou chiffres, avec apostrophes et traits d'union internes
// (« aujourd'hui », « l'arbre », « peut-être » comptent pour un mot, comme dans un traitement de texte).
const MOT = /[\p{L}\p{N}]+(?:['’\-‐][\p{L}\p{N}]+)*/gu;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

export function compter(texte, langue = "fr") {
  const t = texte || "";
  const strat = (LANGUES[langue] || LANGUES.fr).comptage;
  if (strat === "coreen") {
    // Le hangeul sépare les eojeol par des espaces, mais un eojeol n'est pas un mot :
    // on donne les caractères sans espaces (convention du 원고지) et les eojeol.
    const caracteres = [...t.replace(/\s+/g, "")].length;
    const eojeol = t.trim() ? t.trim().split(/\s+/).length : 0;
    return { valeur: caracteres, caracteres, eojeol };
  }
  if (strat === "caracteres-cjk") {
    const cjk = (t.match(CJK) || []).length;
    const latins = (t.replace(CJK, " ").match(MOT) || []).length;
    return { valeur: cjk + latins, caracteres: cjk, mots: latins };
  }
  const n = (t.match(MOT) || []).length;
  return { valeur: n, mots: n };
}

export const motsDe = (texte, langue) => compter(texte, langue).valeur;
// Une page de livre de poche ≈ 250 mots.
export const pagesDePoche = (mots) => Math.floor(mots / 250);
