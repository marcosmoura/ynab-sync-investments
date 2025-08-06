import { ApiProperty } from '@nestjs/swagger';

export class BulkAssetPriceResponseDto {
  @ApiProperty({
    description: 'Array of asset price results',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        symbol: { type: 'string', example: 'AAPL' },
        price: { type: 'number', example: 150.25 },
        currency: { type: 'string', example: 'USD' },
      },
    },
  })
  results: Array<{
    symbol: string;
    price: number;
    currency: string;
  }>;

  @ApiProperty({
    description: 'Symbols that could not be found',
    example: ['UNKNOWN_SYMBOL'],
    type: [String],
  })
  notFound: string[];

  @ApiProperty({
    description: 'Timestamp when the prices were retrieved',
    example: '2023-12-01T15:30:00Z',
  })
  timestamp: Date;

  constructor(
    results: Array<{ symbol: string; price: number; currency: string }>,
    requestedSymbols: string[],
    timestamp?: Date,
  ) {
    this.results = results;
    this.notFound = requestedSymbols.filter(
      (symbol) => !results.find((r) => r.symbol.toUpperCase() === symbol.toUpperCase()),
    );
    this.timestamp = timestamp || new Date();
  }
}
