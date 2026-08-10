# Journal de l'agent

Entrée la plus récente en haut. Chaque agent lit les trois dernières avant d'agir.

## 2026-08-10 — mise en place

**Fait.** Création du projet : générateur statique sans dépendance (`build.mjs`),
feuille de style unique, quatre outils images, pages légales complètes exigées par
AdSense, sitemap et données structurées automatiques.

**Vérifié.** Les quatre outils ont été testés dans un navigateur réel, pas seulement
compilés.
- *Compression à poids cible* : 12 Mpx → 453 Ko pour une cible de 500 Ko (91 % du
  budget utilisé, qualité 0,84), garantie tenue sur toutes les cibles testées.
  Cas limites vérifiés : petite image (qualité 0,96), cible impossible (échec propre,
  pas de boucle), transparence WebP conservée.
- *Redimensionnement* : 35 × 45 mm à 300 ppp → 413 × 531 px, conforme au tableau
  affiché sur la page ; conservation des proportions correcte.
- *Conversion* : 3 fichiers sur 3, extensions et fond blanc corrects.
- *Signature* : photo 1200 × 600 avec fond dégradé → PNG 504 × 165 détouré et rogné
  au trait près.

**Constaté.** Deux défauts trouvés et corrigés pendant les tests :
1. La recherche du poids cible encodait dix fois en pleine résolution (10,8 s sur
   12 Mpx). Mesure faite : `drawImage` coûte 4 ms, `toBlob` 571 ms en 12 Mpx contre
   61 ms en 1 Mpx. L'exploration se fait désormais sur une vignette de 1 Mpx et une
   seule mesure pleine résolution calibre le modèle. Deux encodages pleins au lieu
   de dix, et le budget passe de 42 % à 91 % utilisé.
2. `.field { display: flex }` écrasait l'attribut HTML `hidden` : des champs sans
   objet restaient affichés. Corrigé par `[hidden] { display: none !important }`.

**Décision requise.** Le site ne peut pas être publié tant que l'éditeur n'a pas :
créé les comptes GitHub et Cloudflare Pages, renseigné son identité dans
`src/pages/mentions-legales.html` et son adresse e-mail dans `src/pages/contact.html`.
Voir `ACTIONS-POUR-TOI.md`. Sans cela, `git push` échouera et rien ne sera en ligne.

**Ensuite.** Une fois le dépôt distant en place : créer
`flouter-visage-plaque-photo` puis `supprimer-metadonnees-exif-photo` (priorité 1 du
backlog, tous deux cohérents avec le positionnement confidentialité et réalisables
sans aucune dépendance externe).
