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

  return { iniciar, solicitar, estado, resumo, porDistrito, todos };
};
