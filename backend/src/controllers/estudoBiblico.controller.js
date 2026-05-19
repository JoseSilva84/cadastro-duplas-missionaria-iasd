const { body, validationResult } = require('express-validator');
const EstudoBiblicoService = require('../services/estudoBiblico.service');

const validarEstudoBiblico = [
  body('nomeEstudante').notEmpty().withMessage('Nome do estudante obrigatório.'),
  body('endereco').notEmpty().withMessage('Endereço obrigatório.'),
  body('cidade').notEmpty().withMessage('Cidade obrigatória.'),
  body('estado').isLength({ min: 2, max: 2 }).withMessage('Estado obrigatório.'),
  body('whatsapp').notEmpty().withMessage('WhatsApp obrigatório.'),
  body('diaEstudo').notEmpty().withMessage('Dia do estudo obrigatório.'),
  body('duplaId').isInt().withMessage('Dupla obrigatória.'),
  body('serie').notEmpty().withMessage('Série obrigatória.'),
  body('licaoAtual').isInt({ min: 1 }).withMessage('Lição atual obrigatória.'),
];

const EstudoBiblicoController = {
  async listar(req, res) {
    try {
      res.json(await EstudoBiblicoService.listar(req.query));
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao listar estudos bíblicos.' });
    }
  },

  async buscarPorId(req, res) {
    try {
      res.json(await EstudoBiblicoService.buscarPorId(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao buscar estudo bíblico.' });
    }
  },

  async criar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      res.status(201).json(await EstudoBiblicoService.criar(req.body));
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao cadastrar estudo bíblico.' });
    }
  },

  async atualizar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      res.json(await EstudoBiblicoService.atualizar(req.params.id, req.body));
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao atualizar estudo bíblico.' });
    }
  },

  async remover(req, res) {
    try {
      await EstudoBiblicoService.remover(req.params.id);
      res.json({ mensagem: 'Estudo bíblico removido com sucesso.' });
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao remover estudo bíblico.' });
    }
  },
};

module.exports = { EstudoBiblicoController, validarEstudoBiblico };
