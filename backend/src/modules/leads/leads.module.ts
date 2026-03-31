import { Module } from '@nestjs/common';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { AuditModule } from '../audit/audit.module';
import { PipelineModule } from '../pipeline/pipeline.module';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [AuditModule, PipelineModule, QueuesModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
