import { ApiProperty } from '@nestjs/swagger';

import { SyncSchedule } from '@/shared/entities';

export class UserSettingsResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the user settings',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'YNAB API token (masked for security)',
    example: 'ynab-api-token-****************************',
  })
  ynabApiToken: string;

  @ApiProperty({
    description: 'Sync schedule frequency',
    enum: SyncSchedule,
    example: SyncSchedule.DAILY,
  })
  syncSchedule: SyncSchedule;

  @ApiProperty({
    description: 'Target budget ID to sync with',
    example: 'b1c2d3e4-f5g6-7890-bcde-fg1234567890',
    nullable: true,
  })
  targetBudgetId: string | null;

  @ApiProperty({
    description: 'When the settings were created',
    example: '2023-12-01T10:30:00Z',
    type: Date,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the settings were last updated',
    example: '2023-12-01T15:45:00Z',
    type: Date,
  })
  updatedAt: Date;
}
