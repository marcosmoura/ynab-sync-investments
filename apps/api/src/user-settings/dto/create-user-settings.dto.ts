import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

import { SyncSchedule } from '@/shared/entities';

export class CreateUserSettingsDto {
  @ApiProperty({
    description: 'YNAB API token for accessing user data',
    example: 'ynab-api-token-12345678901234567890123456789012',
    type: 'string',
  })
  @IsString()
  ynabApiToken: string;

  @ApiProperty({
    description: 'Sync schedule frequency',
    enum: SyncSchedule,
    example: SyncSchedule.DAILY,
  })
  @IsEnum(SyncSchedule)
  syncSchedule: SyncSchedule;

  @ApiProperty({
    description: 'Target budget ID to sync with',
    example: 'b1c2d3e4-f5g6-7890-bcde-fg1234567890',
    required: false,
  })
  @IsOptional()
  @IsString()
  targetBudgetId?: string;
}
