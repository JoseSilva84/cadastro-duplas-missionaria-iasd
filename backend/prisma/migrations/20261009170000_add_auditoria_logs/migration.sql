CREATE TABLE "AuditoriaSessao" (
  "id" TEXT NOT NULL,
  "usuarioId" INTEGER,
  "usuarioNome" TEXT NOT NULL,
  "usuarioEmail" TEXT NOT NULL,
  "perfil" TEXT NOT NULL,
  "inicioEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "ultimaAtividadeEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fimEm" TIMESTAMP(3),
  "duracaoSegundos" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ATIVA',
  "ip" TEXT,
  "userAgent" TEXT,
  "navegador" TEXT,
  "sistemaOperacional" TEXT,
  "dispositivo" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuditoriaSessao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditoriaLog" (
  "id" TEXT NOT NULL,
  "sessaoId" TEXT,
  "usuarioId" INTEGER,
  "usuarioNome" TEXT,
  "usuarioEmail" TEXT,
  "perfil" TEXT,
  "categoria" TEXT NOT NULL,
  "acao" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "recurso" TEXT,
  "entidadeId" TEXT,
  "metodo" TEXT,
  "rota" TEXT,
  "statusHttp" INTEGER,
  "sucesso" BOOLEAN NOT NULL DEFAULT true,
  "duracaoMs" INTEGER,
  "ip" TEXT,
  "origem" TEXT NOT NULL DEFAULT 'BACKEND',
  "detalhes" JSONB,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditoriaLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditoriaSessao_usuarioId_inicioEm_idx" ON "AuditoriaSessao"("usuarioId", "inicioEm");
CREATE INDEX "AuditoriaSessao_status_ultimaAtividadeEm_idx" ON "AuditoriaSessao"("status", "ultimaAtividadeEm");
CREATE INDEX "AuditoriaSessao_inicioEm_idx" ON "AuditoriaSessao"("inicioEm");
CREATE INDEX "AuditoriaLog_criadoEm_idx" ON "AuditoriaLog"("criadoEm");
CREATE INDEX "AuditoriaLog_usuarioId_criadoEm_idx" ON "AuditoriaLog"("usuarioId", "criadoEm");
CREATE INDEX "AuditoriaLog_sessaoId_criadoEm_idx" ON "AuditoriaLog"("sessaoId", "criadoEm");
CREATE INDEX "AuditoriaLog_categoria_sucesso_criadoEm_idx" ON "AuditoriaLog"("categoria", "sucesso", "criadoEm");
CREATE INDEX "AuditoriaLog_recurso_criadoEm_idx" ON "AuditoriaLog"("recurso", "criadoEm");

ALTER TABLE "AuditoriaSessao"
ADD CONSTRAINT "AuditoriaSessao_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditoriaLog"
ADD CONSTRAINT "AuditoriaLog_sessaoId_fkey"
FOREIGN KEY ("sessaoId") REFERENCES "AuditoriaSessao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditoriaLog"
ADD CONSTRAINT "AuditoriaLog_usuarioId_fkey"
FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
