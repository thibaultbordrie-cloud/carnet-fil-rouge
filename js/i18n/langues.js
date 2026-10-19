// Registre des langues. Ajouter une langue = une entrée ici + un fichier de chaînes
// (js/i18n/<code>.js) + un fichier de consignes écrit à la main (data/consignes.<code>.json).
// « comptage » choisit la stratégie de comptage (voir js/compte.js).
export const LANGUES = {
  fr: { nom: "Français", dir: "ltr", comptage: "mots-latins", unite: "mots", interface: true, consignes: true, adresse: ["tu", "vous"] },
  en: { nom: "English", dir: "ltr", comptage: "mots-latins", unite: "words", interface: true, consignes: true, adresse: null },
  // Candidats suivants (pas encore d'interface ni de consignes) : la stratégie de comptage est déjà prête.
  ko: { nom: "한국어", dir: "ltr", comptage: "coreen", unite: "자", interface: false, consignes: false, adresse: null, coupure: "keep-all" },
  ja: { nom: "日本語", dir: "ltr", comptage: "caracteres-cjk", unite: "字", interface: false, consignes: false, adresse: null },
  zh: { nom: "中文", dir: "ltr", comptage: "caracteres-cjk", unite: "字", interface: false, consignes: false, adresse: null },
};
export const LANGUES_INTERFACE = Object.keys(LANGUES).filter((k) => LANGUES[k].interface);
export const LANGUES_CONSIGNES = Object.keys(LANGUES).filter((k) => LANGUES[k].consignes);
