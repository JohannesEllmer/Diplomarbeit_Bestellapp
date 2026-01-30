import { Module } from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';
import { AppSettingsController } from './app-settings.controller';

@Module({
  providers: [AppSettingsService],
  controllers: [AppSettingsController],
  exports: [AppSettingsService],
})
export class AppSettingsModule {}
