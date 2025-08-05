import { IsString, IsNumber, IsUUID, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssetDto {
  @ApiProperty({
    description: 'Asset symbol (e.g., AAPL, TSLA)',
    example: 'AAPL',
  })
  @IsString()
  symbol: string;

  @ApiProperty({
    description: 'Amount of the asset owned',
    example: 10.5,
    minimum: 0.01,
  })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({
    description: 'YNAB account ID where this asset is tracked',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  @IsString()
  @IsUUID()
  ynabAccountId: string;
}
