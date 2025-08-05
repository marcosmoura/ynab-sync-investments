import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1754399959093 implements MigrationInterface {
  name = 'AddTargetBudgetIdToUserSettings1754399959093';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_settings" ADD "targetBudgetId" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user_settings" DROP COLUMN "targetBudgetId"`);
  }
}
