import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { AiSettingsService } from './ai-settings.service';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, AiSettingsService],
  exports: [SettingsService, AiSettingsService],
})
export class SettingsModule {}
