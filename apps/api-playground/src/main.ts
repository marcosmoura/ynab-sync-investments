import * as path from 'path';

import * as dotenv from 'dotenv';

// Load environment variables from the root .env file
const apiEnvPath = path.join(__dirname, '../../../../.env');
dotenv.config({ path: apiEnvPath });

import { ApiPlayground } from './playground/api-playground';

async function main() {
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
