import { IsNumber, IsString, IsUUID, IsPositive } from 'class-validator';

export class UpdateAssetDto {
  @IsNumber()
  @IsPositive()
  amount?: number;

  @IsString()
  @IsUUID()
  ynabAccountId?: string;
}
