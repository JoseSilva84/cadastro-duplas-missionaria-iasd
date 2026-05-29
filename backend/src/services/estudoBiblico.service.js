const EstudoBiblicoModel = require('../models/estudoBiblico.model');
const prisma = require('../lib/prisma');
const { PERFIS } = require('../middlewares/auth');
const { montarEscopo, validarDistrito, validarIgreja } = require('./escopo.service');

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
  if (query.licaoAtual) where.licaoAtual = Number(query.licaoAtual);
  if (query.cidade) where.cidade = { contains: query.cidade, mode: 'insensitive' };
  if (query.tipoEstudo) where.tipoEstudo = query.tipoEstudo;
  if (query.classificacaoInteressado) where.classificacaoInteressado = query.classificacaoInteressado;
  if (query.dataInicio || query.dataFim) {
    where.criadoEm = {};
    if (query.dataInicio) where.criadoEm.gte = new Date(query.dataInicio);
    if (query.dataFim) where.criadoEm.lte = new Date(`${query.dataFim}T23:59:59.999Z`);
  }

  return where;
};

// Normaliza os dados do estudo bÃ­blico para persistÃªncia
const normalizarEstudo = (data, duplaIdPadrao = null) => ({
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
});

const EstudoBiblicoService = {
  // Lista estudos bÃ­blicos filtrados por escopo de perfil
  async listar(query, usuario) {
    const where = await montarFiltro(query, usuario);
    return EstudoBiblicoModel.findAll(where);
  },

  async buscarPorId(id, usuario) {
    const estudo = await EstudoBiblicoModel.findById(id);
    if (!estudo) throw { status: 404, mensagem: 'Estudo bÃ­blico nÃ£o encontrado.' };

    // DUPLA_MISSIONARIA sÃ³ pode ver estudos da prÃ³pria dupla
    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (usuario.duplaId) {
        const escopo = await montarEscopo(usuario);
        if (estudo.dupla?.igreja?.id !== escopo.igrejaId) {
          throw { status: 403, mensagem: 'Acesso negado: estudo pertence a outra igreja.' };
        }
      }
    } else if (usuario && estudo.dupla?.igreja?.id) {
      await validarIgreja(usuario, estudo.dupla.igreja.id);
    } else if (usuario && estudo.dupla?.distrito?.id) {
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
      const dupla = await prisma.dupla.findUnique({
        where: { id: Number(duplaIdPadrao) },
        select: { igrejaId: true },
      });
      if (!dupla) throw { status: 404, mensagem: 'Dupla não encontrada.' };
      if (dupla.igrejaId) await validarIgreja(usuario, dupla.igrejaId);
    }

    const dadosEstudo = normalizarEstudo(data, duplaIdPadrao);
    const participantes = data.participantes || [];

    if ((dadosEstudo.tipoEstudo === 'PONTO' || dadosEstudo.tipoEstudo === 'CLASSE') && participantes.length > 0) {
      return prisma.$transaction(async (tx) => {
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
    }

    return EstudoBiblicoModel.create(dadosEstudo);
  },

  // AtualizaÃ§Ã£o com validaÃ§Ã£o de escopo para DUPLA_MISSIONARIA
  async atualizar(id, data, usuario) {
    await this.buscarPorId(id, usuario);
    let duplaIdPadrao = data.duplaId;
    if (!duplaIdPadrao) {
      const atual = await EstudoBiblicoModel.findById(id);
      duplaIdPadrao = atual?.dupla?.id;
    }
    if (usuario && data.duplaId) {
      const dupla = await prisma.dupla.findUnique({
        where: { id: Number(data.duplaId) },
        select: { igrejaId: true },
      });
      if (!dupla) throw { status: 404, mensagem: 'Dupla não encontrada.' };
      await validarIgreja(usuario, dupla.igrejaId);
    }
    const dadosEstudo = normalizarEstudo(data, duplaIdPadrao);
    const participantes = data.participantes;

    if (participantes !== undefined) {
      return prisma.$transaction(async (tx) => {
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
    }

    return EstudoBiblicoModel.update(id, dadosEstudo);
  },

  async remover(id, usuario) {
    await this.buscarPorId(id, usuario);
    return EstudoBiblicoModel.remove(id);
  },
};

module.exports = EstudoBiblicoService;
