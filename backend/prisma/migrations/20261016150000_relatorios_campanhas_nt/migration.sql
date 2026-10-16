CREATE TABLE "SincronizacaoCampanhasNovoTempo" (
    "id" TEXT NOT NULL,
    "loteAtivo" TEXT,
    "atualizadoEm" TIMESTAMP(3),
    "proximaTentativaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueioAte" TIMESTAMP(3),
    "execucaoId" TEXT,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    CONSTRAINT "SincronizacaoCampanhasNovoTempo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampanhaNovoTempo" (
    "loteId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" TEXT,
    "dadosResumo" JSONB,
    CONSTRAINT "CampanhaNovoTempo_pkey" PRIMARY KEY ("loteId", "id")
);

CREATE INDEX "CampanhaNovoTempo_loteId_nome_idx" ON "CampanhaNovoTempo"("loteId", "nome");

CREATE TABLE "ConversaCampanhaNovoTempo" (
    "loteId" TEXT NOT NULL,
    "campanhaId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "distritoId" INTEGER NOT NULL,
    "regiaoId" INTEGER NOT NULL,
    "distrito" TEXT NOT NULL,
    "igreja" TEXT,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "situacao" TEXT NOT NULL,
    "aceitou" BOOLEAN NOT NULL DEFAULT false,
    "respondeu" BOOLEAN NOT NULL DEFAULT false,
    "endereco" TEXT,
    "atualizadoEm" TIMESTAMP(3),
    "dados" JSONB NOT NULL,
    CONSTRAINT "ConversaCampanhaNovoTempo_pkey" PRIMARY KEY ("loteId", "campanhaId", "id")
);

CREATE INDEX "ConversaCampanhaNovoTempo_loteId_campanhaId_regiaoId_distritoId_aceitou_nome_idx"
    ON "ConversaCampanhaNovoTempo"("loteId", "campanhaId", "regiaoId", "distritoId", "aceitou", "nome");
CREATE INDEX "ConversaCampanhaNovoTempo_loteId_campanhaId_distritoId_situacao_idx"
    ON "ConversaCampanhaNovoTempo"("loteId", "campanhaId", "distritoId", "situacao");
