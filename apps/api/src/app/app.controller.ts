import { Controller, Get, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { FileSyncService } from '@/file-sync/file-sync.service';

import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly fileSyncService: FileSyncService,
  ) {}

  @Get('/')
  @ApiOperation({ summary: 'Get application information' })
  @ApiResponse({
    status: 200,
    description: 'Application information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'YNAB Investments Sync API' },
        version: { type: 'string', example: '1.0.0' },
        status: { type: 'string', example: 'running' },
        documentation: { type: 'string', example: '/docs' },
      },
    },
  })
  getData() {
    return this.appService.getData();
  }

  @Get('trigger')
  @ApiOperation({
    summary: 'Trigger manual file sync',
    description: 'Fetches a fresh copy of the configuration file and performs the sync with YNAB',
  })
  @ApiResponse({
    status: 200,
    description: 'File sync completed successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during file sync',
  })
  async triggerFileSync(): Promise<{ message: string }> {
    try {
      this.logger.log('Manual file sync triggered via API');
      await this.fileSyncService.triggerManualFileSync();
      return { message: 'File sync completed successfully' };
    } catch (error) {
      this.logger.error('Error during manual file sync', error);
      throw error;
    }
  }
}
