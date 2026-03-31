import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Message } from '@prisma/client';

export interface CreateMessageData {
  tenantId: string;
  leadId: string;
  messageId: string;
  chatId: string;
  fromMe: boolean;
  body: string;
  timestamp: Date;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createIfNotExists(
    data: CreateMessageData,
  ): Promise<{ message: Message; isDuplicate: boolean }> {
    // Idempotência: retorna silenciosamente se messageId já existe
    const existing = await this.prisma.message.findUnique({
      where: { messageId: data.messageId },
    });

    if (existing) {
      this.logger.debug(
        `Mensagem duplicada ignorada: ${data.messageId}`,
      );
      return { message: existing, isDuplicate: true };
    }

    const message = await this.prisma.message.create({ data });
    return { message, isDuplicate: false };
  }

  async findUnprocessedByChat(
    tenantId: string,
    chatId: string,
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: {
        tenantId,
        chatId,
        processed: false,
      },
      orderBy: { timestamp: 'asc' },
    });
  }

  async markAsProcessed(
    tenantId: string,
    messageIds: string[],
  ): Promise<void> {
    await this.prisma.message.updateMany({
      where: {
        tenantId,
        id: { in: messageIds },
      },
      data: { processed: true },
    });
  }
}
