import { Logger, forwardRef } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import { UserSettings, SyncSchedule } from '@/database/entities';
import { YnabService } from '@/ynab/ynab.service';

import { CreateUserSettingsDto, UpdateUserSettingsDto, UserSettingsResponseDto } from './dto';
import { UserSettingsController } from './user-settings.controller';
import { UserSettingsService } from './user-settings.service';

describe('UserSettingsService', () => {
  let service: UserSettingsService;
  let loggerSpy: ReturnType<typeof vi.spyOn>;

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
    targetBudgetId: 'b1c2d3e4-f5g6-7890-bcde-fg1234567890',
    createdAt: new Date('2023-12-01T10:30:00Z'),
    updatedAt: new Date('2023-12-01T15:45:00Z'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mocks to successful states by default
    mockRepository.clear.mockResolvedValue(undefined);
    mockRepository.save.mockResolvedValue(mockUserSettings);
    mockRepository.findOne.mockResolvedValue(mockUserSettings);
    mockRepository.create.mockReturnValue(mockUserSettings);
    mockRepository.update.mockResolvedValue(undefined);

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
    loggerSpy = vi.spyOn(service['logger'], 'log').mockImplementation(() => undefined);
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
      expect(loggerSpy).toHaveBeenCalledWith('Created new user settings');
      expect(result).toEqual({
        id: mockUserSettings.id,
        ynabApiToken: mockUserSettings.ynabApiToken,
        syncSchedule: mockUserSettings.syncSchedule,
        targetBudgetId: mockUserSettings.targetBudgetId,
        createdAt: mockUserSettings.createdAt,
        updatedAt: mockUserSettings.updatedAt,
      });
    });

    it('should create user settings with optional targetBudgetId', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.WEEKLY,
        targetBudgetId: 'budget-456',
      };

      const settingsWithBudget = {
        ...mockUserSettings,
        targetBudgetId: 'budget-456',
        syncSchedule: SyncSchedule.WEEKLY,
      };

      mockRepository.create.mockReturnValue(settingsWithBudget);
      mockRepository.save.mockResolvedValue(settingsWithBudget);

      const result = await service.create(createDto);

      expect(mockRepository.clear).toHaveBeenCalled();
      expect(mockRepository.create).toHaveBeenCalledWith(createDto);
      expect(mockRepository.save).toHaveBeenCalledWith(settingsWithBudget);
      expect(result.targetBudgetId).toBe('budget-456');
      expect(result.syncSchedule).toBe(SyncSchedule.WEEKLY);
    });

    it('should create user settings with all sync schedule options', async () => {
      const testCases = [
        SyncSchedule.DAILY,
        SyncSchedule.EVERY_TWO_DAYS,
        SyncSchedule.WEEKLY,
        SyncSchedule.EVERY_TWO_WEEKS,
        SyncSchedule.MONTHLY_FIRST,
        SyncSchedule.MONTHLY_LAST,
      ];

      for (const schedule of testCases) {
        const createDto: CreateUserSettingsDto = {
          ynabApiToken: 'ynab-token-12345',
          syncSchedule: schedule,
        };

        const settingsWithSchedule = {
          ...mockUserSettings,
          syncSchedule: schedule,
        };

        mockRepository.create.mockReturnValue(settingsWithSchedule);
        mockRepository.save.mockResolvedValue(settingsWithSchedule);

        const result = await service.create(createDto);

        expect(result.syncSchedule).toBe(schedule);
      }
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

    it('should handle repository errors during clear', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.DAILY,
      };

      const error = new Error('Clear operation failed');
      mockRepository.clear.mockRejectedValue(error);

      await expect(service.create(createDto)).rejects.toThrow('Clear operation failed');
    });

    it('should handle repository errors during create', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.DAILY,
      };

      // Reset clear mock to resolve successfully for this test
      mockRepository.clear.mockResolvedValue(undefined);

      const error = new Error('Create operation failed');
      mockRepository.create.mockImplementation(() => {
        throw error;
      });

      await expect(service.create(createDto)).rejects.toThrow('Create operation failed');
    });

    it('should handle repository errors', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.DAILY,
      };

      // Reset clear mock to resolve successfully for this test
      mockRepository.clear.mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(mockUserSettings);

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
        targetBudgetId: mockUserSettings.targetBudgetId,
        createdAt: mockUserSettings.createdAt,
        updatedAt: mockUserSettings.updatedAt,
      });
    });

    it('should return settings with null targetBudgetId', async () => {
      const settingsWithNullBudget = {
        ...mockUserSettings,
        targetBudgetId: null,
      };

      mockRepository.findOne.mockResolvedValue(settingsWithNullBudget);

      const result = await service.findSettings();

      expect(result?.targetBudgetId).toBeNull();
      expect(result?.id).toBe(mockUserSettings.id);
    });

    it('should return settings with different sync schedules', async () => {
      const testCases = [
        SyncSchedule.DAILY,
        SyncSchedule.EVERY_TWO_DAYS,
        SyncSchedule.WEEKLY,
        SyncSchedule.EVERY_TWO_WEEKS,
        SyncSchedule.MONTHLY_FIRST,
        SyncSchedule.MONTHLY_LAST,
      ];

      for (const schedule of testCases) {
        const settingsWithSchedule = {
          ...mockUserSettings,
          syncSchedule: schedule,
        };

        mockRepository.findOne.mockResolvedValue(settingsWithSchedule);

        const result = await service.findSettings();

        expect(result?.syncSchedule).toBe(schedule);
      }
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

    it('should return null when settings is undefined', async () => {
      mockRepository.findOne.mockResolvedValue(undefined);

      const result = await service.findSettings();

      expect(result).toBeNull();
    });

    it('should handle repository errors', async () => {
      const error = new Error('Database error');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findSettings()).rejects.toThrow('Database error');
    });

    it('should handle database connection timeout', async () => {
      const error = new Error('Connection timeout');
      mockRepository.findOne.mockRejectedValue(error);

      await expect(service.findSettings()).rejects.toThrow('Connection timeout');
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
      expect(loggerSpy).toHaveBeenCalledWith('Updated user settings');
      expect(result).toEqual({
        id: updatedSettings.id,
        ynabApiToken: updatedSettings.ynabApiToken,
        syncSchedule: updatedSettings.syncSchedule,
        targetBudgetId: updatedSettings.targetBudgetId,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      });
    });

    it('should update user settings with all fields', async () => {
      const updateDto: UpdateUserSettingsDto = {
        ynabApiToken: 'new-token-67890',
        syncSchedule: SyncSchedule.MONTHLY_FIRST,
        targetBudgetId: 'new-budget-789',
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
        targetBudgetId: updatedSettings.targetBudgetId,
        createdAt: updatedSettings.createdAt,
        updatedAt: updatedSettings.updatedAt,
      });
    });

    it('should update only the ynabApiToken', async () => {
      const updateDto: UpdateUserSettingsDto = {
        ynabApiToken: 'updated-token-only',
      };

      const updatedSettings = {
        ...mockUserSettings,
        ynabApiToken: 'updated-token-only',
      };

      mockRepository.findOne.mockResolvedValue(mockUserSettings);
      mockRepository.save.mockResolvedValue(updatedSettings);

      const result = await service.update(updateDto);

      expect(result.ynabApiToken).toBe('updated-token-only');
      expect(result.syncSchedule).toBe(mockUserSettings.syncSchedule);
      expect(result.targetBudgetId).toBe(mockUserSettings.targetBudgetId);
    });

    it('should update only the targetBudgetId', async () => {
      const updateDto: UpdateUserSettingsDto = {
        targetBudgetId: 'updated-budget-only',
      };

      const updatedSettings = {
        ...mockUserSettings,
        targetBudgetId: 'updated-budget-only',
      };

      mockRepository.findOne.mockResolvedValue(mockUserSettings);
      mockRepository.save.mockResolvedValue(updatedSettings);

      const result = await service.update(updateDto);

      expect(result.targetBudgetId).toBe('updated-budget-only');
      expect(result.ynabApiToken).toBe(mockUserSettings.ynabApiToken);
      expect(result.syncSchedule).toBe(mockUserSettings.syncSchedule);
    });

    it('should handle updating with null targetBudgetId', async () => {
      const updateDto: UpdateUserSettingsDto = {
        targetBudgetId: undefined,
      };

      const updatedSettings = {
        ...mockUserSettings,
        targetBudgetId: undefined,
      };

      mockRepository.findOne.mockResolvedValue(mockUserSettings);
      mockRepository.save.mockResolvedValue(updatedSettings);

      const result = await service.update(updateDto);

      expect(result.targetBudgetId).toBeUndefined();
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
        targetBudgetId: null,
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
        targetBudgetId: newSettings.targetBudgetId,
        createdAt: newSettings.createdAt,
        updatedAt: newSettings.updatedAt,
      });
    });

    it('should create new settings with partial update data', async () => {
      const updateDto: UpdateUserSettingsDto = {
        syncSchedule: SyncSchedule.MONTHLY_LAST,
      };

      const newSettings = {
        id: 'new-id-456',
        ynabApiToken: undefined,
        syncSchedule: SyncSchedule.MONTHLY_LAST,
        targetBudgetId: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(newSettings);
      mockRepository.save.mockResolvedValue(newSettings);

      const result = await service.update(updateDto);

      expect(mockRepository.create).toHaveBeenCalledWith(updateDto);
      expect(result.syncSchedule).toBe(SyncSchedule.MONTHLY_LAST);
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

    it('should handle repository errors during create for new settings', async () => {
      const updateDto: UpdateUserSettingsDto = {
        ynabApiToken: 'new-token',
        syncSchedule: SyncSchedule.DAILY,
      };

      mockRepository.findOne.mockResolvedValue(null);

      const error = new Error('Create operation failed');
      mockRepository.create.mockImplementation(() => {
        throw error;
      });

      await expect(service.update(updateDto)).rejects.toThrow('Create operation failed');
    });
  });

  describe('private methods coverage', () => {
    it('should properly map entity to response DTO with all fields', async () => {
      const fullUserSettings: UserSettings = {
        id: 'full-settings-id',
        ynabApiToken: 'full-token-12345',
        syncSchedule: SyncSchedule.EVERY_TWO_WEEKS,
        targetBudgetId: 'full-budget-id',
        createdAt: new Date('2023-12-01T10:30:00Z'),
        updatedAt: new Date('2023-12-01T15:45:00Z'),
      };

      mockRepository.findOne.mockResolvedValue(fullUserSettings);

      const result = await service.findSettings();

      expect(result).toEqual({
        id: 'full-settings-id',
        ynabApiToken: 'full-token-12345',
        syncSchedule: SyncSchedule.EVERY_TWO_WEEKS,
        targetBudgetId: 'full-budget-id',
        createdAt: new Date('2023-12-01T10:30:00Z'),
        updatedAt: new Date('2023-12-01T15:45:00Z'),
      });
    });

    it('should properly map entity to response DTO with minimal fields', async () => {
      const minimalUserSettings: UserSettings = {
        id: 'minimal-settings-id',
        ynabApiToken: 'minimal-token',
        syncSchedule: SyncSchedule.DAILY,
        targetBudgetId: null,
        createdAt: new Date('2023-12-01T10:30:00Z'),
        updatedAt: new Date('2023-12-01T10:30:00Z'),
      };

      // Reset clear mock to resolve successfully for this test
      mockRepository.clear.mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(minimalUserSettings);
      mockRepository.save.mockResolvedValue(minimalUserSettings);

      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'minimal-token',
        syncSchedule: SyncSchedule.DAILY,
      };

      const result = await service.create(createDto);

      expect(result).toEqual({
        id: 'minimal-settings-id',
        ynabApiToken: 'minimal-token',
        syncSchedule: SyncSchedule.DAILY,
        targetBudgetId: null,
        createdAt: new Date('2023-12-01T10:30:00Z'),
        updatedAt: new Date('2023-12-01T10:30:00Z'),
      });
    });

    it('should handle date objects correctly in mapping', async () => {
      const specificDate = new Date('2024-01-15T08:30:45.123Z');
      const settingsWithSpecificDates: UserSettings = {
        id: 'date-test-id',
        ynabApiToken: 'date-test-token',
        syncSchedule: SyncSchedule.MONTHLY_LAST,
        targetBudgetId: 'date-test-budget',
        createdAt: specificDate,
        updatedAt: specificDate,
      };

      mockRepository.findOne.mockResolvedValue(settingsWithSpecificDates);

      const result = await service.findSettings();

      expect(result?.createdAt).toEqual(specificDate);
      expect(result?.updatedAt).toEqual(specificDate);
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('service edge cases and error scenarios', () => {
    it('should handle repository returning invalid data types', async () => {
      const invalidSettings = {
        id: 123, // Invalid type
        ynabApiToken: null,
        syncSchedule: 'INVALID_SCHEDULE',
        targetBudgetId: {},
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date',
      };

      mockRepository.findOne.mockResolvedValue(invalidSettings);

      const result = await service.findSettings();

      expect(result).toEqual({
        id: 123,
        ynabApiToken: null,
        syncSchedule: 'INVALID_SCHEDULE',
        targetBudgetId: {},
        createdAt: 'invalid-date',
        updatedAt: 'invalid-date',
      });
    });

    it('should handle very large data sets', async () => {
      const largeToken = 'x'.repeat(10000);
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: largeToken,
        syncSchedule: SyncSchedule.DAILY,
      };

      const largeSettings = {
        ...mockUserSettings,
        ynabApiToken: largeToken,
      };

      // Reset clear mock to resolve successfully for this test
      mockRepository.clear.mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(largeSettings);
      mockRepository.save.mockResolvedValue(largeSettings);

      const result = await service.create(createDto);

      expect(result.ynabApiToken).toBe(largeToken);
      expect(loggerSpy).toHaveBeenCalledWith('Created new user settings');
    });

    it('should handle repository save returning different object', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'test-token',
        syncSchedule: SyncSchedule.DAILY,
      };

      const createdSettings = { ...mockUserSettings, id: 'created-id' };
      const savedSettings = { ...mockUserSettings, id: 'saved-id' };

      // Reset clear mock to resolve successfully for this test
      mockRepository.clear.mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(createdSettings);
      mockRepository.save.mockResolvedValue(savedSettings);

      const result = await service.create(createDto);

      expect(result.id).toBe('saved-id');
      expect(mockRepository.save).toHaveBeenCalledWith(createdSettings);
    });

    it('should handle Object.assign with partial updates', async () => {
      const updateDto: UpdateUserSettingsDto = {
        syncSchedule: SyncSchedule.WEEKLY,
      };

      const originalSettings = { ...mockUserSettings };
      const expectedMerged = { ...mockUserSettings, syncSchedule: SyncSchedule.WEEKLY };

      mockRepository.findOne.mockResolvedValue(originalSettings);
      mockRepository.save.mockResolvedValue(expectedMerged);

      await service.update(updateDto);

      expect(mockRepository.save).toHaveBeenCalledWith(expectedMerged);
    });

    it('should handle logger errors gracefully', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'test-token',
        syncSchedule: SyncSchedule.DAILY,
      };

      // Reset clear mock to resolve successfully for this test
      mockRepository.clear.mockResolvedValue(undefined);
      mockRepository.create.mockReturnValue(mockUserSettings);
      mockRepository.save.mockResolvedValue(mockUserSettings);

      // Make logger throw but not prevent the method from returning
      loggerSpy.mockImplementation(() => {
        throw new Error('Logger failed');
      });

      // Since the logger error happens after save, the method should still succeed
      // The service doesn't handle logger errors, so it will throw
      await expect(service.create(createDto)).rejects.toThrow('Logger failed');
    });

    it('should handle repository.clear with concurrent calls', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'concurrent-token',
        syncSchedule: SyncSchedule.DAILY,
      };

      let clearCallCount = 0;
      mockRepository.clear.mockImplementation(() => {
        clearCallCount++;
        return Promise.resolve();
      });

      mockRepository.create.mockReturnValue(mockUserSettings);
      mockRepository.save.mockResolvedValue(mockUserSettings);

      await Promise.all([service.create(createDto), service.create(createDto)]);

      expect(clearCallCount).toBe(2);
    });

    it('should handle create method with repository.create throwing synchronous error', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'sync-error-token',
        syncSchedule: SyncSchedule.DAILY,
      };

      const syncError = new Error('Synchronous create error');
      mockRepository.create.mockImplementation(() => {
        throw syncError;
      });

      await expect(service.create(createDto)).rejects.toThrow('Synchronous create error');
      expect(mockRepository.clear).toHaveBeenCalled();
    });

    it('should handle update with repository.save throwing after Object.assign', async () => {
      const updateDto: UpdateUserSettingsDto = {
        ynabApiToken: 'save-error-token',
      };

      mockRepository.findOne.mockResolvedValue(mockUserSettings);

      const saveError = new Error('Save after assign failed');
      mockRepository.save.mockRejectedValue(saveError);

      await expect(service.update(updateDto)).rejects.toThrow('Save after assign failed');
    });

    it('should handle findSettings with repository query edge cases', async () => {
      // Test with specific query parameters
      mockRepository.findOne.mockResolvedValue(mockUserSettings);

      await service.findSettings();

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: 'DESC' },
      });
    });

    it('should verify private method mapToResponseDto handles all entity properties', async () => {
      const fullEntity: UserSettings = {
        id: 'full-entity-id',
        ynabApiToken: 'full-entity-token',
        syncSchedule: SyncSchedule.EVERY_TWO_WEEKS,
        targetBudgetId: 'full-entity-budget',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      mockRepository.findOne.mockResolvedValue(fullEntity);

      const result = await service.findSettings();

      // Verify all properties are mapped correctly
      expect(result).toEqual({
        id: 'full-entity-id',
        ynabApiToken: 'full-entity-token',
        syncSchedule: SyncSchedule.EVERY_TWO_WEEKS,
        targetBudgetId: 'full-entity-budget',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      });
    });
  });
});

describe('UserSettingsController', () => {
  let controller: UserSettingsController;
  let userSettingsService: UserSettingsService;
  let ynabService: YnabService;

  const mockUserSettingsService = {
    create: vi.fn(),
    findSettings: vi.fn(),
    update: vi.fn(),
  };

  const mockYnabService = {
    getBudgets: vi.fn(),
  };

  const mockUserSettings: UserSettingsResponseDto = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    ynabApiToken: 'ynab-token-12345',
    syncSchedule: SyncSchedule.DAILY,
    targetBudgetId: 'b1c2d3e4-f5g6-7890-bcde-fg1234567890',
    createdAt: new Date('2023-12-01T10:30:00Z'),
    updatedAt: new Date('2023-12-01T15:45:00Z'),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserSettingsController],
      providers: [
        {
          provide: UserSettingsService,
          useValue: mockUserSettingsService,
        },
        {
          provide: YnabService,
          useValue: mockYnabService,
        },
      ],
    }).compile();

    controller = module.get<UserSettingsController>(UserSettingsController);
    userSettingsService = module.get<UserSettingsService>(UserSettingsService);
    ynabService = module.get<YnabService>(YnabService);
  });

  describe('getBudgets', () => {
    it('should return available YNAB budgets', async () => {
      const token = 'ynab-api-token-12345';
      const mockBudgets = [
        {
          id: 'budget-1',
          name: 'My Budget',
          last_modified_on: '2023-12-01T10:00:00Z',
          first_month: '2023-01-01',
          last_month: '2023-12-01',
          date_format: {
            format: 'MM/DD/YYYY',
          },
          currency_format: {
            iso_code: 'USD',
            example_format: '123,456.78',
            decimal_digits: 2,
            decimal_separator: '.',
            symbol_first: true,
            group_separator: ',',
            currency_symbol: '$',
            display_symbol: true,
          },
          accounts: [],
        },
        {
          id: 'budget-2',
          name: 'Second Budget',
          last_modified_on: '2023-12-01T11:00:00Z',
          first_month: '2023-01-01',
          last_month: '2023-12-01',
          date_format: {
            format: 'MM/DD/YYYY',
          },
          currency_format: {
            iso_code: 'EUR',
            example_format: '123.456,78',
            decimal_digits: 2,
            decimal_separator: ',',
            symbol_first: false,
            group_separator: '.',
            currency_symbol: '€',
            display_symbol: true,
          },
          accounts: [],
        },
      ];

      mockYnabService.getBudgets.mockResolvedValue(mockBudgets);

      const result = await controller.getBudgets({ token });

      expect(ynabService.getBudgets).toHaveBeenCalledWith(token);
      expect(result).toEqual(mockBudgets);
    });

    it('should handle YNAB service errors', async () => {
      const token = 'invalid-token';
      const error = new Error('Invalid YNAB API token');

      mockYnabService.getBudgets.mockRejectedValue(error);

      await expect(controller.getBudgets({ token })).rejects.toThrow('Invalid YNAB API token');
      expect(ynabService.getBudgets).toHaveBeenCalledWith(token);
    });

    it('should handle empty budgets response', async () => {
      const token = 'valid-token';
      mockYnabService.getBudgets.mockResolvedValue([]);

      const result = await controller.getBudgets({ token });

      expect(result).toEqual([]);
      expect(ynabService.getBudgets).toHaveBeenCalledWith(token);
    });
  });

  describe('create', () => {
    it('should create user settings successfully', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.DAILY,
      };

      mockUserSettingsService.create.mockResolvedValue(mockUserSettings);

      const result = await controller.create(createDto);

      expect(userSettingsService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockUserSettings);
    });

    it('should create user settings with optional targetBudgetId', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.WEEKLY,
        targetBudgetId: 'budget-456',
      };

      const settingsWithBudget = {
        ...mockUserSettings,
        syncSchedule: SyncSchedule.WEEKLY,
        targetBudgetId: 'budget-456',
      };

      mockUserSettingsService.create.mockResolvedValue(settingsWithBudget);

      const result = await controller.create(createDto);

      expect(userSettingsService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(settingsWithBudget);
    });

    it('should handle service errors during creation', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'ynab-token-12345',
        syncSchedule: SyncSchedule.DAILY,
      };

      const error = new Error('Database error');
      mockUserSettingsService.create.mockRejectedValue(error);

      await expect(controller.create(createDto)).rejects.toThrow('Database error');
      expect(userSettingsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should handle different sync schedule options', async () => {
      const testCases = [
        SyncSchedule.DAILY,
        SyncSchedule.EVERY_TWO_DAYS,
        SyncSchedule.WEEKLY,
        SyncSchedule.EVERY_TWO_WEEKS,
        SyncSchedule.MONTHLY_FIRST,
        SyncSchedule.MONTHLY_LAST,
      ];

      for (const schedule of testCases) {
        const createDto: CreateUserSettingsDto = {
          ynabApiToken: 'ynab-token-12345',
          syncSchedule: schedule,
        };

        const settingsWithSchedule = {
          ...mockUserSettings,
          syncSchedule: schedule,
        };

        mockUserSettingsService.create.mockResolvedValue(settingsWithSchedule);

        const result = await controller.create(createDto);

        expect(result.syncSchedule).toBe(schedule);
      }
    });
  });

  describe('findSettings', () => {
    it('should return user settings when found', async () => {
      mockUserSettingsService.findSettings.mockResolvedValue(mockUserSettings);

      const result = await controller.findSettings();

      expect(userSettingsService.findSettings).toHaveBeenCalled();
      expect(result).toEqual(mockUserSettings);
    });

    it('should return null when no settings found', async () => {
      mockUserSettingsService.findSettings.mockResolvedValue(null);

      const result = await controller.findSettings();

      expect(userSettingsService.findSettings).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockUserSettingsService.findSettings.mockRejectedValue(error);

      await expect(controller.findSettings()).rejects.toThrow('Database connection failed');
      expect(userSettingsService.findSettings).toHaveBeenCalled();
    });

    it('should return settings with null targetBudgetId', async () => {
      const settingsWithNullBudget = {
        ...mockUserSettings,
        targetBudgetId: null,
      };

      mockUserSettingsService.findSettings.mockResolvedValue(settingsWithNullBudget);

      const result = await controller.findSettings();

      expect(result?.targetBudgetId).toBeNull();
      expect(result?.id).toBe(mockUserSettings.id);
    });
  });

  describe('update', () => {
    it('should update user settings successfully', async () => {
      const updateDto: UpdateUserSettingsDto = {
        syncSchedule: SyncSchedule.WEEKLY,
      };

      const updatedSettings = {
        ...mockUserSettings,
        syncSchedule: SyncSchedule.WEEKLY,
      };

      mockUserSettingsService.update.mockResolvedValue(updatedSettings);

      const result = await controller.update(updateDto);

      expect(userSettingsService.update).toHaveBeenCalledWith(updateDto);
      expect(result).toEqual(updatedSettings);
    });

    it('should update user settings with all fields', async () => {
      const updateDto: UpdateUserSettingsDto = {
        ynabApiToken: 'new-token-67890',
        syncSchedule: SyncSchedule.MONTHLY_FIRST,
        targetBudgetId: 'new-budget-789',
      };

      const updatedSettings = {
        ...mockUserSettings,
        ...updateDto,
      };

      mockUserSettingsService.update.mockResolvedValue(updatedSettings);

      const result = await controller.update(updateDto);

      expect(userSettingsService.update).toHaveBeenCalledWith(updateDto);
      expect(result).toEqual(updatedSettings);
    });

    it('should update only specific fields', async () => {
      const updateDto: UpdateUserSettingsDto = {
        ynabApiToken: 'updated-token-only',
      };

      const updatedSettings = {
        ...mockUserSettings,
        ynabApiToken: 'updated-token-only',
      };

      mockUserSettingsService.update.mockResolvedValue(updatedSettings);

      const result = await controller.update(updateDto);

      expect(userSettingsService.update).toHaveBeenCalledWith(updateDto);
      expect(result.ynabApiToken).toBe('updated-token-only');
      expect(result.syncSchedule).toBe(mockUserSettings.syncSchedule);
    });

    it('should handle empty update DTO', async () => {
      const updateDto: UpdateUserSettingsDto = {};

      mockUserSettingsService.update.mockResolvedValue(mockUserSettings);

      const result = await controller.update(updateDto);

      expect(userSettingsService.update).toHaveBeenCalledWith(updateDto);
      expect(result).toEqual(mockUserSettings);
    });

    it('should handle service errors during update', async () => {
      const updateDto: UpdateUserSettingsDto = {
        syncSchedule: SyncSchedule.WEEKLY,
      };

      const error = new Error('Update failed');
      mockUserSettingsService.update.mockRejectedValue(error);

      await expect(controller.update(updateDto)).rejects.toThrow('Update failed');
      expect(userSettingsService.update).toHaveBeenCalledWith(updateDto);
    });

    it('should handle updating with undefined values', async () => {
      const updateDto: UpdateUserSettingsDto = {
        targetBudgetId: undefined,
        ynabApiToken: undefined,
      };

      const updatedSettings = {
        ...mockUserSettings,
        targetBudgetId: undefined,
        ynabApiToken: undefined,
      };

      mockUserSettingsService.update.mockResolvedValue(updatedSettings);

      const result = await controller.update(updateDto);

      expect(userSettingsService.update).toHaveBeenCalledWith(updateDto);
      expect(result.targetBudgetId).toBeUndefined();
      expect(result.ynabApiToken).toBeUndefined();
    });

    it('should handle different sync schedule updates', async () => {
      const testCases = [
        SyncSchedule.DAILY,
        SyncSchedule.EVERY_TWO_DAYS,
        SyncSchedule.WEEKLY,
        SyncSchedule.EVERY_TWO_WEEKS,
        SyncSchedule.MONTHLY_FIRST,
        SyncSchedule.MONTHLY_LAST,
      ];

      for (const schedule of testCases) {
        const updateDto: UpdateUserSettingsDto = {
          syncSchedule: schedule,
        };

        const updatedSettings = {
          ...mockUserSettings,
          syncSchedule: schedule,
        };

        mockUserSettingsService.update.mockResolvedValue(updatedSettings);

        const result = await controller.update(updateDto);

        expect(result.syncSchedule).toBe(schedule);
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle controller dependency injection correctly', () => {
      expect(controller).toBeDefined();
      expect(userSettingsService).toBeDefined();
      expect(ynabService).toBeDefined();
    });

    it('should handle forwardRef dependency with YnabService', async () => {
      const token = 'test-token';
      const mockBudgets = [
        {
          id: 'test-budget',
          name: 'Test Budget',
          last_modified_on: '2023-12-01T10:00:00Z',
          first_month: '2023-01-01',
          last_month: '2023-12-01',
          date_format: { format: 'MM/DD/YYYY' },
          currency_format: {
            iso_code: 'USD',
            example_format: '123,456.78',
            decimal_digits: 2,
            decimal_separator: '.',
            symbol_first: true,
            group_separator: ',',
            currency_symbol: '$',
            display_symbol: true,
          },
          accounts: [],
        },
      ];

      mockYnabService.getBudgets.mockResolvedValue(mockBudgets);

      const result = await controller.getBudgets({ token });

      expect(result).toEqual(mockBudgets);
      expect(ynabService.getBudgets).toHaveBeenCalledWith(token);
    });

    it('should handle async operations correctly', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'async-test-token',
        syncSchedule: SyncSchedule.DAILY,
      };

      mockUserSettingsService.create.mockResolvedValue(mockUserSettings);

      const createPromise = controller.create(createDto);

      // Verify the promise is returned immediately
      expect(createPromise).toBeInstanceOf(Promise);

      const result = await createPromise;
      expect(result).toEqual(mockUserSettings);
    });
  });

  describe('error handling edge cases', () => {
    it('should handle concurrent requests properly', async () => {
      const updateDto1: UpdateUserSettingsDto = { syncSchedule: SyncSchedule.DAILY };
      const updateDto2: UpdateUserSettingsDto = { syncSchedule: SyncSchedule.WEEKLY };

      const updatedSettings1 = { ...mockUserSettings, syncSchedule: SyncSchedule.DAILY };
      const updatedSettings2 = { ...mockUserSettings, syncSchedule: SyncSchedule.WEEKLY };

      mockUserSettingsService.update
        .mockResolvedValueOnce(updatedSettings1)
        .mockResolvedValueOnce(updatedSettings2);

      const [result1, result2] = await Promise.all([
        controller.update(updateDto1),
        controller.update(updateDto2),
      ]);

      expect(result1.syncSchedule).toBe(SyncSchedule.DAILY);
      expect(result2.syncSchedule).toBe(SyncSchedule.WEEKLY);
      expect(userSettingsService.update).toHaveBeenCalledTimes(2);
    });

    it('should handle network timeout scenarios', async () => {
      const token = 'timeout-token';
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      mockYnabService.getBudgets.mockRejectedValue(timeoutError);

      await expect(controller.getBudgets({ token })).rejects.toThrow('Request timeout');
    });

    it('should handle malformed data scenarios', async () => {
      const createDto: CreateUserSettingsDto = {
        ynabApiToken: 'malformed-token',
        syncSchedule: SyncSchedule.DAILY,
      };

      const malformedError = new Error('Malformed data');
      mockUserSettingsService.create.mockRejectedValue(malformedError);

      await expect(controller.create(createDto)).rejects.toThrow('Malformed data');
    });
  });
});
