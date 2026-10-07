CREATE TABLE "CalendarioMissionario" (
    "id" SERIAL NOT NULL,
    "igrejaId" INTEGER NOT NULL,
    "ano" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CalendarioMissionario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarioEvento" (
    "id" SERIAL NOT NULL,
    "calendarioId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CalendarioEvento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarioAcao" (
    "id" SERIAL NOT NULL,
    "eventoId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "departamento" TEXT,
    "responsavel" TEXT,
    "data" TIMESTAMP(3),
    "planejamento" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANEJADA',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CalendarioAcao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarioOrcamentoItem" (
    "id" SERIAL NOT NULL,
    "acaoId" INTEGER NOT NULL,
    "descricao" TEXT NOT NULL,
    "quantidade" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "valorUnit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    CONSTRAINT "CalendarioOrcamentoItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarioMissionario_igrejaId_ano_key" ON "CalendarioMissionario"("igrejaId", "ano");

ALTER TABLE "CalendarioMissionario" ADD CONSTRAINT "CalendarioMissionario_igrejaId_fkey" FOREIGN KEY ("igrejaId") REFERENCES "Igreja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarioEvento" ADD CONSTRAINT "CalendarioEvento_calendarioId_fkey" FOREIGN KEY ("calendarioId") REFERENCES "CalendarioMissionario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarioAcao" ADD CONSTRAINT "CalendarioAcao_eventoId_fkey" FOREIGN KEY ("eventoId") REFERENCES "CalendarioEvento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarioOrcamentoItem" ADD CONSTRAINT "CalendarioOrcamentoItem_acaoId_fkey" FOREIGN KEY ("acaoId") REFERENCES "CalendarioAcao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
