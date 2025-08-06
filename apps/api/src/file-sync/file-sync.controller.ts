import { Controller, Post, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { FileSyncService } from './file-sync.service';

@ApiTags('File Sync')
@Controller('file-sync')
export class FileSyncController {
  private readonly logger = new Logger(FileSyncController.name);

  constructor(private readonly fileSyncService: FileSyncService) {}

  @Post('trigger')
  @ApiOperation({
    summary: 'Trigger manual file sync',
    description: 'Processes the YAML configuration file and syncs data to YNAB',
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
