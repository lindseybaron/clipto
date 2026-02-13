#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[pre-commit] not inside a git repository; skipping."
  exit 0
fi

if git ls-files --error-unmatch config.json >/dev/null 2>&1; then
  cat <<'EOF'
[pre-commit] blocked: config.json is tracked by git.
Remove it from the index first:
  git rm --cached config.json
EOF
  exit 1
fi

STAGED_FILES="$(git diff --cached --name-only --diff-filter=ACMR || true)"
if printf '%s\n' "$STAGED_FILES" | rg -x 'config\.json' >/dev/null 2>&1; then
  cat <<'EOF'
[pre-commit] blocked: config.json is staged for commit.
Unstage it before committing:
  git restore --staged config.json
EOF
  exit 1
fi

exit 0
