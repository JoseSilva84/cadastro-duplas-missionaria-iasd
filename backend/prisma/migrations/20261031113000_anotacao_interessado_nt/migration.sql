CREATE TABLE "AnotacaoInteressadoNovoTempo" (
    "leadId" TEXT NOT NULL,
    "anotacao" TEXT NOT NULL,
    "atualizadoPorId" INTEGER,
    "atualizadoPorNome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnotacaoInteressadoNovoTempo_pkey" PRIMARY KEY ("leadId")
);
