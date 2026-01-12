import { Module } from '@nestjs/common';
import 'dotenv/config';
import { DatabaseModule } from './db';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { MenusModule } from './menus/menus.module';
import { DbTokenService } from './auth-express/src/tokenHelper';
import { NotificationsModule } from './notifications/notifcation.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    OrdersModule,
    MenusModule,
    ScheduleModule.forRoot(),
    NotificationsModule,
  ],
  providers: [DbTokenService],
})
export class AppModule {}
