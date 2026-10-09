CREATE TABLE "CalendarioPermissao" (
    "id" SERIAL NOT NULL,
    "chave" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "regiaoId" INTEGER NOT NULL,
    "distritoId" INTEGER,
    "podeVisualizar" BOOLEAN NOT NULL DEFAULT true,
    "podeEditar" BOOLEAN NOT NULL DEFAULT false,
    "criadoPorId" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarioPermissao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarioPermissao_chave_key" ON "CalendarioPermissao"("chave");
CREATE INDEX "CalendarioPermissao_perfil_regiaoId_distritoId_idx" ON "CalendarioPermissao"("perfil", "regiaoId", "distritoId");
CREATE INDEX "CalendarioPermissao_regiaoId_idx" ON "CalendarioPermissao"("regiaoId");
CREATE INDEX "CalendarioPermissao_distritoId_idx" ON "CalendarioPermissao"("distritoId");

ALTER TABLE "CalendarioPermissao" ADD CONSTRAINT "CalendarioPermissao_regiaoId_fkey" FOREIGN KEY ("regiaoId") REFERENCES "Regiao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarioPermissao" ADD CONSTRAINT "CalendarioPermissao_distritoId_fkey" FOREIGN KEY ("distritoId") REFERENCES "Distrito"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarioPermissao" ADD CONSTRAINT "CalendarioPermissao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
