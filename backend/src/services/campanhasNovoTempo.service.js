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

function limparEndereco(valor) {
  if (valor && typeof valor === 'object') {
    valor = [valor.street || valor.logradouro, valor.number || valor.numero,
      valor.neighborhood || valor.bairro, valor.city || valor.cidade, valor.zip || valor.cep]
      .filter(Boolean).join(', ');
  }
  let endereco = texto(valor).replace(/\s+/g, ' ');
  if (!endereco || /^(?:n[aã]o informado|sem endere[cç]o|n\/a)$/i.test(endereco)) return '';

  // O campo da integração também pode receber respostas livres da conversa.
  // Quando houver um logradouro depois de uma introdução ("meu endereço é...")
  // conservamos apenas o trecho que realmente representa o endereço.
  const inicioLogradouro = endereco.search(/\b(?:rua|r\.?|avenida|av\.?|alameda|travessa|estrada|rodovia|pra[cç]a|largo|viela|quadra|qd\.?|condom[ií]nio|residencial|ch[aá]cara|s[ií]tio)\b/i);
  if (inicioLogradouro > 0 && inicioLogradouro <= 90) endereco = endereco.slice(inicioLogradouro);
  endereco = endereco.replace(/[\s,;.!?-]+$/g, '').trim();
  if (endereco.length < 5 || endereco.length > 320) return '';

  const temLogradouro = /\b(?:rua|r\.?|avenida|av\.?|alameda|travessa|estrada|rodovia|pra[cç]a|largo|viela|quadra|qd\.?|condom[ií]nio|residencial|ch[aá]cara|s[ií]tio)\b/i.test(endereco);
  const temCep = /\b(?:cep\s*:?[\s-]*)?\d{5}-?\d{3}\b/i.test(endereco);
  const temNumero = /\b\d+[a-z]?\b/i.test(endereco);
  const marcadoresLocalidade = endereco.match(/\b(?:bairro|cidade|jardim|jd\.?|parque|pq\.?|vila|casa|ap(?:to|artamento)?\.?|bloco|carapicu[ií]ba|osasco|s[aã]o paulo)\b/gi) || [];
  const cidadeBairro = /^[\p{L}\s.]+\s+-\s+(?:jardim|jd\.?|parque|pq\.?|vila|bairro)\b/iu.test(endereco);
  if (!(temLogradouro || temCep || cidadeBairro || (temNumero && marcadoresLocalidade.length) || marcadoresLocalidade.length >= 2)) return '';

  const pareceConversa = /\b(?:agradecemos|seu contato|como podemos ajudar|precisa de atendimento|novo tempo canal|que deus aben[cç]oe|gostaria sim|sim por favor|confirmar a entrega|n[aã]o recebi|estarei no domingo)\b/i.test(endereco);
  if (pareceConversa && !temLogradouro && !temCep) return '';
  return endereco;
}

function enderecoDaConversa(item) {
  const candidatos = [
    item?.delivery?.address,
    item?.acceptedVisit?.address,
    item?.leadSnapshot?.address,
    item?.leadSnapshot?.endereco,
    item?.enderecoCadastroNovoTempo,
  ];
  for (const candidato of candidatos) {
    const endereco = limparEndereco(candidato);
    if (endereco) return endereco;
  }
  return '';
}

const FAIXAS_TEMPO_PADRAO = [
  { id: 'up-to-7-days', label: 'Até 7 dias' },
  { id: '8-to-30-days', label: 'De 8 a 30 dias' },
  { id: '31-to-60-days', label: 'De 31 a 60 dias' },
  { id: '61-to-90-days', label: 'De 61 a 90 dias' },
  { id: '3-to-6-months', label: 'De 3 a 6 meses' },
  { id: '6-months-to-1-year', label: 'De 6 meses a 1 ano' },
  { id: '1-to-2-years', label: 'De 1 a 2 anos' },
  { id: '2-to-4-years', label: 'De 2 a 4 anos' },
  { id: '4-to-6-years', label: 'De 4 a 6 anos' },
  { id: 'over-6-years', label: 'Acima de 6 anos' },
  { id: 'unknown', label: 'Data não informada' },
];

const MAPA_FAIXAS_ID = new Set(FAIXAS_TEMPO_PADRAO.map((f) => f.id));

function parseDataFlexivel(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  const str = texto(String(valor));
  if (!str) return null;
  const br = str.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) {
    const d = new Date(`${br[3]}-${br[2]}-${br[1]}T12:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(str);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

function classificarDiasEmFaixa(dias) {
  const n = Number(dias);
  if (!Number.isFinite(n) || n < 0) return 'unknown';
  if (n <= 7) return 'up-to-7-days';
  if (n <= 30) return '8-to-30-days';
  if (n <= 60) return '31-to-60-days';
  if (n <= 90) return '61-to-90-days';
  if (n <= 180) return '3-to-6-months';
  if (n <= 365) return '6-months-to-1-year';
  if (n <= 730) return '1-to-2-years';
  if (n <= 1460) return '2-to-4-years';
  if (n <= 2190) return '4-to-6-years';
  return 'over-6-years';
}

function extrairFaixaDaConversa(registro) {
  const dados = registro?.dados || registro || {};
  const delivery = dados.delivery || {};
  const snapshot = dados.leadSnapshot || {};

  const bucketExplicito = texto(delivery.requestAgeBucket || dados.requestAgeBucket);
  if (bucketExplicito && MAPA_FAIXAS_ID.has(bucketExplicito)) {
    return bucketExplicito;
  }

  const labelExplicito = normalizar(delivery.requestAgeLabel || dados.requestAgeLabel);
  if (labelExplicito) {
    const encontrada = FAIXAS_TEMPO_PADRAO.find((f) => normalizar(f.label) === labelExplicito);
    if (encontrada) return encontrada.id;
  }

  const diasExplicitos = delivery.requestAgeDays ?? dados.requestAgeDays ?? snapshot.c ?? snapshot.daysSinceLastContact;
  if (diasExplicitos !== null && diasExplicitos !== undefined && diasExplicitos !== '') {
    const idFaixa = classificarDiasEmFaixa(diasExplicitos);
    if (idFaixa !== 'unknown') return idFaixa;
  }

  const dataContato = parseDataFlexivel(
    snapshot.lastContactDate || snapshot.requestDate || delivery.materialRequestedAt
    || dados.lastContactDate || dados.requestDate
  );
  if (dataContato) {
    const dataReferencia = parseDataFlexivel(
      delivery.acceptedAt || dados.acceptedVisit?.savedAt || registro?.atualizadoEm || dados.lastMessageAt
    ) || new Date();
    const diffMs = dataReferencia.getTime() - dataContato.getTime();
    const diffDias = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    return classificarDiasEmFaixa(diffDias);
  }

  return 'unknown';
}

function construirFaixasTempo(conversasAceitas = []) {
  const contagens = new Map(FAIXAS_TEMPO_PADRAO.map((f) => [f.id, 0]));
  for (const item of conversasAceitas) {
    const bucketId = extrairFaixaDaConversa(item);
    contagens.set(bucketId, (contagens.get(bucketId) || 0) + 1);
  }
  const total = conversasAceitas.length;
  return FAIXAS_TEMPO_PADRAO.map((faixa) => {
    const count = contagens.get(faixa.id) || 0;
    const percentage = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    return {
      id: faixa.id,
      label: faixa.label,
      count,
      percentage,
    };
  });
}

function normalizarFaixasOrigem(bucketsOrigem = [], conversasAceitas = []) {
  if (!Array.isArray(bucketsOrigem) || !bucketsOrigem.length) {
    return construirFaixasTempo(conversasAceitas);
  }
  const porId = new Map();
  const porLabel = new Map();
  let somaOrigem = 0;
  for (const b of bucketsOrigem) {
    const count = Number(b?.count) || 0;
    somaOrigem += count;
    if (b?.id) porId.set(String(b.id), b);
    if (b?.label) porLabel.set(normalizar(b.label), b);
  }
  if (somaOrigem === 0 && conversasAceitas.length > 0) {
    return construirFaixasTempo(conversasAceitas);
  }
  return FAIXAS_TEMPO_PADRAO.map((faixa) => {
    const item = porId.get(faixa.id) || porLabel.get(normalizar(faixa.label));
    const count = Number(item?.count) || 0;
    const percentage = item?.percentage !== undefined
      ? Number(item.percentage) || 0
      : (somaOrigem > 0 ? Math.round((count / somaOrigem) * 1000) / 10 : 0);
    return {
      id: faixa.id,
      label: faixa.label,
      count,
      percentage,
    };
  });
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
    const igreja = usuario.igrejaId && await db.igreja.findUnique({
      where: { id: Number(usuario.igrejaId) }, select: { distritoId: true, nome: true },
    });
    distritoId = igreja?.distritoId;
    if (!distritoId || !texto(igreja?.nome)) {
      throw erro(403, 'Seu usuário não possui uma igreja vinculada a esta campanha.', 'ESCOPO_CAMPANHA_NAO_CONFIGURADO');
    }
    return { distritoId: Number(distritoId), igreja: texto(igreja.nome) };
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
              "dados"->>'whatsappNumero' AS telefone, "dados"->>'endereco' AS endereco
            FROM "InteressadoNovoTempo" WHERE "loteId" = ${espelho.loteAtivo}
          `);
          for (const contato of contatos) {
            const candidatos = porNome.get(normalizar(contato.distrito)) || [];
            if (candidatos.length !== 1) continue;
            const complemento = {
              distrito: candidatos[0], nome: texto(contato.nome), endereco: limparEndereco(contato.endereco),
            };
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
          const enriquecido = {
            ...item,
            ...(!(texto(item.leadName) || texto(item.leadSnapshot?.n))
              ? { leadName: complemento?.nome || item.leadName } : {}),
            enderecoCadastroNovoTempo: complemento?.endereco || null,
          };
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
      const mensagem = ['SEVENFLOW_INDISPONIVEL', 'SEVENFLOW_NAO_AUTORIZADA'].includes(falha.codigo)
        ? falha.message
        : 'Não foi possível atualizar os relatórios de campanhas. Os últimos dados disponíveis continuam acessíveis.';
      await db.sincronizacaoCampanhasNovoTempo.updateMany({
        where: { id: ID, execucaoId },
        data: {
          status: 'ERRO', bloqueioAte: null, execucaoId: null, falhas,
          erro: mensagem,
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
    const [aceitosPorDistrito, aceitosPorIgreja, conversasAceitas] = await Promise.all([
      db.conversaCampanhaNovoTempo.groupBy({
        by: ['distritoId'], where: { ...where, aceitou: true }, _count: { _all: true },
      }),
      db.conversaCampanhaNovoTempo.groupBy({
        by: ['distritoId', 'igreja'], where: { ...where, aceitou: true, igreja: { not: null } },
        _count: { _all: true }, orderBy: { _count: { igreja: 'desc' } },
      }),
      typeof db.conversaCampanhaNovoTempo.findMany === 'function'
        ? db.conversaCampanhaNovoTempo.findMany({
            where: { ...where, aceitou: true },
            select: { distritoId: true, igreja: true, atualizadoEm: true, dados: true },
          })
        : Promise.resolve([]),
    ]);
    const contagemAceitos = new Map(aceitosPorDistrito.map((grupo) => [grupo.distritoId, grupo._count._all]));
    const escopoCompleto = Object.keys(escopo).length === 0;
    const origemCompleta = escopoCompleto || total === campanha.dadosResumo?.totalOrigem;

    const faixasTempo = escopoCompleto
      ? normalizarFaixasOrigem(campanha.dadosResumo?.requestAgeBuckets, conversasAceitas)
      : construirFaixasTempo(conversasAceitas);

    const mapaDistritoAceitas = new Map();
    const mapaIgrejaAceitas = new Map();
    for (const item of conversasAceitas) {
      if (item.distritoId !== null && item.distritoId !== undefined) {
        const chDistrito = String(item.distritoId);
        if (!mapaDistritoAceitas.has(chDistrito)) mapaDistritoAceitas.set(chDistrito, []);
        mapaDistritoAceitas.get(chDistrito).push(item);
      }
      if (item.igreja) {
        const chIgreja = `${item.distritoId}|${item.igreja}`;
        if (!mapaIgrejaAceitas.has(chIgreja)) mapaIgrejaAceitas.set(chIgreja, []);
        mapaIgrejaAceitas.get(chIgreja).push(item);
      }
    }

    const faixasTempoPorDistrito = {};
    for (const [chDistrito, lista] of mapaDistritoAceitas.entries()) {
      faixasTempoPorDistrito[chDistrito] = construirFaixasTempo(lista);
    }

    const faixasTempoPorIgreja = {};
    for (const [chIgreja, lista] of mapaIgrejaAceitas.entries()) {
      faixasTempoPorIgreja[chIgreja] = construirFaixasTempo(lista);
    }

    return {
      campanha: { id: campanha.id, nome: campanha.nome, status: campanha.status },
      atualizadoEm: meta.atualizadoEm,
      totais: {
        abordados: origemCompleta ? Number(campanha.dadosResumo?.funnel?.dispatches) || total : total,
        responderam: origemCompleta ? Number(campanha.dadosResumo?.funnel?.responses) || responderam : responderam,
        aceitaram: aceitos,
        conversas: total,
        transmissoes: origemCompleta ? Number(campanha.dadosResumo?.funnel?.transmissions) || 0 : 0,
      },
      distritos: porDistrito.map((grupo) => ({ id: grupo.distritoId, nome: grupo.distrito,
        total: grupo._count._all, aceitaram: contagemAceitos.get(grupo.distritoId) || 0 })),
      igrejas: aceitosPorIgreja.map((grupo) => ({ distritoId: grupo.distritoId, nome: grupo.igreja, aceitaram: grupo._count._all })),
      situacoes: porSituacao.map((grupo) => ({ nome: grupo.situacao, total: grupo._count._all })),
      faixasTempo,
      faixasTempoPorDistrito,
      faixasTempoPorIgreja,
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
          aceitou: true, endereco: true, telefone: true, dados: true, atualizadoEm: true },
        orderBy: [{ nome: 'asc' }, { id: 'asc' }],
      }),
    ]);
    const itensComEndereco = await completarEnderecosCadastrados(itens);
    return { itens: itensComEndereco.map(({ dados, telefone, ...item }) => item), total, pagina, limite, temMais: pagina * limite < total };
  }

  async function completarEnderecosCadastrados(itens) {
    if (!itens.length) return itens;
    const pendentes = itens.filter((item) => !enderecoDaConversa(item.dados || {}) && !limparEndereco(item.endereco));
    const enderecosPorTelefone = new Map();
    const enderecosPorNome = new Map();
    if (pendentes.length && db.interessadoNovoTempo?.findMany && db.sincronizacaoNovoTempo?.findUnique) {
      try {
        const estadoLeads = await db.sincronizacaoNovoTempo.findUnique({ where: { id: ID }, select: { loteAtivo: true } });
        if (estadoLeads?.loteAtivo) {
          const nomes = [...new Set(pendentes.map((item) => item.nome).filter(Boolean))];
          const distritos = [...new Set(pendentes.map((item) => normalizar(item.distrito)).filter(Boolean))];
          const contatos = await db.interessadoNovoTempo.findMany({
            where: { loteId: estadoLeads.loteAtivo, nome: { in: nomes }, distritoChave: { in: distritos } },
            select: { nome: true, distritoChave: true, dados: true },
          });
          for (const contato of contatos) {
            const endereco = limparEndereco(contato.dados?.endereco);
            if (!endereco) continue;
            const telefone = texto(contato.dados?.whatsappNumero || contato.dados?.whatsapp).replace(/\D/g, '').slice(-10);
            if (telefone) enderecosPorTelefone.set(`${contato.distritoChave}|${telefone}`, endereco);
            const chaveNome = `${contato.distritoChave}|${normalizar(contato.nome)}`;
            if (!enderecosPorNome.has(chaveNome)) enderecosPorNome.set(chaveNome, endereco);
            else if (enderecosPorNome.get(chaveNome) !== endereco) enderecosPorNome.set(chaveNome, null);
          }
        }
      } catch (falha) {
        console.warn('[Campanhas NT] Endereço cadastrado indisponível:', falha.message);
      }
    }
    return itens.map((item) => {
      const distrito = normalizar(item.distrito);
      const telefone = texto(item.telefone).replace(/\D/g, '').slice(-10);
      return {
        ...item,
        endereco: enderecoDaConversa(item.dados || {}) || limparEndereco(item.endereco)
          || (telefone && enderecosPorTelefone.get(`${distrito}|${telefone}`))
          || enderecosPorNome.get(`${distrito}|${normalizar(item.nome)}`) || null,
      };
    });
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
    const [itemComEndereco] = await completarEnderecosCadastrados([item]);
    return {
      id: item.id, nome: item.nome, distrito: item.distrito, telefone: item.telefone,
      situacao: item.situacao, aceitou: item.aceitou, endereco: itemComEndereco.endereco,
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
    _internals: { conversasDaResposta, linhaDaConversa, escopoDoUsuario, distritoDaConversa, limparEndereco } };
};
