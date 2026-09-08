const API_URL_PADRAO = 'https://api.sevenflowia.tech';
const CACHE_TTL_PADRAO = 5 * 60 * 1000;

let cache = null;

const texto = (valor) => String(valor ?? '').trim();

const chaveNormalizada = (valor) => texto(valor)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const booleano = (valor) => {
  if (typeof valor === 'boolean') return valor;
  return ['1', 'sim', 'true', 'yes', 'vip'].includes(chaveNormalizada(valor));
};

const listaConfigurada = (nome, padrao = '') => texto(process.env[nome] || padrao)
  .split(',')
  .map((item) => chaveNormalizada(item))
  .filter(Boolean);

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
    licenseKey: texto(process.env.SEVENFLOW_LICENSE_KEY),
    campoDistrito: texto(process.env.SEVENFLOW_DISTRITO_CAMPO || 'distrito'),
    tagsInteressado: listaConfigurada('SEVENFLOW_INTERESSADO_TAGS'),
    tagsVip: listaConfigurada('SEVENFLOW_VIP_HISTORICO_TAGS', 'VIP Histórico,Vips Históricos'),
    maxPaginas: Math.max(1, Number(process.env.SEVENFLOW_MAX_PAGINAS) || 500),
    cacheTtl: Math.max(0, Number(process.env.SEVENFLOW_CACHE_TTL_MS) || CACHE_TTL_PADRAO),
  };
}

function extrairCamposAdicionais(contato) {
  const campos = {};
  const candidatos = [
    contato?.extraInfo,
    contato?.extraInfos,
    contato?.customFields,
    contato?.fields,
  ];

  candidatos.forEach((colecao) => {
    if (Array.isArray(colecao)) {
      colecao.forEach((item) => {
        const nome = texto(item?.name || item?.label || item?.key || item?.field);
        const valor = item?.value ?? item?.valor ?? item?.content;
        if (nome && valor !== undefined && valor !== null && texto(valor)) campos[nome] = valor;
      });
      return;
    }

    if (colecao && typeof colecao === 'object') {
      Object.entries(colecao).forEach(([nome, valor]) => {
        if (valor !== undefined && valor !== null && texto(valor)) campos[nome] = valor;
      });
    }
  });

  return campos;
}

function extrairTags(contato) {
  const colecoes = [contato?.tags, contato?.Tags, contato?.contactTags];
  const nomes = colecoes.flatMap((colecao) => (Array.isArray(colecao) ? colecao : []))
    .map((item) => texto(item?.name || item?.nome || item?.tag?.name || item?.tag?.nome || item))
    .filter(Boolean);
  return [...new Set(nomes)];
}

function mapaDeCampos(contato, camposAdicionais) {
  const mapa = new Map();

  Object.entries(contato || {}).forEach(([nome, valor]) => {
    if (['string', 'number', 'boolean'].includes(typeof valor)) {
      mapa.set(chaveNormalizada(nome), valor);
    }
  });

  Object.entries(camposAdicionais).forEach(([nome, valor]) => {
    mapa.set(chaveNormalizada(nome), valor);
  });

  return mapa;
}

function obterCampo(mapa, nomes) {
  for (const nome of nomes) {
    const valor = mapa.get(chaveNormalizada(nome));
    if (valor !== undefined && valor !== null && texto(valor)) return valor;
  }
  return '';
}

function correspondeATag(tags, nomesConfigurados) {
  if (!nomesConfigurados.length) return false;
  const tagsNormalizadas = tags.map(chaveNormalizada);
  return tagsNormalizadas.some((tag) => nomesConfigurados.some((nome) => tag === nome || tag.includes(nome)));
}

function normalizarContato(contato, cfg = configuracao()) {
  const camposAdicionais = extrairCamposAdicionais(contato);
  const tags = extrairTags(contato);
  const campos = mapaDeCampos(contato, camposAdicionais);
  const numero = texto(obterCampo(campos, ['whatsapp', 'numero whatsapp', 'telefone', 'phone', 'mobile', 'number']));
  const email = texto(obterCampo(campos, ['email', 'e-mail', 'mail']));

  let distrito = texto(obterCampo(campos, [
    cfg.campoDistrito,
    'distrito',
    'distrito nt',
    'district',
  ]));

  if (!distrito) {
    const tagDistrito = tags.find((tag) => /^(distrito|dist)\s*[:\-–—]\s*.+/i.test(tag));
    distrito = tagDistrito ? tagDistrito.replace(/^(distrito|dist)\s*[:\-–—]\s*/i, '').trim() : '';
  }

  const vipCampo = obterCampo(campos, ['vip historico', 'vip histórico', 'vips historicos', 'vips históricos', 'vip']);
  const vipHistorico = booleano(vipCampo) || correspondeATag(tags, cfg.tagsVip);
  const interessado = !cfg.tagsInteressado.length
    || correspondeATag(tags, cfg.tagsInteressado)
    || booleano(obterCampo(campos, ['interessado', 'lead interessado', 'novo tempo']));

  return {
    id: texto(contato?.id || contato?.uuid || contato?.contactId),
    nome: texto(contato?.name || contato?.nome || contato?.pushname || contato?.pushName) || 'Sem nome',
    whatsapp: numero,
    email,
    distrito: distrito || 'Sem distrito',
    vipHistorico,
    interessado,
    status: texto(contato?.status || contato?.situation || contato?.situacao),
    origem: texto(contato?.source || contato?.origem || obterCampo(campos, ['origem', 'source'])),
    observacoes: texto(contato?.observations || contato?.notes || contato?.observacoes || obterCampo(campos, ['observacoes', 'observações'])),
    criadoEm: contato?.createdAt || contato?.created_at || contato?.dataCriacao || null,
    atualizadoEm: contato?.updatedAt || contato?.updated_at || contato?.dataAtualizacao || null,
    tags,
    camposAdicionais,
  };
}

async function requisitarSevenFlow(caminho, params = {}, cfg = configuracao()) {
  if (!cfg.token && !cfg.licenseKey) {
    throw erro(
      503,
      'Integração com a SevenFlow ainda não configurada. Defina SEVENFLOW_API_TOKEN ou SEVENFLOW_LICENSE_KEY no backend.',
      'SEVENFLOW_NAO_CONFIGURADA'
    );
  }

  const url = new URL(caminho, `${cfg.apiUrl}/`);
  Object.entries(params).forEach(([nome, valor]) => {
    if (valor !== undefined && valor !== null && texto(valor)) url.searchParams.set(nome, String(valor));
  });

  const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (cfg.token) headers.Authorization = `Bearer ${cfg.token}`;
  if (cfg.licenseKey) headers['X-License-Key'] = cfg.licenseKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  let resposta;

  try {
    resposta = await fetch(url, { method: 'GET', headers, signal: controller.signal });
  } catch (falha) {
    const mensagem = falha?.name === 'AbortError'
      ? 'A SevenFlow demorou mais de 30 segundos para responder.'
      : 'Não foi possível conectar à API da SevenFlow.';
    throw erro(502, mensagem, 'SEVENFLOW_INDISPONIVEL');
  } finally {
    clearTimeout(timeout);
  }

  let corpo = null;
  try {
    corpo = await resposta.json();
  } catch {
    corpo = null;
  }

  if (!resposta.ok) {
    if ([401, 403].includes(resposta.status)) {
      throw erro(502, 'A credencial da SevenFlow é inválida, expirou ou não permite ler contatos.', 'SEVENFLOW_NAO_AUTORIZADA');
    }
    throw erro(502, corpo?.message || corpo?.error || `A SevenFlow respondeu com status ${resposta.status}.`, 'SEVENFLOW_ERRO');
  }

  return corpo;
}

async function carregarContatos({ ignorarCache = false } = {}) {
  const cfg = configuracao();
  if (!ignorarCache && cache && Date.now() - cache.criadoEm < cfg.cacheTtl) return cache;

  const contatosPorId = new Map();
  let totalInformado = null;

  for (let pagina = 1; pagina <= cfg.maxPaginas; pagina += 1) {
    const resposta = await requisitarSevenFlow('/contacts', {
      pageNumber: pagina,
      searchParam: '',
    }, cfg);
    const contatos = Array.isArray(resposta?.contacts)
      ? resposta.contacts
      : Array.isArray(resposta?.data?.contacts)
        ? resposta.data.contacts
        : [];

    if (totalInformado === null) {
      totalInformado = Number(resposta?.count ?? resposta?.data?.count);
      if (!Number.isFinite(totalInformado)) totalInformado = null;
    }

    contatos.forEach((contato, indice) => {
      if (contato?.isGroup || contato?.is_group) return;
      const chave = texto(contato?.id || contato?.uuid || contato?.contactId) || `${pagina}-${indice}`;
      contatosPorId.set(chave, contato);
    });

    if (!contatos.length || (totalInformado !== null && contatosPorId.size >= totalInformado)) break;
  }

  const contatos = [...contatosPorId.values()]
    .map((contato) => normalizarContato(contato, cfg))
    .filter((contato) => contato.interessado);

  cache = {
    criadoEm: Date.now(),
    atualizadoEm: new Date().toISOString(),
    contatos,
  };
  return cache;
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
    if (contato.whatsapp.replace(/\D/g, '').length >= 10) atual.comWhatsapp += 1;
    if (contato.vipHistorico) atual.vipsHistoricos += 1;
    distritos.set(chave, atual);
  });

  const grupos = [...distritos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return {
    resumo: {
      totalInteressados: dados.contatos.length,
      comWhatsapp: dados.contatos.filter((contato) => contato.whatsapp.replace(/\D/g, '').length >= 10).length,
      vipsHistoricos: dados.contatos.filter((contato) => contato.vipHistorico).length,
      totalDistritos: grupos.length,
    },
    distritos: grupos,
    atualizadoEm: dados.atualizadoEm,
  };
}

const InteressadosNovoTempoService = {
  async resumo({ atualizar = false } = {}) {
    return resumir(await carregarContatos({ ignorarCache: atualizar }));
  },

  async porDistrito(nomeDistrito, { atualizar = false } = {}) {
    const nome = texto(nomeDistrito);
    if (!nome) throw erro(400, 'Informe o distrito.', 'DISTRITO_OBRIGATORIO');

    const dados = await carregarContatos({ ignorarCache: atualizar });
    const chave = chaveNormalizada(nome);
    const contatos = dados.contatos
      .filter((contato) => chaveNormalizada(contato.distrito) === chave)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    if (!contatos.length) throw erro(404, 'Nenhum interessado encontrado para este distrito.', 'DISTRITO_SEM_INTERESSADOS');

    return {
      distrito: contatos[0].distrito,
      resumo: {
        totalInteressados: contatos.length,
        comWhatsapp: contatos.filter((contato) => contato.whatsapp.replace(/\D/g, '').length >= 10).length,
        vipsHistoricos: contatos.filter((contato) => contato.vipHistorico).length,
      },
      leads: contatos,
      atualizadoEm: dados.atualizadoEm,
    };
  },

  statusConfiguracao() {
    const cfg = configuracao();
    return {
      configurada: Boolean(cfg.token || cfg.licenseKey),
      apiUrl: cfg.apiUrl,
      autenticacao: cfg.token ? 'Bearer token' : cfg.licenseKey ? 'License key' : null,
      cacheTtlMs: cfg.cacheTtl,
    };
  },

  _internals: {
    chaveNormalizada,
    extrairCamposAdicionais,
    extrairTags,
    normalizarContato,
    resumir,
  },
};

module.exports = InteressadosNovoTempoService;
