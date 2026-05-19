-- CreateTable
CREATE TABLE "EstudoBiblico" (
    "id" SERIAL NOT NULL,
    "nomeEstudante" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "diaEstudo" TEXT NOT NULL,
    "duplaId" INTEGER NOT NULL,
    "serie" TEXT NOT NULL,
    "licaoAtual" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstudoBiblico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evangelismo" (
    "id" SERIAL NOT NULL,
    "nomePessoa" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "diaEvangelismo" TEXT NOT NULL,
    "duplaId" INTEGER NOT NULL,
    "serie" TEXT NOT NULL,
    "estudoAtual" INTEGER NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evangelismo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EstudoBiblico" ADD CONSTRAINT "EstudoBiblico_duplaId_fkey" FOREIGN KEY ("duplaId") REFERENCES "Dupla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evangelismo" ADD CONSTRAINT "Evangelismo_duplaId_fkey" FOREIGN KEY ("duplaId") REFERENCES "Dupla"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
