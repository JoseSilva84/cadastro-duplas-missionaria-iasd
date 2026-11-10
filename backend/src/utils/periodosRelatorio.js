function inicioSemanaDomingoISO(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  const inicio = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  inicio.setUTCDate(inicio.getUTCDate() - inicio.getUTCDay());
  return inicio.toISOString().slice(0, 10);
}

module.exports = { inicioSemanaDomingoISO };

