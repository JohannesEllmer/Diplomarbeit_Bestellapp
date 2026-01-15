import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsArray
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { UserRefDto } from '../../orders/dto/user-ref.dto';

export class CreateOrderDto {
  @ApiProperty()
  @ValidateNested()
  @Type(() => UserRefDto)
  user: UserRefDto;

   @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiProperty()
  @IsNumber()
  totalPrice: number;

  @ApiProperty()
  @IsDateString()
  createdAt: string;

  @ApiProperty()
  @IsEnum(['open', 'closed'])
  status: 'open' | 'closed';
}
