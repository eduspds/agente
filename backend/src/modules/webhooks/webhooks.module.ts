import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { MessagesModule } from '../messages/messages.module';
import { QueuesModule } from '../queues/queues.module';

@Module({
  imports: [MessagesModule, QueuesModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
