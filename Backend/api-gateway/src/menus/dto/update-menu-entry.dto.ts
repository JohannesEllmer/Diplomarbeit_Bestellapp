import { PartialType } from '@nestjs/mapped-types';
import { CreateMenuEntryDto } from './create-menu-entry.dto';

export class UpdateMenuEntryDto extends PartialType(CreateMenuEntryDto) {}
