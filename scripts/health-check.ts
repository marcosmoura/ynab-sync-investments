#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

/**
 * Health check for the development environment
 */
async function healthCheck() {
  console.log('🏥 YNAB Investments Sync - Health Check\n');

  const checks = [
    {
      name: 'Docker',
      check: () => execSync('docker --version', { stdio: 'pipe' }),
      description: 'Docker is installed and accessible',
    },
    {
      name: 'Docker Compose',
      check: () => execSync('docker-compose --version', { stdio: 'pipe' }),
      description: 'Docker Compose is installed and accessible',
    },
    {
      name: 'Node.js',
      check: () => execSync('node --version', { stdio: 'pipe' }),
      description: 'Node.js is installed',
    },
    {
      name: 'pnpm',
      check: () => execSync('pnpm --version', { stdio: 'pipe' }),
      description: 'pnpm package manager is installed',
    },
    {
      name: 'Database Container',
      check: () => {
        const result = execSync(
          'docker ps --filter "name=ynab-investments-db" --format "{{.Status}}"',
          {
            stdio: 'pipe',
            encoding: 'utf8',
          },
        );
        if (!result.trim() || !result.includes('Up')) {
          throw new Error('Database container is not running');
        }
        return result;
      },
      description: 'Database container is running',
    },
    {
      name: 'Database Connection',
      check: () => {
        return execSync(
          'docker exec ynab-investments-db pg_isready -U postgres -d ynab_investments',
          {
            stdio: 'pipe',
          },
        );
      },
      description: 'Database is accepting connections',
    },
    {
      name: 'API Dependencies',
      check: () => {
        return execSync('pnpm nx typecheck api', {
          cwd: rootDir,
          stdio: 'pipe',
        });
      },
      description: 'API project dependencies and types are valid',
    },
  ];

  let passedChecks = 0;
  const totalChecks = checks.length;

  for (const { name, check, description } of checks) {
    try {
      await check();
      console.log(`✅ ${name}: ${description}`);
      passedChecks++;
    } catch {
      console.log(`❌ ${name}: ${description}`);
      if (name === 'Database Container' || name === 'Database Connection') {
        console.log('   💡 Run `pnpm db start` to start the database');
      }
    }
  }

  console.log(`\n📊 Health Check Summary: ${passedChecks}/${totalChecks} checks passed\n`);

  if (passedChecks === totalChecks) {
    console.log('🎉 All systems are go! Your development environment is ready.');
  } else {
    console.log('⚠️  Some issues detected. Please address the failed checks above.');
    process.exit(1);
  }
}

healthCheck().catch((error) => {
  console.error('❌ Health check failed:', error);
  process.exit(1);
});
