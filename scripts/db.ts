#!/usr/bin/env tsx

import { execSync, spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const CONTAINER_NAME = 'ynab-investments-db';
const COMPOSE_SERVICE = 'postgres';

/**
 * Database management utility
 */
class DatabaseManager {
  private execCommand(command: string, options: { stdio?: 'inherit' | 'pipe' } = {}) {
    try {
      return execSync(command, {
        cwd: rootDir,
        stdio: options.stdio || 'inherit',
      });
    } catch (error) {
      console.error(`❌ Command failed: ${command}`);
      throw error;
    }
  }

  private async checkDockerRunning() {
    try {
      execSync('docker info', { stdio: 'pipe' });
    } catch {
      console.error('❌ Docker is not running. Please start Docker first.');
      process.exit(1);
    }
  }

  /**
   * Create and start the database container
   */
  async create() {
    console.log('🐘 Creating and starting PostgreSQL database...');
    await this.checkDockerRunning();

    this.execCommand(`docker-compose up -d ${COMPOSE_SERVICE}`);
    console.log('\n✅ Database created and started successfully');

    // Wait for database to be ready
    console.log('⏳ Waiting for database to be ready...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('\n✅ Database is ready');
  }

  /**
   * Start the database container
   */
  async start() {
    console.log('🚀 Starting PostgreSQL database...');
    await this.checkDockerRunning();

    this.execCommand(`docker-compose start ${COMPOSE_SERVICE}`);
    console.log('\n✅ Database started successfully');
  }

  /**
   * Stop the database container
   */
  async stop() {
    console.log('🛑 Stopping PostgreSQL database...');
    this.execCommand(`docker-compose stop ${COMPOSE_SERVICE}`);
    console.log('\n✅ Database stopped successfully');
  }

  /**
   * Restart the database container
   */
  async restart() {
    console.log('🔄 Restarting PostgreSQL database...');
    await this.stop();
    await this.start();
    console.log('\n✅ Database restarted successfully');
  }

  /**
   * Show database container status
   */
  async status() {
    console.log('📊 Database container status:');
    this.execCommand(`docker-compose ps ${COMPOSE_SERVICE}`);
  }

  /**
   * Show database container logs
   */
  async logs() {
    console.log('📋 Database container logs:');
    this.execCommand(`docker-compose logs -f ${COMPOSE_SERVICE}`);
  }

  /**
   * Open database shell (psql)
   */
  async shell() {
    console.log('🐚 Opening database shell...');
    console.log('💡 Use \\q to exit the shell');

    const dbHost = process.env.DB_HOST || 'localhost';
    const dbName = process.env.DB_NAME || 'ynab_investments';
    const dbUser = process.env.DB_USERNAME || 'postgres';

    // When connecting from inside the container, use the internal port (5432)
    // The external port mapping (5433:5432) is only for external connections
    const internalPort = '5432';

    // Check if we have a TTY (interactive terminal)
    const isInteractive = process.stdin.isTTY && process.stdout.isTTY;
    const dockerFlags = isInteractive ? ['-it'] : ['-i'];

    // Use spawn for interactive shell
    const psql = spawn(
      'docker',
      [
        'exec',
        ...dockerFlags,
        CONTAINER_NAME,
        'psql',
        '-h',
        dbHost,
        '-p',
        internalPort,
        '-U',
        dbUser,
        '-d',
        dbName,
      ],
      {
        stdio: 'inherit',
        cwd: rootDir,
      },
    );

    psql.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Database shell closed');
      } else {
        console.error(`❌ Database shell exited with code ${code}`);
      }
    });
  }

  /**
   * Run database migrations
   */
  async migrate() {
    console.log('🔄 Running database migrations...');
    this.execCommand('pnpm exec typeorm migration:run -d apps/api/typeorm.config.ts');
    console.log('✅ Migrations completed successfully');
  }

  /**
   * Reset database (stop, remove, recreate, migrate)
   */
  async reset() {
    console.log('🗑️  Resetting database...');

    console.log('1/4 Stopping database...');
    this.execCommand(`docker-compose stop ${COMPOSE_SERVICE}`);

    console.log('2/4 Removing database container and volumes...');
    this.execCommand(`docker-compose rm -f ${COMPOSE_SERVICE}`);
    this.execCommand('docker volume rm ynab-investments-sync_postgres_data || true');

    console.log('3/4 Creating fresh database...');
    await this.create();

    console.log('4/4 Running migrations...');
    await this.migrate();

    console.log('\n✅ Database reset completed successfully');
  }
}

/**
 * Main function to handle command line arguments
 */
async function main() {
  const command = process.argv[2];
  const dbManager = new DatabaseManager();

  switch (command) {
    case 'create':
      await dbManager.create();
      break;
    case 'start':
      await dbManager.start();
      break;
    case 'stop':
      await dbManager.stop();
      break;
    case 'restart':
      await dbManager.restart();
      break;
    case 'status':
      await dbManager.status();
      break;
    case 'logs':
      await dbManager.logs();
      break;
    case 'shell':
      await dbManager.shell();
      break;
    case 'migrate':
      await dbManager.migrate();
      break;
    case 'reset':
      await dbManager.reset();
      break;
    default:
      console.log('🗄️  Database Management Commands:');
      console.log('');
      console.log('  pnpm db create   - Create and start database container');
      console.log('  pnpm db start    - Start database container');
      console.log('  pnpm db stop     - Stop database container');
      console.log('  pnpm db restart  - Restart database container');
      console.log('  pnpm db status   - Show database container status');
      console.log('  pnpm db logs     - Show database container logs');
      console.log('  pnpm db shell    - Open database shell (psql)');
      console.log('  pnpm db migrate  - Run database migrations');
      console.log('  pnpm db reset    - Reset database (destructive!)');
      console.log('');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Database operation failed:', error);
  process.exit(1);
});
