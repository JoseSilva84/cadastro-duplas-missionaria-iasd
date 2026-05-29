const { body, validationResult } = require('express-validator');
const EvangelismoService = require('../services/evangelismo.service');

const validarEvangelismo = [
  body('nomePessoa').notEmpty().withMessage('Nome da pessoa obrigatorio.'),
  body('whatsapp').notEmpty().withMessage('WhatsApp obrigatorio.'),
  body('endereco').optional({ checkFalsy: true }).isString(),
  body('cidade').optional({ checkFalsy: true }).isString(),
  body('estado').optional({ checkFalsy: true }).isLength({ min: 2, max: 2 }).withMessage('Estado invalido.'),
  body('diaEvangelismo').optional({ checkFalsy: true }).isString(),
  body('duplaId').optional({ checkFalsy: true }).isInt().withMessage('Dupla invalida.'),
  body('serie').optional({ checkFalsy: true }).isString(),
  body('estudoAtual').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Estudo atual invalido.'),
];

const EvangelismoController = {
  async listar(req, res) {
    try {
      res.json(await EvangelismoService.listar(req.query, req.usuario));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao listar registros de evangelismo.' });
    }
  },

  async buscarPorId(req, res) {
    try {
      res.json(await EvangelismoService.buscarPorId(req.params.id, req.usuario));
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao buscar registro de evangelismo.' });
    }
  },

  async criar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      res.status(201).json(await EvangelismoService.criar(req.body, req.usuario));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao cadastrar registro de evangelismo.' });
    }
  },

  async atualizar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      res.json(await EvangelismoService.atualizar(req.params.id, req.body, req.usuario));
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao atualizar registro de evangelismo.' });
    }
  },

  async remover(req, res) {
    try {
      await EvangelismoService.remover(req.params.id, req.usuario);
      res.json({ mensagem: 'Registro de evangelismo removido com sucesso.' });
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao remover registro de evangelismo.' });
    }
  },
};

module.exports = { EvangelismoController, validarEvangelismo };
