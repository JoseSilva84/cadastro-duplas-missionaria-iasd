const express = require('express');
const {
  CalendarioMissionarioController: C,
  validarConsulta,
  validarTema,
  validarEvento,
  validarCriarEvento,
  validarAcao,
  validarCriarAcao,
  validarId,
} = require('../controllers/calendarioMissionario.controller');
const { autenticar, autorizar, PERFIS } = require('../middlewares/auth');

const router = express.Router();

const soAdmin = autorizar(PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR);

const podeGerenciarEvento = autorizar(
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.PASTOR_REGIONAL,
  PERFIS.COORDENADOR_REGIONAL,
  PERFIS.PASTOR_DISTRITAL
);

const podeCadastrarAcao = autorizar(
  PERFIS.SUPER_ADMIN,
  PERFIS.ADMINISTRADOR,
  PERFIS.PASTOR_REGIONAL,
  PERFIS.COORDENADOR_REGIONAL,
  PERFIS.PASTOR_DISTRITAL,
  PERFIS.DIRETOR_MISSIONARIO_IGREJA,
  PERFIS.DUPLA_MISSIONARIA
);

router.get('/', autenticar, validarConsulta, C.obter);

// Temas: somente administradores
router.post('/temas/modelo', autenticar, soAdmin, C.criarModelo);
router.post('/temas', autenticar, soAdmin, validarTema, C.criarTema);
router.put('/temas/:id', autenticar, soAdmin, validarId, validarTema, C.atualizarTema);
router.delete('/temas/:id', autenticar, soAdmin, validarId, C.excluirTema);

// Eventos do tema: administradores e pastores
router.post('/eventos', autenticar, podeGerenciarEvento, validarCriarEvento, C.criarEvento);
router.put('/eventos/:id', autenticar, podeGerenciarEvento, validarId, validarEvento, C.atualizarEvento);
router.delete('/eventos/:id', autenticar, podeGerenciarEvento, validarId, C.excluirEvento);

// Acoes missionarias: cada nivel/login cadastra as suas para o evento
router.post('/acoes', autenticar, podeCadastrarAcao, validarCriarAcao, C.criarAcao);
router.put('/acoes/:id', autenticar, podeCadastrarAcao, validarId, validarAcao, C.atualizarAcao);
router.delete('/acoes/:id', autenticar, podeCadastrarAcao, validarId, C.excluirAcao);

module.exports = router;
