import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserSettings } from '@/database/entities';
import { YnabModule } from '@/ynab/ynab.module';

import { UserSettingsController } from './user-settings.controller';
import { UserSettingsService } from './user-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserSettings]), forwardRef(() => YnabModule)],
  controllers: [UserSettingsController],
  providers: [UserSettingsService],
  exports: [UserSettingsService],
})
export class UserSettingsModule {}
