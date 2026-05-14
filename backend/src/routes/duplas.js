// Rotas de Duplas Missionárias
const express = require('express');
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { autenticar, autorizar } = require('../middlewares/auth');

const router = express.Router();

// Validações do cadastro de dupla
const validarDupla = [
  body('bairro').notEmpty().withMessage('Bairro obrigatório.'),
  body('tipoProjeto').notEmpty().withMessage('Tipo de projeto obrigatório.'),
  body('liderNome').notEmpty().withMessage('Nome do líder obrigatório.'),
  body('membro2Nome').notEmpty().withMessage('Nome do segundo membro obrigatório.'),
  body('membro2Tipo').notEmpty().withMessage('Tipo do segundo membro obrigatório.'),
  body('distritoId').isInt().withMessage('Distrito obrigatório.'),
];

// GET /api/duplas — Lista duplas (com filtros)
router.get('/', autenticar, async (req, res) => {
  const { distritoId, status, comAmigos, regiaoNome } = req.query;
  const { perfil, regiaoId: userRegiaoId, distritoId: userDistritoId } = req.usuario;

  let filtro = {};

  // Restrições por perfil
  if (perfil === 'PASTOR_DISTRITAL') {
    filtro.distritoId = userDistritoId;
  } else if (perfil === 'COORDENADOR_REGIONAL') {
    filtro.distrito = { regiaoId: userRegiaoId };
  }

  // Filtros opcionais da query
  if (distritoId) filtro.distritoId = Number(distritoId);
  if (status) filtro.status = status;
  if (comAmigos !== undefined) filtro.comAmigos = comAmigos === 'true';
  if (regiaoNome) filtro.regiaoNome = { contains: regiaoNome, mode: 'insensitive' };

  try {
    const duplas = await prisma.dupla.findMany({
      where: filtro,
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
      },
      orderBy: { criadoEm: 'desc' },
    });
    res.json(duplas);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao listar duplas.' });
  }
});

// GET /api/duplas/:id — Detalhes de uma dupla
router.get('/:id', autenticar, async (req, res) => {
  try {
    const dupla = await prisma.dupla.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
      },
    });
    if (!dupla) return res.status(404).json({ erro: 'Dupla não encontrada.' });
    res.json(dupla);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar dupla.' });
  }
});

// POST /api/duplas — Cadastra nova dupla
router.post('/', autenticar, validarDupla, async (req, res) => {
  const erros = validationResult(req);
  if (!erros.isEmpty()) {
    return res.status(400).json({ erros: erros.array() });
  }

  const {
    regiaoNome, distritoId, igrejaId, bairro,
    tipoProjeto,
    liderNome, liderTelefone, liderEmail, liderIgreja,
    membro2Tipo, membro2Nome, membro2Telefone,
    status, comAmigos, pessoasAlcancadas, observacoes, dataInicio,
  } = req.body;

  try {
    const dupla = await prisma.dupla.create({
      data: {
        regiaoNome: regiaoNome || '',
        distritoId: Number(distritoId),
        igrejaId: igrejaId ? Number(igrejaId) : null,
        bairro,
        tipoProjeto,
        liderNome,
        liderTelefone,
        liderEmail,
        liderIgreja,
        membro2Tipo,
        membro2Nome,
        membro2Telefone,
        status: status || 'ATIVA',
        comAmigos: comAmigos === true || comAmigos === 'true',
        pessoasAlcancadas: Number(pessoasAlcancadas) || 0,
        observacoes,
        dataInicio: dataInicio ? new Date(dataInicio) : new Date(),
      },
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
      },
    });
    res.status(201).json(dupla);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao cadastrar dupla.' });
  }
});

// PUT /api/duplas/:id — Atualiza dupla
router.put('/:id', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  const { perfil, distritoId: userDistritoId } = req.usuario;

  try {
    const dupla = await prisma.dupla.findUnique({ where: { id } });
    if (!dupla) return res.status(404).json({ erro: 'Dupla não encontrada.' });

    // Pastores só editam duplas do próprio distrito
    if (perfil === 'PASTOR_DISTRITAL' && dupla.distritoId !== userDistritoId) {
      return res.status(403).json({ erro: 'Sem permissão para editar esta dupla.' });
    }

    const atualizada = await prisma.dupla.update({
      where: { id },
      data: { ...req.body },
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
      },
    });
    res.json(atualizada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Erro ao atualizar dupla.' });
  }
});

// DELETE /api/duplas/:id — Remove dupla (admin/coordenador)
router.delete('/:id', autenticar, autorizar('ADMINISTRADOR', 'COORDENADOR_REGIONAL'), async (req, res) => {
  try {
    await prisma.dupla.delete({ where: { id: Number(req.params.id) } });
    res.json({ mensagem: 'Dupla removida com sucesso.' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover dupla.' });
  }
});

module.exports = router;
