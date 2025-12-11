import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsString, IsArray } from 'class-validator';

export class CreateMenuDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsString()
    description: string;

    @ApiProperty()
    @IsNumber()
    price: number;

    @ApiProperty()
    @IsString()
    category: string;

    @ApiProperty()
    @IsBoolean()
    available: boolean;

    @ApiProperty()
    @IsBoolean()
    vegetarian: boolean;

    @ApiProperty()
    @IsArray()
    @IsString({ each: true })
    allergens: string[];
}
