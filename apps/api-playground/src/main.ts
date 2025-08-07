import * as path from 'path';

import * as dotenv from 'dotenv';

// Load environment variables from the root .env file
const apiEnvPath = path.join(__dirname, '../../../../.env');
dotenv.config({ path: apiEnvPath });

import { ApiPlayground } from './playground/api-playground';

function printUsage() {
  console.log('Usage: node main.js [--help|-h]');
  console.log('');
  console.log('YNAB Investments Sync Playground');
  console.log('Tests the file-based sync functionality with YNAB.');
  console.log('');
  console.log('Environment variables required:');
  console.log('  YNAB_API_KEY                    - Your YNAB personal access token');
  console.log('  INVESTMENTS_CONFIG_FILE_URL   - URL to your investments config YAML file');
  console.log('');
  console.log('Optional environment variables:');
  console.log(
    '  API_BASE_URL                  - API base URL (default: http://localhost:3000/api)',
  );
  console.log('  Market data provider API keys - For better asset price coverage');
  console.log('');
}

async function main() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  const playground = new ApiPlayground();

  try {
    console.log('🚀 Starting YNAB Investments Sync API Playground');
    console.log('================================================');

    await playground.run();

    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Playground execution failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
