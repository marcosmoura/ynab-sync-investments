import { IsString, IsEnum } from 'class-validator';

import { SyncSchedule } from '@/shared/entities';

export class UpdateUserSettingsDto {
  @IsString()
  ynabApiToken?: string;

  @IsEnum(SyncSchedule)
  syncSchedule?: SyncSchedule;
}
