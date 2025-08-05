import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserSettings } from '@/shared/entities';

import { CreateUserSettingsDto, UpdateUserSettingsDto, UserSettingsResponseDto } from './dto';

@Injectable()
export class UserSettingsService {
  private readonly logger = new Logger(UserSettingsService.name);

  constructor(
    @InjectRepository(UserSettings)
    private userSettingsRepository: Repository<UserSettings>,
  ) {}

  async create(createUserSettingsDto: CreateUserSettingsDto): Promise<UserSettingsResponseDto> {
    // Delete existing settings (single user app)
    await this.userSettingsRepository.clear();

    const settings = this.userSettingsRepository.create(createUserSettingsDto);
    const savedSettings = await this.userSettingsRepository.save(settings);

    this.logger.log('Created new user settings');
    return this.mapToResponseDto(savedSettings);
  }

  async findSettings(): Promise<UserSettingsResponseDto | null> {
    const settings = await this.userSettingsRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    return settings ? this.mapToResponseDto(settings) : null;
  }

  async update(updateUserSettingsDto: UpdateUserSettingsDto): Promise<UserSettingsResponseDto> {
    let settings = await this.userSettingsRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    if (!settings) {
      // Create new settings if none exist
      settings = this.userSettingsRepository.create(updateUserSettingsDto);
    } else {
      Object.assign(settings, updateUserSettingsDto);
    }

    const updatedSettings = await this.userSettingsRepository.save(settings);

    this.logger.log('Updated user settings');
    return this.mapToResponseDto(updatedSettings);
  }

  private mapToResponseDto(settings: UserSettings): UserSettingsResponseDto {
    return {
      id: settings.id,
      ynabApiToken: settings.ynabApiToken,
      syncSchedule: settings.syncSchedule,
      targetBudgetId: settings.targetBudgetId,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }
}
