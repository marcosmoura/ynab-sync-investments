import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetAssetPriceDto {
  @ApiProperty({
    description: 'Asset symbol to get price for',
    example: 'AAPL',
  })
  @IsString()
  symbol: string;

  @ApiProperty({
    description: 'Target currency for the price',
    example: 'USD',
    default: 'USD',
    required: false,
  })
  @IsString()
  @IsOptional()
  targetCurrency?: string = 'USD';
}

export class ConvertCurrencyDto {
  @ApiProperty({
    description: 'Amount to convert',
    example: 100.5,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Source currency code',
    example: 'EUR',
  })
  @IsString()
  fromCurrency: string;

  @ApiProperty({
    description: 'Target currency code',
    example: 'USD',
  })
  @IsString()
  toCurrency: string;
}
