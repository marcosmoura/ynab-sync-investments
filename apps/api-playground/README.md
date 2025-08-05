# API Playground

This is a comprehensive testing application for the YNAB Investments Sync API. It simulates real-world scenarios by calling all API endpoints with realistic data and validates the entire sync process.

## Purpose

The API Playground tests the complete workflow:

1. **Database Setup** - Resets the database to ensure clean state
2. **User Settings** - Creates user settings with YNAB API token and sync schedule
3. **YNAB Integration** - Tests YNAB API connectivity and account access
4. **Asset Management** - Creates multiple investment and crypto assets
5. **Sync Process** - Triggers the automated sync process
6. **Validation** - Verifies that YNAB accounts were updated correctly

## Prerequisites

1. **Running API Server** - The main API server must be running on `http://localhost:3000`
2. **Database** - PostgreSQL database must be available and configured
3. **YNAB Configuration** - You need valid YNAB API credentials and account IDs

## Environment Variables

Copy the API's `.env.example` to `.env` and configure the following YNAB-specific variables:

```bash
# Required for testing
YNAB_API_KEY=your_ynab_personal_access_token
YNAB_BUDGET_ID=your_budget_id_for_testing
YNAB_CRYPTO_ACCOUNT_ID=your_crypto_account_id
YNAB_INVESTMENTS_ACCOUNT_ID=your_investments_account_id
```

### Getting YNAB Credentials

1. **YNAB API Key**: Go to [YNAB Developer Settings](https://app.youneedabudget.com/settings/developer) and create a Personal Access Token
2. **Budget ID**: Use the API endpoint `/api/ynab/budgets` or check the YNAB URL when viewing your budget
3. **Account IDs**: Use the API endpoint `/api/ynab/accounts` to list your accounts and get the IDs for your crypto and investment accounts

## Test Data

The playground uses the following test assets:

### Crypto Assets (YNAB_CRYPTO_ACCOUNT_ID)

- **BTC**: 0.5 Bitcoin
- **ETH**: 2.5 Ethereum
- **NEXO**: 1000 NEXO tokens

### Investment Assets (YNAB_INVESTMENTS_ACCOUNT_ID)

- **AAPL**: 10 shares Apple
- **MSFT**: 5 shares Microsoft
- **VOO**: 15 shares Vanguard S&P 500 ETF
- **NVDA**: 8 shares NVIDIA
- **NQSE.DE**: 20 shares (German market)

## Running the Playground

1. **Start the API server**:

   ```bash
   pnpm nx serve api
   ```

2. **Run the playground**:

   ```bash
   pnpm nx run api-playground:build
   node dist/apps/api-playground/main.js
   ```

   Or use the development command:

   ```bash
   pnpm nx serve api-playground
   ```

## What the Playground Tests

### 🔄 Database Reset

- Clears existing data to ensure clean test state
- Verifies API connectivity

### ⚙️ User Settings Management

- Creates user settings with YNAB API token
- Sets sync schedule to "daily"
- Configures target budget ID
- Validates settings persistence

### 🏦 YNAB Integration

- Tests YNAB API connectivity with provided token
- Retrieves available budgets
- Fetches accounts from the specified budget
- Validates that test accounts exist

### 📊 Asset Management

- Creates multiple crypto and investment assets
- Tests asset creation across different accounts
- Verifies asset filtering by account ID
- Validates data persistence

### 🔄 Sync Process

- Triggers manual synchronization
- Simulates scheduled sync behavior
- Validates market data retrieval
- Tests YNAB balance updates

### ✅ Result Validation

- Checks updated YNAB account balances
- Validates that balances reflect market values
- Verifies currency handling
- Confirms sync completion

## Expected Output

The playground provides detailed console output showing:

- ✅ Successful operations
- ❌ Failed operations
- 📊 Data summaries
- 💰 Account balances
- ⚠️ Warnings for unusual conditions

## Troubleshooting

### Common Issues

1. **API Not Running**: Ensure the main API server is running on port 3000
2. **Database Connection**: Check database configuration and connectivity
3. **YNAB Authentication**: Verify your YNAB API token is valid and not expired
4. **Account IDs**: Ensure the specified YNAB account IDs exist in your budget
5. **Market Data**: Some market data providers may have rate limits or require API keys

### Error Messages

- `YNAB_API_KEY environment variable is required` - Configure your YNAB credentials
- `Required YNAB test accounts not found` - Check your account IDs
- `API health check failed` - Start the API server
- `Database reset failed` - Check database connectivity

## Development

The playground is structured as follows:

- `api-playground.ts` - Main orchestrator class
- `api-client.ts` - HTTP client for API endpoints
- `test-data.ts` - Test data provider with crypto and investment assets
- `database-manager.ts` - Database reset and management with health checking
- `ynab-validator.ts` - YNAB result validation

### Database Manager Features

The `DatabaseManager` class provides:

- **Environment Validation**: Checks if API is running and pnpm is available
- **Database Reset**: Safely resets the database with proper error handling
- **Health Monitoring**: Monitors API and database health status
- **Startup Management**: Can attempt to start the database if needed
- **Detailed Status**: Provides comprehensive status information for debugging

Example usage:

```typescript
const dbManager = new DatabaseManager();

// Check if everything is healthy
const status = await dbManager.getDatabaseStatus();
console.log(`Database healthy: ${status.healthy}`);

// Get detailed status for debugging
const detailedStatus = await dbManager.getDetailedStatus();
console.log(`Response time: ${detailedStatus.responseTime}ms`);

// Reset database with error handling
await dbManager.resetDatabase();
```

## Extending the Playground

To add new test scenarios:

1. Add new test methods to `ApiPlayground`
2. Extend `TestData` with additional asset types
3. Add new validation rules to `YnabValidator`
4. Update the main `run()` method to include new tests
