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
      const igreja = await IgrejaService.buscarPorId(req.params.id, req.usuario);
      res.json(igreja);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao buscar igreja.' });
    }
  },

  // POST /api/igrejas
  async criar(req, res) {
    try {
      const igreja = await IgrejaService.criar(req.body, req.usuario);
      res.status(201).json(igreja);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao criar igreja.' });
    }
  },

  // PUT /api/igrejas/:id
  async atualizar(req, res) {
    try {
      const igreja = await IgrejaService.atualizar(req.params.id, req.body, req.usuario);
      res.json(igreja);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao atualizar igreja.' });
    }
  },

  async remover(req, res) {
    try {
      await IgrejaService.remover(req.params.id, req.usuario);
      res.json({ mensagem: 'Igreja removida com sucesso.' });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao remover igreja.' });
    }
  },
};

module.exports = IgrejaController;
