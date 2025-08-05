import { ApiProperty } from '@nestjs/swagger';

export class YnabAccountDto {
  @ApiProperty({
    description: 'YNAB account unique identifier',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Account name',
    example: 'Investment Account',
  })
  name: string;

  @ApiProperty({
    description: 'Account type',
    example: 'investmentAccount',
  })
  type: string;

  @ApiProperty({
    description: 'Account balance in milliunits',
    example: 150000,
  })
  balance: number;

  @ApiProperty({
    description: 'Account currency code',
    example: 'USD',
  })
  currency: string;
}
