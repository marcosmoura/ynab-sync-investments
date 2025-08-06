import * as path from 'path';

import * as dotenv from 'dotenv';

// Load environment variables from the root .env file
const apiEnvPath = path.join(__dirname, '../../../../.env');
dotenv.config({ path: apiEnvPath });

import { ApiPlayground } from './playground/api-playground';

type PlaygroundMode = 'database' | 'file-sync' | 'both';

function parseArgs(): PlaygroundMode {
  const args = process.argv.slice(2);

  // Handle --mode flag
  const modeIndex = args.findIndex((arg) => arg === '--mode');
  if (modeIndex !== -1 && modeIndex + 1 < args.length) {
    const mode = args[modeIndex + 1];
    if (mode === 'database' || mode === 'file-sync' || mode === 'both') {
      return mode;
    }
  }

  // Backward compatibility with old flags
  if (args.includes('--file-sync')) {
    return 'file-sync';
  }

  if (args.includes('--database')) {
    return 'database';
  }

  if (args.includes('--both')) {
    return 'both';
  }

  // Default to database if no flag is specified
  return 'database';
}

function printUsage() {
  console.log('Usage: node main.js [--mode <database|file-sync|both>]');
  console.log('   or: node main.js [--database|--file-sync|--both]  (legacy)');
  console.log('');
  console.log('Modes:');
  console.log('  --mode database   Run with database asset management and regular sync (default)');
  console.log(
    '  --mode file-sync  Run with file-based sync only (requires INVESTMENTS_CONFIG_FILE_URL)',
  );
  console.log('  --mode both       Run both database and file sync tests');
  console.log('');
}

async function main() {
  const mode = parseArgs();

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    return;
  }

  const playground = new ApiPlayground();

  try {
    console.log('🚀 Starting YNAB Investments Sync API Playground');
    console.log(`📋 Mode: ${mode}`);
    console.log('================================================');

    await playground.run(mode);

    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Playground execution failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
