// Middleware de autenticação JWT e autorização RBAC
const jwt = require('jsonwebtoken');

// ─── Constantes dos Perfis ────────────────────────────────────────────────────
const PERFIS = {
  SUPER_ADMIN:          'SUPER_ADMIN',
  ADMINISTRADOR:        'ADMINISTRADOR',
  PASTOR_REGIONAL:      'PASTOR_REGIONAL',
  PASTOR_DISTRITAL:     'PASTOR_DISTRITAL',
  COORDENADOR_REGIONAL: 'COORDENADOR_REGIONAL',
  DIRETOR_MISSIONARIO_IGREJA: 'DIRETOR_MISSIONARIO_IGREJA',
  DUPLA_MISSIONARIA:    'DUPLA_MISSIONARIA',
};

// Perfis com acesso administrativo total (operacional)
const ADMINS = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR];

// Perfis com acesso a recursos regionais
const NIVEL_REGIONAL = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.PASTOR_REGIONAL,
  PERFIS.COORDENADOR_REGIONAL,
];

// Perfis com acesso a recursos distritais
const NIVEL_DISTRITAL = [
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.PASTOR_REGIONAL,
  PERFIS.PASTOR_DISTRITAL,
  PERFIS.COORDENADOR_REGIONAL,
];

// ─── Helpers de Verificação de Perfil ─────────────────────────────────────────
const ehAdmin = (perfil) => ADMINS.includes(perfil);
const ehSuperAdmin = (perfil) => perfil === PERFIS.SUPER_ADMIN;
const ehPastorRegional = (perfil) => perfil === PERFIS.PASTOR_REGIONAL;
const ehPastorDistrital = (perfil) => perfil === PERFIS.PASTOR_DISTRITAL;
const ehCoordenadorRegional = (perfil) => perfil === PERFIS.COORDENADOR_REGIONAL;
const ehDiretorMissionarioIgreja = (perfil) => perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA;
const ehDupla = (perfil) => perfil === PERFIS.DUPLA_MISSIONARIA;

// ─── Middleware: Verifica e decodifica o token JWT ─────────────────────────────
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

// ─── Middleware: Autoriza por lista de perfis permitidos ──────────────────────
// Uso: autorizar('SUPER_ADMIN', 'ADMINISTRADOR')
const autorizar = (...perfisPermitidos) => {
  return (req, res, next) => {
    if (!perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        erro: 'Acesso não autorizado para este perfil.',
        perfil: req.usuario.perfil,
        perfilNecessario: perfisPermitidos,
      });
    }
    next();
  };
};

// ─── Middleware: Bloqueia perfis específicos ───────────────────────────────────
// Uso: bloquear('DUPLA_MISSIONARIA')
const bloquear = (...perfisProibidos) => {
  return (req, res, next) => {
    if (perfisProibidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        erro: 'Esta operação não está disponível para o seu perfil.',
      });
    }
    next();
  };
};

// ─── Middleware: Apenas admins (SUPER_ADMIN + ADMINISTRADOR) ──────────────────
const apenasAdmins = autorizar(...ADMINS);

// ─── Middleware: Apenas SUPER_ADMIN ───────────────────────────────────────────
const apenasSuperAdmin = autorizar(PERFIS.SUPER_ADMIN);

module.exports = {
  autenticar,
  autorizar,
  bloquear,
  apenasAdmins,
  apenasSuperAdmin,
  PERFIS,
  ADMINS,
  NIVEL_REGIONAL,
  NIVEL_DISTRITAL,
  ehAdmin,
  ehSuperAdmin,
  ehPastorRegional,
  ehPastorDistrital,
  ehCoordenadorRegional,
  ehDiretorMissionarioIgreja,
  ehDupla,
};
