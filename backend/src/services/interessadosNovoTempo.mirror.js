const { createHash, randomUUID } = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');

const ID_SINCRONIZACAO = 'principal';
const INTERVALO_MS = 5 * 60 * 1000;
const BLOQUEIO_MS = 5 * 60 * 1000;
const INTERVALO_MANUAL_MS = 60 * 1000;
const TAMANHO_LOTE = 200;

module.exports = function criarEspelhoNovoTempo({
  configuracao, possuiCredencial, requisitar, registrosInteressados,
  normalizarRegistro, extrairTerritorio, aplicarGeolocalizacaoAproximada,
  chaveNormalizada, db = prisma,
}) {
  let agendamentoEmCurso = null;
  let execucaoEmCurso = null;
  let temporizador = null;

  const chaveDoRegistro = (contato) => {
    const identidade = contato.id
      ? `id:${contato.id}`
      : `sem-id:${JSON.stringify(contato)}`;
    return createHash('sha256').update(identidade).digest('hex');
  };

  async function garantirEstado() {
    return db.sincronizacaoNovoTempo.upsert({
      where: { id: ID_SINCRONIZACAO },
      create: { id: ID_SINCRONIZACAO },
      update: {},
    });
  }

  async function estado() {
    const registro = await db.sincronizacaoNovoTempo.findUnique({ where: { id: ID_SINCRONIZACAO } });
    const sincronizando = registro?.status === 'SINCRONIZANDO'
      && Number(registro.bloqueioAte) > Date.now();
    return {
      loteId: registro?.loteAtivo || null,
      loteAnterior: registro?.loteAnterior || null,
      atualizadoEm: registro?.atualizadoEm?.toISOString() || null,
      sincronizando,
      semDados: !registro?.loteAtivo,
      erroSincronizacao: registro?.erro || (!possuiCredencial(configuracao())
        ? 'Integração com o Amigos Novo Tempo ainda não configurada.'
        : null),
      proximaTentativaEm: registro?.proximaTentativaEm?.toISOString() || null,
      distritosOficiais: registro?.distritosOficiais || [],
      igrejas: registro?.igrejas || [],
    };
  }

  async function executarSincronizacao(execucaoId, estadoAnterior, cfg) {
    const loteId = randomUUID();
    try {
      const dashboard = await requisitar('/api/dashboard', cfg);
      const registros = registrosInteressados(dashboard);
      if (!registros.length) throw new Error('O Amigos Novo Tempo retornou uma lista vazia de interessados.');

      const territorio = extrairTerritorio(dashboard);
      const contatos = [];
      for (let inicio = 0; inicio < registros.length; inicio += TAMANHO_LOTE) {
        contatos.push(...registros.slice(inicio, inicio + TAMANHO_LOTE).map(normalizarRegistro));
        // Evita bloquear as outras rotas enquanto um lote grande é normalizado.
        await new Promise((resolve) => setImmediate(resolve));
      }
      const geolocalizados = aplicarGeolocalizacaoAproximada(contatos, territorio.igrejas);
      const unicos = new Map();
      for (const contato of geolocalizados.contatos) {
        const id = chaveDoRegistro(contato);
        unicos.set(id, {
          loteId,
          id,
          distrito: contato.distrito,
          distritoChave: chaveNormalizada(contato.distrito),
          nome: contato.nome,
          prioridadeChave: chaveNormalizada(contato.prioridade),
          temWhatsapp: contato.temWhatsapp,
          vipHistorico: contato.vipHistorico,
          estudoAtivo: contato.estudoAtivo,
          dados: contato,
        });
      }

      const linhas = [...unicos.values()];
      for (let inicio = 0; inicio < linhas.length; inicio += TAMANHO_LOTE) {
        await db.interessadoNovoTempo.createMany({
          data: linhas.slice(inicio, inicio + TAMANHO_LOTE),
        });
        const bloqueio = await db.sincronizacaoNovoTempo.updateMany({
          where: { id: ID_SINCRONIZACAO, execucaoId },
          data: { bloqueioAte: new Date(Date.now() + BLOQUEIO_MS) },
        });
        if (!bloqueio.count) throw new Error('A sincronização perdeu o bloqueio de execução.');
      }

      const atualizadoEm = new Date();
      const publicacao = await db.sincronizacaoNovoTempo.updateMany({
        where: { id: ID_SINCRONIZACAO, execucaoId },
        data: {
          loteAtivo: loteId,
          loteAnterior: estadoAnterior.loteAtivo,
          atualizadoEm,
          proximaTentativaEm: new Date(Date.now() + Math.max(60 * 1000, Number(cfg.cacheTtl) || INTERVALO_MS)),
          bloqueioAte: null,
          execucaoId: null,
          falhas: 0,
          erro: null,
          status: 'PRONTO',
          distritosOficiais: territorio.distritosOficiais,
          igrejas: geolocalizados.igrejas,
        },
      });
      if (!publicacao.count) throw new Error('A sincronização perdeu o bloqueio antes da publicação.');

      // Conservar o lote anterior protege consultas que começaram antes da troca.
      await db.interessadoNovoTempo.deleteMany({
        where: { loteId: { notIn: [loteId, estadoAnterior.loteAtivo].filter(Boolean) } },
      }).catch((falha) => console.error('[Interessados NT] Falha ao limpar lotes antigos:', falha.message));
      console.info(`[Interessados NT] Sincronizados ${linhas.length} contatos.`);
    } catch (falha) {
      const falhas = Number(estadoAnterior.falhas || 0) + 1;
      const esperaMs = Math.min(60, 2 ** Math.min(falhas - 1, 6)) * 60 * 1000;
      await db.sincronizacaoNovoTempo.updateMany({
        where: { id: ID_SINCRONIZACAO, execucaoId },
        data: {
          bloqueioAte: null,
          execucaoId: null,
          status: 'ERRO',
          falhas,
          erro: 'A última sincronização com o Amigos Novo Tempo falhou. Os dados anteriores continuam disponíveis.',
          proximaTentativaEm: new Date(Date.now() + esperaMs),
        },
      }).catch((erroBanco) => console.error('[Interessados NT] Falha ao registrar erro:', erroBanco.message));
      await db.interessadoNovoTempo.deleteMany({ where: { loteId } })
        .catch((erroBanco) => console.error('[Interessados NT] Falha ao limpar lote incompleto:', erroBanco.message));
      console.error('[Interessados NT] Sincronização falhou:', falha.message);
    }
  }

  async function solicitar({ forcar = false } = {}) {
    if (agendamentoEmCurso) return agendamentoEmCurso;
    if (execucaoEmCurso || !possuiCredencial(configuracao())) return false;

    agendamentoEmCurso = (async () => {
      const cfg = configuracao();
      const anterior = await garantirEstado();
      const agora = new Date();
      const condicaoTentativa = forcar
        ? { OR: [{ ultimaTentativaEm: null }, { ultimaTentativaEm: { lte: new Date(Date.now() - INTERVALO_MANUAL_MS) } }] }
        : { proximaTentativaEm: { lte: agora } };
      const execucaoId = randomUUID();
      const bloqueio = await db.sincronizacaoNovoTempo.updateMany({
        where: {
          id: ID_SINCRONIZACAO,
          AND: [
            { OR: [{ bloqueioAte: null }, { bloqueioAte: { lte: agora } }] },
            condicaoTentativa,
          ],
        },
        data: {
          status: 'SINCRONIZANDO',
          erro: null,
          execucaoId,
          ultimaTentativaEm: agora,
          bloqueioAte: new Date(Date.now() + BLOQUEIO_MS),
        },
      });
      if (!bloqueio.count) return false;
      const estadoBloqueado = await db.sincronizacaoNovoTempo.findUnique({ where: { id: ID_SINCRONIZACAO } });
      execucaoEmCurso = executarSincronizacao(execucaoId, estadoBloqueado || anterior, cfg)
        .finally(() => { execucaoEmCurso = null; });
      return true;
    })().finally(() => { agendamentoEmCurso = null; });
    return agendamentoEmCurso;
  }

  function iniciar() {
    if (temporizador) return;
    solicitar().catch((falha) => console.error('[Interessados NT] Falha ao agendar sincronização:', falha.message));
    temporizador = setInterval(() => {
      solicitar().catch((falha) => console.error('[Interessados NT] Falha ao agendar sincronização:', falha.message));
    }, 60 * 1000);
    temporizador.unref?.();
  }

  function filtroDoEscopo(meta, escopo, distritoChave) {
    const where = { loteId: meta.loteId };
    const restricoes = [];
    if (!escopo.acessoTotal) restricoes.push({ distritoChave: { in: [...escopo.distritos] } });
    if (distritoChave !== null) restricoes.push({ distritoChave });
    if (restricoes.length) where.AND = restricoes;
    return where;
  }

  async function grupos(meta, escopo, distritoChave = null) {
    if (!meta.loteId) return [];
    const condicoes = [Prisma.sql`"loteId" = ${meta.loteId}`];
    if (!escopo.acessoTotal) condicoes.push(Prisma.sql`"distritoChave" IN (${Prisma.join([...escopo.distritos])})`);
    if (distritoChave !== null) condicoes.push(Prisma.sql`"distritoChave" = ${distritoChave}`);
    const linhas = await db.$queryRaw(Prisma.sql`
      SELECT MIN("distrito") AS nome, "distritoChave" AS chave,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE "temWhatsapp")::int AS "comWhatsapp",
        COUNT(*) FILTER (WHERE "vipHistorico")::int AS "vipsHistoricos",
        COUNT(*) FILTER (WHERE "estudoAtivo")::int AS "estudosAtivos",
        COUNT(*) FILTER (WHERE "prioridadeChave" = 'hot')::int AS quentes,
        COUNT(*) FILTER (WHERE "prioridadeChave" = 'warm')::int AS potenciais,
        COUNT(*) FILTER (WHERE "prioridadeChave" = 'cool')::int AS mornos,
        COUNT(*) FILTER (WHERE "prioridadeChave" = 'cold')::int AS frios
      FROM "InteressadoNovoTempo"
      WHERE ${Prisma.join(condicoes, ' AND ')}
      GROUP BY "distritoChave"
      ORDER BY nome
    `);
    return linhas.map(({ chave, ...linha }) => linha);
  }

  function totalizar(gruposDoEscopo) {
    const resumo = {
      totalInteressados: 0, comWhatsapp: 0, vipsHistoricos: 0,
      quentes: 0, potenciais: 0, mornos: 0, frios: 0, estudosAtivos: 0,
      totalDistritos: gruposDoEscopo.length,
    };
    for (const grupo of gruposDoEscopo) {
      resumo.totalInteressados += grupo.total;
      for (const campo of ['comWhatsapp', 'vipsHistoricos', 'quentes', 'potenciais', 'mornos', 'frios', 'estudosAtivos']) {
        resumo[campo] += grupo[campo];
      }
    }
    return resumo;
  }

  async function resumo(escopo) {
    const meta = await estado();
    const distritos = await grupos(meta, escopo);
    return {
      resumo: totalizar(distritos),
      distritos,
      atualizadoEm: meta.atualizadoEm,
      sincronizando: meta.sincronizando,
      semDados: meta.semDados,
      erroSincronizacao: meta.erroSincronizacao,
      origemCache: 'banco_local',
    };
  }

  async function porDistrito(nome, escopo, { pagina = 1, limite = 100, paginado = true, versao = null } = {}) {
    const meta = await estado();
    if (versao && ![meta.loteId, meta.loteAnterior].includes(versao)) return { versaoExpirada: true };
    if (versao) meta.loteId = versao;
    const chave = chaveNormalizada(nome);
    const [grupo] = await grupos(meta, escopo, chave);
    if (!grupo && meta.loteId) return null;
    const limiteNumero = Number(limite);
    const limiteValido = Number.isSafeInteger(limiteNumero) ? Math.min(100, Math.max(1, limiteNumero)) : 100;
    const paginaNumero = Number(pagina);
    const paginaValida = Number.isSafeInteger(paginaNumero)
      ? Math.min(Math.max(1, paginaNumero), Math.ceil((grupo?.total || 0) / limiteValido) + 1)
      : 1;
    const where = filtroDoEscopo(meta, escopo, chave);
    const linhas = meta.loteId ? await db.interessadoNovoTempo.findMany({
      where,
      orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      ...(paginado ? { skip: (paginaValida - 1) * limiteValido, take: limiteValido } : {}),
      select: { dados: true },
    }) : [];
    const total = grupo?.total || 0;
    return {
      distrito: grupo?.nome || nome,
      resumo: { ...totalizar(grupo ? [grupo] : []), totalDistritos: undefined },
      leads: linhas.map((linha) => linha.dados),
      total,
      pagina: paginado ? paginaValida : 1,
      limite: paginado ? limiteValido : total,
      paginas: paginado ? Math.ceil(total / limiteValido) : 1,
      temMais: paginado ? paginaValida * limiteValido < total : false,
      atualizadoEm: meta.atualizadoEm,
      sincronizando: meta.sincronizando,
      semDados: meta.semDados,
      erroSincronizacao: meta.erroSincronizacao,
      origemCache: 'banco_local',
      versao: meta.loteId,
    };
  }

  async function todos(escopo, distritoChave = null) {
    const meta = await estado();
    if (!meta.loteId) return { meta, contatos: [] };
    const where = filtroDoEscopo(meta, escopo, distritoChave);
    const contatos = [];
    let ultimoId = null;
    for (;;) {
      const lote = await db.interessadoNovoTempo.findMany({
        where,
        orderBy: { id: 'asc' },
        take: 500,
        ...(ultimoId ? { cursor: { loteId_id: { loteId: meta.loteId, id: ultimoId } }, skip: 1 } : {}),
        select: { id: true, dados: true },
      });
      contatos.push(...lote.map((linha) => linha.dados));
      if (lote.length < 500) break;
      ultimoId = lote[lote.length - 1].id;
    }
    return { meta, contatos };
  }

  async function buscarPorId(leadId, escopo) {
    const meta = await estado();
    if (!meta.loteId || !leadId) return null;
    if (!escopo.acessoTotal && !escopo.distritos?.size) return null;
    const condicoes = [Prisma.sql`"loteId" = ${meta.loteId}`, Prisma.sql`dados->>'id' = ${String(leadId)}`];
    if (!escopo.acessoTotal) condicoes.push(Prisma.sql`"distritoChave" IN (${Prisma.join([...escopo.distritos])})`);
    const linhas = await db.$queryRaw(Prisma.sql`
      SELECT dados FROM "InteressadoNovoTempo"
      WHERE ${Prisma.join(condicoes, ' AND ')}
      LIMIT 1
    `);
    return linhas[0]?.dados || null;
  }

  function condicoesSql(meta, escopo, extras = []) {
    const condicoes = [Prisma.sql`"loteId" = ${meta.loteId}`];
    if (!escopo.acessoTotal) condicoes.push(Prisma.sql`"distritoChave" IN (${Prisma.join([...escopo.distritos])})`);
    condicoes.push(...extras);
    return Prisma.join(condicoes, ' AND ');
  }

  async function dadosParaAnalise(escopo, distritoChave = null) {
    const meta = await estado();
    if (!meta.loteId) return { meta, contatos: [] };
    const extras = distritoChave === null ? [] : [Prisma.sql`"distritoChave" = ${distritoChave}`];
    const linhas = await db.$queryRaw(Prisma.sql`
      SELECT id, distrito,
        "prioridadeChave" AS prioridade,
        "temWhatsapp", "vipHistorico", "estudoAtivo",
        dados->>'nome' AS nome,
        dados->>'whatsapp' AS whatsapp,
        dados->>'email' AS email,
        dados->>'bairro' AS bairro,
        dados->>'material' AS material,
        dados->>'genero' AS genero,
        dados->>'idade' AS idade,
        dados->>'dataNascimento' AS "dataNascimento",
        dados->>'religiao' AS religiao,
        dados->>'canal' AS canal,
        dados->>'cidade' AS cidade,
        NULLIF(dados->>'telefoneValido', '')::boolean AS "telefoneValido",
        NULLIF(dados->>'emailValido', '')::boolean AS "emailValido",
        NULLIF(dados->>'temDescricao', '')::boolean AS "temDescricao",
        NULLIF(dados->>'tentativaContato', '')::boolean AS "tentativaContato",
        NULLIF(dados->>'respondeu', '')::boolean AS respondeu,
        NULLIF(dados->>'demonstrouInteresse', '')::boolean AS "demonstrouInteresse",
        NULLIF(dados->>'aceitouVisita', '')::boolean AS "aceitouVisita",
        NULLIF(dados->>'participou', '')::boolean AS participou,
        CASE WHEN COALESCE(dados->>'materiaisQuantidade', '') ~ '^[0-9]+$'
          THEN (dados->>'materiaisQuantidade')::int ELSE NULL END AS "materiaisQuantidade",
        dados->>'prioridadeRotulo' AS "prioridadeRotulo",
        CASE WHEN COALESCE(dados->>'pontuacao', '') ~ '^-?[0-9]+([.,][0-9]+)?$'
          THEN REPLACE(dados->>'pontuacao', ',', '.')::double precision ELSE NULL END AS pontuacao,
        CASE WHEN COALESCE(dados->>'diasSemContato', '') ~ '^-?[0-9]+$'
          THEN (dados->>'diasSemContato')::int ELSE NULL END AS "diasSemContato"
      FROM "InteressadoNovoTempo"
      WHERE ${condicoesSql(meta, escopo, extras)}
    `);
    return { meta, contatos: linhas };
  }

  async function analiseAgregada(escopo, filtros = {}) {
    const meta = await estado();
    if (!meta.loteId) return { meta, distritos: [], religioes: [], tempoSemContato: [], generos: [] };
    const extras = [];
    if (filtros.distrito && filtros.distrito !== 'todos') extras.push(Prisma.sql`"distritoChave" = ${chaveNormalizada(filtros.distrito)}`);
    if (filtros.prioridade && filtros.prioridade !== 'todos') extras.push(Prisma.sql`"prioridadeChave" = ${chaveNormalizada(filtros.prioridade)}`);
    if (['0', '1'].includes(filtros.vip)) extras.push(Prisma.sql`"vipHistorico" = ${filtros.vip === '1'}`);
    if (['0', '1'].includes(filtros.whatsapp)) extras.push(Prisma.sql`"temWhatsapp" = ${filtros.whatsapp === '1'}`);
    if (['0', '1'].includes(filtros.estudos)) extras.push(Prisma.sql`"estudoAtivo" = ${filtros.estudos === '1'}`);
    if (filtros.genero && filtros.genero !== 'todos') extras.push(Prisma.sql`LOWER(COALESCE(dados->>'genero', '')) = ${String(filtros.genero).toLocaleLowerCase('pt-BR')}`);
    const whereSql = condicoesSql(meta, escopo, extras);
    const whereBase = condicoesSql(meta, escopo);
    const [distritos, religioes, tempos, opcoes] = await Promise.all([
      db.$queryRaw(Prisma.sql`
        SELECT MIN(distrito) AS nome,
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE "temWhatsapp")::int AS "comWhatsapp",
          COUNT(*) FILTER (WHERE "prioridadeChave" = 'hot')::int AS quentes,
          COUNT(*) FILTER (WHERE "prioridadeChave" = 'warm')::int AS potenciais,
          COUNT(*) FILTER (WHERE "prioridadeChave" = 'cool')::int AS mornos,
          COUNT(*) FILTER (WHERE "prioridadeChave" = 'cold')::int AS frios,
          COUNT(*) FILTER (WHERE "vipHistorico")::int AS vips,
          COUNT(*) FILTER (WHERE "estudoAtivo")::int AS estudos,
          COUNT(*) FILTER (WHERE COALESCE(dados->>'diasSemContato', '') ~ '^[0-9]+$' AND (dados->>'diasSemContato')::int > 1825)::int AS "semContato5Anos",
          ROUND(AVG(CASE WHEN COALESCE(dados->>'pontuacao', '') ~ '^-?[0-9]+([.,][0-9]+)?$' THEN REPLACE(dados->>'pontuacao', ',', '.')::numeric END), 1)::double precision AS "pontuacaoMedia"
        FROM "InteressadoNovoTempo" WHERE ${whereSql}
        GROUP BY "distritoChave" ORDER BY total DESC, nome
      `),
      db.$queryRaw(Prisma.sql`
        SELECT COALESCE(NULLIF(dados->>'religiao', ''), 'Não informado') AS nome, COUNT(*)::int AS total
        FROM "InteressadoNovoTempo" WHERE ${whereSql}
        GROUP BY COALESCE(NULLIF(dados->>'religiao', ''), 'Não informado') ORDER BY total DESC, nome LIMIT 10
      `),
      db.$queryRaw(Prisma.sql`
        SELECT faixa AS nome, COUNT(*)::int AS total FROM (
          SELECT CASE
            WHEN COALESCE(dados->>'diasSemContato', '') !~ '^[0-9]+$' THEN 'Não informado'
            WHEN (dados->>'diasSemContato')::int <= 90 THEN 'Até 3 meses'
            WHEN (dados->>'diasSemContato')::int <= 365 THEN '3 meses a 1 ano'
            WHEN (dados->>'diasSemContato')::int <= 730 THEN '1 a 2 anos'
            WHEN (dados->>'diasSemContato')::int <= 1825 THEN '2 a 5 anos'
            ELSE '5+ anos' END AS faixa
          FROM "InteressadoNovoTempo" WHERE ${whereSql}
        ) faixas GROUP BY faixa ORDER BY total DESC, faixa
      `),
      db.$queryRaw(Prisma.sql`
        SELECT
          ARRAY_AGG(DISTINCT distrito ORDER BY distrito) AS distritos,
          ARRAY_AGG(DISTINCT dados->>'genero' ORDER BY dados->>'genero') FILTER (WHERE COALESCE(dados->>'genero', '') <> '') AS generos
        FROM "InteressadoNovoTempo" WHERE ${whereBase}
      `),
    ]);
    return { meta, distritos, religioes, tempoSemContato: tempos, generos: opcoes[0]?.generos || [], distritosDisponiveis: opcoes[0]?.distritos || [] };
  }

  async function facetas(escopo) {
    const meta = await estado();
    if (!meta.loteId) return { meta, facetas: {} };
    const whereSql = condicoesSql(meta, escopo);
    const linhas = await db.$queryRaw(Prisma.sql`
      SELECT tipo, nome, total FROM (
        SELECT 'distritos' AS tipo, COALESCE(NULLIF(distrito, ''), 'Não informado') AS nome, COUNT(*)::int AS total
          FROM "InteressadoNovoTempo" WHERE ${whereSql} GROUP BY distrito
        UNION ALL
        SELECT 'bairros', COALESCE(NULLIF(dados->>'bairro', ''), 'Não informado'), COUNT(*)::int
          FROM "InteressadoNovoTempo" WHERE ${whereSql} GROUP BY dados->>'bairro'
        UNION ALL
        SELECT 'materiais', COALESCE(NULLIF(dados->>'material', ''), 'Não informado'), COUNT(*)::int
          FROM "InteressadoNovoTempo" WHERE ${whereSql} GROUP BY dados->>'material'
        UNION ALL
        SELECT 'generos', COALESCE(NULLIF(dados->>'genero', ''), 'Não informado'), COUNT(*)::int
          FROM "InteressadoNovoTempo" WHERE ${whereSql} GROUP BY dados->>'genero'
        UNION ALL
        SELECT 'prioridades', CASE "prioridadeChave" WHEN 'hot' THEN 'Quente' WHEN 'warm' THEN 'Potencial' WHEN 'cool' THEN 'Morno' WHEN 'cold' THEN 'Frio' ELSE 'Sem prioridade' END, COUNT(*)::int
          FROM "InteressadoNovoTempo" WHERE ${whereSql} GROUP BY "prioridadeChave"
        UNION ALL
        SELECT 'idades', faixa, COUNT(*)::int FROM (
          SELECT CASE
            WHEN COALESCE(dados->>'idade', '') !~ '^[0-9]+$' THEN 'Sem idade'
            WHEN (dados->>'idade')::int <= 17 THEN 'Até 17'
            WHEN (dados->>'idade')::int <= 29 THEN '18 a 29'
            WHEN (dados->>'idade')::int <= 44 THEN '30 a 44'
            WHEN (dados->>'idade')::int <= 59 THEN '45 a 59'
            ELSE '60+' END AS faixa
          FROM "InteressadoNovoTempo" WHERE ${whereSql}
        ) idades_base GROUP BY faixa
      ) facetas_base ORDER BY tipo, total DESC, nome
    `);
    const resultado = { distritos: [], bairros: [], materiais: [], idades: [], generos: [], prioridades: [] };
    linhas.forEach(({ tipo, nome, total }) => resultado[tipo]?.push({ nome, total }));
    return { meta, facetas: resultado };
  }

  async function buscar(escopo, filtros = {}, { pagina = 1, limite = 100, versao = null, mapa = false } = {}) {
    const meta = await estado();
    if (!meta.loteId) return { meta, contatos: [], total: 0, pagina: 1, limite: 100, temMais: false };
    if (versao && ![meta.loteId, meta.loteAnterior].includes(versao)) return { versaoExpirada: true };
    if (versao) meta.loteId = versao;

    const extras = [];
    const lista = (valor) => (Array.isArray(valor) ? valor : String(valor || '').split('|'))
      .map((item) => String(item || '').trim()).filter(Boolean);
    const minusculas = (valor) => lista(valor).map((item) => item.toLocaleLowerCase('pt-BR'));
    const distritos = lista(filtros.distritos).map(chaveNormalizada);
    const bairros = minusculas(filtros.bairros);
    const materiais = minusculas(filtros.materiais);
    const idades = lista(filtros.idades);
    const generos = minusculas(filtros.generos);
    const prioridades = minusculas(filtros.prioridades).map((item) => ({ quente: 'hot', potencial: 'warm', morno: 'cool', frio: 'cold' })[item] || item);
    if (distritos.length) extras.push(Prisma.sql`"distritoChave" IN (${Prisma.join(distritos)})`);
    if (bairros.length) extras.push(Prisma.sql`LOWER(COALESCE(dados->>'bairro', '')) IN (${Prisma.join(bairros)})`);
    if (materiais.length) extras.push(Prisma.sql`LOWER(COALESCE(dados->>'material', '')) IN (${Prisma.join(materiais)})`);
    if (generos.length) extras.push(Prisma.sql`LOWER(COALESCE(dados->>'genero', '')) IN (${Prisma.join(generos)})`);
    if (prioridades.length) extras.push(Prisma.sql`"prioridadeChave" IN (${Prisma.join(prioridades)})`);
    if (idades.length) {
      const idade = Prisma.sql`CASE WHEN COALESCE(dados->>'idade', '') ~ '^[0-9]+$' THEN (dados->>'idade')::int ELSE NULL END`;
      const faixas = [];
      if (idades.includes('Até 17')) faixas.push(Prisma.sql`${idade} <= 17`);
      if (idades.includes('18 a 29')) faixas.push(Prisma.sql`${idade} BETWEEN 18 AND 29`);
      if (idades.includes('30 a 44')) faixas.push(Prisma.sql`${idade} BETWEEN 30 AND 44`);
      if (idades.includes('45 a 59')) faixas.push(Prisma.sql`${idade} BETWEEN 45 AND 59`);
      if (idades.includes('60+')) faixas.push(Prisma.sql`${idade} >= 60`);
      if (idades.includes('Sem idade')) faixas.push(Prisma.sql`${idade} IS NULL`);
      if (faixas.length) extras.push(Prisma.sql`(${Prisma.join(faixas, ' OR ')})`);
    }
    if (filtros.whatsapp === 'sim') extras.push(Prisma.sql`"temWhatsapp" = true`);
    if (filtros.whatsapp === 'nao') extras.push(Prisma.sql`"temWhatsapp" = false`);
    if (filtros.estudos === 'sim') extras.push(Prisma.sql`"estudoAtivo" = true`);
    if (filtros.estudos === 'nao') extras.push(Prisma.sql`"estudoAtivo" = false`);
    if (filtros.vip === 'sim') extras.push(Prisma.sql`"vipHistorico" = true`);
    if (filtros.vip === 'nao') extras.push(Prisma.sql`"vipHistorico" = false`);
    if (filtros.email === 'sim') extras.push(Prisma.sql`COALESCE(dados->>'email', '') <> ''`);
    if (filtros.email === 'nao') extras.push(Prisma.sql`COALESCE(dados->>'email', '') = ''`);
    if (filtros.religiao === 'adventista') extras.push(Prisma.sql`LOWER(COALESCE(dados->>'religiao', '')) LIKE '%adventista%'`);
    if (filtros.religiao === 'outra') extras.push(Prisma.sql`LOWER(COALESCE(dados->>'religiao', '')) NOT LIKE '%adventista%'`);
    if (filtros.tempo && filtros.tempo !== 'todos') {
      const dias = Prisma.sql`CASE WHEN COALESCE(dados->>'diasSemContato', '') ~ '^[0-9]+$' THEN (dados->>'diasSemContato')::int ELSE NULL END`;
      if (filtros.tempo === 'Até 3 meses') extras.push(Prisma.sql`${dias} <= 90`);
      if (filtros.tempo === '3 meses a 1 ano') extras.push(Prisma.sql`${dias} BETWEEN 91 AND 365`);
      if (filtros.tempo === '1 a 2 anos') extras.push(Prisma.sql`${dias} BETWEEN 366 AND 730`);
      if (filtros.tempo === '2 a 5 anos') extras.push(Prisma.sql`${dias} BETWEEN 731 AND 1825`);
      if (filtros.tempo === '5+ anos') extras.push(Prisma.sql`${dias} > 1825`);
      if (filtros.tempo === 'Não informado') extras.push(Prisma.sql`${dias} IS NULL`);
    }
    if (filtros.busca) {
      const termo = `%${String(filtros.busca).toLocaleLowerCase('pt-BR').trim()}%`;
      extras.push(Prisma.sql`LOWER(CONCAT_WS(' ', dados->>'nome', dados->>'email', dados->>'whatsapp', distrito, dados->>'bairro', dados->>'material')) LIKE ${termo}`);
    }

    const limiteValido = Math.min(100, Math.max(1, Number(limite) || 100));
    const paginaValida = Math.max(1, Number(pagina) || 1);
    const whereSql = condicoesSql(meta, escopo, extras);
    const mapaPromise = mapa ? db.$queryRaw(Prisma.sql`
        SELECT dados->>'id' AS id,
          dados->>'nome' AS nome,
          distrito,
          "prioridadeChave" AS prioridade,
          dados->>'prioridadeRotulo' AS "prioridadeRotulo",
          dados->>'whatsapp' AS whatsapp,
          dados->>'bairro' AS bairro,
          dados->>'cidade' AS cidade,
          dados->>'endereco' AS endereco,
          CASE WHEN COALESCE(dados->>'latitude', '') ~ '^-?[0-9]+([.,][0-9]+)?$' THEN REPLACE(dados->>'latitude', ',', '.')::double precision ELSE NULL END AS latitude,
          CASE WHEN COALESCE(dados->>'longitude', '') ~ '^-?[0-9]+([.,][0-9]+)?$' THEN REPLACE(dados->>'longitude', ',', '.')::double precision ELSE NULL END AS longitude,
          NULLIF(dados->>'geoPrecisao', '') AS "geoPrecisao",
          NULLIF(dados->>'geoOrigem', '') AS "geoOrigem",
          CASE WHEN LOWER(COALESCE(dados->>'aceitouVisita', '')) IN ('true', '1', 'sim', 'yes') THEN true ELSE false END AS "aceitouVisita",
          NULLIF(dados->>'campanhaAceiteNome', '') AS "campanhaAceiteNome",
          NULLIF(dados->>'igrejaAfiliada', '') AS "igrejaAfiliada"
        FROM "InteressadoNovoTempo"
        WHERE ${whereSql}
        ORDER BY dados->>'nome', dados->>'id'
        LIMIT 5000
      `) : Promise.resolve([]);
    const [totais, linhas, pontosMapa] = await Promise.all([
      db.$queryRaw(Prisma.sql`
        SELECT COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE "temWhatsapp")::int AS "comWhatsapp",
          COUNT(*) FILTER (WHERE "prioridadeChave" = 'hot')::int AS quentes,
          COUNT(*) FILTER (WHERE "prioridadeChave" = 'warm')::int AS potenciais,
          COUNT(*) FILTER (WHERE "prioridadeChave" = 'cool')::int AS mornos,
          COUNT(*) FILTER (WHERE "prioridadeChave" = 'cold')::int AS frios,
          COUNT(*) FILTER (WHERE "vipHistorico")::int AS vips,
          COUNT(*) FILTER (WHERE "estudoAtivo")::int AS estudos,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(dados->>'aceitouVisita', '')) IN ('true', '1', 'sim', 'yes'))::int AS aceitos,
          COUNT(*) FILTER (WHERE COALESCE(dados->>'email', '') <> '')::int AS "comEmail",
          COUNT(*) FILTER (WHERE LOWER(COALESCE(dados->>'religiao', '')) LIKE '%adventista%')::int AS adventistas,
          COUNT(*) FILTER (WHERE COALESCE(dados->>'diasSemContato', '') ~ '^[0-9]+$' AND (dados->>'diasSemContato')::int <= 90)::int AS "tempoAte3Meses",
          COUNT(*) FILTER (WHERE COALESCE(dados->>'diasSemContato', '') ~ '^[0-9]+$' AND (dados->>'diasSemContato')::int BETWEEN 91 AND 365)::int AS "tempo3Meses1Ano",
          COUNT(*) FILTER (WHERE COALESCE(dados->>'diasSemContato', '') ~ '^[0-9]+$' AND (dados->>'diasSemContato')::int BETWEEN 366 AND 730)::int AS "tempo1A2Anos",
          COUNT(*) FILTER (WHERE COALESCE(dados->>'diasSemContato', '') ~ '^[0-9]+$' AND (dados->>'diasSemContato')::int BETWEEN 731 AND 1825)::int AS "tempo2A5Anos",
          COUNT(*) FILTER (WHERE COALESCE(dados->>'diasSemContato', '') ~ '^[0-9]+$' AND (dados->>'diasSemContato')::int > 1825)::int AS "tempo5AnosMais",
          COUNT(*) FILTER (WHERE COALESCE(dados->>'diasSemContato', '') !~ '^[0-9]+$')::int AS "tempoNaoInformado",
          COUNT(*) FILTER (WHERE COALESCE(dados->>'diasSemContato', '0') ~ '^[0-9]+$'
            AND (dados->>'diasSemContato')::int > 365)::int AS reativar
        FROM "InteressadoNovoTempo" WHERE ${whereSql}
      `),
      db.$queryRaw(Prisma.sql`
        SELECT dados FROM "InteressadoNovoTempo"
        WHERE ${whereSql}
        ORDER BY nome, id
        LIMIT ${limiteValido} OFFSET ${(paginaValida - 1) * limiteValido}
      `),
      mapaPromise,
    ]);
    const resumo = totais[0] || { total: 0, comWhatsapp: 0, quentes: 0, potenciais: 0, mornos: 0, frios: 0, vips: 0, estudos: 0, aceitos: 0, reativar: 0 };
    return {
      meta,
      contatos: linhas.map((linha) => linha.dados),
      resumo,
      total: resumo.total,
      pagina: paginaValida,
      limite: limiteValido,
      temMais: paginaValida * limiteValido < resumo.total,
      mapa: mapa ? pontosMapa : null,
    };
  }

  return { iniciar, solicitar, estado, resumo, porDistrito, todos, buscarPorId, dadosParaAnalise, analiseAgregada, facetas, buscar };
};
