import { IsUUID, IsInt, Min, IsString, IsOptional, IsISO8601 } from 'class-validator';

export class CreateOrderItemDto {
  @IsUUID()
  menuItemId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;

  // ✅ damit "deliveryTime" nicht mehr "should not exist" ist:
  @IsISO8601()
  deliveryTime!: string;
}
