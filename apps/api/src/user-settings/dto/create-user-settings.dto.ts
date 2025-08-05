import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum } from 'class-validator';

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
}
