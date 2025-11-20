import { IsString, IsEmail, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  class: string;

  @IsNumber()
  orderCount: number;

  @IsNumber()
  balance: number;

  @IsBoolean()
  blocked: boolean;
}
