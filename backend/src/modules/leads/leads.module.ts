import { Module, forwardRef } from '@nestjs/common'
import { LeadsController } from './leads.controller'
import { LeadsService } from './leads.service'
import { QueuesModule } from '../queues/queues.module'
import { MessagesModule } from '../messages/messages.module'

@Module({
  imports: [forwardRef(() => QueuesModule), MessagesModule],
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
