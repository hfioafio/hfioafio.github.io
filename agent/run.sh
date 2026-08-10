#!/bin/bash
# Exécution quotidienne autonome de l'agent Outilo.
# Appelé par launchd (voir ops/), ou manuellement pour tester.

set -uo pipefail

PROJET="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJET" || exit 1

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

claude -p "$(cat agent/quotidien.md)" \
  --permission-mode acceptEdits \
  >> "$SORTIE" 2>&1

CODE=$?

{
  echo "[$(date)] Terminé (code $CODE)"
  echo
} >> "$SORTIE"

# On ne garde que 60 jours de journaux.
find "$LOGS" -name '*.log' -mtime +60 -delete 2>/dev/null

exit "$CODE"
