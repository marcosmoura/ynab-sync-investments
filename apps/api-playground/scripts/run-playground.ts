#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if the API .env file exists
const apiEnvPath = join(__dirname, '../../../.env');
const apiEnvExamplePath = join(__dirname, '../../../.env.example');

if (!fs.existsSync(apiEnvPath)) {
  console.log('📋 Setting up environment configuration...');

  if (fs.existsSync(apiEnvExamplePath)) {
    fs.copyFileSync(apiEnvExamplePath, apiEnvPath);
    console.log('✅ Created .env file from .env.example');
    console.log('⚠️  Please edit apps/api/.env and configure your YNAB credentials:');
    console.log('   - YNAB_API_KEY');
    console.log('   - YNAB_BUDGET_ID');
    console.log('   - YNAB_CRYPTO_ACCOUNT_ID');
    console.log('   - YNAB_INVESTMENTS_ACCOUNT_ID');
    console.log('');
    console.log('Then run this script again.');
    process.exit(1);
  } else {
    console.log('❌ .env.example file not found at:', apiEnvExamplePath);
    process.exit(1);
  }
}

// Check if essential YNAB environment variables are set
const envContent = fs.readFileSync(apiEnvPath, 'utf8');
const requiredVars = [
  'YNAB_API_KEY',
  'YNAB_BUDGET_ID',
  'YNAB_CRYPTO_ACCOUNT_ID',
  'YNAB_INVESTMENTS_ACCOUNT_ID',
];
const missingVars = requiredVars.filter(
  (varName) => !envContent.includes(`${varName}=`) || envContent.includes(`${varName}=your_`),
);

if (missingVars.length > 0) {
  console.log('❌ Missing required YNAB configuration in apps/api/.env:');
  missingVars.forEach((varName) => console.log(`   - ${varName}`));
  console.log('');
  console.log('Please configure these variables and run the script again.');
  process.exit(1);
}

console.log('🚀 Starting API Playground...');
console.log('');

// Check if API is running
const apiHealthUrl = 'http://localhost:3000/api';

try {
  const response = await fetch(apiHealthUrl);
  if (!response.ok) {
    throw new Error('API not responding');
  }
} catch {
  console.log('❌ API server is not running on http://localhost:3000');
  console.log('');
  console.log('Please start the API server first:');
  console.log('   pnpm nx serve api');
  console.log('');
  console.log('Then run this script again.');
  process.exit(1);
}

// Run the playground
const playgroundPath = join(__dirname, '../../../dist/apps/api-playground/main.cjs');

console.log('🎮 Running playground...\n');

console.log(playgroundPath, '\n');

// Forward command-line arguments to the main process
const args = process.argv.slice(2);
const runProcess = spawn('node', [playgroundPath, ...args], {
  stdio: 'inherit',
});

runProcess.on('close', (code) => {
  console.log('');
  if (code === 0) {
    console.log('🎉 Playground completed successfully!');
  } else {
    console.log('❌ Playground execution failed');
    process.exit(1);
  }
});
