import {
  IsNumber,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsArray
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRefDto } from './user-ref.dto';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => UserRefDto)
  user: UserRefDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsNumber()
  totalPrice: number;

  @IsDateString()
  createdAt: string;

  @IsEnum(['open', 'closed'])
  status: 'open' | 'closed';
}
