import { IsNumber, IsString, IsUUID, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAssetDto {
  @ApiProperty({
    description: 'Updated amount of the asset owned',
    example: 15.75,
    minimum: 0.01,
    required: false,
  })
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiProperty({
    description: 'Updated YNAB account ID where this asset is tracked',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
    required: false,
  })
  @IsString()
  @IsUUID()
  ynabAccountId?: string;
}
