import { beforeEach, vi } from 'vitest';

// Set NODE_ENV to test early
process.env.NODE_ENV = 'test';

// Create a silent console mock
const silentConsole = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

// Mock console methods to suppress output during tests
beforeEach(() => {
  // Mock console methods to suppress logs during tests
  vi.spyOn(console, 'log').mockImplementation(silentConsole.log);
  vi.spyOn(console, 'error').mockImplementation(silentConsole.error);
  vi.spyOn(console, 'warn').mockImplementation(silentConsole.warn);
  vi.spyOn(console, 'info').mockImplementation(silentConsole.info);
  vi.spyOn(console, 'debug').mockImplementation(silentConsole.debug);

  // Mock process.stdout.write to suppress other logging
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});
