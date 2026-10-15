CREATE TABLE "CacheIntegracao" (
    "chave" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CacheIntegracao_pkey" PRIMARY KEY ("chave")
);

CREATE INDEX "CacheIntegracao_atualizadoEm_idx" ON "CacheIntegracao"("atualizadoEm");
