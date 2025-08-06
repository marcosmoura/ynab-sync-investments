import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNotEmpty, ArrayNotEmpty, IsArray } from 'class-validator';

export class GetMultipleAssetPricesDto {
  @ApiProperty({
    description: 'Array of asset symbols to get prices for',
    example: ['AAPL', 'BTC', 'TSLA'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  symbols: string[];

  @ApiProperty({
    description: 'Target currency for the prices',
    example: 'USD',
    default: 'USD',
    required: false,
  })
  @IsString()
  @IsOptional()
  targetCurrency?: string = 'USD';
}
