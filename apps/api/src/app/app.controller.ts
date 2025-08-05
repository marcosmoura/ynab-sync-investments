import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/')
  @ApiOperation({ summary: 'Get application information' })
  @ApiResponse({
    status: 200,
    description: 'Application information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'YNAB Investments Sync API' },
        version: { type: 'string', example: '1.0.0' },
        status: { type: 'string', example: 'running' },
        documentation: { type: 'string', example: '/docs' },
      },
    },
  })
  getData() {
    return this.appService.getData();
  }
}
