import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class GetAssetPriceDto {
  @IsString()
  symbol: string;

  @IsString()
  @IsOptional()
  targetCurrency?: string = 'USD';
}

export class ConvertCurrencyDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  fromCurrency: string;

  @IsString()
  toCurrency: string;
}
