// Controller de Igreja — Entrada e saída HTTP
const IgrejaService = require('../services/igreja.service');

const IgrejaController = {
  // GET /api/igrejas
  async listar(req, res) {
    try {
      const igrejas = await IgrejaService.listar(req.usuario, req.query);
      res.json(igrejas);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao listar igrejas.' });
    }
  },

  // GET /api/igrejas/:id
  async buscarPorId(req, res) {
    try {
      const igreja = await IgrejaService.buscarPorId(req.params.id);
      res.json(igreja);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao buscar igreja.' });
    }
  },

  // POST /api/igrejas
  async criar(req, res) {
    try {
      const igreja = await IgrejaService.criar(req.body);
      res.status(201).json(igreja);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao criar igreja.' });
    }
  },

  // PUT /api/igrejas/:id
  async atualizar(req, res) {
    try {
      const igreja = await IgrejaService.atualizar(req.params.id, req.body);
      res.json(igreja);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao atualizar igreja.' });
    }
  },
};

module.exports = IgrejaController;
