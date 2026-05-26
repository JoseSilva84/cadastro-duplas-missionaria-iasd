// Service de Dupla — Regras de negócio com Resource-Based Authorization
const DuplaModel = require('../models/dupla.model');
const { PERFIS, ehAdmin } = require('../middlewares/auth');

const comoBoolean = (valor) => {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor === 'boolean') return valor;
  return String(valor).toLowerCase() === 'true';
};

const calcularClassificacao = (data) => {
  const levouPessoaBatismo = comoBoolean(data.levouPessoaBatismo);
  const jaDeuEstudoBiblico = comoBoolean(data.jaDeuEstudoBiblico);
  const estudoAtualEmAndamento = comoBoolean(data.estudoAtualEmAndamento);

  let classificacaoDupla = null;
  if (levouPessoaBatismo === true) {
    classificacaoDupla = 'A';
  } else if (jaDeuEstudoBiblico === true) {
    classificacaoDupla = 'B';
  } else if (levouPessoaBatismo !== null || jaDeuEstudoBiblico !== null) {
    classificacaoDupla = 'C';
  }

  return {
    levouPessoaBatismo,
    jaDeuEstudoBiblico,
    estudoAtualEmAndamento,
    classificacaoDupla,
    atividadeDupla: estudoAtualEmAndamento === null ? null : estudoAtualEmAndamento ? 'ATIVA' : 'INATIVA',
  };
};

const DuplaService = {
  // Lista duplas com filtros e restrições por perfil (Resource-Based Authorization)
  async listar(usuario, query) {
    const { distritoId, status, regiaoNome } = query;
    const { perfil, regiaoId: userRegiaoId, distritoId: userDistritoId, duplaId: userDuplaId } = usuario;

    // Montamos o filtro como lista de condições AND para evitar conflitos no Prisma
    const condicoes = [];

    // ─── Restrições por perfil ──────────────────────────────────────────────────
    if (perfil === PERFIS.DUPLA_MISSIONARIA) {
      // Dupla só vê a si mesma
      if (!userDuplaId) {
        throw { status: 403, mensagem: 'Dupla não vinculada a este usuário.' };
      }
      condicoes.push({ id: userDuplaId });
    } else if (perfil === PERFIS.PASTOR_DISTRITAL) {
      condicoes.push({ distritoId: userDistritoId });
    } else if (
      (perfil === PERFIS.PASTOR_REGIONAL || perfil === PERFIS.COORDENADOR_REGIONAL) &&
      userRegiaoId
    ) {
      condicoes.push({ distrito: { is: { regiaoId: userRegiaoId } } });
    }
    // SUPER_ADMIN e ADMINISTRADOR: sem restrição de escopo

    // ─── Filtros opcionais da query (só válidos se o perfil tem acesso ao escopo) ──
    // Evitamos que uma DUPLA_MISSIONARIA consiga ignorar a restrição passando ?distritoId=X
    if (perfil !== PERFIS.DUPLA_MISSIONARIA) {
      if (distritoId) condicoes.push({ distritoId: Number(distritoId) });
      if (regiaoNome) condicoes.push({ regiaoNome: { contains: regiaoNome, mode: 'insensitive' } });
    }
    if (status) condicoes.push({ status });

    const filtro = condicoes.length === 0
      ? {}
      : condicoes.length === 1
        ? condicoes[0]
        : { AND: condicoes };

    return DuplaModel.findAll(filtro);
  },

  // Busca dupla por ID (valida escopo para DUPLA_MISSIONARIA)
  async buscarPorId(id, usuario) {
    const dupla = await DuplaModel.findById(id);
    if (!dupla) {
      throw { status: 404, mensagem: 'Dupla não encontrada.' };
    }

    // DUPLA_MISSIONARIA só pode ver a própria dupla
    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (dupla.id !== usuario.duplaId) {
        throw { status: 403, mensagem: 'Acesso negado: você só pode visualizar sua própria dupla.' };
      }
    }

    // PASTOR_DISTRITAL só pode ver duplas do seu distrito
    if (usuario && usuario.perfil === PERFIS.PASTOR_DISTRITAL) {
      if (dupla.distritoId !== usuario.distritoId) {
        throw { status: 403, mensagem: 'Acesso negado: dupla pertence a outro distrito.' };
      }
    }

    // PASTOR_REGIONAL e COORDENADOR_REGIONAL: validação no service de distrito (via regiaoId)

    return dupla;
  },

  // Cria nova dupla
  async criar(data) {
    const classificacao = calcularClassificacao(data);

    return DuplaModel.create({
      regiaoNome: data.regiaoNome || '',
      distritoId: Number(data.distritoId),
      igrejaId: data.igrejaId ? Number(data.igrejaId) : null,
      bairro: data.bairro,
      fotoLider: data.fotoLider,
      fotoMembro2: data.fotoMembro2,
      tipoProjeto: data.tipoProjeto,
      liderNome: data.liderNome,
      liderTelefone: data.liderTelefone,
      liderEmail: data.liderEmail,
      liderIgreja: data.liderIgreja,
      liderDistrito: data.liderDistrito,
      membro2Tipo: 'MEMBRO_IASD',
      membro2Nome: data.membro2Nome,
      membro2Telefone: data.membro2Telefone,
      membro2Email: data.membro2Email,
      membro2Igreja: data.membro2Igreja,
      membro2Distrito: data.membro2Distrito,
      status: data.status || 'ATIVA',
      pessoasAlcancadas: Number(data.pessoasAlcancadas) || 0,
      observacoes: data.observacoes,
      dataInicio: data.dataInicio ? new Date(data.dataInicio) : new Date(),
      estudoBiblico: data.estudoBiblico,
      statusEstudoBiblico: data.statusEstudoBiblico,
      statusEvangelismo: data.statusEvangelismo,
      batismos: data.batismos ? Number(data.batismos) : 0,
      classificacaoDupla: classificacao.classificacaoDupla,
      atividadeDupla: classificacao.atividadeDupla,
      levouPessoaBatismo: classificacao.levouPessoaBatismo,
      jaDeuEstudoBiblico: classificacao.jaDeuEstudoBiblico,
      estudoAtualEmAndamento: classificacao.estudoAtualEmAndamento,
      liderDataNascimento: data.liderDataNascimento ? new Date(data.liderDataNascimento) : null,
      liderDataBatismo: data.liderDataBatismo ? new Date(data.liderDataBatismo) : null,
      liderSexo: data.liderSexo || null,
      liderEndereco: data.liderEndereco || null,
      membro2DataNascimento: data.membro2DataNascimento ? new Date(data.membro2DataNascimento) : null,
      membro2DataBatismo: data.membro2DataBatismo ? new Date(data.membro2DataBatismo) : null,
      membro2Sexo: data.membro2Sexo || null,
      membro2Endereco: data.membro2Endereco || null,
      ultimoAcompanhamento: data.ultimoAcompanhamento ? new Date(data.ultimoAcompanhamento) : null,
    });
  },

  // Atualiza dupla (com verificação de permissão por perfil)
  async atualizar(id, data, usuario) {
    const dupla = await this.buscarPorId(id, usuario);
    const classificacao = calcularClassificacao(data);

    // Pastores só editam duplas do próprio distrito
    if (usuario.perfil === PERFIS.PASTOR_DISTRITAL && dupla.distritoId !== usuario.distritoId) {
      throw { status: 403, mensagem: 'Sem permissão para editar esta dupla.' };
    }

    // Pastor Regional só edita duplas da sua região
    if (usuario.perfil === PERFIS.PASTOR_REGIONAL) {
      const prisma = require('../lib/prisma');
      const distrito = await prisma.distrito.findUnique({ where: { id: dupla.distritoId } });
      if (!distrito || distrito.regiaoId !== usuario.regiaoId) {
        throw { status: 403, mensagem: 'Sem permissão para editar esta dupla (outra região).' };
      }
    }

    const dadosAtualizados = {
      regiaoNome: data.regiaoNome,
      distritoId: data.distritoId ? Number(data.distritoId) : undefined,
      igrejaId: data.igrejaId !== undefined ? (data.igrejaId ? Number(data.igrejaId) : null) : undefined,
      bairro: data.bairro,
      fotoLider: data.fotoLider,
      fotoMembro2: data.fotoMembro2,
      tipoProjeto: data.tipoProjeto,
      liderNome: data.liderNome,
      liderTelefone: data.liderTelefone,
      liderEmail: data.liderEmail,
      liderIgreja: data.liderIgreja,
      liderDistrito: data.liderDistrito,
      membro2Tipo: data.membro2Tipo,
      membro2Nome: data.membro2Nome,
      membro2Telefone: data.membro2Telefone,
      membro2Email: data.membro2Email,
      membro2Igreja: data.membro2Igreja,
      membro2Distrito: data.membro2Distrito,
      status: data.status,
      pessoasAlcancadas: data.pessoasAlcancadas ? Number(data.pessoasAlcancadas) : 0,
      observacoes: data.observacoes,
      dataInicio: data.dataInicio ? new Date(data.dataInicio) : undefined,
      estudoBiblico: data.estudoBiblico,
      statusEstudoBiblico: data.statusEstudoBiblico,
      statusEvangelismo: data.statusEvangelismo,
      batismos: data.batismos !== undefined ? Number(data.batismos) : undefined,
      classificacaoDupla: classificacao.classificacaoDupla,
      atividadeDupla: classificacao.atividadeDupla,
      levouPessoaBatismo: classificacao.levouPessoaBatismo,
      jaDeuEstudoBiblico: classificacao.jaDeuEstudoBiblico,
      estudoAtualEmAndamento: classificacao.estudoAtualEmAndamento,
      liderDataNascimento: data.liderDataNascimento ? new Date(data.liderDataNascimento) : undefined,
      liderDataBatismo: data.liderDataBatismo ? new Date(data.liderDataBatismo) : undefined,
      liderSexo: data.liderSexo,
      liderEndereco: data.liderEndereco,
      membro2DataNascimento: data.membro2DataNascimento ? new Date(data.membro2DataNascimento) : undefined,
      membro2DataBatismo: data.membro2DataBatismo ? new Date(data.membro2DataBatismo) : undefined,
      membro2Sexo: data.membro2Sexo,
      membro2Endereco: data.membro2Endereco,
      ultimoAcompanhamento: data.ultimoAcompanhamento ? new Date(data.ultimoAcompanhamento) : undefined,
    };

    // Remove campos undefined
    Object.keys(dadosAtualizados).forEach(key => {
      if (dadosAtualizados[key] === undefined) {
        delete dadosAtualizados[key];
      }
    });

    return DuplaModel.update(id, dadosAtualizados);
  },

  // Remove dupla (apenas admins — garantido na rota)
  async remover(id) {
    await this.buscarPorId(id);
    return DuplaModel.remove(id);
  },
};

module.exports = DuplaService;
