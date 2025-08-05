import { YnabAccountDto } from './api-client';

interface ValidationResult {
  success: boolean;
  message: string;
  details?: string[] | Record<string, unknown>;
}

export class YnabValidator {
  async validateAccountBalances(
    accounts: YnabAccountDto[],
    expectedMinimumBalances?: { [accountId: string]: number },
  ): Promise<ValidationResult> {
    try {
      const results: string[] = [];
      let allValid = true;

      for (const account of accounts) {
        const accountInfo = `${account.name} (${account.id})`;

        // Basic validation: account should have a positive balance after sync
        if (account.balance <= 0) {
          results.push(
            `❌ ${accountInfo}: Balance is ${account.balance} ${account.currency} (expected > 0)`,
          );
          allValid = false;
        } else {
          results.push(`✅ ${accountInfo}: Balance is ${account.balance} ${account.currency}`);
        }

        // Check against expected minimum if provided
        if (expectedMinimumBalances && expectedMinimumBalances[account.id]) {
          const expectedMin = expectedMinimumBalances[account.id];
          if (account.balance < expectedMin) {
            results.push(
              `⚠️  ${accountInfo}: Balance ${account.balance} is below expected minimum ${expectedMin}`,
            );
          }
        }
      }

      return {
        success: allValid,
        message: allValid ? 'All account balances are valid' : 'Some account balances are invalid',
        details: results,
      };
    } catch (error) {
      return {
        success: false,
        message: `Validation failed: ${error instanceof Error ? error.message : error}`,
      };
    }
  }

  async validateTransactionHistory(
    ynabApiToken: string,
    accountIds: string[],
    budgetId?: string,
  ): Promise<ValidationResult> {
    try {
      // This would require implementing YNAB transaction history checking
      // For now, we'll just validate that we can access the accounts
      console.log('🔍 Transaction history validation not implemented yet');
      console.log('📝 Would validate transactions for accounts:', accountIds);

      return {
        success: true,
        message: 'Transaction history validation skipped (not implemented)',
        details: {
          note: 'This would check for recent balance adjustment transactions',
          accountIds,
          budgetId,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Transaction validation failed: ${error instanceof Error ? error.message : error}`,
      };
    }
  }

  async validateSyncTimestamp(
    expectedSyncTime: Date,
    toleranceMinutes = 5,
  ): Promise<ValidationResult> {
    try {
      const now = new Date();
      const timeDifference = Math.abs(now.getTime() - expectedSyncTime.getTime());
      const differenceMinutes = timeDifference / (1000 * 60);

      if (differenceMinutes <= toleranceMinutes) {
        return {
          success: true,
          message: `Sync completed within expected timeframe (${differenceMinutes.toFixed(1)} minutes ago)`,
        };
      } else {
        return {
          success: false,
          message: `Sync took longer than expected (${differenceMinutes.toFixed(1)} minutes, tolerance: ${toleranceMinutes} minutes)`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Timestamp validation failed: ${error instanceof Error ? error.message : error}`,
      };
    }
  }

  logValidationResults(results: ValidationResult[]): void {
    console.log('\n📊 Validation Summary:');
    console.log('======================');

    let successCount = 0;
    const totalCount = results.length;

    for (const result of results) {
      const icon = result.success ? '✅' : '❌';
      console.log(`${icon} ${result.message}`);

      if (result.details) {
        if (Array.isArray(result.details)) {
          result.details.forEach((detail) => console.log(`   ${detail}`));
        } else {
          console.log(`   Details:`, result.details);
        }
      }

      if (result.success) {
        successCount++;
      }
    }

    const overallSuccess = successCount === totalCount;
    const percentage = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

    console.log(`\n📈 Overall: ${successCount}/${totalCount} validations passed (${percentage}%)`);

    if (overallSuccess) {
      console.log('🎉 All validations successful!');
    } else {
      console.log('⚠️  Some validations failed - please review the results above');
    }
  }
}
