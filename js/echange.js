// Export et import : JSON (copie complète), Markdown et texte (lecture). Tout se passe sur l'appareil.
import { tous, mettre, pagesChrono, nouvelId, setMeta, meta } from "./db.js";
import { lire, remplacer } from "./prefs.js";
import { motsDe } from "./compte.js";
import { VERSION } from "./version.js";

export const FORMAT = "carnet-fil-rouge";

export async function versJSON() {
  const pages = await pagesChrono();
  pages.forEach((p) => delete p.numero);
  return JSON.stringify({ format: FORMAT, version: 1, application: VERSION, exporte: new Date().toISOString(),
    reglages: lire(), pages, peurs: await tous("peurs"), reperes: { jours: await meta("joursConsignes", {}) } }, null, 1);
}

// Markdown : un titre « ## AAAA-MM-JJ » par page ; la consigne en citation ; le texte tel quel.
export async function versMarkdown(avecPrives, titre) {
  const pages = (await pagesChrono()).filter((p) => avecPrives || !p.prive);
  let s = `# ${titre}\n`;
  for (const p of pages) {
    s += `\n## ${p.date}${p.etiquette ? ` (${p.etiquette})` : ""}\n\n`;
    if (p.consigne) s += `> ${p.consigne.replace(/\n/g, " ")}\n\n`;
    s += `${p.texte}\n`;
  }
  return s;
}
export async function versTexte(avecPrives, titre) {
  const pages = (await pagesChrono()).filter((p) => avecPrives || !p.prive);
  return `${titre}\n\n` + pages.map((p) => `${p.date}${p.consigne ? "\n" + p.consigne : ""}\n\n${p.texte}`).join("\n\n* * *\n\n") + "\n";
}

export function telecharger(nom, contenu, type) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: nom });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// Lecture d'un Markdown du carnet (ou de la première page de Thibault) : le texte de chaque page est gardé
// exactement, à l'exception des lignes vides qui l'entourent.
export function lireMarkdown(md) {
  const t = md.replace(/\r\n?/g, "\n");
  const tetes = [...t.matchAll(/^##[ \t]+(\d{4}-\d{2}-\d{2})(?:[ \t]+\(([^)\n]*)\))?[^\n]*$/gm)];
  return tetes.map((m, i) => {
    let corps = t.slice(m.index + m[0].length + 1, i + 1 < tetes.length ? tetes[i + 1].index : t.length);
    let consigne = null;
    const c = corps.match(/^\n*> ([^\n]*)\n/);
    if (c) { consigne = c[1]; corps = corps.slice(c[0].length); }
    corps = corps.replace(/^\n+/, "").replace(/\n+$/, "");
    return { date: m[1], etiquette: m[2] || null, consigne, texte: corps };
  }).filter((p) => p.texte.length);
}

const empreinte = (p) => `${p.date}\u0000${p.texte}`;

// Ajoute des pages sans doublon (même date et même texte). Renvoie { ajoutees, ignorees }.
export async function ajouterPages(liste, source, langue) {
  const deja = new Set((await tous("pages")).map(empreinte));
  let ajoutees = 0, ignorees = 0, t0 = Date.now();
  for (const p of liste) {
    if (deja.has(empreinte(p))) { ignorees++; continue; }
    const page = { id: p.id || nouvelId(), date: p.date, cree: p.cree || t0++, modifie: p.modifie || Date.now(),
      consigne: p.consigne ?? null, consigneId: p.consigneId ?? null, etiquette: p.etiquette ?? null,
      texte: p.texte, mots: motsDe(p.texte, p.langue || langue), langue: p.langue || langue, prive: !!p.prive, source: p.source || source };
    await mettre("pages", page); deja.add(empreinte(page)); ajoutees++;
  }
  return { ajoutees, ignorees };
}

export async function importerFichier(nom, contenu, langue) {
  if (/\.json$/i.test(nom)) {
    const d = JSON.parse(contenu);
    if (d.format !== FORMAT || !Array.isArray(d.pages)) throw new Error("format");
    const r = await ajouterPages(d.pages, "import", langue);
    const ids = new Set((await tous("peurs")).map((x) => x.id));
    for (const f of d.peurs || []) if (!ids.has(f.id)) await mettre("peurs", f);
    if (d.reglages && !(await meta("reglagesImportes"))) { remplacer(d.reglages); await setMeta("reglagesImportes", true); }
    return r;
  }
  let pages = lireMarkdown(contenu);
  if (!pages.length) {
    // Texte sans titres datés : chaque bloc séparé par « * * * » devient une page datée d'aujourd'hui.
    const z = (n) => String(n).padStart(2, "0"), d = new Date();
    const date = `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
    pages = contenu.replace(/\r\n?/g, "\n").split(/\n\s*\* \* \*\s*\n/).map((x) => x.replace(/^\n+|\n+$/g, "")).filter(Boolean)
      .map((texte) => ({ date, texte }));
  }
  return ajouterPages(pages, "import", langue);
}
