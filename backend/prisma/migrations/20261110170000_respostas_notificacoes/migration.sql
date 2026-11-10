ALTER TABLE "Notificacao"
  ADD COLUMN "remetenteUsuarioId" INTEGER,
  ADD COLUMN "notificacaoOrigemId" INTEGER;

ALTER TABLE "Notificacao"
  ADD CONSTRAINT "Notificacao_remetenteUsuarioId_fkey"
  FOREIGN KEY ("remetenteUsuarioId") REFERENCES "Usuario"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notificacao"
  ADD CONSTRAINT "Notificacao_notificacaoOrigemId_fkey"
  FOREIGN KEY ("notificacaoOrigemId") REFERENCES "Notificacao"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Notificacao_remetenteUsuarioId_idx" ON "Notificacao"("remetenteUsuarioId");
CREATE INDEX "Notificacao_notificacaoOrigemId_idx" ON "Notificacao"("notificacaoOrigemId");

