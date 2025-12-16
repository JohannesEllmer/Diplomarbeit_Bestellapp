import { IsUUID } from 'class-validator';
export class IdParamDto { @IsUUID() id!: string; }

import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
export class PaginationDto {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize: number = 20;
}
