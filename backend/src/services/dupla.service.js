// Service de Dupla — Regras de negócio
const DuplaModel = require('../models/dupla.model');

const DuplaService = {
  // Lista duplas com filtros e restrições por perfil
  async listar(usuario, query) {
    const { distritoId, status, regiaoNome } = query;
    const { perfil, regiaoId: userRegiaoId, distritoId: userDistritoId } = usuario;

    const filtro = {};

    // Restrições por perfil
    if (perfil === 'PASTOR_DISTRITAL') {
      filtro.distritoId = userDistritoId;
    } else if (perfil === 'COORDENADOR_REGIONAL') {
      filtro.distrito = { regiaoId: userRegiaoId };
    }

    // Filtros opcionais da query
    if (distritoId) filtro.distritoId = Number(distritoId);
    if (status) filtro.status = status;
    if (regiaoNome) filtro.regiaoNome = { contains: regiaoNome, mode: 'insensitive' };

    return DuplaModel.findAll(filtro);
  },

  // Busca dupla por ID
  async buscarPorId(id) {
    const dupla = await DuplaModel.findById(id);
    if (!dupla) {
      throw { status: 404, mensagem: 'Dupla não encontrada.' };
    }
    return dupla;
  },

  // Cria nova dupla
  async criar(data) {
    return DuplaModel.create({
      regiaoNome: data.regiaoNome || '',
      distritoId: Number(data.distritoId),
      igrejaId: data.igrejaId ? Number(data.igrejaId) : null,
      bairro: data.bairro,
      tipoProjeto: data.tipoProjeto,
      liderNome: data.liderNome,
      liderTelefone: data.liderTelefone,
      liderEmail: data.liderEmail,
      liderIgreja: data.liderIgreja,
      membro2Tipo: data.membro2Tipo,
      membro2Nome: data.membro2Nome,
      membro2Telefone: data.membro2Telefone,
      status: data.status || 'ATIVA',
      pessoasAlcancadas: Number(data.pessoasAlcancadas) || 0,
      observacoes: data.observacoes,
      dataInicio: data.dataInicio ? new Date(data.dataInicio) : new Date(),
    });
  },

  // Atualiza dupla (com verificação de permissão por perfil)
  async atualizar(id, data, usuario) {
    const dupla = await this.buscarPorId(id);

    // Pastores só editam duplas do próprio distrito
    if (usuario.perfil === 'PASTOR_DISTRITAL' && dupla.distritoId !== usuario.distritoId) {
      throw { status: 403, mensagem: 'Sem permissão para editar esta dupla.' };
    }

    return DuplaModel.update(id, { ...data });
  },

  // Remove dupla
  async remover(id) {
    await this.buscarPorId(id);
    return DuplaModel.remove(id);
  },
};

module.exports = DuplaService;
