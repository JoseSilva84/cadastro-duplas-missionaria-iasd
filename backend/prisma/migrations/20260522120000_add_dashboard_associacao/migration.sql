-- CreateTable
CREATE TABLE "AtaDupla" (
    "id" SERIAL NOT NULL,
    "duplaId" INTEGER NOT NULL,
    "titulo" TEXT,
    "conteudo" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtaDupla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscolaSabatinaResumo" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "unidadesAcao" INTEGER NOT NULL DEFAULT 0,
    "classeProfessores" INTEGER NOT NULL DEFAULT 0,
    "classeInteressados" INTEGER NOT NULL DEFAULT 0,
    "visitasDiretores" INTEGER NOT NULL DEFAULT 0,
    "visitasProfessores" INTEGER NOT NULL DEFAULT 0,
    "visitasAlunos" INTEGER NOT NULL DEFAULT 0,
    "quantidadePequenosGrupos" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscolaSabatinaResumo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AtaDupla" ADD CONSTRAINT "AtaDupla_duplaId_fkey" FOREIGN KEY ("duplaId") REFERENCES "Dupla"("id") ON DELETE CASCADE ON UPDATE CASCADE;
