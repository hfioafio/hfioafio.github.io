# Journal de l'agent

Entrée la plus récente en haut. Chaque agent lit les trois dernières avant d'agir.

## 2026-08-10 — site en ligne, planification changée de mécanisme

**Fait.** Le site est publié : <https://hfioafio.github.io/>, dépôt
<https://github.com/hfioafio/hfioafio.github.io>, déploiement automatique par
GitHub Actions à chaque push. Projet déplacé de iCloud Drive vers
`/Users/anthony_1/outilo`.

**Vérifié.** En production, pas seulement en local : la page d'accueil et les pages
outils répondent 200, toutes les ressources sont servies (style.css, outil.js,
pdf.js, exif.js, sitemap.xml, robots.txt). Le convertisseur d'images en PDF a été
exécuté sur le site public et produit un PDF de 2 pages valide, en-tête `%PDF-1.4`,
`%%EOF` correct, MediaBox A4 portrait puis paysage — l'orientation automatique
fonctionne en ligne.

**Constaté.** Trois problèmes d'environnement, deux corrigés et un contourné.
1. L'identité git globale de la machine est un nom et une adresse e-mail réels.
   Elle se serait inscrite dans chaque commit d'un dépôt public. Corrigée en
   `Outilo <agent@outilo.local>` **au niveau local du dépôt**. Ne jamais commiter
   sans vérifier ce point.
2. Le projet était dans iCloud Drive, où macOS interdit l'accès aux tâches
   planifiées (« Operation not permitted », code 126). D'où le déplacement.
3. **launchd est une impasse pour ce projet.** Même avec `SessionCreate`, le CLI
   lancé par launchd répond « Not logged in » : son accès au trousseau dépend d'un
   contexte d'application graphique. Le contournement par Terminal via `osascript`
   exige une autorisation « Automatisation » que seul l'utilisateur peut accorder.
   La tâche launchd a donc été désinstallée.

**Ensuite.** La planification passe désormais par le planificateur intégré de
l'application Claude (tâche `outilo-quotidien`, tous les jours à 9 h 12), qui
s'exécute dans un contexte déjà authentifié. Contrepartie : la tâche ne tourne que
si l'application est ouverte ; sinon l'exécution a lieu au lancement suivant.
`agent/run.sh` reste utilisable pour un déclenchement manuel depuis un terminal.

Prochain outil à créer : `caviarder-document-pdf-image`, puis
`signer-pdf-avec-signature` (priorité 1 du backlog).

## 2026-08-10 — trois outils de plus, agent installé

**Fait.** Ajout de `convertir-jpg-en-pdf`, `flouter-visage-plaque-photo` et
`supprimer-metadonnees-exif-photo`. Sept outils en ligne, douze au backlog.
Deux modules nouveaux, tous deux écrits sans dépendance : `src/assets/pdf.js`
(écriture de PDF, insertion des JPEG via DCTDecode sans réencodage) et
`src/assets/exif.js` (lecture des champs EXIF et conversion GPS).

**Vérifié.**
- *PDF* : fichier généré depuis Node, puis accepté par trois moteurs indépendants —
  libmagic (« PDF document, version 1.4, 2 pages »), QuickLook (vignette produite) et
  ImageIO (page 1 rendue en 842 × 595, soit A4 paysage, orientation automatique
  correcte). Le rendu affiche bien l'image, centrée avec ses marges.
- *EXIF* : testé sur un JPEG fabriqué octet par octet avec bloc APP1 complet.
  Fabricant, modèle et date lus correctement ; GPS 48° 51′ 30,24″ N / 2° 17′ 40,2″ E
  converti en 48.8584 / 2.2945, exact. Contrôle négatif : un JPEG sans EXIF renvoie
  bien `null`.
- *Masquage* : pixellisation 251 → 18 couleurs distinctes ; mode noir uniformément
  `rgb(0,0,0)` ; flou, écart-type local 119 → 1,5 (−99 %), sans halo de bord et sans
  altérer le reste de l'image.

**Constaté.** Deux choses.
1. Le flou dessinait le canvas sur lui-même avec un filtre actif — accepté par Chrome
   mais au comportement variable ailleurs. Réécrit avec un canvas intermédiaire et
   un débord égal à deux fois le rayon, pour éviter l'éclaircissement des bords.
2. **Blocage majeur : `claude -p` répond « Not logged in ».** Testé dans le bac à
   sable et hors bac à sable, même résultat, alors que le trousseau contient bien un
   élément « Claude Code-credentials ». La session de l'application de bureau ne vaut
   pas authentification pour la ligne de commande. Conséquence : sans correctif,
   l'agent aurait échoué **en silence** tous les matins. `agent/run.sh` teste
   désormais l'authentification avant de commencer et envoie une notification macOS
   en cas d'échec.

**Décision requise.** Étape 0 de `ACTIONS-POUR-TOI.md` : ouvrir un Terminal, lancer
`claude`, faire `/login`. Deux minutes, et c'est ce qui conditionne toute
l'autonomie. Restent ensuite GitHub, Cloudflare et l'identité de l'éditeur.

**Ensuite.** Une fois l'authentification faite et le dépôt distant en place :
`caviarder-document-pdf-image` puis `signer-pdf-avec-signature` (priorité 1, et le
module `pdf.js` maison couvre déjà l'écriture). Pour la lecture de PDF existants, il
faudra soit étendre `pdf.js`, soit accepter pdf.js de Mozilla en chargement différé —
arbitrer en tenant compte de la règle « tout doit marcher hors ligne ».

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
