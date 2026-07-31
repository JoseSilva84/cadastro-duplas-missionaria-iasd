ALTER TABLE "EstudoBiblico" ADD COLUMN "encerrado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EstudoBiblico" ADD COLUMN "motivoEncerramento" TEXT;
ALTER TABLE "EstudoBiblico" ADD COLUMN "encerradoEm" TIMESTAMP(3);
