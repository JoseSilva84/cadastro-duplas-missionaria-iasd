const express = require('express');
const AuditoriaController = require('../controllers/auditoria.controller');
const { autenticar, apenasSuperAdmin } = require('../middlewares/auth');

const router = express.Router();

// Coleta de sessão e diagnósticos disponível a qualquer usuário autenticado.
router.post('/heartbeat', autenticar, AuditoriaController.heartbeat);
router.post('/logout', autenticar, AuditoriaController.logout);
router.post('/cliente', autenticar, AuditoriaController.eventoCliente);

// Consulta dos dados: exclusivamente SUPER_ADMIN.
router.get('/resumo', autenticar, apenasSuperAdmin, AuditoriaController.resumo);
router.get('/sessoes', autenticar, apenasSuperAdmin, AuditoriaController.sessoes);
router.get('/logs', autenticar, apenasSuperAdmin, AuditoriaController.logs);

module.exports = router;
