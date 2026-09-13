const API_URL_PADRAO = 'https://backend-leadsnt.sevenflowia.tech';
const CACHE_TTL_PADRAO = 5 * 60 * 1000;
const CENTROS_TERRITORIAIS = {
  'sao-paulo': [-23.55052, -46.63331],
  osasco: [-23.53288, -46.79178],
  carapicuiba: [-23.52272, -46.835],
  barueri: [-23.51056, -46.87611],
  jandira: [-23.5275, -46.9025],
  itapevi: [-23.5488, -46.9336],
  cotia: [-23.6039, -46.9192],
  ibiuna: [-23.6596, -47.222],
  mairinque: [-23.5458, -47.1833],
  'sao-roque': [-23.5292, -47.1353],
  'santana-de-parnaiba': [-23.4439, -46.9178],
  aracariguama: [-23.4366, -47.0608],
  aluminio: [-23.5306, -47.2547],
  mirandopolis: [-23.6093, -46.6413],
};
const prisma = require('../lib/prisma');
const { PERFIS, ehAdmin } = require('../middlewares/auth');

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

const chaveCampo = (valor) => chaveNormalizada(valor).replace(/\s+/g, '');

function informado(valor) {
  if (valor === null || valor === undefined || valor === '') return false;
  if (typeof valor !== 'string') return true;
  return !['n i', 'nao informado', 'nao informada', 'sem informacao'].includes(chaveNormalizada(valor));
}

function fontesDoRegistro(registro) {
  const fontes = [];
  const visitados = new Set();
  const fila = [{ valor: registro, profundidade: 0 }];

  while (fila.length) {
    const { valor, profundidade } = fila.shift();
    if (!valor || typeof valor !== 'object' || Array.isArray(valor) || visitados.has(valor)) continue;
    visitados.add(valor);
    fontes.push(valor);
    if (profundidade >= 3) continue;
    Object.values(valor).forEach((filho) => {
      if (filho && typeof filho === 'object' && !Array.isArray(filho)) {
        fila.push({ valor: filho, profundidade: profundidade + 1 });
      }
    });
  }

  return fontes;
}

function localizarCampo(registro, aliases) {
  const chaves = new Set(aliases.map(chaveCampo));
  for (const fonte of fontesDoRegistro(registro)) {
    for (const [nome, valor] of Object.entries(fonte)) {
      if (chaves.has(chaveCampo(nome)) && informado(valor)) return valor;
    }
  }
  return '';
}

function textoDeCampo(registro, aliases) {
  const valor = localizarCampo(registro, aliases);
  return typeof valor === 'object' ? '' : texto(valor);
}

function montarEndereco(registro) {
  const enderecoDireto = localizarCampo(registro, [
    'addr', 'newAddress', 'address', 'endereco', 'enderecoCompleto', 'fullAddress', 'formattedAddress',
    'displayAddress', 'streetAddress', 'localizacao',
  ]);
  if (typeof enderecoDireto !== 'object' && texto(enderecoDireto)) return texto(enderecoDireto);

  const fonte = enderecoDireto && typeof enderecoDireto === 'object'
    ? { ...registro, enderecoEstruturado: enderecoDireto }
    : registro;
  const logradouro = textoDeCampo(fonte, ['logradouro', 'rua', 'street', 'streetName', 'addressLine', 'addressLine1']);
  const numeroEndereco = textoDeCampo(fonte, ['numeroEndereco', 'numero', 'number', 'streetNumber', 'houseNumber']);
  const complemento = textoDeCampo(fonte, ['complemento', 'complement', 'addressLine2']);
  const bairro = textoDeCampo(fonte, ['bairro', 'neighborhood', 'neighbourhood', 'districtNeighborhood']);
  const cidade = textoDeCampo(fonte, ['cidade', 'city', 'municipio', 'municipality']);
  const estado = textoDeCampo(fonte, ['estado', 'state', 'uf']);
  const cep = textoDeCampo(fonte, ['cep', 'postalCode', 'zipCode', 'zipcode']);

  const linha = [logradouro, numeroEndereco].filter(Boolean).join(', ');
  const localidade = [bairro, cidade, estado].filter(Boolean).join(' - ');
  const composto = [linha, complemento, localidade, cep && `CEP ${cep}`].filter(Boolean).join(' - ');
  if (composto) return composto;

  const enderecoResumido = textoDeCampo(registro, ['end']);
  if (enderecoResumido) return enderecoResumido;

  return textoDeCampo(registro, ['geoDisplayName', 'displayName', 'nomeExibicaoGeografico']);
}

const slug = (valor) => chaveNormalizada(valor).replace(/\s+/g, '-');

function erro(status, mensagem, codigo) {
  const falha = new Error(mensagem);
  falha.status = status;
  falha.mensagem = mensagem;
  falha.codigo = codigo;
  return falha;
}

async function obterEscopoTerritorial(usuario) {
  if (usuario && ehAdmin(usuario.perfil)) return { acessoTotal: true, distritos: null };

  let distritos = [];
  if ([PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL].includes(usuario?.perfil)) {
    if (!usuario.regiaoId) {
      throw erro(403, 'Seu usuário não possui uma região vinculada.', 'ESCOPO_NT_NAO_CONFIGURADO');
    }
    distritos = await prisma.distrito.findMany({
      where: { regiaoId: Number(usuario.regiaoId) },
      select: { nome: true },
    });
  } else if (usuario?.perfil === PERFIS.PASTOR_DISTRITAL) {
    if (!usuario.distritoId) {
      throw erro(403, 'Seu usuário não possui um distrito vinculado.', 'ESCOPO_NT_NAO_CONFIGURADO');
    }
    const distrito = await prisma.distrito.findUnique({
      where: { id: Number(usuario.distritoId) },
      select: { nome: true },
    });
    if (distrito) distritos = [distrito];
  } else if (usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
    if (!usuario.igrejaId) {
      throw erro(403, 'Seu usuário não possui uma igreja vinculada.', 'ESCOPO_NT_NAO_CONFIGURADO');
    }
    const igreja = await prisma.igreja.findUnique({
      where: { id: Number(usuario.igrejaId) },
      select: { distrito: { select: { nome: true } } },
    });
    if (igreja?.distrito) distritos = [igreja.distrito];
  } else if (usuario?.perfil === PERFIS.DUPLA_MISSIONARIA) {
    let distritoId = usuario.distritoId;
    if (!distritoId && usuario.duplaId) {
      const dupla = await prisma.dupla.findUnique({
        where: { id: Number(usuario.duplaId) },
        select: { distritoId: true },
      });
      distritoId = dupla?.distritoId;
    }
    if (!distritoId) {
      throw erro(403, 'Sua dupla missionária não possui um distrito vinculado.', 'ESCOPO_NT_NAO_CONFIGURADO');
    }
    const distrito = await prisma.distrito.findUnique({
      where: { id: Number(distritoId) },
      select: { nome: true },
    });
    if (distrito) distritos = [distrito];
  } else {
    throw erro(403, 'Seu perfil não possui acesso aos interessados do Novo Tempo.', 'ESCOPO_NT_NEGADO');
  }

  const nomes = distritos.map(({ nome }) => texto(nome)).filter(Boolean);
  if (!nomes.length) {
    throw erro(403, 'Não foi possível identificar os distritos do seu acesso.', 'ESCOPO_NT_NAO_CONFIGURADO');
  }

  return {
    acessoTotal: false,
    distritos: new Set(nomes.map(chaveNormalizada)),
  };
}

function nomeDistritoOficial(item) {
  return texto(typeof item === 'string' ? item : item?.name || item?.nome || item?.label);
}

function aplicarEscopoTerritorial(dados, escopo) {
  if (escopo.acessoTotal) return dados;
  const permitido = (nome) => escopo.distritos.has(chaveNormalizada(nome));
  return {
    ...dados,
    contatos: dados.contatos.filter((contato) => permitido(contato.distrito)),
    igrejas: (dados.igrejas || []).filter((igreja) => permitido(igreja.distrito)),
    distritosOficiais: (dados.distritosOficiais || []).filter((distrito) => permitido(nomeDistritoOficial(distrito))),
  };
}

function validarDistritoNoEscopo(nomeDistrito, escopo) {
  if (!escopo.acessoTotal && !escopo.distritos.has(chaveNormalizada(nomeDistrito))) {
    throw erro(403, 'Acesso negado: distrito fora do seu escopo.', 'DISTRITO_FORA_DO_ESCOPO');
  }
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
    'birthDate', 'dataNascimento', 'addr', 'newAddress', 'address', 'endereco', 'end', 'materialName',
    'materialPrincipal', 'material', 'tm', 'email', 'em', 'status', 'source', 'origem',
    'description', 'descricao', 'desc', 'observations', 'notes', 'observacoes',
    'createdAt', 'created_at', 'updatedAt', 'updated_at', 'tags', 'a', 'idade', 'g', 'r',
    'lat', 'lng', 'lon', 'latitude', 'longitude', 'coordinates', 'location', 'geolocation',
    'geoPrecision', 'geoSource', 'geoDisplayName', 'geoNotFound',
    'cidade', 'city', 'municipio', 'bairro', 'b', 'neighborhood', 'neighbourhood',
    'm', 'materialCount', 'materiaisQuantidade', 'c', 'daysSinceLastContact', 'diasSemContato',
    'lastContactDate', 'lastContactAt', 'ultimoContato', 'dataUltimoContato',
    'requestDate', 'requestedAt', 'dataSolicitacao', 'dataPedido',
    'ml', 'machineLearningScore', 'modelScore', 'pontuacaoModelo',
    'sim', 'similarity', 'similaridadeVip', 'band', 'faixa',
    'temTelefone', 'hasPhone', 'hasWhatsapp', 'telefoneValido', 'emailValido', 'temEmail',
    'temDescricao', 'tentativaContato', 'respondeu', 'demonstrouInteresse', 'aceitouVisita', 'participou',
  ].map(chaveCampo));

  return Object.fromEntries(
    Object.entries(registro || {}).filter(([nome, valor]) => !conhecidos.has(chaveCampo(nome)) && valor !== null && valor !== '')
  );
}

function partesEnderecoResumido(registro) {
  return textoDeCampo(registro, ['end'])
    .split(/\s+-\s+/)
    .map((parte) => texto(parte))
    .filter(Boolean);
}

function cidadeDoRegistro(registro) {
  const explicita = textoDeCampo(registro, ['cidade', 'city', 'municipio', 'municipality']);
  if (explicita) return explicita;
  const primeiraParte = partesEnderecoResumido(registro)[0] || '';
  return CENTROS_TERRITORIAIS[slug(primeiraParte)] ? primeiraParte : '';
}

function bairroDoRegistro(registro, endereco, distrito, cidade) {
  const explicito = texto(registro?.b || textoDeCampo(registro, [
    'bairro', 'neighborhood', 'neighbourhood', 'districtNeighborhood',
  ]));
  if (explicito) return explicito;

  const partes = partesEnderecoResumido(registro);
  if (partes.length > 1 && CENTROS_TERRITORIAIS[slug(partes[0])]) return partes[1];
  return extrairBairroDoEndereco(endereco, distrito, cidade);
}

function normalizarGenero(valor) {
  const original = texto(valor);
  const chave = chaveNormalizada(original);
  if (['m', 'masculino', 'male'].includes(chave)) return { genero: 'Masculino', generoCodigo: 'M' };
  if (['f', 'feminino', 'female'].includes(chave)) return { genero: 'Feminino', generoCodigo: 'F' };
  return { genero: original, generoCodigo: original ? 'N' : '' };
}

function extrairBairroDoEndereco(endereco, distrito, cidade) {
  const valor = texto(endereco);
  if (!valor) return '';

  const rotulado = valor.match(/\bbairro\s*:?\s*([^,;]+?)(?=\s+-\s+|,?\s+(?:cidade|munic[ií]pio|cep)\b|$)/i);
  if (rotulado?.[1]) return texto(rotulado[1]).replace(/^[-–—\s]+|[-–—\s]+$/g, '');

  const ignorar = new Set([distrito, cidade, 'Brasil'].map(chaveNormalizada).filter(Boolean));
  const partes = valor.split(/\s+-\s+/).map((parte) => texto(parte).replace(/^,\s*|,\s*$/g, '')).filter(Boolean);
  return partes.slice(1).find((parte) => {
    const chave = chaveNormalizada(parte);
    return chave
      && !ignorar.has(chave)
      && !/^cep\b/i.test(parte)
      && !/^\d{5}-?\d{3}$/.test(parte)
      && !/^[a-z]{2}$/i.test(parte);
  }) || '';
}

function normalizarRegistro(registro) {
  const telefoneInformado = registro?.tel || registro?.whatsapp || registro?.phone || registro?.telefone
    || textoDeCampo(registro, ['telefoneCelular', 'celular', 'mobile', 'phoneNumber', 'numeroWhatsapp']);
  const whatsapp = texto(telefoneInformado || (texto(registro?.t).replace(/\D/g, '').length >= 10 ? registro.t : ''));
  const whatsappNumero = whatsapp.replace(/\D/g, '');
  const distrito = texto(registro?.d || textoDeCampo(registro, ['distrito', 'district', 'districtName'])) || 'Sem distrito';
  const prioridade = texto(registro?.p || textoDeCampo(registro, ['prioridade', 'priority', 'classification', 'classificacao']));
  const material = texto(registro?.tm || textoDeCampo(registro, ['materialPrincipal', 'material', 'mainMaterial', 'materialName', 'tm']));
  const materialRecebido = textoDeCampo(registro, ['materialName', 'receivedMaterial', 'materialRecebido']);
  const email = texto(registro?.em || textoDeCampo(registro, ['email', 'emailAddress']));
  const endereco = montarEndereco(registro);
  const cidade = cidadeDoRegistro(registro);
  const bairro = bairroDoRegistro(registro, endereco, distrito, cidade);
  const indicadorWhatsapp = localizarCampo(registro, ['temTelefone', 'hasPhone', 'hasWhatsapp']);
  const temWhatsapp = booleano(indicadorWhatsapp === ''
    ? (registro?.t ?? Boolean(whatsappNumero))
    : indicadorWhatsapp);
  const { latitude, longitude } = extrairCoordenadas(registro);
  const tags = localizarCampo(registro, ['tags', 'etiquetas']);
  const descricao = textoDeCampo(registro, ['description', 'descricao', 'desc', 'observations', 'notes', 'observacoes']);
  const diasSemContato = numeroOuNulo(registro?.c ?? localizarCampo(registro, ['c', 'daysSinceLastContact', 'diasSemContato']));
  const dataUltimoContato = localizarCampo(registro, [
    'lastContactDate', 'lastContactAt', 'ultimoContato', 'dataUltimoContato', 'ultimoContatoEm',
  ]) || null;
  const dataSolicitacao = localizarCampo(registro, ['requestDate', 'requestedAt', 'dataSolicitacao', 'dataPedido']) || null;
  const generoNormalizado = normalizarGenero(registro?.g || textoDeCampo(registro, ['g', 'genero', 'gender', 'sexo']));
  const tentativaContato = booleanoOuNulo(localizarCampo(registro, ['tentativaContato', 'contactAttempted']));
  const respondeu = booleanoOuNulo(localizarCampo(registro, ['respondeu', 'responded']));
  const demonstrouInteresse = booleanoOuNulo(localizarCampo(registro, ['demonstrouInteresse', 'showedInterest']));
  const aceitouVisita = booleanoOuNulo(localizarCampo(registro, ['aceitouVisita', 'acceptedVisit']));
  const participou = booleanoOuNulo(localizarCampo(registro, ['participou', 'participated']));

  const normalizado = {
    id: texto(registro?.id || registro?.uuid || textoDeCampo(registro, ['contactId', 'leadId'])),
    nome: texto(registro?.n || textoDeCampo(registro, ['nome', 'name', 'fullName'])) || `Contato ${whatsapp.slice(-4)}`,
    whatsapp,
    whatsappNumero,
    email,
    distrito,
    temWhatsapp,
    vipHistorico: booleano(registro?.v ?? localizarCampo(registro, ['vipHistorico', 'vip', 'isVip'])),
    estudoAtivo: booleano(registro?.e ?? localizarCampo(registro, ['estudoAtivo', 'hasActiveStudy', 'activeStudy'])),
    prioridade,
    prioridadeRotulo: textoDeCampo(registro, ['priorityLabel', 'prioridadeRotulo', 'classificationLabel']),
    pontuacao: numeroOuNulo(registro?.s ?? localizarCampo(registro, ['score', 'pontuacao'])),
    genero: generoNormalizado.genero,
    generoCodigo: generoNormalizado.generoCodigo,
    religiao: texto(registro?.r || textoDeCampo(registro, ['r', 'religiao', 'religion'])),
    idade: numeroOuNulo(registro?.a ?? localizarCampo(registro, ['a', 'idade', 'age'])),
    diasSemContato,
    dataUltimoContato,
    dataSolicitacao,
    status: textoDeCampo(registro, ['status', 'situacao']),
    origem: textoDeCampo(registro, ['source', 'origem', 'origin']),
    endereco,
    material,
    materialRecebido,
    materiaisQuantidade: numeroOuNulo(registro?.m ?? localizarCampo(registro, ['m', 'materialCount', 'materiaisQuantidade'])) || 0,
    cidade,
    bairro,
    canal: textoDeCampo(registro, ['canal', 'channel']),
    telefoneValido: booleano(localizarCampo(registro, ['telefoneValido', 'validPhone']) === ''
      ? temWhatsapp
      : localizarCampo(registro, ['telefoneValido', 'validPhone'])),
    emailValido: booleano(localizarCampo(registro, ['emailValido', 'validEmail']) === ''
      ? Boolean(email)
      : localizarCampo(registro, ['emailValido', 'validEmail'])),
    temDescricao: booleano(localizarCampo(registro, ['temDescricao', 'hasDescription']) === ''
      ? Boolean(descricao)
      : localizarCampo(registro, ['temDescricao', 'hasDescription'])),
    tentativaContato,
    respondeu,
    demonstrouInteresse,
    aceitouVisita,
    participou,
    dataNascimento: localizarCampo(registro, ['birthDate', 'dataNascimento', 'dataAniversario', 'birthday']) || null,
    pontuacaoModelo: numeroOuNulo(registro?.ml ?? localizarCampo(registro, ['ml', 'machineLearningScore', 'modelScore', 'pontuacaoModelo'])),
    similaridadeVip: numeroOuNulo(registro?.sim ?? localizarCampo(registro, ['sim', 'similarity', 'similaridadeVip'])),
    faixa: texto(registro?.faixa || textoDeCampo(registro, ['faixa', 'band', 'faixaPontuacao'])),
    latitude,
    longitude,
    geoPrecisao: textoDeCampo(registro, ['geoPrecision', 'geoPrecisao']),
    geoOrigem: textoDeCampo(registro, ['geoSource', 'geoOrigem']),
    geoNomeExibicao: textoDeCampo(registro, ['geoDisplayName', 'displayName', 'nomeExibicaoGeografico']),
    geoNaoEncontrada: booleano(localizarCampo(registro, ['geoNotFound', 'geoNaoEncontrada'])),
    observacoes: descricao,
    criadoEm: localizarCampo(registro, ['createdAt', 'created_at', 'criadoEm']) || null,
    atualizadoEm: localizarCampo(registro, ['updatedAt', 'updated_at', 'atualizadoEm']) || null,
    tags: Array.isArray(tags) ? tags : [],
    camposAdicionais: camposAdicionais(registro),
  };

  normalizado.acompanhamento = {
    ultimoContatoEm: dataUltimoContato,
    diasSemContato,
    tentativaContato,
    respondeu,
    demonstrouInteresse,
    aceitouVisita,
    participou,
    descricao,
  };
  normalizado.geolocalizacao = {
    latitude,
    longitude,
    precisao: normalizado.geoPrecisao,
    origem: normalizado.geoOrigem,
    nomeExibicao: normalizado.geoNomeExibicao,
    naoEncontrada: normalizado.geoNaoEncontrada,
  };
  return normalizado;
}

function completarContato(contato, complemento) {
  if (!complemento) return contato;
  const resultado = { ...contato };
  Object.entries(complemento).forEach(([campo, valor]) => {
    const atual = resultado[campo];
    const atualVazio = atual === null || atual === undefined || atual === '' || (Array.isArray(atual) && !atual.length);
    if (atualVazio && valor !== null && valor !== undefined && valor !== '') resultado[campo] = valor;
  });
  if (texto(complemento.endereco).length > texto(contato.endereco).length) {
    resultado.endereco = complemento.endereco;
  }
  resultado.camposAdicionais = {
    ...(complemento.camposAdicionais || {}),
    ...(contato.camposAdicionais || {}),
  };
  resultado.acompanhamento = {
    ...(complemento.acompanhamento || {}),
    ...(contato.acompanhamento || {}),
    ultimoContatoEm: resultado.dataUltimoContato,
    diasSemContato: resultado.diasSemContato,
    tentativaContato: resultado.tentativaContato,
    respondeu: resultado.respondeu,
    demonstrouInteresse: resultado.demonstrouInteresse,
    aceitouVisita: resultado.aceitouVisita,
    participou: resultado.participou,
    descricao: resultado.observacoes,
  };
  resultado.geolocalizacao = {
    ...(complemento.geolocalizacao || {}),
    ...(contato.geolocalizacao || {}),
    latitude: resultado.latitude,
    longitude: resultado.longitude,
    precisao: resultado.geoPrecisao,
    origem: resultado.geoOrigem,
    nomeExibicao: resultado.geoNomeExibicao,
    naoEncontrada: resultado.geoNaoEncontrada,
  };
  return resultado;
}

function chavesDoContato(contato) {
  return [
    contato?.id && `id:${chaveNormalizada(contato.id)}`,
    contato?.whatsapp && `tel:${String(contato.whatsapp).replace(/\D/g, '')}`,
    contato?.email && `email:${chaveNormalizada(contato.email)}`,
  ].filter(Boolean);
}

function completarComDadosGerais(contatos, contatosGerais) {
  const indice = new Map();
  contatosGerais.forEach((contato) => chavesDoContato(contato).forEach((chave) => indice.set(chave, contato)));
  return contatos.map((contato) => {
    const complemento = chavesDoContato(contato).map((chave) => indice.get(chave)).find(Boolean);
    return completarContato(contato, complemento);
  });
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

function possuiCoordenadas(item) {
  return coordenada(item?.latitude, -90, 90) !== null
    && coordenada(item?.longitude, -180, 180) !== null;
}

function hashEstavel(valor) {
  let hash = 0;
  const entrada = texto(valor);
  for (let indice = 0; indice < entrada.length; indice += 1) {
    hash = ((hash << 5) - hash + entrada.charCodeAt(indice)) | 0;
  }
  return Math.abs(hash);
}

function centroConhecido(...valores) {
  for (const valor of valores) {
    const chave = slug(valor);
    if (CENTROS_TERRITORIAIS[chave]) return CENTROS_TERRITORIAIS[chave];
    const encontrada = Object.keys(CENTROS_TERRITORIAIS).find((cidade) => (
      chave === cidade || chave.includes(`-${cidade}-`) || chave.endsWith(`-${cidade}`)
    ));
    if (encontrada) return CENTROS_TERRITORIAIS[encontrada];
  }
  return null;
}

function mediaCoordenadas(itens) {
  const validos = itens.filter(possuiCoordenadas);
  if (!validos.length) return null;
  return [
    validos.reduce((soma, item) => soma + Number(item.latitude), 0) / validos.length,
    validos.reduce((soma, item) => soma + Number(item.longitude), 0) / validos.length,
  ];
}

function pontoAproximado(base, identidade, raioMinimo, variacao) {
  const hash = hashEstavel(identidade);
  const angulo = (hash % 360) * (Math.PI / 180);
  const raio = raioMinimo + (hash % variacao) / 100000;
  return {
    latitude: base[0] + Math.sin(angulo) * raio,
    longitude: base[1] + Math.cos(angulo) * raio,
  };
}

function comMetadadosGeograficos(item, latitude, longitude, precisao, origem) {
  const geolocalizado = {
    ...item,
    latitude,
    longitude,
    geoPrecisao: item.geoPrecisao || precisao,
    geoOrigem: item.geoOrigem || origem,
  };
  geolocalizado.geolocalizacao = {
    ...(item.geolocalizacao || {}),
    latitude,
    longitude,
    precisao: geolocalizado.geoPrecisao,
    origem: geolocalizado.geoOrigem,
    nomeExibicao: geolocalizado.geoNomeExibicao || '',
    naoEncontrada: Boolean(geolocalizado.geoNaoEncontrada),
  };
  return geolocalizado;
}

function aplicarGeolocalizacaoAproximada(contatos, igrejas) {
  const centrosIgrejas = new Map();
  igrejas.filter(possuiCoordenadas).forEach((igreja) => {
    const chave = chaveNormalizada(igreja.distrito);
    const lista = centrosIgrejas.get(chave) || [];
    lista.push(igreja);
    centrosIgrejas.set(chave, lista);
  });

  const contatosGeolocalizados = contatos.map((contato) => {
    if (possuiCoordenadas(contato)) {
      return comMetadadosGeograficos(
        contato,
        Number(contato.latitude),
        Number(contato.longitude),
        'Exato',
        'api-amigos-nt'
      );
    }

    const centroIgreja = mediaCoordenadas(centrosIgrejas.get(chaveNormalizada(contato.distrito)) || []);
    const base = centroConhecido(contato.cidade, contato.endereco, contato.distrito)
      || centroIgreja
      || CENTROS_TERRITORIAIS['sao-paulo'];
    const ponto = pontoAproximado(
      base,
      `${contato.distrito}|${contato.bairro}|${contato.endereco}|${contato.id}`,
      0.004,
      900
    );
    return comMetadadosGeograficos(contato, ponto.latitude, ponto.longitude, 'Aproximado', 'fallback-territorial');
  });

  const centrosLeads = new Map();
  contatosGeolocalizados.forEach((contato) => {
    const chave = chaveNormalizada(contato.distrito);
    const lista = centrosLeads.get(chave) || [];
    lista.push(contato);
    centrosLeads.set(chave, lista);
  });

  const igrejasGeolocalizadas = igrejas.map((igreja) => {
    if (possuiCoordenadas(igreja)) {
      return comMetadadosGeograficos(
        igreja,
        Number(igreja.latitude),
        Number(igreja.longitude),
        'Exato',
        'api-amigos-nt'
      );
    }
    const centroLeads = mediaCoordenadas(centrosLeads.get(chaveNormalizada(igreja.distrito)) || []);
    const base = centroLeads
      || centroConhecido(igreja.endereco, igreja.distrito)
      || CENTROS_TERRITORIAIS['sao-paulo'];
    const ponto = pontoAproximado(base, `${igreja.distrito}|${igreja.nome}`, 0.002, 450);
    return comMetadadosGeograficos(igreja, ponto.latitude, ponto.longitude, 'Aproximado', 'fallback-territorial');
  });

  return { contatos: contatosGeolocalizados, igrejas: igrejasGeolocalizadas };
}

async function carregarResumo({ ignorarCache = false } = {}) {
  const cfg = configuracao();
  if (!ignorarCache && cacheResumo && Date.now() - cacheResumo.criadoEm < cfg.cacheTtl) return cacheResumo;

  const dashboard = await requisitar('/api/dashboard', cfg);
  const contatos = registrosInteressados(dashboard).map(normalizarRegistro);
  const territorio = extrairTerritorio(dashboard);
  const geolocalizados = aplicarGeolocalizacaoAproximada(contatos, territorio.igrejas);

  cacheResumo = {
    criadoEm: Date.now(),
    atualizadoEm: new Date().toISOString(),
    contatos: geolocalizados.contatos,
    distritosOficiais: territorio.distritosOficiais,
    igrejas: geolocalizados.igrejas,
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
  async resumo({ atualizar = false, usuario } = {}) {
    const escopo = await obterEscopoTerritorial(usuario);
    const dados = aplicarEscopoTerritorial(await carregarResumo({ ignorarCache: atualizar }), escopo);
    return resumir(dados);
  },

  async filtragemAvancada({ atualizar = false, usuario } = {}) {
    const escopo = await obterEscopoTerritorial(usuario);
    const dados = aplicarEscopoTerritorial(await carregarResumo({ ignorarCache: atualizar }), escopo);
    const leads = dados.contatos.map((contato) => ({
      id: contato.id,
      nome: contato.nome,
      whatsapp: contato.whatsapp,
      whatsappNumero: contato.whatsappNumero,
      email: contato.email,
      distrito: contato.distrito,
      bairro: contato.bairro,
      cidade: contato.cidade,
      material: contato.material,
      prioridade: prioridadeCanonica(contato.prioridade),
      prioridadeRotulo: contato.prioridadeRotulo,
      pontuacao: contato.pontuacao,
      genero: contato.genero,
      religiao: contato.religiao,
      idade: contato.idade,
      dataNascimento: contato.dataNascimento,
      endereco: contato.endereco,
      materialRecebido: contato.materialRecebido,
      materiaisQuantidade: contato.materiaisQuantidade,
      status: contato.status,
      origem: contato.origem,
      canal: contato.canal,
      observacoes: contato.observacoes,
      dataUltimoContato: contato.dataUltimoContato,
      dataSolicitacao: contato.dataSolicitacao,
      pontuacaoModelo: contato.pontuacaoModelo,
      similaridadeVip: contato.similaridadeVip,
      faixa: contato.faixa,
      criadoEm: contato.criadoEm,
      atualizadoEm: contato.atualizadoEm,
      tags: contato.tags,
      camposAdicionais: contato.camposAdicionais,
      temWhatsapp: contato.temWhatsapp,
      telefoneValido: contato.telefoneValido,
      emailValido: contato.emailValido,
      temDescricao: contato.temDescricao,
      estudoAtivo: contato.estudoAtivo,
      vipHistorico: contato.vipHistorico,
      diasSemContato: contato.diasSemContato,
      tentativaContato: contato.tentativaContato,
      respondeu: contato.respondeu,
      demonstrouInteresse: contato.demonstrouInteresse,
      aceitouVisita: contato.aceitouVisita,
      participou: contato.participou,
      latitude: contato.latitude,
      longitude: contato.longitude,
      geoPrecisao: contato.geoPrecisao,
      geoOrigem: contato.geoOrigem,
      geoNomeExibicao: contato.geoNomeExibicao,
      geoNaoEncontrada: contato.geoNaoEncontrada,
      acompanhamento: contato.acompanhamento,
      geolocalizacao: contato.geolocalizacao,
    }));

    return {
      atualizadoEm: dados.atualizadoEm,
      total: leads.length,
      leads,
      igrejas: dados.igrejas || [],
      distritosOficiais: dados.distritosOficiais || [],
    };
  },

  async analise(filtros = {}, { atualizar = false, usuario } = {}) {
    const escopo = await obterEscopoTerritorial(usuario);
    const dados = aplicarEscopoTerritorial(await carregarResumo({ ignorarCache: atualizar }), escopo);
    return { ...analisarContatos(dados.contatos, filtros), atualizadoEm: dados.atualizadoEm };
  },

  async porDistrito(nomeDistrito, { atualizar = false, usuario } = {}) {
    const nome = texto(nomeDistrito);
    if (!nome) throw erro(400, 'Informe o distrito.', 'DISTRITO_OBRIGATORIO');
    const escopo = await obterEscopoTerritorial(usuario);
    validarDistritoNoEscopo(nome, escopo);

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

    // O recorte por distrito pode vir resumido. Completamos cada registro com a
    // versão do dashboard geral, que contém endereço e demais dados cadastrais.
    const dadosGerais = await carregarResumo({ ignorarCache: atualizar });
    const contatosGeraisDoDistrito = dadosGerais.contatos.filter(
      (contato) => chaveNormalizada(contato.distrito) === chaveNormalizada(nome)
    );
    const contatosCompletos = completarComDadosGerais(dados.contatos, contatosGeraisDoDistrito);
    const contatosNoEscopo = escopo.acessoTotal
      ? contatosCompletos
      : contatosCompletos.filter((contato) => escopo.distritos.has(chaveNormalizada(contato.distrito)));

    if (!contatosNoEscopo.length) {
      throw erro(404, 'Nenhum interessado encontrado para este distrito.', 'DISTRITO_SEM_INTERESSADOS');
    }

    const contatos = [...contatosNoEscopo].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
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

  async analisePorDistrito(nomeDistrito, { atualizar = false, usuario } = {}) {
    return analisarDistrito(await this.porDistrito(nomeDistrito, { atualizar, usuario }));
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
    extrairBairroDoEndereco,
    aplicarGeolocalizacaoAproximada,
    completarContato,
    obterEscopoTerritorial,
    aplicarEscopoTerritorial,
    validarDistritoNoEscopo,
  },
};

module.exports = InteressadosNovoTempoService;
