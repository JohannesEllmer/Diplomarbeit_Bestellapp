import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateClassDto {
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  // optional: nur wenn du Klassenformat erzwingen willst
  @Matches(/^[A-Za-z0-9ÄÖÜäöüß ._-]+$/, { message: 'class contains invalid characters' })
  class!: string;
}
