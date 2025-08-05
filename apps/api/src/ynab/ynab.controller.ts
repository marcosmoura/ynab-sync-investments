import { Controller, Post, Body, Inject, forwardRef } from '@nestjs/common';
import { SyncService } from '@/sync/sync.service';

import { YnabService } from './ynab.service';
import { YnabAccountDto } from './dto';

@Controller('ynab')
export class YnabController {
  constructor(
    private readonly ynabService: YnabService,
    @Inject(forwardRef(() => SyncService))
    private readonly syncService: SyncService,
  ) {}

  @Post('accounts')
  async getAccounts(@Body('token') token: string): Promise<YnabAccountDto[]> {
    return this.ynabService.getAccounts(token);
  }

  @Post('sync')
  async triggerSync(): Promise<{ message: string }> {
    await this.syncService.triggerManualSync();
    return { message: 'Sync completed successfully' };
  }
}
