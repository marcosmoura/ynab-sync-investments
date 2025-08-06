import { describe, it, expect, vi, beforeEach } from 'vitest';

import { fetchWithTimeout } from './fetch-with-timeout';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should make a successful fetch request', async () => {
    const mockResponse = new Response('{"data": "test"}', {
      status: 200,
      statusText: 'OK',
    });
    mockFetch.mockResolvedValue(mockResponse);

    const url = 'https://api.example.com/data';
    const timeout = 5000;

    const response = await fetchWithTimeout(url, timeout);

    expect(mockFetch).toHaveBeenCalledWith(url, {
      signal: expect.any(AbortSignal),
    });
    expect(response).toBe(mockResponse);
  });

  it('should pass through request options', async () => {
    const mockResponse = new Response('{"data": "test"}', {
      status: 200,
      statusText: 'OK',
    });
    mockFetch.mockResolvedValue(mockResponse);

    const url = 'https://api.example.com/data';
    const timeout = 5000;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"test": true}',
    };

    await fetchWithTimeout(url, timeout, options);

    expect(mockFetch).toHaveBeenCalledWith(url, {
      ...options,
      signal: expect.any(AbortSignal),
    });
  });

  it('should handle fetch errors', async () => {
    const error = new Error('Network error');
    mockFetch.mockRejectedValue(error);

    await expect(fetchWithTimeout('https://api.example.com/data', 5000)).rejects.toThrow(
      'Network error',
    );
  });

  it('should include AbortSignal in fetch options', async () => {
    const mockResponse = new Response('{"data": "test"}');
    mockFetch.mockResolvedValue(mockResponse);

    await fetchWithTimeout('https://api.example.com/data', 5000);

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data', {
      signal: expect.any(AbortSignal),
    });
  });
});
