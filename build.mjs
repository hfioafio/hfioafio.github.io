#!/usr/bin/env node
/**
 * Génère le site statique dans site/ à partir de config.json, tools.json
 * et des fragments src/outils/*.html.
 *
 * Aucune dépendance npm : ce script doit pouvoir tourner sans surveillance
 * pendant des années sans casser à cause d'une mise à jour de paquet.
 */

import { readFile, writeFile, mkdir, rm, cp, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const racine = path.dirname(fileURLToPath(import.meta.url));
const p = (...s) => path.join(racine, ...s);

const config = JSON.parse(await readFile(p('config.json'), 'utf8'));
const outils = JSON.parse(await readFile(p('tools.json'), 'utf8'));
const { site, categories } = config;
const base = site.baseUrl.replace(/\/$/, '');

const echapper = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------------ */
/* Gabarit                                                             */
/* ------------------------------------------------------------------ */

function entete() {
  return `<header class="site-header">
    <div class="wrap">
      <a class="brand" href="/"><span class="brand-mark" aria-hidden="true">◈</span>${echapper(site.name)}</a>
      <nav class="site-nav">
        <a href="/">Tous les outils</a>
        <a href="/a-propos/">À propos</a>
        <a href="/contact/">Contact</a>
      </nav>
    </div>
  </header>`;
}

function pied() {
  return `<footer class="site-footer">
    <div class="wrap">
      <p>© ${new Date().getFullYear()} ${echapper(site.name)} — outils gratuits, traitement local.</p>
      <nav>
        <a href="/a-propos/">À propos</a>
        <a href="/contact/">Contact</a>
        <a href="/confidentialite/">Confidentialité</a>
        <a href="/mentions-legales/">Mentions légales</a>
        <a href="/conditions/">Conditions d'utilisation</a>
      </nav>
    </div>
  </footer>`;
}

function scriptsAnalytics() {
  const morceaux = [];
  if (site.cloudflareAnalyticsToken) {
    morceaux.push(
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" ` +
      `data-cf-beacon='{"token":"${site.cloudflareAnalyticsToken}"}'></script>`
    );
  }
  if (site.adsEnabled && site.adsenseClientId) {
    morceaux.push(
      `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${site.adsenseClientId}" crossorigin="anonymous"></script>`
    );
  }
  return morceaux.join('\n  ');
}

/** Extrait les <details><summary>Q</summary><p>R</p></details> pour le schéma FAQPage. */
function faqDepuisHtml(html) {
  const faq = [];
  const bloc = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;
  let m;
  while ((m = bloc.exec(html))) {
    const question = m[1].replace(/<[^>]+>/g, '').trim();
    const reponse = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (question && reponse) faq.push({ question, reponse });
  }
  return faq;
}

function jsonLd(objets) {
  return objets
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    .join('\n  ');
}

function page({ titre, description, corps, url, schemas = [], fildAriane = '' }) {
  const canonique = `${base}${url}`;
  const verif = site.searchConsoleVerification
    ? `<meta name="google-site-verification" content="${echapper(site.searchConsoleVerification)}">`
    : '';

  return `<!doctype html>
<html lang="${site.lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${echapper(titre)}</title>
  <meta name="description" content="${echapper(description)}">
  <link rel="canonical" href="${canonique}">
  ${verif}
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${echapper(site.name)}">
  <meta property="og:title" content="${echapper(titre)}">
  <meta property="og:description" content="${echapper(description)}">
  <meta property="og:url" content="${canonique}">
  <meta property="og:locale" content="fr_FR">
  <meta name="twitter:card" content="summary">
  <link rel="stylesheet" href="/assets/style.css">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  ${jsonLd(schemas)}
  ${scriptsAnalytics()}
</head>
<body>
  ${entete()}
  <main>
    <div class="wrap">
      ${fildAriane}
      ${corps}
    </div>
  </main>
  ${pied()}
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* Emplacements publicitaires                                          */
/* ------------------------------------------------------------------ */

function emplacementPub() {
  if (!site.adsEnabled || !site.adsenseClientId) return '';
  return `<div class="ad-slot">
        <ins class="adsbygoogle" style="display:block" data-ad-client="${site.adsenseClientId}"
             data-ad-format="auto" data-full-width-responsive="true"></ins>
        <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
      </div>`;
}

/* ------------------------------------------------------------------ */
/* Pages outils                                                        */
/* ------------------------------------------------------------------ */

const publies = outils.filter((o) => o.status === 'live');

async function construireOutils() {
  for (const outil of publies) {
    const chemin = p('src', 'outils', `${outil.slug}.html`);
    if (!existsSync(chemin)) {
      console.warn(`⚠  fragment manquant, outil ignoré : ${outil.slug}`);
      continue;
    }
    const fragment = await readFile(chemin, 'utf8');
    const faq = faqDepuisHtml(fragment);

    const schemas = [
      {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: outil.h1 || outil.title,
        description: outil.description,
        url: `${base}/outils/${outil.slug}/`,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Tout navigateur web',
        inLanguage: 'fr-FR',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil', item: `${base}/` },
          { '@type': 'ListItem', position: 2, name: outil.h1 || outil.title, item: `${base}/outils/${outil.slug}/` },
        ],
      },
    ];

    if (faq.length) {
      schemas.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faq.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.reponse },
        })),
      });
    }

    const autres = publies
      .filter((o) => o.slug !== outil.slug && o.category === outil.category)
      .slice(0, 4);

    const connexes = autres.length
      ? `<h2>Outils du même genre</h2>
      <div class="grid">
        ${autres.map((o) => `<a class="card" href="/outils/${o.slug}/"><strong>${echapper(o.h1 || o.title)}</strong><span>${echapper(o.description.split('.')[0])}.</span></a>`).join('\n        ')}
      </div>`
      : '';

    const corps = `<h1>${echapper(outil.h1 || outil.title)}</h1>
      <p class="lede">${echapper(outil.description)}</p>
      ${fragment}
      ${emplacementPub()}
      ${connexes}`;

    const dossier = p('site', 'outils', outil.slug);
    await mkdir(dossier, { recursive: true });
    await writeFile(
      path.join(dossier, 'index.html'),
      page({
        titre: `${outil.title} — ${site.name}`,
        description: outil.description,
        corps,
        url: `/outils/${outil.slug}/`,
        schemas,
        fildAriane: `<p class="breadcrumb"><a href="/">Accueil</a> › ${echapper(outil.h1 || outil.title)}</p>`,
      })
    );
  }
}

/* ------------------------------------------------------------------ */
/* Accueil                                                             */
/* ------------------------------------------------------------------ */

async function construireAccueil() {
  const parCategorie = {};
  for (const o of publies) (parCategorie[o.category] ??= []).push(o);

  const sections = Object.entries(categories)
    .filter(([cle]) => parCategorie[cle]?.length)
    .map(([cle, cat]) => {
      const cartes = parCategorie[cle]
        .map(
          (o) => `<a class="card" href="/outils/${o.slug}/">
          <strong>${echapper(o.h1 || o.title)}</strong>
          <span>${echapper(o.description.split('.')[0])}.</span>
        </a>`
        )
        .join('\n        ');
      return `<h2 class="cat-title"><span aria-hidden="true">${cat.icon}</span> ${echapper(cat.label)}</h2>
      <div class="grid">
        ${cartes}
      </div>`;
    })
    .join('\n      ');

  const corps = `<h1>${echapper(site.tagline)}</h1>
      <p class="lede">Un téléservice refuse votre fichier ? Il est trop lourd, au mauvais format ou aux mauvaises dimensions. ${publies.length} outils gratuits pour le corriger en quelques secondes — sans inscription, sans limite, et sans que vos documents quittent votre appareil.</p>

      <h2>Un fichier refusé, une solution</h2>
      <div class="prose">
        <div class="scroll-x">
          <table>
            <thead><tr><th>Ce que le site vous répond</th><th>Ce qu'il faut faire</th></tr></thead>
            <tbody>
              <tr><td>« Fichier trop volumineux », « 1 Mo maximum »</td><td><a href="/outils/compresser-image-taille-precise/">Compresser sous un poids exact</a></td></tr>
              <tr><td>« Photo non conforme », « 50 Ko maximum »</td><td><a href="/outils/photo-identite-ants-format-poids/">Photo d'identité au format ANTS</a></td></tr>
              <tr><td>« Format non accepté », « PDF uniquement »</td><td><a href="/outils/convertir-jpg-en-pdf/">Transformer ses photos en PDF</a></td></tr>
              <tr><td>« Dimensions incorrectes »</td><td><a href="/outils/redimensionner-image-dimensions-exactes/">Redimensionner en pixels ou millimètres</a></td></tr>
              <tr><td>Document à signer sans imprimante</td><td><a href="/outils/signature-png-fond-transparent/">Créer sa signature transparente</a></td></tr>
              <tr><td>Masquer une adresse ou un RIB avant envoi</td><td><a href="/outils/flouter-visage-plaque-photo/">Masquer une zone définitivement</a></td></tr>
            </tbody>
          </table>
        </div>
      </div>

      ${sections}
      ${emplacementPub()}
      <h2>Pourquoi ces outils sont différents</h2>
      <div class="prose">
        <p><strong>Rien n'est téléversé.</strong> La plupart des convertisseurs en ligne envoient votre fichier sur un serveur. Ici, le traitement se fait entièrement dans votre navigateur : votre photo de carte d'identité ou votre contrat signé ne transitent nulle part.</p>
        <p><strong>Aucune limite artificielle.</strong> Pas de « 3 fichiers par heure », pas de filigrane, pas de compte à créer pour récupérer son propre fichier.</p>
        <p><strong>Ça fonctionne hors ligne.</strong> Une fois la page chargée, vous pouvez couper votre connexion : les outils continuent de marcher.</p>
      </div>`;

  await writeFile(
    p('site', 'index.html'),
    page({
      titre: `${site.name} — ${site.tagline}`,
      description: `${publies.length} outils en ligne gratuits pour vos images, PDF et fichiers du quotidien. Traitement 100 % local dans votre navigateur, sans inscription.`,
      corps,
      url: '/',
      schemas: [
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: site.name,
          url: `${base}/`,
          inLanguage: 'fr-FR',
        },
      ],
    })
  );
}

/* ------------------------------------------------------------------ */
/* Pages éditoriales et légales                                        */
/* ------------------------------------------------------------------ */

async function construirePages() {
  const fichiers = existsSync(p('src', 'pages')) ? await readdir(p('src', 'pages')) : [];
  for (const fichier of fichiers.filter((f) => f.endsWith('.html'))) {
    const brut = await readFile(p('src', 'pages', fichier), 'utf8');
    const meta = /^<!--\s*([\s\S]*?)-->/.exec(brut);
    if (!meta) { console.warn(`⚠  page sans en-tête JSON : ${fichier}`); continue; }
    const { slug, title, description } = JSON.parse(meta[1]);
    const corps = brut.slice(meta[0].length).trim();

    const dossier = slug === '' ? p('site') : p('site', slug);
    await mkdir(dossier, { recursive: true });
    await writeFile(
      path.join(dossier, 'index.html'),
      page({
        titre: `${title} — ${site.name}`,
        description,
        corps: `<h1>${echapper(title)}</h1>\n<div class="prose">${corps}</div>`,
        url: `/${slug}/`,
      })
    );
  }
}

/* ------------------------------------------------------------------ */
/* sitemap.xml, robots.txt, 404                                        */
/* ------------------------------------------------------------------ */

async function construireMeta() {
  const pagesStatiques = ['', 'a-propos', 'contact', 'confidentialite', 'mentions-legales', 'conditions'];
  const urls = [
    ...pagesStatiques.map((s) => ({ loc: `${base}/${s ? s + '/' : ''}`, prio: s === '' ? '1.0' : '0.3' })),
    ...publies.map((o) => ({ loc: `${base}/outils/${o.slug}/`, prio: '0.8', lastmod: o.updatedAt || o.createdAt })),
  ];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}<priority>${u.prio}</priority></url>`
  )
  .join('\n')}
</urlset>
`;
  await writeFile(p('site', 'sitemap.xml'), sitemap);

  await writeFile(
    p('site', 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`
  );

  await writeFile(
    p('site', '404.html'),
    page({
      titre: 'Page introuvable',
      description: 'Cette page n’existe pas ou plus.',
      corps: `<h1>Page introuvable</h1><p class="lede">Cette adresse ne correspond à aucun outil. <a href="/">Revenir à la liste des outils</a>.</p>`,
      url: '/404.html',
    })
  );

  await writeFile(p('site', '_headers'), `/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
}

/* ------------------------------------------------------------------ */

async function main() {
  await rm(p('site'), { recursive: true, force: true });
  await mkdir(p('site'), { recursive: true });
  await cp(p('src', 'assets'), p('site', 'assets'), { recursive: true });

  await construireOutils();
  await construireAccueil();
  await construirePages();
  await construireMeta();

  console.log(`✓ Site généré : ${publies.length} outil(s), ${outils.length - publies.length} en brouillon.`);
  console.log(`  Publicité : ${site.adsEnabled && site.adsenseClientId ? 'activée' : 'désactivée'}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
