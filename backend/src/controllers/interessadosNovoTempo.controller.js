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

  async analise(req, res) {
    try {
      const resultado = await InteressadosNovoTempoService.analise({
        distrito: req.query.distrito,
        prioridade: req.query.prioridade,
        vip: req.query.vip,
        whatsapp: req.query.whatsapp,
        estudos: req.query.estudos,
        genero: req.query.genero,
      }, { atualizar: req.query.atualizar === '1' });
      return res.json(resultado);
    } catch (falha) {
      return responderErro(res, falha);
    }
  },

  async analisePorDistrito(req, res) {
    try {
      const resultado = await InteressadosNovoTempoService.analisePorDistrito(req.params.distrito, {
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
