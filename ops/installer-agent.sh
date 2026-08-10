#!/bin/bash
# Installe (ou réinstalle) la tâche quotidienne dans launchd.
# À lancer une seule fois :   bash ops/installer-agent.sh

set -euo pipefail

PROJET="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CIBLE="$HOME/Library/LaunchAgents/com.outilo.agent.plist"
LABEL="com.outilo.agent"

mkdir -p "$HOME/Library/LaunchAgents" "$PROJET/agent/logs"
chmod +x "$PROJET/agent/run.sh"

# Le chemin du projet contient des espaces : on substitue proprement.
python3 - "$PROJET/ops/com.outilo.agent.plist" "$CIBLE" "$PROJET" <<'PY'
import sys
source, cible, projet = sys.argv[1], sys.argv[2], sys.argv[3]
contenu = open(source, encoding='utf-8').read().replace('CHEMIN_DU_PROJET', projet)
open(cible, 'w', encoding='utf-8').write(contenu)
PY

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$CIBLE"

echo "✓ Agent installé : $CIBLE"
echo "  Il s'exécutera chaque jour à 9 h 12."
echo
echo "  Vérifier qu'il est chargé :   launchctl list | grep outilo"
echo "  Le déclencher tout de suite :  launchctl kickstart -k gui/$(id -u)/$LABEL"
echo "  Le désactiver :                launchctl bootout gui/$(id -u)/$LABEL"
echo "  Lire le dernier journal :      tail -f '$PROJET/agent/logs/'\$(date +%F).log"
