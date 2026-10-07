const prisma = require('../lib/prisma');

const include = {
  eventos: {
    orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
    include: {
      acoes: {
        orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
        include: { orcamento: { orderBy: { id: 'asc' } } },
      },
    },
  },
};

const CalendarioMissionarioModel = {
  buscar(igrejaId, ano) {
    return prisma.calendarioMissionario.findUnique({
      where: { igrejaId_ano: { igrejaId, ano } },
      include,
    });
  },

  // Substitui toda a arvore (eventos > acoes > orcamento) numa transacao.
  async substituir(igrejaId, ano, eventos) {
    await prisma.$transaction(async (tx) => {
      const calendario = await tx.calendarioMissionario.upsert({
        where: { igrejaId_ano: { igrejaId, ano } },
        update: {},
        create: { igrejaId, ano },
      });
      await tx.calendarioEvento.deleteMany({ where: { calendarioId: calendario.id } });

      for (const [i, evento] of eventos.entries()) {
        await tx.calendarioEvento.create({
          data: {
            calendarioId: calendario.id,
            nome: evento.nome,
            tipo: evento.tipo,
            dataInicio: evento.dataInicio,
            dataFim: evento.dataFim,
            ordem: i,
            acoes: {
              create: evento.acoes.map((acao, j) => ({
                nome: acao.nome,
                departamento: acao.departamento,
                responsavel: acao.responsavel,
                data: acao.data,
                planejamento: acao.planejamento,
                status: acao.status,
                ordem: j,
                orcamento: { create: acao.orcamento },
              })),
            },
          },
        });
      }
      await tx.calendarioMissionario.update({ where: { id: calendario.id }, data: { atualizadoEm: new Date() } });
    }, { timeout: 30000 });
    return this.buscar(igrejaId, ano);
  },
};

module.exports = CalendarioMissionarioModel;
