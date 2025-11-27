import { Test, TestingModule } from '@nestjs/testing';
import { MyOrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('MyOrdersController', () => {
  let controller: MyOrdersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MyOrdersController],
      providers: [OrdersService],
    }).compile();

    controller = module.get<MyOrdersController>(MyOrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
