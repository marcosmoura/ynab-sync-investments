import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { Repository } from 'typeorm';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

import { Asset } from '@/shared/entities';

import { AssetModule } from './asset.module';

describe('AssetController (e2e)', () => {
  let app: INestApplication;
  let repository: Repository<Asset>;

  const mockAsset: Asset = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    symbol: 'AAPL',
    amount: 10,
    ynabAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const mockRepository = {
      create: vi.fn(),
      save: vi.fn(),
      find: vi.fn(),
      findOne: vi.fn(),
      delete: vi.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AssetModule],
    })
      .overrideProvider(getRepositoryToken(Asset))
      .useValue(mockRepository)
      .compile();

    app = moduleFixture.createNestApplication({
      logger: false, // Disable NestJS logging for tests
    });
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    app.setGlobalPrefix('api');
    repository = moduleFixture.get<Repository<Asset>>(getRepositoryToken(Asset));

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/assets (POST)', () => {
    it('should create a new asset', async () => {
      const createAssetDto = {
        symbol: 'AAPL',
        amount: 10,
        ynabAccountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      };

      vi.spyOn(repository, 'create').mockReturnValue(mockAsset);
      vi.spyOn(repository, 'save').mockResolvedValue(mockAsset);

      const response = await request(app.getHttpServer())
        .post('/api/assets')
        .send(createAssetDto)
        .expect(201);

      expect(response.body).toEqual({
        id: mockAsset.id,
        symbol: mockAsset.symbol,
        amount: mockAsset.amount,
        ynabAccountId: mockAsset.ynabAccountId,
        createdAt: mockAsset.createdAt.toISOString(),
        updatedAt: mockAsset.updatedAt.toISOString(),
      });

      expect(repository.create).toHaveBeenCalledWith(createAssetDto);
      expect(repository.save).toHaveBeenCalledWith(mockAsset);
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        symbol: '', // Invalid empty symbol
        amount: -1, // Invalid negative amount
      };

      await request(app.getHttpServer()).post('/api/assets').send(invalidData).expect(400);
    });
  });

  describe('/api/assets (GET)', () => {
    it('should return all assets', async () => {
      const assets = [mockAsset];
      vi.spyOn(repository, 'find').mockResolvedValue(assets);

      const response = await request(app.getHttpServer()).get('/api/assets').expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual({
        id: mockAsset.id,
        symbol: mockAsset.symbol,
        amount: mockAsset.amount,
        ynabAccountId: mockAsset.ynabAccountId,
        createdAt: mockAsset.createdAt.toISOString(),
        updatedAt: mockAsset.updatedAt.toISOString(),
      });

      expect(repository.find).toHaveBeenCalledOnce();
    });

    it('should filter assets by ynabAccountId', async () => {
      const ynabAccountId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const assets = [mockAsset];
      vi.spyOn(repository, 'find').mockResolvedValue(assets);

      const response = await request(app.getHttpServer())
        .get(`/api/assets?ynabAccountId=${ynabAccountId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].ynabAccountId).toBe(ynabAccountId);

      expect(repository.find).toHaveBeenCalledWith({
        where: { ynabAccountId },
      });
    });
  });

  describe('/api/assets/:id (GET)', () => {
    it('should return a single asset', async () => {
      const assetId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      vi.spyOn(repository, 'findOne').mockResolvedValue(mockAsset);

      const response = await request(app.getHttpServer()).get(`/api/assets/${assetId}`).expect(200);

      expect(response.body).toEqual({
        id: mockAsset.id,
        symbol: mockAsset.symbol,
        amount: mockAsset.amount,
        ynabAccountId: mockAsset.ynabAccountId,
        createdAt: mockAsset.createdAt.toISOString(),
        updatedAt: mockAsset.updatedAt.toISOString(),
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: assetId },
      });
    });

    it('should return 404 for non-existent asset', async () => {
      const assetId = 'b2c3d4e5-f6g7-8901-bcde-fg2345678901';
      vi.spyOn(repository, 'findOne').mockResolvedValue(null);

      await request(app.getHttpServer()).get(`/api/assets/${assetId}`).expect(404);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: assetId },
      });
    });
  });

  describe('/api/assets/:id (PATCH)', () => {
    it('should update an asset', async () => {
      const assetId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const updateData = { amount: 15 };
      const updatedAsset = { ...mockAsset, amount: 15 };

      vi.spyOn(repository, 'findOne').mockResolvedValue(mockAsset);
      vi.spyOn(repository, 'save').mockResolvedValue(updatedAsset);

      const response = await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.amount).toBe(15);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: assetId },
      });
      expect(repository.save).toHaveBeenCalledWith({
        ...mockAsset,
        ...updateData,
      });
    });

    it('should return 404 for non-existent asset', async () => {
      const assetId = 'b2c3d4e5-f6g7-8901-bcde-fg2345678901';
      const updateData = { amount: 15 };

      vi.spyOn(repository, 'findOne').mockResolvedValue(null);

      await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .send(updateData)
        .expect(404);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: assetId },
      });
    });

    it('should return 400 for invalid data', async () => {
      const assetId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const invalidData = { amount: -1 }; // Invalid negative amount

      await request(app.getHttpServer())
        .patch(`/api/assets/${assetId}`)
        .send(invalidData)
        .expect(400);
    });
  });

  describe('/api/assets/:id (DELETE)', () => {
    it('should delete an asset', async () => {
      const assetId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      vi.spyOn(repository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

      const response = await request(app.getHttpServer())
        .delete(`/api/assets/${assetId}`)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Asset deleted successfully',
      });

      expect(repository.delete).toHaveBeenCalledWith(assetId);
    });

    it('should return 404 for non-existent asset', async () => {
      const assetId = 'b2c3d4e5-f6g7-8901-bcde-fg2345678901';
      vi.spyOn(repository, 'delete').mockResolvedValue({ affected: 0, raw: {} });

      await request(app.getHttpServer()).delete(`/api/assets/${assetId}`).expect(404);

      expect(repository.delete).toHaveBeenCalledWith(assetId);
    });
  });
});
