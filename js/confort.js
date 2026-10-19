// Panneau « Mon confort » : chaque réglage s'applique tout de suite, avec un aperçu (cahier des charges §6).
import { t, e } from "./i18n.js";
import { lire, ecrire, reinitialiser, DEFAUTS, langueInterface } from "./prefs.js";
import { LANGUES, LANGUES_INTERFACE, LANGUES_CONSIGNES } from "./i18n/langues.js";
import { ecran, annoncer, $, $$ } from "./ui.js";
import { signalFin } from "./seance.js";

const FAMILLES = ["obs", "inv", "souv", "jeu", "inc", "soi"];

function radios(cle, legende, options, { aide = "", ligne = false } = {}) {
  const v = String(lire()[cle]);
  const id = `f-${cle}`;
  return `<fieldset id="${id}"><legend>${e(t(legende))}</legend>${aide ? `<p class="aide">${e(t(aide))}</p>` : ""}
    <div class="choix ${ligne ? "ligne" : ""}">${options.map(([val, lib]) =>
      `<label><input type="radio" name="${cle}" value="${e(val)}" ${String(val) === v ? "checked" : ""}> <span>${lib.startsWith("@") ? e(lib.slice(1)) : e(t(lib))}</span></label>`).join("")}</div></fieldset>`;
}
const groupe = (titre, cles, html) => `<section class="groupe" aria-labelledby="g-${titre}"><h2 id="g-${titre}">${e(t("conf.g." + titre))}</h2>${html}
  <p class="reinit"><button type="button" class="btn discret" data-reinit="${cles.join(",")}">${e(t("conf.defaut"))}<span class="sr"> : ${e(t("conf.g." + titre))}</span></button></p></section>`;

export function ecranConfort(params) {
  const p = lire();
  const retour = params.get("retour");
  const fr = langueInterface() === "fr";
  const html = `
  <h1>${e(t("conf.titre"))}</h1>
  <p class="sous">${e(t("conf.intro"))}</p>
  ${retour !== null ? `<p><a class="btn" href="${retour ? `#/ecrire?page=${encodeURIComponent(retour)}` : "#/aujourdhui"}">${e(t("commun.retour"))}</a></p>` : ""}
  <div class="apercu" aria-label="${e(t("conf.apercu"))}" role="region"><div class="fiche"><p>${e(t("conf.apercu.texte"))}</p></div></div>
  <section aria-labelledby="g-raccourcis"><h2 id="g-raccourcis">${e(t("conf.raccourcis"))}</h2>
    <div class="actions pile">
      <button type="button" class="btn" data-raccourci="lettres">${e(t("conf.r.lettres"))}</button>
      <button type="button" class="btn" data-raccourci="mouvement">${e(t("conf.r.mouvement"))}</button>
      <button type="button" class="btn" data-raccourci="contraste">${e(t("conf.r.contraste"))}</button>
    </div></section>
  ${groupe("texte", ["police", "taille", "lettres", "mots", "interligne", "largeur", "paragraphes"],
    radios("police", "conf.police", [["quattro", "conf.police.quattro"], ["atkinson", "conf.police.atkinson"], ["literata", "conf.police.literata"], ["opendyslexic", "conf.police.opendyslexic"], ["systeme", "conf.police.systeme"]], { aide: "conf.police.aide" }) +
    `<fieldset><legend id="l-taille">${e(t("conf.taille"))}</legend><div class="curseur"><input type="range" id="taille" min="16" max="28" step="1" value="${p.taille}" aria-labelledby="l-taille" aria-valuetext="${p.taille} px"><output for="taille" id="taille-v">${p.taille} px</output></div></fieldset>` +
    radios("lettres", "conf.lettres", [["normal", "conf.v.normal"], ["large", "conf.v.large"], ["tres", "conf.v.treslarge"]], { ligne: true }) +
    radios("mots", "conf.mots", [["normal", "conf.v.normal"], ["large", "conf.v.large"]], { ligne: true }) +
    radios("interligne", "conf.interligne", [["1.5", "@1,5"], ["1.6", "@1,6"], ["1.8", "@1,8"], ["2", "@2"]].map(([v, l]) => [v, fr ? l : "@" + l.slice(1).replace(",", ".")]), { ligne: true }) +
    radios("largeur", "conf.largeur", [["55", "conf.v.etroite"], ["65", "conf.v.moyenne"], ["75", "conf.v.large"]], { ligne: true }) +
    radios("paragraphes", "conf.paragraphes", [["espace", "conf.v.espace"], ["alinea", "conf.v.alinea"]]))}
  ${groupe("couleurs", ["theme", "fil"],
    radios("theme", "conf.theme", [["systeme", "conf.theme.systeme"], ["etabli", "conf.theme.etabli"], ["sepia", "conf.theme.sepia"], ["nuit", "conf.theme.nuit"], ["contraste", "conf.theme.contraste"]]) +
    radios("fil", "conf.fil", [["rouge", "conf.fil.rouge"], ["bleu", "conf.fil.bleu"], ["graphite", "conf.fil.graphite"]], { ligne: true }))}
  ${groupe("mouvement", ["animations", "son"],
    radios("animations", "conf.animations", [["systeme", "conf.anim.systeme"], ["reduites", "conf.anim.reduites"], ["aucune", "conf.anim.aucune"]]) +
    radios("son", "conf.son", [["aucun", "conf.son.aucun"], ["doux", "conf.son.doux"], ["vibration", "conf.son.vibration"]]) +
    `<p><button type="button" class="btn" id="essayer-son">${e(t("conf.son.essayer"))}</button></p>`)}
  ${groupe("affichage", ["densite", "nombres"],
    radios("densite", "conf.densite", [["aeree", "conf.densite.aeree"], ["compacte", "conf.densite.compacte"]], { ligne: true }) +
    radios("nombres", "conf.nombres", [["cumul", "conf.nombres.cumul"], ["aucun", "conf.nombres.aucun"]]))}
  ${groupe("ecrire", ["brouillard", "correcteur", "minuteur", "minuteurAffichage", "compteur", "previsible"],
    radios("brouillard", "conf.brouillard", [["off", "conf.brouillard.off"], ["doux", "conf.brouillard.doux"], ["complet", "conf.brouillard.complet"]], { aide: "conf.brouillard.aide" }) +
    radios("correcteur", "conf.correcteur", [["off", "conf.correcteur.off"], ["on", "conf.correcteur.on"]]) +
    radios("minuteur", "conf.minuteur", [["0", "seance.minuteur.aucun"], ["5", "@5 min"], ["10", "@10 min"], ["15", "@15 min"]], { ligne: true }) +
    radios("minuteurAffichage", "conf.minuteur.aff", [["barre", "conf.minuteur.barre"], ["chiffres", "conf.minuteur.chiffres"], ["cache", "conf.minuteur.cache"]], { ligne: true }) +
    radios("compteur", "conf.compteur", [["cache", "conf.compteur.cache"], ["visible", "conf.compteur.visible"]], { ligne: true }) +
    radios("previsible", "conf.previsible", [["off", "conf.off"], ["on", "conf.on"]], { aide: "conf.previsible.aide", ligne: true }))}
  ${groupe("consignes", ["familles"],
    `<fieldset id="f-familles"><legend>${e(t("conf.familles"))}</legend><p class="aide">${e(t("conf.familles.aide"))}</p><div class="choix">${FAMILLES.map((f) =>
      `<label><input type="checkbox" name="familles" value="${f}" ${p.familles.includes(f) ? "checked" : ""}> <span>${e(t("fam." + f))}</span></label>`).join("")}</div></fieldset>
     <p><button type="button" class="btn" id="seul-obs">${e(t("conf.familles.obs"))}</button></p>`)}
  ${groupe("langue", ["langue", "langueConsignes", "adresse"],
    radios("langue", "conf.langue", LANGUES_INTERFACE.map((l) => [l, "@" + LANGUES[l].nom]), { ligne: true }) +
    radios("langueConsignes", "conf.langue.consignes", [["meme", "conf.langue.consignes.meme"], ...LANGUES_CONSIGNES.map((l) => [l, "@" + LANGUES[l].nom])]) +
    (fr ? radios("adresse", "conf.adresse", [["tu", "conf.adresse.tu"], ["vous", "conf.adresse.vous"]], { ligne: true }) : ""))}
  <p><button type="button" class="btn" id="tout-defaut">${e(t("conf.tout.defaut"))}</button></p>`;
  const main = ecran(t("conf.titre"), html);

  // « langue » vaut « auto » par défaut : on coche la langue réellement utilisée.
  if (p.langue === "auto") { const r = main.querySelector(`input[name=langue][value=${langueInterface()}]`); if (r) r.checked = true; }

  const reafficher = (focusSel) => { ecranConfort(params); document.dispatchEvent(new Event("carnet:langue")); const f = focusSel && $(focusSel); if (f) f.focus(); };
  main.onchange = (ev) => {
    const i = ev.target;
    if (i.name === "familles") {
      const v = $$("input[name=familles]:checked", main).map((x) => x.value);
      if (!v.length) { i.checked = true; return; }
      ecrire({ familles: v });
    } else if (i.type === "radio") {
      ecrire({ [i.name]: i.value });
      if (["langue", "adresse"].includes(i.name)) return reafficher(`input[name=${i.name}][value="${i.value}"]`);
    }
    annoncer(t("conf.fait"));
  };
  const taille = $("#taille", main);
  taille.addEventListener("input", () => {
    ecrire({ taille: +taille.value });
    $("#taille-v").textContent = taille.value + " px";
    taille.setAttribute("aria-valuetext", taille.value + " px");
  });
  main.onclick = (ev) => {
    const b = ev.target.closest("button"); if (!b) return;
    if (b.dataset.reinit) { reinitialiser(b.dataset.reinit.split(",")); return reafficher(`[data-reinit="${b.dataset.reinit}"]`); }
    if (b.dataset.raccourci) {
      const r = { lettres: { lettres: "tres", mots: "large", interligne: "1.8", police: lire().police === "quattro" ? "atkinson" : lire().police },
        mouvement: { animations: "aucune", son: "aucun" }, contraste: { theme: "contraste" } }[b.dataset.raccourci];
      ecrire(r); annoncer(t("conf.fait"));
      return reafficher(`[data-raccourci="${b.dataset.raccourci}"]`);
    }
    if (b.id === "seul-obs") { ecrire({ familles: ["obs"] }); annoncer(t("conf.fait")); return reafficher("#seul-obs"); }
    if (b.id === "essayer-son") signalFin(lire().son);
    if (b.id === "tout-defaut") { reinitialiser(); return reafficher("#tout-defaut"); }
  };
}
export { DEFAUTS };
