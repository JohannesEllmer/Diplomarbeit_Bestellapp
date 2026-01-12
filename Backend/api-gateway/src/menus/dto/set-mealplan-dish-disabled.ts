import { IsBoolean } from 'class-validator';

export class SetDishDisabledDto {
  @IsBoolean()
  disabled!: boolean; // true = deaktiviert, false = aktiv/available
}
