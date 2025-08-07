import { Injectable, Logger } from '@nestjs/common';

import { FileSyncService } from '@/file-sync/file-sync.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly fileSyncService: FileSyncService) {}

  getData() {
    return {
      message: 'YNAB Investments Sync API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        'GET /trigger': 'To perform a manual file sync',
      },
    };
  }

  async triggerFileSync() {
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
