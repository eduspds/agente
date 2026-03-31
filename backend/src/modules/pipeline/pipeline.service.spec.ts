import { Test, TestingModule } from '@nestjs/testing';
import { PipelineService } from './pipeline.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AiAnalyzeResult } from '../ai/dto/ai-response.dto';
import { LeadStatus } from '@prisma/client';
import {
  evaluateFunnelTransition,
  calculatePriorityScore,
} from './funnel.rules';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPrisma = {
  lead: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  aiAnalysis: {
    create: jest.fn(),
  },
  funnelEvent: {
    create: jest.fn(),
  },
};

const mockAuditService = {
  log: jest.fn(),
  logMany: jest.fn(),
};

const mockAiResult: AiAnalyzeResult = {
  intent: 'NEGOCIACAO',
  sentiment: 'POSITIVO',
  confidenceScore: 0.92,
  extractedFields: {
    name: 'João Silva',
    plate: 'ABC1234',
    email: 'joao@email.com',
  },
  summary: 'Cliente interessado em seguro para veículo ABC1234',
  missingFields: [],
  disqualifyReason: null,
  promptSent: 'Prompt de teste',
  rawResponse: '{"intent":"NEGOCIACAO",...}',
  cacheHit: false,
  tokensUsed: 150,
  latencyMs: 1200,
  messageIds: ['msg-1', 'msg-2'],
  promptVersion: 1,
  needsHumanReview: false,
};

// ─── Testes unitários das regras do funil ─────────────────────────────────────

describe('FunnelRules', () => {
  describe('evaluateFunnelTransition', () => {
    it('deve desqualificar leads SOCIAL', () => {
      const result = evaluateFunnelTransition({
        currentStatus: LeadStatus.NOVO,
        intent: 'SOCIAL',
        disqualifyReason: null,
        confidenceScore: 0.9,
        requiredFields: ['name', 'plate'],
        extractedFields: {},
        confidenceThreshold: 0.6,
      });

      expect(result.newStatus).toBe(LeadStatus.DESQUALIFICADO);
      expect(result.shouldContinue).toBe(false);
    });

    it('deve desqualificar leads SUPORTE', () => {
      const result = evaluateFunnelTransition({
        currentStatus: LeadStatus.EM_QUALIFICACAO,
        intent: 'SUPORTE',
        disqualifyReason: null,
        confidenceScore: 0.8,
        requiredFields: ['name'],
        extractedFields: {},
        confidenceThreshold: 0.6,
      });

      expect(result.newStatus).toBe(LeadStatus.DESQUALIFICADO);
      expect(result.shouldContinue).toBe(false);
    });

    it('deve manter EM_QUALIFICACAO quando confidence abaixo do threshold', () => {
      const result = evaluateFunnelTransition({
        currentStatus: LeadStatus.EM_QUALIFICACAO,
        intent: 'NEGOCIACAO',
        disqualifyReason: null,
        confidenceScore: 0.4,
        requiredFields: ['name', 'plate'],
        extractedFields: { name: 'João', plate: 'ABC1234' },
        confidenceThreshold: 0.6,
      });

      expect(result.newStatus).toBe(LeadStatus.EM_QUALIFICACAO);
      expect(result.shouldContinue).toBe(true);
    });

    it('deve qualificar lead com NEGOCIACAO e todos os campos', () => {
      const result = evaluateFunnelTransition({
        currentStatus: LeadStatus.EM_QUALIFICACAO,
        intent: 'NEGOCIACAO',
        disqualifyReason: null,
        confidenceScore: 0.85,
        requiredFields: ['name', 'plate'],
        extractedFields: { name: 'João', plate: 'ABC1234' },
        confidenceThreshold: 0.6,
      });

      expect(result.newStatus).toBe(LeadStatus.QUALIFICADO);
      expect(result.shouldContinue).toBe(true);
    });

    it('deve manter EM_QUALIFICACAO quando campos obrigatórios faltam', () => {
      const result = evaluateFunnelTransition({
        currentStatus: LeadStatus.EM_QUALIFICACAO,
        intent: 'NEGOCIACAO',
        disqualifyReason: null,
        confidenceScore: 0.9,
        requiredFields: ['name', 'plate', 'email'],
        extractedFields: { name: 'João', plate: 'ABC1234', email: null },
        confidenceThreshold: 0.6,
      });

      expect(result.newStatus).toBe(LeadStatus.EM_QUALIFICACAO);
    });

    it('deve desqualificar quando disqualifyReason está preenchido', () => {
      const result = evaluateFunnelTransition({
        currentStatus: LeadStatus.EM_QUALIFICACAO,
        intent: 'NEGOCIACAO',
        disqualifyReason: 'Cliente já possui seguro vigente',
        confidenceScore: 0.9,
        requiredFields: ['name'],
        extractedFields: { name: 'João' },
        confidenceThreshold: 0.6,
      });

      expect(result.newStatus).toBe(LeadStatus.DESQUALIFICADO);
      expect(result.reason).toBe('Cliente já possui seguro vigente');
    });
  });

  describe('calculatePriorityScore', () => {
    it('deve calcular score máximo para lead qualificado recente positivo', () => {
      const score = calculatePriorityScore({
        lastMessageAt: new Date(), // agora = recente
        status: LeadStatus.QUALIFICADO,
        extractedFields: { name: 'João', plate: 'ABC1234', email: 'j@j.com' },
        requiredFields: ['name', 'plate', 'email'],
        sentiment: 'POSITIVO',
      });

      // 40 (recente) + 30 (QUALIFICADO) + 20 (todos campos) + 10 (POSITIVO) = 100/100 = 1.0
      expect(score).toBe(1.0);
    });

    it('deve calcular score mínimo para lead desqualificado antigo', () => {
      const score = calculatePriorityScore({
        lastMessageAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 dias atrás
        status: LeadStatus.DESQUALIFICADO,
        extractedFields: {},
        requiredFields: ['name', 'plate'],
        sentiment: 'NEGATIVO',
      });

      expect(score).toBe(0);
    });
  });
});

// ─── Testes unitários do PipelineService ─────────────────────────────────────

describe('PipelineService', () => {
  let service: PipelineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PipelineService>(PipelineService);
    jest.clearAllMocks();
  });

  it('deve processar resultado da IA e qualificar lead', async () => {
    const mockLead = {
      id: 'lead-1',
      tenantId: 'tenant-1',
      status: LeadStatus.EM_QUALIFICACAO,
      name: null,
      plate: null,
      email: null,
      humanOverrideFields: [],
      lastMessageAt: new Date(),
      tenant: {
        requiredFields: ['name', 'plate', 'email'],
        aiPrompt: 'teste',
        promptVersion: 1,
      },
    };

    mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
    mockPrisma.aiAnalysis.create.mockResolvedValue({ id: 'analysis-1' });
    mockPrisma.lead.update.mockResolvedValue({
      ...mockLead,
      status: LeadStatus.QUALIFICADO,
    });
    mockPrisma.funnelEvent.create.mockResolvedValue({ id: 'event-1' });
    mockAuditService.log.mockResolvedValue(undefined);
    mockAuditService.logMany.mockResolvedValue(undefined);

    await service.applyAiResult(
      'tenant-1',
      'lead-1',
      mockAiResult,
      ['msg-1'],
    );

    expect(mockPrisma.funnelEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fromStatus: LeadStatus.EM_QUALIFICACAO,
          toStatus: LeadStatus.QUALIFICADO,
          triggeredBy: 'AI',
        }),
      }),
    );
  });

  it('não deve sobrescrever campos com humanOverride', async () => {
    const mockLead = {
      id: 'lead-1',
      tenantId: 'tenant-1',
      status: LeadStatus.EM_QUALIFICACAO,
      name: 'Nome Editado Manualmente',
      plate: null,
      email: null,
      humanOverrideFields: ['name'], // name protegido
      lastMessageAt: new Date(),
      tenant: {
        requiredFields: ['name'],
        aiPrompt: 'teste',
        promptVersion: 1,
      },
    };

    mockPrisma.lead.findFirst.mockResolvedValue(mockLead);
    mockPrisma.aiAnalysis.create.mockResolvedValue({ id: 'analysis-1' });
    mockPrisma.lead.update.mockResolvedValue(mockLead);
    mockPrisma.funnelEvent.create.mockResolvedValue({ id: 'event-1' });
    mockAuditService.log.mockResolvedValue(undefined);
    mockAuditService.logMany.mockResolvedValue(undefined);

    await service.applyAiResult(
      'tenant-1',
      'lead-1',
      mockAiResult,
      ['msg-1'],
    );

    const updateCall = mockPrisma.lead.update.mock.calls[0][0];
    // name não deve estar no updateData (está protegido por humanOverride)
    expect(updateCall.data.name).toBeUndefined();
  });
});
