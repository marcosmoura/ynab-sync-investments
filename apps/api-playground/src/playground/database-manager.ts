import { execSync } from 'child_process';

export interface DatabaseStatus {
  healthy: boolean;
  running: boolean;
  url: string;
  error?: string;
  responseTime?: number;
}

export interface DetailedStatus extends DatabaseStatus {
  containerName: string;
  checkTime: Date;
}

/**
 * Database manager for the API playground.
 * Handles database status checking and reset operations.
 */
export class DatabaseManager {
  private readonly containerName = 'ynab-investments-db';
  private readonly apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  }

  /**
   * Check if the database is running by looking for the container name in docker ps output
   */
  async isDatabaseRunning(): Promise<boolean> {
    try {
      const output = execSync('pnpm db status', {
        encoding: 'utf8',
        stdio: 'pipe',
      });

      // Check if our container is present in the output
      return output.includes(this.containerName);
    } catch (error) {
      console.warn('⚠️  Failed to check database status:', error);
      return false;
    }
  }

  /**
   * Check API health and response time
   */
  async checkApiHealth(): Promise<{ healthy: boolean; responseTime?: number; error?: string }> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${this.apiBaseUrl}/api`);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        return { healthy: true, responseTime };
      } else {
        return {
          healthy: false,
          responseTime,
          error: `API returned status ${response.status}`,
        };
      }
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get database status with health checks
   */
  async getDatabaseStatus(): Promise<DatabaseStatus> {
    const isRunning = await this.isDatabaseRunning();
    const apiHealth = await this.checkApiHealth();

    return {
      healthy: isRunning && apiHealth.healthy,
      running: isRunning,
      url: this.apiBaseUrl,
      responseTime: apiHealth.responseTime,
      error: apiHealth.error || (!isRunning ? 'Database container not running' : undefined),
    };
  }

  /**
   * Get detailed status information for debugging
   */
  async getDetailedStatus(): Promise<DetailedStatus> {
    const basicStatus = await this.getDatabaseStatus();

    return {
      ...basicStatus,
      containerName: this.containerName,
      checkTime: new Date(),
    };
  }

  /**
   * Reset the database using the pnpm script
   */
  async resetDatabase(): Promise<void> {
    try {
      console.log('🗑️  Resetting database...');

      execSync('pnpm db reset', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      console.log('✅ Database reset completed');

      // Wait a moment for the database to be fully ready
      console.log('⏳ Waiting for database to be ready...');
      await this.waitForDatabase();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Database reset failed:', errorMessage);
      throw new Error(`Database reset failed: ${errorMessage}`);
    }
  }

  /**
   * Wait for the database to be healthy and ready
   */
  async waitForDatabase(maxAttempts = 10, delayMs = 2000): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`🔍 Checking database health (attempt ${attempt}/${maxAttempts})...`);

      const status = await this.getDatabaseStatus();

      if (status.healthy) {
        console.log(`✅ Database is healthy and ready (response time: ${status.responseTime}ms)`);
        return;
      }

      if (attempt < maxAttempts) {
        console.log(`⏳ Database not ready yet, waiting ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    console.warn('⚠️  Database health check timed out, but continuing...');
  }

  /**
   * Start the database if it's not running (for convenience)
   */
  async startDatabase(): Promise<void> {
    try {
      console.log('🚀 Starting database...');

      execSync('pnpm db start', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });

      console.log('✅ Database start command completed');
      await this.waitForDatabase();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Database start failed:', errorMessage);
      throw new Error(`Database start failed: ${errorMessage}`);
    }
  }

  /**
   * Comprehensive environment check
   */
  async validateEnvironment(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    // Check if pnpm is available
    try {
      execSync('pnpm --version', { stdio: 'pipe' });
    } catch {
      issues.push('pnpm is not available or not in PATH');
    }

    // Check if Docker is running
    try {
      execSync('docker info', { stdio: 'pipe' });
    } catch {
      issues.push('Docker is not running or not available');
    }

    // Check database status
    const dbStatus = await this.getDatabaseStatus();
    if (!dbStatus.running) {
      issues.push('Database container is not running');
    }

    // Check API accessibility
    if (!dbStatus.healthy) {
      issues.push(`API is not accessible: ${dbStatus.error || 'Unknown reason'}`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Print detailed status report
   */
  async printStatusReport(): Promise<void> {
    console.log('\n📊 Database Manager Status Report');
    console.log('================================');

    const detailedStatus = await this.getDetailedStatus();
    const envCheck = await this.validateEnvironment();

    console.log(`🕐 Check Time: ${detailedStatus.checkTime.toISOString()}`);
    console.log(`🐳 Container: ${detailedStatus.containerName}`);
    console.log(`🏃 Running: ${detailedStatus.running ? '✅ Yes' : '❌ No'}`);
    console.log(`💚 Healthy: ${detailedStatus.healthy ? '✅ Yes' : '❌ No'}`);
    console.log(`🌐 API URL: ${detailedStatus.url}`);

    if (detailedStatus.responseTime) {
      console.log(`⚡ Response Time: ${detailedStatus.responseTime}ms`);
    }

    if (detailedStatus.error) {
      console.log(`❌ Error: ${detailedStatus.error}`);
    }

    console.log('\n🔧 Environment Validation:');
    if (envCheck.valid) {
      console.log('✅ Environment is valid');
    } else {
      console.log('❌ Environment issues found:');
      envCheck.issues.forEach((issue) => console.log(`   • ${issue}`));
    }

    console.log('================================\n');
  }
}
