// Controller de Dupla — Entrada e saída HTTP
const { body, validationResult } = require('express-validator');
const DuplaService = require('../services/dupla.service');

// Validações do cadastro de dupla
const validarDupla = [
  body('liderNome').notEmpty().withMessage('Nome do líder obrigatório.'),
  body('liderTelefone').notEmpty().withMessage('WhatsApp do líder obrigatório.'),
  body('bairro').optional({ checkFalsy: true }).isString(),
  body('tipoProjeto').optional({ checkFalsy: true }).isString(),
  body('membro2Nome').optional({ checkFalsy: true }).isString(),
  body('distritoId').optional({ checkFalsy: true }).isInt().withMessage('Distrito inválido.'),
  body('levouPessoaBatismo').optional({ checkFalsy: true }).isBoolean(),
  body('jaDeuEstudoBiblico').optional({ checkFalsy: true }).isBoolean(),
  body('estudoAtualEmAndamento').optional({ checkFalsy: true }).isBoolean(),
];

const DuplaController = {
  // GET /api/duplas — lista com filtros por escopo de perfil
  async listar(req, res) {
    try {
      const duplas = await DuplaService.listar(req.usuario, req.query);
      res.json(duplas);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao listar duplas.' });
    }
  },

  // GET /api/duplas/:id — valida escopo para DUPLA_MISSIONARIA e PASTOR_DISTRITAL
  async buscarPorId(req, res) {
    try {
      const dupla = await DuplaService.buscarPorId(req.params.id, req.usuario);
      res.json(dupla);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao buscar dupla.' });
    }
  },

  // POST /api/duplas — cria nova dupla (DUPLA_MISSIONARIA e COORD bloqueados na rota)
  async criar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    try {
      const dupla = await DuplaService.criar(req.body, req.usuario);
      res.status(201).json(dupla);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao cadastrar dupla.' });
    }
  },

  // PUT /api/duplas/:id — atualiza com verificação de escopo no service
  async atualizar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }

    try {
      const dupla = await DuplaService.atualizar(req.params.id, req.body, req.usuario);
      res.json(dupla);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao atualizar dupla.' });
    }
  },

  // DELETE /api/duplas/:id — apenas admins (garantido na rota)
  async remover(req, res) {
    try {
      await DuplaService.remover(req.params.id);
      res.json({ mensagem: 'Dupla removida com sucesso.' });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao remover dupla.' });
    }
  },
};

module.exports = { DuplaController, validarDupla };
