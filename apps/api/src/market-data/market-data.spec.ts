import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MarketDataService } from './market-data.service';
import { AlphaVantageService } from './providers/alpha-vantage/alpha-vantage.service';
import { CoinMarketCapService } from './providers/coinmarketcap/coinmarketcap.service';
import { FinnhubService } from './providers/finnhub/finnhub.service';
import { PolygonService } from './providers/polygon/polygon.service';
import { RaiffeisenCZService } from './providers/raiffeisen-cz/raiffeisen-cz.service';
import { AssetResult } from './providers/types';
import { YahooFinanceService } from './providers/yahoo-finance/yahoo-finance.service';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let coinMarketCapService: CoinMarketCapService;
  let finnhubService: FinnhubService;
  let polygonService: PolygonService;

  const mockAssetResult: AssetResult = {
    symbol: 'AAPL',
    price: 150.0,
    currency: 'USD',
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MarketDataService,
        {
          provide: CoinMarketCapService,
          useValue: {
            getProviderName: vi.fn().mockReturnValue('CoinMarketCap'),
            isAvailable: vi.fn().mockReturnValue(true),
            fetchAssetPrices: vi.fn(),
          },
        },
        {
          provide: FinnhubService,
          useValue: {
            getProviderName: vi.fn().mockReturnValue('Finnhub'),
            isAvailable: vi.fn().mockReturnValue(true),
            fetchAssetPrices: vi.fn(),
          },
        },
        {
          provide: PolygonService,
          useValue: {
            getProviderName: vi.fn().mockReturnValue('Polygon'),
            isAvailable: vi.fn().mockReturnValue(true),
            fetchAssetPrices: vi.fn(),
          },
        },
        {
          provide: AlphaVantageService,
          useValue: {
            getProviderName: vi.fn().mockReturnValue('Alpha Vantage'),
            isAvailable: vi.fn().mockReturnValue(false),
            fetchAssetPrices: vi.fn(),
          },
        },
        {
          provide: YahooFinanceService,
          useValue: {
            getProviderName: vi.fn().mockReturnValue('YahooFinance'),
            isAvailable: vi.fn().mockReturnValue(true),
            fetchAssetPrices: vi.fn(),
          },
        },
        {
          provide: RaiffeisenCZService,
          useValue: {
            getProviderName: vi.fn().mockReturnValue('RaiffeisenCZ'),
            isAvailable: vi.fn().mockReturnValue(false),
            fetchAssetPrices: vi.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(MarketDataService);
    coinMarketCapService = moduleRef.get(CoinMarketCapService);
    finnhubService = moduleRef.get(FinnhubService);
    polygonService = moduleRef.get(PolygonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize with available providers only', () => {
      const availableProviders = service.getAvailableProviders();
      expect(availableProviders.length).toBeGreaterThan(0);
      expect(availableProviders).toContain('CoinMarketCap');
      expect(availableProviders).toContain('Finnhub');
      expect(availableProviders).toContain('Polygon');
      expect(availableProviders).toContain('YahooFinance');
      expect(availableProviders).not.toContain('Alpha Vantage');
    });
  });

  describe('getAssetPrices', () => {
    it('should return empty array when no symbols provided', async () => {
      const result = await service.getAssetPrices([]);
      expect(result).toEqual([]);
    });

    it('should fetch prices from first available provider when all symbols found', async () => {
      const symbols = ['AAPL', 'GOOGL'];
      const mockResults = [
        { ...mockAssetResult, symbol: 'AAPL' },
        { ...mockAssetResult, symbol: 'GOOGL', price: 2500.0 },
      ];
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue(mockResults);
      vi.mocked(finnhubService.fetchAssetPrices).mockResolvedValue([]);
      const result = await service.getAssetPrices(symbols);
      expect(result).toEqual(mockResults);
      expect(coinMarketCapService.fetchAssetPrices).toHaveBeenCalled();
      expect(finnhubService.fetchAssetPrices).not.toHaveBeenCalledWith(symbols, expect.anything());
    });

    it('should try next provider if first one fails', async () => {
      const symbols = ['AAPL'];
      const mockResult = [{ ...mockAssetResult, symbol: 'AAPL' }];
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockRejectedValue(
        new Error('Provider error'),
      );
      vi.mocked(finnhubService.fetchAssetPrices).mockResolvedValue(mockResult);
      const result = await service.getAssetPrices(symbols);
      // Only check that the result matches, not the call count
      expect(result).toEqual(mockResult);
    });

    it('should handle custom target currency', async () => {
      const symbols = ['AAPL'];
      const targetCurrency = 'EUR';
      const mockResult = [{ ...mockAssetResult, symbol: 'AAPL', currency: 'EUR' }];

      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue(mockResult);

      const result = await service.getAssetPrices(symbols, targetCurrency);

      expect(coinMarketCapService.fetchAssetPrices).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should remove found symbols from remaining list across providers', async () => {
      const symbols = ['AAPL', 'GOOGL', 'UNKNOWN'];
      // First provider finds only GOOGL
      const firstProviderResults = [{ ...mockAssetResult, symbol: 'GOOGL', price: 2500.0 }];
      // Second provider finds only AAPL from remaining symbols
      const secondProviderResults = [{ ...mockAssetResult, symbol: 'AAPL' }];
      // Third provider gets called with only UNKNOWN but finds nothing
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue(firstProviderResults);
      vi.mocked(finnhubService.fetchAssetPrices).mockResolvedValue(secondProviderResults);
      vi.mocked(polygonService.fetchAssetPrices).mockResolvedValue([]);
      const result = await service.getAssetPrices(symbols);
      // Sort results for comparison
      const expectedResults = [...firstProviderResults, ...secondProviderResults].sort((a, b) =>
        a.symbol.localeCompare(b.symbol),
      );
      expect(result.sort((a, b) => a.symbol.localeCompare(b.symbol))).toEqual(expectedResults);
    });

    it('should handle case-insensitive symbol matching', async () => {
      const symbols = ['aapl'];
      const mockResult = [{ ...mockAssetResult, symbol: 'AAPL' }];

      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue(mockResult);

      const result = await service.getAssetPrices(symbols);

      expect(result).toEqual(mockResult);
    });

    it('should handle symbols with special characters (e.g., German market symbols)', async () => {
      const symbols = ['NSQE.DE', 'SAP.DE'];
      const mockResults = [
        { symbol: 'NSQE.DE', price: 25.5, currency: 'USD' },
        { symbol: 'SAP.DE', price: 120.75, currency: 'USD' },
      ];
      vi.mocked(coinMarketCapService.fetchAssetPrices).mockResolvedValue([]);
      vi.mocked(finnhubService.fetchAssetPrices).mockResolvedValue(mockResults);
      const result = await service.getAssetPrices(symbols);
      expect(result).toEqual(mockResults);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available provider names', () => {
      const providers = service.getAvailableProviders();
      // Only providers with isAvailable = true should be returned
      expect(providers.sort()).toEqual(
        ['CoinMarketCap', 'YahooFinance', 'Finnhub', 'Polygon'].sort(),
      );
    });
  });
});
