/* Helpers partagés par tous les outils. Aucun réseau, aucun tracking. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Formate un nombre d'octets en Ko / Mo lisibles. */
export function poids(octets) {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(2)} Mo`;
}

/**
 * Câble une zone de dépôt : clic, glisser-déposer et coller.
 * `onFiles` reçoit un tableau de File.
 */
export function zoneDepot(zone, onFiles, { accept = 'image/*', multiple = false } = {}) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = multiple;
  zone.appendChild(input);

  zone.tabIndex = 0;
  zone.setAttribute('role', 'button');

  const ouvrir = () => input.click();
  zone.addEventListener('click', (e) => { if (e.target !== input) ouvrir(); });
  zone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ouvrir(); }
  });

  input.addEventListener('change', () => {
    if (input.files.length) onFiles([...input.files]);
  });

  ['dragenter', 'dragover'].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('is-over'); })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('is-over'); })
  );
  zone.addEventListener('drop', (e) => {
    const files = [...(e.dataTransfer?.files ?? [])];
    if (files.length) onFiles(multiple ? files : [files[0]]);
  });

  window.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files ?? [])];
    if (files.length) onFiles(multiple ? files : [files[0]]);
  });

  return input;
}

/** Charge un File image en HTMLImageElement (via bitmap pour l'orientation EXIF). */
export async function chargerImage(file) {
  if ('createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return bitmap;
    } catch { /* on retombe sur <img> */ }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Format d’image non reconnu par ce navigateur.')); };
    img.src = url;
  });
}

/** Dessine une source (bitmap ou img) dans un canvas aux dimensions données. */
export function versCanvas(source, largeur, hauteur, fond = null) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(largeur));
  canvas.height = Math.max(1, Math.round(hauteur));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (fond) {
    ctx.fillStyle = fond;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** canvas.toBlob promisifié. */
export function versBlob(canvas, type, qualite) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Export impossible.'))),
      type,
      qualite
    );
  });
}

/** Rend la main au navigateur pour que l'interface ne se fige pas. */
const respirer = () => new Promise((r) => setTimeout(r, 0));

/**
 * Cherche la meilleure qualité JPEG/WebP tenant sous `cible` octets.
 *
 * Encoder une image de 12 Mpx coûte environ un demi-quart de seconde ; en
 * faire une dizaine bloquerait l'appareil plusieurs secondes. La recherche
 * se fait donc sur une vignette d'environ 1 Mpx, dix fois moins chère, en
 * s'appuyant sur le fait que le poids d'un JPEG est à peu près proportionnel
 * au nombre de pixels à qualité constante. La pleine résolution n'est
 * encodée qu'à la fin, puis corrigée si l'estimation était optimiste — ce
 * qui garantit que le résultat tient réellement sous la cible.
 *
 * `onEssai(n)` est appelé avant chaque encodage, pour la progression.
 */
export async function compresserSous(source, cible, type = 'image/jpeg', onEssai = () => {}) {
  const L = source.width, H = source.height;
  const fond = type === 'image/jpeg' ? '#ffffff' : null;
  let n = 0;

  const encoder = async (canvas, q) => {
    onEssai(++n);
    await respirer();
    return versBlob(canvas, type, q);
  };
  const pleinFormat = (echelle, q) =>
    encoder(versCanvas(source, L * echelle, H * echelle, fond), q);

  const kVignette = Math.min(1, Math.sqrt(1e6 / (L * H)));
  const facteur = kVignette * kVignette;          // pixels vignette / pixels d'origine
  const vignette = versCanvas(source, L * kVignette, H * kVignette, fond);

  /** Dichotomie sur la vignette : plus haute qualité dont le poids extrapolé tient sous `visee`. */
  async function chercherQualite(visee) {
    let bas = 0.05, haut = 0.97, q = null, taille = null;
    for (let i = 0; i < 6; i++) {
      const essai = (bas + haut) / 2;
      const b = await encoder(vignette, essai);
      if (b.size / facteur <= visee) { q = essai; taille = b.size; bas = essai; }
      else { haut = essai; }
    }
    return { q, taille };
  }

  /** Garantie dure : tant que ça dépasse, on réduit les dimensions. */
  async function ramenerSousCible(blob, echelle, q) {
    for (let i = 0; i < 5 && blob.size > cible; i++) {
      echelle *= Math.sqrt(cible / blob.size) * 0.96;
      if (echelle < 0.02) return null;
      blob = await pleinFormat(echelle, q);
    }
    return blob.size <= cible ? { blob, qualite: q, echelle } : null;
  }

  /* --- Phase 1 : exploration sur la vignette --- */

  const { q: q1, taille: tailleVignette } = await chercherQualite(cible);

  if (q1 === null) {
    // Aucune qualité ne suffit à ces dimensions : il faut réduire l'image.
    const plancher = await encoder(vignette, 0.05);
    const estimation = plancher.size / facteur;
    if (!(estimation > 0)) return null;
    const echelle = Math.min(1, Math.sqrt(cible / estimation) * 0.95);
    if (echelle < 0.02) return null;
    const q = 0.62;
    return ramenerSousCible(await pleinFormat(echelle, q), echelle, q);
  }

  /* --- Phase 2 : une mesure en pleine résolution, qui calibre le modèle --- */

  let blob = await pleinFormat(1, q1);
  let qualite = q1;

  // Le poids d'un JPEG n'est pas exactement proportionnel au nombre de pixels :
  // une vignette concentre le détail et fait surestimer le plein format. Cette
  // mesure donne le biais réel, dont on corrige la visée avant de recommencer.
  const biais = blob.size / (tailleVignette / facteur);

  if (biais > 0 && (blob.size > cible || blob.size < cible * 0.82)) {
    const { q: q2 } = await chercherQualite(cible / biais);
    if (q2 !== null) {
      const essai = await pleinFormat(1, q2);
      if (essai.size <= cible && (blob.size > cible || essai.size > blob.size)) {
        blob = essai;
        qualite = q2;
      }
    }
  }

  return ramenerSousCible(blob, 1, qualite);
}

/** Déclenche le téléchargement d'un Blob. */
export function telecharger(blob, nom) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Remplace l'extension d'un nom de fichier. */
export function renommer(nom, extension) {
  return `${nom.replace(/\.[^.]+$/, '')}.${extension}`;
}

/** Affiche un message d'état. */
export function etat(el, message, estErreur = false) {
  el.textContent = message;
  el.classList.toggle('error', estErreur);
}
