# Ce que je ne peux pas faire à ta place

Huit étapes, une seule fois, environ une heure au total. Ensuite tu n'interviens plus.

Les étapes 0, 1, 2, 4 et 7 exigent de te connecter, de créer des comptes ou de saisir
ton identité et tes coordonnées bancaires. C'est une limite stricte de mon côté, pas
une préférence.

L'ordre compte : chaque étape débloque la suivante. **L'étape 0 est celle sans
laquelle rien ne tourne tout seul** ; les étapes 1 à 3 mettent le site en ligne.

**Le site est en ligne : https://hfioafio.github.io/** — sept outils testés en
production, déploiement automatique à chaque modification, et agent quotidien
planifié. Les étapes 0 à 2 sont faites.

---

## 0. Authentifier le CLI Claude — 2 min

**Sans ça, l'agent quotidien ne fera rien du tout.** Je l'ai testé : lancé depuis un
script, `claude` répond « Not logged in ». Les identifiants de l'application de
bureau ne servent pas à la ligne de commande.

Ouvre le Terminal et lance :

```bash
claude
```

Puis tape `/login` et suis l'ouverture de page. Une fois connecté, quitte avec
`/exit`. Pour vérifier que c'est bon :

```bash
claude -p "Réponds exactement: PRET"
```

Si tu vois `PRET`, l'agent pourra travailler. L'agent refait ce test à chaque
exécution et t'envoie une notification macOS s'il est bloqué — il ne restera jamais
en panne silencieuse.

---

## 1. Mettre le code sur GitHub — 15 min

Le dépôt sert de déclencheur : chaque fois que l'agent y pousse une modification,
Cloudflare reconstruit et publie le site tout seul.

1. Crée un compte sur [github.com](https://github.com) si tu n'en as pas.
2. Crée un dépôt **privé** nommé `outilo`, sans README ni .gitignore.
3. Dans le Terminal, colle les commandes que GitHub affiche, depuis ce dossier.

Le dépôt local est déjà initialisé, il ne manque que le distant.

---

## 2. Brancher l'hébergement gratuit — 10 min

1. Crée un compte sur [dash.cloudflare.com](https://dash.cloudflare.com) (gratuit).
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → choisis `outilo`.
3. Réglages de build :
   - Framework preset : **None**
   - Build command : `node build.mjs`
   - Build output directory : `site`
4. **Save and Deploy.**

Le site est en ligne deux minutes plus tard sur `outilo.pages.dev`. Bande passante
illimitée, certificat HTTPS automatique, zéro euro, à vie.

---

## 3. Renseigner ton identité — 10 min

Obligatoire légalement dès la mise en ligne (LCEN, article 6).

- `src/pages/mentions-legales.html` → remplace le bloc **À COMPLÉTER** par ton nom,
  ton adresse et ton e-mail.
- `src/pages/contact.html` → remplace **À COMPLÉTER** par une adresse e-mail réelle.
  Crée-en une dédiée, elle sera publique et récoltera du spam.
- `config.json` → renseigne `email` et `editor`.

Puis :

```bash
node build.mjs && git add -A && git commit -m "Identité de l'éditeur" && git push
```

> Un particulier qui édite un site sans en tirer de revenus peut se limiter à son nom
> et son e-mail. Dès que le site rapporte régulièrement, l'activité devient
> professionnelle : il faudra déclarer une micro-entreprise et compléter les mentions.
> Ce seuil arrivera bien avant que ce soit un problème.

---

## 4. Acheter un nom de domaine — 10 min, ~10 €/an

**C'est la seule dépense, et elle conditionne les revenus publicitaires.** AdSense
refuse les sous-domaines gratuits comme `.pages.dev`.

Prends un `.fr` chez OVH, Gandi ou Cloudflare Registrar (qui vend à prix coûtant).
Choisis un nom court et prononçable ; si tu changes de nom, dis-le moi et je
répercuterai partout.

Ensuite, dans Cloudflare Pages : **Custom domains** → **Set up a custom domain**.
Enfin, mets `baseUrl` à jour dans `config.json`.

> Tu peux sauter cette étape au début. Le site fonctionnera, il sera indexé, il ne
> rapportera simplement rien tant qu'il n'a pas de domaine propre.

---

## 5. Brancher la mesure d'audience — 10 min

Sans données réelles, l'agent travaille à l'aveugle. C'est ce qui transforme la
machine en boucle qui apprend.

**Google Search Console** — [search.google.com/search-console](https://search.google.com/search-console)
1. Ajoute ta propriété (préfixe d'URL).
2. Choisis la validation par **balise HTML**, copie le code, colle-le dans
   `config.json` → `searchConsoleVerification`.
3. Reconstruis, pousse, puis valide. Soumets `/sitemap.xml`.

**Cloudflare Web Analytics** — dans le tableau de bord Cloudflare
1. **Analytics & Logs** → **Web Analytics** → ajoute ton site.
2. Copie le token dans `config.json` → `cloudflareAnalyticsToken`.

Sans cookie, donc sans bandeau de consentement à ce stade.

---

## 6. L'agent autonome — fait, mais pas par launchd

Rien à faire. La planification passe par le **planificateur intégré de
l'application Claude** : tâche `outilo-quotidien`, tous les jours à 9 h 12,
visible dans la section « Scheduled » de la barre latérale.

Pourquoi pas launchd, comme prévu au départ : lancé par launchd, le CLI Claude
répond « Not logged in » — son accès au trousseau dépend d'un contexte
d'application graphique. Testé avec `SessionCreate`, puis via Terminal : les deux
échouent sans une autorisation système que tu es seul à pouvoir accorder. La tâche
launchd a donc été désinstallée pour qu'elle n'échoue pas en silence chaque matin.

**La contrepartie, à connaître :** la tâche ne s'exécute que si l'application
Claude est ouverte. Si elle était fermée à 9 h 12, l'exécution a lieu au lancement
suivant. Ce n'est pas plus contraignant que l'ancienne solution, qui exigeait déjà
que le Mac soit allumé.

Conseil : clique une fois sur **« Run now »** dans la section Scheduled. Les
autorisations d'outils accordées pendant cette exécution sont mémorisées, ce qui
évite que les exécutions suivantes se bloquent sur une demande de permission.

Pour un déclenchement manuel depuis un terminal, à tout moment :

```bash
bash ~/outilo/agent/run.sh
```

Pour tout arrêter : supprime la tâche depuis la section « Scheduled ».

---

## 7. Activer la publicité — 20 min, mais **pas maintenant**

**Attends 3 à 4 mois.** AdSense refuse les sites jeunes et pauvres en contenu, et un
refus rend les candidatures suivantes plus difficiles. Les bons signaux pour se
lancer : une trentaine d'outils en ligne, du trafic organique visible dans Search
Console, un domaine propre depuis plusieurs mois.

Le jour venu :
1. Candidate sur [adsense.google.com](https://adsense.google.com).
2. Une fois validé, mets `adsenseClientId` (`ca-pub-…`) dans `config.json` et passe
   `adsEnabled` à `true`. Les emplacements sont déjà en place dans le générateur.
3. **Obligatoire en Europe** : dans AdSense, **Confidentialité et messagerie** →
   active le message **RGPD**. Sans cette fenêtre de consentement, tu es en
   infraction et Google peut suspendre le compte.

---

## Et après ?

Rien. Tu peux jeter un œil à `agent/journal.md` de temps en temps — c'est là que
l'agent note ce qu'il a fait, ce qu'il a mesuré, et les rares fois où il a besoin
d'une décision de ta part.

Ce qu'il faut avoir en tête sur les ordres de grandeur : compte 4 à 6 mois avant les
premiers euros, et un revenu qui se compte en dizaines d'euros par mois la première
année. Ce modèle ne devient intéressant qu'en s'accumulant — trente outils qui
rapportent chacun un peu, pendant des années, sans que personne n'y touche.
