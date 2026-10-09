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

const PERFIS_CONFIGURAVEIS = [
  PERFIS.PASTOR_REGIONAL,
  PERFIS.COORDENADOR_REGIONAL,
  PERFIS.PASTOR_DISTRITAL,
  PERFIS.DIRETOR_MISSIONARIO_IGREJA,
  PERFIS.DUPLA_MISSIONARIA,
];

const CHAVES_EDICAO = [
  'podeCriarTema', 'podeEditarTema', 'podeExcluirTema',
  'podeCriarEvento', 'podeEditarEvento', 'podeExcluirEvento',
  'podeCriarAcao', 'podeEditarAcao', 'podeExcluirAcao',
  'podeEditarPlanejamento', 'podeEditarOrcamento',
];

const acessoTotal = () => ({
  podeVisualizar: true,
  podeEditar: true,
  ...Object.fromEntries(CHAVES_EDICAO.map((chave) => [chave, true])),
  regra: null,
});

const aplicarSomenteLeitura = (usuario, acesso) => {
  if (!usuario.somenteLeitura) return acesso;
  return {
    ...acesso,
    podeEditar: false,
    ...Object.fromEntries(CHAVES_EDICAO.map((chave) => [chave, false])),
  };
};

const acessoPadrao = (usuario) => {
  const podeEvento = PERFIS_EVENTO.includes(usuario.perfil) && !usuario.somenteLeitura;
  const podeAcao = PERFIS_ACAO.includes(usuario.perfil) && !usuario.somenteLeitura;
  return {
    podeVisualizar: PERFIS_ACAO.includes(usuario.perfil),
    podeEditar: podeEvento || podeAcao,
    podeCriarTema: false,
    podeEditarTema: false,
    podeExcluirTema: false,
    podeCriarEvento: podeEvento,
    podeEditarEvento: podeEvento,
    podeExcluirEvento: podeEvento,
    podeCriarAcao: podeAcao,
    podeEditarAcao: podeAcao,
    podeExcluirAcao: podeAcao,
    podeEditarPlanejamento: podeAcao,
    podeEditarOrcamento: podeAcao,
    regra: null,
  };
};

const chavePermissao = (perfil, regiaoId, distritoId = null) => (
  `${perfil}:${distritoId ? `D:${distritoId}` : `R:${regiaoId}`}`
);

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
    if (!igreja) throw erro('Usuario sem igreja vinculada.', 403);
    return { regiaoId: igreja.distrito.regiaoId, distritoId: igreja.distritoId, igrejaId: igreja.id };
  }
  throw erro('Seu perfil nao possui acesso ao calendario.', 403);
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

async function permissaoEfetiva(usuario, ctxRecebido = null) {
  if (ehAdmin(usuario.perfil)) {
    return aplicarSomenteLeitura(usuario, acessoTotal());
  }

  const padrao = acessoPadrao(usuario);
  const ctx = ctxRecebido || await contexto(usuario);
  if (!ctx.regiaoId || !PERFIS_CONFIGURAVEIS.includes(usuario.perfil)) return padrao;

  if (ctx.distritoId) {
    const distrital = await CalendarioMissionarioModel.buscarPermissaoPorChave(
      chavePermissao(usuario.perfil, ctx.regiaoId, ctx.distritoId)
    );
    if (distrital) return aplicarSomenteLeitura(usuario, { ...padrao, ...distrital, regra: 'DISTRITO' });
  }

  const regional = await CalendarioMissionarioModel.buscarPermissaoPorChave(
    chavePermissao(usuario.perfil, ctx.regiaoId)
  );
  return aplicarSomenteLeitura(
    usuario,
    regional ? { ...padrao, ...regional, regra: 'REGIAO' } : padrao
  );
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
const formatarAcao = (a, usuario, acesso = acessoTotal()) => {
  const propria = a.criadoPorId != null && a.criadoPorId === usuario.id;
  const adminPodeEditar = ehAdmin(usuario.perfil) && !usuario.somenteLeitura;
  const podeAlterar = acesso.podeEditarAcao
    || acesso.podeEditarPlanejamento || acesso.podeEditarOrcamento;
  return ({
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
    podeEditar: adminPodeEditar || (propria && podeAlterar),
    podeExcluir: adminPodeEditar || (propria && acesso.podeExcluirAcao),
    podeEditarDados: adminPodeEditar || (propria && acesso.podeEditarAcao),
    podeEditarPlanejamento: adminPodeEditar || (propria && acesso.podeEditarPlanejamento),
    podeEditarOrcamento: adminPodeEditar || (propria && acesso.podeEditarOrcamento),
  });
};

const formatarEvento = (e, usuario, acesso) => {
  const acoes = (e.acoes || []).map((a) => formatarAcao(a, usuario, acesso));
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
    podeEditar: ehAdmin(usuario.perfil) || (
      acesso.podeEditarEvento
    ),
  };
};

const formatarTema = (t, usuario, acesso = { podeEditar: true }) => {
  const eventos = (t.eventos || []).map((e) => formatarEvento(e, usuario, acesso));
  const acoes = (t.acoes || []).map((a) => formatarAcao(a, usuario, acesso));
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
  if (!ehAdmin(usuario.perfil)) throw erro('Somente administradores podem executar esta operacao.', 403);
};

const exigirPermissao = async (usuario, chave, mensagem) => {
  if (usuario.somenteLeitura) throw erro('Este acesso esta configurado apenas para consulta.', 403);
  if (ehAdmin(usuario.perfil)) return acessoTotal();
  const acesso = await permissaoEfetiva(usuario);
  if (!acesso[chave]) throw erro(mensagem || 'Esta operacao nao foi liberada para o seu perfil neste local.', 403);
  return acesso;
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
    const ctx = await contexto(usuario);
    const acesso = await permissaoEfetiva(usuario, ctx);
    if (!acesso.podeVisualizar) throw erro('O calendario missionario nao esta liberado para o seu perfil neste local.', 403);
    const condicoes = [filtroVisao(ctx), await filtroSelecao(query)].filter(Boolean);
    const temas = await CalendarioMissionarioModel.listarTemas(ano, condicoes.length ? { AND: condicoes } : undefined);
    return {
      ano,
      temas: temas.map((t) => formatarTema(t, usuario, acesso)),
      permissoes: {
        gerenciarTemas: acesso.podeEditarTema && !usuario.somenteLeitura,
        criarTema: acesso.podeCriarTema && !usuario.somenteLeitura,
        editarTema: acesso.podeEditarTema && !usuario.somenteLeitura,
        excluirTema: acesso.podeExcluirTema && !usuario.somenteLeitura,
        gerenciarEventos: acesso.podeEditarEvento && !usuario.somenteLeitura,
        criarEvento: acesso.podeCriarEvento && !usuario.somenteLeitura,
        editarEvento: acesso.podeEditarEvento && !usuario.somenteLeitura,
        excluirEvento: acesso.podeExcluirEvento && !usuario.somenteLeitura,
        criarAcao: acesso.podeCriarAcao && !usuario.somenteLeitura,
        editarAcao: acesso.podeEditarAcao && !usuario.somenteLeitura,
        excluirAcao: acesso.podeExcluirAcao && !usuario.somenteLeitura,
        editarPlanejamento: acesso.podeEditarPlanejamento && !usuario.somenteLeitura,
        editarOrcamento: acesso.podeEditarOrcamento && !usuario.somenteLeitura,
        visualizar: acesso.podeVisualizar,
        editar: acesso.podeEditar && !usuario.somenteLeitura,
        regraAplicada: acesso.regra || null,
      },
    };
  },

  async criarTema(usuario, corpo) {
    await exigirPermissao(usuario, 'podeCriarTema', 'A criacao de temas nao foi liberada para o seu perfil neste local.');
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
    await exigirPermissao(usuario, 'podeEditarTema', 'A edicao de temas nao foi liberada para o seu perfil neste local.');
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
    await exigirPermissao(usuario, 'podeExcluirTema', 'A exclusao de temas nao foi liberada para o seu perfil neste local.');
    if (!await CalendarioMissionarioModel.buscarTema(id)) throw erro('Tema nao encontrado.', 404);
    await CalendarioMissionarioModel.excluirTema(id);
  },

  // Eventos do Tema
  async criarEvento(usuario, corpo) {
    const acesso = await exigirPermissao(usuario, 'podeCriarEvento', 'A criacao de eventos nao foi liberada para o seu perfil neste local.');
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
    return formatarEvento(evento, usuario, acesso);
  },

  async atualizarEvento(usuario, id, corpo) {
    const acesso = await exigirPermissao(usuario, 'podeEditarEvento', 'A edicao de eventos nao foi liberada para o seu perfil neste local.');
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
    return formatarEvento(evento, usuario, acesso);
  },

  async excluirEvento(usuario, id) {
    await exigirPermissao(usuario, 'podeExcluirEvento', 'A exclusao de eventos nao foi liberada para o seu perfil neste local.');
    const atual = await CalendarioMissionarioModel.buscarEvento(id);
    if (!atual) throw erro('Evento nao encontrado.', 404);
    await CalendarioMissionarioModel.excluirEvento(id);
  },

  // Ações Missionárias
  async criarAcao(usuario, corpo) {
    const acesso = await exigirPermissao(usuario, 'podeCriarAcao', 'A criacao de acoes nao foi liberada para o seu perfil neste local.');
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
    const dados = dadosAcao(corpo, tema.ano);
    if (!acesso.podeEditarPlanejamento) dados.descricao = null;
    if (!acesso.podeEditarOrcamento) dados.valor = 0;
    const acao = await CalendarioMissionarioModel.criarAcao({
      ...dados,
      ...origem,
      temaId,
      eventoId: eventoId || null,
      criadoPorId: usuario.id,
      criadoPorPerfil: usuario.perfil,
      criadoPorNome: usuario.nome,
    });
    return formatarAcao(acao, usuario, acesso);
  },

  async atualizarAcao(usuario, id, corpo) {
    const acesso = await permissaoEfetiva(usuario);
    const atual = await CalendarioMissionarioModel.buscarAcao(id);
    if (!atual) throw erro('Acao nao encontrada.', 404);
    if (!formatarAcao(atual, usuario, acesso).podeEditar) throw erro('Voce so pode editar as acoes que cadastrou.');
    const tema = await CalendarioMissionarioModel.buscarTema(atual.temaId);
    const dados = dadosAcao(corpo, tema.ano);
    if (!ehAdmin(usuario.perfil)) {
      if (!acesso.podeEditarAcao) {
        Object.assign(dados, {
          nome: atual.nome,
          data: atual.data,
          responsavel: atual.responsavel,
          departamento: atual.departamento,
          status: atual.status,
        });
      }
      if (!acesso.podeEditarPlanejamento) dados.descricao = atual.descricao;
      if (!acesso.podeEditarOrcamento) dados.valor = atual.valor;
    }
    const mudouOrigem = (ehAdmin(usuario.perfil) || acesso.podeEditarAcao)
      && ['regiaoId', 'distritoId', 'igrejaId'].some((c) => corpo[c] !== undefined);
    const origem = mudouOrigem ? await resolverOrigem(usuario, corpo) : {};
    const acao = await CalendarioMissionarioModel.atualizarAcao(id, { ...dados, ...origem });
    return formatarAcao(acao, usuario, acesso);
  },

  async excluirAcao(usuario, id) {
    const acesso = await exigirPermissao(usuario, 'podeExcluirAcao', 'A exclusao de acoes nao foi liberada para o seu perfil neste local.');
    const atual = await CalendarioMissionarioModel.buscarAcao(id);
    if (!atual) throw erro('Acao nao encontrada.', 404);
    if (!formatarAcao(atual, usuario, acesso).podeExcluir) throw erro('Voce so pode excluir as acoes que cadastrou.');
    await CalendarioMissionarioModel.excluirAcao(id);
  },

  // Permissoes de acesso por regiao/distrito
  async listarPermissoes(usuario) {
    exigirAdmin(usuario);
    return CalendarioMissionarioModel.listarPermissoes();
  },

  async salvarPermissao(usuario, corpo) {
    exigirAdmin(usuario);
    const perfisRecebidos = Array.isArray(corpo.perfis) ? corpo.perfis : [corpo.perfil];
    const perfis = [...new Set(perfisRecebidos.filter((perfil) => PERFIS_CONFIGURAVEIS.includes(perfil)))];
    if (!perfis.length || perfisRecebidos.filter(Boolean).some((perfil) => !PERFIS_CONFIGURAVEIS.includes(perfil))) {
      throw erro('Selecione ao menos um nivel de acesso valido.');
    }

    const regiaoIds = [...new Set(
      (Array.isArray(corpo.regiaoIds) ? corpo.regiaoIds : [corpo.regiaoId]).map(idOuNull).filter(Boolean)
    )];
    const distritoIds = [...new Set(
      (Array.isArray(corpo.distritoIds) ? corpo.distritoIds : [corpo.distritoId]).map(idOuNull).filter(Boolean)
    )];
    const usarDistritos = corpo.abrangencia === 'DISTRITO' || distritoIds.length > 0;
    if (!usarDistritos && !regiaoIds.length) throw erro('Selecione ao menos uma regiao.');
    if (usarDistritos && !distritoIds.length) throw erro('Selecione ao menos um distrito.');

    const alvos = [];
    if (usarDistritos) {
      for (const distritoId of distritoIds) {
        const distrito = await CalendarioMissionarioModel.buscarDistrito(distritoId);
        if (!distrito) throw erro('Um dos distritos selecionados nao foi encontrado.', 404);
        if (regiaoIds.length && !regiaoIds.includes(Number(distrito.regiaoId))) {
          throw erro('Um dos distritos selecionados nao pertence as regioes escolhidas.');
        }
        alvos.push({ regiaoId: Number(distrito.regiaoId), distritoId });
      }
    } else {
      for (const regiaoId of regiaoIds) {
        if (!await CalendarioMissionarioModel.buscarRegiao(regiaoId)) throw erro('Uma das regioes selecionadas nao foi encontrada.', 404);
        alvos.push({ regiaoId, distritoId: null });
      }
    }

    const podeVisualizar = corpo.podeVisualizar !== false;
    const detalhes = Object.fromEntries(CHAVES_EDICAO.map((chave) => [
      chave,
      podeVisualizar && corpo[chave] === true,
    ]));
    const podeEditar = podeVisualizar && Object.values(detalhes).some(Boolean);
    const salvas = [];
    for (const perfil of perfis) {
      for (const alvo of alvos) {
        salvas.push(await CalendarioMissionarioModel.salvarPermissao(
          chavePermissao(perfil, alvo.regiaoId, alvo.distritoId),
          {
            perfil,
            ...alvo,
            podeVisualizar,
            podeEditar,
            ...detalhes,
            criadoPorId: usuario.id,
          }
        ));
      }
    }
    return salvas;
  },

  async excluirPermissao(usuario, id) {
    exigirAdmin(usuario);
    await CalendarioMissionarioModel.excluirPermissao(id);
  },

  async criarModelo(usuario, corpo = {}) {
    exigirAdmin(usuario);
    const ano = anoValido(corpo.ano);
    return this.obter(usuario, { ano });
  },
};

module.exports = CalendarioMissionarioService;
