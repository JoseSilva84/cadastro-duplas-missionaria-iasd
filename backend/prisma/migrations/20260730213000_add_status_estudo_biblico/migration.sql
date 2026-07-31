CREATE TYPE "StatusEstudoBiblico" AS ENUM ('EM_ANDAMENTO', 'ENCERRADO');

ALTER TABLE "EstudoBiblico" ADD COLUMN "statusEstudo" "StatusEstudoBiblico" NOT NULL DEFAULT 'EM_ANDAMENTO';
