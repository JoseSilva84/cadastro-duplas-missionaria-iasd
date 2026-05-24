CREATE TABLE "EscolaSabatinaCadastro" (
    "id" SERIAL NOT NULL,
    "distritoId" INTEGER NOT NULL,
    "igrejaId" INTEGER NOT NULL,
    "unidadesAcao" INTEGER NOT NULL DEFAULT 0,
    "classeProfessores" INTEGER NOT NULL DEFAULT 0,
    "classeInteressados" INTEGER NOT NULL DEFAULT 0,
    "visitasDiretores" INTEGER NOT NULL DEFAULT 0,
    "visitasProfessores" INTEGER NOT NULL DEFAULT 0,
    "visitasAlunos" INTEGER NOT NULL DEFAULT 0,
    "quantidadePequenosGrupos" INTEGER NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "criadoPorId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscolaSabatinaCadastro_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EscolaSabatinaDupla" (
    "id" SERIAL NOT NULL,
    "escolaSabatinaCadastroId" INTEGER NOT NULL,
    "duplaId" INTEGER NOT NULL,

    CONSTRAINT "EscolaSabatinaDupla_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EscolaSabatinaDupla_escolaSabatinaCadastroId_duplaId_key" ON "EscolaSabatinaDupla"("escolaSabatinaCadastroId", "duplaId");

ALTER TABLE "EscolaSabatinaCadastro" ADD CONSTRAINT "EscolaSabatinaCadastro_distritoId_fkey" FOREIGN KEY ("distritoId") REFERENCES "Distrito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EscolaSabatinaCadastro" ADD CONSTRAINT "EscolaSabatinaCadastro_igrejaId_fkey" FOREIGN KEY ("igrejaId") REFERENCES "Igreja"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EscolaSabatinaCadastro" ADD CONSTRAINT "EscolaSabatinaCadastro_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EscolaSabatinaDupla" ADD CONSTRAINT "EscolaSabatinaDupla_escolaSabatinaCadastroId_fkey" FOREIGN KEY ("escolaSabatinaCadastroId") REFERENCES "EscolaSabatinaCadastro"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EscolaSabatinaDupla" ADD CONSTRAINT "EscolaSabatinaDupla_duplaId_fkey" FOREIGN KEY ("duplaId") REFERENCES "Dupla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
