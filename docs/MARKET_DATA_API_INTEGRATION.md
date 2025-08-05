# Market Data API Integration

This document describes the real-time market data integration implemented for the YNAB Investments Sync project.

## Overview

The `MarketDataService` has been enhanced to fetch real-time asset prices from external APIs:

- **Stocks**: Alpha Vantage API
- **Cryptocurrencies**: CoinGecko API
- **Currency Conversion**: ExchangeRate-API

## API Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Alpha Vantage API Key for stock prices (get free key at: https://www.alphavantage.co/support/#api-key)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# CoinGecko API Key (optional, free tier available without key)
COINGECKO_API_KEY=your_coingecko_key
```

### API Keys Setup

1. **Alpha Vantage** (Required for stocks):
   - Visit: https://www.alphavantage.co/support/#api-key
   - Get a free API key (500 requests/day)
   - Add to `.env` as `ALPHA_VANTAGE_API_KEY`

2. **CoinGecko** (Optional for crypto):
   - Free tier: 30 calls/minute without API key
   - Pro tier: Higher rate limits with API key
   - Visit: https://www.coingecko.com/en/api

3. **ExchangeRate-API** (Automatic):
   - Free tier: 1500 requests/month
   - No API key required for basic usage

## Supported Assets

### Stocks

Any valid stock symbol (e.g., AAPL, MSFT, GOOGL, TSLA)

### Cryptocurrencies

- Bitcoin (BTC)
- Ethereum (ETH)
- Cardano (ADA)
- Polkadot (DOT)
- Solana (SOL)
- Polygon (MATIC)
- Avalanche (AVAX)
- Tether (USDT)
- USD Coin (USDC)
- Binance Coin (BNB)
- Ripple (XRP)
- Terra Luna (LUNA)
- Cosmos (ATOM)
- Chainlink (LINK)
- Uniswap (UNI)
- Aave (AAVE)
- Curve (CRV)
- Compound (COMP)
- Maker (MKR)
- Synthetix (SNX)
- Yearn Finance (YFI)

## API Endpoints

### Get Asset Price

```http
GET /market-data/:symbol?currency=USD
```

**Example:**

```bash
curl http://localhost:3000/market-data/AAPL?currency=USD
```

**Response:**

```json
{
  "symbol": "AAPL",
  "price": 173.5,
  "currency": "USD",
  "timestamp": "2025-08-05T14:30:00.000Z"
}
```

### Currency Conversion

```http
POST /market-data/convert
```

**Body:**

```json
{
  "amount": 100,
  "fromCurrency": "EUR",
  "toCurrency": "USD"
}
```

**Response:**

```json
{
  "amount": 116.0,
  "fromCurrency": "EUR",
  "toCurrency": "USD"
}
```

## Implementation Details

### Error Handling

The service implements robust error handling with fallback mechanisms:

1. **API Failures**: Falls back to mock prices for known symbols
2. **Unknown Symbols**: Returns appropriate error messages
3. **Rate Limiting**: Graceful degradation with warnings
4. **Network Issues**: Timeout handling (10 seconds default)

### Fallback Prices

When APIs are unavailable, the service uses these fallback prices:

```typescript
const mockPrices = {
  AAPL: 150.0,
  MSFT: 300.0,
  GOOGL: 2500.0,
  TSLA: 800.0,
  AMZN: 3200.0,
  BTC: 45000.0,
  ETH: 3000.0,
  ADA: 0.5,
  DOT: 25.0,
  SOL: 100.0,
};
```

### Rate Limits

- **Alpha Vantage**: 500 requests/day (free tier)
- **CoinGecko**: 30 requests/minute (free tier)
- **ExchangeRate-API**: 1500 requests/month (free tier)

## Testing

The service includes comprehensive unit tests with mocked API responses:

```bash
# Run market data tests
pnpm nx test api --testNamePattern="MarketDataService"
```

## Usage Examples

### TypeScript/JavaScript

```typescript
// Get stock price
const applePrice = await marketDataService.getAssetPrice('AAPL', 'USD');

// Get crypto price
const bitcoinPrice = await marketDataService.getAssetPrice('BTC', 'EUR');

// Currency conversion
const convertedAmount = await marketDataService.convertCurrency(100, 'EUR', 'USD');
```

### cURL Examples

```bash
# Get Apple stock price in USD
curl "http://localhost:3000/market-data/AAPL?currency=USD"

# Get Bitcoin price in EUR
curl "http://localhost:3000/market-data/BTC?currency=EUR"

# Convert currency
curl -X POST "http://localhost:3000/market-data/convert" \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "fromCurrency": "EUR", "toCurrency": "USD"}'
```

## Performance Considerations

1. **Caching**: Consider implementing Redis caching for frequently requested symbols
2. **Rate Limiting**: Monitor API usage to avoid hitting rate limits
3. **Batch Requests**: For multiple symbols, consider batching where supported by APIs
4. **Circuit Breaker**: Consider implementing circuit breaker pattern for API resilience

## Monitoring

Monitor the following metrics:

- API response times
- API error rates
- Fallback usage frequency
- Rate limit warnings

## Troubleshooting

### Common Issues

1. **"Alpha Vantage API key not configured"**
   - Ensure `ALPHA_VANTAGE_API_KEY` is set in your environment

2. **"API rate limit exceeded"**
   - Wait for rate limit reset or upgrade API plan

3. **"Price not found for symbol"**
   - Verify symbol is valid and traded
   - Check if symbol is supported by the API

4. **Network timeouts**
   - Check internet connectivity
   - Consider increasing timeout values if needed

### Debug Mode

Enable debug logging by setting:

```bash
LOG_LEVEL=debug
```
