import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Asset } from '@/database/entities';

import { CreateAssetDto, UpdateAssetDto, AssetResponseDto } from './dto';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    @InjectRepository(Asset)
    private assetRepository: Repository<Asset>,
  ) {}

  async create(createAssetDto: CreateAssetDto): Promise<AssetResponseDto> {
    const asset = this.assetRepository.create(createAssetDto);
    const savedAsset = await this.assetRepository.save(asset);

    this.logger.log(`Created asset: ${savedAsset.symbol} for account ${savedAsset.ynabAccountId}`);
    return this.mapToResponseDto(savedAsset);
  }

  async findAll(): Promise<AssetResponseDto[]> {
    const assets = await this.assetRepository.find();
    return assets.map((asset) => this.mapToResponseDto(asset));
  }

  async findByYnabAccountId(ynabAccountId: string): Promise<AssetResponseDto[]> {
    const assets = await this.assetRepository.find({
      where: { ynabAccountId },
    });
    return assets.map((asset) => this.mapToResponseDto(asset));
  }

  async findOne(id: string): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    return this.mapToResponseDto(asset);
  }

  async update(id: string, updateAssetDto: UpdateAssetDto): Promise<AssetResponseDto> {
    const asset = await this.assetRepository.findOne({
      where: { id },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    Object.assign(asset, updateAssetDto);
    const updatedAsset = await this.assetRepository.save(asset);

    this.logger.log(`Updated asset: ${updatedAsset.symbol}`);
    return this.mapToResponseDto(updatedAsset);
  }

  async remove(id: string): Promise<void> {
    const result = await this.assetRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }

    this.logger.log(`Deleted asset with ID: ${id}`);
  }

  private mapToResponseDto(asset: Asset): AssetResponseDto {
    return {
      id: asset.id,
      symbol: asset.symbol,
      amount: asset.amount,
      ynabAccountId: asset.ynabAccountId,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
