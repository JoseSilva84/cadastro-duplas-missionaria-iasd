ALTER TABLE "CalendarioPermissao"
ADD COLUMN "podeCriarTema" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeEditarTema" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeExcluirTema" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeCriarEvento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeEditarEvento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeExcluirEvento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeCriarAcao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeEditarAcao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeExcluirAcao" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeEditarPlanejamento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "podeEditarOrcamento" BOOLEAN NOT NULL DEFAULT false;

-- Preserva o comportamento das regras amplas criadas antes desta migration.
UPDATE "CalendarioPermissao"
SET
  "podeCriarEvento" = CASE
    WHEN "podeEditar" AND "perfil" IN ('PASTOR_REGIONAL', 'COORDENADOR_REGIONAL', 'PASTOR_DISTRITAL') THEN true
    ELSE false
  END,
  "podeEditarEvento" = CASE
    WHEN "podeEditar" AND "perfil" IN ('PASTOR_REGIONAL', 'COORDENADOR_REGIONAL', 'PASTOR_DISTRITAL') THEN true
    ELSE false
  END,
  "podeExcluirEvento" = CASE
    WHEN "podeEditar" AND "perfil" IN ('PASTOR_REGIONAL', 'COORDENADOR_REGIONAL', 'PASTOR_DISTRITAL') THEN true
    ELSE false
  END,
  "podeCriarAcao" = "podeEditar",
  "podeEditarAcao" = "podeEditar",
  "podeExcluirAcao" = "podeEditar",
  "podeEditarPlanejamento" = "podeEditar",
  "podeEditarOrcamento" = "podeEditar";
