-- Uma única sessão WhatsApp global (id = 'default')
DELETE FROM "WhatsappConnection";

ALTER TABLE "WhatsappConnection" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "WhatsappConnection" ALTER COLUMN "id" SET DEFAULT 'default';
