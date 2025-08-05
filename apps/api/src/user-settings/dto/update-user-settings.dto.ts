import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional } from 'class-validator';

import { SyncSchedule } from '@/shared/entities';

export class UpdateUserSettingsDto {
  @ApiProperty({
    description: 'YNAB API token for accessing user data',
    example: 'ynab-api-token-12345678901234567890123456789012',
    type: 'string',
    required: false,
  })
  @IsOptional()
  @IsString()
  ynabApiToken?: string;

  @ApiProperty({
    description: 'Sync schedule frequency',
    enum: SyncSchedule,
    example: SyncSchedule.WEEKLY,
    required: false,
  })
  @IsOptional()
  @IsEnum(SyncSchedule)
  syncSchedule?: SyncSchedule;
}
