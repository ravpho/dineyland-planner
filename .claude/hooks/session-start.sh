#!/bin/bash
set -euo pipefail

# Only needed in Claude Code cloud sessions; local machines manage their own tools.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# OpenSpec skills in .claude/skills shell out to the `openspec` CLI.
if ! command -v openspec >/dev/null 2>&1; then
  npm install -g @fission-ai/openspec@latest >/dev/null 2>&1
fi

# Opt out of OpenSpec's anonymous usage telemetry for agent sessions.
if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo 'export OPENSPEC_TELEMETRY=0' >> "$CLAUDE_ENV_FILE"
fi

# Install the app's dependencies so lint, tests and builds work in the session.
if [ -f "${CLAUDE_PROJECT_DIR:-.}/package.json" ]; then
  cd "${CLAUDE_PROJECT_DIR:-.}"
  npm install --no-audit --no-fund >/dev/null 2>&1
fi
