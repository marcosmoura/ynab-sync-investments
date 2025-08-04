import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
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
  entities: ['src/shared/entities/*.entity{.ts,.js}'],
  migrations: ['src/shared/migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
});
