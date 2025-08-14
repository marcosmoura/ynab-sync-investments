import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

import { RaiffeisenCZService } from './raiffeisen-cz.service';

describe('RaiffeisenCzService', () => {
  let service: RaiffeisenCZService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RaiffeisenCZService],
    }).compile();
    service = module.get<RaiffeisenCZService>(RaiffeisenCZService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getProviderName', () => {
    it('should return Raiffeisen CZ', () => {
      expect(service.getProviderName()).toBe('Raiffeisen CZ');
    });
  });

  describe('isAvailable', () => {
    it('should always return true', () => {
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('fetchAssetPrices', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      global.fetch = mockFetch;
    });

    it('should return empty array for empty symbols', async () => {
      const result = await service.fetchAssetPrices([], 'CZK');
      expect(result).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fetch stock price from HTML', async () => {
      const html = `
        <div class="striped-list-label">Quote</div>
        <div class="striped-list-value">1234.56</div>
        <div class="striped-list-label">Currency</div>
        <div class="striped-list-value">CZK</div>
      `;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(html),
      });
      const result = await service.fetchAssetPrices(['RFINCZ'], 'CZK');
      expect(result).toEqual([{ symbol: 'RFINCZ', price: 1234.56, currency: 'CZK' }]);
    });

    it('should handle numbers with commas and various formats using accounting library', async () => {
      const html = `
        <div class="striped-list-label">Quote</div>
        <div class="striped-list-value">1,234.56 CZK</div>
        <div class="striped-list-label">Currency</div>
        <div class="striped-list-value">CZK</div>
      `;
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(html),
      });
      const result = await service.fetchAssetPrices(['COMPLEX_FORMAT'], 'CZK');
      expect(result).toEqual([{ symbol: 'COMPLEX_FORMAT', price: 1234.56, currency: 'CZK' }]);
    });

    it('should fetch fund price from HTML', async () => {
      // First call returns null for stock, second for fund
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(`
            <div class="top-info-label">Price</div>
            <div class="top-info-value">2345.67</div>
            <div class="top-info-label">Currency</div>
            <div class="top-info-value">CZK</div>
          `),
        });
      const result = await service.fetchAssetPrices(['FUND1'], 'CZK');
      expect(result).toEqual([{ symbol: 'FUND1', price: 2345.67, currency: 'CZK' }]);
    });

    it('should fetch certificate RCB price from HTML', async () => {
      // First two calls return null for stock and fund, third for certificate RCB
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(`
            <div class="striped-list-label">Denomination / nominal</div>
            <div class="striped-list-value">1,000.00</div>
            <div class="striped-list-label">Product currency</div>
            <div class="striped-list-value">CZK</div>
            <div class="top-info-label">Bid</div>
            <div class="top-info-value">95.50</div>
          `),
        });
      const result = await service.fetchAssetPrices(['CERT1'], 'CZK');
      expect(result).toEqual([{ symbol: 'CERT1', price: 955, currency: 'CZK' }]);
    });

    it('should handle certificate RCB with missing bid data', async () => {
      // Certificate RCB with missing bid should return null
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(''),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(`
            <div class="striped-list-label">Denomination / nominal</div>
            <div class="striped-list-value">1,000.00</div>
            <div class="striped-list-label">Product currency</div>
            <div class="striped-list-value">CZK</div>
          `),
        });
      const result = await service.fetchAssetPrices(['CERT_NO_BID'], 'CZK');
      expect(result).toEqual([]);
    });

    it('should handle multiple symbols', async () => {
      // For RFINCZ: stock fetch returns valid, fund and certificate fetch not called
      // For FUND1: stock fetch returns empty, fund fetch returns valid, certificate fetch not called
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(`
            <div class="striped-list-label">Quote</div>
            <div class="striped-list-value">1234.56</div>
            <div class="striped-list-label">Currency</div>
            <div class="striped-list-value">CZK</div>
          `),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(''), // FUND1 stock fetch returns empty
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () =>
            Promise.resolve(`
            <div class="top-info-label">Price</div>
            <div class="top-info-value">2345.67</div>
            <div class="top-info-label">Currency</div>
            <div class="top-info-value">CZK</div>
          `),
        });
      const result = await service.fetchAssetPrices(['RFINCZ', 'FUND1'], 'CZK');
      expect(result).toEqual([
        { symbol: 'RFINCZ', price: 1234.56, currency: 'CZK' },
        { symbol: 'FUND1', price: 2345.67, currency: 'CZK' },
      ]);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') });
      const result = await service.fetchAssetPrices(['INVALID'], 'CZK');
      expect(result).toEqual([]);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const result = await service.fetchAssetPrices(['NETWORK_ERROR'], 'CZK');
      expect(result).toEqual([]);
    });

    it('should skip symbols with invalid price data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () =>
          Promise.resolve(`
          <div class="striped-list-label">Quote</div>
          <div class="striped-list-value">0</div>
          <div class="striped-list-label">Currency</div>
          <div class="striped-list-value">CZK</div>
        `),
      });
      const result = await service.fetchAssetPrices(['INVALID_PRICE'], 'CZK');
      expect(result).toEqual([]);
    });

    it('should handle missing price data gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve(''),
      });
      const result = await service.fetchAssetPrices(['NO_DATA'], 'CZK');
      expect(result).toEqual([]);
    });

    it('should log warning when no valid price found for symbol', async () => {
      // Mock all three price fetching methods to return null/empty
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(''), // stock returns empty
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(''), // fund returns empty
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve(''), // certificate returns empty
        });

      const result = await service.fetchAssetPrices(['NO_VALID_DATA'], 'CZK');
      expect(result).toEqual([]);
    });

    it('should handle timeout gracefully', async () => {
      const mockAbortController = {
        signal: { aborted: false } as AbortSignal,
        abort: vi.fn(),
      };
      vi.spyOn(global, 'AbortController').mockReturnValue(
        mockAbortController as unknown as AbortController,
      );
      mockFetch.mockRejectedValue(new Error('AbortError'));
      const result = await service.fetchAssetPrices(['TIMEOUT_TEST'], 'CZK');
      expect(result).toEqual([]);
    }, 15000);
  });
});
