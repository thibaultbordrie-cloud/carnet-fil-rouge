// Petite couche IndexedDB. Tout reste dans le navigateur, sur l'appareil.
const NOM = "carnet-fil-rouge", VERSION_DB = 1;
let dbp = null;
function ouvrir() {
  if (dbp) return dbp;
  dbp = new Promise((ok, ko) => {
    const r = indexedDB.open(NOM, VERSION_DB);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("pages")) db.createObjectStore("pages", { keyPath: "id" }).createIndex("date", "date");
      if (!db.objectStoreNames.contains("peurs")) db.createObjectStore("peurs", { keyPath: "id" });
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "cle" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
  return dbp;
}
async function tx(store, mode, f) {
  const db = await ouvrir();
  return new Promise((ok, ko) => {
    const t = db.transaction(store, mode), s = t.objectStore(store);
    let res;
    Promise.resolve(f(s)).then((v) => (res = v));
    t.oncomplete = () => ok(res);
    t.onerror = () => ko(t.error);
    t.onabort = () => ko(t.error);
  });
}
const req = (r) => new Promise((ok, ko) => { r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });

export const tous = (store) => tx(store, "readonly", (s) => req(s.getAll()));
export const un = (store, id) => tx(store, "readonly", (s) => req(s.get(id)));
export const mettre = (store, obj) => tx(store, "readwrite", (s) => req(s.put(obj)));
export const retirer = (store, id) => tx(store, "readwrite", (s) => req(s.delete(id)));
export const meta = async (cle, defaut = null) => { const r = await un("meta", cle); return r ? r.valeur : defaut; };
export const setMeta = (cle, valeur) => mettre("meta", { cle, valeur });
export async function toutEffacer() {
  for (const s of ["pages", "peurs", "meta"]) await tx(s, "readwrite", (st) => req(st.clear()));
}

export const nouvelId = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
export function aujourdhui(d = new Date()) {
  const z = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}
// Pages triées dans l'ordre chronologique ; le numéro de page en découle.
export async function pagesChrono() {
  const p = await tous("pages");
  p.sort((a, b) => (a.date === b.date ? a.cree - b.cree : a.date < b.date ? -1 : 1));
  p.forEach((x, i) => (x.numero = i + 1));
  return p;
}
