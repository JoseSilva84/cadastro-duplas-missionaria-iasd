CREATE TABLE "InteressadoNovoTempo" (
    "loteId" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "distritoChave" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "prioridadeChave" TEXT NOT NULL,
    "temWhatsapp" BOOLEAN NOT NULL,
    "vipHistorico" BOOLEAN NOT NULL,
    "estudoAtivo" BOOLEAN NOT NULL,
    "dados" JSONB NOT NULL,
    CONSTRAINT "InteressadoNovoTempo_pkey" PRIMARY KEY ("loteId","id")
);

CREATE INDEX "InteressadoNovoTempo_loteId_distritoChave_nome_id_idx"
    ON "InteressadoNovoTempo"("loteId","distritoChave","nome","id");
CREATE INDEX "InteressadoNovoTempo_loteId_distritoChave_idx"
    ON "InteressadoNovoTempo"("loteId","distritoChave");

CREATE TABLE "SincronizacaoNovoTempo" (
    "id" TEXT NOT NULL,
    "loteAtivo" TEXT,
    "loteAnterior" TEXT,
    "atualizadoEm" TIMESTAMP(3),
    "proximaTentativaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaTentativaEm" TIMESTAMP(3),
    "bloqueioAte" TIMESTAMP(3),
    "execucaoId" TEXT,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "distritosOficiais" JSONB,
    "igrejas" JSONB,
    CONSTRAINT "SincronizacaoNovoTempo_pkey" PRIMARY KEY ("id")
);
