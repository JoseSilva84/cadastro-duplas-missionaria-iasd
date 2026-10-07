const { body, query, param, validationResult } = require('express-validator');
const CalendarioMissionarioService = require('../services/calendarioMissionario.service');

const validarConsulta = [
  query('ano').optional().isInt({ min: 2000, max: 2100 }).withMessage('Ano invalido.'),
  query('regiaoId').optional({ values: 'falsy' }).isInt().withMessage('Regiao invalida.'),
  query('distritoId').optional({ values: 'falsy' }).isInt().withMessage('Distrito invalido.'),
  query('igrejaId').optional({ values: 'falsy' }).isInt().withMessage('Igreja invalida.'),
];

const validarTema = [
  body('nome').trim().notEmpty().withMessage('Informe o tema do evento.'),
];

const validarEvento = [
  body('nome').trim().notEmpty().withMessage('Informe o nome do evento.'),
];

const validarCriarEvento = [
  body('temaId').isInt().withMessage('Tema obrigatorio.'),
  ...validarEvento,
];

const validarAcao = [
  body('nome').trim().notEmpty().withMessage('Informe o nome da acao missionaria.'),
  body('valor').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Orcamento invalido.'),
];

const validarCriarAcao = [
  body('temaId').optional({ values: 'falsy' }).isInt().withMessage('Tema invalido.'),
  body('eventoId').optional({ values: 'falsy' }).isInt().withMessage('Evento invalido.'),
  ...validarAcao,
];

const validarId = [param('id').isInt().withMessage('Id invalido.')];

const responderErro = (res, err, mensagem) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  return res.status(status).json({ erro: err.mensagem || mensagem });
};

// Executa o service e devolve JSON; erros de validacao viram 400.
const rota = (acao, { status = 200, mensagem }) => async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erro: erros.array()[0].msg, erros: erros.array() });
  }
  try {
    const resultado = await acao(req);
    return resultado === undefined ? res.status(204).end() : res.status(status).json(resultado);
  } catch (err) {
    return responderErro(res, err, mensagem);
  }
};

const S = CalendarioMissionarioService;

const CalendarioMissionarioController = {
  obter: rota((req) => S.obter(req.usuario, req.query), { mensagem: 'Erro ao carregar calendario missionario.' }),
  criarTema: rota((req) => S.criarTema(req.usuario, req.body), { status: 201, mensagem: 'Erro ao criar tema.' }),
  atualizarTema: rota((req) => S.atualizarTema(req.usuario, req.params.id, req.body), { mensagem: 'Erro ao atualizar tema.' }),
  excluirTema: rota((req) => S.excluirTema(req.usuario, req.params.id), { mensagem: 'Erro ao excluir tema.' }),
  criarModelo: rota((req) => S.criarModelo(req.usuario, req.body), { status: 201, mensagem: 'Erro ao criar modelo.' }),

  // Eventos do tema
  criarEvento: rota((req) => S.criarEvento(req.usuario, req.body), { status: 201, mensagem: 'Erro ao criar evento.' }),
  atualizarEvento: rota((req) => S.atualizarEvento(req.usuario, req.params.id, req.body), { mensagem: 'Erro ao atualizar evento.' }),
  excluirEvento: rota((req) => S.excluirEvento(req.usuario, req.params.id), { mensagem: 'Erro ao excluir evento.' }),

  // Ações missionárias
  criarAcao: rota((req) => S.criarAcao(req.usuario, req.body), { status: 201, mensagem: 'Erro ao salvar acao.' }),
  atualizarAcao: rota((req) => S.atualizarAcao(req.usuario, req.params.id, req.body), { mensagem: 'Erro ao salvar acao.' }),
  excluirAcao: rota((req) => S.excluirAcao(req.usuario, req.params.id), { mensagem: 'Erro ao excluir acao.' }),
};

module.exports = {
  CalendarioMissionarioController,
  validarConsulta,
  validarTema,
  validarEvento,
  validarCriarEvento,
  validarAcao,
  validarCriarAcao,
  validarId,
};
