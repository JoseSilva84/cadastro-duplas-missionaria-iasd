const { body, validationResult } = require('express-validator');
const EstudoBiblicoService = require('../services/estudoBiblico.service');

const validarEstudoBiblico = [
  body('nomeEstudante').notEmpty().withMessage('Nome do estudante obrigatorio.'),
  body('endereco').notEmpty().withMessage('Endereco obrigatorio.'),
  body('cidade').notEmpty().withMessage('Cidade obrigatoria.'),
  body('estado').isLength({ min: 2, max: 2 }).withMessage('Estado obrigatorio.'),
  body('whatsapp').notEmpty().withMessage('WhatsApp obrigatorio.'),
  body('diaEstudo').notEmpty().withMessage('Dia do estudo obrigatorio.'),
  body('horarioEstudo').optional({ checkFalsy: true }).isString(),
  body('duplaId').isInt().withMessage('Dupla obrigatoria.'),
  body('serie').notEmpty().withMessage('Serie obrigatoria.'),
  body('licaoAtual').isInt({ min: 1 }).withMessage('Licao atual obrigatoria.'),
  body('tipoEstudo').optional({ checkFalsy: true }).isIn(['UNICO', 'PONTO', 'CLASSE']).withMessage('Tipo de estudo invalido.'),
  body('sexo').optional({ checkFalsy: true }).isString(),
  body('classificacaoInteressado').optional({ checkFalsy: true }).isIn(['A', 'B', 'C']).withMessage('Classificacao invalida.'),
  body('motivoImpedimento').optional({ checkFalsy: true }).isString(),
  body('motivoImpedimento').custom((motivo, { req }) => {
    if (req.body.classificacaoInteressado === 'B' && !String(motivo || '').trim()) {
      throw new Error('Motivo do impedimento obrigatorio para estudantes classe B.');
    }
    return true;
  }),
  body('vaIgreja').optional({ checkFalsy: true }).isBoolean(),
  body('leBiblia').optional({ checkFalsy: true }).isBoolean(),
  body('estudaLicao').optional({ checkFalsy: true }).isBoolean(),
  body('devolveDizimos').optional({ checkFalsy: true }).isBoolean(),
  body('cultoFamiliar').optional({ checkFalsy: true }).isBoolean(),
  body('observacoes').optional({ checkFalsy: true }).isString(),
  body('participantes').optional().isArray().withMessage('Participantes deve ser um array.'),
  body('participantes').custom((participantes, { req }) => {
    if (!['PONTO', 'CLASSE'].includes(req.body.tipoEstudo)) return true;
    if (!Array.isArray(participantes) || participantes.length === 0) {
      throw new Error(req.body.tipoEstudo === 'PONTO'
        ? 'Ponto de Estudo precisa ter pelo menos um estudante.'
        : 'Classe Biblica precisa ter pelo menos um participante.');
    }
    if (req.body.tipoEstudo === 'PONTO' && participantes.length > 5) {
      throw new Error('Ponto de Estudo permite no maximo 5 estudantes.');
    }
    if (req.body.tipoEstudo === 'CLASSE' && participantes.length > 10) {
      throw new Error('Classe Biblica permite no maximo 10 participantes.');
    }
    participantes.forEach((participante, index) => {
      if (!participante.nome) {
        throw new Error(`Nome do estudante ${index + 1} obrigatorio.`);
      }
      if (participante.classificacaoInteressado && !['A', 'B', 'C'].includes(participante.classificacaoInteressado)) {
        throw new Error(`Classificacao do estudante ${index + 1} invalida.`);
      }
      const exigeMotivo = req.body.tipoEstudo === 'CLASSE'
        ? ['B', 'C'].includes(participante.classificacaoInteressado)
        : participante.classificacaoInteressado === 'B';
      if (exigeMotivo && !String(participante.motivoImpedimento || '').trim()) {
        throw new Error(`Motivo da classificacao do estudante ${index + 1} obrigatorio.`);
      }
    });
    return true;
  }),
];

const EstudoBiblicoController = {
  async listar(req, res) {
    try {
      res.json(await EstudoBiblicoService.listar(req.query, req.usuario));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao listar estudos biblicos.' });
    }
  },

  async buscarPorId(req, res) {
    try {
      res.json(await EstudoBiblicoService.buscarPorId(req.params.id, req.usuario));
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao buscar estudo biblico.' });
    }
  },

  async criar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      res.status(201).json(await EstudoBiblicoService.criar(req.body, req.usuario));
    } catch (err) {
      const status = err.status || 500;
      res.status(status).json({ erro: err.mensagem || 'Erro ao cadastrar estudo biblico.' });
    }
  },

  async atualizar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      res.json(await EstudoBiblicoService.atualizar(req.params.id, req.body, req.usuario));
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao atualizar estudo biblico.' });
    }
  },

  async remover(req, res) {
    try {
      await EstudoBiblicoService.remover(req.params.id, req.usuario);
      res.json({ mensagem: 'Estudo biblico removido com sucesso.' });
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao remover estudo biblico.' });
    }
  },
};

module.exports = { EstudoBiblicoController, validarEstudoBiblico };
