// Model de Dupla — Operações no banco de dados
const prisma = require('../lib/prisma');
const { removerDuplasPorIds } = require('./cadastroDelete.model');

const whereEstudoEmAndamento = {
  encerrado: false,
  statusEstudo: 'EM_ANDAMENTO',
};

const contagensDaDupla = {
  estudosBiblicos: { where: whereEstudoEmAndamento },
  acompanhamentos: true,
};

const ordemMedalha = { ouro: 0, prata: 1, bronze: 2, semAtividade: 3 };

const estudoEmAndamento = (estudo) => (
  estudo.encerrado !== true && String(estudo.statusEstudo || '').toUpperCase() !== 'ENCERRADO'
);

const medalhaDaDupla = (dupla) => {
  const estudos = dupla.estudosBiblicos || [];
  if (estudos.some((estudo) => String(estudo.motivoEncerramento || '').toUpperCase() === 'BATISMO')) return 'ouro';
  if (estudos.some(estudoEmAndamento)) return 'prata';
  if ((dupla._count?.acompanhamentos || 0) > 0) return 'bronze';
  return 'semAtividade';
};

const classeDaDupla = (dupla) => {
  if (dupla.levouPessoaBatismo === true) return 'A';
  if ((dupla.estudosBiblicos || []).some(estudoEmAndamento) || dupla.jaDeuEstudoBiblico === true) return 'B';
  return dupla.classificacaoDupla || null;
};

const compararIndice = (a, b) => {
  const porMedalha = ordemMedalha[a.medalha] - ordemMedalha[b.medalha];
  if (porMedalha !== 0) return porMedalha;
  const porLider = (a.liderNome || '').localeCompare(b.liderNome || '', 'pt-BR', { sensitivity: 'base' });
  if (porLider !== 0) return porLider;
  return (a.membro2Nome || '').localeCompare(b.membro2Nome || '', 'pt-BR', { sensitivity: 'base' });
};

const montarResumoDoIndice = (indice) => {
  const resumo = {
    totalDuplas: indice.length,
    estudosEmAndamento: 0,
    classesAtivas: 0,
    batismos: 0,
    medalhas: { ouro: 0, prata: 0, bronze: 0, semAtividade: 0 },
    classes: { A: 0, B: 0, C: 0 },
  };

  indice.forEach((dupla) => {
    resumo.medalhas[dupla.medalha] += 1;
    if (dupla.classe && Object.hasOwn(resumo.classes, dupla.classe)) resumo.classes[dupla.classe] += 1;
    if (dupla.statusEvangelismo === 'ATIVO') resumo.classesAtivas += 1;

    (dupla.estudosBiblicos || []).forEach((estudo) => {
      if (estudoEmAndamento(estudo)) resumo.estudosEmAndamento += 1;
      if (String(estudo.motivoEncerramento || '').toUpperCase() !== 'BATISMO') return;
      const participantes = estudo._count?.participantes || 0;
      resumo.batismos += ['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) && participantes > 0 ? participantes : 1;
    });
  });

  return resumo;
};

const DuplaModel = {
  // Lista duplas com filtro opcional
  async findAll(filtro = {}, opcoes = {}) {
    const consulta = {
      where: filtro,
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        estudosBiblicos: {
          include: { participantes: true },
          orderBy: { atualizadoEm: 'desc' },
        },
        _count: { select: contagensDaDupla },
      },
      orderBy: [
        { liderNome: 'asc' },
        { membro2Nome: 'asc' },
        { criadoEm: 'desc' },
      ],
    };

    if (!opcoes.paginado) return prisma.dupla.findMany(consulta);

    const pagina = Math.max(1, Number(opcoes.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(opcoes.limite) || 100));
    // A classificação precisa acontecer antes do recorte da página. Caso
    // contrário, cada lote teria sua própria ordem e seus próprios totais.
    const indice = (await prisma.dupla.findMany({
      where: filtro,
      select: {
        id: true,
        liderNome: true,
        membro2Nome: true,
        levouPessoaBatismo: true,
        jaDeuEstudoBiblico: true,
        classificacaoDupla: true,
        statusEvangelismo: true,
        estudosBiblicos: {
          select: {
            encerrado: true,
            statusEstudo: true,
            motivoEncerramento: true,
            tipoEstudo: true,
            _count: { select: { participantes: true } },
          },
        },
        _count: { select: { acompanhamentos: true } },
      },
    })).map((dupla) => ({
      ...dupla,
      medalha: medalhaDaDupla(dupla),
      classe: classeDaDupla(dupla),
    })).sort(compararIndice);

    const total = indice.length;
    const idsDaPagina = indice
      .slice((pagina - 1) * limite, pagina * limite)
      .map((dupla) => dupla.id);
    const itensSemOrdem = idsDaPagina.length
      ? await prisma.dupla.findMany({ ...consulta, where: { id: { in: idsDaPagina } } })
      : [];
    const posicao = new Map(idsDaPagina.map((id, index) => [id, index]));
    const itens = itensSemOrdem.sort((a, b) => posicao.get(a.id) - posicao.get(b.id));
    const resumo = montarResumoDoIndice(indice);

    return {
      itens,
      total,
      pagina,
      limite,
      paginas: Math.ceil(total / limite),
      temMais: pagina * limite < total,
      resumo,
    };
  },

  // Busca dupla por ID
  async findById(id) {
    return prisma.dupla.findUnique({
      where: { id: Number(id) },
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        estudosBiblicos: {
          include: { participantes: true },
          orderBy: { atualizadoEm: 'desc' },
        },
        _count: { select: contagensDaDupla },
      },
    });
  },

  // Cria nova dupla
  async create(data) {
    return prisma.dupla.create({
      data,
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        _count: { select: contagensDaDupla },
      },
    });
  },

  // Atualiza dupla por ID
  async update(id, data) {
    return prisma.dupla.update({
      where: { id: Number(id) },
      data,
      include: {
        distrito: { include: { regiao: true } },
        igreja: true,
        _count: { select: contagensDaDupla },
      },
    });
  },

  // Remove dupla por ID
  async remove(id) {
    const duplaId = Number(id);
    return prisma.$transaction(async (tx) => {
      await removerDuplasPorIds(tx, [duplaId]);
      return { id: duplaId };
    });
  },
};

module.exports = DuplaModel;
