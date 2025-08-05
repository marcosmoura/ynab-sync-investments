import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  ValidationPipe,
  UsePipes,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { YnabBudgetDto } from '@/ynab/dto';
import { YnabService } from '@/ynab/ynab.service';

import { CreateUserSettingsDto, UpdateUserSettingsDto, UserSettingsResponseDto } from './dto';
import { UserSettingsService } from './user-settings.service';

@ApiTags('user-settings')
@Controller('settings')
export class UserSettingsController {
  constructor(
    private readonly userSettingsService: UserSettingsService,
    @Inject(forwardRef(() => YnabService))
    private readonly ynabService: YnabService,
  ) {}

  @Post('budgets')
  @ApiOperation({ summary: 'Get available YNAB budgets for selection' })
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
    description: 'Available budgets retrieved successfully',
    type: [YnabBudgetDto],
  })
  @ApiResponse({ status: 400, description: 'Invalid YNAB API token' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid token' })
  async getBudgets(@Body('token') token: string): Promise<YnabBudgetDto[]> {
    return this.ynabService.getBudgets(token);
  }

  @Post()
  @ApiOperation({ summary: 'Create user settings' })
  @ApiBody({ type: CreateUserSettingsDto })
  @ApiResponse({
    status: 201,
    description: 'User settings created successfully',
    type: UserSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'User settings already exist' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() createUserSettingsDto: CreateUserSettingsDto,
  ): Promise<UserSettingsResponseDto> {
    return this.userSettingsService.create(createUserSettingsDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user settings' })
  @ApiResponse({
    status: 200,
    description: 'User settings retrieved successfully',
    type: UserSettingsResponseDto,
  })
  @ApiResponse({
    status: 200,
    description: 'No user settings found',
    schema: { type: 'null' },
  })
  async findSettings(): Promise<UserSettingsResponseDto | null> {
    return this.userSettingsService.findSettings();
  }

  @Patch()
  @ApiOperation({ summary: 'Update user settings' })
  @ApiBody({ type: UpdateUserSettingsDto })
  @ApiResponse({
    status: 200,
    description: 'User settings updated successfully',
    type: UserSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'User settings not found' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Body() updateUserSettingsDto: UpdateUserSettingsDto,
  ): Promise<UserSettingsResponseDto> {
    return this.userSettingsService.update(updateUserSettingsDto);
  }
}
