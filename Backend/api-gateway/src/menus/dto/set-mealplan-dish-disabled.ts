import { IsBoolean } from 'class-validator';

export class SetMenuItemDisabledDto {
  @IsBoolean()
  disabled!: boolean;
}
