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

function booleano(valor) {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor === 1;
  return ['1', 'true', 'sim', 'yes'].includes(chaveNormalizada(valor));
}

function booleanoOuNulo(valor) {
  return valor === null || valor === undefined || valor === '' ? null : booleano(valor);
}

function numeroOuNulo(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function coordenada(valor, minimo, maximo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(String(valor).replace(',', '.'));
  return Number.isFinite(numero) && numero >= minimo && numero <= maximo ? numero : null;
}

function extrairCoordenadas(registro = {}) {
  const bruto = registro.raw && typeof registro.raw === 'object' ? registro.raw : {};
  const local = registro.location || registro.geolocation || bruto.location || bruto.geolocation || {};
  const vetor = registro.coordinates || bruto.coordinates || local.coordinates;
  const latitude = coordenada(
    registro.lat ?? registro.latitude ?? bruto.lat ?? bruto.latitude ?? local.lat ?? local.latitude
      ?? (Array.isArray(vetor) ? vetor[1] : null),
    -90,
    90
  );
  const longitude = coordenada(
    registro.lng ?? registro.lon ?? registro.longitude ?? bruto.lng ?? bruto.lon ?? bruto.longitude
      ?? local.lng ?? local.lon ?? local.longitude ?? (Array.isArray(vetor) ? vetor[0] : null),
    -180,
    180
  );
  return { latitude, longitude };
}

function camposAdicionais(registro) {
  const conhecidos = new Set([
    'id', 'n', 'name', 'nome', 't', 'tel', 'phone', 'telefone', 'whatsapp', 'd', 'district', 'distrito',
    'v', 'vip', 'vipHistorico', 'p', 'priority', 'prioridade', 's', 'score', 'e', 'hasActiveStudy',
    'birthDate', 'dataNascimento', 'address', 'endereco', 'end', 'materialName', 'materialPrincipal',
    'material', 'tm', 'email', 'em', 'status', 'source', 'origem', 'observations', 'notes', 'observacoes',
    'createdAt', 'created_at', 'updatedAt', 'updated_at', 'tags', 'a', 'idade',
    'lat', 'lng', 'lon', 'latitude', 'longitude', 'coordinates', 'location', 'geolocation',
    'geoPrecision', 'geoSource', 'geoDisplayName',
    'cidade', 'city', 'municipio', 'bairro', 'neighborhood', 'neighbourhood',
  ]);

  return Object.fromEntries(
    Object.entries(registro || {}).filter(([nome, valor]) => !conhecidos.has(nome) && valor !== null && valor !== '')
  );
}

function normalizarRegistro(registro) {
  const telefoneInformado = registro?.tel || registro?.whatsapp || registro?.phone || registro?.telefone;
  const whatsapp = texto(telefoneInformado || (texto(registro?.t).replace(/\D/g, '').length >= 10 ? registro.t : ''));
  const distrito = texto(registro?.d || registro?.distrito || registro?.district) || 'Sem distrito';
  const prioridade = texto(registro?.p || registro?.prioridade || registro?.priority);
  const material = texto(registro?.materialName || registro?.materialPrincipal || registro?.material || registro?.tm);
  const email = texto(registro?.em || registro?.email);
  const bruto = registro?.raw && typeof registro.raw === 'object' ? registro.raw : {};
  const temWhatsapp = booleano(registro?.temTelefone ?? registro?.t ?? Boolean(whatsapp));
  const { latitude, longitude } = extrairCoordenadas(registro);

  return {
    id: texto(registro?.id || registro?.uuid),
    nome: texto(registro?.n || registro?.nome || registro?.name) || `Contato ${whatsapp.slice(-4)}`,
    whatsapp,
    email,
    distrito,
    temWhatsapp,
    vipHistorico: booleano(registro?.v ?? registro?.vipHistorico ?? registro?.vip),
    estudoAtivo: booleano(registro?.e ?? registro?.estudoAtivo ?? registro?.hasActiveStudy),
    prioridade,
    prioridadeRotulo: texto(registro?.priorityLabel),
    pontuacao: numeroOuNulo(registro?.s ?? registro?.score),
    genero: texto(registro?.g || registro?.genero),
    religiao: texto(registro?.r || registro?.religiao),
    idade: numeroOuNulo(registro?.a ?? registro?.idade),
    diasSemContato: numeroOuNulo(registro?.c ?? bruto?.c),
    status: texto(registro?.status),
    origem: texto(registro?.source || registro?.origem),
    endereco: texto(registro?.address || registro?.endereco || registro?.end),
    material,
    materiaisQuantidade: numeroOuNulo(registro?.m ?? registro?.materiaisQuantidade) || 0,
    cidade: texto(registro?.cidade || registro?.city || registro?.municipio || bruto?.cidade || bruto?.city),
    bairro: texto(registro?.bairro || registro?.neighborhood || registro?.neighbourhood || bruto?.bairro || bruto?.neighborhood),
    canal: texto(registro?.canal),
    telefoneValido: booleano(registro?.telefoneValido ?? temWhatsapp),
    emailValido: booleano(registro?.emailValido ?? Boolean(email)),
    temDescricao: booleano(registro?.temDescricao ?? Boolean(registro?.descricao || registro?.observacoes)),
    tentativaContato: booleanoOuNulo(registro?.tentativaContato),
    respondeu: booleanoOuNulo(registro?.respondeu),
    demonstrouInteresse: booleanoOuNulo(registro?.demonstrouInteresse),
    aceitouVisita: booleanoOuNulo(registro?.aceitouVisita),
    participou: booleanoOuNulo(registro?.participou),
    dataNascimento: registro?.birthDate || registro?.dataNascimento || null,
    latitude,
    longitude,
    geoPrecisao: texto(registro?.geoPrecision || bruto?.geoPrecision),
    geoOrigem: texto(registro?.geoSource || bruto?.geoSource),
    geoNomeExibicao: texto(registro?.geoDisplayName || bruto?.geoDisplayName),
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
  // A visão geral do Amigos NT calcula seus indicadores sobre `records`.
  // `interestRecords` é apenas um recorte usado pelas telas de detalhamento.
  if (Array.isArray(raiz.records)) return raiz.records;

  if (Array.isArray(raiz.interestRecords)) return raiz.interestRecords;

  if (raiz.interestRecordsByDistrict && typeof raiz.interestRecordsByDistrict === 'object') {
    return Object.values(raiz.interestRecordsByDistrict).flatMap((registros) => (
      Array.isArray(registros) ? registros : []
    ));
  }

  return [];
}

function extrairTerritorio(dashboard) {
  const raiz = dashboard?.data || dashboard || {};
  const territorio = raiz?.meta?.territory || {};
  const distritosOficiais = Array.isArray(territorio.districts) ? territorio.districts : [];
  const nomes = new Map(distritosOficiais.map((item) => {
    const nome = texto(typeof item === 'string' ? item : item?.name || item?.nome || item?.label);
    const identificador = texto(typeof item === 'object' ? item?.slug || item?.id : '') || slug(nome);
    return [identificador, nome];
  }));

  const igrejas = Object.entries(territorio.churchesByDistrict || {}).flatMap(([distritoSlug, itens]) => (
    (Array.isArray(itens) ? itens : []).map((item) => {
      const igreja = typeof item === 'string' ? { name: item } : (item || {});
      const { latitude, longitude } = extrairCoordenadas(igreja);
      return {
        nome: texto(igreja.name || igreja.nome) || 'Igreja Adventista',
        endereco: texto(igreja.address || igreja.endereco),
        distrito: nomes.get(distritoSlug) || texto(igreja.districtName || igreja.distrito) || distritoSlug,
        distritoSlug,
        latitude,
        longitude,
        geoPrecisao: texto(igreja.geoPrecision),
        geoOrigem: texto(igreja.geoSource),
        geoNomeExibicao: texto(igreja.geoDisplayName),
      };
    })
  ));

  return { distritosOficiais, igrejas };
}

async function carregarResumo({ ignorarCache = false } = {}) {
  const cfg = configuracao();
  if (!ignorarCache && cacheResumo && Date.now() - cacheResumo.criadoEm < cfg.cacheTtl) return cacheResumo;

  const dashboard = await requisitar('/api/dashboard', cfg);
  const contatos = registrosInteressados(dashboard).map(normalizarRegistro);
  const territorio = extrairTerritorio(dashboard);

  cacheResumo = {
    criadoEm: Date.now(),
    atualizadoEm: new Date().toISOString(),
    contatos,
    ...territorio,
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
      quentes: 0,
      potenciais: 0,
      mornos: 0,
      frios: 0,
      estudosAtivos: 0,
    };
    atual.total += 1;
    if (contato.temWhatsapp) atual.comWhatsapp += 1;
    if (contato.vipHistorico) atual.vipsHistoricos += 1;
    const prioridade = chaveNormalizada(contato.prioridade);
    if (prioridade === 'hot') atual.quentes += 1;
    if (prioridade === 'warm') atual.potenciais += 1;
    if (prioridade === 'cool') atual.mornos += 1;
    if (prioridade === 'cold') atual.frios += 1;
    if (contato.estudoAtivo) atual.estudosAtivos += 1;
    distritos.set(chave, atual);
  });

  const grupos = [...distritos.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return {
    resumo: {
      totalInteressados: dados.contatos.length,
      comWhatsapp: dados.contatos.filter((contato) => contato.temWhatsapp).length,
      vipsHistoricos: dados.contatos.filter((contato) => contato.vipHistorico).length,
      quentes: dados.contatos.filter((contato) => chaveNormalizada(contato.prioridade) === 'hot').length,
      potenciais: dados.contatos.filter((contato) => chaveNormalizada(contato.prioridade) === 'warm').length,
      mornos: dados.contatos.filter((contato) => chaveNormalizada(contato.prioridade) === 'cool').length,
      frios: dados.contatos.filter((contato) => chaveNormalizada(contato.prioridade) === 'cold').length,
      estudosAtivos: dados.contatos.filter((contato) => contato.estudoAtivo).length,
      totalDistritos: grupos.length,
    },
    distritos: grupos,
    atualizadoEm: dados.atualizadoEm,
  };
}

function prioridadeCanonica(valor) {
  return ({ hot: 'Hot', warm: 'Warm', cool: 'Cool', cold: 'Cold' })[chaveNormalizada(valor)] || 'Cold';
}

function faixaSemContato(dias) {
  if (dias === null) return 'Não informado';
  if (dias <= 90) return 'Até 3 meses';
  if (dias <= 365) return '3 meses a 1 ano';
  if (dias <= 730) return '1 a 2 anos';
  if (dias <= 1825) return '2 a 5 anos';
  return '5+ anos';
}

function contarPor(contatos, seletor, limite = null) {
  const mapa = new Map();
  contatos.forEach((contato) => {
    const nome = texto(seletor(contato)) || 'Não informado';
    mapa.set(nome, (mapa.get(nome) || 0) + 1);
  });
  const lista = [...mapa.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
  return limite ? lista.slice(0, limite) : lista;
}

function aplicarFiltrosAnalise(contatos, filtros = {}) {
  return contatos.filter((contato) => {
    if (filtros.distrito && filtros.distrito !== 'todos'
      && chaveNormalizada(contato.distrito) !== chaveNormalizada(filtros.distrito)) return false;
    if (filtros.prioridade && filtros.prioridade !== 'todos'
      && prioridadeCanonica(contato.prioridade) !== filtros.prioridade) return false;
    if (['0', '1'].includes(filtros.vip) && contato.vipHistorico !== (filtros.vip === '1')) return false;
    if (['0', '1'].includes(filtros.whatsapp) && contato.temWhatsapp !== (filtros.whatsapp === '1')) return false;
    if (['0', '1'].includes(filtros.estudos) && contato.estudoAtivo !== (filtros.estudos === '1')) return false;
    if (filtros.genero && filtros.genero !== 'todos'
      && chaveNormalizada(contato.genero) !== chaveNormalizada(filtros.genero)) return false;
    return true;
  });
}

function analisarContatos(contatos, filtros = {}) {
  const filtrados = aplicarFiltrosAnalise(contatos, filtros);
  const prioridades = { Hot: 0, Warm: 0, Cool: 0, Cold: 0 };
  const distritos = new Map();

  filtrados.forEach((contato) => {
    const prioridade = prioridadeCanonica(contato.prioridade);
    prioridades[prioridade] += 1;
    const chave = chaveNormalizada(contato.distrito) || 'sem distrito';
    const atual = distritos.get(chave) || {
      nome: contato.distrito,
      total: 0,
      comWhatsapp: 0,
      quentes: 0,
      potenciais: 0,
      mornos: 0,
      frios: 0,
      vips: 0,
      estudos: 0,
      semContato5Anos: 0,
      somaPontuacao: 0,
      pontuados: 0,
    };
    atual.total += 1;
    if (contato.temWhatsapp) atual.comWhatsapp += 1;
    if (prioridade === 'Hot') atual.quentes += 1;
    if (prioridade === 'Warm') atual.potenciais += 1;
    if (prioridade === 'Cool') atual.mornos += 1;
    if (prioridade === 'Cold') atual.frios += 1;
    if (contato.vipHistorico) atual.vips += 1;
    if (contato.estudoAtivo) atual.estudos += 1;
    if (contato.diasSemContato !== null && contato.diasSemContato > 1825) atual.semContato5Anos += 1;
    if (contato.pontuacao !== null) {
      atual.somaPontuacao += contato.pontuacao;
      atual.pontuados += 1;
    }
    distritos.set(chave, atual);
  });

  const listaDistritos = [...distritos.values()]
    .map((distrito) => ({
      ...distrito,
      pontuacaoMedia: distrito.pontuados
        ? Number((distrito.somaPontuacao / distrito.pontuados).toFixed(1))
        : 0,
    }))
    .map(({ somaPontuacao, pontuados, ...distrito }) => distrito)
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));

  const maior = (campo) => [...listaDistritos].sort((a, b) => b[campo] - a[campo])[0] || null;
  return {
    resumo: {
      total: filtrados.length,
      comWhatsapp: filtrados.filter((contato) => contato.temWhatsapp).length,
      quentes: prioridades.Hot,
      potenciais: prioridades.Warm,
      mornos: prioridades.Cool,
      frios: prioridades.Cold,
      vips: filtrados.filter((contato) => contato.vipHistorico).length,
      estudos: filtrados.filter((contato) => contato.estudoAtivo).length,
      distritos: listaDistritos.length,
    },
    prioridades: [
      { nome: 'Quentes', total: prioridades.Hot, cor: '#f97316' },
      { nome: 'Potenciais', total: prioridades.Warm, cor: '#f59e0b' },
      { nome: 'Mornos', total: prioridades.Cool, cor: '#3b82f6' },
      { nome: 'Frios', total: prioridades.Cold, cor: '#64748b' },
    ],
    religioes: contarPor(filtrados, (contato) => contato.religiao, 10),
    tempoSemContato: contarPor(filtrados, (contato) => faixaSemContato(contato.diasSemContato)),
    distritos: listaDistritos,
    prioridadesAcao: [
      { titulo: 'Atacar agora', distrito: maior('quentes')?.nome, total: maior('quentes')?.quentes || 0, descricao: 'contatos quentes para priorizar', cor: '#f97316' },
      { titulo: 'Maior potencial', distrito: maior('potenciais')?.nome, total: maior('potenciais')?.potenciais || 0, descricao: 'contatos potenciais no funil', cor: '#f59e0b' },
      { titulo: 'Base VIP', distrito: maior('vips')?.nome, total: maior('vips')?.vips || 0, descricao: 'VIPs para relacionamento', cor: '#8b5cf6' },
      { titulo: 'Recuperação', distrito: maior('semContato5Anos')?.nome, total: maior('semContato5Anos')?.semContato5Anos || 0, descricao: 'contatos há 5+ anos sem contato', cor: '#dc2626' },
    ].filter((item) => item.distrito),
    filtrosDisponiveis: {
      distritos: [...new Set(contatos.map((contato) => contato.distrito))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
      generos: [...new Set(contatos.map((contato) => contato.genero).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    },
  };
}

function grupo(nome, contatos) {
  return { nome, total: contatos.length };
}

function analisarDistrito(dados) {
  const contatos = dados.leads;
  const analiseBase = analisarContatos(contatos);
  const comTelefone = contatos.filter((contato) => contato.temWhatsapp);
  const comEmail = contatos.filter((contato) => Boolean(contato.email));
  const porBooleano = (campo, sim, nao) => [
    grupo(sim, contatos.filter((contato) => contato[campo] === true)),
    grupo(nao, contatos.filter((contato) => contato[campo] === false)),
    grupo('Sem informação', contatos.filter((contato) => contato[campo] === null || contato[campo] === undefined)),
  ];

  return {
    distrito: dados.distrito,
    atualizadoEm: dados.atualizadoEm,
    resumo: analiseBase.resumo,
    prioridades: analiseBase.prioridades,
    religioes: contarPor(contatos, (contato) => contato.religiao, 10),
    tempoSemContato: analiseBase.tempoSemContato,
    funil: [
      grupo('Base', contatos),
      grupo('Tentativa', contatos.filter((contato) => contato.tentativaContato === true)),
      grupo('Respondeu', contatos.filter((contato) => contato.respondeu === true)),
      grupo('Interesse', contatos.filter((contato) => contato.demonstrouInteresse === true)),
      grupo('Aceitou visita', contatos.filter((contato) => contato.aceitouVisita === true)),
      grupo('Participou', contatos.filter((contato) => contato.participou === true)),
    ],
    qualidadeContato: [
      grupo('Telefone e e-mail válidos', contatos.filter((contato) => contato.telefoneValido && contato.emailValido)),
      grupo('Só telefone válido', contatos.filter((contato) => contato.telefoneValido && !contato.emailValido)),
      grupo('Só e-mail válido', contatos.filter((contato) => !contato.telefoneValido && contato.emailValido)),
      grupo('Sem contato válido', contatos.filter((contato) => !contato.telefoneValido && !contato.emailValido)),
    ],
    qualidadeTelefone: [
      grupo('Telefone válido', contatos.filter((contato) => contato.temWhatsapp && contato.telefoneValido)),
      grupo('Telefone inválido', contatos.filter((contato) => contato.temWhatsapp && !contato.telefoneValido)),
      grupo('Sem telefone', contatos.filter((contato) => !contato.temWhatsapp)),
    ],
    qualidadeEmail: [
      grupo('E-mail válido', contatos.filter((contato) => contato.email && contato.emailValido)),
      grupo('E-mail inválido', contatos.filter((contato) => contato.email && !contato.emailValido)),
      grupo('Sem e-mail', contatos.filter((contato) => !contato.email)),
    ],
    descricao: [
      grupo('Com descrição', contatos.filter((contato) => contato.temDescricao)),
      grupo('Sem descrição', contatos.filter((contato) => !contato.temDescricao)),
    ],
    vipHistorico: [
      grupo('VIP histórico', contatos.filter((contato) => contato.vipHistorico)),
      grupo('Não VIP', contatos.filter((contato) => !contato.vipHistorico)),
    ],
    tentativas: porBooleano('tentativaContato', 'Tentativa registrada', 'Sem tentativa'),
    respostas: porBooleano('respondeu', 'Respondeu', 'Não respondeu'),
    interesse: porBooleano('demonstrouInteresse', 'Demonstrou interesse', 'Não demonstrou'),
    visitas: porBooleano('aceitouVisita', 'Aceitou visita', 'Não aceitou'),
    participacao: porBooleano('participou', 'Participou', 'Não participou'),
    materiaisQuantidade: [
      grupo('1 material', contatos.filter((contato) => contato.materiaisQuantidade === 1)),
      grupo('2 materiais', contatos.filter((contato) => contato.materiaisQuantidade === 2)),
      grupo('3 ou mais', contatos.filter((contato) => contato.materiaisQuantidade >= 3)),
      grupo('Sem material', contatos.filter((contato) => !contato.materiaisQuantidade)),
    ],
    canais: contarPor(contatos, (contato) => contato.canal, 10),
    cidades: contarPor(contatos, (contato) => contato.cidade, 10),
    bairros: contarPor(contatos, (contato) => contato.bairro, 10),
    materiais: contarPor(contatos, (contato) => contato.material, 10),
    contatos: { comTelefone: comTelefone.length, comEmail: comEmail.length },
    leads: [...contatos].sort((a, b) => (b.pontuacao || 0) - (a.pontuacao || 0) || a.nome.localeCompare(b.nome, 'pt-BR')),
  };
}

const InteressadosNovoTempoService = {
  async resumo({ atualizar = false } = {}) {
    return resumir(await carregarResumo({ ignorarCache: atualizar }));
  },

  async filtragemAvancada({ atualizar = false } = {}) {
    const dados = await carregarResumo({ ignorarCache: atualizar });
    const leads = dados.contatos.map((contato) => ({
      id: contato.id,
      nome: contato.nome,
      whatsapp: contato.whatsapp,
      email: contato.email,
      distrito: contato.distrito,
      bairro: contato.bairro,
      cidade: contato.cidade,
      material: contato.material,
      prioridade: prioridadeCanonica(contato.prioridade),
      genero: contato.genero,
      religiao: contato.religiao,
      idade: contato.idade,
      dataNascimento: contato.dataNascimento,
      temWhatsapp: contato.temWhatsapp,
      emailValido: contato.emailValido,
      estudoAtivo: contato.estudoAtivo,
      vipHistorico: contato.vipHistorico,
      diasSemContato: contato.diasSemContato,
      latitude: contato.latitude,
      longitude: contato.longitude,
      geoPrecisao: contato.geoPrecisao,
      geoOrigem: contato.geoOrigem,
      geoNomeExibicao: contato.geoNomeExibicao,
    }));

    return {
      atualizadoEm: dados.atualizadoEm,
      total: leads.length,
      leads,
      igrejas: dados.igrejas || [],
      distritosOficiais: dados.distritosOficiais || [],
    };
  },

  async analise(filtros = {}, { atualizar = false } = {}) {
    const dados = await carregarResumo({ ignorarCache: atualizar });
    return { ...analisarContatos(dados.contatos, filtros), atualizadoEm: dados.atualizadoEm };
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
        comWhatsapp: contatos.filter((contato) => contato.temWhatsapp).length,
        vipsHistoricos: contatos.filter((contato) => contato.vipHistorico).length,
        quentes: contatos.filter((contato) => chaveNormalizada(contato.prioridade) === 'hot').length,
        potenciais: contatos.filter((contato) => chaveNormalizada(contato.prioridade) === 'warm').length,
        mornos: contatos.filter((contato) => chaveNormalizada(contato.prioridade) === 'cool').length,
        frios: contatos.filter((contato) => chaveNormalizada(contato.prioridade) === 'cold').length,
        estudosAtivos: contatos.filter((contato) => contato.estudoAtivo).length,
      },
      leads: contatos,
      atualizadoEm: dados.atualizadoEm,
    };
  },

  async analisePorDistrito(nomeDistrito, { atualizar = false } = {}) {
    return analisarDistrito(await this.porDistrito(nomeDistrito, { atualizar }));
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
    extrairTerritorio,
    resumir,
    analisarContatos,
    analisarDistrito,
  },
};

module.exports = InteressadosNovoTempoService;
