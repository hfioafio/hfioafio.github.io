#!/bin/bash
# Internal maintenance runner. Not part of the public product surface.

set -uo pipefail

PROJECT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT" || exit 1

export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"

TODAY="$(date +%Y-%m-%d)"
LOGS="$PROJECT/.internal/automation/logs"
LOCK="$PROJECT/.internal/automation/.lock"
OUTPUT="$LOGS/$TODAY.log"
mkdir -p "$LOGS"

if [ -d "$LOCK" ]; then
  AGE=$(( $(date +%s) - $(stat -f %m "$LOCK" 2>/dev/null || echo 0) ))
  if [ "$AGE" -lt 10800 ]; then
    echo "[$(date)] Maintenance already running (${AGE}s)." >> "$OUTPUT"
    exit 0
  fi
  rm -rf "$LOCK"
fi
mkdir "$LOCK" || exit 1
trap 'rm -rf "$LOCK"' EXIT

command -v brctl >/dev/null 2>&1 && brctl download "$PROJECT" >/dev/null 2>&1

if ! command -v claude >/dev/null 2>&1; then
  echo "[$(date)] Maintenance CLI unavailable." >> "$OUTPUT"
  exit 1
fi

START="$(wc -c < "$OUTPUT" 2>/dev/null || echo 0)"

timeout 3600 claude -p "$(cat .internal/automation/maintenance.md)" \
  --permission-mode acceptEdits \
  --allowedTools \
    "Read" "Write" "Edit" "Glob" "Grep" "WebSearch" "WebFetch" \
    "Bash(node build.mjs)" \
    "Bash(node:*)" \
    "Bash(git add:*)" "Bash(git commit:*)" "Bash(git push:*)" \
    "Bash(git status:*)" "Bash(git log:*)" "Bash(git diff:*)" \
    "Bash(python3 -m http.server:*)" \
    "Bash(curl -sI localhost:*)" \
  >> "$OUTPUT" 2>&1

CODE=$?
RESULT="$(tail -c "+$((START + 1))" "$OUTPUT" 2>/dev/null)"
ALERT=""

if printf '%s' "$RESULT" | grep -qi 'not logged in\|please run /login'; then
  ALERT="Maintenance authentication is required."
elif [ "$CODE" -eq 124 ]; then
  ALERT="Maintenance exceeded one hour and was stopped."
elif [ -z "$(printf '%s' "$RESULT" | tr -d '[:space:]')" ]; then
  ALERT="Maintenance produced no output (code $CODE)."
fi

if [ -n "$ALERT" ]; then
  echo "[$(date)] ERROR: $ALERT" >> "$OUTPUT"
  osascript -e "display notification \"$ALERT\" with title \"Outilo maintenance\"" 2>/dev/null
fi

echo "[$(date)] Finished (code $CODE)" >> "$OUTPUT"
find "$LOGS" -name '*.log' -mtime +60 -delete 2>/dev/null

exit "$CODE"
