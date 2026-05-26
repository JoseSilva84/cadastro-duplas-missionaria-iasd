const EstudoBiblicoModel = require('../models/estudoBiblico.model');
const prisma = require('../lib/prisma');
const { PERFIS } = require('../middlewares/auth');

// Aplica filtros de escopo por perfil + filtros opcionais da query
const montarFiltro = async (query = {}, usuario = null) => {
  const where = {};

  // ─── Restrições por perfil ──────────────────────────────────────────────────
  if (usuario) {
    const { perfil, duplaId, distritoId, regiaoId } = usuario;

    if (perfil === PERFIS.DUPLA_MISSIONARIA) {
      // Dupla só vê estudos da própria dupla
      if (!duplaId) throw { status: 403, mensagem: 'Dupla não vinculada a este usuário.' };
      where.duplaId = duplaId;
    } else if (perfil === PERFIS.PASTOR_DISTRITAL && distritoId) {
      // Pastor Distrital só vê estudos de duplas do seu distrito
      where.dupla = { is: { distritoId } };
    } else if (
      (perfil === PERFIS.PASTOR_REGIONAL || perfil === PERFIS.COORDENADOR_REGIONAL) &&
      regiaoId
    ) {
      // Pastor Regional e Coordenador veem estudos de duplas da sua região
      where.dupla = { is: { distrito: { is: { regiaoId } } } };
    }
    // SUPER_ADMIN e ADMINISTRADOR: sem restrição
  }

  // ─── Filtros opcionais (ignorados para DUPLA_MISSIONARIA) ──────────────────
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

// Normaliza os dados do estudo bíblico para persistência
const normalizarEstudo = (data) => ({
  nomeEstudante: data.nomeEstudante,
  endereco: data.endereco,
  cidade: data.cidade,
  estado: data.estado,
  whatsapp: data.whatsapp,
  diaEstudo: data.diaEstudo,
  horarioEstudo: data.horarioEstudo || null,
  duplaId: Number(data.duplaId),
  serie: data.serie,
  licaoAtual: Number(data.licaoAtual),
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
  // Lista estudos bíblicos filtrados por escopo de perfil
  async listar(query, usuario) {
    const where = await montarFiltro(query, usuario);
    return EstudoBiblicoModel.findAll(where);
  },

  async buscarPorId(id, usuario) {
    const estudo = await EstudoBiblicoModel.findById(id);
    if (!estudo) throw { status: 404, mensagem: 'Estudo bíblico não encontrado.' };

    // DUPLA_MISSIONARIA só pode ver estudos da própria dupla
    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (estudo.duplaId !== usuario.duplaId) {
        throw { status: 403, mensagem: 'Acesso negado: estudo pertence a outra dupla.' };
      }
    }
    return estudo;
  },

  // Criação com validação de escopo para DUPLA_MISSIONARIA
  async criar(data, usuario) {
    // DUPLA_MISSIONARIA só pode criar estudos para a própria dupla
    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (Number(data.duplaId) !== usuario.duplaId) {
        throw { status: 403, mensagem: 'Você só pode cadastrar estudos para a sua própria dupla.' };
      }
    }

    const dadosEstudo = normalizarEstudo(data);
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

  // Atualização com validação de escopo para DUPLA_MISSIONARIA
  async atualizar(id, data, usuario) {
    await this.buscarPorId(id, usuario);
    const dadosEstudo = normalizarEstudo(data);
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
