import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateBalanceRequestDto {
  @Type(() => Number) 
  @IsNumber()
  @IsNotEmpty()
  delta!: number;
}
