import { IsArray, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateDishDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsArray()
  @IsString({ each: true })
  allergenes!: string[];
}
