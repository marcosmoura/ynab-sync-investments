import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, it, expect, beforeEach } from 'vitest';
import { createMock } from '@golevelup/ts-vitest';

import { UserSettings } from '@/shared/entities';

import { UserSettingsService } from './user-settings.service';
import { UserSettingsController } from './user-settings.controller';

describe('UserSettingsController', () => {
  let controller: UserSettingsController;
  let service: UserSettingsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UserSettingsController],
      providers: [
        UserSettingsService,
        {
          provide: getRepositoryToken(UserSettings),
          useValue: createMock<UserSettings>(),
        },
      ],
    }).compile();

    service = moduleRef.get(UserSettingsService);
    controller = moduleRef.get(UserSettingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });
});
