CREATE TABLE "ConfiguracaoPush" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "chavePublica" TEXT NOT NULL,
  "chavePrivada" TEXT NOT NULL,
  "assunto" TEXT NOT NULL,
  "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ConfiguracaoPush_pkey" PRIMARY KEY ("id")
);
