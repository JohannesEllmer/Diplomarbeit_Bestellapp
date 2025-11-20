import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private users: User[] = [];

  create(createUserDto: CreateUserDto): User {
    const newUser = { id: Date.now().toString(), ...createUserDto };
    this.users.push(newUser);
    return newUser;
  }

  findAll(): User[] {
    return this.users;
  }

  findOne(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  remove(id: string): { deleted: boolean } {
    this.users = this.users.filter(u => u.id !== id);
    return { deleted: true };
  }

  update(id: string, updateUserDto: UpdateUserDto) {
    const user = this.users.find(u => u.id === id);
    if (!user) return undefined;
    Object.assign(user, updateUserDto);
    return user;
  }
}
