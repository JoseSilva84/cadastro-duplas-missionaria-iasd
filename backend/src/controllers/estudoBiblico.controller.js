const { body, validationResult } = require('express-validator');
const EstudoBiblicoService = require('../services/estudoBiblico.service');

const validarEstudoBiblico = [
  body('nomeEstudante').notEmpty().withMessage('Nome do estudante obrigatório.'),
  body('endereco').notEmpty().withMessage('Endereço obrigatório.'),
  body('cidade').notEmpty().withMessage('Cidade obrigatória.'),
  body('estado').isLength({ min: 2, max: 2 }).withMessage('Estado obrigatório.'),
  body('whatsapp').notEmpty().withMessage('WhatsApp obrigatório.'),
  body('diaEstudo').notEmpty().withMessage('Dia do estudo obrigatório.'),
  body('duplaId').isInt().withMessage('Dupla obrigatória.'),
  body('serie').notEmpty().withMessage('Série obrigatória.'),
  body('licaoAtual').isInt({ min: 1 }).withMessage('Lição atual obrigatória.'),
  // Fase 2 — novos campos opcionais
  body('tipoEstudo').optional().isIn(['UNICO', 'PONTO', 'CLASSE']).withMessage('Tipo de estudo inválido.'),
  body('sexo').optional().isString(),
  body('classificacaoInteressado').optional().isIn(['A', 'B', 'C']).withMessage('Classificação inválida.'),
  body('motivoImpedimento').optional().isString(),
  body('vaIgreja').optional().isBoolean(),
  body('leBiblia').optional().isBoolean(),
  body('estudaLicao').optional().isBoolean(),
  body('devolveDizimos').optional().isBoolean(),
  body('cultoFamiliar').optional().isBoolean(),
  body('participantes').optional().isArray().withMessage('Participantes deve ser um array.'),
  body('participantes').custom((participantes, { req }) => {
    if (req.body.tipoEstudo !== 'CLASSE') return true;
    if (!Array.isArray(participantes) || participantes.length === 0) {
      throw new Error('Classe Bíblica precisa ter pelo menos um participante.');
    }
    if (participantes.length > 10) {
      throw new Error('Classe Bíblica permite no máximo 10 participantes.');
    }
    participantes.forEach((participante, index) => {
      if (!participante.nome) {
        throw new Error(`Nome do participante ${index + 1} obrigatório.`);
      }
      if (!['A', 'B', 'C'].includes(participante.classificacaoInteressado)) {
        throw new Error(`Classificação do participante ${index + 1} inválida.`);
      }
      if (['B', 'C'].includes(participante.classificacaoInteressado) && !participante.motivoImpedimento) {
        throw new Error(`Motivo da classificação do participante ${index + 1} obrigatório.`);
      }
    });
    return true;
  }),
];

const EstudoBiblicoController = {
  async listar(req, res) {
    try {
      res.json(await EstudoBiblicoService.listar(req.query));
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao listar estudos bíblicos.' });
    }
  },

  async buscarPorId(req, res) {
    try {
      res.json(await EstudoBiblicoService.buscarPorId(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao buscar estudo bíblico.' });
    }
  },

  async criar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      res.status(201).json(await EstudoBiblicoService.criar(req.body));
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao cadastrar estudo bíblico.' });
    }
  },

  async atualizar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      res.json(await EstudoBiblicoService.atualizar(req.params.id, req.body));
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao atualizar estudo bíblico.' });
    }
  },

  async remover(req, res) {
    try {
      await EstudoBiblicoService.remover(req.params.id);
      res.json({ mensagem: 'Estudo bíblico removido com sucesso.' });
    } catch (err) {
      res.status(err.status || 500).json({ erro: err.mensagem || 'Erro ao remover estudo bíblico.' });
    }
  },
};

module.exports = { EstudoBiblicoController, validarEstudoBiblico };
