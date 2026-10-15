const prisma = require('../lib/prisma');

const includeDupla = {
  dupla: {
    select: {
            id: true,
            liderNome: true,
            membro2Nome: true,
            bairro: true,
            igreja: { select: { id: true, nome: true } },
            distrito: { select: { id: true, nome: true, regiao: { select: { nome: true } } } },
    },
  },
};

const EstudoBiblicoModel = {
  async findAll(where = {}, opcoes = {}) {
    const consulta = {
      where,
      include: { ...includeDupla, participantes: true },
      orderBy: { criadoEm: 'desc' },
    };

    if (!opcoes.paginado) return prisma.estudoBiblico.findMany(consulta);

    const pagina = Math.max(1, Number(opcoes.pagina) || 1);
    const limite = Math.min(100, Math.max(1, Number(opcoes.limite) || 100));
    const [itens, registrosDoResumo] = await Promise.all([
      prisma.estudoBiblico.findMany({
        ...consulta,
        skip: (pagina - 1) * limite,
        take: limite,
      }),
      pagina === 1
        ? prisma.estudoBiblico.findMany({
          where,
          select: {
            tipoEstudo: true,
            classificacaoInteressado: true,
            participantes: { select: { classificacaoInteressado: true } },
          },
        })
        : Promise.resolve(null),
    ]);

    const total = registrosDoResumo?.length ?? await prisma.estudoBiblico.count({ where });
    const resumoAlunos = registrosDoResumo?.reduce((resumo, estudo) => {
      if (['PONTO', 'CLASSE'].includes(estudo.tipoEstudo)) {
        const participantes = estudo.participantes || [];
        resumo.total += participantes.length;
        if (estudo.tipoEstudo === 'PONTO') resumo.pontos += participantes.length;
        if (estudo.tipoEstudo === 'CLASSE') resumo.classes += participantes.length;
        resumo.classeA += participantes.filter((participante) => participante.classificacaoInteressado === 'A').length;
        return resumo;
      }

      resumo.total += 1;
      resumo.individuais += 1;
      if (estudo.classificacaoInteressado === 'A') resumo.classeA += 1;
      return resumo;
    }, { total: 0, individuais: 0, pontos: 0, classes: 0, classeA: 0 }) || null;

    return {
      itens,
      total,
      pagina,
      limite,
      paginas: Math.ceil(total / limite),
      temMais: pagina * limite < total,
      resumoAlunos,
    };
  },

  findById(id) {
    return prisma.estudoBiblico.findUnique({
      where: { id: Number(id) },
      include: { ...includeDupla, participantes: true },
    });
  },

  create(data) {
    return prisma.estudoBiblico.create({
      data,
      include: { ...includeDupla, participantes: true },
    });
  },

  update(id, data) {
    return prisma.estudoBiblico.update({
      where: { id: Number(id) },
      data,
      include: { ...includeDupla, participantes: true },
    });
  },

  remove(id) {
    return prisma.estudoBiblico.delete({ where: { id: Number(id) } });
  },
};

module.exports = EstudoBiblicoModel;
