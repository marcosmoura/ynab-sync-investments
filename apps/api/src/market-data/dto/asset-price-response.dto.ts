import { ApiProperty } from '@nestjs/swagger';

export class AssetPriceResponseDto {
  @ApiProperty({
    description: 'Asset symbol',
    example: 'AAPL',
  })
  symbol: string;

  @ApiProperty({
    description: 'Current price of the asset',
    example: 150.25,
  })
  price: number;

  @ApiProperty({
    description: 'Currency of the price',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Timestamp when the price was retrieved',
    example: '2023-12-01T15:30:00Z',
    required: false,
  })
  timestamp?: Date;

  constructor(symbol: string, price: number, currency: string, timestamp?: Date) {
    this.symbol = symbol;
    this.price = price;
    this.currency = currency;
    this.timestamp = timestamp || new Date();
  }
}
