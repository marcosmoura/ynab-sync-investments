import { ApiProperty } from '@nestjs/swagger';

export class YnabBudgetDto {
  @ApiProperty({
    description: 'YNAB budget unique identifier',
    example: 'b1c2d3e4-f5g6-7890-bcde-fg1234567890',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Budget name',
    example: 'My Personal Budget',
  })
  name: string;

  @ApiProperty({
    description: 'Budget currency code',
    example: 'USD',
  })
  currency: string;

  @ApiProperty({
    description: 'Last modified date',
    example: '2023-12-01T10:30:00Z',
    type: Date,
  })
  lastModifiedOn: Date;

  @ApiProperty({
    description: 'First month of the budget',
    example: '2023-01-01',
  })
  firstMonth: string;

  @ApiProperty({
    description: 'Last month of the budget',
    example: '2024-12-01',
  })
  lastMonth: string;
}
