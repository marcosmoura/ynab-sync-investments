# YNAB Investments Sync

An application that integrates with YNAB API to automatically update investment account balances on a configurable schedule. Self-hosted solution with no login required.

## 🚀 Features

- **Asset Management**: Add, edit, and delete investment assets (stocks, crypto, bonds, etc.)
- **YNAB Integration**: Seamless integration with YNAB API for account management
- **Automated Sync**: Configurable schedules for automatic portfolio synchronization
- **Real-time Market Data**: Fetch current asset prices from market data providers
- **Multi-Currency Support**: Automatic currency conversion based on YNAB account settings
- **Self-Hosted**: No external services required, complete control over your data

## 🏗️ Architecture

This is an Nx monorepo containing:

- **`apps/api`**: NestJS backend with REST API and scheduled sync jobs
- **`apps/web`**: Frontend web application (to be implemented)
- **`scripts/`**: Development and deployment scripts

## 🛠️ Tech Stack

### Backend

- **NestJS**: Node.js framework with TypeScript
- **TypeORM**: Database ORM with PostgreSQL
- **Scheduling**: Cron-based automated sync jobs
- **Validation**: Class-validator for request validation

### Development

- **Nx**: Monorepo management and build system
- **pnpm**: Fast, efficient package manager
- **TypeScript**: Type-safe development
- **Vitest**: Unit and integration testing
- **OXLint**: Fast linting with oxlint
- **Prettier**: Code formatting
- **Docker**: Containerized database for development

## 🚀 Quick Start

1. **Setup the environment**:

   ```bash
   ./scripts/setup.sh
   ```

2. **Start the development environment**:

   ```bash
   # Start database
   docker-compose up -d postgres

   # Start API server
   pnpm nx serve api

   # Start web application (when ready)
   pnpm nx serve web
   ```

3. **Access the application**:
   - API: <http://localhost:3000/api>
   - Database Admin: <http://localhost:8080>
   - Web App: <http://localhost:4200> (when implemented)

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (package manager)
- **Docker** (for local database)
- **YNAB Personal Access Token** ([Get one here](https://app.youneedabudget.com/settings/developer))

## ⚙️ Configuration

Create `apps/api/.env` from the example file:

```bash
cp apps/api/.env.example apps/api/.env
```

Update the configuration:

- Database connection settings
- YNAB API token (configured via web interface)
- Application ports and URLs

## 📱 API Endpoints

### Assets Management

- `GET /api/assets` - List all assets
- `POST /api/assets` - Create new asset
- `PATCH /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### User Settings

- `GET /api/settings` - Get user settings
- `POST /api/settings` - Save user settings
- `PATCH /api/settings` - Update user settings

### YNAB Integration

- `POST /api/ynab/accounts` - Fetch YNAB accounts
- `POST /api/ynab/sync` - Trigger manual sync

## 🔄 Sync Schedules

- **Daily**: Every day
- **Every Two Days**: Every other day
- **Weekly**: Every Monday
- **Every Two Weeks**: Every other Monday
- **Monthly (First)**: First day of each month
- **Monthly (Last)**: Last day of each month

## 🧪 Development

### Running Tests

```bash
# Unit tests
pnpm nx test api

# E2E tests
pnpm nx e2e api

# Test coverage
pnpm nx test api --coverage
```

### Linting & Formatting

```bash
# Format code
pnpm prettier --write .

# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

### Building

```bash
# Build API
pnpm nx build api

# Build all apps
pnpm build
```

## 🐳 Docker Development

The project includes Docker Compose for local development:

```bash
# Start all services
docker-compose up -d

# Start only database
docker-compose up -d postgres

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔒 Security Notes

- YNAB API tokens are stored encrypted in the database
- All API communication uses HTTPS in production
- Database credentials should be secured in production
- Consider using environment-specific configuration files

## 🗃️ Database Schema

The application uses PostgreSQL with TypeORM migrations for better maintainability:

- **Assets**: Investment assets with symbol, amount, and YNAB account mapping
- **UserSettings**: Application configuration including YNAB token and sync schedule

### Migration Management

The project uses TypeORM migrations instead of auto-synchronization for production safety:

```bash
# Run database migrations
nx run api:migration:run

# Generate new migration after entity changes
nx run api:migration:generate

# Create blank migration
nx run api:migration:create

# Revert last migration
nx run api:migration:revert
```

For detailed migration documentation, see [DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md).

## 🚀 Deployment

### Environment Setup

1. Set up PostgreSQL database
2. Configure environment variables
3. Set up reverse proxy (nginx recommended)
4. Configure SSL certificates

### Production Deployment

```bash
# Build for production
pnpm nx build api --configuration=production

# Start production server
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [YNAB API](https://api.youneedabudget.com/) for the excellent personal finance API
- [NestJS](https://nestjs.com/) for the robust Node.js framework
- [Nx](https://nx.dev/) for monorepo management
