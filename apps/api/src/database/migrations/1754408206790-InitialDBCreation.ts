import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialDBCreation1754408206790 implements MigrationInterface {
  name = 'InitialDBCreation1754408206790';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "symbol" character varying NOT NULL, "amount" numeric(18,8) NOT NULL, "ynabAccountId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."user_settings_syncschedule_enum" AS ENUM('daily', 'every_two_days', 'weekly', 'every_two_weeks', 'monthly_first', 'monthly_last')`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_settings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "ynabApiToken" character varying NOT NULL, "syncSchedule" "public"."user_settings_syncschedule_enum" NOT NULL DEFAULT 'daily', "targetBudgetId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_00f004f5922a0744d174530d639" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_settings"`);
    await queryRunner.query(`DROP TYPE "public"."user_settings_syncschedule_enum"`);
    await queryRunner.query(`DROP TABLE "assets"`);
  }
}
