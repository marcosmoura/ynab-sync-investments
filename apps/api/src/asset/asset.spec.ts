import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { Asset } from '@/shared/entities';

import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';
import { CreateAssetDto, UpdateAssetDto } from './dto';

describe('AssetController', () => {
  let controller: AssetController;
  let service: AssetService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AssetController],
      providers: [
        AssetService,
        {
          provide: getRepositoryToken(Asset),
          useValue: createMock<Repository<Asset>>(),
        },
      ],
    }).compile();

    service = moduleRef.get(AssetService);
    controller = moduleRef.get(AssetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new asset', async () => {
      const createAssetDto: CreateAssetDto = {
        symbol: 'AAPL',
        amount: 10,
        ynabAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      };

      const expectedResult = {
        id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        symbol: 'AAPL',
        amount: 10,
        ynabAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(service, 'create').mockResolvedValue(expectedResult);

      const result = await controller.create(createAssetDto);

      expect(service.create).toHaveBeenCalledWith(createAssetDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll', () => {
    it('should return all assets when no filter is provided', async () => {
      const expectedAssets = [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          symbol: 'AAPL',
          amount: 10,
          ynabAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
          symbol: 'GOOGL',
          amount: 5,
          ynabAccountId: 'b2c3d4e5-f6g7-8901-bcde-fg2345678901',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(service, 'findAll').mockResolvedValue(expectedAssets);

      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledOnce();
      expect(result).toEqual(expectedAssets);
    });

    it('should return filtered assets when ynabAccountId is provided', async () => {
      const ynabAccountId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const filteredAssets = [
        {
          id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          symbol: 'AAPL',
          amount: 10,
          ynabAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.spyOn(service, 'findByYnabAccountId').mockResolvedValue(filteredAssets);

      const result = await controller.findAll(ynabAccountId);

      expect(service.findByYnabAccountId).toHaveBeenCalledWith(ynabAccountId);
      expect(result).toEqual(filteredAssets);
    });
  });

  describe('findOne', () => {
    it('should return a single asset by id', async () => {
      const assetId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const expectedAsset = {
        id: assetId,
        symbol: 'AAPL',
        amount: 10,
        ynabAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(service, 'findOne').mockResolvedValue(expectedAsset);

      const result = await controller.findOne(assetId);

      expect(service.findOne).toHaveBeenCalledWith(assetId);
      expect(result).toEqual(expectedAsset);
    });
  });

  describe('update', () => {
    it('should update an asset', async () => {
      const assetId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const updateAssetDto: UpdateAssetDto = {
        amount: 15,
      };

      const expectedResult = {
        id: assetId,
        symbol: 'AAPL',
        amount: 15,
        ynabAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(service, 'update').mockResolvedValue(expectedResult);

      const result = await controller.update(assetId, updateAssetDto);

      expect(service.update).toHaveBeenCalledWith(assetId, updateAssetDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('remove', () => {
    it('should delete an asset', async () => {
      const assetId = 'asset-123';

      vi.spyOn(service, 'remove').mockResolvedValue(undefined);

      const result = await controller.remove(assetId);

      expect(service.remove).toHaveBeenCalledWith(assetId);
      expect(result).toEqual({ message: 'Asset deleted successfully' });
    });
  });
});
