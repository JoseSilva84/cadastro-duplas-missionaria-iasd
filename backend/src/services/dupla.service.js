// Service de Dupla â€” Regras de negÃ³cio com Resource-Based Authorization
const DuplaModel = require('../models/dupla.model');
const prisma = require('../lib/prisma');
const { PERFIS, ehAdmin } = require('../middlewares/auth');
const { montarEscopo, combinar, validarDistrito, validarIgreja } = require('./escopo.service');

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
  // Lista duplas com filtros e restriÃ§Ãµes por perfil (Resource-Based Authorization)
  async listar(usuario, query) {
    const { distritoId, status, regiaoNome } = query;
    const { perfil } = usuario;
    const escopo = await montarEscopo(usuario);
    const condicoes = [escopo.dupla];

    // â”€â”€â”€ Filtros opcionais da query (sÃ³ vÃ¡lidos se o perfil tem acesso ao escopo) â”€â”€
    // Evitamos que uma DUPLA_MISSIONARIA consiga ignorar a restriÃ§Ã£o passando ?distritoId=X
    if (perfil !== PERFIS.DUPLA_MISSIONARIA) {
      if (distritoId) condicoes.push({ distritoId: Number(distritoId) });
      if (regiaoNome) condicoes.push({ regiaoNome: { contains: regiaoNome, mode: 'insensitive' } });
    }
    if (status) condicoes.push({ status });

    return DuplaModel.findAll(combinar(...condicoes));
  },

  // Busca dupla por ID (valida escopo para DUPLA_MISSIONARIA)
  async buscarPorId(id, usuario) {
    const dupla = await DuplaModel.findById(id);
    if (!dupla) {
      throw { status: 404, mensagem: 'Dupla nÃ£o encontrada.' };
    }

    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (usuario.duplaId) {
        const escopo = await montarEscopo(usuario);
        if (dupla.igrejaId !== escopo.igrejaId) {
          throw { status: 403, mensagem: 'Acesso negado: dupla pertence a outra igreja.' };
        }
      }
    } else {
      await validarDistrito(usuario, dupla.distritoId);
    }

    return dupla;
  },

  // Cria nova dupla
  async criar(data, usuario) {
    const escopo = await montarEscopo(usuario);
    const distritoPadrao = data.distritoId ? null : await prisma.distrito.findFirst({
      where: escopo.distrito,
      select: { id: true, nome: true, regiao: { select: { nome: true } } },
      orderBy: { id: 'asc' },
    });
    const distritoId = data.distritoId ? Number(data.distritoId) : distritoPadrao?.id;
    if (!distritoId) throw { status: 400, mensagem: 'Nao ha distrito disponivel para vincular este cadastro.' };
    await validarDistrito(usuario, distritoId);
    if (data.igrejaId) await validarIgreja(usuario, data.igrejaId);
    const classificacao = calcularClassificacao(data);

    return DuplaModel.create({
      regiaoNome: data.regiaoNome || distritoPadrao?.regiao?.nome || '',
      distritoId,
      igrejaId: data.igrejaId ? Number(data.igrejaId) : null,
      bairro: data.bairro || 'Nao informado',
      fotoLider: data.fotoLider,
      fotoMembro2: data.fotoMembro2,
      tipoProjeto: data.tipoProjeto || 'ESTUDO_BIBLICO',
      liderNome: data.liderNome,
      liderTelefone: data.liderTelefone,
      liderEmail: data.liderEmail,
      liderIgreja: data.liderIgreja,
      liderDistrito: data.liderDistrito,
      membro2Tipo: 'MEMBRO_IASD',
      membro2Nome: data.membro2Nome || 'Nao informado',
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

  // Atualiza dupla (com verificaÃ§Ã£o de permissÃ£o por perfil)
  async atualizar(id, data, usuario) {
    const dupla = await this.buscarPorId(id, usuario);
    const classificacao = calcularClassificacao(data);

    if (data.distritoId) await validarDistrito(usuario, data.distritoId);
    if (data.igrejaId) await validarIgreja(usuario, data.igrejaId);

    const dadosAtualizados = {
      regiaoNome: data.regiaoNome,
      distritoId: data.distritoId ? Number(data.distritoId) : undefined,
      igrejaId: data.igrejaId !== undefined ? (data.igrejaId ? Number(data.igrejaId) : null) : undefined,
      bairro: data.bairro || undefined,
      fotoLider: data.fotoLider,
      fotoMembro2: data.fotoMembro2,
      tipoProjeto: data.tipoProjeto || undefined,
      liderNome: data.liderNome,
      liderTelefone: data.liderTelefone,
      liderEmail: data.liderEmail,
      liderIgreja: data.liderIgreja,
      liderDistrito: data.liderDistrito,
      membro2Tipo: data.membro2Tipo,
      membro2Nome: data.membro2Nome || undefined,
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

  // Remove dupla (apenas admins â€” garantido na rota)
  async remover(id) {
    await this.buscarPorId(id);
    return DuplaModel.remove(id);
  },
};

module.exports = DuplaService;
