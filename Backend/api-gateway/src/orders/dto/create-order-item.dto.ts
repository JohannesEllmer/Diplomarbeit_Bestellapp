import { IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MenuItemDto } from './menu-item.dto';
import { UserRefDto } from './user-ref.dto';

export class CreateOrderItemDto {
  @ValidateNested()
  @Type(() => MenuItemDto)
  menuItem: MenuItemDto;

  @ValidateNested()
  @Type(() => UserRefDto)
  user: UserRefDto;

  @IsString()
  note: string;

  @IsNumber()
  quantity: number;
}
