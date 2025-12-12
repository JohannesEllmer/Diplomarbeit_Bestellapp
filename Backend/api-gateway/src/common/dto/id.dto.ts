// src/common/dto/id.dto.ts
import { IsUUID } from 'class-validator';
export class IdParamDto { @IsUUID() id!: string; }

// src/common/dto/pagination.dto.ts
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
export class PaginationDto {
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
    @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize: number = 20;
}
