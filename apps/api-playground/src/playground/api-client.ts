export interface CreateAssetDto {
  symbol: string;
  amount: number;
  ynabAccountId: string;
}

export interface AssetResponseDto {
  id: string;
  symbol: string;
  amount: number;
  ynabAccountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserSettingsDto {
  ynabApiToken: string;
  syncSchedule: string;
  targetBudgetId?: string;
}

export interface UserSettingsResponseDto {
  id: string;
  ynabApiToken: string;
  syncSchedule: string;
  targetBudgetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface YnabAccountDto {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export interface YnabBudgetDto {
  id: string;
  name: string;
  currency: string;
  lastModifiedOn: string;
  firstMonth: string;
  lastMonth: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json() as T;
  }

  // Health check
  async getHealth(): Promise<{ status: string; message: string }> {
    return this.request('/');
  }

  // User Settings
  async createUserSettings(data: CreateUserSettingsDto): Promise<UserSettingsResponseDto> {
    return this.request('/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getUserSettings(): Promise<UserSettingsResponseDto | null> {
    try {
      return await this.request('/settings');
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async updateUserSettings(data: Partial<CreateUserSettingsDto>): Promise<UserSettingsResponseDto> {
    return this.request('/settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Assets
  async createAsset(data: CreateAssetDto): Promise<AssetResponseDto> {
    return this.request('/assets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAllAssets(): Promise<AssetResponseDto[]> {
    return this.request('/assets');
  }

  async getAssetsByAccount(ynabAccountId: string): Promise<AssetResponseDto[]> {
    return this.request(`/assets?ynabAccountId=${encodeURIComponent(ynabAccountId)}`);
  }

  async getAsset(id: string): Promise<AssetResponseDto> {
    return this.request(`/assets/${id}`);
  }

  async updateAsset(id: string, data: Partial<CreateAssetDto>): Promise<AssetResponseDto> {
    return this.request(`/assets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAsset(id: string): Promise<void> {
    await this.request(`/assets/${id}`, {
      method: 'DELETE',
    });
  }

  // YNAB Integration
  async getYnabBudgets(token: string): Promise<YnabBudgetDto[]> {
    return this.request('/ynab/budgets', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getYnabAccounts(token: string, budgetId?: string): Promise<YnabAccountDto[]> {
    return this.request('/ynab/accounts', {
      method: 'POST',
      body: JSON.stringify({ token, budgetId }),
    });
  }

  async triggerSync(): Promise<{ message: string }> {
    return this.request('/ynab/sync', {
      method: 'POST',
    });
  }

  async triggerFileSync(): Promise<{ message: string }> {
    return this.request('/file-sync/trigger', {
      method: 'POST',
    });
  }
}
