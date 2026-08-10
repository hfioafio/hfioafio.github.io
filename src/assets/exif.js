/*
 * Lecture des métadonnées EXIF d'un JPEG, sans bibliothèque.
 *
 * L'objectif n'est pas de tout décoder, mais de montrer à l'utilisateur ce que
 * sa photo révèle vraiment de lui : où elle a été prise, quand, et avec quoi.
 * On ne lit donc que les champs qui posent un problème de vie privée.
 */

const CHAMPS = {
  0x010f: ['Fabricant de l’appareil', 'appareil'],
  0x0110: ['Modèle de l’appareil', 'appareil'],
  0x0131: ['Logiciel utilisé', 'appareil'],
  0x0132: ['Date de modification', 'date'],
  0x9003: ['Date de prise de vue', 'date'],
  0x9004: ['Date de numérisation', 'date'],
  0x013b: ['Auteur', 'identite'],
  0x8298: ['Copyright', 'identite'],
  0xa434: ['Objectif', 'appareil'],
  0x829a: ['Temps d’exposition', 'technique'],
  0x829d: ['Ouverture', 'technique'],
  0x8827: ['Sensibilité ISO', 'technique'],
};

const CHAMPS_GPS = {
  0x0001: 'refLat', 0x0002: 'lat',
  0x0003: 'refLon', 0x0004: 'lon',
  0x0005: 'refAlt', 0x0006: 'alt',
};

/**
 * Renvoie { champs: [{nom, valeur, categorie}], position: {lat, lon}|null, brutOctets }
 * ou null si le fichier ne contient pas de bloc EXIF.
 */
export async function lireExif(file) {
  const buffer = await file.arrayBuffer();
  const vue = new DataView(buffer);
  if (vue.byteLength < 4 || vue.getUint16(0) !== 0xffd8) return null;   // pas un JPEG

  // Parcours des segments jusqu'à trouver APP1 / "Exif\0\0".
  let pos = 2, debutExif = -1, tailleExif = 0;
  while (pos + 4 <= vue.byteLength) {
    if (vue.getUint8(pos) !== 0xff) break;
    const marqueur = vue.getUint8(pos + 1);
    if (marqueur === 0xda || marqueur === 0xd9) break;                  // début image
    const taille = vue.getUint16(pos + 2);
    if (marqueur === 0xe1 && vue.getUint32(pos + 4) === 0x45786966) {
      debutExif = pos + 10;
      tailleExif = taille;
      break;
    }
    pos += 2 + taille;
  }
  if (debutExif < 0) return null;

  const boutisme = vue.getUint16(debutExif);
  const petit = boutisme === 0x4949;                                    // "II" = petit-boutiste
  if (!petit && boutisme !== 0x4d4d) return null;

  const u16 = (o) => vue.getUint16(o, petit);
  const u32 = (o) => vue.getUint32(o, petit);

  const champs = [];
  let gps = {};

  function lireValeur(o) {
    const type = u16(o + 2), n = u32(o + 4);
    const tailles = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };
    const octets = (tailles[type] ?? 1) * n;
    const depart = octets > 4 ? debutExif + u32(o + 8) : o + 8;
    if (depart < 0 || depart + octets > vue.byteLength) return null;

    if (type === 2) {                                                   // chaîne ASCII
      let s = '';
      for (let i = 0; i < n - 1; i++) s += String.fromCharCode(vue.getUint8(depart + i));
      return s.replace(/\0/g, '').trim();
    }
    if (type === 3) return u16(depart);
    if (type === 4) return u32(depart);
    if (type === 5 || type === 10) {                                    // rationnels
      const vals = [];
      for (let i = 0; i < n; i++) {
        const num = u32(depart + i * 8), den = u32(depart + i * 8 + 4);
        vals.push(den ? num / den : 0);
      }
      return n === 1 ? vals[0] : vals;
    }
    return null;
  }

  function parcourirIFD(offsetIFD, dansGPS = false) {
    const base = debutExif + offsetIFD;
    if (base + 2 > vue.byteLength) return;
    const nb = u16(base);
    if (nb > 512) return;                                               // garde-fou
    for (let i = 0; i < nb; i++) {
      const o = base + 2 + i * 12;
      if (o + 12 > vue.byteLength) return;
      const tag = u16(o);

      if (dansGPS) {
        const cle = CHAMPS_GPS[tag];
        if (cle) gps[cle] = lireValeur(o);
        continue;
      }
      if (tag === 0x8769 || tag === 0x8825) {                           // sous-IFD Exif / GPS
        const sous = lireValeur(o);
        if (typeof sous === 'number') parcourirIFD(sous, tag === 0x8825);
        continue;
      }
      const def = CHAMPS[tag];
      if (def) {
        const v = lireValeur(o);
        if (v !== null && v !== '' && v !== undefined) {
          champs.push({ nom: def[0], valeur: String(v), categorie: def[1] });
        }
      }
    }
  }

  parcourirIFD(u32(debutExif + 4));

  // Conversion degrés/minutes/secondes → décimal.
  let position = null;
  if (Array.isArray(gps.lat) && Array.isArray(gps.lon)) {
    const dec = (d) => d[0] + d[1] / 60 + d[2] / 3600;
    let lat = dec(gps.lat), lon = dec(gps.lon);
    if (gps.refLat === 'S') lat = -lat;
    if (gps.refLon === 'W') lon = -lon;
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      position = { lat: +lat.toFixed(6), lon: +lon.toFixed(6) };
      if (typeof gps.alt === 'number') position.altitude = Math.round(gps.alt);
    }
  }

  return { champs, position, brutOctets: tailleExif };
}
