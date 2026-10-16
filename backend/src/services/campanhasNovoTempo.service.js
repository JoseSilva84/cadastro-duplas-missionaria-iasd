const { randomUUID, createHash } = require('crypto');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { PERFIS, ehAdmin } = require('../middlewares/auth');

const ID = 'principal';
const INTERVALO = 15 * 60 * 1000;
const BLOQUEIO = 5 * 60 * 1000;
const TAMANHO_LOTE = 150;
const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const texto = (valor) => typeof valor === 'string' ? valor.trim() : '';
const erro = (status, mensagem, codigo) => Object.assign(new Error(mensagem), { status, mensagem, codigo });

function campanhasDaResposta(resposta) {
  if (Array.isArray(resposta)) return resposta;
  if (Array.isArray(resposta?.campaigns)) return resposta.campaigns;
  if (Array.isArray(resposta?.data?.campaigns)) return resposta.data.campaigns;
  return [];
}

function campanhaDaAssociacao(campanha) {
  const nome = texto(campanha?.associationName) || texto(campanha?.association?.name)
    || texto(campanha?.associationSlug) || texto(campanha?.association?.slug);
  const chave = normalizar(nome);
  return !chave || chave.includes('paulistana') || !chave.includes('associacao');
}

function conversasDaResposta(resposta) {
  const raiz = resposta?.data || resposta || {};
  const conversas = Array.isArray(raiz.conversations) ? raiz.conversations : [];
  const aceitas = Array.isArray(raiz.acceptedConversations) ? raiz.acceptedConversations : [];
  const mapa = new Map();
  const identidade = (item) => texto(item?.id) || texto(item?.conversationId) || texto(item?.phone) || texto(item?.leadId);
  for (const item of conversas) {
    const chave = identidade(item);
    if (chave) mapa.set(chave, { ...item });
  }
  for (const item of aceitas) {
    const chave = identidade(item);
    if (chave) mapa.set(chave, { ...mapa.get(chave), ...item, aceitouRelatorio: true });
  }
  return [...mapa.values()];
}

function distritoDaConversa(item) {
  return texto(item?.district) || texto(item?.leadSnapshot?.d)
    || texto(item?.leadSnapshot?.district) || texto(item?.churchAssignment?.districtName)
    || texto(item?.acceptedVisit?.districtName);
}

function nomeDaConversa(item) {
  return texto(item?.leadName) || texto(item?.leadSnapshot?.n)
    || texto(item?.leadSnapshot?.name) || 'Contato sem nome';
}

function enderecoDaConversa(item) {
  const valor = item?.delivery?.address || item?.acceptedVisit?.address
    || item?.leadSnapshot?.address || item?.leadSnapshot?.endereco || '';
  if (typeof valor === 'string') return valor.trim();
  if (valor && typeof valor === 'object') {
    return [valor.street || valor.logradouro, valor.number || valor.numero,
      valor.neighborhood || valor.bairro, valor.city || valor.cidade, valor.zip || valor.cep]
      .filter(Boolean).join(', ');
  }
  return '';
}

function situacaoDaConversa(item) {
  return texto(item?.classification?.label) || texto(item?.classification)
    || texto(item?.delivery?.giftDecisionStatus) || texto(item?.status) || 'Sem classificação';
}

function linhaDaConversa(item, campanhaId, loteId, distrito) {
  const identidade = texto(item.id) || texto(item.conversationId) || texto(item.phone) || texto(item.leadId);
  const id = createHash('sha256').update(identidade).digest('hex');
  const aceitou = Boolean(item.aceitouRelatorio || item.delivery?.accepted
    || item.delivery?.giftDecisionStatus === 'ACCEPTED' || item.acceptedVisit?.accepted);
  const instante = item.lastMessageAt || item.updatedAt;
  const data = instante ? new Date(instante) : null;
  return {
    loteId, campanhaId, id, distritoId: distrito.id, regiaoId: distrito.regiaoId,
    distrito: distrito.nome,
    igreja: texto(item.churchAssignment?.churchName) || texto(item.acceptedVisit?.churchName) || null,
    nome: nomeDaConversa(item), telefone: texto(item.phone) || null,
    situacao: situacaoDaConversa(item), aceitou,
    respondeu: Boolean(item.hasLeadReply || item.responded
      || (texto(item.lastLeadMessage) && texto(item.lastLeadMessage) !== 'Sem mensagem registrada.')
      || (Array.isArray(item.messages) && item.messages.some((mensagem) =>
        mensagem.direction === 'INBOUND' || mensagem.senderType === 'LEAD'))),
    endereco: enderecoDaConversa(item) || null,
    atualizadoEm: data && !Number.isNaN(data.getTime()) ? data : null,
    dados: item,
  };
}

async function escopoDoUsuario(usuario, db = prisma) {
  if (ehAdmin(usuario?.perfil)) return {};
  if ([PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL].includes(usuario?.perfil)) {
    if (!usuario.regiaoId) throw erro(403, 'Seu usuário não possui uma região vinculada.', 'ESCOPO_CAMPANHA_NAO_CONFIGURADO');
    return { regiaoId: Number(usuario.regiaoId) };
  }
  let distritoId = usuario?.distritoId;
  if (usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
    const igreja = usuario.igrejaId && await db.igreja.findUnique({ where: { id: Number(usuario.igrejaId) }, select: { distritoId: true } });
    distritoId = igreja?.distritoId;
  }
  if (usuario?.perfil === PERFIS.DUPLA_MISSIONARIA && !distritoId) {
    const dupla = usuario.duplaId && await db.dupla.findUnique({ where: { id: Number(usuario.duplaId) }, select: { distritoId: true } });
    distritoId = dupla?.distritoId;
  }
  if (!distritoId || ![PERFIS.PASTOR_DISTRITAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA].includes(usuario?.perfil)) {
    throw erro(403, 'Seu usuário não possui um distrito vinculado a esta campanha.', 'ESCOPO_CAMPANHA_NAO_CONFIGURADO');
  }
  return { distritoId: Number(distritoId) };
}

module.exports = function criarServicoCampanhasNovoTempo({ requisitar, configuracao, possuiCredencial, db = prisma }) {
  let agendamento = null;
  let execucao = null;
  let temporizador = null;

  async function estado() {
    return db.sincronizacaoCampanhasNovoTempo.findUnique({ where: { id: ID } });
  }

  async function executar(execucaoId, anterior) {
    const loteId = randomUUID();
    try {
      const respostaCampanhas = await requisitar('/api/campaigns');
      const campanhas = campanhasDaResposta(respostaCampanhas)
        .filter((item) => texto(item.id) && campanhaDaAssociacao(item));
      if (!campanhas.length) throw new Error('Nenhuma campanha disponível na integração.');
      const distritos = await db.distrito.findMany({ select: { id: true, nome: true, regiaoId: true } });
      const porNome = new Map();
      for (const distrito of distritos) {
        const chave = normalizar(distrito.nome);
        if (!porNome.has(chave)) porNome.set(chave, []);
        porNome.get(chave).push(distrito);
      }
      // Algumas conversas da Ana não trazem o distrito; o espelho de leads já
      // possui essa vinculação. Ler somente id/telefone evita carregar 37 mil JSONs.
      const porLead = new Map();
      const porTelefone = new Map();
      try {
        const espelho = await db.sincronizacaoNovoTempo.findUnique({ where: { id: ID }, select: { loteAtivo: true } });
        if (espelho?.loteAtivo) {
          const contatos = await db.$queryRaw(Prisma.sql`
            SELECT "distrito", "dados"->>'id' AS "leadId", "dados"->>'nome' AS nome,
              "dados"->>'whatsappNumero' AS telefone
            FROM "InteressadoNovoTempo" WHERE "loteId" = ${espelho.loteAtivo}
          `);
          for (const contato of contatos) {
            const candidatos = porNome.get(normalizar(contato.distrito)) || [];
            if (candidatos.length !== 1) continue;
            const complemento = { distrito: candidatos[0], nome: texto(contato.nome) };
            if (contato.leadId) {
              const idLead = String(contato.leadId);
              const anterior = porLead.get(idLead);
              porLead.set(idLead, porLead.has(idLead) && (!anterior || anterior.distrito.id !== candidatos[0].id) ? null : complemento);
            }
            const telefone = String(contato.telefone || '').replace(/\D/g, '').slice(-10);
            if (telefone) {
              const anterior = porTelefone.get(telefone);
              porTelefone.set(telefone, porTelefone.has(telefone) && (!anterior || anterior.distrito.id !== candidatos[0].id) ? null : complemento);
            }
          }
        }
      } catch (falha) {
        console.warn('[Campanhas NT] Não foi possível complementar distritos pelo espelho de leads:', falha.message);
      }
      let total = 0;
      for (const campanha of campanhas) {
        const campanhaId = String(campanha.id);
        const resposta = await requisitar(`/api/ai/ana/summary?limit=3000&campaignId=${encodeURIComponent(campanhaId)}`);
        const raiz = resposta?.data || resposta || {};
        const origem = conversasDaResposta(raiz);
        const linhas = new Map();
        for (const item of origem) {
          const candidatos = porNome.get(normalizar(distritoDaConversa(item))) || [];
          // Um nome repetido em regiões diferentes não permite atribuição segura.
          const telefone = texto(item.phone).replace(/\D/g, '').slice(-10);
          const complemento = porLead.get(String(item.leadId || item.externalLeadId || ''))
            || (telefone && porTelefone.get(telefone));
          const distrito = candidatos.length === 1 ? candidatos[0] : complemento?.distrito;
          if (!distrito) continue;
          const enriquecido = texto(item.leadName) || texto(item.leadSnapshot?.n)
            ? item : { ...item, leadName: complemento?.nome || item.leadName };
          const linha = linhaDaConversa(enriquecido, campanhaId, loteId, distrito);
          linhas.set(linha.id, linha);
        }
        if (!linhas.size) continue;
        await db.campanhaNovoTempo.create({
          data: {
            loteId, id: campanhaId, nome: texto(campanha.name) || `Campanha ${campanhaId}`,
            status: texto(campanha.status) || null,
            dadosResumo: {
              metrics: raiz.metrics || {}, funnel: raiz.funnel || {},
              requestAgeBuckets: raiz.requestAgeBuckets || [],
              totalOrigem: origem.length, totalMapeado: linhas.size,
              limitadoNaOrigem: Array.isArray(raiz.conversations) && raiz.conversations.length >= 3000,
            },
          },
        });
        const registros = [...linhas.values()];
        for (let inicio = 0; inicio < registros.length; inicio += TAMANHO_LOTE) {
          await db.conversaCampanhaNovoTempo.createMany({ data: registros.slice(inicio, inicio + TAMANHO_LOTE) });
          const bloqueio = await db.sincronizacaoCampanhasNovoTempo.updateMany({
            where: { id: ID, execucaoId }, data: { bloqueioAte: new Date(Date.now() + BLOQUEIO) },
          });
          if (!bloqueio.count) throw new Error('A sincronização de campanhas perdeu o bloqueio.');
        }
        total += registros.length;
        await new Promise((resolve) => setImmediate(resolve));
      }
      if (!total) throw new Error('As campanhas retornadas não possuem conversas vinculadas aos distritos do PCM.');
      const publicado = await db.sincronizacaoCampanhasNovoTempo.updateMany({
        where: { id: ID, execucaoId },
        data: {
          loteAtivo: loteId, atualizadoEm: new Date(), proximaTentativaEm: new Date(Date.now() + INTERVALO),
          bloqueioAte: null, execucaoId: null, falhas: 0, erro: null, status: 'PRONTO',
        },
      });
      if (!publicado.count) throw new Error('A sincronização de campanhas perdeu o bloqueio antes da publicação.');
      const lotesMantidos = [loteId, anterior.loteAtivo].filter(Boolean);
      await Promise.all([
        db.campanhaNovoTempo.deleteMany({ where: { loteId: { notIn: lotesMantidos } } }),
        db.conversaCampanhaNovoTempo.deleteMany({ where: { loteId: { notIn: lotesMantidos } } }),
      ]).catch((falha) => console.error('[Campanhas NT] Falha ao limpar lotes:', falha.message));
      console.info(`[Campanhas NT] Publicadas ${campanhas.length} campanhas e ${total} conversas vinculadas.`);
    } catch (falha) {
      const falhas = Number(anterior.falhas || 0) + 1;
      const espera = Math.min(60, 2 ** Math.min(falhas - 1, 6)) * 60 * 1000;
      await db.sincronizacaoCampanhasNovoTempo.updateMany({
        where: { id: ID, execucaoId },
        data: {
          status: 'ERRO', bloqueioAte: null, execucaoId: null, falhas,
          erro: 'Não foi possível atualizar os relatórios de campanhas. Os últimos dados disponíveis continuam acessíveis.',
          proximaTentativaEm: new Date(Date.now() + espera),
        },
      }).catch((erroBanco) => console.error('[Campanhas NT] Falha ao registrar erro:', erroBanco.message));
      await Promise.all([
        db.campanhaNovoTempo.deleteMany({ where: { loteId } }),
        db.conversaCampanhaNovoTempo.deleteMany({ where: { loteId } }),
      ]).catch(() => {});
      console.error('[Campanhas NT] Sincronização falhou:', falha.message);
    }
  }

  async function solicitar() {
    if (agendamento) return agendamento;
    if (execucao || !possuiCredencial(configuracao())) return false;
    agendamento = (async () => {
      const anterior = await db.sincronizacaoCampanhasNovoTempo.upsert({
        where: { id: ID }, create: { id: ID }, update: {},
      });
      const agora = new Date();
      const execucaoId = randomUUID();
      const bloqueio = await db.sincronizacaoCampanhasNovoTempo.updateMany({
        where: {
          id: ID, proximaTentativaEm: { lte: agora },
          OR: [{ bloqueioAte: null }, { bloqueioAte: { lte: agora } }],
        },
        data: { status: 'SINCRONIZANDO', execucaoId, bloqueioAte: new Date(Date.now() + BLOQUEIO) },
      });
      if (!bloqueio.count) return false;
      execucao = executar(execucaoId, anterior).finally(() => { execucao = null; });
      return true;
    })().finally(() => { agendamento = null; });
    return agendamento;
  }

  function iniciar() {
    if (temporizador) return;
    solicitar().catch((falha) => console.error('[Campanhas NT] Falha ao agendar sincronização:', falha.message));
    temporizador = setInterval(() => {
      solicitar().catch((falha) => console.error('[Campanhas NT] Falha ao agendar sincronização:', falha.message));
    }, 60 * 1000);
    temporizador.unref?.();
  }

  async function contexto(usuario, campanhaId) {
    const [meta, escopo] = await Promise.all([estado(), escopoDoUsuario(usuario, db)]);
    if (!meta?.loteAtivo) return { meta, escopo, campanha: null };
    const campanha = campanhaId && await db.campanhaNovoTempo.findUnique({
      where: { loteId_id: { loteId: meta.loteAtivo, id: campanhaId } },
    });
    if (campanhaId && !campanha) throw erro(404, 'Campanha não encontrada.', 'CAMPANHA_NT_NAO_ENCONTRADA');
    if (campanha) {
      const acesso = await db.conversaCampanhaNovoTempo.count({
        where: { loteId: meta.loteAtivo, campanhaId, ...escopo },
      });
      if (!acesso) throw erro(404, 'Campanha não disponível no seu território.', 'CAMPANHA_NT_FORA_DO_ESCOPO');
    }
    return { meta, escopo, campanha };
  }

  async function listar(usuario) {
    const { meta, escopo } = await contexto(usuario);
    if (!meta?.loteAtivo) {
      return { campanhas: [], sincronizando: meta?.status === 'SINCRONIZANDO', erroSincronizacao: meta?.erro || null };
    }
    const grupos = await db.conversaCampanhaNovoTempo.groupBy({
      by: ['campanhaId'], where: { loteId: meta.loteAtivo, ...escopo }, _count: { _all: true },
    });
    const campanhas = await db.campanhaNovoTempo.findMany({
      where: { loteId: meta.loteAtivo, id: { in: grupos.map((grupo) => grupo.campanhaId) } },
      select: { id: true, nome: true, status: true }, orderBy: { nome: 'asc' },
    });
    const contagem = new Map(grupos.map((grupo) => [grupo.campanhaId, grupo._count._all]));
    return {
      campanhas: campanhas.map((campanha) => ({ ...campanha, total: contagem.get(campanha.id) || 0 })),
      atualizadoEm: meta.atualizadoEm, sincronizando: meta.status === 'SINCRONIZANDO',
      erroSincronizacao: meta.erro || null,
    };
  }

  async function resumo(usuario, campanhaId) {
    const { meta, escopo, campanha } = await contexto(usuario, campanhaId);
    if (!campanha) throw erro(404, 'Relatório da campanha ainda não disponível.', 'CAMPANHA_NT_AGUARDANDO');
    const where = { loteId: meta.loteAtivo, campanhaId, ...escopo };
    const [total, aceitos, responderam, porDistrito, porSituacao] = await Promise.all([
      db.conversaCampanhaNovoTempo.count({ where }),
      db.conversaCampanhaNovoTempo.count({ where: { ...where, aceitou: true } }),
      db.conversaCampanhaNovoTempo.count({ where: { ...where, respondeu: true } }),
      db.conversaCampanhaNovoTempo.groupBy({
        by: ['distritoId', 'distrito'], where, _count: { _all: true }, orderBy: { distrito: 'asc' },
      }),
      db.conversaCampanhaNovoTempo.groupBy({
        by: ['situacao'], where, _count: { _all: true }, orderBy: { _count: { situacao: 'desc' } },
      }),
    ]);
    const [aceitosPorDistrito, aceitosPorIgreja] = await Promise.all([
      db.conversaCampanhaNovoTempo.groupBy({
        by: ['distritoId'], where: { ...where, aceitou: true }, _count: { _all: true },
      }),
      db.conversaCampanhaNovoTempo.groupBy({
        by: ['distritoId', 'igreja'], where: { ...where, aceitou: true, igreja: { not: null } },
        _count: { _all: true }, orderBy: { _count: { igreja: 'desc' } },
      }),
    ]);
    const contagemAceitos = new Map(aceitosPorDistrito.map((grupo) => [grupo.distritoId, grupo._count._all]));
    // As métricas da origem só podem ser mostradas se todo o lote pertencer ao escopo do usuário.
    const origemCompleta = total === campanha.dadosResumo?.totalOrigem;
    return {
      campanha: { id: campanha.id, nome: campanha.nome, status: campanha.status },
      atualizadoEm: meta.atualizadoEm,
      totais: { abordados: origemCompleta ? Number(campanha.dadosResumo?.funnel?.dispatches) || total : total,
        responderam: origemCompleta ? Number(campanha.dadosResumo?.funnel?.responses) || responderam : responderam,
        aceitaram: aceitos, conversas: total },
      distritos: porDistrito.map((grupo) => ({ id: grupo.distritoId, nome: grupo.distrito,
        total: grupo._count._all, aceitaram: contagemAceitos.get(grupo.distritoId) || 0 })),
      igrejas: aceitosPorIgreja.map((grupo) => ({ distritoId: grupo.distritoId, nome: grupo.igreja, aceitaram: grupo._count._all })),
      situacoes: porSituacao.map((grupo) => ({ nome: grupo.situacao, total: grupo._count._all })),
      faixasTempo: origemCompleta ? campanha.dadosResumo?.requestAgeBuckets || [] : [],
      dadosParciais: Boolean(campanha.dadosResumo?.limitadoNaOrigem || campanha.dadosResumo?.totalMapeado !== campanha.dadosResumo?.totalOrigem),
    };
  }

  async function conversas(usuario, campanhaId, filtros = {}) {
    const { meta, escopo, campanha } = await contexto(usuario, campanhaId);
    if (!campanha) throw erro(404, 'Relatório da campanha ainda não disponível.', 'CAMPANHA_NT_AGUARDANDO');
    const pagina = Math.max(1, Math.min(10000, Number.parseInt(filtros.pagina, 10) || 1));
    const limite = Math.max(1, Math.min(50, Number.parseInt(filtros.limite, 10) || 25));
    const where = { loteId: meta.loteAtivo, campanhaId, ...escopo };
    if (filtros.aceitos !== '0') where.aceitou = true;
    if (filtros.distritoId) {
      const distritoId = Number(filtros.distritoId);
      if (!Number.isSafeInteger(distritoId)) throw erro(400, 'Distrito inválido.', 'DISTRITO_INVALIDO');
      if (escopo.distritoId && distritoId !== escopo.distritoId) {
        throw erro(404, 'Distrito não disponível no seu território.', 'DISTRITO_NT_FORA_DO_ESCOPO');
      }
      where.distritoId = distritoId;
    }
    if (filtros.situacao) where.situacao = String(filtros.situacao).slice(0, 120);
    if (filtros.igreja) where.igreja = String(filtros.igreja).slice(0, 160);
    const [total, itens] = await Promise.all([
      db.conversaCampanhaNovoTempo.count({ where }),
      db.conversaCampanhaNovoTempo.findMany({
        where, skip: (pagina - 1) * limite, take: limite,
        select: { id: true, nome: true, distrito: true, distritoId: true, igreja: true, situacao: true,
          aceitou: true, endereco: true, atualizadoEm: true },
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      }),
    ]);
    return { itens, total, pagina, limite, temMais: pagina * limite < total };
  }

  async function detalhe(usuario, campanhaId, conversaId) {
    const { meta, escopo, campanha } = await contexto(usuario, campanhaId);
    if (!campanha) throw erro(404, 'Relatório da campanha ainda não disponível.', 'CAMPANHA_NT_AGUARDANDO');
    const item = await db.conversaCampanhaNovoTempo.findFirst({
      where: { loteId: meta.loteAtivo, campanhaId, id: conversaId, ...escopo },
    });
    if (!item) throw erro(404, 'Conversa não encontrada no seu território.', 'CONVERSA_NT_FORA_DO_ESCOPO');
    let dadosConversa = item.dados || {};
    const tentativaRecente = dadosConversa.historicoTentadoEm
      && Date.now() - new Date(dadosConversa.historicoTentadoEm).getTime() < 30 * 60 * 1000;
    if (!dadosConversa.historicoCompleto && !tentativaRecente) {
      const idOrigemBruto = texto(dadosConversa.id) || texto(dadosConversa.conversationId);
      const idOrigem = idOrigemBruto.startsWith('ana-snapshot-') ? '' : idOrigemBruto;
      const telefone = texto(item.telefone).replace(/\D/g, '');
      if (idOrigem || telefone) {
        try {
          const parametro = idOrigem ? `id=${encodeURIComponent(idOrigem)}` : `phone=${encodeURIComponent(telefone)}`;
          const resposta = await requisitar(`/api/whatsapp/conversations?limit=1&${parametro}`);
          const encontradas = resposta?.conversations || resposta?.data?.conversations || [];
          const remota = encontradas.find((conversa) => idOrigem
            ? String(conversa.id) === idOrigem
            : telefone && String(conversa.phone || '').replace(/\D/g, '').endsWith(telefone.slice(-10)));
          if (remota && Array.isArray(remota.messages)) {
            dadosConversa = { ...dadosConversa, messages: remota.messages, historicoCompleto: true };
          }
        } catch (falha) {
          console.warn('[Campanhas NT] Histórico completo indisponível:', falha.message);
        } finally {
          dadosConversa = { ...dadosConversa, historicoTentadoEm: new Date().toISOString() };
          await db.conversaCampanhaNovoTempo.update({
            where: { loteId_campanhaId_id: { loteId: meta.loteAtivo, campanhaId, id: conversaId } },
            data: { dados: dadosConversa },
          }).catch((falha) => console.error('[Campanhas NT] Falha ao guardar histórico:', falha.message));
        }
      }
    }
    const mensagens = Array.isArray(dadosConversa.messages) ? dadosConversa.messages : [];
    return {
      id: item.id, nome: item.nome, distrito: item.distrito, telefone: item.telefone,
      situacao: item.situacao, aceitou: item.aceitou, endereco: item.endereco,
      igreja: item.igreja,
      atualizadoEm: item.atualizadoEm,
      mensagens: mensagens.map((mensagem) => ({
        id: mensagem.id, texto: mensagem.body || mensagem.text || '',
        direcao: mensagem.direction || mensagem.senderType || '',
        data: mensagem.createdAt || mensagem.sentAt || mensagem.receivedAt || null,
      })).filter((mensagem) => mensagem.texto),
      historicoCompleto: Boolean(dadosConversa.historicoCompleto),
      ultimaMensagemInteressado: texto(item.dados?.lastLeadMessage),
      ultimaMensagemAgente: texto(item.dados?.lastAnaMessage),
    };
  }

  return { iniciar, solicitar, listar, resumo, conversas, detalhe,
    _internals: { conversasDaResposta, linhaDaConversa, escopoDoUsuario, distritoDaConversa } };
};
