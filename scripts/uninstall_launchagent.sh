#!/usr/bin/env bash
set -euo pipefail

LABEL="com.clipboard-doc-checklist.watcher"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"

echo "[launchd] uninstalling $LABEL"

launchctl bootout "gui/$UID/$LABEL" >/dev/null 2>&1 || true
launchctl bootout "gui/$UID" "$PLIST_PATH" >/dev/null 2>&1 || true

if [[ -f "$PLIST_PATH" ]]; then
  rm -f "$PLIST_PATH"
  echo "[done] removed plist: $PLIST_PATH"
else
  echo "[info] plist not found: $PLIST_PATH"
fi

echo "[done] launch agent removed"
