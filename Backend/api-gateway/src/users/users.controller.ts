// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth.guards';
import { CreateBalanceRequestDto } from './dto/create-balance.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me/header')
  getMyHeader(@Req() req: any) {
    return this.usersService.getMyHeader(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  getMyProfile(@Req() req: any) {
    const userId = String(req.user?.id ?? req.user?.sub);
    return this.usersService.getMyProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/activity')
  getMyActivity(@Req() req: any) {
    const userId = String(req.user?.id ?? req.user?.sub);
    return this.usersService.getMyActivity(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/class')
  updateMyClass(@Req() req: any, @Body() dto: UpdateClassDto) {
    const userId = String(req.user?.id ?? req.user?.sub);
    return this.usersService.updateMyClass(userId, dto.class);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/balance-requests/add')
  createAddBalanceRequest(@Req() req: any, @Body() dto: CreateBalanceRequestDto) {
    const userId = String(req.user?.id ?? req.user?.sub);
    const d = Number((dto as any)?.delta);
    return this.usersService.createBalanceAddRequest(userId, d);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/balance-requests/flush')
  createFlushBalanceRequest(@Req() req: any) {
    const userId = String(req.user?.id ?? req.user?.sub);
    return this.usersService.createBalanceFlushRequest(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  deleteMe(@Req() req: any) {
    const userId = String(req.user?.id ?? req.user?.sub);
    return this.usersService.deleteAccountIfAllowed(userId);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(String(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateUserDto>) {
    return this.usersService.update(String(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(String(id));
  }

  @Patch(':id/balance')
  updateBalance(@Param('id') id: string, @Body() body: { delta: number }) {
    return this.usersService.updateBalanceDelta(String(id), body.delta);
  }
}