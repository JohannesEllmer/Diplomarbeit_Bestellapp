import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  class: string;

  @ApiProperty()
  @IsNumber()
  orderCount: number;

  @ApiProperty()
  @IsNumber()
  balance: number;

  @ApiProperty()
  @IsBoolean()
  blocked: boolean;
}
