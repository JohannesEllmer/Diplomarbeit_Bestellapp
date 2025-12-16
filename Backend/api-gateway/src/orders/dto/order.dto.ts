import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
  IsIn,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  menuItemId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class OrderItemDto {
  menuItem!: {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    available: boolean;
    vegetarian: boolean;
    allergens: string[];
  };
  user!: {
    id: string;
    name: string;
    email: string;
    class: string;
    orderCount: number;
    balance: number;
    blocked: boolean;
  };
  note!: string;
  quantity!: number;
  delivered?: boolean;
  deliveryTime?: string;
}

export class OrderDto {
  id!: string;
  user!: {
    id: string;
    name: string;
    email: string;
    class: string;
    orderCount: number;
    balance: number;
    blocked: boolean;
  };
  items!: OrderItemDto[];
  totalPrice!: number;
  createdAt!: Date;
  status!: 'open' | 'closed';
  qrCodeUrl?: string;
}
export class UpdateOrderDto {
  @IsOptional()
  @IsIn(['open', 'closed'])
  status?: 'open' | 'closed';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
