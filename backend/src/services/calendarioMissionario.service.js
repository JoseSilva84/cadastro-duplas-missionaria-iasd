const CalendarioMissionarioModel = require('../models/calendarioMissionario.model');
const { PERFIS, ehAdmin } = require('../middlewares/auth');

const ANO_PADRAO = 2027;
const STATUS = ['PLANEJADA', 'EM_ANDAMENTO', 'CONCLUIDA'];

const erro = (mensagem, status = 400) => ({ status, mensagem });

const texto = (valor) => {
  const normalizado = String(valor ?? '').trim();
  return normalizado || null;
};

const anoValido = (valor) => {
  const ano = Number(valor || ANO_PADRAO);
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) throw erro('Informe um ano valido.');
  return ano;
};

// O planejamento de um ano comeca em dezembro do ano anterior.
const dataOuNull = (valor, ano) => {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) throw erro('Informe uma data valida.');
  if (data.getTime() < Date.UTC(ano - 1, 11, 1) || data.getTime() > Date.UTC(ano, 11, 31, 23, 59, 59)) {
    throw erro(`As datas devem estar entre dezembro de ${ano - 1} e dezembro de ${ano}.`);
  }
  return data;
};

const valorValido = (valor) => {
  const n = Number(valor || 0);
  if (!Number.isFinite(n) || n < 0) throw erro('O orcamento deve ser um valor positivo.');
  return Math.round(n * 100) / 100;
};

const idOuNull = (valor) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const PERFIS_EVENTO = [
  PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL,
  PERFIS.COORDENADOR_REGIONAL, PERFIS.PASTOR_DISTRITAL,
];

const PERFIS_ACAO = [
  PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL,
  PERFIS.COORDENADOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.DIRETOR_MISSIONARIO_IGREJA,
  PERFIS.DUPLA_MISSIONARIA,
];

// ---------- escopo e visibilidade ----------
async function contexto(usuario) {
  const perfil = usuario.perfil;
  if (ehAdmin(perfil)) return { admin: true };
  if (perfil === PERFIS.PASTOR_REGIONAL || perfil === PERFIS.COORDENADOR_REGIONAL) {
    if (!usuario.regiaoId) throw erro('Usuario sem regiao vinculada.');
    return { regiaoId: Number(usuario.regiaoId) };
  }
  if (perfil === PERFIS.PASTOR_DISTRITAL) {
    const distrito = usuario.distritoId && await CalendarioMissionarioModel.buscarDistrito(usuario.distritoId);
    if (!distrito) throw erro('Usuario sem distrito vinculado.');
    return { regiaoId: distrito.regiaoId, distritoId: distrito.id };
  }
  if (perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA || perfil === PERFIS.DUPLA_MISSIONARIA) {
    const igreja = usuario.igrejaId && await CalendarioMissionarioModel.buscarIgreja(usuario.igrejaId);
    if (!igreja) return { admin: false };
    return { regiaoId: igreja.distrito.regiaoId, distritoId: igreja.distritoId, igrejaId: igreja.id };
  }
  return { admin: false };
}

// O que cada nivel enxerga: Associacao + niveis acima + o proprio nivel e abaixo.
function filtroDe({ regiaoId, distritoId, igrejaId }, abrangencia) {
  const ou = [{ regiaoId: null }];
  if (regiaoId) ou.push(abrangencia === 'regiao' ? { regiaoId } : { regiaoId, distritoId: null });
  if (distritoId) ou.push(abrangencia === 'distrito' ? { distritoId } : { distritoId, igrejaId: null });
  if (igrejaId) ou.push({ igrejaId });
  return { OR: ou };
}

function filtroVisao(ctx) {
  if (!ctx || ctx.admin) return null;
  if (ctx.igrejaId) return filtroDe(ctx, 'igreja');
  if (ctx.distritoId) return filtroDe(ctx, 'distrito');
  if (ctx.regiaoId) return filtroDe(ctx, 'regiao');
  return null;
}

async function filtroSelecao(query) {
  const igrejaId = idOuNull(query.igrejaId);
  const distritoId = idOuNull(query.distritoId);
  const regiaoId = idOuNull(query.regiaoId);
  if (igrejaId) {
    const igreja = await CalendarioMissionarioModel.buscarIgreja(igrejaId);
    if (!igreja) throw erro('Igreja nao encontrada.', 404);
    return filtroDe({ regiaoId: igreja.distrito.regiaoId, distritoId: igreja.distritoId, igrejaId }, 'igreja');
  }
  if (distritoId) {
    const distrito = await CalendarioMissionarioModel.buscarDistrito(distritoId);
    if (!distrito) throw erro('Distrito nao encontrado.', 404);
    return filtroDe({ regiaoId: distrito.regiaoId, distritoId }, 'distrito');
  }
  if (regiaoId) return filtroDe({ regiaoId }, 'regiao');
  return null;
}

// Define onde a acao "mora" (Associacao, regiao, distrito ou igreja) conforme o perfil.
async function resolverOrigem(usuario, corpo) {
  const ctx = await contexto(usuario);
  const igrejaId = idOuNull(corpo.igrejaId);
  const distritoId = idOuNull(corpo.distritoId);
  const regiaoId = idOuNull(corpo.regiaoId);

  if (ctx.igrejaId) return { regiaoId: ctx.regiaoId, distritoId: ctx.distritoId, igrejaId: ctx.igrejaId };

  let alvo = {};
  if (igrejaId) {
    const igreja = await CalendarioMissionarioModel.buscarIgreja(igrejaId);
    if (!igreja) throw erro('Igreja nao encontrada.', 404);
    alvo = { regiaoId: igreja.distrito.regiaoId, distritoId: igreja.distritoId, igrejaId };
  } else if (distritoId) {
    const distrito = await CalendarioMissionarioModel.buscarDistrito(distritoId);
    if (!distrito) throw erro('Distrito nao encontrado.', 404);
    alvo = { regiaoId: distrito.regiaoId, distritoId, igrejaId: null };
  } else if (regiaoId) {
    alvo = { regiaoId, distritoId: null, igrejaId: null };
  } else {
    alvo = { regiaoId: null, distritoId: null, igrejaId: null };
  }

  if (ctx.admin) return alvo;
  if (ctx.distritoId) {
    if (!alvo.distritoId) return { regiaoId: ctx.regiaoId, distritoId: ctx.distritoId, igrejaId: null };
    if (alvo.distritoId !== ctx.distritoId) throw erro('Selecione um distrito/igreja dentro do seu distrito.');
    return alvo;
  }
  if (alvo.regiaoId !== ctx.regiaoId) {
    if (!alvo.regiaoId) return { regiaoId: ctx.regiaoId, distritoId: null, igrejaId: null };
    throw erro('Selecione um distrito/igreja dentro da sua regiao.');
  }
  return alvo;
}

// ---------- serializacao ----------
const formatarAcao = (a, usuario) => ({
  id: a.id,
  temaId: a.temaId,
  eventoId: a.eventoId,
  eventoNome: a.evento?.nome || null,
  nome: a.nome,
  descricao: a.descricao,
  data: a.data,
  valor: Number(a.valor),
  responsavel: a.responsavel,
  departamento: a.departamento,
  status: a.status,
  regiaoId: a.regiaoId,
  distritoId: a.distritoId,
  igrejaId: a.igrejaId,
  regiaoNome: a.regiao?.nome || null,
  distritoNome: a.distrito?.nome || null,
  igrejaNome: a.igreja?.nome || null,
  criadoPorId: a.criadoPorId,
  criadoPorPerfil: a.criadoPorPerfil,
  criadoPorNome: a.criadoPorNome,
  podeEditar: ehAdmin(usuario.perfil) || (a.criadoPorId != null && a.criadoPorId === usuario.id),
});

const formatarEvento = (e, usuario) => {
  const acoes = (e.acoes || []).map((a) => formatarAcao(a, usuario));
  const orcamentoTotal = acoes.reduce((s, a) => s + Number(a.valor || 0), 0);
  return {
    id: e.id,
    temaId: e.temaId,
    temaNome: e.tema?.nome || null,
    nome: e.nome,
    descricao: e.descricao,
    data: e.data,
    departamento: e.departamento || 'OUTRO',
    acoes,
    totalAcoes: acoes.length,
    orcamentoTotal,
    podeEditar: ehAdmin(usuario.perfil) || [PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL].includes(usuario.perfil),
  };
};

const formatarTema = (t, usuario) => {
  const eventos = (t.eventos || []).map((e) => formatarEvento(e, usuario));
  const acoes = (t.acoes || []).map((a) => formatarAcao(a, usuario));
  return {
    id: t.id,
    ano: t.ano,
    nome: t.nome,
    tipo: t.tipo,
    descricao: t.descricao,
    dataInicio: t.dataInicio,
    dataFim: t.dataFim,
    eventos,
    acoes,
  };
};

const exigirAdmin = (usuario) => {
  if (!ehAdmin(usuario.perfil)) throw erro('Somente administradores podem gerenciar os temas.');
};

const exigirPerfilEvento = (usuario) => {
  if (!PERFIS_EVENTO.includes(usuario.perfil)) throw erro('Seu perfil nao tem permissao para gerenciar eventos do tema.');
};

const exigirPerfilAcao = (usuario) => {
  if (!PERFIS_ACAO.includes(usuario.perfil)) throw erro('Seu perfil nao pode cadastrar acoes no calendario.');
};

const dadosAcao = (corpo, ano) => {
  const nome = texto(corpo.nome);
  if (!nome) throw erro('Informe o nome da acao missionaria.');
  return {
    nome,
    descricao: texto(corpo.descricao),
    data: dataOuNull(corpo.data, ano),
    valor: valorValido(corpo.valor),
    responsavel: texto(corpo.responsavel),
    departamento: texto(corpo.departamento),
    status: STATUS.includes(corpo.status) ? corpo.status : 'PLANEJADA',
  };
};

const MODELO = require('./calendarioModelo');

const CalendarioMissionarioService = {
  async obter(usuario, query = {}) {
    const ano = anoValido(query.ano);
    const condicoes = [await filtroSelecao(query)].filter(Boolean);
    const temas = await CalendarioMissionarioModel.listarTemas(ano, condicoes.length ? { AND: condicoes } : undefined);
    return {
      ano,
      temas: temas.map((t) => formatarTema(t, usuario)),
      permissoes: {
        gerenciarTemas: ehAdmin(usuario.perfil),
        gerenciarEventos: PERFIS_EVENTO.includes(usuario.perfil),
        criarAcao: PERFIS_ACAO.includes(usuario.perfil) && !usuario.somenteLeitura,
      },
    };
  },

  async criarTema(usuario, corpo) {
    exigirAdmin(usuario);
    const ano = anoValido(corpo.ano);
    const nome = texto(corpo.nome);
    if (!nome) throw erro('Informe o tema do evento.');
    const tema = await CalendarioMissionarioModel.criarTema({
      ano,
      nome,
      tipo: texto(corpo.tipo),
      descricao: texto(corpo.descricao),
      dataInicio: dataOuNull(corpo.dataInicio, ano),
      dataFim: dataOuNull(corpo.dataFim, ano),
    });
    return formatarTema({ ...tema, eventos: [], acoes: [] }, usuario);
  },

  async atualizarTema(usuario, id, corpo) {
    exigirAdmin(usuario);
    const atual = await CalendarioMissionarioModel.buscarTema(id);
    if (!atual) throw erro('Tema nao encontrado.', 404);
    const nome = texto(corpo.nome);
    if (!nome) throw erro('Informe o tema do evento.');
    const tema = await CalendarioMissionarioModel.atualizarTema(id, {
      nome,
      tipo: texto(corpo.tipo),
      descricao: texto(corpo.descricao),
      dataInicio: dataOuNull(corpo.dataInicio, atual.ano),
      dataFim: dataOuNull(corpo.dataFim, atual.ano),
    });
    return formatarTema(tema, usuario);
  },

  async excluirTema(usuario, id) {
    exigirAdmin(usuario);
    if (!await CalendarioMissionarioModel.buscarTema(id)) throw erro('Tema nao encontrado.', 404);
    await CalendarioMissionarioModel.excluirTema(id);
  },

  // Eventos do Tema
  async criarEvento(usuario, corpo) {
    exigirPerfilEvento(usuario);
    const temaId = idOuNull(corpo.temaId);
    if (!temaId) throw erro('Tema obrigatorio.');
    const tema = await CalendarioMissionarioModel.buscarTema(temaId);
    if (!tema) throw erro('Tema nao encontrado.', 404);

    const nome = texto(corpo.nome);
    if (!nome) throw erro('Informe o nome do evento.');

    const evento = await CalendarioMissionarioModel.criarEvento({
      temaId,
      nome,
      descricao: texto(corpo.descricao),
      data: dataOuNull(corpo.data, tema.ano),
      departamento: texto(corpo.departamento) || 'OUTRO',
      criadoPorId: usuario.id,
      criadoPorPerfil: usuario.perfil,
      criadoPorNome: usuario.nome,
    });
    return formatarEvento(evento, usuario);
  },

  async atualizarEvento(usuario, id, corpo) {
    exigirPerfilEvento(usuario);
    const atual = await CalendarioMissionarioModel.buscarEvento(id);
    if (!atual) throw erro('Evento nao encontrado.', 404);

    const nome = texto(corpo.nome);
    if (!nome) throw erro('Informe o nome do evento.');

    const evento = await CalendarioMissionarioModel.atualizarEvento(id, {
      nome,
      descricao: texto(corpo.descricao),
      data: dataOuNull(corpo.data, atual.tema.ano),
      departamento: texto(corpo.departamento) || 'OUTRO',
    });
    return formatarEvento(evento, usuario);
  },

  async excluirEvento(usuario, id) {
    exigirPerfilEvento(usuario);
    const atual = await CalendarioMissionarioModel.buscarEvento(id);
    if (!atual) throw erro('Evento nao encontrado.', 404);
    await CalendarioMissionarioModel.excluirEvento(id);
  },

  // Ações Missionárias
  async criarAcao(usuario, corpo) {
    exigirPerfilAcao(usuario);
    let temaId = idOuNull(corpo.temaId);
    const eventoId = idOuNull(corpo.eventoId);

    if (eventoId) {
      const evento = await CalendarioMissionarioModel.buscarEvento(eventoId);
      if (!evento) throw erro('Evento nao encontrado.', 404);
      temaId = evento.temaId;
    }

    if (!temaId) throw erro('Tema ou Evento obrigatorio.');
    const tema = await CalendarioMissionarioModel.buscarTema(temaId);
    if (!tema) throw erro('Tema nao encontrado.', 404);

    const origem = await resolverOrigem(usuario, corpo);
    const acao = await CalendarioMissionarioModel.criarAcao({
      ...dadosAcao(corpo, tema.ano),
      ...origem,
      temaId,
      eventoId: eventoId || null,
      criadoPorId: usuario.id,
      criadoPorPerfil: usuario.perfil,
      criadoPorNome: usuario.nome,
    });
    return formatarAcao(acao, usuario);
  },

  async atualizarAcao(usuario, id, corpo) {
    exigirPerfilAcao(usuario);
    const atual = await CalendarioMissionarioModel.buscarAcao(id);
    if (!atual) throw erro('Acao nao encontrada.', 404);
    if (!formatarAcao(atual, usuario).podeEditar) throw erro('Voce so pode editar as acoes que cadastrou.');
    const tema = await CalendarioMissionarioModel.buscarTema(atual.temaId);
    const mudouOrigem = ['regiaoId', 'distritoId', 'igrejaId'].some((c) => corpo[c] !== undefined);
    const origem = mudouOrigem ? await resolverOrigem(usuario, corpo) : {};
    const acao = await CalendarioMissionarioModel.atualizarAcao(id, { ...dadosAcao(corpo, tema.ano), ...origem });
    return formatarAcao(acao, usuario);
  },

  async excluirAcao(usuario, id) {
    exigirPerfilAcao(usuario);
    const atual = await CalendarioMissionarioModel.buscarAcao(id);
    if (!atual) throw erro('Acao nao encontrada.', 404);
    if (!formatarAcao(atual, usuario).podeEditar) throw erro('Voce so pode excluir as acoes que cadastrou.');
    await CalendarioMissionarioModel.excluirAcao(id);
  },

  async criarModelo(usuario, corpo = {}) {
    exigirAdmin(usuario);
    const ano = anoValido(corpo.ano);
    return this.obter(usuario, { ano });
  },
};

module.exports = CalendarioMissionarioService;
