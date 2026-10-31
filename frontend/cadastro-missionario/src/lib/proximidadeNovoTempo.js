const normalizar = (valor) => String(valor || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export function coordenadasValidasNovoTempo(item) {
  const latitude = Number(item?.latitude);
  const longitude = Number(item?.longitude);
  return item?.latitude !== null && item?.latitude !== undefined && item?.latitude !== ''
    && item?.longitude !== null && item?.longitude !== undefined && item?.longitude !== ''
    && Number.isFinite(latitude) && Number.isFinite(longitude)
    && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function distanciaEmMetros(origem, destino) {
  if (!coordenadasValidasNovoTempo(origem) || !coordenadasValidasNovoTempo(destino)) return null;
  const radianos = (graus) => graus * (Math.PI / 180);
  const raioTerra = 6371000;
  const latitude1 = radianos(Number(origem.latitude));
  const latitude2 = radianos(Number(destino.latitude));
  const deltaLatitude = radianos(Number(destino.latitude) - Number(origem.latitude));
  const deltaLongitude = radianos(Number(destino.longitude) - Number(origem.longitude));
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(deltaLongitude / 2) ** 2;
  return raioTerra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatarDistancia(metros) {
  const valor = Number(metros);
  if (!Number.isFinite(valor)) return 'Distância não calculada';
  if (valor < 1000) return `${Math.max(1, Math.round(valor)).toLocaleString('pt-BR')} m`;
  return `${(valor / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km`;
}

export function encontrarIgrejaAfiliada(lead, igrejas = []) {
  if (!lead || !igrejas.length) return null;
  const distrito = normalizar(lead.distrito);
  const nomeInformado = normalizar(lead.igrejaAfiliada || lead.igreja || lead.churchName);
  const mesmoDistrito = distrito ? igrejas.filter((igreja) => normalizar(igreja.distrito) === distrito) : [];
  const candidatas = mesmoDistrito.length ? mesmoDistrito : igrejas;
  const informada = nomeInformado && (
    candidatas.find((igreja) => normalizar(igreja.nome) === nomeInformado)
    || candidatas.find((igreja) => normalizar(igreja.nome).includes(nomeInformado) || nomeInformado.includes(normalizar(igreja.nome)))
  );
  if (informada) return { igreja: informada, metros: distanciaEmMetros(lead, informada), criterio: 'Igreja afiliada informada' };

  const comDistancia = candidatas
    .map((igreja) => ({ igreja, metros: distanciaEmMetros(lead, igreja) }))
    .filter((item) => Number.isFinite(item.metros))
    .sort((a, b) => a.metros - b.metros);
  if (comDistancia.length) return { ...comDistancia[0], criterio: mesmoDistrito.length ? 'Igreja mais próxima no mesmo distrito' : 'Igreja mais próxima' };
  return candidatas[0] ? { igreja: candidatas[0], metros: null, criterio: 'Igreja do distrito' } : null;
}
