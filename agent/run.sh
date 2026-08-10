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

# Pas de sonde préalable : elle consommait une invocation entière et son délai
# d'attente se déclenchait avant même que le CLI ait fini de démarrer. On lance
# directement la mission, puis on diagnostique sa sortie.
#
# Permissions volontairement étroites : l'agent peut écrire dans le projet,
# construire, tester et publier — rien d'autre. Pas de suppression, pas de
# commande arbitraire, pas d'installation de paquet.
DEBUT_MISSION="$(wc -c < "$SORTIE" 2>/dev/null || echo 0)"

timeout 3600 claude -p "$(cat agent/quotidien.md)" \
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

# Diagnostic a posteriori : on ne regarde que ce que la mission vient d'écrire.
MISSION="$(tail -c "+$((DEBUT_MISSION + 1))" "$SORTIE" 2>/dev/null)"
ALERTE=""
if printf '%s' "$MISSION" | grep -qi 'not logged in\|please run /login'; then
  ALERTE="Session non authentifiée. Ouvrez un Terminal, lancez claude puis /login."
elif [ "$CODE" -eq 124 ]; then
  ALERTE="La mission a dépassé une heure et a été interrompue."
elif [ -z "$(printf '%s' "$MISSION" | tr -d '[:space:]')" ]; then
  ALERTE="Le CLI n'a produit aucune sortie (code $CODE)."
fi

if [ -n "$ALERTE" ]; then
  echo "[$(date)] ÉCHEC : $ALERTE" >> "$SORTIE"
  osascript -e "display notification \"$ALERTE\" with title \"Agent Outilo bloqué\"" 2>/dev/null
fi

{
  echo "[$(date)] Terminé (code $CODE)"
  echo
} >> "$SORTIE"

# On ne garde que 60 jours de journaux.
find "$LOGS" -name '*.log' -mtime +60 -delete 2>/dev/null

exit "$CODE"
