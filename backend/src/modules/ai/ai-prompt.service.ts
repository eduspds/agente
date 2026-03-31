import { Injectable, Logger } from '@nestjs/common';

const DEFAULT_MAX_MESSAGES = 50;
const DEFAULT_MAX_CHARS = 8000;

export interface BuildPromptInput {
  promptTemplate: string;
  phone: string;
  messages: Array<{
    body: string;
    timestamp: Date;
    fromMe: boolean;
  }>;
  maxMessages?: number;
  maxChars?: number;
}

@Injectable()
export class AiPromptService {
  private readonly logger = new Logger(AiPromptService.name);

  buildPrompt(input: BuildPromptInput): string {
    const { promptTemplate, phone, messages } = input;
    const maxMessages = input.maxMessages ?? DEFAULT_MAX_MESSAGES;
    const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;

    const truncatedMessages = this.truncateMessages(messages, maxMessages, maxChars);

    const messagesText = truncatedMessages
      .map((m) => {
        const direction = m.fromMe ? '[AGENTE]' : '[CLIENTE]';
        const time = m.timestamp.toISOString();
        return `${time} ${direction}: ${m.body}`;
      })
      .join('\n');

    const prompt = promptTemplate
      .replace('{phone}', phone)
      .replace('{messages}', messagesText);

    if (truncatedMessages.length < messages.length) {
      this.logger.warn(
        `Prompt truncado: ${messages.length} → ${truncatedMessages.length} mensagens para phone=${phone}`,
      );
    }

    return prompt;
  }

  private truncateMessages(
    messages: Array<{ body: string; timestamp: Date; fromMe: boolean }>,
    maxMessages: number,
    maxChars: number,
  ): Array<{ body: string; timestamp: Date; fromMe: boolean }> {
    const recent = messages.slice(-maxMessages);

    // Se ainda ultrapassar o limite de chars, trunca ainda mais
    let totalChars = 0;
    const result: typeof recent = [];

    for (const msg of recent) {
      totalChars += msg.body.length + 50; // ~50 chars de overhead por linha
      if (totalChars > maxChars && result.length > 0) break;
      result.push(msg);
    }

    return result;
  }
}
