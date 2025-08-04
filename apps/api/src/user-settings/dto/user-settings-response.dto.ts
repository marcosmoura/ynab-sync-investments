import { SyncSchedule } from '@/shared/entities';

export class UserSettingsResponseDto {
  id: string;
  ynabApiToken: string;
  syncSchedule: SyncSchedule;
  createdAt: Date;
  updatedAt: Date;
}
