// Constantes e utilitarios do Calendario Missionario (geral).

export const ANO_CALENDARIO = 2027;
export const DATA_MIN = '2025-01-01';
export const DATA_MAX = '2030-12-31';

export const ANOS_DISPONIVEIS = [
  { id: 'ciclo_2027', ano: 2027, modo: 'ciclo', rotulo: 'Ciclo 2026 / 2027 (Oficial)', descricao: 'Dez/2026 a Dez/2027' },
  { id: 'ano_2027', ano: 2027, modo: 'civil', rotulo: '2027', descricao: 'Jan a Dez/2027' },
  { id: 'ano_2026', ano: 2026, modo: 'civil', rotulo: '2026', descricao: 'Jan a Dez/2026' },
  { id: 'ciclo_2028', ano: 2028, modo: 'ciclo', rotulo: 'Ciclo 2027 / 2028', descricao: 'Dez/2027 a Dez/2028' },
];

export const DEPARTAMENTOS = {
  ASA: { label: 'ASA', cor: '#2563eb' },
  MINISTERIO_PESSOAL: { label: 'Ministério Pessoal', cor: '#a21caf' },
  SAUDE: { label: 'Saúde', cor: '#0f766e' },
  MULHERES: { label: 'Ministério da Mulher', cor: '#15803d' },
  JOVENS: { label: 'Jovens', cor: '#0369a1' },
  DESBRAVADORES: { label: 'Desbravadores', cor: '#b45309' },
  OUTRO: { label: 'Outro', cor: '#475569' },
};

export const STATUS_ACAO = {
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
};

export const PERFIL_LABEL = {
  SUPER_ADMIN: 'Administrador',
  ADMINISTRADOR: 'Administrador',
  PASTOR_REGIONAL: 'Pastor Regional',
  COORDENADOR_REGIONAL: 'Coordenador Regional',
  PASTOR_DISTRITAL: 'Pastor Distrital',
  DIRETOR_MISSIONARIO_IGREJA: 'Diretor Missionário',
  DUPLA_MISSIONARIA: 'Dupla Missionária',
};

export const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const NOMES_MES_COMPLETO = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const corDaAcao = (acao) => (DEPARTAMENTOS[acao.departamento] || DEPARTAMENTOS.OUTRO).cor;

export const moeda = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dia = (v) => (v ? String(v).slice(0, 10) : '');
export const formatarDia = (v) => (v ? dia(v).split('-').reverse().join('/') : 'Sem data');
export const formatarDiaCurto = (v) => (v ? formatarDia(v).slice(0, 5) : '');

export const periodoTema = (t) => {
  if (!t.dataInicio) return 'Sem data';
  if (!t.dataFim || dia(t.dataFim) === dia(t.dataInicio)) return formatarDia(t.dataInicio);
  return `${formatarDiaCurto(t.dataInicio)} a ${formatarDia(t.dataFim)}`;
};

// Chave numerica do mes (ano*12 + mes0) para comparar e posicionar na linha do tempo.
export const chaveMes = (v) => {
  const [a, m] = dia(v).split('-').map(Number);
  return a * 12 + (m - 1);
};

// Gera os meses da linha do tempo.
// No ciclo missionario oficial (modo 'ciclo', padrao), inicia em Dezembro do ano anterior
// (ex: Dezembro de 2026 para o ciclo 2027) e vai ate Dezembro do ano do ciclo (13 meses no total).
export function calcularJanela(anoOuOpcoes = 2027, modoPadrao = 'ciclo') {
  let anoCiclo = 2027;
  let modo = modoPadrao;

  if (typeof anoOuOpcoes === 'number') {
    anoCiclo = anoOuOpcoes;
  } else if (typeof anoOuOpcoes === 'string' && !isNaN(Number(anoOuOpcoes))) {
    anoCiclo = Number(anoOuOpcoes);
  } else if (anoOuOpcoes && typeof anoOuOpcoes === 'object') {
    if (anoOuOpcoes.ano) anoCiclo = Number(anoOuOpcoes.ano);
    if (anoOuOpcoes.modo) modo = anoOuOpcoes.modo;
  }

  if (modo === 'ciclo') {
    const chaveInicio = (anoCiclo - 1) * 12 + 11; // Dezembro do ano anterior (ex: Dez/2026)
    const totalMeses = 13; // Dez (ano anterior) até Dez (ano atual)
    return Array.from({ length: totalMeses }, (_, i) => {
      const k = chaveInicio + i;
      const ano = Math.floor(k / 12);
      const mesIndex = k % 12;
      const viradaAno = i > 0 && ano !== Math.floor((k - 1) / 12);
      return {
        key: k,
        indice: i,
        mesIndex,
        nome: NOMES_MES[mesIndex],
        nomeCompleto: NOMES_MES_COMPLETO[mesIndex],
        ano,
        viradaAno,
        anoAnterior: viradaAno ? Math.floor((k - 1) / 12) : null,
        rotuloCurto: `${NOMES_MES[mesIndex]}/${String(ano).slice(2)}`,
        rotuloCompleto: `${NOMES_MES_COMPLETO[mesIndex]} de ${ano}`,
      };
    });
  }

  // Modo ano civil normal (12 meses: Jan a Dez)
  const chaveInicio = anoCiclo * 12;
  return Array.from({ length: 12 }, (_, i) => {
    const k = chaveInicio + i;
    const ano = Math.floor(k / 12);
    const mesIndex = k % 12;
    return {
      key: k,
      indice: i,
      mesIndex,
      nome: NOMES_MES[mesIndex],
      nomeCompleto: NOMES_MES_COMPLETO[mesIndex],
      ano,
      viradaAno: false,
      anoAnterior: null,
      rotuloCurto: `${NOMES_MES[mesIndex]}/${String(ano).slice(2)}`,
      rotuloCompleto: `${NOMES_MES_COMPLETO[mesIndex]} de ${ano}`,
    };
  });
}

// Quem cadastrou e onde a acao acontece (igreja, distrito, regiao ou Associacao).
export function origemDaAcao(acao) {
  let local = 'Associação';
  if (acao.igrejaNome) local = acao.igrejaNome;
  else if (acao.distritoNome) local = `Distrito ${acao.distritoNome}`;
  else if (acao.regiaoNome) local = `Região ${acao.regiaoNome}`;
  return {
    cargo: PERFIL_LABEL[acao.criadoPorPerfil] || 'Associação',
    local,
    nivel: acao.igrejaId ? 'igreja' : acao.distritoId ? 'distrito' : acao.regiaoId ? 'regiao' : 'associacao',
  };
}

export const NIVEL_ESTILO = {
  associacao: 'bg-[#1A3A6B]/10 text-[#1A3A6B]',
  regiao: 'bg-violet-100 text-violet-700',
  distrito: 'bg-amber-100 text-amber-700',
  igreja: 'bg-emerald-100 text-emerald-700',
};
