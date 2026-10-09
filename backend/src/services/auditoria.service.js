const prisma = require('../lib/prisma');

const ROTULOS_RECURSOS = {
  auth: 'autenticação',
  regioes: 'regiões',
  distritos: 'distritos',
  igrejas: 'igrejas',
  duplas: 'duplas missionárias',
  'estudos-biblicos': 'estudos bíblicos',
  evangelismos: 'evangelismos',
  acompanhamentos: 'acompanhamentos',
  'escola-sabatina': 'Escola Sabatina',
  'mapa-igreja': 'mapa da igreja',
  'calendario-missionario': 'calendário missionário',
  relatorios: 'relatórios',
  usuarios: 'usuários',
  configuracoes: 'configurações',
  'interessados-nt': 'interessados Novo Tempo',
  auditoria: 'auditoria e logs',
};

const RETENCAO_DIAS = Math.max(30, Number(process.env.AUDITORIA_RETENCAO_DIAS) || 365);
let ultimaLimpezaEm = 0;

const texto = (valor, limite = 500) => String(valor ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, limite);

const mascararIp = (ipBruto) => {
  const ip = texto(String(ipBruto || '').split(',')[0], 80).replace(/^::ffff:/, '');
  if (!ip) return null;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
    const partes = ip.split('.');
    return `${partes[0]}.${partes[1]}.${partes[2]}.xxx`;
  }
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}::…`;
  return ip.slice(0, 64);
};

const identificarCliente = (userAgentBruto = '') => {
  const userAgent = texto(userAgentBruto, 1000);
  let navegador = 'Outro navegador';
  if (/Edg\//i.test(userAgent)) navegador = 'Microsoft Edge';
  else if (/OPR\//i.test(userAgent)) navegador = 'Opera';
  else if (/Chrome\//i.test(userAgent)) navegador = 'Google Chrome';
  else if (/Firefox\//i.test(userAgent)) navegador = 'Mozilla Firefox';
  else if (/Safari\//i.test(userAgent)) navegador = 'Safari';

  let sistemaOperacional = 'Outro sistema';
  if (/Windows NT/i.test(userAgent)) sistemaOperacional = 'Windows';
  else if (/Android/i.test(userAgent)) sistemaOperacional = 'Android';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) sistemaOperacional = 'iOS/iPadOS';
  else if (/Mac OS X/i.test(userAgent)) sistemaOperacional = 'macOS';
  else if (/Linux/i.test(userAgent)) sistemaOperacional = 'Linux';

  const dispositivo = /Mobile|Android|iPhone|iPad/i.test(userAgent) ? 'Dispositivo móvel' : 'Computador';
  return { userAgent, navegador, sistemaOperacional, dispositivo };
};

const metadadosDaRequisicao = (req) => ({
  ip: mascararIp(req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress),
  ...identificarCliente(req.get?.('user-agent') || req.headers['user-agent']),
});

const inicioDiaFortaleza = () => {
  const agora = new Date();
  const local = new Date(agora.getTime() - (3 * 60 * 60 * 1000));
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 3, 0, 0, 0));
};

const periodoWhere = ({ de, ate } = {}, campo = 'criadoEm') => {
  const faixa = {};
  if (de) {
    const data = new Date(`${de}T00:00:00-03:00`);
    if (!Number.isNaN(data.getTime())) faixa.gte = data;
  }
  if (ate) {
    const data = new Date(`${ate}T23:59:59.999-03:00`);
    if (!Number.isNaN(data.getTime())) faixa.lte = data;
  }
  return Object.keys(faixa).length ? { [campo]: faixa } : {};
};

const recursoDaRota = (rota = '') => {
  const segmentos = rota.split('?')[0].split('/').filter(Boolean);
  const indiceApi = segmentos.indexOf('api');
  const recurso = segmentos[indiceApi >= 0 ? indiceApi + 1 : 0] || 'sistema';
  return { recurso, rotulo: ROTULOS_RECURSOS[recurso] || recurso.replace(/-/g, ' ') };
};

const entidadeIdDaRota = (rota = '') => rota.split('?')[0].split('/').find((parte) => /^\d+$/.test(parte)) || null;

const descreverRequisicao = (metodo, rota, sucesso) => {
  const { recurso, rotulo } = recursoDaRota(rota);
  const verbos = {
    GET: 'Consultou',
    POST: 'Criou ou executou uma ação em',
    PUT: 'Alterou',
    PATCH: 'Alterou',
    DELETE: 'Excluiu ou desativou',
  };
  const verbo = verbos[metodo] || 'Acessou';
  return {
    recurso,
    acao: `${metodo}_${recurso.replace(/-/g, '_').toUpperCase()}`,
    descricao: `${verbo} ${rotulo}${sucesso ? '.' : ', mas a operação não foi concluída.'}`,
  };
};

const detalhesSeguros = (detalhes) => {
  if (!detalhes || typeof detalhes !== 'object') return undefined;
  const proibidos = /senha|password|token|authorization|segredo|secret/i;
  const limpar = (valor, profundidade = 0) => {
    if (profundidade > 2) return '[resumido]';
    if (Array.isArray(valor)) return valor.slice(0, 20).map((item) => limpar(item, profundidade + 1));
    if (valor && typeof valor === 'object') {
      return Object.fromEntries(Object.entries(valor).slice(0, 30)
        .filter(([chave]) => !proibidos.test(chave))
        .map(([chave, item]) => [texto(chave, 80), limpar(item, profundidade + 1)]));
    }
    if (typeof valor === 'string') return texto(valor, 1000);
    if (typeof valor === 'number' || typeof valor === 'boolean' || valor === null) return valor;
    return texto(valor, 300);
  };
  return limpar(detalhes);
};

const dadosUsuario = (usuario) => ({
  usuarioId: usuario?.id ? Number(usuario.id) : null,
  usuarioNome: usuario?.nome ? texto(usuario.nome, 180) : null,
  usuarioEmail: usuario?.email ? texto(usuario.email, 180).toLowerCase() : null,
  perfil: usuario?.perfil ? texto(usuario.perfil, 80) : null,
});

const limparRegistrosAntigos = async () => {
  const agora = Date.now();
  if (agora - ultimaLimpezaEm < 24 * 60 * 60 * 1000) return;
  ultimaLimpezaEm = agora;
  const limite = new Date(agora - (RETENCAO_DIAS * 24 * 60 * 60 * 1000));
  try {
    await prisma.auditoriaLog.deleteMany({ where: { criadoEm: { lt: limite } } });
    await prisma.auditoriaSessao.deleteMany({ where: { inicioEm: { lt: limite } } });
  } catch (erro) {
    console.error('Falha ao limpar registros antigos de auditoria:', erro.message);
  }
};

const registrarLog = async (dados) => {
  void limparRegistrosAntigos();
  try {
    return await prisma.auditoriaLog.create({
      data: {
        sessaoId: dados.sessaoId || null,
        ...dadosUsuario(dados.usuario),
        usuarioNome: dados.usuarioNome || dados.usuario?.nome ? texto(dados.usuarioNome || dados.usuario?.nome, 180) : null,
        usuarioEmail: dados.usuarioEmail || dados.usuario?.email ? texto(dados.usuarioEmail || dados.usuario?.email, 180).toLowerCase() : null,
        perfil: dados.perfil || dados.usuario?.perfil ? texto(dados.perfil || dados.usuario?.perfil, 80) : null,
        categoria: texto(dados.categoria || 'SISTEMA', 60),
        acao: texto(dados.acao || 'EVENTO', 120),
        descricao: texto(dados.descricao || 'Evento registrado.', 1000),
        recurso: dados.recurso ? texto(dados.recurso, 120) : null,
        entidadeId: dados.entidadeId ? texto(dados.entidadeId, 100) : null,
        metodo: dados.metodo ? texto(dados.metodo, 12) : null,
        rota: dados.rota ? texto(dados.rota, 500) : null,
        statusHttp: Number.isFinite(Number(dados.statusHttp)) ? Number(dados.statusHttp) : null,
        sucesso: dados.sucesso !== false,
        duracaoMs: Number.isFinite(Number(dados.duracaoMs)) ? Math.max(0, Math.round(Number(dados.duracaoMs))) : null,
        ip: dados.ip ? texto(dados.ip, 80) : null,
        origem: texto(dados.origem || 'BACKEND', 40),
        detalhes: detalhesSeguros(dados.detalhes),
      },
    });
  } catch (erro) {
    console.error('Falha ao registrar auditoria:', erro.message);
    return null;
  }
};

const encerrarSessoesAnteriores = async (usuarioId, agora) => {
  const anteriores = await prisma.auditoriaSessao.findMany({
    where: { usuarioId: Number(usuarioId), status: 'ATIVA' },
    select: { id: true, inicioEm: true, ultimaAtividadeEm: true },
  });
  await Promise.all(anteriores.map((sessao) => {
    const fim = sessao.ultimaAtividadeEm || agora;
    const duracaoSegundos = Math.max(0, Math.floor((fim.getTime() - sessao.inicioEm.getTime()) / 1000));
    return prisma.auditoriaSessao.update({
      where: { id: sessao.id },
      data: { status: 'SUBSTITUIDA', fimEm: fim, duracaoSegundos },
    });
  }));
};

const criarSessao = async (usuario, meta = {}) => {
  const agora = new Date();
  await encerrarSessoesAnteriores(usuario.id, agora);
  const cliente = identificarCliente(meta.userAgent);
  const sessao = await prisma.auditoriaSessao.create({
    data: {
      usuarioId: Number(usuario.id),
      usuarioNome: texto(usuario.nome, 180),
      usuarioEmail: texto(usuario.email, 180).toLowerCase(),
      perfil: texto(usuario.perfil, 80),
      ip: mascararIp(meta.ip),
      ...cliente,
    },
  });
  await registrarLog({
    sessaoId: sessao.id,
    usuario,
    categoria: 'AUTENTICACAO',
    acao: 'LOGIN_SUCESSO',
    descricao: 'Entrou no sistema com sucesso.',
    recurso: 'autenticacao',
    metodo: 'POST',
    rota: '/api/auth/login',
    statusHttp: 200,
    sucesso: true,
    ip: sessao.ip,
    detalhes: { navegador: sessao.navegador, sistemaOperacional: sessao.sistemaOperacional, dispositivo: sessao.dispositivo },
  });
  return sessao;
};

const registrarTentativaLogin = (email, meta, erro) => registrarLog({
  usuarioEmail: texto(email, 180).toLowerCase() || null,
  categoria: 'AUTENTICACAO',
  acao: 'LOGIN_FALHOU',
  descricao: 'Tentativa de entrada não concluída.',
  recurso: 'autenticacao',
  metodo: 'POST',
  rota: '/api/auth/login',
  statusHttp: erro?.status || 401,
  sucesso: false,
  ip: mascararIp(meta?.ip),
  origem: 'BACKEND',
  detalhes: { motivo: erro?.mensagem || 'Credenciais inválidas', ...identificarCliente(meta?.userAgent) },
});

const atualizarSessao = async (sessaoId) => {
  if (!sessaoId) return null;
  const sessao = await prisma.auditoriaSessao.findUnique({ where: { id: sessaoId } });
  if (!sessao) return null;
  const agora = new Date();
  const duracaoSegundos = Math.max(0, Math.floor((agora.getTime() - sessao.inicioEm.getTime()) / 1000));
  return prisma.auditoriaSessao.update({
    where: { id: sessaoId },
    data: { ultimaAtividadeEm: agora, duracaoSegundos, status: 'ATIVA', fimEm: null },
  });
};

const encerrarSessao = async (sessaoId, usuario) => {
  if (!sessaoId) return null;
  const sessao = await prisma.auditoriaSessao.findUnique({ where: { id: sessaoId } });
  if (!sessao) return null;
  const agora = new Date();
  const duracaoSegundos = Math.max(0, Math.floor((agora.getTime() - sessao.inicioEm.getTime()) / 1000));
  const atualizada = await prisma.auditoriaSessao.update({
    where: { id: sessaoId },
    data: { ultimaAtividadeEm: agora, fimEm: agora, duracaoSegundos, status: 'ENCERRADA' },
  });
  await registrarLog({
    sessaoId,
    usuario,
    categoria: 'AUTENTICACAO',
    acao: 'LOGOUT',
    descricao: 'Saiu do sistema.',
    recurso: 'autenticacao',
    metodo: 'POST',
    rota: '/api/auditoria/logout',
    statusHttp: 200,
    sucesso: true,
    ip: sessao.ip,
    detalhes: { duracaoSegundos },
  });
  return atualizada;
};

const registrarRequisicao = async ({ req, statusHttp, duracaoMs, erro }) => {
  const rota = String(req.originalUrl || req.url || '').split('?')[0];
  const metodo = String(req.method || 'GET').toUpperCase();
  const sucesso = statusHttp < 400;
  const descricao = descreverRequisicao(metodo, rota, sucesso);
  const meta = metadadosDaRequisicao(req);
  await registrarLog({
    sessaoId: req.sessaoId,
    usuario: req.usuario,
    categoria: statusHttp >= 500 ? 'ERRO' : statusHttp >= 400 ? 'NEGADA' : metodo === 'GET' ? 'CONSULTA' : 'ALTERACAO',
    acao: descricao.acao,
    descricao: descricao.descricao,
    recurso: descricao.recurso,
    entidadeId: entidadeIdDaRota(rota),
    metodo,
    rota,
    statusHttp,
    sucesso,
    duracaoMs,
    ip: meta.ip,
    detalhes: {
      erro: erro || undefined,
      consulta: req.query,
      parametros: req.params,
    },
  });
  if (req.sessaoId) await atualizarSessao(req.sessaoId);
};

const registrarEventoCliente = async (dados, req) => {
  const tipos = {
    NAVEGACAO: ['NAVEGACAO', 'Abriu uma página do sistema.'],
    ERRO_FRONTEND: ['ERRO', 'Ocorreu um erro na interface.'],
    REJEICAO_NAO_TRATADA: ['ERRO', 'Ocorreu uma falha não tratada na interface.'],
    TRAVAMENTO_INTERFACE: ['DESEMPENHO', 'A interface demorou a responder.'],
    REQUISICAO_LENTA: ['DESEMPENHO', 'Uma operação demorou além do esperado.'],
    FALHA_REDE: ['ERRO', 'O navegador não conseguiu se comunicar com o servidor.'],
  };
  const tipo = tipos[dados?.tipo] ? dados.tipo : 'ERRO_FRONTEND';
  const [categoria, descricaoPadrao] = tipos[tipo] || tipos.ERRO_FRONTEND;
  return registrarLog({
    sessaoId: req.sessaoId,
    usuario: req.usuario,
    categoria,
    acao: tipo,
    descricao: texto(dados?.descricao || descricaoPadrao, 1000),
    recurso: 'interface',
    rota: texto(dados?.pagina || dados?.rota, 500) || null,
    sucesso: tipo === 'NAVEGACAO',
    duracaoMs: dados?.duracaoMs,
    ip: metadadosDaRequisicao(req).ip,
    origem: 'FRONTEND',
    detalhes: dados?.detalhes,
  });
};

const resumo = async () => {
  const hoje = inicioDiaFortaleza();
  const limiteOnline = new Date(Date.now() - (2 * 60 * 1000));
  const [onlineAgora, acessosHoje, falhasLoginHoje, errosHoje, operacoesLentasHoje, duracao, usuariosAtivosHoje, errosRecentes] = await Promise.all([
    prisma.auditoriaSessao.count({ where: { status: 'ATIVA', ultimaAtividadeEm: { gte: limiteOnline } } }),
    prisma.auditoriaSessao.count({ where: { inicioEm: { gte: hoje } } }),
    prisma.auditoriaLog.count({ where: { criadoEm: { gte: hoje }, acao: 'LOGIN_FALHOU' } }),
    prisma.auditoriaLog.count({ where: { criadoEm: { gte: hoje }, categoria: 'ERRO' } }),
    prisma.auditoriaLog.count({ where: { criadoEm: { gte: hoje }, duracaoMs: { gte: 3000 } } }),
    prisma.auditoriaSessao.aggregate({ where: { inicioEm: { gte: hoje } }, _avg: { duracaoSegundos: true } }),
    prisma.auditoriaSessao.groupBy({ by: ['usuarioId'], where: { inicioEm: { gte: hoje }, usuarioId: { not: null } } }),
    prisma.auditoriaLog.findMany({
      where: { categoria: 'ERRO' },
      orderBy: { criadoEm: 'desc' },
      take: 6,
      select: { id: true, usuarioNome: true, acao: true, descricao: true, rota: true, statusHttp: true, origem: true, criadoEm: true },
    }),
  ]);
  return {
    onlineAgora,
    acessosHoje,
    usuariosAtivosHoje: usuariosAtivosHoje.length,
    falhasLoginHoje,
    errosHoje,
    operacoesLentasHoje,
    duracaoMediaSegundos: Math.round(duracao._avg.duracaoSegundos || 0),
    errosRecentes,
  };
};

const listarSessoes = async (filtros = {}) => {
  const pagina = Math.max(1, Number(filtros.pagina) || 1);
  const limite = Math.min(100, Math.max(10, Number(filtros.limite) || 30));
  const where = {
    ...periodoWhere(filtros, 'inicioEm'),
    ...(filtros.usuarioId ? { usuarioId: Number(filtros.usuarioId) } : {}),
    ...(filtros.status ? { status: filtros.status } : {}),
    ...(filtros.busca ? {
      OR: [
        { usuarioNome: { contains: texto(filtros.busca, 100), mode: 'insensitive' } },
        { usuarioEmail: { contains: texto(filtros.busca, 100), mode: 'insensitive' } },
        { perfil: { contains: texto(filtros.busca, 100), mode: 'insensitive' } },
      ],
    } : {}),
  };
  const [itens, total] = await Promise.all([
    prisma.auditoriaSessao.findMany({
      where,
      orderBy: { inicioEm: 'desc' },
      skip: (pagina - 1) * limite,
      take: limite,
      include: { _count: { select: { logs: true } } },
    }),
    prisma.auditoriaSessao.count({ where }),
  ]);
  const limiteOnline = Date.now() - (2 * 60 * 1000);
  return {
    itens: itens.map((item) => ({ ...item, online: item.status === 'ATIVA' && item.ultimaAtividadeEm.getTime() >= limiteOnline })),
    total,
    pagina,
    paginas: Math.max(1, Math.ceil(total / limite)),
  };
};

const listarLogs = async (filtros = {}) => {
  const pagina = Math.max(1, Number(filtros.pagina) || 1);
  const limite = Math.min(100, Math.max(10, Number(filtros.limite) || 50));
  const sucesso = filtros.sucesso === 'true' ? true : filtros.sucesso === 'false' ? false : undefined;
  const where = {
    ...periodoWhere(filtros),
    ...(filtros.sessaoId ? { sessaoId: texto(filtros.sessaoId, 80) } : {}),
    ...(filtros.usuarioId ? { usuarioId: Number(filtros.usuarioId) } : {}),
    ...(filtros.categoria ? { categoria: texto(filtros.categoria, 60) } : {}),
    ...(typeof sucesso === 'boolean' ? { sucesso } : {}),
    ...(filtros.busca ? {
      OR: [
        { usuarioNome: { contains: texto(filtros.busca, 100), mode: 'insensitive' } },
        { usuarioEmail: { contains: texto(filtros.busca, 100), mode: 'insensitive' } },
        { descricao: { contains: texto(filtros.busca, 100), mode: 'insensitive' } },
        { acao: { contains: texto(filtros.busca, 100), mode: 'insensitive' } },
        { rota: { contains: texto(filtros.busca, 100), mode: 'insensitive' } },
      ],
    } : {}),
  };
  const [itens, total] = await Promise.all([
    prisma.auditoriaLog.findMany({ where, orderBy: { criadoEm: 'desc' }, skip: (pagina - 1) * limite, take: limite }),
    prisma.auditoriaLog.count({ where }),
  ]);
  return { itens, total, pagina, paginas: Math.max(1, Math.ceil(total / limite)) };
};

module.exports = {
  metadadosDaRequisicao,
  criarSessao,
  registrarTentativaLogin,
  atualizarSessao,
  encerrarSessao,
  registrarRequisicao,
  registrarEventoCliente,
  registrarLog,
  resumo,
  listarSessoes,
  listarLogs,
};
