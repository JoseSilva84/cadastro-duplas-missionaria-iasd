-- Publicações antigas já guardam o autor na tabela de publicação.
UPDATE "Notificacao" AS notificacao
SET "remetenteUsuarioId" = publicacao."autorId"
FROM "PublicacaoNotificacao" AS publicacao
WHERE notificacao."publicacaoId" = publicacao.id
  AND notificacao."remetenteUsuarioId" IS NULL
  AND publicacao."autorId" IS NOT NULL;

-- As notificações de atividade antigas terminam com "Registrado por <nome>".
-- O vínculo só é preenchido quando o nome identifica uma única conta, evitando
-- enviar respostas à pessoa errada em caso de homônimos.
WITH "nomesUnicos" AS (
  SELECT MIN(id) AS id, nome
  FROM "Usuario"
  GROUP BY nome
  HAVING COUNT(*) = 1
)
UPDATE "Notificacao" AS notificacao
SET "remetenteUsuarioId" = usuario.id
FROM "nomesUnicos" AS usuario
WHERE notificacao."remetenteUsuarioId" IS NULL
  AND notificacao.tipo = 'ATIVIDADE'
  AND RIGHT(notificacao.mensagem, LENGTH('Registrado por ' || usuario.nome)) = 'Registrado por ' || usuario.nome;

