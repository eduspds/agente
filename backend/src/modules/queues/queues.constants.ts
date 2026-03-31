export const QUEUE_MESSAGE_PROCESSING = 'message-processing';
export const QUEUE_MESSAGE_PROCESSING_FAILED = 'message-processing-failed';

export const JOB_PROCESS_MESSAGES = 'process-messages';

export interface ProcessMessagesJobData {
  chatId: string;
  leadId: string;
  triggeredAt: string;
}
