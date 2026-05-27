// Controller de Distrito — Entrada e saída HTTP
const DistritoService = require('../services/distrito.service');

const DistritoController = {
  // GET /api/distritos
  async listar(req, res) {
    try {
      const distritos = await DistritoService.listar(req.usuario, req.query);
      res.json(distritos);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao listar distritos.' });
    }
  },

  // GET /api/distritos/:id
  async buscarPorId(req, res) {
    try {
      const distrito = await DistritoService.buscarPorId(req.params.id, req.usuario);
      res.json(distrito);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao buscar distrito.' });
    }
  },

  // POST /api/distritos
  async criar(req, res) {
    try {
      const distrito = await DistritoService.criar(req.body, req.usuario);
      res.status(201).json(distrito);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao criar distrito.' });
    }
  },

  // PUT /api/distritos/:id
  async atualizar(req, res) {
    try {
      const distrito = await DistritoService.atualizar(req.params.id, req.body, req.usuario);
      res.json(distrito);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao atualizar distrito.' });
    }
  },
};

module.exports = DistritoController;
