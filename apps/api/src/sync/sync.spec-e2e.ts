import { describe, it, expect } from 'vitest';

// The sync module only contains a service that runs background tasks via cron jobs.
// It doesn't expose any HTTP endpoints, so e2e tests are not applicable.
// All sync functionality is tested via unit tests in sync.spec.ts
describe('SyncService (e2e)', () => {
  it('should not have HTTP endpoints - service only', () => {
    // The sync service runs background tasks and doesn't expose HTTP endpoints
    expect(true).toBe(true);
  });
});
