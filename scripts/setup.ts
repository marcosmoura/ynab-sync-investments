#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Setup development environment for the first time
 */
async function setup() {
  console.log('🚀 Setting up YNAB Investments Sync development environment...\n');

  try {
    // Step 1: Install dependencies
    console.log('📦 Installing dependencies...');
    execSync('pnpm install', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('✅ Dependencies installed successfully\n');

    // Step 2: Create .env file if it doesn't exist
    const envPath = join(rootDir, '.env');
    const envExamplePath = join(rootDir, '.env.example');

    if (!existsSync(envPath)) {
      if (existsSync(envExamplePath)) {
        console.log('📝 Creating .env file from .env.example...');
        copyFileSync(envExamplePath, envPath);
        console.log('✅ .env file created successfully');
        console.log('⚠️  Please review and update the .env file with your specific values\n');
      } else {
        console.log('❌ .env.example file not found. Please create one manually\n');
      }
    } else {
      console.log('ℹ️  .env file already exists, skipping creation\n');
    }

    // Step 3: Start database
    console.log('🐘 Starting PostgreSQL database...');
    execSync('docker-compose up -d postgres', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('✅ Database started successfully\n');

    // Step 4: Wait a moment for DB to be ready
    console.log('⏳ Waiting for database to be ready...');
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Step 5: Run migrations
    console.log('🔄 Running database migrations...');
    execSync('pnpm nx migration:run api', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('✅ Migrations completed successfully\n');

    console.log('🎉 Development environment setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Review and update your .env file if needed');
    console.log('2. Run `pnpm nx serve api` to start the API server');
    console.log('3. Run `pnpm nx serve web` to start the web frontend');
    console.log('4. Visit http://localhost:8080 for database admin (Adminer)');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setup();
