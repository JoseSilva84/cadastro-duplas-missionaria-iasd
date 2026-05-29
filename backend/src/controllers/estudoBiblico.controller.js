const { body, validationResult } = require('express-validator');
const EstudoBiblicoService = require('../services/estudoBiblico.service');

const validarEstudoBiblico = [
  body('nomeEstudante').notEmpty().withMessage('Nome do estudante obrigatorio.'),
  body('whatsapp').notEmpty().withMessage('WhatsApp obrigatorio.'),
  body('endereco').optional({ checkFalsy: true }).isString(),
  body('cidade').optional({ checkFalsy: true }).isString(),
  body('estado').optional({ checkFalsy: true }).isLength({ min: 2, max: 2 }).withMessage('Estado invalido.'),
  body('diaEstudo').optional({ checkFalsy: true }).isString(),
  body('horarioEstudo').optional({ checkFalsy: true }).isString(),
  body('duplaId').optional({ checkFalsy: true }).isInt().withMessage('Dupla invalida.'),
  body('serie').optional({ checkFalsy: true }).isString(),
  body('licaoAtual').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Licao atual invalida.'),
  body('tipoEstudo').optional({ checkFalsy: true }).isIn(['UNICO', 'PONTO', 'CLASSE']).withMessage('Tipo de estudo invalido.'),
  body('sexo').optional({ checkFalsy: true }).isString(),
  body('classificacaoInteressado').optional({ checkFalsy: true }).isIn(['A', 'B', 'C']).withMessage('Classificacao invalida.'),
  body('motivoImpedimento').optional({ checkFalsy: true }).isString(),
  body('motivoImpedimento').optional({ checkFalsy: true }).isString(),
  body('vaIgreja').optional({ checkFalsy: true }).isBoolean(),
  body('leBiblia').optional({ checkFalsy: true }).isBoolean(),
  body('estudaLicao').optional({ checkFalsy: true }).isBoolean(),
  body('devolveDizimos').optional({ checkFalsy: true }).isBoolean(),
  body('cultoFamiliar').optional({ checkFalsy: true }).isBoolean(),
  body('observacoes').optional({ checkFalsy: true }).isString(),
  body('participantes').optional().isArray().withMessage('Participantes deve ser um array.'),
  body('participantes').custom((participantes, { req }) => {
    if (!['PONTO', 'CLASSE'].includes(req.body.tipoEstudo)) return true;
    if (!Array.isArray(participantes) || participantes.length === 0) return true;
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
