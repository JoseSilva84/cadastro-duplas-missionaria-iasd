CREATE TABLE "MapaIgreja" (
    "id" SERIAL NOT NULL,
    "igrejaId" INTEGER NOT NULL,
    "pastorNome" TEXT,
    "diretorMissionarioNome" TEXT,
    "primeiroAnciaoNome" TEXT,
    "anoOrganizacao" INTEGER,
    "quantidadePequenosGrupos" INTEGER NOT NULL DEFAULT 0,
    "semanaSanta" INTEGER NOT NULL DEFAULT 0,
    "classeBiblica" INTEGER NOT NULL DEFAULT 0,
    "aventureiros" INTEGER NOT NULL DEFAULT 0,
    "desbravadores" INTEGER NOT NULL DEFAULT 0,
    "acoesMissionarias" JSONB,
    "dataEvangelismoColheita" TIMESTAMP(3),
    "criadoPorId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapaIgreja_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MapaIgreja_igrejaId_key" ON "MapaIgreja"("igrejaId");

ALTER TABLE "MapaIgreja" ADD CONSTRAINT "MapaIgreja_igrejaId_fkey" FOREIGN KEY ("igrejaId") REFERENCES "Igreja"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MapaIgreja" ADD CONSTRAINT "MapaIgreja_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
