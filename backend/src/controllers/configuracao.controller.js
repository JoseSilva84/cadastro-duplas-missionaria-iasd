const ConfiguracaoService = require('../services/configuracao.service');

const ConfiguracaoController = {
  async backup(req, res) {
    try {
      const backup = await ConfiguracaoService.gerarBackup(req.usuario);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${backup.nomeArquivo}"`);
      res.send(backup.conteudo);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao gerar backup.' });
    }
  },

  async restaurarBackup(req, res) {
    try {
      const resultado = await ConfiguracaoService.restaurarBackup(req.usuario, req.body);
      res.json(resultado);
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao restaurar backup.' });
    }
  },
};

module.exports = ConfiguracaoController;
