const { body, query, validationResult } = require('express-validator');
const MapaIgrejaService = require('../services/mapaIgreja.service');

const validarMapaIgreja = [
  body('igrejaId').isInt().withMessage('Igreja obrigatoria.'),
  body('primeiroAnciaoNome').trim().notEmpty().withMessage('Primeiro anciao obrigatorio.'),
  body('anoOrganizacao').isInt({ min: 1800, max: new Date().getFullYear() + 1 }).withMessage('Ano da igreja invalido.'),
  body('dataEvangelismoColheita').isISO8601().withMessage('Data do evangelismo de colheita obrigatoria.'),
  body('quantidadePequenosGrupos').optional().isInt({ min: 0 }).withMessage('Pequenos Grupos deve ser numero positivo.'),
  body('semanaSanta').optional().isInt({ min: 0 }).withMessage('Semana Santa deve ser numero positivo.'),
  body('classeBiblica').optional().isInt({ min: 0 }).withMessage('Classe Biblica deve ser numero positivo.'),
  body('aventureiros').optional().isInt({ min: 0 }).withMessage('Aventureiros deve ser numero positivo.'),
  body('desbravadores').optional().isInt({ min: 0 }).withMessage('Desbravadores deve ser numero positivo.'),
  body('acoesMissionarias').optional().isArray().withMessage('Acoes missionarias deve ser uma lista.'),
];

const validarBase = [
  query('igrejaId').isInt().withMessage('Igreja obrigatoria.'),
];

const responderErro = (res, err, mensagem) => {
  const status = err.status || 500;
  if (status === 500) console.error(err);
  return res.status(status).json({ erro: err.mensagem || mensagem });
};

const MapaIgrejaController = {
  async listar(req, res) {
    try {
      const resultado = await MapaIgrejaService.listar(req.usuario, req.query);
      res.json(resultado);
    } catch (err) {
      responderErro(res, err, 'Erro ao listar mapas da igreja.');
    }
  },

  async base(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      const resultado = await MapaIgrejaService.base(req.usuario, req.query.igrejaId);
      res.json(resultado);
    } catch (err) {
      responderErro(res, err, 'Erro ao carregar dados do mapa da igreja.');
    }
  },

  async salvar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      const resultado = await MapaIgrejaService.salvar(req.usuario, req.body);
      res.status(201).json(resultado);
    } catch (err) {
      responderErro(res, err, 'Erro ao salvar mapa da igreja.');
    }
  },
};

module.exports = { MapaIgrejaController, validarMapaIgreja, validarBase };
