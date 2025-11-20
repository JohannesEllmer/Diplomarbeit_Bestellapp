import { IsString, IsNumber, IsBoolean, IsArray } from 'class-validator';

export class MenuItemDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsString()
  category: string;

  @IsBoolean()
  available: boolean;

  @IsBoolean()
  vegetarian: boolean;

  @IsArray()
  @IsString({ each: true })
  allergens: string[];
}
