// Service de Dupla — Regras de negócio com Resource-Based Authorization
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

async function resolverIgrejaPadrao(distritoId) {
  const igrejas = await prisma.igreja.findMany({
    where: { distritoId: Number(distritoId) },
    select: { id: true, nome: true },
    take: 2,
    orderBy: { id: 'asc' },
  });
  return igrejas.length === 1 ? igrejas[0] : null;
}

const DuplaService = {
  // Lista duplas com filtros e restrições por perfil (Resource-Based Authorization)
  async listar(usuario, query) {
    const { distritoId, igrejaId, status, regiaoNome } = query;
    const { perfil } = usuario;
    const escopo = await montarEscopo(usuario);
    const condicoes = [escopo.dupla];

    // ─── Filtros opcionais da query (só válidos se o perfil tem acesso ao escopo) ──
    // Evitamos que uma DUPLA_MISSIONARIA consiga ignorar a restrição passando ?distritoId=X
    if (perfil !== PERFIS.DUPLA_MISSIONARIA) {
      if (distritoId) condicoes.push({ distritoId: Number(distritoId) });
      if (igrejaId) condicoes.push({ igrejaId: Number(igrejaId) });
      if (regiaoNome) condicoes.push({ regiaoNome: { contains: regiaoNome, mode: 'insensitive' } });
    }
    if (status) condicoes.push({ status });

    return DuplaModel.findAll(combinar(...condicoes));
  },

  // Busca dupla por ID (valida escopo para DUPLA_MISSIONARIA)
  async buscarPorId(id, usuario) {
    const dupla = await DuplaModel.findById(id);
    if (!dupla) {
      throw { status: 404, mensagem: 'Dupla não encontrada.' };
    }

    if (usuario && usuario.perfil === PERFIS.DUPLA_MISSIONARIA) {
      if (!usuario.duplaId || Number(dupla.id) !== Number(usuario.duplaId)) {
        throw { status: 403, mensagem: 'Acesso negado: esta não é a sua dupla.' };
      }
    } else if (usuario && usuario.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA) {
      if (!dupla.igrejaId) throw { status: 403, mensagem: 'Acesso negado: dupla sem igreja vinculada.' };
      await validarIgreja(usuario, dupla.igrejaId);
    } else {
      await validarDistrito(usuario, dupla.distritoId);
    }

    return dupla;
  },

  // Cria nova dupla
  async criar(data, usuario) {
    const escopo = await montarEscopo(usuario);
    const igrejaIdPadrao = usuario?.perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA
      ? escopo.igrejaId
      : null;
    const distritoPadrao = data.distritoId ? null : await prisma.distrito.findFirst({
      where: escopo.distrito,
      select: { id: true, nome: true, regiao: { select: { nome: true } } },
      orderBy: { id: 'asc' },
    });
    const distritoId = data.distritoId ? Number(data.distritoId) : distritoPadrao?.id;
    const igrejaPadraoDoDistrito = data.igrejaId || igrejaIdPadrao ? null : await resolverIgrejaPadrao(distritoId);
    const igrejaId = data.igrejaId ? Number(data.igrejaId) : igrejaIdPadrao || igrejaPadraoDoDistrito?.id;
    if (!distritoId) throw { status: 400, mensagem: 'Nao ha distrito disponivel para vincular este cadastro.' };
    await validarDistrito(usuario, distritoId);
    if (igrejaId) await validarIgreja(usuario, igrejaId);
    const classificacao = calcularClassificacao(data);

    return DuplaModel.create({
      regiaoNome: data.regiaoNome || distritoPadrao?.regiao?.nome || '',
      distritoId,
      igrejaId: igrejaId || null,
      bairro: data.bairro || 'Nao informado',
      fotoLider: data.fotoLider,
      fotoMembro2: data.fotoMembro2,
      tipoProjeto: data.tipoProjeto || 'ESTUDO_BIBLICO',
      liderNome: data.liderNome,
      liderTelefone: data.liderTelefone,
      liderEmail: data.liderEmail,
      liderIgreja: data.liderIgreja || igrejaPadraoDoDistrito?.nome,
      liderDistrito: data.liderDistrito,
      membro2Tipo: 'MEMBRO_IASD',
      membro2Nome: data.membro2Nome || 'Nao informado',
      membro2Telefone: data.membro2Telefone,
      membro2Email: data.membro2Email,
      membro2Igreja: data.membro2Igreja || igrejaPadraoDoDistrito?.nome,
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

  // Remove dupla apos validar o escopo do perfil solicitante.
  async remover(id, usuario) {
    await this.buscarPorId(id, usuario);
    return DuplaModel.remove(id);
  },
};

module.exports = DuplaService;
