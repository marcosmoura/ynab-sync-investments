# YNAB Investments Sync

A lightweight, self-hosted application that automatically syncs investment portfolio values to YNAB using real-time market data. No database required - operates entirely with in-memory storage and external config files.

Please note that most of this code was generated with AI, powered by Claude Sonnet 4.

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

At least one provider should be configured, otherwise no sync can happen.

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

The API provides the following endpoints:

### Core Endpoints

- **`GET /api`**: Application information and health status
- **`GET /api/trigger`**: Manually trigger a file sync and YNAB update

## 🔄 How It Works

1. **Configuration Fetching**: The app fetches your investment configuration from a remote YAML file
2. **Market Data Retrieval**: Asset prices are fetched from configured market data providers (Alpha Vantage, Polygon, Finnhub, CoinMarketCap)
3. **Portfolio Calculation**: Total portfolio values are calculated based on holdings and current prices
4. **Currency Conversion**: Asset values are converted to your YNAB budget currency if needed
5. **YNAB Sync**: Account balances are updated in YNAB via the API

### Market Data Providers

The app supports multiple providers for redundancy and better coverage:

- **Alpha Vantage**: Stocks, forex, crypto
- **Polygon.io**: Stocks, indices
- **Finnhub**: Stocks, forex
- **CoinMarketCap**: Cryptocurrencies

At least one provider must be configured. The app will try providers in order until it finds the data it needs.

### Sync Schedule Options

Configure automatic syncing in your investment config file:

```yaml
schedule:
  sync_time: '9pm' # Time to sync (9pm, 21:00, etc.)
  sync_frequency: 'weekly' # How often to sync (daily, weekly, monthly)
```

**Frequency Options**:

- `daily`: Sync every day at the specified time
- `weekly`: Sync once per week at the specified time
- `monthly`: Sync once per month at the specified time

## 🧪 Development

### Running the Application

```bash
# Install dependencies
pnpm install

# Start API in development mode
pnpm nx serve api

# Start API in watch mode
pnpm nx serve api --watch
```

### API Playground

Test the API functionality with the included playground:

```bash
# Run the API playground
pnpm nx run api-playground:run-playground

# Check setup and configuration
pnpm nx run api-playground:check-setup
```

The playground simulates real-world usage and validates the entire sync process.

### Testing

```bash
# Run all tests
pnpm nx test api

# Run tests with coverage
pnpm nx test api --coverage

# Run specific test suites
pnpm nx test api --testPathPattern="market-data"
```

### Linting & Formatting

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Format code (runs automatically on commit)
pnpm prettier --write .
```

### Building

```bash
# Build for production
pnpm nx build api

# Build with optimizations
pnpm nx build api --prod
```

## 🔒 Security Notes

- **API Keys**: Store all API keys securely in environment variables, never in code
- **YNAB Token**: Your YNAB Personal Access Token has full access to your budget - keep it secure
- **HTTPS Config**: Use HTTPS URLs for your investment configuration files
- **Network Security**: Consider running behind a reverse proxy in production
- **Access Control**: The API has no built-in authentication - secure it at the network level

## 🚀 Deployment

### Environment Setup

1. **Create production environment file**:

   ```bash
   cp .env.example .env.production
   # Edit with production values
   ```

2. **Required environment variables**:

   ```bash
   NODE_ENV=production
   PORT=3000
   YNAB_API_KEY=your_production_ynab_token
   INVESTMENTS_CONFIG_FILE_URL=https://your-domain.com/config.yaml

   # At least one market data provider
   ALPHA_VANTAGE_API_KEY=your_key
   POLYGON_API_KEY=your_key
   FINNHUB_API_KEY=your_key
   COINMARKETCAP_API_KEY=your_key
   ```

### Production Deployment

#### Docker Deployment

```bash
# Build production image
docker build -t ynab-investments-sync .

# Run with environment file
docker run --env-file .env.production -p 3000:3000 ynab-investments-sync
```

#### Node.js Deployment

```bash
# Build the application
pnpm nx build api --prod

# Install production dependencies only
pnpm install --prod --frozen-lockfile

# Start the application
NODE_ENV=production node dist/apps/api/main.js
```

#### Process Management

Use a process manager like PM2 for production:

```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start dist/apps/api/main.js --name ynab-sync

# Save PM2 configuration
pm2 save

# Setup startup script
pm2 startup
```

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and add tests
4. **Run the test suite**: `pnpm nx test api`
5. **Ensure linting passes**: `pnpm lint`
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to the branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines

- Follow TypeScript best practices
- Add unit tests for new functionality
- Update documentation for API changes
- Use conventional commit messages
- Ensure all tests pass before submitting

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [YNAB API](https://api.youneedabudget.com/) for the excellent personal finance API
- [NestJS](https://nestjs.com/) for the robust Node.js framework
- [Nx](https://nx.dev/) for monorepo management
- Market data providers for real-time pricing data
