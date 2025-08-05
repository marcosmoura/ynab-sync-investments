import { Module, forwardRef } from '@nestjs/common';
import { YnabController } from './ynab.controller';
import { YnabService } from './ynab.service';
import { SyncModule } from '@/sync';

@Module({
  imports: [forwardRef(() => SyncModule)],
  controllers: [YnabController],
  providers: [YnabService],
  exports: [YnabService],
})
export class YnabModule {}
