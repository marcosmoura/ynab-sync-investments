import { Module, forwardRef } from '@nestjs/common';

import { SyncModule } from '@/sync';

import { YnabController } from './ynab.controller';
import { YnabService } from './ynab.service';

@Module({
  imports: [forwardRef(() => SyncModule)],
  controllers: [YnabController],
  providers: [YnabService],
  exports: [YnabService],
})
export class YnabModule {}
