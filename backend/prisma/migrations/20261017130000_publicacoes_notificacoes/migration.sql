CREATE TABLE "PublicacaoNotificacao" (
    "id" SERIAL NOT NULL,
    "autorId" INTEGER,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "url" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'COMUNICADO',
    "escopo" TEXT NOT NULL,
    "regiaoId" INTEGER,
    "distritoId" INTEGER,
    "agendadaPara" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AGENDADA',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "proximaTentativaEm" TIMESTAMP(3),
    "bloqueioAte" TIMESTAMP(3),
    "publicadaEm" TIMESTAMP(3),
    "quantidadeDestinatarios" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadaEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublicacaoNotificacao_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Notificacao" ADD COLUMN "publicacaoId" INTEGER;

CREATE UNIQUE INDEX "Notificacao_publicacaoId_usuarioId_key" ON "Notificacao"("publicacaoId", "usuarioId");
CREATE INDEX "PublicacaoNotificacao_status_agendadaPara_idx" ON "PublicacaoNotificacao"("status", "agendadaPara");
CREATE INDEX "PublicacaoNotificacao_autorId_criadaEm_idx" ON "PublicacaoNotificacao"("autorId", "criadaEm" DESC);

ALTER TABLE "PublicacaoNotificacao" ADD CONSTRAINT "PublicacaoNotificacao_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notificacao" ADD CONSTRAINT "Notificacao_publicacaoId_fkey" FOREIGN KEY ("publicacaoId") REFERENCES "PublicacaoNotificacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;
