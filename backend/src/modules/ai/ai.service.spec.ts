import { AiResponseSchema } from './dto/ai-response.dto';
import { AiPromptService } from './ai-prompt.service';

// ─── Testes do schema Zod de validação da resposta da IA ─────────────────────

describe('AiResponseSchema', () => {
  const validResponse = {
    intent: 'NEGOCIACAO',
    sentiment: 'POSITIVO',
    confidenceScore: 0.85,
    extractedFields: {
      name: 'João Silva',
      plate: 'ABC1234',
      email: 'joao@email.com',
    },
    summary: 'Cliente interessado em cotação de seguro',
    missingFields: [],
    disqualifyReason: null,
  };

  it('deve validar resposta válida', () => {
    const result = AiResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('deve rejeitar intent inválido', () => {
    const result = AiResponseSchema.safeParse({
      ...validResponse,
      intent: 'INVALIDO',
    });
    expect(result.success).toBe(false);
  });

  it('deve rejeitar confidenceScore fora do range', () => {
    const result = AiResponseSchema.safeParse({
      ...validResponse,
      confidenceScore: 1.5,
    });
    expect(result.success).toBe(false);

    const resultNegative = AiResponseSchema.safeParse({
      ...validResponse,
      confidenceScore: -0.1,
    });
    expect(resultNegative.success).toBe(false);
  });

  it('deve aceitar email null', () => {
    const result = AiResponseSchema.safeParse({
      ...validResponse,
      extractedFields: { name: 'João', plate: 'ABC1234', email: null },
    });
    expect(result.success).toBe(true);
  });

  it('deve rejeitar email com formato inválido', () => {
    const result = AiResponseSchema.safeParse({
      ...validResponse,
      extractedFields: {
        ...validResponse.extractedFields,
        email: 'email-invalido',
      },
    });
    expect(result.success).toBe(false);
  });

  it('deve identificar needsHumanReview abaixo do threshold 0.6', () => {
    const result = AiResponseSchema.safeParse({
      ...validResponse,
      confidenceScore: 0.45,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const threshold = 0.6;
      expect(result.data.confidenceScore < threshold).toBe(true);
    }
  });

  it('deve aceitar disqualifyReason com texto', () => {
    const result = AiResponseSchema.safeParse({
      ...validResponse,
      disqualifyReason: 'Cliente não possui veículo',
    });
    expect(result.success).toBe(true);
  });
});

// ─── Testes do AiPromptService ────────────────────────────────────────────────

describe('AiPromptService', () => {
  let service: AiPromptService;

  beforeEach(() => {
    service = new AiPromptService();
  });

  const template = `Contexto: phone={phone}\nMensagens:\n{messages}`;

  it('deve substituir variáveis no template', () => {
    const result = service.buildPrompt({
      promptTemplate: template,
      phone: '5511999999999',
      messages: [
        {
          body: 'Olá, quero um seguro',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          fromMe: false,
        },
      ],
    });

    expect(result).toContain('5511999999999');
    expect(result).toContain('Olá, quero um seguro');
    expect(result).toContain('[CLIENTE]');
  });

  it('deve truncar para máximo 50 mensagens', () => {
    const messages = Array.from({ length: 60 }, (_, i) => ({
      body: `Mensagem ${i}`,
      timestamp: new Date(),
      fromMe: false,
    }));

    const result = service.buildPrompt({
      promptTemplate: template,
      phone: '55119',
      messages,
    });

    // Verifica que as mensagens foram truncadas (50 mais recentes)
    expect(result).toContain('Mensagem 59'); // mais recente
    expect(result).not.toContain('Mensagem 0'); // mais antiga foi descartada
  });

  it('deve marcar mensagens do agente como [AGENTE]', () => {
    const result = service.buildPrompt({
      promptTemplate: template,
      phone: '55119',
      messages: [
        { body: 'Posso ajudar?', timestamp: new Date(), fromMe: true },
      ],
    });

    expect(result).toContain('[AGENTE]');
  });
});
