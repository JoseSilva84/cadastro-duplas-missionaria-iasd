const prisma = require('../lib/prisma');

async function removerDuplasPorIds(tx, ids = []) {
  const duplaIds = [...new Set(ids.map(Number).filter(Boolean))];
  if (duplaIds.length === 0) return;

  const estudos = await tx.estudoBiblico.findMany({
    where: { duplaId: { in: duplaIds } },
    select: { id: true },
  });
  const estudoIds = estudos.map((estudo) => estudo.id);

  if (estudoIds.length > 0) {
    await tx.participante.deleteMany({ where: { estudoBiblicoId: { in: estudoIds } } });
  }

  await tx.escolaSabatinaDupla.deleteMany({ where: { duplaId: { in: duplaIds } } });
  await tx.duplaAcompanhamento.deleteMany({ where: { duplaId: { in: duplaIds } } });
  await tx.ataDupla.deleteMany({ where: { duplaId: { in: duplaIds } } });
  await tx.evangelismo.deleteMany({ where: { duplaId: { in: duplaIds } } });
  await tx.estudoBiblico.deleteMany({ where: { duplaId: { in: duplaIds } } });
  await tx.usuario.updateMany({
    where: { duplaId: { in: duplaIds } },
    data: { duplaId: null },
  });
  await tx.dupla.deleteMany({ where: { id: { in: duplaIds } } });
}

async function removerDuplasPorFiltro(tx, where = {}) {
  const duplas = await tx.dupla.findMany({ where, select: { id: true } });
  await removerDuplasPorIds(tx, duplas.map((dupla) => dupla.id));
}

module.exports = {
  removerDuplasPorIds,
  removerDuplasPorFiltro,
};
