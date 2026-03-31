import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { AuditModule } from '../audit/audit.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [AuditModule, DashboardModule],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
