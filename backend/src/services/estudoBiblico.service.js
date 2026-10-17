const EstudoBiblicoModel = require('../models/estudoBiblico.model');
const prisma = require('../lib/prisma');
const { PERFIS } = require('../middlewares/auth');
const { montarEscopo, validarDistrito, validarIgreja } = require('./escopo.service');
const { registrarAtividade } = require('./notificacoesAtividade.service');

const whereEstudoEmAndamento = {
  encerrado: false,
  statusEstudo: 'EM_ANDAMENTO',
};

const whereEstudoEncerrado = {
  OR: [
    { encerrado: true },
    { statusEstudo: 'ENCERRADO' },
  ],
};

// Aplica filtros de escopo por perfil + filtros opcionais da query
const montarFiltro = async (query = {}, usuario = null) => {
  let where = {};

  // â”€â”€â”€ RestriÃ§Ãµes por perfil â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (usuario) {
    const escopo = await montarEscopo(usuario);
    where = { ...where, ...escopo.estudo };
    // SUPER_ADMIN e ADMINISTRADOR: sem restriÃ§Ã£o
  }

  // â”€â”€â”€ Filtros opcionais (ignorados para DUPLA_MISSIONARIA) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!usuario || usuario.perfil !== PERFIS.DUPLA_MISSIONARIA) {
    if (query.duplaId) where.duplaId = Number(query.duplaId);
  }
  if (query.serie) where.serie = query.serie;
  if (query.encerrado !== 'todos') {
    where.AND = [
      ...(where.AND || []),
      query.encerrado === 'true' ? whereEstudoEncerrado : whereEstudoEmAndamento,
    ];
  }
  if (query.licaoAtual) where.licaoAtual = Number(query.licaoAtual);
  if (query.cidade) where.cidade = { contains: query.cidade, mode: 'insensitive' };
  if (query.tipoEstudo) where.tipoEstudo = query.tipoEstudo;
  if (query.nome) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { nomeEstudante: { contains: query.nome, mode: 'insensitive' } },
          { participantes: { some: { nome: { contains: query.nome, mode: 'insensitive' } } } },
        ],
      },
    ];
  }
  if (query.classificacaoInteressado) {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          { classificacaoInteressado: query.classificacaoInteressado },
          { participantes: { some: { classificacaoInteressado: query.classificacaoInteressado } } },
        ],
      },
    ];
  }
  if (query.dataInicio || query.dataFim) {
    where.criadoEm = {};
    if (query.dataInicio) where.criadoEm.gte = new Date(query.dataInicio);
    if (query.dataFim) where.criadoEm.lte = new Date(`${query.dataFim}T23:59:59.999Z`);
  }

  return where;
};

const normalizarBoolean = (valor) => {
  if (valor === undefined) return undefined;
  if (typeof valor === 'boolean') return valor;
  return valor === 'true';
};

// Normaliza os dados do estudo bÃ­blico para persistÃªncia
const normalizarEstudo = (data, duplaIdPadrao = null) => {
  const encerrado = normalizarBoolean(data.encerrado);

  return ({
  nomeEstudante: data.nomeEstudante,
  endereco: data.endereco || 'Nao informado',
  cidade: data.cidade || 'Nao informada',
  estado: data.estado || 'SP',
  whatsapp: data.whatsapp,
  diaEstudo: data.diaEstudo || 'Nao informado',
  horarioEstudo: data.horarioEstudo || null,
  duplaId: Number(data.duplaId || duplaIdPadrao),
  serie: data.serie || 'Nao informado',
  licaoAtual: Number(data.licaoAtual || 1),
  tipoEstudo: data.tipoEstudo || 'UNICO',
  sexo: data.sexo || null,
  classificacaoInteressado: data.classificacaoInteressado || null,
  motivoImpedimento: data.motivoImpedimento || null,
  vaIgreja: data.vaIgreja !== undefined ? Boolean(data.vaIgreja) : null,
  leBiblia: data.leBiblia !== undefined ? Boolean(data.leBiblia) : null,
  estudaLicao: data.estudaLicao !== undefined ? Boolean(data.estudaLicao) : null,
  devolveDizimos: data.devolveDizimos !== undefined ? Boolean(data.devolveDizimos) : null,
  cultoFamiliar: data.cultoFamiliar !== undefined ? Boolean(data.cultoFamiliar) : null,
  observacoes: data.observacoes || null,
  statusEstudo: data.statusEstudo || (encerrado === true ? 'ENCERRADO' : encerrado === false ? 'EM_ANDAMENTO' : undefined),
  encerrado,
  motivoEncerramento: data.motivoEncerramento !== undefined ? data.motivoEncerramento || null : undefined,
  encerradoEm: encerrado !== undefined ? (encerrado ? new Date() : null) : undefined,
  });
};

const encerrado = (estudo) => estudo?.encerrado === true || estudo?.statusEstudo === 'ENCERRADO';
const batismo = (estudo) => String(estudo?.motivoEncerramento || '').trim().toUpperCase() === 'BATISMO';
const participantesResumo = (estudo) => JSON.stringify((estudo?.participantes || [])
  .map((item) => [item.nome, item.classificacaoInteressado, item.motivoImpedimento]));
const camposAcompanhados = [
  'nomeEstudante', 'serie', 'diaEstudo', 'horarioEstudo', 'classificacaoInteressado',
  'motivoImpedimento', 'vaIgreja', 'leBiblia', 'estudaLicao', 'devolveDizimos',
  'cultoFamiliar', 'observacoes', 'tipoEstudo', 'motivoEncerramento',
];

function descreverMudancaEstudo(atual, anterior = null, removido = false) {
  const nome = atual.nomeEstudante;
  let titulo;
  let mensagem;
  if (removido) {
    titulo = 'Estudo removido';
    mensagem = `O estudo de ${nome} foi removido.`;
  } else if (!anterior) {
    titulo = encerrado(atual) && batismo(atual) ? 'Batismo registrado' : 'Novo estudo bíblico';
    mensagem = titulo === 'Batismo registrado'
      ? `O estudo de ${nome} foi cadastrado como encerrado por batismo.`
      : `Um novo estudo de ${nome} foi cadastrado.`;
  } else if (batismo(atual) && !batismo(anterior) && encerrado(atual)) {
    titulo = 'Batismo registrado';
    mensagem = `O estudo de ${nome} foi encerrado com batismo.`;
  } else if (!encerrado(anterior) && encerrado(atual)) {
    titulo = 'Estudo encerrado';
    mensagem = `O estudo de ${nome} foi encerrado${atual.motivoEncerramento ? `: ${atual.motivoEncerramento}` : '.'}`;
  } else if (encerrado(anterior) && !encerrado(atual)) {
    titulo = 'Estudo reaberto';
    mensagem = `O estudo de ${nome} voltou a ficar em andamento.`;
  } else if (anterior.licaoAtual !== atual.licaoAtual) {
    titulo = 'Lição do estudo atualizada';
    mensagem = `O estudo de ${nome} passou da lição ${anterior.licaoAtual} para a ${atual.licaoAtual}.`;
  } else if (camposAcompanhados.some((campo) => anterior[campo] !== atual[campo]) ||
    participantesResumo(anterior) !== participantesResumo(atual)) {
    titulo = 'Estudo atualizado';
    mensagem = `Os dados do estudo de ${nome} foram atualizados.`;
  } else {
    return null;
  }
  return { titulo, mensagem };
}

async function avisarEstudo(usuario, atual, anterior = null, removido = false) {
  const aviso = descreverMudancaEstudo(atual, anterior, removido);
  if (!aviso) return;
  await registrarAtividade({
    ator: usuario, duplaId: atual.duplaId, ...aviso,
    url: `/duplas/${atual.duplaId}`,
  });
}

const EstudoBiblicoService = {
  // Lista estudos bÃ­blicos filtrados por escopo de perfil
  async listar(query, usuario) {
    const where = await montarFiltro(query, usuario);
    const paginado = query.paginado === '1' || query.paginado === 'true';
    return EstudoBiblicoModel.findAll(where, {
      paginado,
      pagina: query.pagina,
      limite: query.limite,
    });
  },

  async buscarPorId(id, usuario) {
    const estudo = await EstudoBiblicoModel.findById(id);
    if (!estudo) throw { status: 404, mensagem: 'Estudo bÃ­blico nÃ£o encontrado.' };

    // DUPLA_MISSIONARIA sÃ³ pode ver estudos da prÃ³pria dupla
    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (!usuario.duplaId || Number(estudo.duplaId) !== Number(usuario.duplaId)) {
        throw { status: 403, mensagem: 'Acesso negado: estudo pertence a outra dupla.' };
      }
    } else if (usuario && estudo.dupla?.igreja?.id) {
      await validarIgreja(usuario, estudo.dupla.igreja.id);
    } else if (usuario && estudo.dupla?.distrito?.id) {
      if (usuario.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
        throw { status: 403, mensagem: 'Acesso negado: estudo sem igreja vinculada.' };
      }
      await validarDistrito(usuario, estudo.dupla.distrito.id);
    }
    return estudo;
  },

  // CriaÃ§Ã£o com validaÃ§Ã£o de escopo para DUPLA_MISSIONARIA
  async criar(data, usuario) {
    let duplaIdPadrao = data.duplaId;
    if (!duplaIdPadrao) {
      const escopo = await montarEscopo(usuario);
      const dupla = await prisma.dupla.findFirst({
        where: escopo.dupla,
        select: { id: true },
        orderBy: { id: 'asc' },
      });
      duplaIdPadrao = dupla?.id;
    }
    if (!duplaIdPadrao) throw { status: 400, mensagem: 'Nao ha dupla disponivel para vincular este cadastro.' };

    if (usuario) {
      if (usuario.perfil === PERFIS.DUPLA_MISSIONARIA && Number(duplaIdPadrao) !== Number(usuario.duplaId)) {
        throw { status: 403, mensagem: 'Acesso negado: esta não é a sua dupla.' };
      }
      const dupla = await prisma.dupla.findUnique({
        where: { id: Number(duplaIdPadrao) },
        select: { igrejaId: true, distritoId: true },
      });
      if (!dupla) throw { status: 404, mensagem: 'Dupla não encontrada.' };
      if (!dupla.igrejaId && usuario.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
        throw { status: 403, mensagem: 'Acesso negado: dupla sem igreja vinculada.' };
      }
      if (dupla.igrejaId) await validarIgreja(usuario, dupla.igrejaId);
      else await validarDistrito(usuario, dupla.distritoId);
    }

    const dadosEstudo = normalizarEstudo(data, duplaIdPadrao);
    const participantes = data.participantes || [];

    if ((dadosEstudo.tipoEstudo === 'PONTO' || dadosEstudo.tipoEstudo === 'CLASSE') && participantes.length > 0) {
      const estudo = await prisma.$transaction(async (tx) => {
        const estudo = await tx.estudoBiblico.create({
          data: {
            ...dadosEstudo,
            participantes: {
              create: participantes.map((p) => ({
                nome: p.nome,
                whatsapp: p.whatsapp || null,
                sexo: p.sexo || null,
                endereco: p.endereco || null,
                classificacaoInteressado: p.classificacaoInteressado || null,
                motivoImpedimento: p.motivoImpedimento || null,
              })),
            },
          },
          include: {
            dupla: {
              select: {
                id: true,
                liderNome: true,
                membro2Nome: true,
                bairro: true,
                distrito: { select: { nome: true, regiao: { select: { nome: true } } } },
              },
            },
            participantes: true,
          },
        });
        return estudo;
      });
      await avisarEstudo(usuario, estudo);
      return estudo;
    }

    const estudo = await EstudoBiblicoModel.create(dadosEstudo);
    await avisarEstudo(usuario, estudo);
    return estudo;
  },

  // AtualizaÃ§Ã£o com validaÃ§Ã£o de escopo para DUPLA_MISSIONARIA
  async atualizar(id, data, usuario) {
    const anterior = await this.buscarPorId(id, usuario);
    let duplaIdPadrao = data.duplaId;
    if (!duplaIdPadrao) {
      const atual = await EstudoBiblicoModel.findById(id);
      duplaIdPadrao = atual?.dupla?.id;
    }
    if (usuario && data.duplaId) {
      if (usuario.perfil === PERFIS.DUPLA_MISSIONARIA && Number(data.duplaId) !== Number(usuario.duplaId)) {
        throw { status: 403, mensagem: 'Acesso negado: esta não é a sua dupla.' };
      }
      const dupla = await prisma.dupla.findUnique({
        where: { id: Number(data.duplaId) },
        select: { igrejaId: true, distritoId: true },
      });
      if (!dupla) throw { status: 404, mensagem: 'Dupla não encontrada.' };
      if (!dupla.igrejaId && usuario.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
        throw { status: 403, mensagem: 'Acesso negado: dupla sem igreja vinculada.' };
      }
      if (dupla.igrejaId) await validarIgreja(usuario, dupla.igrejaId);
      else await validarDistrito(usuario, dupla.distritoId);
    }
    const dadosEstudo = normalizarEstudo(data, duplaIdPadrao);
    const participantes = data.participantes;

    if (participantes !== undefined) {
      const atualizado = await prisma.$transaction(async (tx) => {
        await tx.participante.deleteMany({ where: { estudoBiblicoId: Number(id) } });

        return tx.estudoBiblico.update({
          where: { id: Number(id) },
          data: {
            ...dadosEstudo,
            participantes: {
              create: participantes.map((p) => ({
                nome: p.nome,
                whatsapp: p.whatsapp || null,
                sexo: p.sexo || null,
                endereco: p.endereco || null,
                classificacaoInteressado: p.classificacaoInteressado || null,
                motivoImpedimento: p.motivoImpedimento || null,
              })),
            },
          },
          include: {
            dupla: {
              select: {
                id: true,
                liderNome: true,
                membro2Nome: true,
                bairro: true,
                distrito: { select: { nome: true, regiao: { select: { nome: true } } } },
              },
            },
            participantes: true,
          },
        });
      });
      await avisarEstudo(usuario, atualizado, anterior);
      return atualizado;
    }

    const atualizado = await EstudoBiblicoModel.update(id, dadosEstudo);
    await avisarEstudo(usuario, atualizado, anterior);
    return atualizado;
  },

  async remover(id, usuario) {
    const anterior = await this.buscarPorId(id, usuario);
    const removido = await EstudoBiblicoModel.remove(id);
    await avisarEstudo(usuario, anterior, null, true);
    return removido;
  },

  async reabrir(id, usuario) {
    const anterior = await this.buscarPorId(id, usuario);
    const atualizado = await EstudoBiblicoModel.update(id, {
      encerrado: false,
      statusEstudo: 'EM_ANDAMENTO',
      motivoEncerramento: null,
      encerradoEm: null,
    });
    await avisarEstudo(usuario, atualizado, anterior);
    return atualizado;
  },
};

EstudoBiblicoService.descreverMudancaEstudo = descreverMudancaEstudo;
module.exports = EstudoBiblicoService;
