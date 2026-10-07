// Modelo padrao do Calendario Missionario 2027 (extraido da planilha
// "Planejamento Integrado dos Departamentos - 2027").
// As datas sao sugestoes e podem ser ajustadas por cada igreja.

export const ANO_CALENDARIO = 2027;

export const DEPARTAMENTOS = {
  ASA: { label: 'ASA', cor: '#2563eb' },
  MINISTERIO_PESSOAL: { label: 'Ministério Pessoal', cor: '#c026d3' },
  SAUDE: { label: 'Saúde', cor: '#0d9488' },
  MULHERES: { label: 'Ministério da Mulher', cor: '#16a34a' },
  JOVENS: { label: 'Jovens', cor: '#0284c7' },
  DESBRAVADORES: { label: 'Desbravadores', cor: '#ca8a04' },
  OUTRO: { label: 'Outro', cor: '#64748b' },
};

export const STATUS_ACAO = {
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
};

const acao = (nome, departamento) => ({
  nome, departamento, responsavel: '', data: '', planejamento: '', status: 'PLANEJADA', orcamento: [],
});

export const criarModelo2027 = () => [
  {
    nome: 'Semana Santa', tipo: 'SEMANA_SANTA', dataInicio: '2027-03-21', dataFim: '2027-03-27',
    acoes: [
      acao('Ações ASA', 'ASA'),
      acao('Mult. Pesq. Bíblicas', 'MINISTERIO_PESSOAL'),
      acao('Feira de Saúde', 'SAUDE'),
      acao('Time Life', 'MINISTERIO_PESSOAL'),
      acao('Mult. Pesq. Bíblicas (2)', 'MINISTERIO_PESSOAL'),
      acao('Mult. Visitação', 'MINISTERIO_PESSOAL'),
    ],
  },
  {
    nome: 'Evangelismo Feminino', tipo: 'FEMININO', dataInicio: '2027-06-05', dataFim: '2027-06-12',
    acoes: [
      acao('Chá Mulheres', 'MULHERES'),
      acao('Perda de Peso', 'MULHERES'),
      acao('Dia da Beleza', 'MULHERES'),
    ],
  },
  {
    nome: 'Evangelismo Jovem', tipo: 'JOVEM', dataInicio: '2027-08-14', dataFim: '2027-08-21',
    acoes: [
      acao('Pesq. Bíblica Caleb', 'JOVENS'),
      acao('Ecla Critã Féri…', 'JOVENS'),
      acao('Corte de Cabelo', 'JOVENS'),
    ],
  },
  {
    nome: 'Evangelismo Primavera', tipo: 'PRIMAVERA', dataInicio: '2027-10-02', dataFim: '2027-10-09',
    acoes: [acao('Apelo Adolescente', 'ASA')],
  },
  {
    nome: 'Evangelismo Colheita', tipo: 'COLHEITA', dataInicio: '2027-11-20', dataFim: '2027-11-27',
    acoes: [acao('Apelo Campori', 'DESBRAVADORES')],
  },
];
