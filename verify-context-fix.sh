#!/bin/bash
echo "=== Claude Code Context Management Fix Verification ==="
echo ""
echo "1. Checking auto-compact threshold..."
THRESHOLD=$(grep 'CLAUDE_AUTOCOMPACT_PCT_OVERRIDE' ~/.claude/settings.json | grep -o '[0-9]\+')
if [ "$THRESHOLD" = "40" ]; then
  echo "✓ Threshold set to 40% (optimal)"
else
  echo "✗ Threshold is $THRESHOLD% (should be 40%)"
fi

echo ""
echo "2. Checking PreCompact hook configured..."
if grep -q 'pre-compact-hook.cjs' ~/.claude/settings.json; then
  echo "✓ PreCompact hook enabled in settings"
else
  echo "✗ PreCompact hook not found in settings"
fi

echo ""
echo "3. Checking pre-compact hook file exists..."
if [ -f ~/.claude/helpers/pre-compact-hook.cjs ]; then
  echo "✓ PreCompact hook file exists"
else
  echo "✗ PreCompact hook file missing"
fi

echo ""
echo "4. Checking session restoration enhanced..."
if grep -q 'Resuming from pre-compact state' ~/.claude/helpers/session.js; then
  echo "✓ Session restore checks pre-compact state"
else
  echo "✗ Session restore not enhanced"
fi

echo ""
echo "5. Testing PreCompact hook..."
if node ~/.claude/helpers/hook-handler.cjs pre-compact 2>&1 | grep -q 'Session state saved'; then
  echo "✓ PreCompact hook executes successfully"
else
  echo "✗ PreCompact hook test failed"
fi

echo ""
echo "6. Checking CLAUDE.md exists in project..."
if [ -f CLAUDE.md ]; then
  echo "✓ Project continuation guide created"
else
  echo "✗ CLAUDE.md not found"
fi

echo ""
echo "=== Verification Complete ==="
echo ""
echo "Next time context hits 40%, it will compact smoothly without repeating work."
