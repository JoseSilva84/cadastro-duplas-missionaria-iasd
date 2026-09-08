const API_URL_PADRAO = 'https://backend-leadsnt.sevenflowia.tech';
const CACHE_TTL_PADRAO = 5 * 60 * 1000;

let cacheResumo = null;
const cacheDistritos = new Map();
let tokenDeSessao = null;

const texto = (valor) => String(valor ?? '').trim();

const chaveNormalizada = (valor) => texto(valor)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const slug = (valor) => chaveNormalizada(valor).replace(/\s+/g, '-');

function erro(status, mensagem, codigo) {
  const falha = new Error(mensagem);
  falha.status = status;
  falha.mensagem = mensagem;
  falha.codigo = codigo;
  return falha;
}

function configuracao() {
  return {
    apiUrl: texto(process.env.SEVENFLOW_API_URL || API_URL_PADRAO).replace(/\/$/, ''),
    token: texto(process.env.SEVENFLOW_API_TOKEN),
    email: texto(process.env.SEVENFLOW_API_EMAIL),
    password: texto(process.env.SEVENFLOW_API_PASSWORD),
    cacheTtl: Math.max(0, Number(process.env.SEVENFLOW_CACHE_TTL_MS) || CACHE_TTL_PADRAO),
  };
}

function possuiCredencial(cfg) {
  return Boolean(cfg.token || (cfg.email && cfg.password));
}

function numeroValido(valor) {
  return texto(valor).replace(/\D/g, '').length >= 10;
}

function camposAdicionais(registro) {
  const conhecidos = new Set([
    'id', 'n', 'name', 'nome', 't', 'tel', 'phone', 'telefone', 'whatsapp', 'd', 'district', 'distrito',
    'v', 'vip', 'vipHistorico', 'p', 'priority', 'prioridade', 's', 'score', 'e', 'hasActiveStudy',
    'birthDate', 'dataNascimento', 'address', 'endereco', 'end', 'materialName', 'materialPrincipal',
    'material', 'tm', 'email', 'status', 'source', 'origem', 'observations', 'notes', 'observacoes',
    'createdAt', 'created_at', 'updatedAt', 'updated_at', 'tags',
  ]);

  return Object.fromEntries(
    Object.entries(registro || {}).filter(([nome, valor]) => !conhecidos.has(nome) && valor !== null && valor !== '')
  );
}

function normalizarRegistro(registro) {
  const whatsapp = texto(registro?.t || registro?.tel || registro?.whatsapp || registro?.phone || registro?.telefone);
  const distrito = texto(registro?.d || registro?.distrito || registro?.district) || 'Sem distrito';
  const prioridade = texto(registro?.p || registro?.prioridade || registro?.priority);
  const material = texto(registro?.materialName || registro?.materialPrincipal || registro?.material || registro?.tm);

  return {
    id: texto(registro?.id || registro?.uuid),
    nome: texto(registro?.n || registro?.nome || registro?.name) || `Contato ${whatsapp.slice(-4)}`,
    whatsapp,
    email: texto(registro?.email),
    distrito,
    vipHistorico: Boolean(registro?.v ?? registro?.vipHistorico ?? registro?.vip),
    estudoAtivo: Boolean(registro?.e ?? registro?.hasActiveStudy),
    prioridade,
    pontuacao: registro?.s ?? registro?.score ?? null,
    status: texto(registro?.status),
    origem: texto(registro?.source || registro?.origem),
    endereco: texto(registro?.address || registro?.endereco || registro?.end),
    material,
    dataNascimento: registro?.birthDate || registro?.dataNascimento || null,
    observacoes: texto(registro?.observations || registro?.notes || registro?.observacoes),
    criadoEm: registro?.createdAt || registro?.created_at || null,
    atualizadoEm: registro?.updatedAt || registro?.updated_at || null,
    tags: Array.isArray(registro?.tags) ? registro.tags : [],
    camposAdicionais: camposAdicionais(registro),
  };
}

async function lerJson(resposta) {
  try {
    return await resposta.json();
  } catch {
    return null;
  }
}

async function autenticar(cfg) {
  if (!cfg.email || !cfg.password) return cfg.token;

  let resposta;
  try {
    resposta = await fetch(`${cfg.apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cfg.email, password: cfg.password }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw erro(502, 'Não foi possível autenticar no sistema Amigos Novo Tempo.', 'SEVENFLOW_INDISPONIVEL');
  }

  const corpo = await lerJson(resposta);
  if (!resposta.ok || !corpo?.token) {
    throw erro(502, 'O usuário de integração do Amigos Novo Tempo não foi autenticado.', 'SEVENFLOW_NAO_AUTORIZADA');
  }

  tokenDeSessao = corpo.token;
  return tokenDeSessao;
}

async function requisitar(caminho, cfg = configuracao(), repetirAposLogin = true) {
  if (!possuiCredencial(cfg)) {
    throw erro(
      503,
      'Integração com o Amigos Novo Tempo ainda não configurada. Informe um token ou o usuário de integração no backend.',
      'SEVENFLOW_NAO_CONFIGURADA'
    );
  }

  const token = tokenDeSessao || cfg.token || await autenticar(cfg);
  let resposta;

  try {
    resposta = await fetch(`${cfg.apiUrl}${caminho}`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(30000),
    });
  } catch (falha) {
    const mensagem = ['TimeoutError', 'AbortError'].includes(falha?.name)
      ? 'O sistema Amigos Novo Tempo demorou mais de 30 segundos para responder.'
      : 'Não foi possível conectar ao sistema Amigos Novo Tempo.';
    throw erro(502, mensagem, 'SEVENFLOW_INDISPONIVEL');
  }

  if (resposta.status === 401 && repetirAposLogin && cfg.email && cfg.password) {
    tokenDeSessao = null;
    await autenticar(cfg);
    return requisitar(caminho, cfg, false);
  }

  const corpo = await lerJson(resposta);
  if (!resposta.ok) {
    if ([401, 403].includes(resposta.status)) {
      throw erro(502, 'A credencial do Amigos Novo Tempo expirou ou não permite ler o dashboard.', 'SEVENFLOW_NAO_AUTORIZADA');
    }
    throw erro(502, corpo?.message || corpo?.error || `O Amigos Novo Tempo respondeu com status ${resposta.status}.`, 'SEVENFLOW_ERRO');
  }

  return corpo;
}

function registrosInteressados(dashboard) {
  const raiz = dashboard?.data || dashboard || {};
  if (Array.isArray(raiz.interestRecords)) return raiz.interestRecords;

  if (raiz.interestRecordsByDistrict && typeof raiz.interestRecordsByDistrict === 'object') {
    return Object.values(raiz.interestRecordsByDistrict).flatMap((registros) => (
      Array.isArray(registros) ? registros : []
    ));
  }

  return Array.isArray(raiz.records) ? raiz.records : [];
}

async function carregarResumo({ ignorarCache = false } = {}) {
  const cfg = configuracao();
  if (!ignorarCache && cacheResumo && Date.now() - cacheResumo.criadoEm < cfg.cacheTtl) return cacheResumo;

  const dashboard = await requisitar('/api/dashboard', cfg);
  const contatos = registrosInteressados(dashboard).map(normalizarRegistro);

  cacheResumo = {
    criadoEm: Date.now(),
    atualizadoEm: new Date().toISOString(),
    contatos,
  };
  return cacheResumo;
}

function resumir(dados) {
  const distritos = new Map();

  dados.contatos.forEach((contato) => {
    const chave = chaveNormalizada(contato.distrito) || 'sem distrito';
    const atual = distritos.get(chave) || {
      nome: contato.distrito,
      total: 0,
      comWhatsapp: 0,
      vipsHistoricos: 0,
    };
    atual.total += 1;
    if (numeroValido(contato.whatsapp)) atual.comWhatsapp += 1;
    if (contato.vipHistorico) atual.vipsHistoricos += 1;
    distritos.set(chave, atual);
  });

  const grupos = [...distritos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return {
    resumo: {
      totalInteressados: dados.contatos.length,
      comWhatsapp: dados.contatos.filter((contato) => numeroValido(contato.whatsapp)).length,
      vipsHistoricos: dados.contatos.filter((contato) => contato.vipHistorico).length,
      totalDistritos: grupos.length,
    },
    distritos: grupos,
    atualizadoEm: dados.atualizadoEm,
  };
}

const InteressadosNovoTempoService = {
  async resumo({ atualizar = false } = {}) {
    return resumir(await carregarResumo({ ignorarCache: atualizar }));
  },

  async porDistrito(nomeDistrito, { atualizar = false } = {}) {
    const nome = texto(nomeDistrito);
    if (!nome) throw erro(400, 'Informe o distrito.', 'DISTRITO_OBRIGATORIO');

    const cfg = configuracao();
    const chave = slug(nome);
    let dados = cacheDistritos.get(chave);

    if (atualizar || !dados || Date.now() - dados.criadoEm >= cfg.cacheTtl) {
      const resposta = await requisitar(`/api/dashboard/district-interest/${encodeURIComponent(chave)}`, cfg);
      const raiz = resposta?.data || resposta || {};
      dados = {
        criadoEm: Date.now(),
        atualizadoEm: new Date().toISOString(),
        contatos: (Array.isArray(raiz.records) ? raiz.records : []).map(normalizarRegistro),
      };
      cacheDistritos.set(chave, dados);
    }

    if (!dados.contatos.length) {
      throw erro(404, 'Nenhum interessado encontrado para este distrito.', 'DISTRITO_SEM_INTERESSADOS');
    }

    const contatos = [...dados.contatos].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return {
      distrito: contatos[0]?.distrito || nome,
      resumo: {
        totalInteressados: contatos.length,
        comWhatsapp: contatos.filter((contato) => numeroValido(contato.whatsapp)).length,
        vipsHistoricos: contatos.filter((contato) => contato.vipHistorico).length,
      },
      leads: contatos,
      atualizadoEm: dados.atualizadoEm,
    };
  },

  statusConfiguracao() {
    const cfg = configuracao();
    return {
      configurada: possuiCredencial(cfg),
      apiUrl: cfg.apiUrl,
      autenticacao: cfg.email && cfg.password ? 'Usuário de integração' : cfg.token ? 'Bearer token' : null,
      cacheTtlMs: cfg.cacheTtl,
    };
  },

  _internals: {
    chaveNormalizada,
    slug,
    normalizarRegistro,
    registrosInteressados,
    resumir,
  },
};

module.exports = InteressadosNovoTempoService;
