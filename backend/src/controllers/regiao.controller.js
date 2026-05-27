// Controller de Região — Entrada e saída HTTP
const RegiaoService = require('../services/regiao.service');

const RegiaoController = {
  // GET /api/regioes
  async listar(req, res) {
    try {
      const regioes = await RegiaoService.listar(req.usuario);
      res.json(regioes);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao listar regiões.' });
    }
  },

  // GET /api/regioes/:id
  async buscarPorId(req, res) {
    try {
      const regiao = await RegiaoService.buscarPorId(req.params.id, req.usuario);
      res.json(regiao);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao buscar região.' });
    }
  },

  // POST /api/regioes
  async criar(req, res) {
    try {
      const regiao = await RegiaoService.criar(req.body);
      res.status(201).json(regiao);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao criar região.' });
    }
  },

  // PUT /api/regioes/:id
  async atualizar(req, res) {
    try {
      const regiao = await RegiaoService.atualizar(req.params.id, req.body, req.usuario);
      res.json(regiao);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao atualizar região.' });
    }
  },

  // DELETE /api/regioes/:id
  async remover(req, res) {
    try {
      await RegiaoService.remover(req.params.id, req.usuario);
      res.json({ mensagem: 'Região removida com sucesso.' });
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao remover região.' });
    }
  },
};

module.exports = RegiaoController;
