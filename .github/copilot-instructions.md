// Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file

# YNAB Investments Sync

## Techstack

- TypeScript
- OXLint as the linter
- Prettier as the formatter
- NX monorepo split by "apps"
- pnpm as the package manager
- Vitest for tests
- lint-staged for git hooks
  - Should run prettier and oxlint before any commits
- Postgres as the database
- Docker for containerization
- Docker Compose for local development
