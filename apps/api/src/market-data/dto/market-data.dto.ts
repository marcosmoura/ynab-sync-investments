import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsOptional, IsNumber, Min, IsNotEmpty } from 'class-validator';

export class GetAssetPriceDto {
  @ApiProperty({
    description: 'Asset symbol to get price for',
    example: 'AAPL',
  })
  @IsString()
  @IsNotEmpty()
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
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: 'Source currency code',
    example: 'EUR',
  })
  @IsString()
  @IsNotEmpty()
  fromCurrency: string;

  @ApiProperty({
    description: 'Target currency code',
    example: 'USD',
  })
  @IsString()
  @IsNotEmpty()
  toCurrency: string;
}
