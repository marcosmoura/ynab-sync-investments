import { ApiProperty } from '@nestjs/swagger';

export class AssetResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the asset',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Asset symbol',
    example: 'AAPL',
  })
  symbol: string;

  @ApiProperty({
    description: 'Amount of the asset owned',
    example: 10.5,
  })
  amount: number;

  @ApiProperty({
    description: 'YNAB account ID where this asset is tracked',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  ynabAccountId: string;

  @ApiProperty({
    description: 'When the asset was created',
    example: '2023-12-01T10:30:00Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the asset was last updated',
    example: '2023-12-01T15:45:00Z',
    type: Date,
  })
  updatedAt: Date;
}
