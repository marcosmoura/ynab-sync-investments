import { Module } from '@nestjs/common';

import { DocumentationService } from './documentation.service';
import { DocumentationController } from './documentation.controller';

@Module({
  controllers: [DocumentationController],
  providers: [DocumentationService],
  exports: [DocumentationService],
})
export class DocumentationModule {}
