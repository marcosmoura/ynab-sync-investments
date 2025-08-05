import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class YnabTokenDto {
  @ApiProperty({
    description: 'YNAB API token for accessing user data',
    example: 'ynab-api-token-12345678901234567890123456789012',
    type: 'string',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}
