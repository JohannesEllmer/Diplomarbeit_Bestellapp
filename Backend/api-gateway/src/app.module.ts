import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { OrdersModule } from './orders/orders.module';
import { MenusModule } from './menus/menus.module';

@Module({
  imports: [UsersModule, OrdersModule, MenusModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
