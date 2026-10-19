// Consignes écrites à la main (data/consignes.<langue>.json), mêmes positions dans chaque langue.
// Rotation déterministe, par jour d'écriture (pas par jour calendaire : on ne « rate » rien).
const FAM = { observer: "obs", observe: "obs", inventer: "inv", "make-up": "inv", "se-souvenir": "souv", remember: "souv",
  jouer: "jeu", play: "jeu", continuer: "inc", continue: "inc", "pour-soi": "soi", "for-me": "soi" };
const cache = {};
export async function charger(langue) {
  if (!cache[langue]) {
    const r = await fetch(`data/consignes.${langue}.json`);
    const l = await r.json();
    cache[langue] = l.map((c, i) => ({ ...c, position: i, famille: FAM[c.famille] || c.famille }));
  }
  return cache[langue];
}

// Ordre fixe : les familles sont réparties le plus régulièrement possible (tourniquet pondéré),
// donc jamais deux « Pour soi » ni deux incipits de suite, et « Observer d'abord » revient tous les 3 à 4 jours.
// Dans chaque famille, on garde l'ordre du fichier (déterministe : le mode prévisible peut annoncer demain).
const ordres = new WeakMap();
export function ordre(liste) {
  if (ordres.has(liste)) return ordres.get(liste);
  const reste = {}, poids = {}, courant = {};
  liste.forEach((c) => (reste[c.famille] ||= []).push(c.position));
  Object.keys(reste).forEach((f) => { poids[f] = reste[f].length; courant[f] = 0; });
  const total = liste.length, out = [];
  while (out.length < total) {
    let choix = null;
    for (const f of Object.keys(reste)) {
      if (!reste[f].length) continue;
      courant[f] += poids[f];
      if (!choix || courant[f] > courant[choix]) choix = f;
    }
    courant[choix] -= total;
    out.push(reste[choix].shift());
  }
  ordres.set(liste, out);
  return out;
}

// Consigne du rang n (n = nombre de jours d'écriture déjà faits), filtrée par familles choisies.
export function aRang(liste, n, familles) {
  const seq = ordre(liste).filter((p) => familles.includes(liste[p].famille));
  if (!seq.length) return liste[0];
  return liste[seq[((n % seq.length) + seq.length) % seq.length]];
}
// Alternatives : deux autres consignes de familles différentes, loin dans la séquence.
export function alternatives(liste, n, familles) {
  const seq = ordre(liste).filter((p) => familles.includes(liste[p].famille));
  if (seq.length < 2) return [];
  const base = liste[seq[n % seq.length]];
  const vus = new Set([base.famille]);
  const out = [];
  for (let d = 7; d < seq.length && out.length < 2; d += 5) {
    const c = liste[seq[(n + d) % seq.length]];
    if (!vus.has(c.famille) || familles.length <= 2) { out.push(c); vus.add(c.famille); }
  }
  return out;
}
