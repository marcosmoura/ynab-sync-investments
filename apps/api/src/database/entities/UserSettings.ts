import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SyncSchedule {
  DAILY = 'daily',
  EVERY_TWO_DAYS = 'every_two_days',
  WEEKLY = 'weekly',
  EVERY_TWO_WEEKS = 'every_two_weeks',
  MONTHLY_FIRST = 'monthly_first',
  MONTHLY_LAST = 'monthly_last',
}

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  ynabApiToken: string;

  @Column({
    type: 'enum',
    enum: SyncSchedule,
    default: SyncSchedule.DAILY,
  })
  syncSchedule: SyncSchedule;

  @Column({ nullable: true })
  targetBudgetId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
