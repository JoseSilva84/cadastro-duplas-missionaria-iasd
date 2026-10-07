// Constantes e utilitarios do Calendario Missionario (geral).

export const ANO_CALENDARIO = 2027;
export const DATA_MIN = '2026-12-01';
export const DATA_MAX = '2027-12-31';

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
};

export const NOMES_MES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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

// A linha do tempo sempre comeca no proximo mes com atividade a partir do mes seguinte ao atual.
export function calcularJanela(temas, hoje = new Date()) {
  const proxima = hoje.getFullYear() * 12 + hoje.getMonth() + 1;
  let inicio = null;
  const considerar = (data) => {
    if (!data) return;
    const k = chaveMes(data);
    if (k >= proxima && (inicio === null || k < inicio)) inicio = k;
  };
  temas.forEach((t) => {
    considerar(t.dataInicio);
    t.acoes.forEach((a) => considerar(a.data));
  });
  const base = inicio ?? proxima;
  return Array.from({ length: 12 }, (_, i) => {
    const k = base + i;
    return { key: k, nome: NOMES_MES[k % 12], ano: Math.floor(k / 12) };
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
