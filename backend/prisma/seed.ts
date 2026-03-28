import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.tenant.findFirst({ where: { slug: 'demo' } })
  if (existing) {
    console.log('Seed já executado. Pulando.')
    return
  }

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo',
      slug: 'demo',
      aiPrompt: `Você é um assistente especializado em qualificação de leads.
Analise as mensagens abaixo e retorne um JSON válido com a estrutura especificada.

Contexto do lead: phone={phone}
Mensagens (ordem cronológica):
{messages}

Retorne EXATAMENTE este JSON, sem texto adicional, sem markdown:
{
  "intent": "NEGOCIACAO" | "SUPORTE" | "SOCIAL",
  "sentiment": "POSITIVO" | "NEUTRO" | "NEGATIVO",
  "confidenceScore": 0.0,
  "extractedFields": { "name": null, "plate": null, "email": null },
  "mentionedCompany": false,
  "mentionedLicense": false,
  "summary": "string",
  "missingFields": [],
  "disqualifyReason": null
}`,
      promptVersion: 1,
      requiredFields: ['name', 'plate', 'email'],
    },
  })

  const hashedPassword = await bcrypt.hash('Admin@123', 12)

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@leadwatch.com',
      password: hashedPassword,
      role: 'ADMIN',
      name: 'Administrador',
    },
  })

  await prisma.whatsappInstance.create({
    data: {
      tenantId: tenant.id,
      instanceName: 'demo',
      status: 'DISCONNECTED',
    },
  })

  console.log(`✅ Seed concluído.`)
  console.log(`   Tenant: ${tenant.name} (slug: ${tenant.slug})`)
  console.log(`   Login: admin@leadwatch.com / Admin@123`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
