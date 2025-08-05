import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getData() {
    return {
      message: 'YNAB Investments Sync API',
      version: '1.0.0',
      status: 'running',
      documentation: '/api/docs',
    };
  }
}
