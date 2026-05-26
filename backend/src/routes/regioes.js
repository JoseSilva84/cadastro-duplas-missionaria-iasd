// Rotas de Regiões — com controle de acesso RBAC
const express = require('express');
const RegiaoController = require('../controllers/regiao.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

// GET /api/regioes — Todos os perfis autenticados veem regiões (service filtra por escopo)
router.get('/', autenticar, RegiaoController.listar);

// GET /api/regioes/:id — Detalhes de uma região
router.get('/:id', autenticar, RegiaoController.buscarPorId);

// POST /api/regioes — Cria nova região (apenas admins)
router.post(
  '/',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR),
  RegiaoController.criar
);

// PUT /api/regioes/:id — Atualiza região completa (apenas admins)
router.put(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR),
  RegiaoController.atualizar
);

// PATCH /api/regioes/:id — Atualiza campos parciais (foto/nome do conselheiro regional)
// Pastor Regional pode atualizar dados da sua própria região
router.patch(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL),
  RegiaoController.atualizar
);

// DELETE /api/regioes/:id — Remove região (apenas admins)
router.delete(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR),
  RegiaoController.remover
);

module.exports = router;
