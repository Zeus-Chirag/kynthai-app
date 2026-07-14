# Kyntha US Project

## Context Management & Continuation Policy

This project uses Claude Code with automatic context compaction. To ensure work continues seamlessly even when context resets:

### When Context Reaches ~40% (Auto-Compact Triggers)
- PreCompact hook saves session state to `.claude-flow/sessions/pre-compact-state.json`
- Context compacts and starts fresh
- YOU MUST continue from where the previous session left off

### Continuation Protocol
When you detect this is a fresh session after compaction:
1. Check `.claude-flow/sessions/` for recent session files with timestamps
2. Read any in-progress files, TODO comments, or recent changes
3. Review git status: `git status` and `git log --oneline -10`
4. Resume the previous task - DO NOT restart from scratch
5. Do NOT repeat work that's already been completed in previous sessions

### Key Files to Check on Recovery
- `.claude-flow/sessions/session-*.json` - Recent session states
- `/Users/c.k/.claude/settings.json` - Configuration shows autoCompactEnabled: true with 40% threshold
- Project files with TODO markers or in-progress comments
- Git status for uncommitted changes

### Project Context
- Kyntha US - Healthcare/medical platform
- Next.js app with Prisma, TypeScript, Tailwind CSS
- Deployed with Docker Compose
- HIPAA compliance is critical

## Development Guidelines
- Always follow existing code patterns and conventions
- Run `npm run build` to verify changes compile
- Use TypeScript strictly - no `any` types
- Follow the component structure in `src/components/`
- Database changes require Prisma migration
