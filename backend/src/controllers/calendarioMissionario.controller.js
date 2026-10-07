const { body, query, validationResult } = require('express-validator');
const CalendarioMissionarioService = require('../services/calendarioMissionario.service');

const validarConsulta = [
  query('igrejaId').isInt().withMessage('Igreja obrigatoria.'),
  query('ano').optional().isInt({ min: 2000, max: 2100 }).withMessage('Ano invalido.'),
];

const validarSalvar = [
  body('igrejaId').isInt().withMessage('Igreja obrigatoria.'),
  body('ano').optional().isInt({ min: 2000, max: 2100 }).withMessage('Ano invalido.'),
  body('eventos').isArray().withMessage('Eventos deve ser uma lista.'),
];

const responderErro = (res, err, mensagem) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  return res.status(status).json({ erro: err.mensagem || mensagem });
};

const CalendarioMissionarioController = {
  async obter(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
    try {
      res.json(await CalendarioMissionarioService.obter(req.usuario, req.query));
    } catch (err) {
      responderErro(res, err, 'Erro ao carregar calendario missionario.');
    }
  },

  async salvar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });
    try {
      res.json(await CalendarioMissionarioService.salvar(req.usuario, req.body));
    } catch (err) {
      responderErro(res, err, 'Erro ao salvar calendario missionario.');
    }
  },
};

module.exports = { CalendarioMissionarioController, validarConsulta, validarSalvar };
