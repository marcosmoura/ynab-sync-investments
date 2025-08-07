#!/usr/bin/env node

/**
 * Quick summary script to verify the API Playground setup
 */

import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main(): Promise<void> {
  console.log('🔍 YNAB Investments Sync - API Playground Setup Check');
  console.log('=====================================================\n');

  // Check if .env exists
  const envPath = join(__dirname, '../../../.env');
  const envExists = fs.existsSync(envPath);

  console.log(`📁 Environment file: ${envExists ? '✅ Found' : '❌ Missing'}`);

  if (envExists) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
      'YNAB_API_KEY',
      'YNAB_BUDGET_ID',
      'YNAB_INVESTMENTS_ACCOUNT_ID',
      'YNAB_CRYPTO_ACCOUNT_ID',
      'INVESTMENTS_CONFIG_FILE_URL',
    ] as const;

    console.log('\n📋 YNAB Configuration:');
    requiredVars.forEach((varName) => {
      const regex = new RegExp(`^${varName}=(.*)$`, 'm');
      const match = envContent.match(regex);
      const hasVar = match && !match[1].startsWith('your_');
      const value = match ? match[1] : 'Not set';

      console.log(`   ${hasVar ? '✅' : '❌'} ${varName}: ${value}`);
    });
  }

  // Check if built files exist
  const builtPlayground = fs.existsSync(
    join(__dirname, '../../../dist/apps/api-playground/main.js'),
  );
  console.log(`\n📦 Built playground: ${builtPlayground ? '✅ Ready' : '⚠️  Needs building'}`);

  // API check
  console.log('\n🌐 Checking API server...');
  try {
    await fetch('http://localhost:3000/api');
    console.log('   ✅ API server is running');
  } catch {
    console.log('   ❌ API server is not running');
    console.log('   💡 Start it with: pnpm nx serve api');
  }

  console.log('\n🚀 Ready to run playground:');
  console.log('   pnpm nx run api-playground:run-playground');
  console.log('\n📖 For detailed instructions, see:');
  console.log('   apps/api-playground/README.md');
}

// Execute main function
main().catch((error: Error) => {
  console.error('Error running setup check:', error);
  process.exit(1);
});
