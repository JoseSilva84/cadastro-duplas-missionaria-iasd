-- AlterTable
ALTER TABLE "Regiao" ADD COLUMN "chaveAcesso" TEXT;
ALTER TABLE "Regiao" ADD COLUMN "chaveAtiva" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Distrito" ADD COLUMN "chaveAcesso" TEXT;
ALTER TABLE "Distrito" ADD COLUMN "chaveAtiva" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE UNIQUE INDEX "Regiao_chaveAcesso_key" ON "Regiao"("chaveAcesso");

-- CreateIndex
CREATE UNIQUE INDEX "Distrito_chaveAcesso_key" ON "Distrito"("chaveAcesso");
