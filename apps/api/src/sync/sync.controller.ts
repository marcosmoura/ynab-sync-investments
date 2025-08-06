import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { SyncService } from './sync.service';

@ApiTags('sync')
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('manual')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger manual sync to YNAB',
    description:
      'Performs a manual sync of all assets in the database to YNAB accounts. This bypasses the scheduled sync and uses whatever data is currently stored in the database.',
  })
  @ApiResponse({
    status: 200,
    description: 'Manual sync completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Manual sync completed successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - User settings not configured or invalid data',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during sync process',
  })
  async triggerManualSync(): Promise<{ message: string }> {
    await this.syncService.triggerManualSync();
    return { message: 'Manual sync completed successfully' };
  }
}
