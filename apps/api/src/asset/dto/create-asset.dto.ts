import { IsString, IsNumber, IsUUID, IsPositive } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  symbol: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsUUID()
  ynabAccountId: string;
}
