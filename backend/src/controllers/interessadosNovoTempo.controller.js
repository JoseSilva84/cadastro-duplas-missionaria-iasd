const InteressadosNovoTempoService = require('../services/interessadosNovoTempo.service');

function responderErro(res, falha) {
  console.error('[Interessados NT]', falha);
  return res.status(falha.status || 500).json({
    erro: falha.mensagem || 'Erro ao consultar os interessados do Novo Tempo.',
    codigo: falha.codigo || 'INTERESSADOS_NT_ERRO',
  });
}

const InteressadosNovoTempoController = {
  async resumo(req, res) {
    try {
      const resultado = await InteressadosNovoTempoService.resumo({ atualizar: req.query.atualizar === '1' });
      return res.json(resultado);
    } catch (falha) {
      return responderErro(res, falha);
    }
  },

  async porDistrito(req, res) {
    try {
      const resultado = await InteressadosNovoTempoService.porDistrito(req.params.distrito, {
        atualizar: req.query.atualizar === '1',
      });
      return res.json(resultado);
    } catch (falha) {
      return responderErro(res, falha);
    }
  },

  status(req, res) {
    return res.json(InteressadosNovoTempoService.statusConfiguracao());
  },
};

module.exports = InteressadosNovoTempoController;
