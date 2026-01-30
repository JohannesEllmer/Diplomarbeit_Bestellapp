import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMenuItemDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  price!: number;

  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty()
  @IsBoolean()
  available!: boolean;

  @ApiProperty()
  @IsBoolean()
  vegetarian!: boolean;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  allergens!: string[];

  @IsOptional()
  @IsString()
  drink?: string;

  @IsOptional()
  @IsString()
  dessert?: string;
}
