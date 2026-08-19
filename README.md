# Outilo

Outilo est une collection d’outils web gratuits conçus pour effectuer des tâches courantes directement dans le navigateur.

Le projet privilégie trois principes : **simplicité**, **rapidité** et **confidentialité**. Lorsque cela est techniquement possible, les fichiers sont traités localement dans le navigateur et ne sont pas envoyés vers un serveur.

## Structure

```text
src/
├── assets/          # styles et scripts partagés
├── outils/          # interfaces des outils
└── pages/           # pages éditoriales et légales

build.mjs            # génération du site statique
config.json          # configuration du site
tools.json           # catalogue des outils
site/                # sortie générée, non versionnée
```

## Développement

Le site est généré sans framework applicatif ni dépendance de build obligatoire.

```bash
node build.mjs
python3 -m http.server 8787 --directory site
```

Puis ouvrir `http://localhost:8787` dans un navigateur.

## Ajouter un outil

1. Créer le fragment correspondant dans `src/outils/`.
2. Ajouter son entrée dans `tools.json`.
3. Régénérer le site avec `node build.mjs`.
4. Vérifier le résultat dans un navigateur avant publication.

## Principes techniques

- traitement local des fichiers lorsque possible ;
- architecture statique volontairement simple à maintenir ;
- absence de dépendances inutiles dans la chaîne de génération ;
- composants et ressources partagés plutôt que du code dupliqué ;
- métadonnées, navigation, sitemap et données structurées générés de manière centralisée ;
- validation réelle des outils avant publication.

## Confidentialité

Outilo est conçu pour limiter au maximum la transmission de données. Les outils manipulant des fichiers doivent conserver leur traitement dans le navigateur sauf indication explicite contraire.

## Contribution

Les règles de structure, de qualité et de maintenance sont décrites dans `CONTRIBUTING.md`.
