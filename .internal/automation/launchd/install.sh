#!/bin/bash
# Optional local launchd installer for the internal maintenance runner.

set -euo pipefail

PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
TARGET="$HOME/Library/LaunchAgents/com.outilo.maintenance.plist"
LABEL="com.outilo.maintenance"
SOURCE="$PROJECT/.internal/automation/launchd/com.outilo.maintenance.plist"

mkdir -p "$HOME/Library/LaunchAgents" "$PROJECT/.internal/automation/logs"
chmod +x "$PROJECT/.internal/automation/run.sh"

python3 - "$SOURCE" "$TARGET" "$PROJECT" <<'PY'
import sys
source, target, project = sys.argv[1], sys.argv[2], sys.argv[3]
content = open(source, encoding='utf-8').read().replace('PROJECT_PATH', project)
open(target, 'w', encoding='utf-8').write(content)
PY

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$TARGET"

echo "Maintenance task installed: $TARGET"
