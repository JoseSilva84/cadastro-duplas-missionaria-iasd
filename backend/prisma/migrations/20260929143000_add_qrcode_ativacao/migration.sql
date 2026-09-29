CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "QrCodeAtivacao" (
  "id" SERIAL NOT NULL,
  "tipo" TEXT NOT NULL,
  "versao" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "QrCodeAtivacao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QrCodeAtivacao_tipo_key" ON "QrCodeAtivacao"("tipo");
