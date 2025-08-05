import { Module } from '@nestjs/common';

import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';

@Module({
  controllers: [DocumentationController],
  providers: [DocumentationService],
  exports: [DocumentationService],
})
export class DocumentationModule {}
