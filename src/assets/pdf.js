/*
 * Écriture de PDF minimaliste, sans aucune bibliothèque.
 *
 * Les convertisseurs concurrents chargent pdf-lib (près d'un mégaoctet) depuis
 * un CDN, ce qui casse la promesse du site : plus rien ne marche hors ligne, et
 * un tiers voit passer la requête. Un PDF contenant des images est en réalité un
 * format assez simple — une suite d'objets numérotés et une table d'index — et
 * un JPEG peut y être inséré tel quel via le filtre DCTDecode, sans réencodage
 * ni perte de qualité.
 */

const ENCODEUR = new TextEncoder();

/** Dimensions des formats de page, en points PostScript (72 pt = 1 pouce). */
export const FORMATS = {
  a4:      { l: 595.28, h: 841.89, nom: 'A4' },
  a5:      { l: 419.53, h: 595.28, nom: 'A5' },
  letter:  { l: 612,    h: 792,    nom: 'Lettre US' },
};

/**
 * Construit un PDF à partir d'images JPEG déjà encodées.
 * `images` : [{ octets: Uint8Array, largeur, hauteur }]
 * `options` : { format, orientation: 'auto'|'portrait'|'paysage', marge (mm), ajuster: 'contenir'|'remplir' }
 */
export function pdfDepuisJpeg(images, options = {}) {
  const {
    format = 'a4',
    orientation = 'auto',
    marge = 10,
    ajuster = 'contenir',
  } = options;

  const objets = [];                        // objets[i] = contenu de l'objet i+1
  const ajouter = (contenu) => { objets.push(contenu); return objets.length; };

  const numPages = ajouter(null);           // réservé : l'objet Pages
  const refsPages = [];

  for (const img of images) {
    const base = FORMATS[format] ?? FORMATS.a4;
    const paysage = orientation === 'paysage'
      || (orientation === 'auto' && img.largeur > img.hauteur);
    const pageL = paysage ? base.h : base.l;
    const pageH = paysage ? base.l : base.h;

    const m = (marge / 25.4) * 72;           // millimètres → points
    const utileL = Math.max(1, pageL - 2 * m);
    const utileH = Math.max(1, pageH - 2 * m);

    const k = ajuster === 'remplir'
      ? Math.max(utileL / img.largeur, utileH / img.hauteur)
      : Math.min(utileL / img.largeur, utileH / img.hauteur);
    const l = img.largeur * k;
    const h = img.hauteur * k;
    const x = (pageL - l) / 2;
    const y = (pageH - h) / 2;

    const numImage = ajouter({
      dict: `<< /Type /XObject /Subtype /Image /Width ${img.largeur} /Height ${img.hauteur} ` +
            `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.octets.length} >>`,
      flux: img.octets,
    });

    const instructions = `q\n${l.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/I0 Do\nQ\n`;
    const numContenu = ajouter({
      dict: `<< /Length ${ENCODEUR.encode(instructions).length} >>`,
      flux: ENCODEUR.encode(instructions),
    });

    refsPages.push(ajouter(
      `<< /Type /Page /Parent ${numPages} 0 R /MediaBox [0 0 ${pageL.toFixed(2)} ${pageH.toFixed(2)}] ` +
      `/Resources << /XObject << /I0 ${numImage} 0 R >> >> /Contents ${numContenu} 0 R >>`
    ));
  }

  objets[numPages - 1] =
    `<< /Type /Pages /Kids [${refsPages.map((n) => `${n} 0 R`).join(' ')}] /Count ${refsPages.length} >>`;

  const numCatalogue = ajouter(`<< /Type /Catalog /Pages ${numPages} 0 R >>`);
  const numInfo = ajouter(
    `<< /Producer (Outilo) /CreationDate (D:${horodatage()}) >>`
  );

  /* --- Assemblage binaire --- */

  const morceaux = [];
  let taille = 0;
  const ecrire = (donnees) => {
    const u = typeof donnees === 'string' ? ENCODEUR.encode(donnees) : donnees;
    morceaux.push(u);
    taille += u.length;
  };

  ecrire('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  const positions = [];
  objets.forEach((objet, i) => {
    positions[i] = taille;
    ecrire(`${i + 1} 0 obj\n`);
    if (typeof objet === 'string') {
      ecrire(`${objet}\nendobj\n`);
    } else {
      ecrire(`${objet.dict}\nstream\n`);
      ecrire(objet.flux);
      ecrire('\nendstream\nendobj\n');
    }
  });

  const debutXref = taille;
  ecrire(`xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`);
  for (const pos of positions) {
    ecrire(`${String(pos).padStart(10, '0')} 00000 n \n`);
  }
  ecrire(
    `trailer\n<< /Size ${objets.length + 1} /Root ${numCatalogue} 0 R /Info ${numInfo} 0 R >>\n` +
    `startxref\n${debutXref}\n%%EOF\n`
  );

  return new Blob(morceaux, { type: 'application/pdf' });
}

function horodatage() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
