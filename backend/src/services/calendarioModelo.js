// Modelo inicial do Calendario Missionario 2027 (planilha "Planejamento Integrado
// dos Departamentos"). A linha do tempo comeca em dezembro do ano anterior.
// Os temas ficam sob controle do admin; as acoes abaixo entram como acoes da Associacao.
const acao = (nome, departamento, data) => ({ nome, departamento, data });

module.exports = [
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
