import { Controller, Post, Body, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { SyncService } from '@/sync/sync.service';

import { YnabAccountDto, YnabBudgetDto } from './dto';
import { YnabService } from './ynab.service';

@ApiTags('ynab')
@Controller('ynab')
export class YnabController {
  constructor(
    private readonly ynabService: YnabService,
    @Inject(forwardRef(() => SyncService))
    private readonly syncService: SyncService,
  ) {}

  @Post('budgets')
  @ApiOperation({ summary: 'Get YNAB budgets' })
  @ApiBody({
    description: 'YNAB API token',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'ynab-api-token-12345678901234567890123456789012',
          description: 'YNAB API token',
        },
      },
      required: ['token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'YNAB budgets retrieved successfully',
    type: [YnabBudgetDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid YNAB API token' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async getBudgets(@Body('token') token: string): Promise<YnabBudgetDto[]> {
    return this.ynabService.getBudgets(token);
  }

  @Post('accounts')
  @ApiOperation({ summary: 'Get YNAB accounts' })
  @ApiBody({
    description: 'YNAB API token and optional budget ID',
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          example: 'ynab-api-token-12345678901234567890123456789012',
          description: 'YNAB API token',
        },
        budgetId: {
          type: 'string',
          example: 'b1c2d3e4-f5g6-7890-bcde-fg1234567890',
          description: 'Optional budget ID. If not provided, uses the first budget.',
        },
      },
      required: ['token'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'YNAB accounts retrieved successfully',
    type: [YnabAccountDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid YNAB API token' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async getAccounts(@Body() body: { token: string; budgetId?: string }): Promise<YnabAccountDto[]> {
    return this.ynabService.getAccounts(body.token, body.budgetId);
  }

  @Post('sync')
  @ApiOperation({ summary: 'Trigger manual synchronization' })
  @ApiResponse({
    status: 200,
    description: 'Sync completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Sync completed successfully',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Sync failed due to configuration issues' })
  @ApiResponse({ status: 500, description: 'Internal server error during sync' })
  async triggerSync(): Promise<{ message: string }> {
    await this.syncService.triggerManualSync();
    return { message: 'Sync completed successfully' };
  }
}
