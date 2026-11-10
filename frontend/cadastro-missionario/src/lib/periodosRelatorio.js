export const dataLocalISO = (data = new Date()) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const dataLocal = (valor) => {
  if (valor instanceof Date) return new Date(valor);
  const correspondencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor || '');
  return correspondencia
    ? new Date(Number(correspondencia[1]), Number(correspondencia[2]) - 1, Number(correspondencia[3]), 12)
    : new Date(valor);
};

// Mantém a numeração ISO exibida pelo sistema, mas considera o domingo como
// primeiro dia: o domingo imediatamente anterior à segunda da semana ISO
// pertence à semana que está começando.
export const semanaISOParaData = (valor = new Date()) => {
  const data = dataLocal(valor);
  if (Number.isNaN(data.getTime())) return '';
  data.setHours(12, 0, 0, 0);
  if (data.getDay() === 0) data.setDate(data.getDate() + 1);
  const quinta = new Date(data);
  quinta.setDate(quinta.getDate() + 3 - ((quinta.getDay() + 6) % 7));
  const primeiraQuinta = new Date(quinta.getFullYear(), 0, 4, 12);
  primeiraQuinta.setDate(primeiraQuinta.getDate() + 3 - ((primeiraQuinta.getDay() + 6) % 7));
  const numero = 1 + Math.round((quinta - primeiraQuinta) / (7 * 86400000));
  return `${quinta.getFullYear()}-W${String(numero).padStart(2, '0')}`;
};

export const semanaISOAtual = () => semanaISOParaData(new Date());

export const intervaloDaSemana = (semana) => {
  const correspondencia = /^(\d{4})-W(\d{2})$/.exec(semana || '');
  if (!correspondencia) return { de: '', ate: '' };
  const ano = Number(correspondencia[1]);
  const numeroSemana = Number(correspondencia[2]);
  const quatroDeJaneiro = new Date(ano, 0, 4, 12);
  const segundaPrimeiraSemana = new Date(quatroDeJaneiro);
  segundaPrimeiraSemana.setDate(quatroDeJaneiro.getDate() - ((quatroDeJaneiro.getDay() + 6) % 7));
  const inicio = new Date(segundaPrimeiraSemana);
  inicio.setDate(segundaPrimeiraSemana.getDate() + (numeroSemana - 1) * 7 - 1);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { de: dataLocalISO(inicio), ate: dataLocalISO(fim) };
};

export const rotuloSemana = (semana) => {
  const correspondencia = /^(\d{4})-W(\d{2})$/.exec(semana || '');
  return correspondencia ? `Semana ${Number(correspondencia[2])}, ${correspondencia[1]}` : 'Escolher semana';
};

