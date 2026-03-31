import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { AiSettingsService } from './ai-settings.service';

@Module({
  controllers: [TenantsController],
  providers: [TenantsService, AiSettingsService],
  exports: [TenantsService, AiSettingsService],
})
export class TenantsModule {}
