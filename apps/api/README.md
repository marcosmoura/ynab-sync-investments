# YNAB Investments Sync API

NestJS backend API for synchronizing investment portfolios with YNAB accounts.

## Features

- **Asset Management**: Add, edit, and delete investment assets
- **YNAB Integration**: Fetch YNAB accounts and update balances
- **Scheduled Sync**: Automatically sync portfolio values on configurable schedules
- **Market Data**: Fetch real-time asset prices (extensible for multiple providers)
- **User Settings**: Configure YNAB API token and sync schedule

## API Endpoints

### Assets

- `GET /api/assets` - List all assets (optional query: `?ynabAccountId=<id>`)
- `POST /api/assets` - Create a new asset
- `GET /api/assets/:id` - Get asset by ID
- `PATCH /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### User Settings

- `GET /api/settings` - Get current user settings
- `POST /api/settings` - Create/overwrite user settings
- `PATCH /api/settings` - Update user settings

### YNAB Integration

- `POST /api/ynab/accounts` - Get YNAB accounts (requires token in body)
- `POST /api/ynab/sync` - Trigger manual sync

## Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=ynab_investments

# Application Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:4200
```

## Development Setup

1. **Start the database**:

   ```bash
   docker-compose up -d postgres
   ```

2. **Install dependencies** (from workspace root):

   ```bash
   pnpm install
   ```

3. **Start the development server**:

   ```bash
   pnpm nx serve api
   ```

4. **Access the API**: `http://localhost:3000/api`

## Database Management

- **Adminer**: Access at `http://localhost:8080` when running docker-compose
- **Database**: The application uses TypeORM with automatic synchronization in development

## Sync Schedules

- **Daily**: Every day
- **Every Two Days**: Every other day
- **Weekly**: Every Monday
- **Every Two Weeks**: Every other Monday
- **Monthly (First)**: First day of each month
- **Monthly (Last)**: Last day of each month

## Market Data Integration

The app is designed to be extensible for different market data providers:

- **Stocks**: Can integrate with Alpha Vantage, Yahoo Finance, etc.
- **Crypto**: Can integrate with CoinGecko, CoinMarketCap, etc.
- **Forex**: Can integrate with Fixer.io, OpenExchangeRates, etc.

Currently uses mock data for development. Update the `MarketDataService` for production use.

## Testing

```bash
# Unit tests
pnpm nx test api

# E2E tests
pnpm nx e2e api

# Test coverage
pnpm nx test api --coverage
```
