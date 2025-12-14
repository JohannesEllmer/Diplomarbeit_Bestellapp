import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNumber, IsBoolean, IsIn } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ enum: ['ADMIN', 'INHABER', 'KUNDE'] })
  @IsIn(['ADMIN', 'INHABER', 'KUNDE'])
  role: 'ADMIN' | 'INHABER' | 'KUNDE';

  @ApiProperty()
  @IsString()
  class: string;

  @ApiProperty()
  @IsNumber()
  orderCount: number;

  @ApiProperty()
  @IsBoolean()
  blocked: boolean;

  @ApiProperty()
  @IsString()
  school_type: string;

  @ApiProperty()
  @IsNumber()
  balance: number;


}
