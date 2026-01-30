import { Body, Controller, Get, Patch } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';

@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly svc: AppSettingsService) {}

  @Get('ordering')
  async getOrdering() {
    const orderingEnabled = await this.svc.getOrderingEnabled();
    return { orderingEnabled };
  }

  @Patch('ordering')
  async setOrdering(@Body() body: { orderingEnabled: boolean }) {
    const enabled = !!body?.orderingEnabled;
    return this.svc.setOrderingEnabled(enabled);
  }
}
