// Rotas de Distritos — com controle de acesso RBAC
const express = require('express');
const DistritoController = require('../controllers/distrito.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

// GET /api/distritos — Lista distritos (filtrado por escopo no service)
router.get('/', autenticar, DistritoController.listar);

// GET /api/distritos/:id — Detalhes de um distrito
router.get('/:id', autenticar, DistritoController.buscarPorId);

// POST /api/distritos — Cria novo distrito (admins e Pastor Regional)
router.post(
  '/',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL),
  DistritoController.criar
);

// PUT /api/distritos/:id — Atualiza distrito completo (admins e Pastor Regional)
router.put(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR, PERFIS.PASTOR_REGIONAL),
  DistritoController.atualizar
);

// PATCH /api/distritos/:id — Atualiza campos parciais (foto/nome do pastor distrital)
// Pastor Distrital pode atualizar dados do seu próprio distrito
router.patch(
  '/:id',
  autenticar,
  autorizar(
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.PASTOR_REGIONAL,
    PERFIS.PASTOR_DISTRITAL
  ),
  DistritoController.atualizar
);

router.delete(
  '/:id',
  autenticar,
  autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR),
  DistritoController.remover
);

module.exports = router;
