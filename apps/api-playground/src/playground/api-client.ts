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

  async triggerFileSync(): Promise<{ message: string }> {
    return this.request('/trigger', {
      method: 'GET',
    });
  }
}
