// Service de Dupla — Regras de negócio
const DuplaModel = require('../models/dupla.model');

const DuplaService = {
  // Lista duplas com filtros e restrições por perfil
  async listar(usuario, query) {
    const { distritoId, status, regiaoNome } = query;
    const { perfil, regiaoId: userRegiaoId, distritoId: userDistritoId } = usuario;

    // Montamos o filtro como lista de condições AND para evitar conflitos no Prisma
    const condicoes = [];

    // Restrição por perfil
    if (perfil === 'PASTOR_DISTRITAL') {
      // Campo direto: sem necessidade de relação
      condicoes.push({ distritoId: userDistritoId });
    } else if (perfil === 'COORDENADOR_REGIONAL' && userRegiaoId) {
      // Prisma exige "is" para filtrar campos dentro de uma relação
      condicoes.push({ distrito: { is: { regiaoId: userRegiaoId } } });
    }

    // Filtros opcionais da query
    if (distritoId) condicoes.push({ distritoId: Number(distritoId) });
    if (status) condicoes.push({ status });
    if (regiaoNome) condicoes.push({ regiaoNome: { contains: regiaoNome, mode: 'insensitive' } });

    // Se houver mais de uma condição, usa AND; senão passa o único objeto ou {}
    const filtro = condicoes.length === 0
      ? {}
      : condicoes.length === 1
        ? condicoes[0]
        : { AND: condicoes };

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
      estudoBiblico: data.estudoBiblico,
      statusEstudoBiblico: data.statusEstudoBiblico,
      statusEvangelismo: data.statusEvangelismo,
      batismos: data.batismos ? Number(data.batismos) : 0,
    });
  },

  // Atualiza dupla (com verificação de permissão por perfil)
  async atualizar(id, data, usuario) {
    const dupla = await this.buscarPorId(id);

    // Pastores só editam duplas do próprio distrito
    if (usuario.perfil === 'PASTOR_DISTRITAL' && dupla.distritoId !== usuario.distritoId) {
      throw { status: 403, mensagem: 'Sem permissão para editar esta dupla.' };
    }

    const dadosAtualizados = {
      regiaoNome: data.regiaoNome,
      distritoId: data.distritoId ? Number(data.distritoId) : undefined,
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
      status: data.status,
      pessoasAlcancadas: data.pessoasAlcancadas ? Number(data.pessoasAlcancadas) : 0,
      observacoes: data.observacoes,
      dataInicio: data.dataInicio ? new Date(data.dataInicio) : undefined,
      estudoBiblico: data.estudoBiblico,
      statusEstudoBiblico: data.statusEstudoBiblico,
      statusEvangelismo: data.statusEvangelismo,
      batismos: data.batismos !== undefined ? Number(data.batismos) : undefined,
    };

    // Remove undefined fields
    Object.keys(dadosAtualizados).forEach(key => {
      if (dadosAtualizados[key] === undefined) {
        delete dadosAtualizados[key];
      }
    });

    return DuplaModel.update(id, dadosAtualizados);
  },

  // Remove dupla
  async remover(id) {
    await this.buscarPorId(id);
    return DuplaModel.remove(id);
  },
};

module.exports = DuplaService;
