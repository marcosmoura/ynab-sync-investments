import { Controller, ValidationPipe, UsePipes, Body, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { GetMultipleAssetPricesDto, BulkAssetPriceResponseDto } from './dto';
import { MarketDataService } from './market-data.service';

@ApiTags('market-data')
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Post('asset-prices')
  @ApiOperation({ summary: 'Get current prices for multiple assets' })
  @ApiBody({
    description: 'Asset symbols and target currency',
    type: GetMultipleAssetPricesDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Asset prices retrieved successfully',
    type: BulkAssetPriceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid symbols or currency' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getMultipleAssetPrices(
    @Body() getMultipleAssetPricesDto: GetMultipleAssetPricesDto,
  ): Promise<BulkAssetPriceResponseDto> {
    const { symbols, targetCurrency = 'USD' } = getMultipleAssetPricesDto;

    const assetPrices = await this.marketDataService.getAssetPrices(symbols, targetCurrency);

    return new BulkAssetPriceResponseDto(assetPrices, symbols, new Date());
  }
}
