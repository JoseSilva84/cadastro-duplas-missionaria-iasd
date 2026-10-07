-- CreateTable
CREATE TABLE "CalendarioTema" (
    "id" SERIAL NOT NULL,
    "ano" INTEGER NOT NULL DEFAULT 2027,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "descricao" TEXT,
    "dataInicio" TIMESTAMP(3),
    "dataFim" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarioTema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarioAcaoMissionaria" (
    "id" SERIAL NOT NULL,
    "temaId" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "data" TIMESTAMP(3),
    "valor" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "responsavel" TEXT,
    "departamento" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANEJADA',
    "regiaoId" INTEGER,
    "distritoId" INTEGER,
    "igrejaId" INTEGER,
    "criadoPorId" INTEGER,
    "criadoPorPerfil" TEXT,
    "criadoPorNome" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarioAcaoMissionaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CalendarioTema_ano_idx" ON "CalendarioTema"("ano");

-- CreateIndex
CREATE INDEX "CalendarioAcaoMissionaria_temaId_idx" ON "CalendarioAcaoMissionaria"("temaId");

-- CreateIndex
CREATE INDEX "CalendarioAcaoMissionaria_regiaoId_distritoId_igrejaId_idx" ON "CalendarioAcaoMissionaria"("regiaoId", "distritoId", "igrejaId");

-- AddForeignKey
ALTER TABLE "CalendarioAcaoMissionaria" ADD CONSTRAINT "CalendarioAcaoMissionaria_temaId_fkey" FOREIGN KEY ("temaId") REFERENCES "CalendarioTema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioAcaoMissionaria" ADD CONSTRAINT "CalendarioAcaoMissionaria_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioAcaoMissionaria" ADD CONSTRAINT "CalendarioAcaoMissionaria_distritoId_fkey" FOREIGN KEY ("distritoId") REFERENCES "Distrito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioAcaoMissionaria" ADD CONSTRAINT "CalendarioAcaoMissionaria_igrejaId_fkey" FOREIGN KEY ("igrejaId") REFERENCES "Igreja"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarioAcaoMissionaria" ADD CONSTRAINT "CalendarioAcaoMissionaria_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MigrateData: temas (eventos distintos dos calendarios por igreja)
INSERT INTO "CalendarioTema" ("ano", "nome", "tipo", "dataInicio", "dataFim", "atualizadoEm")
SELECT DISTINCT ON (e."nome", e."dataInicio") c."ano", e."nome", e."tipo", e."dataInicio", e."dataFim", CURRENT_TIMESTAMP
FROM "CalendarioEvento" e
JOIN "CalendarioMissionario" c ON c."id" = e."calendarioId"
ORDER BY e."nome", e."dataInicio", e."id";

-- MigrateData: somente acoes com conteudo (as vazias eram so o modelo)
INSERT INTO "CalendarioAcaoMissionaria"
  ("temaId", "nome", "descricao", "data", "valor", "responsavel", "departamento", "status",
   "regiaoId", "distritoId", "igrejaId", "criadoPorPerfil", "criadoPorNome", "atualizadoEm")
SELECT t."id", a."nome", a."planejamento", a."data",
       COALESCE((SELECT SUM(o."quantidade" * o."valorUnit") FROM "CalendarioOrcamentoItem" o WHERE o."acaoId" = a."id"), 0),
       a."responsavel", a."departamento", a."status",
       d."regiaoId", i."distritoId", i."id", 'DIRETOR_MISSIONARIO_IGREJA', 'Calendario anterior', CURRENT_TIMESTAMP
FROM "CalendarioAcao" a
JOIN "CalendarioEvento" e ON e."id" = a."eventoId"
JOIN "CalendarioMissionario" c ON c."id" = e."calendarioId"
JOIN "Igreja" i ON i."id" = c."igrejaId"
JOIN "Distrito" d ON d."id" = i."distritoId"
JOIN "CalendarioTema" t ON t."nome" = e."nome" AND t."dataInicio" IS NOT DISTINCT FROM e."dataInicio"
WHERE COALESCE(TRIM(a."planejamento"), '') <> ''
   OR COALESCE(TRIM(a."responsavel"), '') <> ''
   OR EXISTS (SELECT 1 FROM "CalendarioOrcamentoItem" o WHERE o."acaoId" = a."id" AND o."quantidade" * o."valorUnit" > 0);
-- DropForeignKey
ALTER TABLE "CalendarioMissionario" DROP CONSTRAINT "CalendarioMissionario_igrejaId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarioEvento" DROP CONSTRAINT "CalendarioEvento_calendarioId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarioAcao" DROP CONSTRAINT "CalendarioAcao_eventoId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarioOrcamentoItem" DROP CONSTRAINT "CalendarioOrcamentoItem_acaoId_fkey";

-- DropTable
DROP TABLE "CalendarioMissionario";

-- DropTable
DROP TABLE "CalendarioEvento";

-- DropTable
DROP TABLE "CalendarioAcao";

-- DropTable
DROP TABLE "CalendarioOrcamentoItem";
