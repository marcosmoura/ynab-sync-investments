import { Controller, Get, Query, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

import { MarketDataService } from './market-data.service';
import { GetAssetPriceDto, ConvertCurrencyDto, AssetPriceResponseDto } from './dto';

@ApiTags('market-data')
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('asset-price')
  @ApiOperation({ summary: 'Get current asset price' })
  @ApiQuery({ name: 'symbol', description: 'Asset symbol to get price for' })
  @ApiQuery({
    name: 'targetCurrency',
    required: false,
    description: 'Target currency for the price',
    example: 'USD',
  })
  @ApiResponse({
    status: 200,
    description: 'Asset price retrieved successfully',
    type: AssetPriceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid symbol or currency' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAssetPrice(@Query() getAssetPriceDto: GetAssetPriceDto): Promise<AssetPriceResponseDto> {
    const { symbol, targetCurrency = 'USD' } = getAssetPriceDto;
    const assetPrice = await this.marketDataService.getAssetPrice(symbol, targetCurrency);

    return new AssetPriceResponseDto(
      assetPrice.symbol,
      assetPrice.price,
      assetPrice.currency,
      new Date(),
    );
  }

  @Get('convert-currency')
  @ApiOperation({ summary: 'Convert currency amount' })
  @ApiQuery({ name: 'amount', description: 'Amount to convert' })
  @ApiQuery({ name: 'fromCurrency', description: 'Source currency code' })
  @ApiQuery({ name: 'toCurrency', description: 'Target currency code' })
  @ApiResponse({
    status: 200,
    description: 'Currency converted successfully',
    schema: {
      type: 'object',
      properties: {
        convertedAmount: {
          type: 'number',
          description: 'Converted amount',
          example: 85.5,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid currency codes or amount' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async convertCurrency(
    @Query() convertCurrencyDto: ConvertCurrencyDto,
  ): Promise<{ convertedAmount: number }> {
    const { amount, fromCurrency, toCurrency } = convertCurrencyDto;
    const convertedAmount = await this.marketDataService.convertCurrency(
      amount,
      fromCurrency,
      toCurrency,
    );

    return { convertedAmount };
  }
}
