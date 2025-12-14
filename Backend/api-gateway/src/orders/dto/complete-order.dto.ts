import { IsString } from 'class-validator';

export class CompleteOrderDto {
  @IsString()
  code!: string; // erwartet: "Order-<uuid>"
}
