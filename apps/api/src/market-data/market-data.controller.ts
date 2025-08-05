import { Controller, Get, Query, ValidationPipe, UsePipes } from '@nestjs/common';

import { MarketDataService } from './market-data.service';
import { GetAssetPriceDto, ConvertCurrencyDto, AssetPriceResponseDto } from './dto';

@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('asset-price')
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
