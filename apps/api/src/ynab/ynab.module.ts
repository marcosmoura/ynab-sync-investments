import { Module, forwardRef } from '@nestjs/common';
import { YnabController } from './controllers';
import { YnabService } from './services';
import { SyncModule } from '../sync';

@Module({
  imports: [forwardRef(() => SyncModule)],
  controllers: [YnabController],
  providers: [YnabService],
  exports: [YnabService],
})
export class YnabModule {}
