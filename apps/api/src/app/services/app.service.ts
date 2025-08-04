import { Injectable } from '@nestjs/common';
import { AppResponseDto } from '../dto';

@Injectable()
export class AppService {
  getData(): AppResponseDto {
    return { message: 'Hello API' };
  }
}
