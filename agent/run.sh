#!/bin/bash
# Exécution quotidienne autonome de l'agent Outilo.
# Appelé par launchd (voir ops/), ou manuellement pour tester.

set -uo pipefail

PROJET="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJET" || exit 1

# launchd fournit un PATH minimal qui ignore les installations utilisateur.
# On le complète explicitement, sinon 'claude' et 'gh' restent introuvables.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

JOURNEE="$(date +%Y-%m-%d)"
LOGS="$PROJET/agent/logs"
mkdir -p "$LOGS"
SORTIE="$LOGS/$JOURNEE.log"

# Verrou : jamais deux agents en même temps sur le même dépôt.
VERROU="$PROJET/agent/.verrou"
if [ -d "$VERROU" ]; then
  AGE=$(( $(date +%s) - $(stat -f %m "$VERROU" 2>/dev/null || echo 0) ))
  if [ "$AGE" -lt 10800 ]; then
    echo "[$(date)] Une exécution est déjà en cours (verrou vieux de ${AGE}s). Abandon." >> "$SORTIE"
    exit 0
  fi
  echo "[$(date)] Verrou périmé (${AGE}s), on le retire." >> "$SORTIE"
  rm -rf "$VERROU"
fi
mkdir "$VERROU" || exit 1
trap 'rm -rf "$VERROU"' EXIT

{
  echo "════════════════════════════════════════════"
  echo "[$(date)] Démarrage de l'agent quotidien"
} >> "$SORTIE"

# iCloud peut avoir évincé des fichiers : on les rapatrie avant de travailler.
command -v brctl >/dev/null 2>&1 && brctl download "$PROJET" >/dev/null 2>&1

if ! command -v claude >/dev/null 2>&1; then
  echo "[$(date)] ERREUR : la commande 'claude' est introuvable dans le PATH." >> "$SORTIE"
  exit 1
fi

# Un agent qui échoue en silence tous les matins est pire que pas d'agent du tout.
# On vérifie l'authentification AVANT de lancer la mission, et on alerte à l'écran.
SONDE="$(timeout 90 claude -p 'Réponds exactement: PRET' --allowedTools 'Read' 2>&1 | tail -2)"
if ! printf '%s' "$SONDE" | grep -q 'PRET'; then
  {
    echo "[$(date)] ARRÊT : le CLI Claude ne répond pas correctement."
    echo "         Réponse obtenue : $SONDE"
    echo "         Cause la plus probable : session non authentifiée."
    echo "         Correctif : ouvrir un Terminal, lancer 'claude', puis /login."
  } >> "$SORTIE"
  osascript -e 'display notification "Agent Outilo bloqué : le CLI Claude n’est pas authentifié. Ouvrez un Terminal, lancez claude puis /login." with title "Outilo"' 2>/dev/null
  exit 1
fi

# Permissions volontairement étroites : l'agent peut écrire dans le projet,
# construire, tester et publier — rien d'autre. Pas de suppression, pas de
# commande arbitraire, pas d'installation de paquet.
claude -p "$(cat agent/quotidien.md)" \
  --permission-mode acceptEdits \
  --allowedTools \
    "Read" "Write" "Edit" "Glob" "Grep" "WebSearch" "WebFetch" \
    "Bash(node build.mjs)" \
    "Bash(node:*)" \
    "Bash(git add:*)" "Bash(git commit:*)" "Bash(git push:*)" \
    "Bash(git status:*)" "Bash(git log:*)" "Bash(git diff:*)" \
    "Bash(python3 -m http.server:*)" \
    "Bash(curl -sI localhost:*)" \
  >> "$SORTIE" 2>&1

CODE=$?

{
  echo "[$(date)] Terminé (code $CODE)"
  echo
} >> "$SORTIE"

# On ne garde que 60 jours de journaux.
find "$LOGS" -name '*.log' -mtime +60 -delete 2>/dev/null

exit "$CODE"
