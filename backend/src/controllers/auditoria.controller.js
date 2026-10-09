const AuditoriaService = require('../services/auditoria.service');

const responderErro = (res, erro, mensagem) => {
  console.error(mensagem, erro);
  res.status(erro.status || 500).json({ erro: erro.mensagem || mensagem });
};

const AuditoriaController = {
  async heartbeat(req, res) {
    try {
      const sessao = await AuditoriaService.atualizarSessao(req.sessaoId);
      res.json({ ativo: Boolean(sessao), atualizadoEm: sessao?.ultimaAtividadeEm || null });
    } catch (erro) {
      responderErro(res, erro, 'Erro ao atualizar a sessão.');
    }
  },

  async logout(req, res) {
    try {
      await AuditoriaService.encerrarSessao(req.sessaoId, req.usuario);
      res.json({ mensagem: 'Sessão encerrada.' });
    } catch (erro) {
      responderErro(res, erro, 'Erro ao encerrar a sessão.');
    }
  },

  async eventoCliente(req, res) {
    try {
      await AuditoriaService.registrarEventoCliente(req.body, req);
      res.status(201).json({ registrado: true });
    } catch (erro) {
      responderErro(res, erro, 'Erro ao registrar diagnóstico da interface.');
    }
  },

  async resumo(req, res) {
    try {
      res.json(await AuditoriaService.resumo());
    } catch (erro) {
      responderErro(res, erro, 'Erro ao carregar o resumo da auditoria.');
    }
  },

  async sessoes(req, res) {
    try {
      res.json(await AuditoriaService.listarSessoes(req.query));
    } catch (erro) {
      responderErro(res, erro, 'Erro ao listar sessões de acesso.');
    }
  },

  async logs(req, res) {
    try {
      res.json(await AuditoriaService.listarLogs(req.query));
    } catch (erro) {
      responderErro(res, erro, 'Erro ao listar atividades do sistema.');
    }
  },
};

module.exports = AuditoriaController;
