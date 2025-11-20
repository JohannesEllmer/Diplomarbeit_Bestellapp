import { IsString } from 'class-validator';

export class UserRefDto {
  @IsString()
  id: string;
}
