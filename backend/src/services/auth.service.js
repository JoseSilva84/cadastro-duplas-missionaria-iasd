const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const UsuarioModel = require('../models/usuario.model');
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
    if (usuario.perfil === 'SUPER_ADMIN' && usuarioSolicitante.perfil !== 'SUPER_ADMIN') {
      throw { status: 403, mensagem: 'Apenas outro Super Administrador pode gerar este acesso.' };
    }

    const token = jwt.sign(
      {
        finalidade: 'redefinir-acesso',
        versaoCredenciais: versaoDasCredenciais(usuario),
        nonce: crypto.randomUUID(),
      },
      segredoRedefinicao(),
      { subject: String(usuario.id), expiresIn: '15m' }
    );

    return {
      token,
      expiraEm: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
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
    if (!usuario || !usuario.ativo || versaoDasCredenciais(usuario) !== payload.versaoCredenciais) {
      throw { status: 400, mensagem: 'Este QR Code já foi utilizado ou não é mais válido.' };
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

  async me(usuarioId) {
    const usuario = await UsuarioModel.findById(usuarioId);
    if (!usuario) return usuario;
    return { ...usuario, somenteLeitura: ehSomenteLeitura(usuario) };
  },
};

module.exports = AuthService;
