ALTER TABLE "PublicacaoNotificacao"
  ADD COLUMN "modoDestinatarios" TEXT NOT NULL DEFAULT 'TODOS',
  ADD COLUMN "perfisSelecionados" "Perfil"[] NOT NULL DEFAULT ARRAY[]::"Perfil"[],
  ADD COLUMN "usuarioIdsSelecionados" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
