-- Single-tenant: substitui Tenant por AppSettings e remove tenantId de todas as tabelas.

-- 1) Tabela de configuração global
CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "aiPrompt" TEXT NOT NULL,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "requiredFields" TEXT[],
    "aiSettings" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AppSettings_slug_key" ON "AppSettings"("slug");

-- 2) Migrar dados do primeiro Tenant (se existir)
INSERT INTO "AppSettings" ("id", "name", "slug", "aiPrompt", "promptVersion", "requiredFields", "aiSettings", "isActive", "createdAt", "updatedAt")
SELECT
    'default',
    t."name",
    t."slug",
    t."aiPrompt",
    t."promptVersion",
    t."requiredFields",
    t."aiSettings",
    t."isActive",
    t."createdAt",
    t."updatedAt"
FROM "Tenant" t
ORDER BY t."createdAt" ASC
LIMIT 1;

-- 3) Linha padrão se não havia tenant
INSERT INTO "AppSettings" ("id", "name", "slug", "aiPrompt", "promptVersion", "requiredFields", "aiSettings", "isActive", "createdAt", "updatedAt")
SELECT 'default', 'LeadWatch', 'default',
    'Você é um assistente que analisa conversas de WhatsApp e extrai dados estruturados.',
    1, ARRAY['name', 'plate', 'email']::TEXT[], '{}'::jsonb, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "AppSettings" WHERE "id" = 'default');

-- 4) WhatsappConnection: remover tenant
ALTER TABLE "WhatsappConnection" DROP CONSTRAINT IF EXISTS "WhatsappConnection_tenantId_fkey";
DROP INDEX IF EXISTS "WhatsappConnection_tenantId_instanceName_key";
DROP INDEX IF EXISTS "WhatsappConnection_tenantId_idx";
ALTER TABLE "WhatsappConnection" DROP COLUMN IF EXISTS "tenantId";
CREATE UNIQUE INDEX "WhatsappConnection_instanceName_key" ON "WhatsappConnection"("instanceName");

-- 5) User
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_tenantId_fkey";
DROP INDEX IF EXISTS "User_tenantId_idx";
DROP INDEX IF EXISTS "User_tenantId_email_key";
ALTER TABLE "User" DROP COLUMN IF EXISTS "tenantId";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- 6) Lead (depende de Message/AiAnalysis/AuditLog/FunnelEvent — ordem: filhos primeiro)

-- Message
ALTER TABLE "Message" DROP CONSTRAINT IF EXISTS "Message_tenantId_fkey";
DROP INDEX IF EXISTS "Message_tenantId_chatId_timestamp_idx";
DROP INDEX IF EXISTS "Message_tenantId_leadId_processed_idx";
ALTER TABLE "Message" DROP COLUMN IF EXISTS "tenantId";
CREATE INDEX "Message_chatId_timestamp_idx" ON "Message"("chatId", "timestamp");
CREATE INDEX "Message_leadId_processed_idx" ON "Message"("leadId", "processed");

-- AiAnalysis
ALTER TABLE "AiAnalysis" DROP CONSTRAINT IF EXISTS "AiAnalysis_tenantId_fkey";
DROP INDEX IF EXISTS "AiAnalysis_tenantId_leadId_idx";
DROP INDEX IF EXISTS "AiAnalysis_tenantId_createdAt_idx";
ALTER TABLE "AiAnalysis" DROP COLUMN IF EXISTS "tenantId";
CREATE INDEX "AiAnalysis_leadId_idx" ON "AiAnalysis"("leadId");
CREATE INDEX "AiAnalysis_createdAt_idx" ON "AiAnalysis"("createdAt");

-- AuditLog
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_tenantId_fkey";
DROP INDEX IF EXISTS "AuditLog_tenantId_leadId_idx";
DROP INDEX IF EXISTS "AuditLog_tenantId_createdAt_idx";
ALTER TABLE "AuditLog" DROP COLUMN IF EXISTS "tenantId";
CREATE INDEX "AuditLog_leadId_idx" ON "AuditLog"("leadId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- FunnelEvent
ALTER TABLE "FunnelEvent" DROP CONSTRAINT IF EXISTS "FunnelEvent_tenantId_fkey";
DROP INDEX IF EXISTS "FunnelEvent_tenantId_leadId_idx";
DROP INDEX IF EXISTS "FunnelEvent_tenantId_createdAt_idx";
ALTER TABLE "FunnelEvent" DROP COLUMN IF EXISTS "tenantId";
CREATE INDEX "FunnelEvent_leadId_idx" ON "FunnelEvent"("leadId");
CREATE INDEX "FunnelEvent_createdAt_idx" ON "FunnelEvent"("createdAt");

-- Lead
ALTER TABLE "Lead" DROP CONSTRAINT IF EXISTS "Lead_tenantId_fkey";
DROP INDEX IF EXISTS "Lead_tenantId_chatId_key";
DROP INDEX IF EXISTS "Lead_tenantId_status_idx";
DROP INDEX IF EXISTS "Lead_tenantId_lastMessageAt_idx";
DROP INDEX IF EXISTS "Lead_tenantId_priorityScore_idx";
ALTER TABLE "Lead" DROP COLUMN IF EXISTS "tenantId";
CREATE UNIQUE INDEX "Lead_chatId_key" ON "Lead"("chatId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "Lead_lastMessageAt_idx" ON "Lead"("lastMessageAt");
CREATE INDEX "Lead_priorityScore_idx" ON "Lead"("priorityScore");

-- 7) Remover Tenant
DROP TABLE IF EXISTS "Tenant";
