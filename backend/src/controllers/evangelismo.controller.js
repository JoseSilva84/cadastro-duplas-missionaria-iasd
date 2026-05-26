const { body, validationResult } = require('express-validator');
const EvangelismoService = require('../services/evangelismo.service');

const validarEvangelismo = [
  body('nomePessoa').notEmpty().withMessage('Nome da pessoa obrigatório.'),
  body('endereco').notEmpty().withMessage('Endereço obrigatório.'),
  body('cidade').notEmpty().withMessage('Cidade obrigatória.'),
  body('estado').isLength({ min: 2, max: 2 }).withMessage('Estado obrigatório.'),
  body('whatsapp').notEmpty().withMessage('WhatsApp obrigatório.'),
  body('diaEvangelismo').notEmpty().withMessage('Dia da classe bíblica obrigatório.'),
  body('duplaId').isInt().withMessage('Dupla obrigatória.'),
  body('serie').notEmpty().withMessage('Série obrigatória.'),
  body('estudoAtual').isInt({ min: 1 }).withMessage('Estudo atual obrigatório.'),
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
