// Rotas de Duplas Missionárias — com controle de acesso RBAC
const express = require('express');
const { DuplaController, validarDupla } = require('../controllers/dupla.controller');
const { autenticar, autorizar, bloquear, PERFIS } = require('../middlewares/auth');

const router = express.Router();

// GET /api/duplas — Lista duplas (service filtra por escopo: região, distrito ou própria dupla)
router.get('/', autenticar, DuplaController.listar);

// GET /api/duplas/:id — Detalhes de uma dupla (service valida acesso para DUPLA_MISSIONARIA)
router.get('/:id', autenticar, DuplaController.buscarPorId);

// POST /api/duplas — Cadastra nova dupla
// DUPLA_MISSIONARIA e COORDENADOR_REGIONAL não criam duplas
router.post(
  '/',
  autenticar,
  bloquear(PERFIS.DUPLA_MISSIONARIA, PERFIS.COORDENADOR_REGIONAL),
  validarDupla,
  DuplaController.criar
);

// PUT /api/duplas/:id — Atualiza dupla (service valida escopo)
// DUPLA_MISSIONARIA e COORDENADOR_REGIONAL não editam cadastro de duplas
router.put(
  '/:id',
  autenticar,
  bloquear(PERFIS.DUPLA_MISSIONARIA, PERFIS.COORDENADOR_REGIONAL),
  validarDupla,
  DuplaController.atualizar
);

// DELETE /api/duplas/:id — Remove dupla (apenas admins)
router.delete(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR),
  DuplaController.remover
);

module.exports = router;
