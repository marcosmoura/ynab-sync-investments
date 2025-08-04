import { Controller, Get, Post, Body, Patch, ValidationPipe, UsePipes } from '@nestjs/common';
import { UserSettingsService } from '../services';
import { CreateUserSettingsDto, UpdateUserSettingsDto, UserSettingsResponseDto } from '../dto';

@Controller('settings')
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(
    @Body() createUserSettingsDto: CreateUserSettingsDto,
  ): Promise<UserSettingsResponseDto> {
    return this.userSettingsService.create(createUserSettingsDto);
  }

  @Get()
  async findSettings(): Promise<UserSettingsResponseDto | null> {
    return this.userSettingsService.findSettings();
  }

  @Patch()
  @UsePipes(new ValidationPipe({ transform: true }))
  async update(
    @Body() updateUserSettingsDto: UpdateUserSettingsDto,
  ): Promise<UserSettingsResponseDto> {
    return this.userSettingsService.update(updateUserSettingsDto);
  }
}
