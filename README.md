# Outilo

Site d'outils en ligne gratuits, en français, entièrement exécutés dans le navigateur.
Monétisation par publicité display. Alimenté et amélioré chaque jour par un agent
autonome.

**Première étape : [ACTIONS-POUR-TOI.md](ACTIONS-POUR-TOI.md).** Rien n'est en ligne
tant que ces sept étapes ne sont pas faites.

## Le modèle

Aucun serveur, donc aucun coût. Aucun compte utilisateur, donc aucun support à
assurer. Aucune donnée collectée, donc aucune obligation de conservation. Les outils
répondent à des besoins qui ne se démodent pas — réduire une photo pour un formulaire,
signer un document sans imprimante — ce qui rend le trafic durable une fois acquis.

Le pari : trente pages utiles qui rapportent chacune peu, pendant des années, sans
intervention.

## Structure

```
config.json          Nom, domaine, jetons d'analytics, activation de la publicité
tools.json           Catalogue des outils : slug, titre, description, mots-clés, statut
build.mjs            Générateur statique, sans aucune dépendance npm
src/assets/          Feuille de style et helpers JavaScript partagés
src/outils/*.html    Un fragment par outil : interface, texte, FAQ, script
src/pages/*.html     Pages éditoriales et légales
site/                Sortie générée — ne jamais éditer à la main
agent/quotidien.md   Les instructions que suit l'agent chaque jour
agent/backlog.json   Les prochains outils à créer, par priorité
agent/journal.md     Ce que l'agent a fait, mesuré et décidé
ops/                 Installation de la tâche planifiée macOS
```

## Commandes

```bash
node build.mjs                              # génère site/
python3 -m http.server 8787 --directory site  # prévisualise sur localhost:8787
bash ops/installer-agent.sh                 # installe la tâche quotidienne
launchctl kickstart -k gui/$(id -u)/com.outilo.agent   # déclenche l'agent maintenant
```

## Ajouter un outil à la main

1. Créer `src/outils/<slug>.html` — un bloc `.tool`, un bloc `.prose`, au moins
   quatre `<details>` de FAQ (le générateur en tire le balisage `FAQPage`).
2. Ajouter l'entrée dans `tools.json` avec `"status": "live"`.
3. `node build.mjs`, vérifier dans un navigateur, commiter.

Les métadonnées, le fil d'Ariane, le maillage interne, le sitemap et les données
structurées sont produits automatiquement.

## Règles qui ne se négocient pas

- **Rien ne sort du navigateur.** Aucun appel réseau avec le contenu d'un fichier.
  C'est la promesse du site et son seul avantage réel sur des concurrents mieux
  installés.
- **Aucune dépendance npm dans le build.** Ce projet doit pouvoir tourner sans
  surveillance pendant des années. Une mise à jour de paquet cassée un dimanche
  matin, sans personne pour la réparer, tuerait la machine.
- **On ne publie pas ce qu'on n'a pas testé dans un navigateur.** Un outil qui rend
  un fichier corrompu coûte plus cher que l'absence d'outil.

## État

Quatre outils en ligne, quinze au backlog. Publicité désactivée jusqu'à validation
AdSense. Voir `agent/journal.md` pour le détail courant.
