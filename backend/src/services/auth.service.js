const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const UsuarioModel = require('../models/usuario.model');
const UsuarioService = require('./usuario.service');
const { montarIdentidadeUsuario } = require('./usuarioIdentidade.service');
const { ehSomenteLeitura } = require('../middlewares/auth');

const normalizarEmail = (email) => String(email || '').trim().toLowerCase();
const normalizarSenha = (senha) => String(senha ?? '').trim();
const segredoRedefinicao = () => `${process.env.JWT_SECRET}:redefinir-acesso`;
const segredoAtivacaoQr = () => `${process.env.JWT_SECRET}:ativacao-qrcode`;
const versaoDasCredenciais = (usuario) => crypto
  .createHash('sha256')
  .update(`${normalizarEmail(usuario.email)}\0${usuario.senha}`)
  .digest('hex');

const TIPOS_QR_ATIVACAO = {
  DUPLA_MISSIONARIA: {
    label: 'Dupla Missionária',
    descricao: 'Ativa o acesso da dupla existente ou conduz ao cadastro completo de nova dupla.',
    perfil: 'DUPLA_MISSIONARIA',
    escopo: 'dupla',
  },
  DIRETOR_MISSIONARIO_IGREJA: {
    label: 'Diretor Missionário da Igreja',
    descricao: 'Seleciona região, distrito e igreja para ativar o acesso da igreja.',
    perfil: 'DIRETOR_MISSIONARIO_IGREJA',
    escopo: 'igreja',
  },
  PASTOR_DISTRITAL: {
    label: 'Pastor Distrital',
    descricao: 'Seleciona o distrito para ativar o acesso distrital.',
    perfil: 'PASTOR_DISTRITAL',
    escopo: 'distrito',
  },
  COORDENADOR_REGIONAL: {
    label: 'Coordenador Regional',
    descricao: 'Seleciona a região para ativar o acesso do coordenador regional.',
    perfil: 'COORDENADOR_REGIONAL',
    escopo: 'regiao',
  },
  DEPARTAMENTAL_REGIONAL: {
    label: 'Departamental Regional',
    descricao: 'Seleciona a região para ativar o acesso do departamental regional.',
    perfil: 'PASTOR_REGIONAL',
    escopo: 'regiao',
  },
  PRESIDENTE: {
    label: 'Presidente',
    descricao: 'Ativa o acesso geral do presidente.',
    perfil: 'ADMINISTRADOR',
    escopo: 'geral',
    nomePadrao: 'Presidente',
  },
  DEPARTAMENTAL_MIPS: {
    label: 'Departamental MIPs',
    descricao: 'Ativa o acesso geral do departamental MIPs.',
    perfil: 'ADMINISTRADOR',
    escopo: 'geral',
    nomePadrao: 'Departamental MIPs',
  },
};

const TIPOS_QR_PERMITIDOS = Object.keys(TIPOS_QR_ATIVACAO);

const normalizarTexto = (txt) => String(txt || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim()
  .replace(/\s+/g, ' ');

const criarTokenAtivacaoQr = (tipo) => jwt.sign(
  { finalidade: 'ativacao-qrcode', tipo },
  segredoAtivacaoQr()
);

const validarTokenAtivacaoQr = (token) => {
  if (!token) {
    throw { status: 400, mensagem: 'QR Code de ativação obrigatório.' };
  }
  let payload;
  try {
    payload = jwt.verify(token, segredoAtivacaoQr());
  } catch (err) {
    throw { status: 400, mensagem: 'QR Code de ativação inválido.' };
  }
  if (payload.finalidade !== 'ativacao-qrcode' || !TIPOS_QR_ATIVACAO[payload.tipo]) {
    throw { status: 400, mensagem: 'QR Code de ativação inválido para este sistema.' };
  }
  return payload;
};

const selecionarOpcoesAtivacao = async () => {
  const regioes = await prisma.regiao.findMany({
    select: {
      id: true,
      nome: true,
      distritos: {
        select: {
          id: true,
          nome: true,
          chaveAcesso: true,
          chaveAtiva: true,
          igrejas: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
        },
        orderBy: { nome: 'asc' },
      },
    },
    orderBy: { nome: 'asc' },
  });

  return {
    regioes,
    distritos: regioes.flatMap((regiao) => regiao.distritos.map((distrito) => ({
      ...distrito,
      regiaoId: regiao.id,
      regiao: { id: regiao.id, nome: regiao.nome },
    }))),
    igrejas: regioes.flatMap((regiao) => regiao.distritos.flatMap((distrito) => (
      distrito.igrejas.map((igreja) => ({
        ...igreja,
        distritoId: distrito.id,
        distrito: { id: distrito.id, nome: distrito.nome, regiao: { id: regiao.id, nome: regiao.nome } },
      }))
    ))),
  };
};

const validarCredenciaisAtivacao = async ({ email, senha }, usuarioIdAtual = null) => {
  const emailNormalizado = normalizarEmail(email);
  const senhaNormalizada = normalizarSenha(senha);
  if (!emailNormalizado || !emailNormalizado.includes('@')) {
    throw { status: 400, mensagem: 'Informe um e-mail válido para ativar o acesso.' };
  }
  if (senhaNormalizada.length < 8) {
    throw { status: 400, mensagem: 'A senha deve ter pelo menos 8 caracteres.' };
  }
  const donoDoEmail = await UsuarioModel.findByEmail(emailNormalizado);
  if (donoDoEmail && Number(donoDoEmail.id) !== Number(usuarioIdAtual)) {
    throw { status: 400, mensagem: 'Este e-mail já está sendo usado por outro usuário no sistema.' };
  }
  return {
    email: emailNormalizado,
    senhaHash: await bcrypt.hash(senhaNormalizada, 10),
  };
};

const criarSessao = (usuario) => {
  const igrejaId = usuario.igrejaId || usuario.dupla?.igrejaId || null;
  const somenteLeitura = ehSomenteLeitura(usuario);

  const token = jwt.sign(
    {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      regiaoId: usuario.regiaoId,
      distritoId: usuario.distritoId,
      duplaId: usuario.duplaId,
      igrejaId,
      somenteLeitura,
      versaoCredenciais: versaoDasCredenciais(usuario),
    },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      regiaoId: usuario.regiaoId,
      distritoId: usuario.distritoId,
      duplaId: usuario.duplaId,
      igrejaId,
      somenteLeitura,
      regiao: usuario.regiao,
      distrito: usuario.distrito,
      dupla: usuario.dupla,
      igreja: usuario.igreja,
      identidade: montarIdentidadeUsuario(usuario),
    },
  };
};

const AuthService = {
  async listarQrCodesAtivacao(usuarioSolicitante, origem) {
    const { PERFIS } = require('../middlewares/auth');
    if (![PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR].includes(usuarioSolicitante?.perfil)) {
      throw { status: 403, mensagem: 'Apenas administradores podem gerenciar QR Codes gerais.' };
    }

    const baseUrl = String(origem || process.env.APP_URL || '').replace(/\/$/, '');
    return TIPOS_QR_PERMITIDOS.map((tipo) => {
      const config = TIPOS_QR_ATIVACAO[tipo];
      const token = criarTokenAtivacaoQr(tipo);
      const path = `/ativar-acesso?token=${encodeURIComponent(token)}`;
      return {
        tipo,
        label: config.label,
        descricao: config.descricao,
        escopo: config.escopo,
        perfil: config.perfil,
        token,
        path,
        url: baseUrl ? `${baseUrl}${path}` : path,
      };
    });
  },

  async obterInfoAtivacaoQr(token) {
    const payload = validarTokenAtivacaoQr(token);
    const config = TIPOS_QR_ATIVACAO[payload.tipo];
    const opcoes = await selecionarOpcoesAtivacao();
    return {
      valido: true,
      tipo: payload.tipo,
      label: config.label,
      descricao: config.descricao,
      escopo: config.escopo,
      opcoes,
    };
  },

  async buscarDuplaParaAtivacao({ token, distritoId, igrejaId, liderNome, membro2Nome }) {
    const payload = validarTokenAtivacaoQr(token);
    if (payload.tipo !== 'DUPLA_MISSIONARIA') {
      throw { status: 400, mensagem: 'Este QR Code não é de dupla missionária.' };
    }

    const distritoIdNum = Number(distritoId);
    const igrejaIdNum = Number(igrejaId);
    const nLider = normalizarTexto(liderNome);
    const nMembro2 = normalizarTexto(membro2Nome);
    if (!distritoIdNum || !igrejaIdNum || !nLider || !nMembro2) {
      throw { status: 400, mensagem: 'Informe distrito, igreja e os nomes dos dois membros da dupla.' };
    }

    const duplas = await prisma.dupla.findMany({
      where: { distritoId: distritoIdNum, igrejaId: igrejaIdNum },
      include: {
        distrito: { select: { id: true, nome: true, chaveAcesso: true, chaveAtiva: true, regiao: { select: { id: true, nome: true } } } },
        igreja: { select: { id: true, nome: true } },
        usuarios: { select: { id: true, email: true, ativo: true } },
      },
    });

    const dupla = duplas.find((item) => {
      const dLider = normalizarTexto(item.liderNome);
      const dMembro2 = normalizarTexto(item.membro2Nome);
      return (dLider === nLider && dMembro2 === nMembro2) || (dLider === nMembro2 && dMembro2 === nLider);
    });

    if (!dupla) {
      const distrito = await prisma.distrito.findUnique({
        where: { id: distritoIdNum },
        select: { id: true, nome: true, chaveAcesso: true, chaveAtiva: true, regiao: { select: { id: true, nome: true } } },
      });
      const igreja = await prisma.igreja.findUnique({ where: { id: igrejaIdNum }, select: { id: true, nome: true } });
      return {
        encontrada: false,
        distrito,
        igreja,
        mensagem: 'Não encontramos uma dupla existente com estes nomes. Continue para cadastrar uma nova dupla.',
      };
    }

    return {
      encontrada: true,
      dupla: {
        id: dupla.id,
        liderNome: dupla.liderNome,
        membro2Nome: dupla.membro2Nome,
        igreja: dupla.igreja,
        distrito: dupla.distrito,
        usuarioExistente: dupla.usuarios?.find((usuario) => usuario.ativo) || dupla.usuarios?.[0] || null,
      },
    };
  },

  async ativarAcessoQr(dados) {
    const payload = validarTokenAtivacaoQr(dados.token);
    const config = TIPOS_QR_ATIVACAO[payload.tipo];

    if (payload.tipo === 'DUPLA_MISSIONARIA') {
      const duplaId = Number(dados.duplaId);
      if (!duplaId) throw { status: 400, mensagem: 'Selecione a dupla encontrada para ativar o acesso.' };
      const dupla = await prisma.dupla.findUnique({
        where: { id: duplaId },
        include: { distrito: { select: { id: true, nome: true, regiaoId: true } }, igreja: { select: { id: true, nome: true } } },
      });
      if (!dupla) throw { status: 404, mensagem: 'Dupla missionária não encontrada.' };

      const usuarioExistente = await prisma.usuario.findFirst({ where: { duplaId } });
      const credenciais = await validarCredenciaisAtivacao(dados, usuarioExistente?.id);
      const nomeDupla = `${dupla.liderNome || ''} e ${dupla.membro2Nome || ''}`.trim() || 'Dupla Missionária';
      if (usuarioExistente) {
        await UsuarioModel.update(usuarioExistente.id, {
          nome: nomeDupla,
          email: credenciais.email,
          senha: credenciais.senhaHash,
          ativo: true,
          perfil: 'DUPLA_MISSIONARIA',
          duplaId,
          distritoId: dupla.distritoId,
          igrejaId: dupla.igrejaId || null,
          regiaoId: dupla.distrito?.regiaoId || null,
        });
      } else {
        await UsuarioModel.create({
          nome: nomeDupla,
          email: credenciais.email,
          senha: credenciais.senhaHash,
          perfil: 'DUPLA_MISSIONARIA',
          duplaId,
          distritoId: dupla.distritoId,
          igrejaId: dupla.igrejaId || null,
          regiaoId: dupla.distrito?.regiaoId || null,
          ativo: true,
        });
      }
      return { mensagem: 'Acesso da dupla ativado com sucesso.', email: credenciais.email };
    }

    let escopoWhere = {};
    let dadosEscopo = {};
    let nomePadrao = config.nomePadrao || config.label;

    if (config.escopo === 'regiao') {
      const regiaoId = Number(dados.regiaoId);
      if (!regiaoId) throw { status: 400, mensagem: 'Selecione a região.' };
      const regiao = await prisma.regiao.findUnique({ where: { id: regiaoId }, select: { id: true, nome: true } });
      if (!regiao) throw { status: 404, mensagem: 'Região não encontrada.' };
      escopoWhere = { regiaoId };
      dadosEscopo = { regiaoId, distritoId: null, igrejaId: null, duplaId: null };
      nomePadrao = `${config.label} - ${regiao.nome}`;
    } else if (config.escopo === 'distrito') {
      const distritoId = Number(dados.distritoId);
      if (!distritoId) throw { status: 400, mensagem: 'Selecione o distrito.' };
      const distrito = await prisma.distrito.findUnique({
        where: { id: distritoId },
        select: { id: true, nome: true, regiaoId: true, nomePastor: true },
      });
      if (!distrito) throw { status: 404, mensagem: 'Distrito não encontrado.' };
      escopoWhere = { distritoId };
      dadosEscopo = { regiaoId: distrito.regiaoId, distritoId, igrejaId: null, duplaId: null };
      nomePadrao = distrito.nomePastor || `${config.label} - ${distrito.nome}`;
    } else if (config.escopo === 'igreja') {
      const igrejaId = Number(dados.igrejaId);
      if (!igrejaId) throw { status: 400, mensagem: 'Selecione a igreja.' };
      const igreja = await prisma.igreja.findUnique({
        where: { id: igrejaId },
        select: {
          id: true,
          nome: true,
          nomeDiretorMinisterioPessoal: true,
          distrito: { select: { id: true, regiaoId: true } },
        },
      });
      if (!igreja) throw { status: 404, mensagem: 'Igreja não encontrada.' };
      escopoWhere = { igrejaId };
      dadosEscopo = { regiaoId: igreja.distrito?.regiaoId || null, distritoId: igreja.distrito?.id || null, igrejaId, duplaId: null };
      nomePadrao = igreja.nomeDiretorMinisterioPessoal || `${config.label} - ${igreja.nome}`;
    } else {
      escopoWhere = { regiaoId: null, distritoId: null, igrejaId: null, duplaId: null };
      dadosEscopo = { regiaoId: null, distritoId: null, igrejaId: null, duplaId: null };
    }

    const usuarioExistente = await prisma.usuario.findFirst({
      where: {
        perfil: config.perfil,
        ...escopoWhere,
        ...(payload.tipo === 'PRESIDENTE' ? { nome: { contains: 'Presidente', mode: 'insensitive' } } : {}),
        ...(payload.tipo === 'DEPARTAMENTAL_MIPS' ? { nome: { contains: 'MIP', mode: 'insensitive' } } : {}),
      },
      orderBy: { id: 'asc' },
    });
    const credenciais = await validarCredenciaisAtivacao(dados, usuarioExistente?.id);
    const nome = String(dados.nome || '').trim() || usuarioExistente?.nome || nomePadrao;

    if (usuarioExistente) {
      await UsuarioModel.update(usuarioExistente.id, {
        nome,
        email: credenciais.email,
        senha: credenciais.senhaHash,
        perfil: config.perfil,
        ativo: true,
        ...dadosEscopo,
      });
    } else {
      await UsuarioModel.create({
        nome,
        email: credenciais.email,
        senha: credenciais.senhaHash,
        perfil: config.perfil,
        ativo: true,
        ...dadosEscopo,
      });
    }

    return { mensagem: 'Acesso ativado com sucesso.', email: credenciais.email, perfil: config.perfil };
  },

  async login(email, senha) {
    const usuario = await UsuarioModel.findByEmail(normalizarEmail(email));

    if (!usuario || !usuario.ativo) {
      throw { status: 401, mensagem: 'Credenciais inválidas ou usuário inativo.' };
    }

    // Ignora espaços acidentais ao copiar/colar a senha.
    // Espaços internos continuam fazendo parte da senha.
    const senhaNormalizada = normalizarSenha(senha);
    const senhaValida = await bcrypt.compare(senhaNormalizada, usuario.senha);
    if (!senhaValida) {
      throw { status: 401, mensagem: 'Credenciais inválidas ou usuário inativo.' };
    }

    return criarSessao(usuario);
  },

  async atualizarConta(usuarioId, { email, senhaAtual, novaSenha }) {
    const usuario = await UsuarioModel.findByIdComSenha(usuarioId);
    if (!usuario || !usuario.ativo) {
      throw { status: 404, mensagem: 'Usuário não encontrado ou inativo.' };
    }

    const senhaConfere = await bcrypt.compare(normalizarSenha(senhaAtual), usuario.senha);
    if (!senhaConfere) {
      throw { status: 401, mensagem: 'A senha atual está incorreta.' };
    }

    const emailNormalizado = normalizarEmail(email);
    if (ehSomenteLeitura(usuario) && emailNormalizado !== normalizarEmail(usuario.email)) {
      throw { status: 403, mensagem: 'Este acesso de suporte pode alterar somente a senha.' };
    }
    const donoDoEmail = await UsuarioModel.findByEmail(emailNormalizado);
    if (donoDoEmail && donoDoEmail.id !== usuario.id) {
      throw { status: 400, mensagem: 'Este e-mail já está sendo usado por outro usuário.' };
    }

    const alteracoes = { email: emailNormalizado };
    const novaSenhaNormalizada = normalizarSenha(novaSenha);
    if (novaSenhaNormalizada) {
      if (novaSenhaNormalizada.length < 8) {
        throw { status: 400, mensagem: 'A nova senha deve ter pelo menos 8 caracteres.' };
      }
      alteracoes.senha = await bcrypt.hash(novaSenhaNormalizada, 10);
    }

    try {
      await UsuarioModel.update(usuario.id, alteracoes);
    } catch (err) {
      if (err.code === 'P2002') {
        throw { status: 400, mensagem: 'Este e-mail já está sendo usado por outro usuário.' };
      }
      throw err;
    }

    const atualizado = await UsuarioModel.findByEmail(emailNormalizado);
    return criarSessao(atualizado);
  },

  async criarTokenRedefinicao(usuarioId, usuarioSolicitante) {
    const usuario = await UsuarioModel.findByIdComSenha(usuarioId);
    if (!usuario || !usuario.ativo) {
      throw { status: 404, mensagem: 'Usuário não encontrado ou inativo.' };
    }
    await UsuarioService.validarPermissaoGerenciarUsuario(usuario, usuarioSolicitante);

    const token = jwt.sign(
      {
        finalidade: 'redefinir-acesso',
        nonce: crypto.randomUUID(),
      },
      segredoRedefinicao(),
      { subject: String(usuario.id), expiresIn: '9m' }
    );
    const tokenDecodificado = jwt.decode(token);

    return {
      token,
      expiraEm: new Date(tokenDecodificado.exp * 1000).toISOString(),
      usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email },
    };
  },

  async redefinirAcessoComToken({ token, email, novaSenha }) {
    let payload;
    try {
      payload = jwt.verify(token, segredoRedefinicao());
    } catch (err) {
      const expirada = err?.name === 'TokenExpiredError';
      throw { status: 400, mensagem: expirada ? 'Este QR Code expirou. Solicite um novo.' : 'QR Code inválido.' };
    }

    if (payload.finalidade !== 'redefinir-acesso') {
      throw { status: 400, mensagem: 'QR Code inválido.' };
    }

    const usuario = await UsuarioModel.findByIdComSenha(payload.sub);
    if (!usuario || !usuario.ativo) {
      throw { status: 400, mensagem: 'Este QR Code não é mais válido.' };
    }

    const emailNormalizado = normalizarEmail(email);
    const senhaNormalizada = normalizarSenha(novaSenha);
    if (senhaNormalizada.length < 8) {
      throw { status: 400, mensagem: 'A nova senha deve ter pelo menos 8 caracteres.' };
    }
    if (ehSomenteLeitura(usuario) && emailNormalizado !== normalizarEmail(usuario.email)) {
      throw { status: 403, mensagem: 'Este acesso de suporte pode alterar somente a senha.' };
    }
    const donoDoEmail = await UsuarioModel.findByEmail(emailNormalizado);
    if (donoDoEmail && donoDoEmail.id !== usuario.id) {
      throw { status: 400, mensagem: 'Este e-mail já está sendo usado por outro usuário.' };
    }

    try {
      await UsuarioModel.update(usuario.id, {
        email: emailNormalizado,
        senha: await bcrypt.hash(senhaNormalizada, 10),
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw { status: 400, mensagem: 'Este e-mail já está sendo usado por outro usuário.' };
      }
      throw err;
    }

    return { mensagem: 'Login e senha redefinidos com sucesso.' };
  },

  async criarTokenCadastroDupla(duplaId, usuarioSolicitante) {
    const { PERFIS } = require('../middlewares/auth');
    const perfisPermitidos = [
      PERFIS.SUPER_ADMIN,
      PERFIS.ADMINISTRADOR,
      PERFIS.PASTOR_REGIONAL,
      PERFIS.COORDENADOR_REGIONAL,
    ];
    if (!usuarioSolicitante || !perfisPermitidos.includes(usuarioSolicitante.perfil)) {
      throw {
        status: 403,
        mensagem: 'Apenas Administrador, Pastor Regional e Coordenador Regional podem gerar acesso para duplas.',
      };
    }

    const DuplaService = require('./dupla.service');
    const dupla = await DuplaService.buscarPorId(duplaId, usuarioSolicitante);
    if (!dupla) {
      throw { status: 404, mensagem: 'Dupla missionária não encontrada.' };
    }

    const usuarioExistente = await prisma.usuario.findFirst({
      where: { duplaId: Number(dupla.id) },
      select: { id: true, nome: true, email: true, ativo: true },
    });

    const token = jwt.sign(
      {
        finalidade: 'cadastro-dupla',
        duplaId: dupla.id,
        nonce: crypto.randomUUID(),
      },
      segredoRedefinicao(),
      { subject: String(dupla.id), expiresIn: '48h' }
    );
    const tokenDecodificado = jwt.decode(token);

    return {
      token,
      expiraEm: new Date(tokenDecodificado.exp * 1000).toISOString(),
      dupla: {
        id: dupla.id,
        nome: `${dupla.liderNome || ''} + ${dupla.membro2Nome || ''}`.trim(),
        liderNome: dupla.liderNome,
        membro2Nome: dupla.membro2Nome,
        igrejaNome: dupla.igreja?.nome || dupla.liderIgreja || '',
        distritoNome: dupla.distrito?.nome || dupla.liderDistrito || '',
      },
      usuarioExistente: usuarioExistente ? {
        id: usuarioExistente.id,
        email: usuarioExistente.email,
        nome: usuarioExistente.nome,
        ativo: usuarioExistente.ativo,
      } : null,
    };
  },

  async validarTokenCadastroDupla(token) {
    if (!token) {
      throw { status: 400, mensagem: 'Token de convite obrigatório.' };
    }
    let payload;
    try {
      payload = jwt.verify(token, segredoRedefinicao());
    } catch (err) {
      const expirada = err?.name === 'TokenExpiredError';
      throw {
        status: 400,
        mensagem: expirada ? 'Este link ou QR Code expirou (validade de 48 horas). Solicite um novo ao administrador ou coordenador.' : 'Link ou QR Code inválido.',
      };
    }

    if (payload.finalidade !== 'cadastro-dupla' || !payload.duplaId) {
      throw { status: 400, mensagem: 'QR Code ou link inválido para cadastro de dupla.' };
    }

    const dupla = await prisma.dupla.findUnique({
      where: { id: Number(payload.duplaId) },
      include: {
        distrito: { select: { id: true, nome: true, regiaoId: true } },
        igreja: { select: { id: true, nome: true } },
      },
    });

    if (!dupla) {
      throw { status: 404, mensagem: 'Dupla missionária vinculada a este link não foi encontrada.' };
    }

    const usuarioExistente = await prisma.usuario.findFirst({
      where: { duplaId: Number(dupla.id) },
      select: { id: true, nome: true, email: true, ativo: true },
    });

    return {
      valido: true,
      dupla: {
        id: dupla.id,
        nome: `${dupla.liderNome || ''} + ${dupla.membro2Nome || ''}`.trim(),
        liderNome: dupla.liderNome,
        membro2Nome: dupla.membro2Nome,
        igrejaNome: dupla.igreja?.nome || dupla.liderIgreja || '',
        distritoNome: dupla.distrito?.nome || dupla.liderDistrito || '',
      },
      jaTemConta: Boolean(usuarioExistente && usuarioExistente.ativo),
      emailAtual: usuarioExistente ? usuarioExistente.email : null,
    };
  },

  async criarContaDuplaComToken({ token, email, senha }) {
    if (!token) {
      throw { status: 400, mensagem: 'Token de convite obrigatório.' };
    }
    let payload;
    try {
      payload = jwt.verify(token, segredoRedefinicao());
    } catch (err) {
      const expirada = err?.name === 'TokenExpiredError';
      throw {
        status: 400,
        mensagem: expirada ? 'Este link ou QR Code expirou. Solicite um novo ao administrador ou coordenador.' : 'Link ou QR Code inválido.',
      };
    }

    if (payload.finalidade !== 'cadastro-dupla' || !payload.duplaId) {
      throw { status: 400, mensagem: 'QR Code ou link inválido para cadastro de dupla.' };
    }

    const dupla = await prisma.dupla.findUnique({
      where: { id: Number(payload.duplaId) },
      include: {
        distrito: { select: { id: true, nome: true, regiaoId: true } },
        igreja: { select: { id: true, nome: true } },
      },
    });

    if (!dupla) {
      throw { status: 404, mensagem: 'Dupla missionária não encontrada.' };
    }

    const emailNormalizado = normalizarEmail(email);
    const senhaNormalizada = normalizarSenha(senha);
    if (!emailNormalizado || !emailNormalizado.includes('@')) {
      throw { status: 400, mensagem: 'Informe um e-mail válido para a dupla.' };
    }
    if (senhaNormalizada.length < 8) {
      throw { status: 400, mensagem: 'A senha deve ter pelo menos 8 caracteres.' };
    }

    const nomeDupla = `${dupla.liderNome || ''} + ${dupla.membro2Nome || ''}`.trim() || 'Dupla Missionária';

    // Verifica se o email já pertence a outro usuário que NÃO seja desta dupla
    const donoDoEmail = await UsuarioModel.findByEmail(emailNormalizado);
    if (donoDoEmail && Number(donoDoEmail.duplaId) !== Number(dupla.id)) {
      throw { status: 400, mensagem: 'Este e-mail já está sendo usado por outro usuário no sistema.' };
    }

    const senhaHash = await bcrypt.hash(senhaNormalizada, 10);

    // Verifica se já existe um usuário para esta dupla
    const usuarioExistente = await prisma.usuario.findFirst({
      where: { duplaId: Number(dupla.id) },
    });

    if (usuarioExistente) {
      await UsuarioModel.update(usuarioExistente.id, {
        nome: nomeDupla,
        email: emailNormalizado,
        senha: senhaHash,
        ativo: true,
        distritoId: dupla.distritoId,
        igrejaId: dupla.igrejaId || null,
        regiaoId: dupla.distrito?.regiaoId || null,
      });
    } else {
      await UsuarioModel.create({
        nome: nomeDupla,
        email: emailNormalizado,
        senha: senhaHash,
        perfil: 'DUPLA_MISSIONARIA',
        duplaId: dupla.id,
        distritoId: dupla.distritoId,
        igrejaId: dupla.igrejaId || null,
        regiaoId: dupla.distrito?.regiaoId || null,
        ativo: true,
      });
    }

    return {
      mensagem: 'Conta da dupla configurada com sucesso!',
      email: emailNormalizado,
      duplaNome: nomeDupla,
    };
  },

  // Valida a chave de acesso do distrito ou da região para auto-cadastro
  async validarChaveCadastro(chaveBruta) {
    const chave = String(chaveBruta || '').trim().toUpperCase();
    if (!chave) {
      throw { status: 400, mensagem: 'Informe a chave de acesso.' };
    }

    // 1. Tenta encontrar por Distrito
    const distrito = await prisma.distrito.findFirst({
      where: {
        chaveAcesso: { equals: chave, mode: 'insensitive' },
      },
      include: {
        regiao: { select: { id: true, nome: true } },
        igrejas: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
      },
    });

    if (distrito) {
      if (!distrito.chaveAtiva) {
        throw { status: 400, mensagem: 'Esta chave de acesso distrital está desativada. Solicite uma nova ao seu pastor distrital.' };
      }
      return {
        tipo: 'DISTRITO',
        distrito: { id: distrito.id, nome: distrito.nome },
        regiao: { id: distrito.regiao.id, nome: distrito.regiao.nome },
        igrejas: distrito.igrejas,
      };
    }

    // 2. Tenta encontrar por Região
    const regiao = await prisma.regiao.findFirst({
      where: {
        chaveAcesso: { equals: chave, mode: 'insensitive' },
      },
      include: {
        distritos: {
          select: {
            id: true,
            nome: true,
            igrejas: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } },
          },
          orderBy: { nome: 'asc' },
        },
      },
    });

    if (regiao) {
      if (!regiao.chaveAtiva) {
        throw { status: 400, mensagem: 'Esta chave de acesso regional está desativada. Solicite uma nova ao seu coordenador regional.' };
      }
      return {
        tipo: 'REGIAO',
        regiao: { id: regiao.id, nome: regiao.nome },
        distritos: regiao.distritos.map((d) => ({
          id: d.id,
          nome: d.nome,
          igrejas: d.igrejas,
        })),
      };
    }

    throw { status: 404, mensagem: 'Chave de acesso inválida ou não encontrada. Verifique com seu pastor ou coordenador.' };
  },

  // Auto-cadastro de Dupla Missionária através de chave de acesso
  async cadastrarDuplaComChave(dados) {
    const { chave, email, senha, liderNome, membro2Nome } = dados;

    if (!chave) {
      throw { status: 400, mensagem: 'Chave de acesso é obrigatória.' };
    }

    // 1. Valida a chave
    const infoChave = await this.validarChaveCadastro(chave);

    // 2. Validação de Escopo
    let regiaoId = Number(dados.regiaoId);
    let distritoId = Number(dados.distritoId);
    let igrejaId = Number(dados.igrejaId);

    if (infoChave.tipo === 'DISTRITO') {
      distritoId = infoChave.distrito.id;
      regiaoId = infoChave.regiao.id;
    } else if (infoChave.tipo === 'REGIAO') {
      regiaoId = infoChave.regiao.id;
      const distValido = infoChave.distritos.find((d) => d.id === distritoId);
      if (!distValido) {
        throw { status: 400, mensagem: 'O distrito selecionado não pertence a esta região.' };
      }
    }

    // Valida igreja
    const igreja = await prisma.igreja.findFirst({
      where: { id: igrejaId, distritoId },
    });
    if (!igreja) {
      throw { status: 400, mensagem: 'Selecione uma igreja válida deste distrito.' };
    }

    // 3. Validação dos Nomes dos Membros
    if (!liderNome || !liderNome.trim()) {
      throw { status: 400, mensagem: 'Nome do Membro 1 (Líder) é obrigatório.' };
    }
    if (!membro2Nome || !membro2Nome.trim()) {
      throw { status: 400, mensagem: 'Nome do Membro 2 (Parceiro) é obrigatório.' };
    }
    if (!dados.fotoLider) {
      throw { status: 400, mensagem: 'A foto do Membro 1 (Líder) é obrigatória.' };
    }
    if (!dados.fotoMembro2) {
      throw { status: 400, mensagem: 'A foto do Membro 2 (Parceiro) é obrigatória.' };
    }

    // 4. Anti-Duplicidade de Nomes
    const normalizar = (txt) => String(txt || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

    const nLider = normalizar(liderNome);
    const nMembro2 = normalizar(membro2Nome);

    if (nLider === nMembro2) {
      throw { status: 400, mensagem: 'O Membro 1 e o Membro 2 não podem ter o mesmo nome.' };
    }

    const duplasExistentes = await prisma.dupla.findMany({
      select: { id: true, liderNome: true, membro2Nome: true },
    });

    const duplicada = duplasExistentes.find((d) => {
      const dL = normalizar(d.liderNome);
      const dM = normalizar(d.membro2Nome);
      return (dL === nLider && dM === nMembro2) || (dL === nMembro2 && dM === nLider);
    });

    if (duplicada) {
      throw {
        status: 400,
        mensagem: `Já existe uma dupla missionária cadastrada com estes membros (${duplicada.liderNome} e ${duplicada.membro2Nome}). Se vocês já são esta dupla e precisam de login, solicitem o link ou QR code de acesso ao seu pastor distrital.`,
      };
    }

    // 5. Validação de Credenciais (E-mail e Senha)
    const emailNorm = normalizarEmail(email);
    const senhaNorm = normalizarSenha(senha);

    if (!emailNorm || !emailNorm.includes('@')) {
      throw { status: 400, mensagem: 'Informe um e-mail válido para o login de acesso da dupla.' };
    }
    if (senhaNorm.length < 8) {
      throw { status: 400, mensagem: 'A senha de acesso deve ter no mínimo 8 caracteres.' };
    }

    const emailEmUso = await UsuarioModel.findByEmail(emailNorm);
    if (emailEmUso) {
      throw { status: 400, mensagem: 'Este e-mail já está sendo utilizado por outro usuário no sistema.' };
    }

    // 6. Classificação e Atividade Missionária
    const levouPessoaBatismo = dados.levouPessoaBatismo === true || dados.levouPessoaBatismo === 'true';
    const jaDeuEstudoBiblico = dados.jaDeuEstudoBiblico === true || dados.jaDeuEstudoBiblico === 'true';
    const estudoAtualEmAndamento = dados.estudoAtualEmAndamento === true || dados.estudoAtualEmAndamento === 'true';

    let classificacaoDupla = 'C';
    if (levouPessoaBatismo) {
      classificacaoDupla = 'A';
    } else if (jaDeuEstudoBiblico) {
      classificacaoDupla = 'B';
    }

    const nomeDupla = `${liderNome.trim()} e ${membro2Nome.trim()}`;
    const senhaHash = await bcrypt.hash(senhaNorm, 10);

    // 7. Transação Atômica: Dupla + Usuário
    const resultado = await prisma.$transaction(async (tx) => {
      const regiao = await tx.regiao.findUnique({ where: { id: regiaoId }, select: { nome: true } });
      const distrito = await tx.distrito.findUnique({ where: { id: distritoId }, select: { nome: true } });

      const novaDupla = await tx.dupla.create({
        data: {
          regiaoNome: regiao?.nome || '',
          distritoId,
          igrejaId,
          bairro: dados.bairro?.trim() || 'Não informado',
          tipoProjeto: dados.tipoProjeto || 'ESTUDO_BIBLICO',
          fotoLider: dados.fotoLider,
          fotoMembro2: dados.fotoMembro2,
          liderNome: liderNome.trim(),
          liderTelefone: dados.liderTelefone?.trim() || null,
          liderEmail: dados.liderEmail?.trim() || emailNorm,
          liderIgreja: dados.liderIgreja?.trim() || igreja.nome,
          liderDistrito: dados.liderDistrito?.trim() || distrito?.nome,
          liderDataNascimento: dados.liderDataNascimento ? new Date(dados.liderDataNascimento) : null,
          liderDataBatismo: dados.liderDataBatismo ? new Date(dados.liderDataBatismo) : null,
          liderSexo: dados.liderSexo || null,
          liderEndereco: dados.liderEndereco?.trim() || null,
          membro2Tipo: 'MEMBRO_IASD',
          membro2Nome: membro2Nome.trim(),
          membro2Telefone: dados.membro2Telefone?.trim() || null,
          membro2Email: dados.membro2Email?.trim() || null,
          membro2Igreja: dados.membro2Igreja?.trim() || igreja.nome,
          membro2Distrito: dados.membro2Distrito?.trim() || distrito?.nome,
          membro2DataNascimento: dados.membro2DataNascimento ? new Date(dados.membro2DataNascimento) : null,
          membro2DataBatismo: dados.membro2DataBatismo ? new Date(dados.membro2DataBatismo) : null,
          membro2Sexo: dados.membro2Sexo || null,
          membro2Endereco: dados.membro2Endereco?.trim() || null,
          status: ['ATIVA', 'PENDENTE', 'INATIVA'].includes(dados.status) ? dados.status : 'ATIVA',
          dataInicio: dados.dataInicio ? new Date(dados.dataInicio) : new Date(),
          pessoasAlcancadas: Math.max(0, Number(dados.pessoasAlcancadas) || 0),
          metaBatismos: Math.max(0, Number(dados.metaBatismos) || 0),
          metaEstudosBiblicos: Math.max(0, Number(dados.metaEstudosBiblicos) || 0),
          batismos: Math.max(0, Number(dados.batismos) || 0),
          classificacaoDupla,
          atividadeDupla: estudoAtualEmAndamento ? 'ATIVA' : 'INATIVA',
          levouPessoaBatismo,
          jaDeuEstudoBiblico,
          estudoAtualEmAndamento,
          estudoBiblico: dados.estudoBiblico?.trim() || null,
          statusEstudoBiblico: dados.statusEstudoBiblico?.trim() || (estudoAtualEmAndamento ? 'ATIVO' : null),
          statusEvangelismo: dados.statusEvangelismo?.trim() || null,
          observacoes: dados.observacoes?.trim() || null,
        },
      });

      const novoUsuario = await tx.usuario.create({
        data: {
          nome: nomeDupla,
          email: emailNorm,
          senha: senhaHash,
          perfil: 'DUPLA_MISSIONARIA',
          duplaId: novaDupla.id,
          distritoId,
          igrejaId,
          regiaoId,
          ativo: true,
        },
      });

      return { dupla: novaDupla, usuario: novoUsuario };
    });

    return {
      sucesso: true,
      mensagem: 'Dupla missionária cadastrada com sucesso! Você já pode entrar com seu e-mail e senha.',
      email: emailNorm,
      nomeDupla,
    };
  },

  async me(usuarioId) {
    const usuario = await UsuarioModel.findByIdComSenha(usuarioId);
    if (!usuario) return usuario;
    const { senha: _, ...usuarioSemSenha } = usuario;
    return {
      ...usuarioSemSenha,
      somenteLeitura: ehSomenteLeitura(usuario),
      identidade: montarIdentidadeUsuario(usuario),
    };
  },
};

module.exports = AuthService;
