import 'dotenv/config';

import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEFAULT_AI_PROMPT = `Você é um assistente especializado em qualificação de leads de seguro automotivo.
Analise as mensagens abaixo e retorne um JSON válido com a estrutura especificada.

Contexto do lead: phone={phone}
Mensagens (ordem cronológica):
{messages}

Retorne EXATAMENTE este JSON, sem texto adicional, sem markdown:
{
  "intent": "NEGOCIACAO" | "SUPORTE" | "SOCIAL",
  "sentiment": "POSITIVO" | "NEUTRO" | "NEGATIVO",
  "confidenceScore": 0.0-1.0,
  "extractedFields": {
    "name": string | null,
    "plate": string | null,
    "email": string | null
  },
  "summary": string,
  "missingFields": string[],
  "disqualifyReason": string | null
}`;

async function main() {
  console.log('[Seed] Iniciando seed de desenvolvimento...');

  await prisma.funnelEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.aiAnalysis.deleteMany();
  await prisma.message.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.whatsappConnection.deleteMany();
  await prisma.appSettings.deleteMany();

  const defaultInstance =
    process.env.BAILEYS_DEFAULT_INSTANCE?.trim() || 'leadwatch';

  await prisma.appSettings.create({
    data: {
      id: 'default',
      name: 'Demo Seguradora',
      slug: 'demo-seguradora',
      aiPrompt: DEFAULT_AI_PROMPT,
      promptVersion: 1,
      requiredFields: ['name', 'plate', 'email'],
      isActive: true,
    },
  });

  console.log('[Seed] AppSettings criado (id=default)');

  await prisma.whatsappConnection.create({
    data: {
      id: 'default',
      name: 'WhatsApp',
      instanceName: defaultInstance,
      status: 'DISCONNECTED',
    },
  });
  console.log('[Seed] WhatsappConnection singleton criado (id=default)');

  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@leadwatch.com',
      password: adminPassword,
      name: 'Administrador',
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`[Seed] Admin criado: ${admin.email}`);

  const agentPassword = await bcrypt.hash('Agent@123', 12);
  const agent = await prisma.user.create({
    data: {
      email: 'agente@leadwatch.com',
      password: agentPassword,
      name: 'Agente de Vendas',
      role: Role.AGENT,
      isActive: true,
    },
  });

  console.log(`[Seed] Agente criado: ${agent.email}`);

  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        chatId: '5511987650001@s.whatsapp.net',
        phone: '5511987650001',
        name: 'João Silva',
        plate: 'ABC1234',
        email: 'joao@email.com',
        status: 'QUALIFICADO',
        intent: 'NEGOCIACAO',
        sentiment: 'POSITIVO',
        confidenceScore: 0.92,
        priorityScore: 0.9,
        lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
    }),
    prisma.lead.create({
      data: {
        chatId: '5511987650002@s.whatsapp.net',
        phone: '5511987650002',
        name: 'Maria Oliveira',
        status: 'EM_QUALIFICACAO',
        intent: 'NEGOCIACAO',
        sentiment: 'NEUTRO',
        confidenceScore: 0.71,
        priorityScore: 0.5,
        needsHumanReview: false,
        missingFields: ['plate', 'email'],
        lastMessageAt: new Date(Date.now() - 30 * 60 * 1000),
      },
    }),
    prisma.lead.create({
      data: {
        chatId: '5511987650003@s.whatsapp.net',
        phone: '5511987650003',
        name: 'Carlos Pereira',
        status: 'NOVO',
        lastMessageAt: new Date(Date.now() - 5 * 60 * 1000),
      },
    }),
  ]);

  console.log(`[Seed] ${leads.length} leads de demonstração criados`);

  console.log('\n[Seed] ✅ Seed concluído com sucesso!');
  console.log('─────────────────────────────────────────');
  console.log('Admin:        admin@leadwatch.com / Admin@123');
  console.log('Agente:       agente@leadwatch.com / Agent@123');
  console.log('─────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('[Seed] Erro:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
