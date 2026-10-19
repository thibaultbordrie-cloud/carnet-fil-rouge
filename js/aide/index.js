// « Aide facultative » : point d'extension pour plus tard. NON IMPLÉMENTÉ dans la v0, désactivé, jamais importé
// par l'application. Ce fichier fixe seulement la frontière du module et ses règles (cahier des charges §7 bis).
//
// Règles non négociables :
//  1. L'aide n'écrit jamais de prose à la place de la personne : pas de suite de texte, pas de reformulation,
//     pas de « version améliorée ». Elle renvoie uniquement des questions, des résumés factuels ou des signalements.
//  2. Désactivée par défaut ; activée seulement par un geste explicite dans « Mon confort », réversible à tout moment.
//  3. Rien n'est envoyé sans consentement page par page ; les pages « Pour moi seul » ne sont jamais envoyées.
//  4. Chaque réponse est marquée « Aide facultative » et peut être ignorée sans conséquence.
//  5. Aucune émotion n'est demandée ni interprétée (R23).

/** Capacités autorisées. Toute autre demande est refusée. */
export const CAPACITES = Object.freeze({
  QUESTIONS: "questions",       // quand on bloque : 1 à 3 questions ouvertes, concrètes (lieu, objet, geste)
  RESUME: "resume",             // « Le Retour » : où en était l'histoire, en faits (qui, où, dernière scène)
  INCOHERENCES: "incoherences", // signaler deux passages qui se contredisent, en citant les deux
});

/** Fournisseurs envisagés (aucun n'est livré). */
export const FOURNISSEURS = Object.freeze({
  CLE_API: "cle-api", // clé fournie par la personne, stockée localement, appel direct depuis le navigateur
  LOCAL: "local",     // modèle exécuté dans le navigateur (par exemple WebLLM / WebGPU), rien ne sort de l'appareil
});

/**
 * Contrat d'un fournisseur :
 *   { id, nom, disponible(): Promise<boolean>,
 *     demander({ capacite, pages: [{ titre, texte }], langue }): Promise<Reponse> }
 * Reponse :
 *   { capacite, questions?: string[], resume?: { faits: string[] }, incoherences?: [{ a: Citation, b: Citation, note }] }
 * Citation : { page, extrait }
 * Une réponse contenant du texte « à insérer » est rejetée par verifierReponse().
 */
export function verifierReponse(r) {
  if (!r || !Object.values(CAPACITES).includes(r.capacite)) return false;
  if ("texte" in r || "suite" in r || "reecriture" in r) return false; // jamais de prose à insérer
  if (r.questions && (!Array.isArray(r.questions) || r.questions.length > 3)) return false;
  return true;
}

export const ACTIVE_PAR_DEFAUT = false;
export function disponible() { return false; } // v0 : aucune aide n'est branchée
