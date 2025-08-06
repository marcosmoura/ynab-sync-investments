# YNAB Investments Sync API

NestJS backend API for synchronizing investment portfolios with YNAB accounts.

## Features

- **Asset Management**: Add, edit, and delete investment assets
- **YNAB Integration**: Fetch YNAB accounts and update balances
- **Scheduled Sync**: Automatically sync portfolio values on configurable schedules
- **File-based Sync**: Process YAML configuration files with investment data
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

### File Sync

- `POST /api/file-sync/trigger` - Trigger manual file sync (processes YAML config file)

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

# File Sync Configuration (optional)
INVESTMENTS_CONFIG_FILE_URL=https://example.com/investment-config.yaml
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

## File-based Sync

The application supports reading investment data from a remote YAML configuration file. This is useful for automated setups or when you want to manage your investments through configuration files hosted remotely.

### Configuration File Format

Create a YAML file with the following structure and host it at a publicly accessible URL:

```yaml
# Your YNAB Budget ID
budget: 'your-budget-id'

# List of investment accounts
accounts:
  - account_id: 'ynab-account-id-1'
    holdings:
      AAPL: 10 # Apple - 10 shares
      MSFT: 5 # Microsoft - 5 shares

  - account_id: 'ynab-account-id-2'
    holdings:
      BTC: 1.5 # Bitcoin - 1.5 BTC
      ETH: 10 # Ethereum - 10 ETH
```

### Environment Configuration

Set the `INVESTMENTS_CONFIG_FILE_URL` environment variable to point to your YAML file URL:

```bash
INVESTMENTS_CONFIG_FILE_URL=https://example.com/investment-config.yaml
```

### Scheduled Processing

The file sync runs daily at 9 AM and follows the same schedule settings as regular sync. If no user settings exist, it defaults to daily processing.

### Manual Triggering

You can manually trigger file processing via the API:

````bash
curl -X POST http://localhost:3000/api/file-sync/trigger
```### How it Works

1. Fetches the YAML configuration file from the remote URL
2. For each account in the file:
   - Removes all existing assets for that YNAB account
   - Creates new assets based on the holdings in the file
3. Triggers a sync to YNAB to update account balances

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
````
