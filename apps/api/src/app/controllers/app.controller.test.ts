import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from './app.controller';
import { AppService } from '../services/app.service';

describe('AppController', () => {
  let controller: AppController;
  let mockAppService: AppService;

  beforeEach(() => {
    mockAppService = {
      getData: vi.fn(),
    } as any;

    controller = new AppController(mockAppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getData', () => {
    it('should return data from service', () => {
      const result = { message: 'Hello API' };
      vi.mocked(mockAppService.getData).mockReturnValue(result);

      const response = controller.getData();

      expect(mockAppService.getData).toHaveBeenCalled();
      expect(response).toEqual(result);
    });
  });
});
