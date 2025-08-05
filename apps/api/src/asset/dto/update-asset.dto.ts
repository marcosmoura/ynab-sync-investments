import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, IsPositive, IsOptional } from 'class-validator';

export class UpdateAssetDto {
  @ApiProperty({
    description: 'Updated amount of the asset owned',
    example: 15.75,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiProperty({
    description: 'Updated YNAB account ID where this asset is tracked',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  ynabAccountId?: string;
}
