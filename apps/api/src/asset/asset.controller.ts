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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';

import { AssetService } from './asset.service';
import { CreateAssetDto, UpdateAssetDto, AssetResponseDto } from './dto';

@ApiTags('assets')
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new asset' })
  @ApiBody({ type: CreateAssetDto })
  @ApiResponse({
    status: 201,
    description: 'Asset created successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createAssetDto: CreateAssetDto): Promise<AssetResponseDto> {
    return this.assetService.create(createAssetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all assets or filter by YNAB account ID' })
  @ApiQuery({
    name: 'ynabAccountId',
    required: false,
    description: 'Filter assets by YNAB account ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Assets retrieved successfully',
    type: [AssetResponseDto],
  })
  async findAll(@Query('ynabAccountId') ynabAccountId?: string): Promise<AssetResponseDto[]> {
    if (ynabAccountId) {
      return this.assetService.findByYnabAccountId(ynabAccountId);
    }
    return this.assetService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an asset by ID' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset retrieved successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async findOne(@Param('id') id: string): Promise<AssetResponseDto> {
    return this.assetService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiBody({ type: UpdateAssetDto })
  @ApiResponse({
    status: 200,
    description: 'Asset updated successfully',
    type: AssetResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
  ): Promise<AssetResponseDto> {
    return this.assetService.update(id, updateAssetDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an asset' })
  @ApiParam({ name: 'id', description: 'Asset ID' })
  @ApiResponse({
    status: 200,
    description: 'Asset deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Asset deleted successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Asset not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.assetService.remove(id);
    return { message: 'Asset deleted successfully' };
  }
}
