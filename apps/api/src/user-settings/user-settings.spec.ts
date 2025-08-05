import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserSettings, SyncSchedule } from '@/database/entities';

import { CreateUserSettingsDto, UpdateUserSettingsDto } from './dto';
import { UserSettingsService } from './user-settings.service';

describe('UserSettingsService', () => {
  let service: UserSettingsService;

  const mockRepository = {
    clear: vi.fn(),
    save: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  };

  const mockUserSettings: UserSettings = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    ynabApiToken: 'ynab-token-12345',
    syncSchedule: SyncSchedule.DAILY,
    createdAt: new Date('2023-12-01T10:30:00Z'),
    updatedAt: new Date('2023-12-01T15:45:00Z'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSettingsService,
        {
          provide: getRepositoryToken(UserSettings),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UserSettingsService>(UserSettingsService);
  });

  describe('create', () => {
    it('should create user settings successfully', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.DAILY,
      };

      mockRepository.create.mockReturnValue(mockUserSettings);
      mockRepository.save.mockResolvedValue(mockUserSettings);

      const result = await service.create(createDto);

      expect(mockRepository.clear).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUserSettings);
      expect(result).toEqual({
        id: mockUserSettings.id,
        ynabApiToken: mockUserSettings.ynabApiToken,
        syncSchedule: mockUserSettings.syncSchedule,
        createdAt: mockUserSettings.createdAt,
        updatedAt: mockUserSettings.updatedAt,
      });
    });

    it('should clear existing settings before creating new ones', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.WEEKLY,
      };

      mockRepository.create.mockReturnValue(mockUserSettings);
      mockRepository.save.mockResolvedValue(mockUserSettings);

      await service.create(createDto);

      expect(mockRepository.clear).toHaveBeenCalledBefore(mockRepository.create);
    });

    it('should handle repository errors', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.DAILY,
      };

      const error = new Error('Database error');
      mockRepository.save.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow('Database error');
    });
  });

  describe('findSettings', () => {
    it('should return user settings when found', async () => {
      mockRepository.findOne.mockResolvedValue(mockUserSettings);

      const result = await service.findSettings();

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual({
        id: mockUserSettings.id,
        ynabApiToken: mockUserSettings.ynabApiToken,
        syncSchedule: mockUserSettings.syncSchedule,
        createdAt: mockUserSettings.createdAt,
        updatedAt: mockUserSettings.updatedAt,
      });
    });

    it('should return null when no settings found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findSettings();

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findSettings()).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    it('should update user settings successfully with partial data', async () => {
      const updateDto: UpdateUserSettingsDto = {
        syncSchedule: SyncSchedule.WEEKLY,
      };

      const updatedSettings = {
        ...mockUserSettings,
        syncSchedule: SyncSchedule.WEEKLY,
      };

      mockRepository.findOne.mockResolvedValue(mockUserSettings);
      mockRepository.save.mockResolvedValue(updatedSettings);

      const result = await service.update(updateDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockUserSettings,
        ...updateDto,
      });
      expect(result).toEqual({
        id: updatedSettings.id,
        ynabApiToken: updatedSettings.ynabApiToken,
        syncSchedule: updatedSettings.syncSchedule,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      });
    });

    it('should update user settings with all fields', async () => {
      const updateDto: UpdateUserSettingsDto = {
        ynabApiToken: 'new-token-67890',
        syncSchedule: SyncSchedule.MONTHLY_FIRST,
      };

      const updatedSettings = {
        ...mockUserSettings,
        ...updateDto,
      };

      mockRepository.findOne.mockResolvedValue(mockUserSettings);
      mockRepository.save.mockResolvedValue(updatedSettings);

      const result = await service.update(updateDto);

      expect(mockRepository.save).toHaveBeenCalledWith({
        ...mockUserSettings,
        ...updateDto,
      });
      expect(result).toEqual({
        id: updatedSettings.id,
        ynabApiToken: updatedSettings.ynabApiToken,
        syncSchedule: updatedSettings.syncSchedule,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      });
    });

    it('should create new settings if none exist', async () => {
      const updateDto: UpdateUserSettingsDto = {
        ynabApiToken: 'new-token-67890',
        syncSchedule: SyncSchedule.DAILY,
      };

      const newSettings = {
        id: 'new-id-123',
        ynabApiToken: 'new-token-67890',
        syncSchedule: SyncSchedule.DAILY,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(newSettings);
      mockRepository.save.mockResolvedValue(newSettings);

      const result = await service.update(updateDto);

      expect(mockRepository.create).toHaveBeenCalledWith(updateDto);
      expect(mockRepository.save).toHaveBeenCalledWith(newSettings);
      expect(result).toEqual({
        id: newSettings.id,
        ynabApiToken: newSettings.ynabApiToken,
        syncSchedule: newSettings.syncSchedule,
        createdAt: newSettings.createdAt,
        updatedAt: newSettings.updatedAt,
      });
    });

    it('should handle repository errors during update', async () => {
      const updateDto: UpdateUserSettingsDto = {
        syncSchedule: SyncSchedule.WEEKLY,
      };

      mockRepository.findOne.mockResolvedValue(mockUserSettings);

      const error = new Error('Database error');
      mockRepository.save.mockRejectedValue(error);

      await expect(service.update(updateDto)).rejects.toThrow('Database error');
    });

    it('should handle repository errors during find', async () => {
      const updateDto: UpdateUserSettingsDto = {
        syncSchedule: SyncSchedule.WEEKLY,
      };

      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.update(updateDto)).rejects.toThrow('Database error');
    });
  });
});
