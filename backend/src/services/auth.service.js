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
const versaoDasCredenciais = (usuario) => crypto
  .createHash('sha256')
  .update(`${normalizarEmail(usuario.email)}\0${usuario.senha}`)
  .digest('hex');

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
