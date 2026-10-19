// Séance d'écriture : plein écran, enregistrement à chaque frappe, minuteur doux, mode brouillard.
import { t, e, unite, nombre } from "./i18n.js";
import { lire, langueConsignes } from "./prefs.js";
import { un, mettre, nouvelId, aujourdhui, setMeta, meta } from "./db.js";
import { motsDe } from "./compte.js";
import { $, annoncer, aller, flash } from "./ui.js";

let courante = null; // { fermer() }

// depuisRetour : la séance se ferme parce qu'on a quitté l'écran (bouton Retour d'Android, geste, lien).
export function fermerSeance(depuisRetour = false) { if (courante) { courante.fermer(depuisRetour); courante = null; } }

function sonDoux() {
  try {
    const c = new (window.AudioContext || window.webkitAudioContext)();
    const o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(528, c.currentTime);
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.2);
    o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 1.3);
  } catch {}
}
export function signalFin(type) {
  if (type === "doux") sonDoux();
  if (type === "vibration" && navigator.vibrate) navigator.vibrate(180);
}

async function protegerStockage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await setMeta("stockageProtege", await navigator.storage.persist());
  } catch {}
}

// params : { pageId } pour continuer une page, ou { consigne } (objet consigne) ou rien (sans consigne).
export async function ouvrirSeance({ pageId = null, consigne = null } = {}) {
  fermerSeance();
  const p = lire();
  const langue = langueConsignes();
  let page = pageId ? await un("pages", pageId) : null;
  const nouvelle = !page;
  if (!page) {
    page = { id: nouvelId(), date: aujourdhui(), cree: Date.now(), modifie: Date.now(), consigne: consigne ? consigne.texte : null,
      consigneId: consigne ? consigne.id : null, consigneFamille: consigne ? consigne.famille : null, etiquette: null, texte: "", mots: 0, langue, prive: false, source: "seance" };
  }
  let enregistree = !nouvelle;
  const hote = $("#seance-hote");
  const minuteurDefaut = +p.minuteur;
  const consigneTexte = page.consigne;
  hote.innerHTML = `
  <section class="seance" role="dialog" aria-modal="true" aria-labelledby="seance-titre" data-brouillard="${e(p.brouillard)}">
    <h1 id="seance-titre" class="sr">${e(t("seance.titre"))}</h1>
    <div class="seance-haut">
      ${consigneTexte ? `<button type="button" class="rappel" aria-expanded="false" id="rappel"><span><b>${e(t("seance.consigne"))} :</b> ${e(consigneTexte)}</span><span class="sr" id="rappel-etat">${e(t("seance.deplier"))}</span></button>` : `<span class="rappel"></span>`}
      <button type="button" class="btn discret" id="vers-confort">${e(t("seance.confort"))}</button>
    </div>
    <div class="seance-papier">
      <div class="fiche ${p.brouillard !== "off" ? "brouillard-actif" : ""}" id="papier">
        <div class="miroir" id="miroir" aria-hidden="true"></div>
        <label for="ecrit" class="sr">${e(t("seance.zone"))}</label>
        <textarea id="ecrit" class="ecrit" lang="${e(page.langue || langue)}" placeholder="${e(t("seance.indice"))}" spellcheck="${p.correcteur === "on"}" autocorrect="${p.correcteur === "on" ? "on" : "off"}" autocapitalize="sentences"></textarea>
      </div>
    </div>
    <div class="seance-bas">
      <div class="choix-minuteur" role="group" aria-label="${e(t("seance.minuteur"))}">
        ${[0, 5, 10, 15].map((m) => `<button type="button" data-min="${m}" aria-pressed="${m === minuteurDefaut}">${m ? e(t("seance.minuteur.min", { n: m })) : e(t("seance.minuteur.aucun"))}</button>`).join("")}
      </div>
      <div class="minuteur-barre" id="barre-min" aria-hidden="true" ${minuteurDefaut && p.minuteurAffichage === "barre" ? "" : "hidden"}><i id="barre-min-i"></i></div>
      <p class="indice-seance" id="indice-dictee" ${page.texte ? "hidden" : ""}>${e(t("seance.dictee"))}</p>
      <p class="indice-seance raccourci-bureau">${e(t("seance.raccourci"))}</p>
      <div class="etat"><span id="statut" role="status">${enregistree ? e(t("seance.enregistre")) : ""}</span><span id="compte" ${p.compteur === "visible" ? "" : "hidden"}></span><span id="reste"></span></div>
      <div class="actions">
        ${p.brouillard !== "off" ? `<button type="button" class="btn" id="voir" aria-pressed="false" aria-describedby="voir-aide">${e(t("seance.voir"))}</button><span class="sr" id="voir-aide">${e(t("seance.voir.aide"))}</span>` : ""}
        <button type="button" class="btn principal" id="ranger">${e(t("seance.ranger"))}</button>
      </div>
    </div>
  </section>`;
  const cadre = $(".cadre"), barre = $("#barre");
  cadre.inert = true; barre.inert = true;
  const ta = $("#ecrit"), miroir = $("#miroir"), papier = $("#papier"), statut = $("#statut");
  const section = $(".seance");
  if (page.texte) section.classList.add("a-ecrit");
  ta.value = page.texte;

  // Brouillard : le miroir affiche le passé estompé, la partie en cours à pleine intensité.
  const majMiroir = () => {
    if (p.brouillard === "off") return;
    const v = ta.value;
    let coupe;
    if (p.brouillard === "doux") coupe = v.lastIndexOf("\n") + 1;
    else { const m = [...v.matchAll(/[.!?…]["»”]?\s+|\n/g)].pop(); coupe = m ? m.index + m[0].length : 0; }
    miroir.innerHTML = `<span class="passe">${e(v.slice(0, coupe))}</span>${e(v.slice(coupe))}\n`;
    miroir.scrollTop = ta.scrollTop;
  };
  ta.addEventListener("scroll", () => (miroir.scrollTop = ta.scrollTop));
  majMiroir();

  const majCompte = () => { const n = motsDe(ta.value, page.langue); $("#compte").textContent = t("seance.compte", { n: nombre(n), unite: unite(page.langue) }); };
  majCompte();

  // Enregistrement
  let minuterie = null, enCours = Promise.resolve();
  const enregistrer = async () => {
    if (!ta.value.trim() && !enregistree) return;
    page.texte = ta.value; page.mots = motsDe(page.texte, page.langue); page.modifie = Date.now();
    try {
      await mettre("pages", { ...page });
      statut.textContent = t("seance.enregistre");
      if (!enregistree) { enregistree = true; protegerStockage(); }
    } catch {
      statut.innerHTML = `${e(t("seance.erreur"))} <button type="button" class="btn discret" id="reessayer">${e(t("seance.reessayer"))}</button>`;
      $("#reessayer").onclick = () => (enCours = enregistrer());
    }
  };
  const planifier = () => { clearTimeout(minuterie); minuterie = setTimeout(() => (enCours = enregistrer()), 350); };
  const indice = $("#indice-dictee");
  ta.addEventListener("input", () => { majMiroir(); majCompte(); planifier(); demarrerMinuteur(); if (indice && ta.value) indice.hidden = true; if (ta.value) section.classList.add("a-ecrit"); });
  const vider = () => { clearTimeout(minuterie); enCours = enregistrer(); return enCours; };
  const surMasque = () => { if (document.visibilityState === "hidden") vider(); };
  document.addEventListener("visibilitychange", surMasque);
  window.addEventListener("pagehide", vider);

  // Minuteur doux : démarre à la première frappe ; à la fin, rien ne s'arrête.
  let duree = minuteurDefaut * 60, debut = null, tic = null, fini = false;
  const majMinuteur = () => {
    const ecoule = debut ? (Date.now() - debut) / 1000 : 0;
    const part = duree ? Math.min(1, ecoule / duree) : 0;
    $("#barre-min-i").style.width = part * 100 + "%";
    const resteMin = Math.ceil((duree - ecoule) / 60);
    $("#reste").textContent = duree && p.minuteurAffichage === "chiffres" && !fini
      ? (resteMin <= 1 ? t("seance.minuteur.reste1") : t("seance.minuteur.reste", { n: resteMin })) : "";
    if (duree && part >= 1 && !fini) {
      fini = true; clearInterval(tic);
      annoncer(t("seance.minuteur.fin"));
      if (p.minuteurAffichage !== "cache") $("#reste").textContent = t("seance.minuteur.fin");
      signalFin(p.son);
    }
  };
  function demarrerMinuteur() {
    if (!duree || debut) return;
    debut = Date.now(); tic = setInterval(majMinuteur, 1000); majMinuteur();
  }
  $(".choix-minuteur").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-min]"); if (!b) return;
    document.querySelectorAll(".choix-minuteur button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    duree = +b.dataset.min * 60; debut = null; fini = false; clearInterval(tic);
    $("#barre-min").hidden = !(duree && p.minuteurAffichage === "barre");
    majMinuteur();
    if (ta.value.trim()) demarrerMinuteur();
  });
  majMinuteur();

  // Rappel de la consigne
  const rappel = $("#rappel");
  if (rappel) rappel.onclick = () => {
    const o = rappel.getAttribute("aria-expanded") !== "true";
    rappel.setAttribute("aria-expanded", o);
    $("#rappel-etat").textContent = t(o ? "seance.replier" : "seance.deplier");
  };

  // Voir le texte (maintenir appuyé ; au clavier, bascule)
  const voir = $("#voir");
  if (voir) {
    const montrer = (o) => { papier.classList.toggle("revele", o); voir.setAttribute("aria-pressed", o); };
    voir.addEventListener("pointerdown", (ev) => { if (ev.pointerType !== "mouse" || ev.button === 0) montrer(true); });
    ["pointerup", "pointerleave", "pointercancel"].forEach((n) => voir.addEventListener(n, () => montrer(false)));
    voir.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); montrer(voir.getAttribute("aria-pressed") !== "true"); } });
    voir.addEventListener("click", (ev) => ev.preventDefault());
    voir.addEventListener("contextmenu", (ev) => ev.preventDefault());
  }

  // Le clavier ne masque pas la ligne en cours (R28)
  const vv = window.visualViewport;
  // Hauteur et décalage du viewport visible : sur iOS le clavier ne redimensionne pas la page,
  // sur Chrome Android (interactive-widget=resizes-content) si. Dans les deux cas la séance suit la zone visible.
  const ajuster = () => {
    const h = document.documentElement.style;
    h.setProperty("--vh", (vv ? vv.height : innerHeight) + "px");
    h.setProperty("--vt", (vv ? vv.offsetTop : 0) + "px");
  };
  ajuster(); vv?.addEventListener("resize", ajuster); vv?.addEventListener("scroll", ajuster);

  const ranger = async () => {
    await vider();
    const id = page.id, garde = enregistree;
    fermerSeance();
    aller(garde ? `#/fin/${id}` : "#/fin/vide");
  };
  $("#ranger").onclick = ranger;
  $("#vers-confort").onclick = async () => { await vider(); const id = page.id, garde = enregistree; fermerSeance(); aller(`#/confort?retour=${garde ? id : ""}`); };
  ta.addEventListener("keydown", (ev) => { if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") { ev.preventDefault(); ranger(); } });

  courante = {
    fermer(depuisRetour) {
      // Rien ne se perd : la dernière frappe est enregistrée même si l'on quitte par le bouton Retour.
      // (La lecture du texte se fait tout de suite ; l'écriture IndexedDB se termine ensuite d'elle-même.)
      const changee = ta.value !== page.texte;
      clearInterval(tic); clearTimeout(minuterie);
      if (changee) enCours = enregistrer();
      if (depuisRetour && (enregistree || ta.value.trim())) flash(e(t("seance.garde.retour")));
      document.removeEventListener("visibilitychange", surMasque);
      window.removeEventListener("pagehide", vider);
      vv?.removeEventListener("resize", ajuster); vv?.removeEventListener("scroll", ajuster);
      hote.innerHTML = ""; cadre.inert = false; barre.inert = false;
    },
  };
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);
  if (!(await meta("premiereSeance"))) await setMeta("premiereSeance", Date.now());
}
