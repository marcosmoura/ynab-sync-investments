# YNAB Investments Sync

A lightweight, self-hosted application that automatically syncs investment portfolio values to YNAB using real-time market data. No database required - operates entirely with in-memory storage and external config files.

## 🚀 Features

- **File-Based Configuration**: Uses external YAML config files for investment holdings
- **Real-Time Market Data**: Fetches current asset prices from multiple market data providers
- **Automatic Scheduling**: Daily config fetching and configurable YNAB sync schedules
- **YNAB Integration**: Direct integration with YNAB API for account balance updates
- **Multi-Asset Support**: Stocks, crypto, bonds, ETFs, and other investment assets
- **Currency Conversion**: Automatic conversion to your YNAB budget currency
- **Self-Hosted**: No external services required, complete control over your data
- **Memory-Only Storage**: No database setup needed - all data cached in memory

## 🏗️ Architecture

This is an Nx monorepo containing:

- **`apps/api`**: NestJS backend with REST API and scheduled sync jobs
- **`apps/api-playground`**: Testing application to validate API functionality

## 🛠️ Tech Stack

### Backend

- **NestJS**: Node.js framework with TypeScript
- **Scheduling**: NestJS cron-based automated sync jobs
- **Market Data**: Multiple provider support (Alpha Vantage, Polygon, Finnhub, CoinMarketCap)
- **Validation**: Class-validator for request validation

### Development

- **Nx**: Monorepo management and build system
- **pnpm**: Fast, efficient package manager
- **TypeScript**: Type-safe development
- **Vitest**: Unit and integration testing
- **OXLint and ESLint**: Fast linting
- **Prettier**: Code formatting

## 🚀 Quick Start

1. **Install dependencies**:

   ```bash
   pnpm install
   ```

2. **Configure environment variables**:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the API server**:

   ```bash
   pnpm nx serve api
   ```

4. **Test the setup**:

   ```bash
   pnpm nx run api-playground:run-playground
   ```

5. **Access the application**:
   - API: <http://localhost:3000/api>
   - Swagger Documentation: <http://localhost:3000/api/docs>

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (package manager)
- **YNAB Personal Access Token** ([Get one here](https://app.youneedabudget.com/settings/developer))

## ⚙️ Configuration

### Environment Variables

Create `.env` in the project root:

```bash
# YNAB Configuration
YNAB_API_KEY=your_ynab_personal_access_token

# Investment Config File URL
INVESTMENTS_CONFIG_FILE_URL=https://example.com/path/to/your/investments.yaml

# Optional: Market Data Provider API Keys (for better coverage)
ALPHA_VANTAGE_API_KEY=your_api_key
POLYGON_API_KEY=your_api_key
FINNHUB_API_KEY=your_api_key
COINMARKETCAP_API_KEY=your_api_key
```

### Investment Config File

Create a YAML file accessible via HTTP(S) with your investment holdings:

```yaml
budget: your_ynab_budget_id

# Optional: Custom sync schedule
schedule:
  sync_time: 9pm # Time to sync investments (9pm, 21:00, etc.)
  sync_frequency: weekly # How often to sync (daily, weekly, monthly)

accounts:
  - account_id: your_ynab_account_id_1
    holdings:
      AAPL: 10.5 # 10.5 shares of Apple
      BTC: 0.25 # 0.25 Bitcoin

  - account_id: your_ynab_account_id_2
    holdings:
      GOOGL: 5.0 # 5 shares of Google
      ETH: 2.0 # 2 Ethereum
      TSLA: 15.0 # 15 shares of Tesla
```

## 📱 API Endpoints

### File Sync

- `POST /api/file-sync/trigger` - Trigger manual file sync and YNAB update

### YNAB Integration

- `POST /api/ynab/budgets` - Fetch YNAB budgets
- `POST /api/ynab/accounts` - Fetch YNAB accounts

### Market Data

- `POST /api/market-data/bulk-price` - Get current asset prices

## 🔄 How It Works

1. **Daily Config Fetch** (9 PM UTC): Fetches your investment config file
2. **Change Detection**: Compares with cached version to detect changes
3. **Auto-Sync Trigger**: If config changed or it's the first fetch, triggers YNAB sync
4. **Market Data**: Fetches real-time prices for all assets in your holdings
5. **Portfolio Calculation**: Calculates total value per account (quantity × current price)
6. **YNAB Update**: Updates account balances in YNAB via reconciliation transactions
7. **Scheduled Sync**: Runs additional syncs based on config schedule (default: weekly)

### Sync Schedule Options

- **Default**: Weekly on Sunday at 9 PM UTC
- **Custom**: Define your own cron expression in the config file
- **Constraints**: Maximum once per day, minimum once per month
- **Manual**: Trigger anytime via API endpoint

## 🧪 Development

### Running Tests

```bash
# Unit tests
pnpm nx test api

# Unit tests with coverage
pnpm nx test api --coverage
```

### API Playground

The project includes a comprehensive testing application that validates the new file-sync functionality:

```bash
# Configure YNAB credentials and config file URL in .env
# Then run the playground
pnpm nx run api-playground:run-playground
```

The playground tests:

- API health checks
- YNAB API integration and budget access
- File sync process (fetch config, parse, sync to YNAB)
- Market data provider integration
- End-to-end portfolio value calculation

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

# Build playground
pnpm nx build api-playground
```

## 🔒 Security Notes

- YNAB API tokens are stored as environment variables (not persisted)
- Investment config files should be secured (consider private GitHub repos or protected URLs)
- All API communication uses HTTPS in production
- No sensitive data is stored locally - everything is memory-cached only

## 🚀 Deployment

### Environment Setup

1. Set up a web server to host your investment config YAML file
2. Configure environment variables (YNAB token, config URL, optional API keys)
3. Set up reverse proxy (nginx recommended)
4. Configure SSL certificates

### Production Deployment

```bash
# Build for production
pnpm nx build api --configuration=production

# Start production server
node dist/apps/api/main.js
```

### Docker Deployment (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY dist/apps/api ./
COPY package.json ./
RUN npm install --production
EXPOSE 3000
CMD ["node", "main.js"]
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
- Market data providers for real-time pricing data
