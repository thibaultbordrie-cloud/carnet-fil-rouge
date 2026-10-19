// « Où en étais-je ? » : portage léger en JavaScript du moteur v0 de Fil Rouge (canon/text.py, canon/heuristic.py).
// Sans IA, sans réseau. On garde : nettoyage, découpage en chapitres et en phrases, repérage des noms
// (titres, prénom + nom, contexte de lieu), première et dernière mention. On ne garde pas la détection
// d'incohérences (porte « Vérifier », plus tard).
import { motsDe } from "./compte.js";

const UP = "A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸŒÆ", LOW = "a-zàâäçéèêëîïôöùûüÿœæ";
const CAP = `[${UP}][${LOW}]+(?:-[${UP}][${LOW}]+)*`;
const NOM_RE = new RegExp(`(?<![${LOW}${UP}'’])(d['’])?(${CAP})`, "gu");
const TITRES = { M: "M.", Monsieur: "M.", Mme: "Mme", Madame: "Mme", Mlle: "Mlle", Mademoiselle: "Mlle", Mr: "Mr", Mrs: "Mrs", Ms: "Ms", Miss: "Miss",
  Sir: "Sir", Lady: "Lady", Lord: "Lord", Docteur: "", Dr: "", Maître: "", Capitaine: "", Captain: "", Commissaire: "", Inspecteur: "", Inspector: "", Professeur: "", Professor: "",
  Abbé: "", Comte: "", Comtesse: "", Père: "", Mère: "", Frère: "", Sœur: "", Aunt: "", Uncle: "", Tante: "", Oncle: "", Grand: "", Mamie: "", Papi: "" };
const TITRE_RE = new RegExp(`\\b(${Object.keys(TITRES).sort((a, b) => b.length - a.length).join("|")})\\.?\\s+(?:(?:de|du|des)\\s+|d['’])?$`, "u");
const STOP = new Set(`Le La Les L Un Une Des Du De D Au Aux Et Ou Mais Donc Or Ni Car Puis Alors Ensuite Enfin
Il Elle Ils Elles On Je J Tu Nous Vous Me Te Se Lui Leur Moi Toi Soi Eux Ce C Cet Cette Ces Ça Cela Ceci Celui Celle Ceux
Son Sa Ses Mon Ma Mes Ton Ta Tes Notre Nos Votre Vos Leurs Qui Que Qu Quoi Dont Où Quand Comment Pourquoi Quel Quelle Quels Quelles
Dans En Sur Sous Avec Sans Pour Par Chez Vers Depuis Pendant Avant Après Entre Contre Selon Malgré Devant Derrière Près Parmi
Oui Non Si S Ne N Pas Plus Jamais Rien Tout Toute Tous Toutes Chaque Aucun Aucune Quelque Quelques Personne Assez
Chapitre Partie Prologue Épilogue Texte Fin Livre Tome Page Lundi Mardi Mercredi Jeudi Vendredi Samedi Dimanche
Janvier Février Mars Avril Mai Juin Juillet Août Septembre Octobre Novembre Décembre
Ah Oh Eh Hé Hein Bah Bon Bien Voilà Voici Merci Pardon Allez Comme Ainsi Aussi Même Trop Très Tiens Dieu Hélas
Un Deux Trois Quatre Cinq Six Sept Huit Neuf Dix Premier Première Hier Demain Aujourd Soir Matin Midi Là Ici Peut
Était Est Sont Fut Avait Faut Lorsque Puisque Pourtant Cependant Seulement Déjà Encore Souvent Parfois Toujours Maintenant Il Y
The A An And But Or So Then Yet I You He She It We They Me Him Her Us Them My Your His Its Our Their Mine Yours
This That These Those What Which Who Whom Whose When Where Why How There Here In On At To From By With Without For Of Into
Over Under After Before Between Not No Yes If All Every Some Any Each One Two Three Four Five First Last Next Now Today Tomorrow Yesterday
Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December
Chapter Part Book Page Oh Ah Well Okay OK Please Thanks Sorry Just Only Also Maybe Perhaps Still Even Never Always Sometimes Once
Is Are Was Were Be Been Do Does Did Have Has Had Will Would Can Could Should Must Let Don Didn Isn Wasn Write Describe List Carry`.split(/\s+/));
const LIEUX = new Set(`Paris Lyon Marseille Bordeaux Lille Toulouse Nantes Nice Strasbourg Rennes Brest Montpellier Grenoble Rouen Caen Dijon Tours
Angers Reims Metz Nancy Limoges Poitiers Orléans Avignon Toulon Versailles Calais Bretagne Normandie Provence Alsace Lorraine Corse Bourgogne Auvergne Savoie
France Belgique Suisse Québec Montréal Bruxelles Genève Lausanne Italie Espagne Allemagne Angleterre Écosse Irlande Russie Pologne Grèce Turquie Égypte
Inde Chine Japon Corée Séoul Busan Tokyo Kyoto Osaka Londres Rome Madrid Berlin Venise Lisbonne Vienne Moscou Amérique Afrique Europe Asie Algérie Maroc Tunisie Sénégal
Seine Loire Rhône Garonne Méditerranée Atlantique Pacifique London England Scotland Ireland Wales France Germany Spain Italy Japan Korea Seoul China India America
New-York York Boston Chicago Manchester Liverpool Edinburgh Dublin Osaka`.split(/\s+/));
const PREP_LIEU = /(?:\bà|\ben|\bvers|\bdepuis|\bde la|\bjusqu'à|\bdans|\bsur|\bin|\bat|\bto|\bfrom|\btowards|\bnear)\s+$/iu;

const CHAPITRE_RE = /^[ \t]*(?:#{1,3}[ \t]*)?((?:chapitre|chapter|chap\.|prologue|épilogue|epilogue)\b[^\n]{0,120}|[IVXLC]{1,7}\.?(?:[ \t]+[—–-]?[ \t]*[A-ZÀ-Ý\d][^\n]{0,80})?|\d{1,3}\.?)[ \t]*$/gimu;

export function normaliser(t) {
  t = (t || "").replace(/\r\n?/g, "\n").replace(/\u2019/g, "'").replace(/[\u00a0\u202f]/g, " ");
  const d = t.search(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG[^\n]*\n/i);
  if (d >= 0) t = t.slice(t.indexOf("\n", d) + 1);
  const f = t.search(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG/i);
  if (f >= 0) t = t.slice(0, f);
  return t;
}

export function decouper(texte) {
  const t = normaliser(texte);
  const tetes = [...t.matchAll(CHAPITRE_RE)].filter((m) => m.index === 0 || t.slice(Math.max(0, m.index - 2), m.index).includes("\n"));
  if (!tetes.length) return [{ titre: null, texte: t.trim() }];
  const out = [];
  const avant = t.slice(0, tetes[0].index).trim();
  if (motsDe(avant) > 150) out.push({ titre: null, texte: avant });
  tetes.forEach((m, i) => {
    const fin = i + 1 < tetes.length ? tetes[i + 1].index : t.length;
    const corps = t.slice(m.index + m[0].length, fin).trim();
    if (motsDe(corps) >= 20) out.push({ titre: m[1].trim().slice(0, 80), texte: corps });
  });
  return out.length ? out : [{ titre: null, texte: t.trim() }];
}

const ABBR = /\b(Mrs|Mr|Ms|Mme|Mlle|Dr|St|M|[A-Z])\.(?=\s+[A-ZÀ-Ý])/gu;
export function phrases(t) {
  const out = [];
  for (const para of t.replace(ABBR, "$1\u2024").split(/\n+/)) {
    for (const m of para.matchAll(/[^.!?…\n]+(?:[.!?…]+[»"”]?|$)/gu)) {
      const s = m[0].trim();
      if (s.length >= 2) out.push(s.replace(/\u2024/g, "."));
    }
  }
  return out;
}

function jetons(s) {
  const out = [];
  for (const m of s.matchAll(NOM_RE)) {
    const tok = m[2];
    if (STOP.has(tok) || tok in TITRES) continue;
    const tm = s.slice(0, m.index).match(TITRE_RE);
    out.push({ debut: m.index, fin: m.index + m[0].length, tok, titre: tm ? (TITRES[tm[1]] ?? "") : null });
  }
  return out;
}

const court = (s, n = 70) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

// parties : [{ titre, texte, ref }] dans l'ordre. Renvoie une carte factuelle.
export function analyser(parties, langue = "fr") {
  const occ = new Map(), paires = new Map();
  let mots = 0, derniere = null;
  parties.forEach((p, ip) => {
    mots += motsDe(p.texte, langue);
    for (const brut of phrases(normaliser(p.texte))) {
      const s = brut.replace(/^[—–\-«»"“” ]+/u, "");
      derniere = { phrase: brut, partie: ip };
      const tj = jetons(s);
      tj.forEach((j, i) => {
        const o = occ.get(j.tok) || { n: 0, milieu: 0, lieu: 0, titre: 0, titres: {}, premiere: ip, derniere: ip };
        o.n++; o.derniere = ip;
        const avant = s.slice(0, j.debut);
        if (avant.trim()) o.milieu++;
        if (PREP_LIEU.test(avant) && j.titre === null) o.lieu++;
        if (j.titre !== null) { o.titre++; if (j.titre) o.titres[j.titre] = (o.titres[j.titre] || 0) + 1; }
        occ.set(j.tok, o);
        const k = tj[i + 1];
        if (k && /^\s+$/.test(s.slice(j.fin, k.debut))) {
          const cle = j.tok + "\u0000" + k.tok;
          paires.set(cle, (paires.get(cle) || 0) + 1);
        }
      });
    }
  });
  // Un mot en tête de phrase compte comme nom s'il n'apparaît jamais en minuscules ailleurs.
  const minuscules = new Set();
  parties.forEach((p) => { for (const m of p.texte.matchAll(/\p{Ll}[\p{L}-]*/gu)) minuscules.add(m[0]); });
  const personnes = new Map(), lieux = new Map();
  for (const [tok, o] of occ) {
    const estLieu = LIEUX.has(tok) || (o.lieu >= Math.max(1, o.milieu * 0.6) && !o.titre);
    if (estLieu && !o.titre) lieux.set(tok, o);
    else if (o.titre || (o.n >= 2 && (o.milieu > 0 || !minuscules.has(tok.toLowerCase())))) personnes.set(tok, o);
  }
  // Fusion prénom + nom : un nom toujours précédé du même prénom rejoint ce prénom.
  const affichage = new Map([...personnes.keys()].map((k) => [k, k]));
  const fusionne = new Set();
  for (const [cle, n] of [...paires].sort((a, b) => b[1] - a[1])) {
    const [a, b] = cle.split("\u0000");
    if (!personnes.has(a) || fusionne.has(a) || fusionne.has(b) || lieux.has(b)) continue;
    const pb = personnes.get(b) || occ.get(b);
    if (!pb || pb.titre) continue; // « Mme Weil » existe par elle-même : on ne la rattache pas à un prénom
    const autres = [...paires].filter(([c]) => c.endsWith("\u0000" + b)).reduce((s, [, v]) => s + v, 0);
    if (n >= 0.8 * autres && n >= 0.5 * pb.n) {
      const pa = personnes.get(a);
      pa.n = Math.max(pa.n, pb.n + pa.n - n);
      pa.premiere = Math.min(pa.premiere, pb.premiere); pa.derniere = Math.max(pa.derniere, pb.derniere);
      affichage.set(a, `${a} ${b}`);
      personnes.delete(b); fusionne.add(a); fusionne.add(b);
    }
  }
  for (const [tok, o] of personnes) {
    const t = Object.entries(o.titres).sort((x, y) => y[1] - x[1])[0];
    if (t && !affichage.get(tok).includes(" ")) affichage.set(tok, `${t[0]} ${tok}`);
  }
  const titre = (i) => parties[i]?.titre || "";
  const noms = [...personnes].map(([tok, o]) => ({ nom: affichage.get(tok), n: o.n, premiere: o.premiere, derniere: o.derniere,
    premiereTitre: titre(o.premiere), derniereTitre: titre(o.derniere) })).sort((a, b) => b.n - a.n).slice(0, 12);
  const dernierIndex = parties.length - 1;
  const pasRevus = noms.filter((x) => x.n >= 2 && dernierIndex - x.derniere >= 3).slice(0, 5);
  return {
    mots, parties: parties.length, noms,
    lieux: [...lieux].sort((a, b) => b[1].n - a[1].n).slice(0, 8).map(([l, o]) => ({ nom: l, n: o.n })),
    pasRevus, derniere: derniere ? { phrase: court(derniere.phrase, 240), partie: derniere.partie, titre: titre(derniere.partie) } : null,
  };
}
