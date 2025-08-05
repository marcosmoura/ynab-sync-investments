import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import 'reflect-metadata';

// Load environment variables
dotenv.config({ path: ['.env', '../../../.env'] });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'ynab_investments',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/shared/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
