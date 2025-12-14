import { Module } from '@nestjs/common';
import 'dotenv/config';
import { DatabaseModule } from './db';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { MenusModule } from './menus/menus.module';
import { DbTokenService } from './auth-express/src/tokenHelper';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    OrdersModule,
    MenusModule,
  ],
  providers: [DbTokenService],
})
export class AppModule {}
