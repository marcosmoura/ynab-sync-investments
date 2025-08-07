import { Module } from '@nestjs/common';

import { YnabService } from './ynab.service';

@Module({
  providers: [YnabService],
  exports: [YnabService],
})
export class YnabModule {}
