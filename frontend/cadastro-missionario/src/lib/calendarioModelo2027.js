// Modelo padrao do Calendario Missionario 2027, lido da planilha
// "Planejamento Integrado dos Departamentos - 2027".
// A linha do tempo da planilha tem 12 blocos de 4 colunas, comecando em
// dezembro do ano anterior (Dez/26 ... Nov/27). As datas abaixo seguem a
// coluna de cada item na planilha e podem ser ajustadas pela igreja.

export const ANO_CALENDARIO = 2027;
export const INICIO_LINHA_TEMPO = { ano: 2026, mes: 12 }; // Dez/2026
export const DATA_MIN = '2026-12-01';
export const DATA_MAX = '2027-11-30';

export const DEPARTAMENTOS = {
  ASA: { label: 'ASA', cor: '#2563eb' },
  MINISTERIO_PESSOAL: { label: 'Ministério Pessoal', cor: '#c026d3' },
  SAUDE: { label: 'Saúde', cor: '#0d9488' },
  MULHERES: { label: 'Ministério da Mulher', cor: '#16a34a' },
  JOVENS: { label: 'Jovens', cor: '#0284c7' },
  DESBRAVADORES: { label: 'Desbravadores', cor: '#ca8a04' },
  OUTRO: { label: 'Outro', cor: '#64748b' },
};

const acao = (nome, departamento, data) => ({
  nome, departamento, responsavel: '', data, planejamento: '', status: 'PLANEJADA', orcamento: [],
});

export const criarModelo2027 = () => [
  {
    nome: 'Semana Santa', tipo: 'SEMANA_SANTA', dataInicio: '2027-03-21', dataFim: '2027-03-27',
    acoes: [
      acao('Ações ASA', 'ASA', '2026-12-05'),
      acao('Mult. Pesq. Bíblicas', 'MINISTERIO_PESSOAL', '2027-01-16'),
      acao('Feira de Saúde', 'SAUDE', '2027-01-30'),
      acao('Time Life', 'MINISTERIO_PESSOAL', '2027-02-13'),
      acao('Mult. Pesq. Bíblicas II', 'MINISTERIO_PESSOAL', '2027-02-27'),
      acao('Mult. Visitação', 'MINISTERIO_PESSOAL', '2027-03-06'),
    ],
  },
  {
    nome: 'Evangelismo Feminino', tipo: 'FEMININO', dataInicio: '2027-06-05', dataFim: '2027-06-12',
    acoes: [
      acao('Chá Mulheres', 'MULHERES', '2027-04-10'),
      acao('Perda de Peso', 'MULHERES', '2027-05-01'),
      acao('Dia da Beleza', 'MULHERES', '2027-05-15'),
    ],
  },
  {
    nome: 'Evangelismo Jovem', tipo: 'JOVEM', dataInicio: '2027-07-24', dataFim: '2027-07-31',
    acoes: [
      acao('Pesq. Bíblica Caleb', 'JOVENS', '2027-07-03'),
      acao('Ecla Critã Féri…', 'JOVENS', '2027-07-10'),
      acao('Corte de Cabelo', 'JOVENS', '2027-07-17'),
    ],
  },
  {
    nome: 'Evangelismo Primavera', tipo: 'PRIMAVERA', dataInicio: '2027-09-18', dataFim: '2027-09-25',
    acoes: [acao('Apelo Adolescente', 'ASA', '2027-08-21')],
  },
  {
    nome: 'Evangelismo Colheita', tipo: 'COLHEITA', dataInicio: '2027-11-20', dataFim: '2027-11-27',
    acoes: [acao('Apelo Campori', 'DESBRAVADORES', '2027-11-06')],
  },
];
