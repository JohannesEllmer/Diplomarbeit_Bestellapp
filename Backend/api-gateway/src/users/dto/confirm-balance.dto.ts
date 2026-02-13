import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ConfirmBalanceRequestDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^BalanceReq-[0-9a-fA-F-]{36}$/, { message: 'INVALID_QR_FORMAT' })
  code!: string;
}
