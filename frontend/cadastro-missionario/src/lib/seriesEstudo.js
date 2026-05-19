export const SERIES_ESTUDO = [
  {
    id: 'ouvindo_voz_de_deus',
    nome: 'Ouvindo a Voz de Deus',
    licoes: Array.from({ length: 28 }, (_, index) => ({
      numero: index + 1,
      titulo: `Lição ${index + 1}`,
    })),
  },
  {
    id: 'apocalipse',
    nome: 'Apocalipse',
    licoes: Array.from({ length: 24 }, (_, index) => ({
      numero: index + 1,
      titulo: `Estudo ${index + 1}`,
    })),
  },
];

export const getSerieNome = (serieId) => (
  SERIES_ESTUDO.find((serie) => serie.id === serieId)?.nome || serieId || '-'
);

export const getLicaoLabel = (serieId, numero) => {
  const serie = SERIES_ESTUDO.find((item) => item.id === serieId);
  const licao = serie?.licoes.find((item) => Number(item.numero) === Number(numero));
  return licao ? `${licao.numero} - ${licao.titulo}` : numero || '-';
};

export const UFS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const DIAS_SEMANA = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado',
];

export const formatarWhatsApp = (valor) => {
  const digitos = String(valor || '').replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
};
