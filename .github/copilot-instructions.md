// Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file

# YNAB Investments Sync

A lightweight, self-hosted application that automatically syncs investment portfolio values to YNAB using real-time market data. No database required - operates entirely with in-memory storage and external config files.

## Architecture

This is an Nx monorepo containing:

- **`apps/api`**: NestJS backend with REST API and scheduled sync jobs for investment data synchronization
- **`apps/api-playground`**: Testing application to validate API functionality and test integrations

## Tech Stack

### Core Framework & Language

- **TypeScript**: Primary language with strict type safety
- **NestJS**: Node.js framework with dependency injection, decorators, and modular architecture
- **ESM**: ES modules throughout the codebase (type: "module" in package.json)

### Monorepo & Build System

- **Nx**: Monorepo management with intelligent caching and task orchestration
- **Vite**: Fast build tool and dev server for both apps
- **pnpm**: Fast, efficient package manager with workspace support

### Code Quality & Development

- **OXLint**: Primary linter (fast Rust-based)
- **ESLint**: Secondary linting with TypeScript rules and import validation
- **Prettier**: Code formatting with package.json plugin
- **Vitest**: Unit and integration testing framework
- **Husky**: Git hooks management
- **lint-staged**: Pre-commit hooks for code quality
  - Runs Prettier and OXLint before commits

### Linters

To run the linters, use the following command:

```bash
pnpm lint
```

or to fix any issues automatically, use:

```bash
pnpm lint:fix
```

### Application Features

- **File-Based Configuration**: YAML config files for investment holdings (no database)
- **Market Data Providers**: Multiple integrations (Alpha Vantage, Polygon, Finnhub, CoinMarketCap, FMP)
- **YNAB Integration**: Direct API integration for account balance updates
- **Scheduling**: NestJS cron-based automated sync jobs
- **Currency Conversion**: Multi-currency support with automatic conversion
- **Memory-Only Storage**: No database - all data cached in memory during runtime

### Key Dependencies

- **@nestjs/schedule**: Cron job scheduling for automated syncs
- **@nestjs/config**: Environment configuration management
- **class-validator & class-transformer**: Request/response validation and transformation
- **js-yaml**: YAML configuration file parsing
- **dotenv**: Environment variable management

### Development Tools

- **tsx**: TypeScript execution for scripts
- **@swc/core**: Fast TypeScript/JavaScript compilation
- **@nx/vite**: Nx integration with Vite for builds and dev server

## Project Structure Guidelines

- Use absolute imports with `@/` prefix for internal modules
- Follow NestJS module pattern: each feature gets its own module with service, controller (if needed)
- Keep providers in subdirectories under their respective modules
- Use DTOs for all API requests/responses with proper validation
- Implement proper error handling and logging throughout
- No database schemas - all data is ephemeral and config-driven
