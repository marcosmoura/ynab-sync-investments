import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';

import { AssetService } from './asset.service';
import { CreateAssetDto, UpdateAssetDto, AssetResponseDto } from './dto';

@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createAssetDto: CreateAssetDto): Promise<AssetResponseDto> {
    return this.assetService.create(createAssetDto);
  }

  @Get()
  async findAll(@Query('ynabAccountId') ynabAccountId?: string): Promise<AssetResponseDto[]> {
    if (ynabAccountId) {
      return this.assetService.findByYnabAccountId(ynabAccountId);
    }
    return this.assetService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<AssetResponseDto> {
    return this.assetService.findOne(id);
  }

  @Patch(':id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assetService.update(id, updateAssetDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.assetService.remove(id);
    return { message: 'Asset deleted successfully' };
  }
}
