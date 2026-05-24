const { body, validationResult } = require('express-validator');
const EscolaSabatinaService = require('../services/escolaSabatina.service');

const validarCadastroEscolaSabatina = [
  body('distritoId').isInt().withMessage('Distrito obrigatorio.'),
  body('igrejaId').isInt().withMessage('Igreja obrigatoria.'),
  body('duplaIds').isArray({ min: 1 }).withMessage('Selecione ao menos uma dupla.'),
  body('unidadesAcao').optional().isInt({ min: 0 }).withMessage('Unidades de acao deve ser um numero positivo.'),
  body('classeProfessores').optional().isInt({ min: 0 }).withMessage('Classe dos professores deve ser um numero positivo.'),
  body('classeInteressados').optional().isInt({ min: 0 }).withMessage('Classe de interessados deve ser um numero positivo.'),
  body('visitasDiretores').optional().isInt({ min: 0 }).withMessage('Visitas dos diretores deve ser um numero positivo.'),
  body('visitasProfessores').optional().isInt({ min: 0 }).withMessage('Visitas dos professores deve ser um numero positivo.'),
  body('visitasAlunos').optional().isInt({ min: 0 }).withMessage('Visitas dos alunos deve ser um numero positivo.'),
  body('quantidadePequenosGrupos').optional().isInt({ min: 0 }).withMessage('Quantidade de Pequenos Grupos deve ser um numero positivo.'),
];

const EscolaSabatinaController = {
  async listar(req, res) {
    try {
      const resultado = await EscolaSabatinaService.listar(req.usuario, req.query);
      res.json(resultado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao listar cadastros da Escola Sabatina.' });
    }
  },

  async criar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    try {
      const resultado = await EscolaSabatinaService.criar(req.body, req.usuario);
      res.status(201).json(resultado);
    } catch (err) {
      const status = err.status || 500;
      if (status === 500) console.error(err);
      res.status(status).json({ erro: err.mensagem || 'Erro ao cadastrar Escola Sabatina.' });
    }
  },
};

module.exports = { EscolaSabatinaController, validarCadastroEscolaSabatina };
