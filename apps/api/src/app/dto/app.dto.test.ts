import { describe, expect, it } from 'vitest';
import { AppResponseDto } from './app.dto';

describe('AppResponseDto', () => {
  it('should have correct structure', () => {
    const dto: AppResponseDto = {
      message: 'test message',
    };

    expect(dto).toHaveProperty('message');
    expect(typeof dto.message).toBe('string');
  });
});
