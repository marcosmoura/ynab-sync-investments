# YNAB Investments Sync API

NestJS backend API for synchronizing investment portfolios with YNAB accounts using real-time market data.

## Features

- **Real-Time Market Data**: Fetches current asset prices from multiple providers (Alpha Vantage, Polygon, Finnhub, CoinMarketCap)
- **YNAB Integration**: Direct integration with YNAB API for budget and account management
- **File-Based Configuration**: Processes external YAML configuration files with investment holdings
- **Scheduled Sync**: Automatic portfolio syncing with configurable schedules (daily/weekly/monthly)
- **Currency Conversion**: Automatic conversion to budget currency
- **Multi-Asset Support**: Stocks, crypto, ETFs, bonds, and other investment instruments
- **Memory-Only Storage**: No database required - all data cached in memory

## API Endpoints

### Core Endpoints

- **`GET /api`**: Get application information and health status
- **`GET /api/trigger`**: Manually trigger configuration fetch and YNAB sync

### Response Examples

#### Application Information (`GET /api`)

```json
{
  "message": "YNAB Investments Sync API",
  "version": "1.0.0",
  "status": "running",
  "documentation": "/api/docs"
}
```

#### Manual Sync Trigger (`GET /api/trigger`)

```json
{
  "message": "File sync completed successfully"
}
```

## Environment Variables

Create a `.env` file in the project root:

```bash
# YNAB Configuration (Required)
YNAB_API_KEY=your_ynab_personal_access_token

# Investment Config File URL (Required)
INVESTMENTS_CONFIG_FILE_URL=https://example.com/path/to/your/investments.yaml

# Market Data Provider API Keys (At least one required)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
POLYGON_API_KEY=your_polygon_key
FINNHUB_API_KEY=your_finnhub_key
COINMARKETCAP_API_KEY=your_coinmarketcap_key

# Optional Configuration
NODE_ENV=development
PORT=3000
```

### Getting API Keys

- **YNAB**: [Get Personal Access Token](https://app.youneedabudget.com/settings/developer)
- **Alpha Vantage**: [Free API Key](https://www.alphavantage.co/support/#api-key)
- **Polygon.io**: [API Key](https://polygon.io/)
- **Finnhub**: [Free API Key](https://finnhub.io/)
- **CoinMarketCap**: [API Key](https://coinmarketcap.com/api/)

## Development Setup

### Prerequisites

- Node.js 18+ and pnpm
- YNAB Personal Access Token
- At least one market data provider API key

### Installation and Running

```bash
# Install dependencies (from project root)
pnpm install

# Start development server
pnpm nx serve api

# Start with file watching
pnpm nx serve api --watch

# Build for production
pnpm nx build api
```

### Testing

```bash
# Run all tests
pnpm nx test api

# Run tests with coverage
pnpm nx test api --coverage

# Run specific test files
pnpm nx test api --testPathPattern="market-data"
```

### API Testing

Use the included playground application:

```bash
# Run comprehensive API tests
pnpm nx run api-playground:run-playground

# Check configuration setup
pnpm nx run api-playground:check-setup
```

## Architecture

### Service Structure

- **AppService**: Core application logic and sync orchestration
- **MarketDataService**: Coordinates multiple market data providers
- **FileSyncService**: Handles configuration file fetching and caching
- **YnabService**: YNAB API integration for budgets and accounts

### Market Data Providers

The API uses a provider pattern for market data:

- **Alpha Vantage**: Stocks, forex, cryptocurrencies
- **Polygon.io**: US stocks and market indices
- **Finnhub**: Global stocks and forex
- **CoinMarketCap**: Cryptocurrency prices

Providers are tried in order until all required asset prices are found.

### Sync Process

1. **Configuration Fetch**: Downloads latest investment config from remote URL
2. **Asset Price Retrieval**: Fetches current prices from available providers
3. **Portfolio Calculation**: Calculates total values for each account
4. **Currency Conversion**: Converts to budget currency if needed
5. **YNAB Update**: Updates account balances via YNAB API

## Configuration

### Investment Config File Format

```yaml
budget: your_ynab_budget_id

# Optional: Custom sync schedule
schedule:
  sync_time: '9pm' # Time to sync investments
  sync_frequency: 'weekly' # How often to sync (daily, weekly, monthly)

accounts:
  - account_id: your_ynab_account_id_1
    holdings:
      AAPL: 10.5 # 10.5 shares of Apple
      BTC: 0.25 # 0.25 Bitcoin
      GOOGL: 5.0 # 5 shares of Google

  - account_id: your_ynab_account_id_2
    holdings:
      ETH: 2.0 # 2 Ethereum
      TSLA: 15.0 # 15 shares of Tesla
      VTI: 100.0 # 100 shares of Vanguard Total Stock Market ETF
```

### Schedule Configuration

- **sync_time**: Time of day to perform sync (e.g., "9pm", "21:00", "09:30")
- **sync_frequency**: How often to sync
  - `daily`: Every day at specified time
  - `weekly`: Once per week at specified time
  - `monthly`: Once per month at specified time

## Deployment

### Docker

```bash
# Build image
docker build -t ynab-investments-sync-api .

# Run container
docker run -p 3000:3000 --env-file .env ynab-investments-sync-api
```

### Production

```bash
# Build for production
pnpm nx build api --prod

# Start production server
NODE_ENV=production node dist/apps/api/main.js
```

## Monitoring and Logs

The API provides structured logging for:

- Configuration fetch operations
- Market data provider requests
- YNAB API interactions
- Sync job execution
- Error tracking and debugging

Monitor logs for sync status and troubleshooting.
