// Controller de Acompanhamento do Coordenador Regional
const prisma = require('../lib/prisma');
const { body, validationResult } = require('express-validator');
const { ehAdmin, PERFIS } = require('../middlewares/auth');
const { registrarAtividade } = require('../services/notificacoesAtividade.service');

const validarAcompanhamento = [
  body('dataSaida').notEmpty().withMessage('Data da saída obrigatória.'),
  body('coordenadorId').isInt().withMessage('Coordenador regional obrigatório.'),
  body('duplaIds').isArray({ min: 1 }).withMessage('Selecione ao menos uma dupla.'),
];

const aplicarEscopoLeitura = (usuario, coordenadorId) => {
  if (ehAdmin(usuario.perfil)) {
    return coordenadorId ? { coordenadorId: Number(coordenadorId) } : {};
  }
  if (usuario.perfil === PERFIS.COORDENADOR_REGIONAL) {
    return { coordenadorId: usuario.id };
  }
  if (usuario.perfil === PERFIS.PASTOR_REGIONAL && usuario.regiaoId) {
    return {
      ...(coordenadorId ? { coordenadorId: Number(coordenadorId) } : {}),
      coordenador: { is: { regiaoId: usuario.regiaoId } },
    };
  }
  return { coordenadorId: -1 };
};

const AcompanhamentoController = {
  // POST /api/acompanhamentos — Registra nova saída
  async criar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      const { dataSaida, observacoes, duplaIds } = req.body;
      const idsDuplas = [...new Set(duplaIds.map(Number))];
      if (!idsDuplas.length || idsDuplas.some((id) => !Number.isInteger(id) || id <= 0)) {
        return res.status(400).json({ erro: 'Selecione duplas válidas para o acompanhamento.' });
      }
      const coordenadorId = Number(req.body.coordenadorId);

      if (!ehAdmin(req.usuario.perfil) && coordenadorId !== req.usuario.id) {
        return res.status(403).json({ erro: 'Você só pode registrar acompanhamento para seu próprio usuário.' });
      }

      const coordenador = await prisma.usuario.findFirst({
        where: {
          id: coordenadorId,
          perfil: 'COORDENADOR_REGIONAL',
          ativo: true,
        },
        select: { id: true, regiaoId: true },
      });

      if (!coordenador) {
        return res.status(400).json({ erro: 'Selecione um coordenador regional válido.' });
      }
      const duplas = await prisma.dupla.findMany({
        where: { id: { in: idsDuplas } },
        select: { id: true, igrejaId: true, distritoId: true, distrito: { select: { regiaoId: true } } },
      });
      if (!coordenador.regiaoId || duplas.length !== idsDuplas.length ||
          duplas.some((dupla) => dupla.distrito.regiaoId !== coordenador.regiaoId)) {
        return res.status(400).json({ erro: 'Selecione apenas duplas da região do coordenador.' });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        // Cria o registro de acompanhamento
        const acomp = await tx.acompanhamentoDupla.create({
          data: {
            dataSaida: new Date(dataSaida),
            coordenadorId,
            observacoes: observacoes || null,
            duplas: {
              create: idsDuplas.map((duplaId) => ({ duplaId })),
            },
          },
          include: {
            coordenador: { select: { id: true, nome: true } },
            duplas: { include: { dupla: { select: { id: true, liderNome: true, membro2Nome: true } } } },
          },
        });

        // Atualiza ultimoAcompanhamento de cada dupla visitada
        await tx.dupla.updateMany({
          where: { id: { in: idsDuplas } },
          data: { ultimoAcompanhamento: new Date(dataSaida) },
        });

        return acomp;
      });

      const grupos = new Map();
      for (const dupla of duplas) {
        const chave = dupla.igrejaId ? `igreja:${dupla.igrejaId}` : `distrito:${dupla.distritoId}`;
        const grupo = grupos.get(chave) || { igrejaId: dupla.igrejaId, distritoId: dupla.distritoId, quantidade: 0 };
        grupo.quantidade += 1;
        grupos.set(chave, grupo);
      }
      for (const grupo of grupos.values()) {
        await registrarAtividade({
          ator: req.usuario, igrejaId: grupo.igrejaId, distritoId: grupo.distritoId,
          titulo: 'Acompanhamento missionário registrado',
          mensagem: `Foi registrada uma saída com ${grupo.quantidade} dupla(s) ${grupo.igrejaId ? 'desta igreja' : 'deste distrito'}.`,
          url: '/duplas',
        });
      }
      res.status(201).json(resultado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao registrar acompanhamento.' });
    }
  },

  // GET /api/acompanhamentos/coordenadores — Lista coordenadores regionais ativos
  async listarCoordenadores(req, res) {
    try {
      const where = {
        perfil: 'COORDENADOR_REGIONAL',
        ativo: true,
      };

      if (req.usuario.perfil === PERFIS.COORDENADOR_REGIONAL) {
        where.id = req.usuario.id;
      } else if (req.usuario.perfil === PERFIS.PASTOR_REGIONAL && req.usuario.regiaoId) {
        where.regiaoId = req.usuario.regiaoId;
      } else if (!ehAdmin(req.usuario.perfil)) {
        where.id = -1;
      }

      const coordenadores = await prisma.usuario.findMany({
        where,
        select: {
          id: true,
          nome: true,
          email: true,
          regiao: { select: { id: true, nome: true } },
        },
        orderBy: { nome: 'asc' },
      });

      res.json(coordenadores);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao listar coordenadores regionais.' });
    }
  },

  // GET /api/acompanhamentos — Lista saídas com filtros
  async listar(req, res) {
    try {
      const { coordenadorId, de, ate } = req.query;
      const where = aplicarEscopoLeitura(req.usuario, coordenadorId);

      if (de || ate) {
        where.dataSaida = {};
        if (de) where.dataSaida.gte = new Date(de);
        if (ate) where.dataSaida.lte = new Date(`${ate}T23:59:59.999Z`);
      }

      const registros = await prisma.acompanhamentoDupla.findMany({
        where,
        orderBy: { dataSaida: 'desc' },
        include: {
          coordenador: { select: { id: true, nome: true } },
          duplas: {
            include: {
              dupla: { select: { id: true, liderNome: true, membro2Nome: true, bairro: true } },
            },
          },
        },
      });

      res.json(registros);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao listar acompanhamentos.' });
    }
  },

  // GET /api/acompanhamentos/:id — Detalhe de uma saída
  async buscarPorId(req, res) {
    try {
      const registro = await prisma.acompanhamentoDupla.findFirst({
        where: { id: Number(req.params.id), ...aplicarEscopoLeitura(req.usuario) },
        include: {
          coordenador: { select: { id: true, nome: true } },
          duplas: {
            include: {
              dupla: { select: { id: true, liderNome: true, membro2Nome: true, bairro: true } },
            },
          },
        },
      });
      if (!registro) return res.status(404).json({ erro: 'Registro não encontrado.' });
      res.json(registro);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao buscar acompanhamento.' });
    }
  },

  // GET /api/relatorios/acompanhamento — Relatório agrupado por período
  async relatorio(req, res) {
    try {
      const { coordenadorId, de, ate } = req.query;
      const where = aplicarEscopoLeitura(req.usuario, coordenadorId);

      if (de || ate) {
        where.dataSaida = {};
        if (de) where.dataSaida.gte = new Date(de);
        if (ate) where.dataSaida.lte = new Date(`${ate}T23:59:59.999Z`);
      }

      const registros = await prisma.acompanhamentoDupla.findMany({
        where,
        orderBy: { dataSaida: 'asc' },
        include: {
          coordenador: { select: { id: true, nome: true } },
          duplas: {
            include: {
              dupla: { select: { id: true, liderNome: true, membro2Nome: true, bairro: true } },
            },
          },
        },
      });

      // Agrupa por semana (ISO)
      const agrupado = {};
      registros.forEach((r) => {
        const data = new Date(r.dataSaida);
        // Semana ISO: segunda-feira como início
        const diaSemana = data.getDay(); // 0=dom
        const segundaPrev = new Date(data);
        segundaPrev.setDate(data.getDate() - ((diaSemana + 6) % 7));
        const chave = segundaPrev.toISOString().split('T')[0];
        if (!agrupado[chave]) agrupado[chave] = { semanaInicio: chave, saidas: [], totalDuplas: 0 };
        agrupado[chave].saidas.push(r);
        agrupado[chave].totalDuplas += r.duplas.length;
      });

      res.json({
        totalSaidas: registros.length,
        totalDuplasVisitadas: registros.reduce((acc, r) => acc + r.duplas.length, 0),
        porSemana: Object.values(agrupado),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao gerar relatório de acompanhamento.' });
    }
  },
};

module.exports = { AcompanhamentoController, validarAcompanhamento };
