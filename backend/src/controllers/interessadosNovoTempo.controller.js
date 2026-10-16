const InteressadosNovoTempoService = require('../services/interessadosNovoTempo.service');

function responderErro(res, falha) {
  console.error('[Interessados NT]', falha);
  if (['P2021', 'P2022'].includes(falha.code)) {
    return res.status(503).json({
      erro: 'O banco do PCM ainda não tem as tabelas dos Interessados NT. Aplique a migração do banco no backend.',
      codigo: 'INTERESSADOS_NT_MIGRACAO_PENDENTE',
    });
  }
  return res.status(falha.status || 500).json({
    erro: falha.mensagem || 'Erro ao consultar os interessados do Novo Tempo.',
    codigo: falha.codigo || 'INTERESSADOS_NT_ERRO',
  });
}

const InteressadosNovoTempoController = {
  async resumo(req, res) {
    try {
      const resultado = await InteressadosNovoTempoService.resumo({
        atualizar: req.query.atualizar === '1',
        usuario: req.usuario,
      });
      return res.json(resultado);
    } catch (falha) {
      return responderErro(res, falha);
    }
  },

  async porDistrito(req, res) {
    try {
      const resultado = await InteressadosNovoTempoService.porDistrito(req.params.distrito, {
        atualizar: req.query.atualizar === '1',
        usuario: req.usuario,
        paginado: true,
        pagina: req.query.pagina,
        limite: req.query.limite,
        versao: req.query.versao,
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
      }, {
        atualizar: req.query.atualizar === '1',
        usuario: req.usuario,
      });
      return res.json(resultado);
    } catch (falha) {
      return responderErro(res, falha);
    }
  },

  async filtragemAvancada(req, res) {
    try {
      const resultado = await InteressadosNovoTempoService.filtragemAvancada({
        atualizar: req.query.atualizar === '1',
        usuario: req.usuario,
      });
      return res.json(resultado);
    } catch (falha) {
      return responderErro(res, falha);
    }
  },

  async analisePorDistrito(req, res) {
    try {
      const resultado = await InteressadosNovoTempoService.analisePorDistrito(req.params.distrito, {
        atualizar: req.query.atualizar === '1',
        usuario: req.usuario,
      });
      return res.json(resultado);
    } catch (falha) {
      return responderErro(res, falha);
    }
  },

  async status(req, res) {
    try {
      return res.json(await InteressadosNovoTempoService.statusConfiguracao());
    } catch (falha) {
      return responderErro(res, falha);
    }
  },
};

module.exports = InteressadosNovoTempoController;
