ALTER TABLE "InscricaoPush"
  ADD COLUMN "nomeDispositivo" TEXT,
  ADD COLUMN "plataforma" TEXT,
  ADD COLUMN "navegador" TEXT,
  ADD COLUMN "userAgent" TEXT,
  ADD COLUMN "ativa" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ultimoStatus" INTEGER,
  ADD COLUMN "ultimoErro" TEXT,
  ADD COLUMN "ultimoSucessoEm" TIMESTAMP(3),
  ADD COLUMN "ultimaFalhaEm" TIMESTAMP(3);

CREATE INDEX "InscricaoPush_usuarioId_ativa_idx" ON "InscricaoPush"("usuarioId", "ativa");
