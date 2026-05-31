ALTER TYPE "Perfil" ADD VALUE IF NOT EXISTS 'DIRETOR_MISSIONARIO_IGREJA';

ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "igrejaId" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Usuario_igrejaId_fkey'
  ) THEN
    ALTER TABLE "Usuario"
    ADD CONSTRAINT "Usuario_igrejaId_fkey"
    FOREIGN KEY ("igrejaId") REFERENCES "Igreja"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
