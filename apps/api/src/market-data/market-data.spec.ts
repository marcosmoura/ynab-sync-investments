import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { GetAssetPriceDto, ConvertCurrencyDto, AssetPriceResponseDto } from './dto';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

describe('MarketDataController', () => {
  let controller: MarketDataController;
  let service: MarketDataService;

  const mockMarketDataService = {
    getAssetPrice: vi.fn(),
    getAssetPrices: vi.fn(),
    convertCurrency: vi.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [MarketDataController],
      providers: [
        {
          provide: MarketDataService,
          useValue: mockMarketDataService,
        },
      ],
    }).compile();

    service = moduleRef.get(MarketDataService);
    controller = moduleRef.get(MarketDataController);

    // Reset mocks
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('getAssetPrice', () => {
    it('should get asset price with default currency', async () => {
      const dto: GetAssetPriceDto = { symbol: 'AAPL' };
      const serviceResult = { symbol: 'AAPL', price: 150.0, currency: 'USD' };

      mockMarketDataService.getAssetPrice.mockResolvedValue(serviceResult);

      const result = await controller.getAssetPrice(dto);

      expect(mockMarketDataService.getAssetPrice).toHaveBeenCalledWith('AAPL', 'USD');
      expect(result).toBeInstanceOf(AssetPriceResponseDto);
      expect(result.symbol).toBe('AAPL');
      expect(result.price).toBe(150.0);
      expect(result.currency).toBe('USD');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should get asset price with custom currency', async () => {
      const dto: GetAssetPriceDto = { symbol: 'BTC', targetCurrency: 'EUR' };
      const serviceResult = { symbol: 'BTC', price: 40000.0, currency: 'EUR' };

      mockMarketDataService.getAssetPrice.mockResolvedValue(serviceResult);

      const result = await controller.getAssetPrice(dto);

      expect(mockMarketDataService.getAssetPrice).toHaveBeenCalledWith('BTC', 'EUR');
      expect(result.symbol).toBe('BTC');
      expect(result.price).toBe(40000.0);
      expect(result.currency).toBe('EUR');
    });

    it('should handle service errors', async () => {
      const dto: GetAssetPriceDto = { symbol: 'INVALID' };

      mockMarketDataService.getAssetPrice.mockRejectedValue(new Error('Price not found'));

      await expect(controller.getAssetPrice(dto)).rejects.toThrow('Price not found');
      expect(mockMarketDataService.getAssetPrice).toHaveBeenCalledWith('INVALID', 'USD');
    });
  });

  describe('convertCurrency', () => {
    it('should convert currency', async () => {
      const dto: ConvertCurrencyDto = {
        amount: 100,
        fromCurrency: 'EUR',
        toCurrency: 'USD',
      };

      mockMarketDataService.convertCurrency.mockResolvedValue(110.5);

      const result = await controller.convertCurrency(dto);

      expect(mockMarketDataService.convertCurrency).toHaveBeenCalledWith(100, 'EUR', 'USD');
      expect(result).toEqual({ convertedAmount: 110.5 });
    });

    it('should handle same currency conversion', async () => {
      const dto: ConvertCurrencyDto = {
        amount: 50,
        fromCurrency: 'USD',
        toCurrency: 'USD',
      };

      mockMarketDataService.convertCurrency.mockResolvedValue(50);

      const result = await controller.convertCurrency(dto);

      expect(mockMarketDataService.convertCurrency).toHaveBeenCalledWith(50, 'USD', 'USD');
      expect(result).toEqual({ convertedAmount: 50 });
    });

    it('should handle service errors in currency conversion', async () => {
      const dto: ConvertCurrencyDto = {
        amount: 100,
        fromCurrency: 'INVALID',
        toCurrency: 'USD',
      };

      mockMarketDataService.convertCurrency.mockRejectedValue(new Error('Invalid currency'));

      await expect(controller.convertCurrency(dto)).rejects.toThrow('Invalid currency');
    });
  });
});

describe('AssetPriceResponseDto', () => {
  it('should create instance with provided timestamp', () => {
    const timestamp = new Date('2023-12-01T15:30:00Z');
    const dto = new AssetPriceResponseDto('AAPL', 150.25, 'USD', timestamp);

    expect(dto.symbol).toBe('AAPL');
    expect(dto.price).toBe(150.25);
    expect(dto.currency).toBe('USD');
    expect(dto.timestamp).toBe(timestamp);
  });

  it('should create instance with default timestamp when not provided', () => {
    const beforeCreation = Date.now();
    const dto = new AssetPriceResponseDto('AAPL', 150.25, 'USD');
    const afterCreation = Date.now();

    expect(dto.symbol).toBe('AAPL');
    expect(dto.price).toBe(150.25);
    expect(dto.currency).toBe('USD');
    expect(dto.timestamp).toBeInstanceOf(Date);
    expect(dto.timestamp?.getTime()).toBeGreaterThanOrEqual(beforeCreation);
    expect(dto.timestamp?.getTime()).toBeLessThanOrEqual(afterCreation);
  });
});

describe('MarketDataService', () => {
  let service: MarketDataService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [MarketDataService],
    }).compile();

    service = moduleRef.get(MarketDataService);

    // Reset environment variables
    delete process.env.COINMARKETCAP_API_KEY;
    delete process.env.POLYGON_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAssetPrice', () => {
    beforeEach(() => {
      // Mock the fetch method to avoid real API calls in tests
      global.fetch = vi.fn() as unknown as typeof fetch;
    });

    it('should return price from CoinMarketCap when API key is available', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';

      const mockCoinMarketCapResponse = {
        data: {
          BTC: [
            {
              symbol: 'BTC',
              is_active: 1,
              quote: {
                USD: {
                  price: 45000.0,
                },
              },
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCoinMarketCapResponse),
      } as Response);

      const result = await service.getAssetPrice('BTC', 'USD');

      expect(result).toEqual({
        symbol: 'BTC',
        price: 45000.0,
        currency: 'USD',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('coinmarketcap.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CMC_PRO_API_KEY': 'test-key',
          }),
        }),
      );
    });

    it('should skip inactive assets from CoinMarketCap and try Polygon', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';
      process.env.POLYGON_API_KEY = 'test-polygon-key';

      // CoinMarketCap returns inactive asset
      const mockCoinMarketCapResponse = {
        data: {
          BTC: [
            {
              symbol: 'BTC',
              is_active: 0,
              quote: {
                USD: {
                  price: 45000.0,
                },
              },
            },
          ],
        },
      };

      // Polygon stocks succeeds
      const mockPolygonResponse = {
        results: [
          {
            T: 'BTC',
            c: 44000.0,
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCoinMarketCapResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPolygonResponse),
        } as Response);

      const result = await service.getAssetPrice('BTC', 'USD');

      expect(result).toEqual({
        symbol: 'BTC',
        price: 44000.0,
        currency: 'USD',
      });
    });

    it('should try CoinMarketCap when Yahoo Finance fails and API key is available', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';

      const mockCoinMarketCapResponse = {
        data: {
          BTC: [
            {
              symbol: 'BTC',
              is_active: 1,
              quote: {
                USD: {
                  price: 45000.0,
                },
              },
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCoinMarketCapResponse),
      } as Response);

      const result = await service.getAssetPrice('BTC', 'USD');

      expect(result).toEqual({
        symbol: 'BTC',
        price: 45000.0,
        currency: 'USD',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('coinmarketcap.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CMC_PRO_API_KEY': 'test-key',
          }),
        }),
      );
    });

    it('should fallback to CoinMarketCap when Yahoo Finance fails', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';

      const mockCoinMarketCapResponse = {
        data: {
          BTC: [
            {
              symbol: 'BTC',
              is_active: 1,
              quote: {
                USD: {
                  price: 45000.0,
                },
              },
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCoinMarketCapResponse),
      } as Response);

      const result = await service.getAssetPrice('BTC', 'USD');

      expect(result).toEqual({
        symbol: 'BTC',
        price: 45000.0,
        currency: 'USD',
      });
    });

    it('should fallback to Polygon when CoinMarketCap fails', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';
      process.env.POLYGON_API_KEY = 'test-polygon-key';

      // CoinMarketCap fails
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('CoinMarketCap API Error'));

      // Polygon stocks succeeds
      const mockPolygonResponse = {
        results: [
          {
            T: 'AAPL',
            c: 150.0,
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPolygonResponse),
      } as Response);

      const result = await service.getAssetPrice('AAPL', 'USD');

      expect(result).toEqual({
        symbol: 'AAPL',
        price: 150.0,
        currency: 'USD',
      });
    });

    it('should throw error when all providers fail', async () => {
      // No API keys set, so no providers will be tried
      await expect(service.getAssetPrice('INVALID', 'USD')).rejects.toThrow(
        'Failed to fetch price for INVALID: Unable to find asset in any provider',
      );
    });

    it('should try Polygon indices when stocks fail', async () => {
      process.env.POLYGON_API_KEY = 'test-polygon-key';

      // Polygon stocks fails (no results)
      const mockPolygonStocksResponse = {
        results: [],
      };

      // Polygon indices succeeds
      const mockPolygonIndicesResponse = {
        results: [
          {
            T: 'SPY',
            c: 450.0,
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPolygonStocksResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPolygonIndicesResponse),
        } as Response);

      const result = await service.getAssetPrice('SPY', 'USD');

      expect(result).toEqual({
        symbol: 'SPY',
        price: 450.0,
        currency: 'USD',
      });

      // Should have called individual ticker endpoints (stocks first, then indices)
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('/ticker/SPY/prev'),
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('/ticker/I:SPY/prev'),
        expect.any(Object),
      );
    });

    it('should convert currency when needed', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';

      const mockCoinMarketCapResponse = {
        data: {
          BTC: [
            {
              symbol: 'BTC',
              is_active: 1,
              quote: {
                EUR: {
                  price: 85.0,
                },
              },
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCoinMarketCapResponse),
      } as Response);

      const result = await service.getAssetPrice('BTC', 'EUR');

      expect(result).toEqual({
        symbol: 'BTC',
        price: 85.0,
        currency: 'EUR',
      });

      // Verify CoinMarketCap was called with EUR conversion
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('convert=EUR'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CMC_PRO_API_KEY': 'test-key',
          }),
        }),
      );
    });

    it('should handle provider order correctly with multiple symbols', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';
      process.env.POLYGON_API_KEY = 'test-polygon-key';

      // CoinMarketCap finds some symbols
      const mockCoinMarketCapResponse = {
        data: {
          BTC: [
            {
              symbol: 'BTC',
              is_active: 1,
              quote: {
                USD: {
                  price: 45000.0,
                },
              },
            },
          ],
        },
      };

      // Polygon finds remaining symbols
      const mockPolygonResponse = {
        results: [
          {
            T: 'AAPL',
            c: 150.0,
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCoinMarketCapResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPolygonResponse),
        } as Response);

      const result = await service.getAssetPrices(['BTC', 'AAPL'], 'USD');

      expect(result).toEqual([
        { symbol: 'BTC', price: 45000.0, currency: 'USD' },
        { symbol: 'AAPL', price: 150.0, currency: 'USD' },
      ]);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('coinmarketcap.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CMC_PRO_API_KEY': 'test-key',
          }),
        }),
      );
    });
  });

  describe('getAssetPrices (bulk)', () => {
    beforeEach(() => {
      global.fetch = vi.fn() as unknown as typeof fetch;
    });

    it('should handle multiple symbols with CoinMarketCap first', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';

      const mockCoinMarketCapResponse = {
        data: {
          BTC: [
            {
              symbol: 'BTC',
              is_active: 1,
              quote: {
                USD: {
                  price: 45000.0,
                },
              },
            },
          ],
          ETH: [
            {
              symbol: 'ETH',
              is_active: 1,
              quote: {
                USD: {
                  price: 3000.0,
                },
              },
            },
          ],
        },
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCoinMarketCapResponse),
      } as Response);

      const result = await service.getAssetPrices(['BTC', 'ETH'], 'USD');

      expect(result).toEqual([
        { symbol: 'BTC', price: 45000.0, currency: 'USD' },
        { symbol: 'ETH', price: 3000.0, currency: 'USD' },
      ]);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should filter out symbols with special characters for CoinMarketCap', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';
      process.env.POLYGON_API_KEY = 'test-polygon-key';

      // CoinMarketCap response for valid symbols only (BTC, ETH)
      const mockCoinMarketCapResponse = {
        data: {
          BTC: [
            {
              symbol: 'BTC',
              is_active: 1,
              quote: {
                USD: {
                  price: 45000.0,
                },
              },
            },
          ],
          ETH: [
            {
              symbol: 'ETH',
              is_active: 1,
              quote: {
                USD: {
                  price: 3000.0,
                },
              },
            },
          ],
        },
      };

      // Polygon response for the special character symbol
      const mockPolygonResponse = {
        results: [
          {
            T: 'NQSE.DE',
            c: 100.0,
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCoinMarketCapResponse),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPolygonResponse),
        } as Response);

      const result = await service.getAssetPrices(['BTC', 'ETH', 'NQSE.DE'], 'USD');

      expect(result).toEqual([
        { symbol: 'BTC', price: 45000.0, currency: 'USD' },
        { symbol: 'ETH', price: 3000.0, currency: 'USD' },
        { symbol: 'NQSE.DE', price: 100.0, currency: 'USD' },
      ]);

      // Should make 2 API calls: CoinMarketCap for BTC,ETH and Polygon for NQSE.DE
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // First call should be to CoinMarketCap with only valid symbols
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('coinmarketcap.com'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-CMC_PRO_API_KEY': 'test-key',
          }),
        }),
      );

      // Second call should be to Polygon for the special character symbol
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('polygon.io'),
        expect.any(Object),
      );
    });

    it('should handle all symbols with special characters', async () => {
      process.env.COINMARKETCAP_API_KEY = 'test-key';
      process.env.POLYGON_API_KEY = 'test-polygon-key';

      // Polygon response for special character symbols
      const mockPolygonResponse1 = {
        results: [
          {
            T: 'NQSE.DE',
            c: 100.0,
          },
        ],
      };

      const mockPolygonResponse2 = {
        results: [
          {
            T: 'VOO-X',
            c: 200.0,
          },
        ],
      };

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPolygonResponse1),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPolygonResponse2),
        } as Response);

      const result = await service.getAssetPrices(['NQSE.DE', 'VOO-X'], 'USD');

      expect(result).toEqual([
        { symbol: 'NQSE.DE', price: 100.0, currency: 'USD' },
        { symbol: 'VOO-X', price: 200.0, currency: 'USD' },
      ]);

      // Should skip CoinMarketCap entirely and go straight to Polygon
      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Both calls should be to Polygon
      expect(global.fetch).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('polygon.io'),
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('polygon.io'),
        expect.any(Object),
      );
    });
  });

  describe('convertCurrency', () => {
    beforeEach(() => {
      global.fetch = vi.fn() as unknown as typeof fetch;
    });

    it('should return same amount for same currency', async () => {
      const result = await service.convertCurrency(100, 'USD', 'USD');
      expect(result).toBe(100);
    });

    it('should convert between different currencies', async () => {
      const mockResponse = {
        rates: {
          USD: 1.16,
        },
      };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await service.convertCurrency(100, 'EUR', 'USD');
      expect(result).toBeCloseTo(116, 1);
    });

    it('should handle conversion errors gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'));

      const result = await service.convertCurrency(50, 'EUR', 'USD');
      expect(result).toBe(50);
    });
  });
});
