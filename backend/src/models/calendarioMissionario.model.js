const prisma = require('../lib/prisma');

const includeAcao = {
  regiao: { select: { nome: true } },
  distrito: { select: { nome: true } },
  igreja: { select: { nome: true } },
  evento: { select: { id: true, nome: true } },
};

const permissaoComLocal = async (id) => {
  const [registro] = await prisma.$queryRaw`
    SELECT
      cp."id", cp."chave", cp."perfil"::text AS "perfil",
      cp."regiaoId", cp."distritoId", cp."podeVisualizar", cp."podeEditar",
      cp."podeCriarTema", cp."podeEditarTema", cp."podeExcluirTema",
      cp."podeCriarEvento", cp."podeEditarEvento", cp."podeExcluirEvento",
      cp."podeCriarAcao", cp."podeEditarAcao", cp."podeExcluirAcao",
      cp."podeEditarPlanejamento", cp."podeEditarOrcamento",
      cp."criadoPorId", cp."criadoEm", cp."atualizadoEm",
      json_build_object('id', r."id", 'nome', r."nome") AS "regiao",
      CASE
        WHEN d."id" IS NULL THEN NULL
        ELSE json_build_object('id', d."id", 'nome', d."nome")
      END AS "distrito"
    FROM "CalendarioPermissao" cp
    INNER JOIN "Regiao" r ON r."id" = cp."regiaoId"
    LEFT JOIN "Distrito" d ON d."id" = cp."distritoId"
    WHERE cp."id" = ${Number(id)}
    LIMIT 1
  `;
  return registro || null;
};

const CalendarioMissionarioModel = {
  listarTemas(ano, whereAcoes) {
    return prisma.calendarioTema.findMany({
      where: { ano },
      orderBy: [{ dataInicio: 'asc' }, { id: 'asc' }],
      include: {
        eventos: {
          orderBy: [{ data: 'asc' }, { id: 'asc' }],
          include: {
            acoes: {
              where: whereAcoes,
              orderBy: [{ data: 'asc' }, { id: 'asc' }],
              include: includeAcao,
            },
          },
        },
        acoes: {
          where: whereAcoes,
          orderBy: [{ data: 'asc' }, { id: 'asc' }],
          include: includeAcao,
        },
      },
    });
  },

  buscarTema(id) {
    return prisma.calendarioTema.findUnique({
      where: { id: Number(id) },
      include: {
        eventos: {
          orderBy: [{ data: 'asc' }, { id: 'asc' }],
          include: { acoes: { include: includeAcao } },
        },
        acoes: { include: includeAcao },
      },
    });
  },

  contarTemas(ano) {
    return prisma.calendarioTema.count({ where: { ano } });
  },

  criarTema(data) {
    return prisma.calendarioTema.create({ data });
  },

  atualizarTema(id, data) {
    return prisma.calendarioTema.update({ where: { id: Number(id) }, data });
  },

  excluirTema(id) {
    return prisma.calendarioTema.delete({ where: { id: Number(id) } });
  },

  // Eventos de um tema (marcos preparatórios como Ações ASA, Feira de Saúde, etc.)
  buscarEvento(id) {
    return prisma.calendarioEvento.findUnique({
      where: { id: Number(id) },
      include: {
        tema: true,
        acoes: { include: includeAcao, orderBy: [{ data: 'asc' }, { id: 'asc' }] },
      },
    });
  },

  criarEvento(data) {
    return prisma.calendarioEvento.create({ data, include: { tema: true } });
  },

  atualizarEvento(id, data) {
    return prisma.calendarioEvento.update({ where: { id: Number(id) }, data, include: { tema: true } });
  },

  excluirEvento(id) {
    return prisma.calendarioEvento.delete({ where: { id: Number(id) } });
  },

  // Ações Missionárias
  buscarAcao(id) {
    return prisma.calendarioAcaoMissionaria.findUnique({ where: { id: Number(id) }, include: includeAcao });
  },

  criarAcao(data) {
    return prisma.calendarioAcaoMissionaria.create({ data, include: includeAcao });
  },

  atualizarAcao(id, data) {
    return prisma.calendarioAcaoMissionaria.update({ where: { id: Number(id) }, data, include: includeAcao });
  },

  excluirAcao(id) {
    return prisma.calendarioAcaoMissionaria.delete({ where: { id: Number(id) } });
  },

  buscarIgreja(id) {
    return prisma.igreja.findUnique({
      where: { id: Number(id) },
      select: { id: true, distritoId: true, distrito: { select: { regiaoId: true } } },
    });
  },

  buscarDistrito(id) {
    return prisma.distrito.findUnique({ where: { id: Number(id) }, select: { id: true, regiaoId: true } });
  },

  buscarRegiao(id) {
    return prisma.regiao.findUnique({ where: { id: Number(id) }, select: { id: true, nome: true } });
  },

  listarPermissoes() {
    // A consulta direta continua funcionando mesmo quando o container ainda
    // esta com uma versao anterior do Prisma Client em cache.
    return prisma.$queryRaw`
      SELECT
        cp."id", cp."chave", cp."perfil"::text AS "perfil",
        cp."regiaoId", cp."distritoId", cp."podeVisualizar", cp."podeEditar",
        cp."podeCriarTema", cp."podeEditarTema", cp."podeExcluirTema",
        cp."podeCriarEvento", cp."podeEditarEvento", cp."podeExcluirEvento",
        cp."podeCriarAcao", cp."podeEditarAcao", cp."podeExcluirAcao",
        cp."podeEditarPlanejamento", cp."podeEditarOrcamento",
        cp."criadoPorId", cp."criadoEm", cp."atualizadoEm",
        json_build_object('id', r."id", 'nome', r."nome") AS "regiao",
        CASE
          WHEN d."id" IS NULL THEN NULL
          ELSE json_build_object('id', d."id", 'nome', d."nome")
        END AS "distrito"
      FROM "CalendarioPermissao" cp
      INNER JOIN "Regiao" r ON r."id" = cp."regiaoId"
      LEFT JOIN "Distrito" d ON d."id" = cp."distritoId"
      ORDER BY r."nome" ASC, d."nome" ASC NULLS FIRST, cp."perfil" ASC
    `;
  },

  buscarPermissaoPorChave(chave) {
    return prisma.$queryRaw`
      SELECT
        "id", "chave", "perfil"::text AS "perfil", "regiaoId", "distritoId",
        "podeVisualizar", "podeEditar",
        "podeCriarTema", "podeEditarTema", "podeExcluirTema",
        "podeCriarEvento", "podeEditarEvento", "podeExcluirEvento",
        "podeCriarAcao", "podeEditarAcao", "podeExcluirAcao",
        "podeEditarPlanejamento", "podeEditarOrcamento",
        "criadoPorId", "criadoEm", "atualizadoEm"
      FROM "CalendarioPermissao"
      WHERE "chave" = ${chave}
      LIMIT 1
    `.then((registros) => registros[0] || null);
  },

  async salvarPermissao(chave, data) {
    const [registro] = await prisma.$queryRaw`
      INSERT INTO "CalendarioPermissao" (
        "chave", "perfil", "regiaoId", "distritoId", "podeVisualizar",
        "podeEditar", "podeCriarTema", "podeEditarTema", "podeExcluirTema",
        "podeCriarEvento", "podeEditarEvento", "podeExcluirEvento",
        "podeCriarAcao", "podeEditarAcao", "podeExcluirAcao",
        "podeEditarPlanejamento", "podeEditarOrcamento",
        "criadoPorId", "criadoEm", "atualizadoEm"
      ) VALUES (
        ${chave}, CAST(${data.perfil} AS "Perfil"), ${data.regiaoId}, ${data.distritoId},
        ${data.podeVisualizar}, ${data.podeEditar},
        ${data.podeCriarTema}, ${data.podeEditarTema}, ${data.podeExcluirTema},
        ${data.podeCriarEvento}, ${data.podeEditarEvento}, ${data.podeExcluirEvento},
        ${data.podeCriarAcao}, ${data.podeEditarAcao}, ${data.podeExcluirAcao},
        ${data.podeEditarPlanejamento}, ${data.podeEditarOrcamento}, ${data.criadoPorId},
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("chave") DO UPDATE SET
        "perfil" = EXCLUDED."perfil",
        "regiaoId" = EXCLUDED."regiaoId",
        "distritoId" = EXCLUDED."distritoId",
        "podeVisualizar" = EXCLUDED."podeVisualizar",
        "podeEditar" = EXCLUDED."podeEditar",
        "podeCriarTema" = EXCLUDED."podeCriarTema",
        "podeEditarTema" = EXCLUDED."podeEditarTema",
        "podeExcluirTema" = EXCLUDED."podeExcluirTema",
        "podeCriarEvento" = EXCLUDED."podeCriarEvento",
        "podeEditarEvento" = EXCLUDED."podeEditarEvento",
        "podeExcluirEvento" = EXCLUDED."podeExcluirEvento",
        "podeCriarAcao" = EXCLUDED."podeCriarAcao",
        "podeEditarAcao" = EXCLUDED."podeEditarAcao",
        "podeExcluirAcao" = EXCLUDED."podeExcluirAcao",
        "podeEditarPlanejamento" = EXCLUDED."podeEditarPlanejamento",
        "podeEditarOrcamento" = EXCLUDED."podeEditarOrcamento",
        "criadoPorId" = EXCLUDED."criadoPorId",
        "atualizadoEm" = CURRENT_TIMESTAMP
      RETURNING "id"
    `;
    return permissaoComLocal(registro.id);
  },

  excluirPermissao(id) {
    return prisma.$executeRaw`
      DELETE FROM "CalendarioPermissao"
      WHERE "id" = ${Number(id)}
    `;
  },
};

module.exports = CalendarioMissionarioModel;
