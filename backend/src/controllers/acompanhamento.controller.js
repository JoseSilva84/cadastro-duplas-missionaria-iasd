// Controller de Acompanhamento do Coordenador Regional
const prisma = require('../lib/prisma');
const { body, validationResult } = require('express-validator');
const { ehAdmin, PERFIS } = require('../middlewares/auth');
const { registrarAtividade } = require('../services/notificacoesAtividade.service');
const { inicioSemanaDomingoISO } = require('../utils/periodosRelatorio');

const META_PREFIX = '[[META_ASSISTENCIA:';
const META_SUFFIX = ']]';

const codificarObservacoesAssistencia = ({
  observacoes,
  tipoAssistencia,
  distritoId,
  distritoNome,
  igrejaId,
  igrejaNome,
}) => {
  const textoLimpo = String(observacoes || '').trim();
  const meta = {};

  if (tipoAssistencia && String(tipoAssistencia).trim()) {
    meta.tipoAssistencia = String(tipoAssistencia).trim();
  }
  if (distritoId) {
    meta.distritoId = Number(distritoId) || String(distritoId);
  }
  if (distritoNome && String(distritoNome).trim()) {
    meta.distritoNome = String(distritoNome).trim();
  }
  if (igrejaId) {
    meta.igrejaId = Number(igrejaId) || String(igrejaId);
  }
  if (igrejaNome && String(igrejaNome).trim()) {
    meta.igrejaNome = String(igrejaNome).trim();
  }

  const temMeta = Object.keys(meta).length > 0;
  if (!temMeta) {
    return textoLimpo || null;
  }

  const cabecalho = `${META_PREFIX}${JSON.stringify(meta)}${META_SUFFIX}`;
  return textoLimpo ? `${cabecalho}\n${textoLimpo}` : cabecalho;
};

const decodificarObservacoesAssistencia = (observacoesBrutas, duplas = []) => {
  const bruto = String(observacoesBrutas || '');
  let meta = {};
  let texto = bruto;

  if (bruto.startsWith(META_PREFIX)) {
    const fimIdx = bruto.indexOf(META_SUFFIX);
    if (fimIdx !== -1) {
      const jsonStr = bruto.slice(META_PREFIX.length, fimIdx);
      try {
        meta = JSON.parse(jsonStr) || {};
      } catch {
        meta = {};
      }
      texto = bruto.slice(fimIdx + META_SUFFIX.length).replace(/^\r?\n/, '');
    }
  }

  const primeiraDupla = Array.isArray(duplas)
    ? (duplas[0]?.dupla || duplas[0] || null)
    : null;

  const distritoInferidoId = primeiraDupla?.distrito?.id || primeiraDupla?.distritoId || null;
  const distritoInferidoNome = primeiraDupla?.distrito?.nome || '';
  const igrejaInferidaId = primeiraDupla?.igreja?.id || primeiraDupla?.igrejaId || null;
  const igrejaInferidaNome = primeiraDupla?.igreja?.nome || '';

  return {
    observacoes: texto.trim() ? texto : null,
    tipoAssistencia: meta.tipoAssistencia || null,
    distritoId: meta.distritoId || distritoInferidoId || null,
    distritoNome: meta.distritoNome || distritoInferidoNome || null,
    igrejaId: meta.igrejaId || igrejaInferidaId || null,
    igrejaNome: meta.igrejaNome || igrejaInferidaNome || null,
  };
};

const enriquecerRegistroAcompanhamento = (registro) => {
  if (!registro) return registro;
  const decodificado = decodificarObservacoesAssistencia(registro.observacoes, registro.duplas);
  return {
    ...registro,
    observacoes: decodificado.observacoes,
    tipoAssistencia: decodificado.tipoAssistencia,
    distritoId: decodificado.distritoId,
    distritoNome: decodificado.distritoNome,
    igrejaId: decodificado.igrejaId,
    igrejaNome: decodificado.igrejaNome,
  };
};

const INCLUDE_PADRAO_ACOMPANHAMENTO = {
  coordenador: {
    select: {
      id: true,
      nome: true,
      email: true,
      fotoPerfil: true,
      regiao: { select: { id: true, nome: true } },
    },
  },
  duplas: {
    include: {
      dupla: {
        select: {
          id: true,
          liderNome: true,
          membro2Nome: true,
          bairro: true,
          fotoLider: true,
          fotoMembro2: true,
          igrejaId: true,
          distritoId: true,
          igreja: { select: { id: true, nome: true } },
          distrito: { select: { id: true, nome: true } },
        },
      },
    },
  },
};

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
      const {
        dataSaida,
        observacoes,
        duplaIds,
        tipoAssistencia,
        distritoId,
        distritoNome,
        igrejaId,
        igrejaNome,
      } = req.body;
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

      const observacoesCodificadas = codificarObservacoesAssistencia({
        observacoes,
        tipoAssistencia,
        distritoId,
        distritoNome,
        igrejaId,
        igrejaNome,
      });

      const resultado = await prisma.$transaction(async (tx) => {
        // Cria o registro de acompanhamento
        const acomp = await tx.acompanhamentoDupla.create({
          data: {
            dataSaida: new Date(dataSaida),
            coordenadorId,
            observacoes: observacoesCodificadas,
            duplas: {
              create: idsDuplas.map((duplaId) => ({ duplaId })),
            },
          },
          include: INCLUDE_PADRAO_ACOMPANHAMENTO,
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
      res.status(201).json(enriquecerRegistroAcompanhamento(resultado));
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao registrar acompanhamento.' });
    }
  },

  // PUT /api/acompanhamentos/:id — Atualiza uma assistência existente
  async atualizar(req, res) {
    const erros = validationResult(req);
    if (!erros.isEmpty()) return res.status(400).json({ erros: erros.array() });

    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ erro: 'ID de assistência inválido.' });
      }

      const existente = await prisma.acompanhamentoDupla.findUnique({
        where: { id },
        select: { id: true, coordenadorId: true },
      });
      if (!existente) {
        return res.status(404).json({ erro: 'Registro de assistência não encontrado.' });
      }

      if (!ehAdmin(req.usuario.perfil) && existente.coordenadorId !== req.usuario.id) {
        return res.status(403).json({ erro: 'Você só pode editar assistências do seu próprio usuário.' });
      }

      const {
        dataSaida,
        observacoes,
        duplaIds,
        tipoAssistencia,
        distritoId,
        distritoNome,
        igrejaId,
        igrejaNome,
      } = req.body;
      const idsDuplas = [...new Set(duplaIds.map(Number))];
      if (!idsDuplas.length || idsDuplas.some((duplaId) => !Number.isInteger(duplaId) || duplaId <= 0)) {
        return res.status(400).json({ erro: 'Selecione duplas válidas para o acompanhamento.' });
      }
      const coordenadorId = Number(req.body.coordenadorId);

      if (!ehAdmin(req.usuario.perfil) && coordenadorId !== req.usuario.id) {
        return res.status(403).json({ erro: 'Você só pode vincular acompanhamento ao seu próprio usuário.' });
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

      const observacoesCodificadas = codificarObservacoesAssistencia({
        observacoes,
        tipoAssistencia,
        distritoId,
        distritoNome,
        igrejaId,
        igrejaNome,
      });

      const atualizado = await prisma.$transaction(async (tx) => {
        await tx.duplaAcompanhamento.deleteMany({
          where: { acompanhamentoId: id },
        });

        const acomp = await tx.acompanhamentoDupla.update({
          where: { id },
          data: {
            dataSaida: new Date(dataSaida),
            coordenadorId,
            observacoes: observacoesCodificadas,
            duplas: {
              create: idsDuplas.map((duplaId) => ({ duplaId })),
            },
          },
          include: INCLUDE_PADRAO_ACOMPANHAMENTO,
        });

        await tx.dupla.updateMany({
          where: { id: { in: idsDuplas } },
          data: { ultimoAcompanhamento: new Date(dataSaida) },
        });

        return acomp;
      });

      res.json(enriquecerRegistroAcompanhamento(atualizado));
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao atualizar assistência.' });
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
          fotoPerfil: true,
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

  // PATCH /api/acompanhamentos/coordenadores/:id — Atualiza foto e/ou nome do coordenador regional
  async atualizarCoordenador(req, res) {
    try {
      const coordenadorId = Number(req.params.id);
      if (!Number.isInteger(coordenadorId) || coordenadorId <= 0) {
        return res.status(400).json({ erro: 'Coordenador inválido.' });
      }

      if (!ehAdmin(req.usuario.perfil) && req.usuario.id !== coordenadorId) {
        return res.status(403).json({ erro: 'Sem permissão para alterar dados deste coordenador.' });
      }

      const existente = await prisma.usuario.findFirst({
        where: {
          id: coordenadorId,
          perfil: 'COORDENADOR_REGIONAL',
          ativo: true,
        },
        select: { id: true },
      });

      if (!existente) {
        return res.status(404).json({ erro: 'Coordenador regional não encontrado.' });
      }

      const dataUpdate = {};
      if (req.body.fotoPerfil !== undefined) {
        dataUpdate.fotoPerfil = req.body.fotoPerfil || null;
      }
      if (typeof req.body.nome === 'string' && req.body.nome.trim()) {
        dataUpdate.nome = req.body.nome.trim();
      }

      const atualizado = await prisma.usuario.update({
        where: { id: coordenadorId },
        data: dataUpdate,
        select: {
          id: true,
          nome: true,
          email: true,
          fotoPerfil: true,
          regiao: { select: { id: true, nome: true } },
        },
      });

      res.json(atualizado);
    } catch (err) {
      console.error(err);
      res.status(500).json({ erro: 'Erro ao atualizar dados do coordenador regional.' });
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
        orderBy: [{ dataSaida: 'desc' }, { id: 'desc' }],
        include: INCLUDE_PADRAO_ACOMPANHAMENTO,
      });

      res.json(registros.map(enriquecerRegistroAcompanhamento));
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
        include: INCLUDE_PADRAO_ACOMPANHAMENTO,
      });
      if (!registro) return res.status(404).json({ erro: 'Registro não encontrado.' });
      res.json(enriquecerRegistroAcompanhamento(registro));
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

      const registrosBrutos = await prisma.acompanhamentoDupla.findMany({
        where,
        orderBy: { dataSaida: 'asc' },
        include: INCLUDE_PADRAO_ACOMPANHAMENTO,
      });

      const registros = registrosBrutos.map(enriquecerRegistroAcompanhamento);

      // Agrupa de domingo a sábado, conforme o período exibido no relatório.
      const agrupado = {};
      registros.forEach((r) => {
        const chave = inicioSemanaDomingoISO(r.dataSaida);
        if (!chave) return;
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

module.exports = {
  AcompanhamentoController,
  validarAcompanhamento,
  decodificarObservacoesAssistencia,
  enriquecerRegistroAcompanhamento,
};
