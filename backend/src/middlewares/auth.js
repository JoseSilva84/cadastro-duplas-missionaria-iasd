// Middleware de autenticação JWT
const jwt = require('jsonwebtoken');

// Verifica e decodifica o token JWT
const autenticar = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ erro: 'Token inválido ou expirado.' });
  }
};

// Verifica se o usuário tem um dos perfis permitidos
const autorizar = (...perfisPermitidos) => {
  return (req, res, next) => {
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Acesso não autorizado para este perfil.' });
    }
    next();
  };
};

module.exports = { autenticar, autorizar };
