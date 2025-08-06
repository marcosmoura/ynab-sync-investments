import { Controller, Get, Query, ValidationPipe, UsePipes, Body, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';

import {
  GetAssetPriceDto,
  ConvertCurrencyDto,
  AssetPriceResponseDto,
  GetMultipleAssetPricesDto,
  BulkAssetPriceResponseDto,
} from './dto';
import { MarketDataService } from './market-data.service';

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
