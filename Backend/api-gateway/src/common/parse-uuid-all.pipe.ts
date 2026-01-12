import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class ParseUuidAllPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const v = String(value ?? '').trim();
    if (!isUUID(v, 'all')) {
      throw new BadRequestException('Validation failed (uuid is expected)');
    }
    return v;
  }
}
