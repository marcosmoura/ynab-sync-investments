import { Controller, Get, Post, Body, Patch, ValidationPipe, UsePipes } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserSettingsService } from './user-settings.service';
import { CreateUserSettingsDto, UpdateUserSettingsDto, UserSettingsResponseDto } from './dto';

@ApiTags('user-settings')
@Controller('settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

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
