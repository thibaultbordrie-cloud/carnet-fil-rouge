// Carnet Fil Rouge — routeur et écrans. Local d'abord : IndexedDB, aucun réseau après installation.
import { t, e, unite, nombre, dateLongue, dateCourte } from "./i18n.js";
import { lire, ecrire, appliquer, langueInterface, langueConsignes } from "./prefs.js";
import { tous, un, mettre, retirer, meta, setMeta, pagesChrono, aujourdhui, nouvelId } from "./db.js";
import { charger, aRang, alternatives } from "./consignes.js";
import { pagesDePoche, motsDe } from "./compte.js";
import { analyser, decouper } from "./porte.js";
import { versJSON, versMarkdown, versTexte, telecharger, importerFichier, lireMarkdown, ajouterPages } from "./echange.js";
import { ouvrirSeance, fermerSeance } from "./seance.js";
import { ecranConfort } from "./confort.js";
import { $, $$, etat, icone, annoncer, flash, ecran, route, aller, estInstalle, estIOS, joursEntre } from "./ui.js";
import { VERSION } from "./version.js";

const PREMIERE = "data/premiere-page-thibault.md";

// ---------------------------------------------------------------- navigation
function nav(actif) {
  const items = [["aujourdhui", "nav.aujourdhui"], ["carnet", "nav.carnet"], ["confort", "nav.confort"]];
  $("#barre").setAttribute("aria-label", t("nav.etiquette"));
  $("#barre").innerHTML = `<ul>${items.map(([k, l]) => `<li><a href="#/${k}" ${k === actif ? 'aria-current="page"' : ""}>${icone(k)}<span>${e(t(l))}</span></a></li>`).join("")}</ul>`;
  $("#evitement").textContent = t("lien.evitement");
  $("#marque").textContent = t("app.nom");
}

// ---------------------------------------------------------------- données utiles
async function premiereDisponible() {
  if (etat.premiereDispo !== null) return etat.premiereDispo;
  if (await meta("premiere")) return (etat.premiereDispo = false);
  try {
    const r = await fetch(PREMIERE, { cache: "no-cache" });
    etat.premiereDispo = r.ok ? lireMarkdown(await r.text()) : false;
    if (etat.premiereDispo && !etat.premiereDispo.length) etat.premiereDispo = false;
  } catch { etat.premiereDispo = false; }
  return etat.premiereDispo;
}

async function contexteDuJour() {
  const pages = await pagesChrono();
  const auj = aujourdhui();
  const jours = new Set(pages.map((p) => p.date));
  const rang = [...jours].filter((d) => d < auj).length;
  const liste = await charger(langueConsignes());
  const fam = lire().familles;
  const base = aRang(liste, rang, fam);
  const alts = alternatives(liste, rang, fam);
  let choix = await meta("choixDuJour", null);
  if (!choix || choix.date !== auj) choix = { date: auj, i: 0 };
  const propositions = [base, ...alts];
  choix.i = Math.min(choix.i, propositions.length - 1);
  const demain = aRang(liste, rang + 1, fam); // en supposant une page aujourd'hui
  const pageDuJour = pages.filter((p) => p.date === auj && p.source === "seance").pop();
  const avant = pages.filter((p) => p.date < auj).map((p) => p.date).pop();
  return { pages, auj, jours, rang, liste, propositions, choix, consigne: propositions[choix.i], demain, pageDuJour, avant };
}

// ---------------------------------------------------------------- avis (un seul à la fois, R1)
async function avisDuJour(c) {
  const maintenant = Date.now();
  if (etat.majPrete) {
    let notes = [];
    try { const d = await (await fetch(`data/changements.json?maj=${maintenant}`, { cache: "no-store" })).json(); notes = d.notes?.[d.version]?.[langueInterface()] || []; } catch {}
    return `<div class="avis" role="region" aria-label="${e(t("avis.maj"))}"><p><b>${e(t("avis.maj"))}</b></p>${notes.length ? `<p>${e(t("avis.maj.liste"))}</p><ul>${notes.map((n) => `<li>${e(n)}</li>`).join("")}</ul>` : ""}<p class="sous petit">${e(t("avis.maj.suite"))}</p>
      <div class="actions"><button type="button" class="btn" data-avis="maj">${e(t("avis.maj.btn"))}</button><button type="button" class="btn discret" data-avis="maj-plustard">${e(t("avis.fermer"))}</button></div></div>`;
  }
  if ((await meta("versionVue")) !== VERSION) {
    return `<div class="avis" role="region" aria-label="${e(t("maj.faite", { v: VERSION.replace(/\.0$/, "") }))}"><p><b>${e(t("maj.faite", { v: VERSION.replace(/\.0$/, "") }))}</b></p>
      <div class="actions"><a class="btn" href="#/changements" data-avis-lien="version">${e(t("maj.voir"))}</a><button type="button" class="btn discret" data-avis="version">${e(t("maj.compris"))}</button></div></div>`;
  }
  const premiere = await premiereDisponible();
  if (premiere) {
    return `<div class="avis"><p><b>${e(t("premiere.titre"))}</b></p><p>${e(t("premiere.texte", { date: dateCourte(premiere[0].date) }))}</p>
      <div class="actions"><a class="btn" href="#/premiere">${e(t("premiere.voir"))}</a></div></div>`;
  }
  const n = c.pages.length;
  const derniereCopie = await meta("derniereCopie", 0), repousse = await meta("copieRepoussee", 0);
  if (n >= 3 && maintenant - derniereCopie > 14 * 864e5 && maintenant > repousse) {
    return `<div class="avis"><p>${e(t("avis.export"))}</p><div class="actions"><a class="btn" href="#/sauvegarde">${e(t("avis.export.btn"))}</a><button type="button" class="btn discret" data-avis="copie">${e(t("avis.fermer"))}</button></div></div>`;
  }
  const previsible = lire().previsible === "on";
  if (!(await meta("porteVue"))) {
    if (c.jours.size >= 8 && (!previsible || (await meta("porteAnnoncee")))) {
      return `<div class="avis"><p>${e(t("avis.porte"))}</p><div class="actions"><a class="btn" href="#/porte">${e(t("avis.porte.btn"))}</a><button type="button" class="btn discret" data-avis="porte">${e(t("avis.fermer"))}</button></div></div>`;
    }
    if (previsible && c.jours.size === 7 && !c.jours.has(c.auj)) {
      await setMeta("porteAnnoncee", c.auj);
      return `<div class="avis"><p>${e(t("avis.porte.demain"))}</p></div>`;
    }
  }
  if (n >= 3 && !(await meta("peursProposees"))) {
    return `<div class="avis"><p>${e(t("avis.peurs"))}</p><div class="actions"><a class="btn" href="#/peurs" data-avis-lien="peurs">${e(t("avis.peurs.btn"))}</a><button type="button" class="btn discret" data-avis="peurs">${e(t("avis.peurs.non"))}</button></div></div>`;
  }
  if (n >= 2 && !estInstalle() && !(await meta("installProposee"))) {
    return `<div class="avis"><p>${e(t("avis.installer"))}</p><div class="actions"><a class="btn" href="#/installer" data-avis-lien="install">${e(t("avis.installer.btn"))}</a><button type="button" class="btn discret" data-avis="install">${e(t("avis.fermer"))}</button></div></div>`;
  }
  return "";
}

// ---------------------------------------------------------------- écrans
async function ecranBienvenue() {
  ecran(t("accueil.titre"), `<section class="accueil">
    <svg class="fil-deco" viewBox="0 0 400 64" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M0 52 C90 52 110 12 200 12 S310 52 400 52" fill="none" stroke-width="1.5"/></svg>
    <h1>${e(t("accueil.titre"))}</h1><p>${e(t("accueil.l1"))}</p><p>${e(t("accueil.l2"))}</p>
    <div class="actions pile"><button type="button" class="btn principal" id="commencer">${e(t("accueil.commencer"))}</button>
    <button type="button" class="btn" id="vers-confort">${e(t("accueil.confort"))}</button></div></section>`, { nav: false });
  const suite = async (h) => { await setMeta("bienvenue", Date.now()); await setMeta("versionVue", VERSION); aller(h); };
  $("#commencer").onclick = async () => suite((await premiereDisponible()) ? "#/premiere" : "#/aujourdhui");
  $("#vers-confort").onclick = () => suite("#/confort");
}

async function ecranPremiere() {
  const p = await premiereDisponible();
  if (!p) return aller("#/aujourdhui");
  ecran(t("premiere.titre"), `<h1>${e(t("premiere.titre"))}</h1><p>${e(t("premiere.texte", { date: dateCourte(p[0].date) }))}</p>
    ${p.map((x) => `<article class="fiche"><p class="etiquette">${e(dateLongue(x.date))}</p><div class="lecture">${paragraphes(x.texte)}</div></article>`).join("")}
    <div class="actions pile"><button type="button" class="btn principal" id="oui">${e(t("premiere.oui"))}</button><button type="button" class="btn" id="non">${e(t("premiere.non"))}</button></div>`, { nav: false });
  $("#oui").onclick = async () => {
    await ajouterPages(p.map((x) => ({ ...x, source: "premiere", langue: "fr" })), "premiere", "fr");
    await setMeta("premiere", "ajoutee"); etat.premiereDispo = false;
    flash(e(t("premiere.fait"))); aller("#/aujourdhui");
  };
  $("#non").onclick = async () => { await setMeta("premiere", "refusee"); etat.premiereDispo = false; aller("#/aujourdhui"); };
}

function paragraphes(texte) {
  return texte.split(/\n{2,}/).map((x) => `<p>${e(x)}</p>`).join("");
}

async function ecranVoici(params) {
  const suite = params.get("suite");
  ecran(t("voici.titre"), `<h1>${e(t("voici.titre"))}</h1><div class="fiche"><ol class="etapes"><li>${e(t("voici.e1"))}</li><li>${e(t("voici.e2"))}</li><li>${e(t("voici.e3"))}</li></ol><p>${e(t("voici.e4"))}</p><p class="sous">${e(t("voici.e5"))}</p></div>
    <div class="actions pile"><button type="button" class="btn principal" id="ok">${e(t(suite ? "voici.ok" : "voici.retour"))}</button></div>`);
  $("#ok").onclick = async () => { await setMeta("voiciVu", true); aller(suite ? "#/ecrire?" + suite : "#/aujourdhui"); };
}

async function ecranAujourdhui() {
  if (!(await meta("bienvenue"))) return aller("#/bienvenue");
  const c = await contexteDuJour();
  const p = lire();
  const k = c.consigne;
  const total = c.pages.reduce((s, x) => s + (x.mots || 0), 0);
  const pages = pagesDePoche(total);
  const pagesTxt = pages === 0 ? t("auj.cumul.pages0") : pages === 1 ? t("auj.cumul.pages1") : t("auj.cumul.pagesN", { n: nombre(pages) });
  const retour = !c.jours.has(c.auj) && c.avant && joursEntre(c.avant, c.auj) >= 4;
  const reste = c.propositions.length - 1 - c.choix.i;
  const lienEcrire = (q) => `#/ecrire?${q}`;
  const favoris = await meta("favoris", []);
  const garde = favoris.some((f) => f.id === k.id);
  const incipit = k.source ? `<p class="source">${e(t("auj.incipit"))} <a href="${e(k.source.gutenberg)}" rel="noopener noreferrer" target="_blank">${e(k.source.reference)}</a></p>` : "";
  const html = `${await avisDuJour(c)}
    ${retour ? `<p><b>${e(t("auj.retour"))}</b></p>` : ""}
    <article class="fiche" aria-labelledby="date-jour">
      <h1 class="date" id="date-jour">${e(dateLongue(c.auj))}</h1>
      <p class="etiquette">${e(t("auj.consigne"))} · ${e(t("fam." + k.famille))}</p>
      <p class="consigne" lang="${e(langueConsignes())}">${e(k.texte)}</p>
      <p class="pluspetit"><b>${e(t("auj.pluspetit"))}</b> <span lang="${e(langueConsignes())}">${e(k.plus_petit)}</span></p>
      ${incipit}
      <p class="garder-consigne"><button type="button" class="btn coeur" id="garder" aria-pressed="${garde}">${icone(garde ? "coeur-plein" : "coeur")}<span>${e(t("fav.garder"))}</span></button></p>
    </article>
    <div class="actions pile">
      ${c.pageDuJour ? `<a class="btn principal" href="#/ecrire?page=${e(c.pageDuJour.id)}">${e(t("auj.continuer"))}</a>
        <a class="btn" href="${lienEcrire("consigne=" + k.position)}">${e(t("auj.nouvelle"))}</a>`
      : `<a class="btn principal" href="${lienEcrire("consigne=" + k.position)}">${e(t("auj.ecrire"))}</a>`}
      ${reste > 0 ? `<button type="button" class="btn" id="autre" aria-describedby="autre-reste">${e(t("auj.autre"))}</button><span class="sr" id="autre-reste">${e(t("auj.autre.reste", { n: reste }))}</span>` : `<p class="petit sous">${e(t("auj.autre.fin"))}</p>`}
      ${c.choix.i > 0 ? `<button type="button" class="btn discret" id="precedente">${e(t("auj.precedente"))}</button>` : ""}
    </div>
    ${p.previsible === "on" ? `<p class="sous">${e(t("auj.demain", { texte: c.demain.texte }))}</p>` : ""}
    <p><a class="btn discret" href="${lienEcrire("sans=1")}">${e(t("auj.sans"))}</a><br><a class="btn discret" href="#/voici">${e(t("auj.comment"))}</a></p>
    ${p.nombres === "cumul" && total > 0 ? `<p class="sous">${e(t("auj.cumul", { mots: nombre(total), unite: unite(), pages: pagesTxt }))}</p>` : ""}`;
  const main = ecran(t("nav.aujourdhui"), html);
  nav("aujourdhui");
  const changer = async (d) => { c.choix.i += d; await setMeta("choixDuJour", c.choix); await ecranAujourdhui(); $(d > 0 ? "#autre" : "#precedente")?.focus() || $(".consigne")?.focus(); annoncer(c.propositions[c.choix.i].texte); };
  $("#autre", main)?.addEventListener("click", () => changer(1));
  $("#precedente", main)?.addEventListener("click", () => changer(-1));
  $("#garder", main)?.addEventListener("click", async () => {
    const l = await meta("favoris", []);
    const i = l.findIndex((f) => f.id === k.id);
    if (i >= 0) l.splice(i, 1); else l.push({ id: k.id, langue: langueConsignes(), ajoute: Date.now() });
    await setMeta("favoris", l);
    await ecranAujourdhui(); $("#garder")?.focus(); annoncer(t(i >= 0 ? "fav.non" : "fav.oui"));
  });
  main.onclick = async (ev) => {
    const b = ev.target.closest("[data-avis]"); const l = ev.target.closest("[data-avis-lien]");
    if (l) { const k2 = l.dataset.avisLien; await setMeta(k2 === "peurs" ? "peursProposees" : k2 === "version" ? "versionVue" : "installProposee", k2 === "version" ? VERSION : true); return; }
    if (!b) return;
    const a = b.dataset.avis;
    if (a === "maj") { etat.majPrete.postMessage("appliquer"); return; }
    if (a === "maj-plustard") etat.majPrete = null;
    if (a === "copie") await setMeta("copieRepoussee", Date.now() + 7 * 864e5);
    if (a === "porte") await setMeta("porteVue", true);
    if (a === "peurs") await setMeta("peursProposees", true);
    if (a === "install") await setMeta("installProposee", true);
    if (a === "version") await setMeta("versionVue", VERSION);
    await ecranAujourdhui();
  };
}

async function ecranEcrire(params) {
  if (params.get("page")) return ouvrirSeance({ pageId: params.get("page") });
  if (params.has("jour")) {
    if (!(await meta("bienvenue"))) return aller("#/bienvenue");
    // Ouvert depuis l'icône : le bouton Retour ramène à Aujourd'hui au lieu de fermer l'app.
    if (!etat.dejaAffiche) { history.replaceState(null, "", "#/aujourdhui"); history.pushState(null, "", "#/ecrire?jour=1"); }
    const c = await contexteDuJour();
    return c.pageDuJour ? ouvrirSeance({ pageId: c.pageDuJour.id }) : ouvrirSeance({ consigne: c.consigne });
  }
  if (params.has("favori")) {
    const f = (await meta("favoris", [])).find((x) => x.id === params.get("favori"));
    const k = f && (await charger(f.langue)).find((x) => x.id === f.id);
    return ouvrirSeance({ consigne: k || null });
  }
  if (params.has("consigne")) {
    const liste = await charger(langueConsignes());
    return ouvrirSeance({ consigne: liste[+params.get("consigne")] || null });
  }
  return ouvrirSeance({});
}

async function ecranFin(id) {
  if (id === "vide") {
    ecran(t("fin.titre"), `<h1>${e(t("fin.titre"))}</h1><p>${e(t("fin.vide"))}</p><div class="actions pile"><a class="btn principal" href="#/aujourdhui">${e(t("fin.retour"))}</a></div>`);
    return nav("");
  }
  const pages = await pagesChrono();
  const p = pages.find((x) => x.id === id);
  if (!p) return aller("#/carnet");
  ecran(t("fin.titre"), `<div class="fiche"><h1>${e(t("fin.titre"))}</h1><p>${e(t("fin.texte", { n: nombre(p.mots), unite: unite(p.langue), p: p.numero }))}</p></div>
    <div class="actions pile"><a class="btn principal" href="#/aujourdhui">${e(t("fin.retour"))}</a><a class="btn" href="#/page/${e(p.id)}">${e(t("fin.relire"))}</a></div>`);
  nav("");
}

async function ecranCarnet() {
  const pages = (await pagesChrono()).reverse();
  const items = pages.map((p) => `<li><a href="#/page/${e(p.id)}">
      <span class="ent"><b>${e(t("carnet.page", { n: p.numero }))}</b><span>${e(dateCourte(p.date))}</span></span>
      ${p.prive ? `<span class="marque-prive">${e(t("carnet.prive"))}</span><span class="voile" aria-hidden="true"></span>`
      : `${p.consigne ? `<span class="consigne-mini"><b>${e(t("seance.consigne"))} :</b> ${e(p.consigne)}</span>` : `<span class="sr">${e(p.source === "seance" ? t("carnet.sansconsigne") : t("carnet.importee"))}. </span>`}<p class="debut">${e(p.texte.slice(0, 220))}</p>`}
    </a></li>`).join("");
  ecran(t("carnet.titre"), `<h1>${e(t("carnet.titre"))}</h1>
    ${pages.length ? `<ol class="reliure" aria-label="${e(t("carnet.liste"))}">${items}</ol>` : `<p>${e(t("carnet.vide"))}</p>`}
    <h2>${e(t("carnet.plus"))}</h2>
    <ul class="lien-liste">
      <li><a href="#/favoris">${e(t("carnet.favoris"))}</a></li>
      <li><a href="#/sauvegarde">${e(t("carnet.sauvegarde"))}</a></li>
      <li><a href="#/porte">${e(t("carnet.porte"))}</a></li>
      <li><a href="#/peurs">${e(t("carnet.peurs"))}</a></li>
      <li><a href="#/installer">${e(t("carnet.installer"))}</a></li>
      <li><a href="#/code">${e(t("carnet.code"))}</a></li>
      <li><a href="#/changements">${e(t("carnet.changements"))}</a></li>
      <li><a href="#/apropos">${e(t("carnet.apropos"))}</a></li>
    </ul>`);
  nav("carnet");
}

// Code local (PBKDF2) : protège des regards, ne chiffre pas.
async function hacher(code, sel) {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const b = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: sel, iterations: 150000, hash: "SHA-256" }, k, 256);
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function ecranPage(id) {
  const pages = await pagesChrono();
  const p = pages.find((x) => x.id === id);
  if (!p) { ecran(t("page.introuvable"), `<h1>${e(t("page.introuvable"))}</h1><p><a class="btn" href="#/carnet">${e(t("page.retour"))}</a></p>`); return nav("carnet"); }
  const code = await meta("code");
  if (p.prive && code && !etat.deverrouille) {
    ecran(t("page.titre", { n: p.numero }), `<h1>${e(t("page.titre", { n: p.numero }))}</h1><p>${e(t("page.verrou"))}</p>
      <form id="f-code"><label class="bloc" for="code">${e(t("page.verrou.champ"))}</label><input type="password" id="code" autocomplete="current-password" inputmode="text">
      <p id="code-err" class="message" hidden role="alert"></p><div class="actions"><button class="btn principal">${e(t("page.verrou.ok"))}</button></div></form>`);
    nav("carnet");
    $("#f-code").onsubmit = async (ev) => {
      ev.preventDefault();
      const sel = Uint8Array.from(code.sel.match(/../g).map((h) => parseInt(h, 16)));
      if ((await hacher($("#code").value, sel)) === code.hash) { etat.deverrouille = true; ecranPage(id); }
      else { const m = $("#code-err"); m.hidden = false; m.textContent = t("page.verrou.faux"); }
    };
    return;
  }
  ecran(t("page.titre", { n: p.numero }), `<article class="fiche"><p class="etiquette">${e(dateLongue(p.date))}${p.etiquette ? ` · ${e(p.etiquette)}` : ""}</p>
      <h1>${e(t("page.titre", { n: p.numero }))}</h1>
      ${p.consigne ? `<p class="sous"><b>${e(t("seance.consigne"))} :</b> ${e(p.consigne)}</p>` : ""}
      <div class="lecture" lang="${e(p.langue || "fr")}">${paragraphes(p.texte)}</div>
      <p class="sous petit">${e(t("page.mots", { n: nombre(p.mots), unite: unite(p.langue) }))}</p></article>
    <div class="actions pile"><a class="btn principal" href="#/ecrire?page=${e(p.id)}">${e(t("page.continuer"))}</a></div>
    <p class="case"><input type="checkbox" id="prive" ${p.prive ? "checked" : ""} aria-describedby="prive-aide"><label for="prive">${e(t("page.prive"))}</label></p>
    <p class="aide" id="prive-aide">${e(t("page.prive.aide"))}</p>
    <div id="suppr"><button type="button" class="btn" id="supprimer">${e(t("page.supprimer"))}</button></div>
    <p><a class="btn discret" href="#/carnet">${e(t("page.retour"))}</a></p>`);
  nav("carnet");
  $("#prive").onchange = async (ev) => { const x = await un("pages", id); x.prive = ev.target.checked; await mettre("pages", x); annoncer(t("conf.fait")); };
  $("#supprimer").onclick = () => {
    $("#suppr").innerHTML = `<div class="avis" role="alertdialog" aria-labelledby="q-suppr"><p id="q-suppr">${e(t("page.supprimer.q"))}</p>
      <div class="actions"><button type="button" class="btn" id="suppr-oui">${e(t("page.supprimer.oui"))}</button><button type="button" class="btn principal" id="suppr-non">${e(t("page.supprimer.non"))}</button></div></div>`;
    $("#suppr-non").focus();
    $("#suppr-non").onclick = () => ecranPage(id);
    $("#suppr-oui").onclick = async () => { await retirer("pages", id); flash(e(t("page.supprimee"))); aller("#/carnet"); };
  };
}

async function ecranSauvegarde() {
  const derniere = await meta("derniereCopie", 0);
  let stockage = t("sauv.stockage.inconnu");
  try { if (navigator.storage?.persisted) stockage = (await navigator.storage.persisted()) ? t("sauv.stockage.oui") : t("sauv.stockage.non"); } catch {}
  ecran(t("sauv.titre"), `<h1>${e(t("sauv.titre"))}</h1><p>${e(t("sauv.intro"))}</p>
    <p class="sous" id="derniere">${derniere ? e(t("sauv.derniere", { date: dateCourte(aujourdhui(new Date(derniere))) })) : e(t("sauv.jamais"))}</p>
    <div class="actions pile"><button type="button" class="btn principal" data-export="json">${e(t("sauv.json"))}</button></div>
    <p class="aide">${e(t("sauv.json.aide"))}</p>
    <div class="actions pile"><button type="button" class="btn" data-export="md">${e(t("sauv.md"))}</button><button type="button" class="btn" data-export="txt">${e(t("sauv.txt"))}</button></div>
    <p class="case"><input type="checkbox" id="avec-prives"><label for="avec-prives">${e(t("sauv.prives"))}</label></p>
    <h2>${e(t("sauv.importer"))}</h2><p class="aide" id="imp-aide">${e(t("sauv.importer.aide"))}</p>
    <p><label class="btn" for="fichier">${e(t("sauv.importer"))}</label><input type="file" id="fichier" class="sr" accept=".json,.md,.txt,application/json,text/markdown,text/plain" aria-describedby="imp-aide"></p>
    <p id="imp-res" role="status"></p>
    <h2>${e(t("sauv.stockage"))}</h2><p id="stockage">${e(stockage)}</p>`);
  nav("carnet");
  const nomFichier = (ext) => `carnet-fil-rouge-${aujourdhui()}.${ext}`;
  $("#contenu").onclick = async (ev) => {
    const b = ev.target.closest("[data-export]"); if (!b) return;
    const avec = $("#avec-prives").checked, titre = t("app.nom");
    if (b.dataset.export === "json") { telecharger(nomFichier("json"), await versJSON(), "application/json"); await setMeta("derniereCopie", Date.now()); }
    if (b.dataset.export === "md") telecharger(nomFichier("md"), await versMarkdown(avec, titre), "text/markdown;charset=utf-8");
    if (b.dataset.export === "txt") telecharger(nomFichier("txt"), await versTexte(avec, titre), "text/plain;charset=utf-8");
    const d = await meta("derniereCopie", 0);
    if (d) $("#derniere").textContent = t("sauv.derniere", { date: dateCourte(aujourdhui(new Date(d))) });
  };
  $("#fichier").onchange = async (ev) => {
    const f = ev.target.files[0]; if (!f) return;
    try {
      const r = await importerFichier(f.name, await f.text(), langueConsignes());
      $("#imp-res").textContent = t("sauv.resultat", { n: r.ajoutees, m: r.ignorees });
    } catch { $("#imp-res").textContent = t("sauv.erreur"); }
    ev.target.value = "";
  };
}

function ecranInstaller() {
  const html = estInstalle() ? `<p>${e(t("inst.deja"))}</p>`
    : `<p>${e(t("inst.pourquoi"))}</p>${etat.installer ? `<div class="actions pile"><button type="button" class="btn principal" id="installer">${e(t("inst.android"))}</button></div>` : ""}
       <div class="fiche"><p>${e(t(estIOS() ? "inst.ios" : "inst.autre"))}</p></div>`;
  ecran(t("inst.titre"), `<h1>${e(t("inst.titre"))}</h1>${html}`);
  nav("carnet");
  $("#installer")?.addEventListener("click", async () => { etat.installer.prompt(); await etat.installer.userChoice; etat.installer = null; ecranInstaller(); });
}

async function ecranCode() {
  const code = await meta("code");
  const dispo = !!(window.crypto && crypto.subtle);
  ecran(t("code.titre"), `<h1>${e(t("code.titre"))}</h1><p>${e(t("code.intro"))}</p>
    ${!dispo ? `<p class="message">${e(t("code.indispo"))}</p>` : `<p><b>${e(t(code ? "code.actif" : "code.inactif"))}</b></p>
    <form id="f-code"><label class="bloc" for="nouveau">${e(t("code.champ"))}</label><input type="password" id="nouveau" autocomplete="new-password">
    <p id="code-msg" role="status"></p><div class="actions"><button class="btn principal">${e(t("code.definir"))}</button>${code ? `<button type="button" class="btn" id="retirer">${e(t("code.retirer"))}</button>` : ""}</div></form>`}`);
  nav("carnet");
  if (!dispo) return;
  $("#f-code").onsubmit = async (ev) => {
    ev.preventDefault();
    const v = $("#nouveau").value;
    if (v.length < 4) { $("#code-msg").textContent = t("code.court"); return; }
    const sel = crypto.getRandomValues(new Uint8Array(16));
    await setMeta("code", { sel: [...sel].map((x) => x.toString(16).padStart(2, "0")).join(""), hash: await hacher(v, sel) });
    etat.deverrouille = false; flash(e(t("conf.fait"))); ecranCode();
  };
  $("#retirer")?.addEventListener("click", async () => { await setMeta("code", null); etat.deverrouille = false; flash(e(t("conf.fait"))); ecranCode(); });
}

async function ecranPeurs() {
  await setMeta("peursProposees", true);
  const peurs = (await tous("peurs")).sort((a, b) => b.cree - a.cree);
  const actives = peurs.filter((x) => !x.rangee), rangees = peurs.length - actives.length;
  const puces = ["idee", "temps", "fatigue", "bruit", "mal", "autre"];
  ecran(t("peurs.titre"), `<h1>${e(t("peurs.titre"))}</h1><p class="sous">${e(t("peurs.intro"))}</p>
    <form id="f-peur" class="fiche">
      <label class="bloc" for="phrase">${e(t("peurs.phrase"))}</label><textarea id="phrase" class="champ" spellcheck="false"></textarea>
      <fieldset><legend>${e(t("peurs.puces"))}</legend><div class="puces">${puces.map((p) => `<label><input type="checkbox" name="puce" value="${p}"> ${e(t("peurs.p." + p))}</label>`).join("")}</div></fieldset>
      <button class="btn principal">${e(t("peurs.noter"))}</button></form>
    <h2>${e(t("peurs.liste"))}</h2>
    ${actives.length ? actives.map((x) => `<div class="peur"><div><p class="sous petit">${e(dateCourte(x.date))}</p>${x.texte ? `<p>${e(x.texte)}</p>` : ""}${x.puces?.length ? `<p>${x.puces.map((p) => e(t("peurs.p." + p))).join(" · ")}</p>` : ""}</div>
      <button type="button" class="btn" data-ranger="${e(x.id)}">${e(t("peurs.ranger"))}</button></div>`).join("") : `<p>${e(t("peurs.vide"))}</p>`}
    ${rangees ? `<p class="sous">${e(t("peurs.rangees", { n: rangees }))}</p>` : ""}`);
  nav("carnet");
  $("#f-peur").onsubmit = async (ev) => {
    ev.preventDefault();
    const texte = $("#phrase").value.trim(), ps = $$("input[name=puce]:checked").map((x) => x.value);
    if (!texte && !ps.length) return;
    await mettre("peurs", { id: nouvelId(), cree: Date.now(), date: aujourdhui(), texte, puces: ps, rangee: false });
    flash(e(t("conf.fait"))); ecranPeurs();
  };
  $("#contenu").onclick = async (ev) => {
    const b = ev.target.closest("[data-ranger]"); if (!b) return;
    const x = await un("peurs", b.dataset.ranger); x.rangee = true; await mettre("peurs", x); ecranPeurs();
  };
}

function carteHTML(r, { carnet, pages }) {
  if (!r.mots) return `<p>${e(t("porte.vide"))}</p>`;
  const u = unite();
  const nomPartie = (n) => n.premiereTitre;
  const periode = carnet && pages.length ? `<li>${e(t("porte.c.periode", { debut: dateCourte(pages[0].date), fin: dateCourte(pages.at(-1).date) }))}</li>` : "";
  return `<section class="carte" aria-labelledby="h-chiffres"><h2 id="h-chiffres">${e(t("porte.chiffres"))}</h2>
      <ul><li>${e(t("porte.c.mots", { n: nombre(r.mots), unite: u }))}</li><li>${e(t("porte.c.parties", { n: r.parties }))}</li>${periode}</ul>
    <h2>${e(t("porte.noms"))}</h2>
      ${r.noms.length ? `<ul>${r.noms.map((n) => `<li>${e(t("porte.nom.ligne", { nom: n.nom, n: n.n, premier: nomPartie(n), dernier: n.derniereTitre }))}</li>`).join("")}</ul>` : `<p>${e(t("porte.noms.vide"))}</p>`}
    ${r.lieux.length ? `<h2>${e(t("porte.lieux"))}</h2><ul>${r.lieux.map((l) => `<li>${e(l.nom)} (${l.n})</li>`).join("")}</ul>` : ""}
    ${r.pasRevus.length ? `<h2>${e(t("porte.pasrevus"))}</h2><ul>${r.pasRevus.map((n) => `<li>${e(t("porte.pasrevus.ligne", { nom: n.nom, ou: n.derniereTitre }))}</li>`).join("")}</ul>` : ""}
    ${r.derniere ? `<h2>${e(t("porte.derniere"))}</h2><blockquote class="citation"><p>${e(r.derniere.phrase)}</p></blockquote><p class="sous petit">${e(r.derniere.titre)}</p>` : ""}
    ${carnet && pages.length ? `<h2>${e(t("porte.reprendre"))}</h2><div class="actions pile"><a class="btn principal" href="#/ecrire?page=${e(pages.at(-1).id)}">${e(t("porte.r.continuer"))}</a><a class="btn" href="#/page/${e(pages.at(-1).id)}">${e(t("porte.r.relire"))}</a></div>` : ""}
  </section>`;
}

async function ecranPorte(params) {
  await setMeta("porteVue", true);
  const source = params.get("source") || "carnet";
  const ong = [["carnet", "porte.s.carnet"], ["coller", "porte.s.coller"], ["fichier", "porte.s.fichier"]];
  let corps = "";
  const pages = (await pagesChrono()).filter((p) => !p.prive);
  if (source === "carnet") {
    const r = analyser(pages.map((p) => ({ titre: `${t("carnet.page", { n: p.numero })}, ${dateCourte(p.date)}`, texte: p.texte })), langueInterface());
    corps = carteHTML(r, { carnet: true, pages });
  } else {
    corps = `<form id="f-texte">${source === "coller"
      ? `<label class="bloc" for="texte">${e(t("porte.coller.champ"))}</label><textarea id="texte" class="champ" spellcheck="false"></textarea>`
      : `<p><label class="btn" for="fic">${e(t("porte.s.fichier"))}</label><input type="file" id="fic" class="sr" accept=".txt,.md,text/plain,text/markdown"></p><p id="fic-nom" class="sous"></p>`}
      <div class="actions"><button class="btn principal">${e(t("porte.coller.ok"))}</button></div></form><div id="resultat"></div>`;
  }
  ecran(t("porte.titre"), `<h1>${e(t("porte.titre"))}</h1><p class="sous">${e(t("porte.intro"))}</p>
    <h2 class="sr">${e(t("porte.source"))}</h2><div class="onglets" role="group" aria-label="${e(t("porte.source"))}">${ong.map(([k, l]) => `<a class="btn ${k === source ? "principal" : ""}" href="#/porte?source=${k}" ${k === source ? 'aria-current="true"' : ""}>${e(t(l))}</a>`).join("")}</div>
    ${corps}`);
  nav("carnet");
  const f = $("#f-texte"); if (!f) return;
  let texte = "";
  $("#fic")?.addEventListener("change", async (ev) => { const x = ev.target.files[0]; if (x) { texte = await x.text(); $("#fic-nom").textContent = x.name; } });
  f.onsubmit = (ev) => {
    ev.preventDefault();
    if (source === "coller") texte = $("#texte").value;
    if (!texte.trim()) return;
    const parts = decouper(texte).map((p, i) => ({ titre: p.titre || t("porte.partie", { n: i + 1 }), texte: p.texte }));
    $("#resultat").innerHTML = carteHTML(analyser(parts, langueInterface()), { carnet: false, pages: [] }) +
      `<div class="actions"><button type="button" class="btn" id="garder">${e(t("porte.garder"))}</button></div><p id="garde" role="status"></p>`;
    $("#resultat h2")?.setAttribute("tabindex", "-1"); $("#resultat h2")?.focus();
    $("#garder").onclick = async () => { await ajouterPages([{ date: aujourdhui(), texte: texte.replace(/\r\n?/g, "\n").replace(/^\n+|\n+$/g, ""), source: "import" }], "import", langueInterface()); $("#garde").textContent = t("porte.garde"); $("#garder").disabled = true; };
  };
}

async function ecranFavoris() {
  const favoris = await meta("favoris", []);
  const listes = {};
  for (const f of favoris) listes[f.langue] ||= await charger(f.langue);
  const items = favoris.map((f) => ({ f, k: listes[f.langue].find((x) => x.id === f.id) })).filter((x) => x.k);
  ecran(t("fav.titre"), `<h1>${e(t("fav.titre"))}</h1><p class="sous">${e(t("fav.intro"))}</p>
    ${items.length ? items.map(({ f, k }) => `<article class="fiche"><p class="etiquette">${e(t("fam." + k.famille))}</p><p class="consigne" lang="${e(f.langue)}">${e(k.texte)}</p>
      <p class="pluspetit"><b>${e(t("auj.pluspetit"))}</b> <span lang="${e(f.langue)}">${e(k.plus_petit)}</span></p>
      <div class="actions"><a class="btn principal" href="#/ecrire?favori=${e(f.id)}">${e(t("fav.ecrire"))}</a><button type="button" class="btn" data-retirer="${e(f.id)}">${e(t("fav.retirer"))}</button></div></article>`).join("")
      : `<p>${e(t("fav.vide"))}</p>`}`);
  nav("carnet");
  $("#contenu").onclick = async (ev) => {
    const b = ev.target.closest("[data-retirer]"); if (!b) return;
    await setMeta("favoris", (await meta("favoris", [])).filter((x) => x.id !== b.dataset.retirer));
    flash(e(t("fav.non"))); ecranFavoris();
  };
}

function ecranAPropos() {
  ecran(t("apropos.titre"), `<h1>${e(t("apropos.titre"))}</h1><p>${e(t("apropos.l1"))}</p><p>${e(t("apropos.l2"))}</p><p>${e(t("apropos.l3"))}</p><p>${e(t("apropos.l4"))}</p><p class="sous">${e(t("apropos.version", { v: VERSION }))}</p>`);
  nav("carnet");
}
async function ecranChangements() {
  let d = { notes: {} };
  try { d = await (await fetch("data/changements.json")).json(); } catch {}
  const l = langueInterface();
  ecran(t("chg.titre"), `<h1>${e(t("chg.titre"))}</h1>${Object.entries(d.notes).reverse().map(([v, n]) => `<h2>${e(v)}</h2><ul>${(n[l] || n.fr).map((x) => `<li>${e(x)}</li>`).join("")}</ul>`).join("")}`);
  nav("carnet");
}

// ---------------------------------------------------------------- routeur
const ECRANS = {
  "": ecranAujourdhui, aujourdhui: ecranAujourdhui, bienvenue: ecranBienvenue, premiere: ecranPremiere, voici: (r) => ecranVoici(r.params),
  ecrire: (r) => ecranEcrire(r.params), fin: (r) => ecranFin(r.arg), carnet: ecranCarnet, page: (r) => ecranPage(r.arg),
  confort: (r) => { ecranConfort(r.params); nav("confort"); }, sauvegarde: ecranSauvegarde, installer: ecranInstaller, code: ecranCode,
  peurs: ecranPeurs, favoris: ecranFavoris, porte: (r) => ecranPorte(r.params), apropos: ecranAPropos, changements: ecranChangements,
};
// Un écran lent (lecture des consignes) peut finir après un écran demandé ensuite : on réaffiche alors le bon.
let seqRoute = 0, dernierTermine = 0;
async function router() {
  const n = ++seqRoute;
  const r = route();
  if (r.nom !== "ecrire") fermerSeance(true);
  const f = ECRANS[r.nom] || ecranAujourdhui;
  try { await f(r); } catch (err) { console.error(err); ecran("Erreur", `<h1>${e(t("seance.erreur"))}</h1><p><a class="btn" href="#/aujourdhui">${e(t("fin.retour"))}</a></p>`); }
  if (n < dernierTermine) return router();
  dernierTermine = n;
}

// ---------------------------------------------------------------- démarrage
// Mises à jour (R15 : rien ne change sans prévenir).
// - Une version téléchargée pendant la visite attend : un avis propose « Appliquer maintenant », sinon…
// - …à l'ouverture suivante, elle s'applique d'elle-même avant le premier affichage, puis un avis le dit.
function serviceWorker() {
  if (!("serviceWorker" in navigator) || !isSecureContext) return Promise.resolve(null);
  let recharge = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if ((etat.majPrete || etat.majAuDemarrage) && !recharge) { recharge = true; location.reload(); } });
  return navigator.serviceWorker.register("sw.js").then((reg) => {
    const pret = (w) => { etat.majPrete = w; if (route().nom === "aujourdhui" || route().nom === "") router(); };
    reg.addEventListener("updatefound", () => {
      const w = reg.installing;
      w?.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) pret(w); });
    });
    if (reg.waiting && navigator.serviceWorker.controller) {
      if (!etat.dejaAffiche && !document.querySelector(".seance")) { etat.majAuDemarrage = true; reg.waiting.postMessage("appliquer"); return "attente"; }
      pret(reg.waiting);
    }
    return reg;
  }).catch(() => null);
}

window.addEventListener("beforeinstallprompt", (ev) => { ev.preventDefault(); etat.installer = ev; });
document.addEventListener("carnet:langue", () => { appliquer(); nav("confort"); });
window.addEventListener("hashchange", router);
appliquer();
nav("aujourdhui");
// On attend un court instant l'enregistrement du service worker : si une version attend, elle s'applique
// avant le premier affichage (le rechargement suit). Sinon, ou au-delà de 800 ms, on affiche normalement.
const sw = serviceWorker();
(navigator.serviceWorker?.controller ? Promise.race([sw, new Promise((ok) => setTimeout(ok, 800))]) : Promise.resolve(null)).then((r) => {
  if (r !== "attente") return router();
  setTimeout(router, 2500); // filet : si le rechargement n'arrive pas
});
window.__carnet = { VERSION }; // repère pour les tests
