import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMenuEntryDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsUUID()
  dishMenuItemId?: string;

  @IsOptional()
  @IsString()
  drink?: string;

  @IsOptional()
  @IsString()
  dessert?: string;
}
