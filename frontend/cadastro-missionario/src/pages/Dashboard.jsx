import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');
const percentual = (valor, total) => (total > 0 ? Math.round((Number(valor || 0) / total) * 100) : 0);

const getEstudosCount = (dupla) => dupla?._count?.estudosBiblicos ?? dupla?.estudosBiblicos?.length ?? 0;
const getVisitacoesCount = (dupla) => dupla?._count?.acompanhamentos ?? dupla?.acompanhamentos?.length ?? 0;
const motivoBatismo = (valor) => String(valor || '').toUpperCase() === 'BATISMO';
const totalBatismosEncerrados = (estudos = []) => estudos
  .filter((estudo) => motivoBatismo(estudo.motivoEncerramento))
  .reduce((acc, estudo) => {
    if (['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) && Array.isArray(estudo.participantes) && estudo.participantes.length > 0) {
      return acc + estudo.participantes.length;
    }
    return acc + 1;
  }, 0);
const normalizarStatus = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase();
const temEstudoBiblicoAtivo = (dupla) => normalizarStatus(dupla?.statusEstudoBiblico) === 'ATIVO';
const estudoEncerrado = (estudo) => (
  estudo?.encerrado === true || normalizarStatus(estudo?.statusEstudo) === 'ENCERRADO'
);
const temEstudoEmAndamento = (dupla) => (
  (dupla?.estudosBiblicos || []).some((estudo) => !estudoEncerrado(estudo))
  || (temEstudoBiblicoAtivo(dupla) && getEstudosCount(dupla) > 0)
);

function getMedalha(dupla) {
  const temBatismo = totalBatismosEncerrados(dupla.estudosBiblicos) > 0;
  const temVisitacao = getVisitacoesCount(dupla) >= 1;
  if (temBatismo) return 'ouro';
  if (temEstudoEmAndamento(dupla)) return 'prata';
  if (temVisitacao) return 'bronze';
  return 'semAtividade';
}

const estudoDuplaId = (estudo) => String(estudo?.dupla?.id || estudo?.duplaId || '');
const juntarEstudosEncerradosNasDuplas = (duplas = [], estudosEncerrados = []) => {
  const porDupla = estudosEncerrados.reduce((mapa, estudo) => {
    const duplaId = estudoDuplaId(estudo);
    if (!duplaId) return mapa;
    if (!mapa.has(duplaId)) mapa.set(duplaId, []);
    mapa.get(duplaId).push(estudo);
    return mapa;
  }, new Map());

  return duplas.map((dupla) => {
    const encerradosDaDupla = porDupla.get(String(dupla.id)) || [];
    if (encerradosDaDupla.length === 0) return dupla;
    const estudosAtuais = dupla.estudosBiblicos || [];
    const idsAtuais = new Set(estudosAtuais.map((estudo) => String(estudo.id)));
    return {
      ...dupla,
      estudosBiblicos: [
        ...estudosAtuais,
        ...encerradosDaDupla.filter((estudo) => !idsAtuais.has(String(estudo.id))),
      ],
    };
  });
};

const DashboardIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13h6V4H4v9zm10 7h6V4h-6v16zM4 20h6v-3H4v3z" />
  </svg>
);

const UsersIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20a4 4 0 00-8 0M12 12a4 4 0 100-8 4 4 0 000 8zm7 8a3 3 0 00-4.5-2.6M5 20a3 3 0 014.5-2.6M18 11a3 3 0 100-6M6 11a3 3 0 110-6" />
  </svg>
);

const BookIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v14M3 5.5A2.5 2.5 0 015.5 3H12v18H5.5A2.5 2.5 0 013 18.5v-13zM12 3h6.5A2.5 2.5 0 0121 5.5v13a2.5 2.5 0 01-2.5 2.5H12V3z" />
  </svg>
);

const VisitIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7-7.5 10.5-7.5 10.5S4.5 17.5 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const WaterIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3.5S5.5 10.4 5.5 15a6.5 6.5 0 0013 0C18.5 10.4 12 3.5 12 3.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 16.5A3.2 3.2 0 0012 19" />
  </svg>
);

const MedalIcon = ({ className = 'w-5 h-5' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4h8l-1.5 5h-5L8 4zM12 9v3m0 8a4 4 0 100-8 4 4 0 000 8z" />
  </svg>
);

function MetricCard({ label, value, detail, color, icon, onClick }) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold leading-none" style={{ color }}>{numero(value)}</p>
        </div>
        <div className="h-12 w-12 flex-shrink-0 rounded-xl text-white shadow-lg flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
          {icon}
        </div>
      </div>
      {detail && <p className="mt-4 text-sm font-medium text-gray-500 leading-snug">{detail}</p>}
    </>
  );

  const classes = 'smart-tooltip group rounded-xl border border-white bg-white p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9963A]/40 hover:shadow-xl hover:shadow-[#1A3A6B]/10 focus:outline-none focus:ring-2 focus:ring-[#C9963A]/30';

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${classes} w-full`} data-tooltip={`${label}: abrir lista relacionada.`}>
        {content}
      </button>
    );
  }

  return (
    <div className={classes} tabIndex={0} data-tooltip={`${label}: resumo consolidado do painel.`}>
      {content}
    </div>
  );
}

function Section({ eyebrow, title, action, children }) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">{eyebrow}</p>
          <h2 className="text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ProgressCard({ label, value, total, color, detail, onClick }) {
  const pct = percentual(value, total);
  return (
    <button
      type="button"
      onClick={onClick}
      className="smart-tooltip w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9963A]/40 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/15"
      data-tooltip={`${label}: ${numero(value)} de ${numero(total)} duplas, ${pct}% do total.`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#1A3A6B]">{label}</p>
          <p className="mt-1 text-xs text-gray-400">{detail}</p>
        </div>
        <p className="text-2xl font-bold" style={{ color }}>{pct}%</p>
      </div>
      <div className="mt-4 h-2 rounded-full bg-gray-100">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-500">{numero(value)} dupla{Number(value || 0) === 1 ? '' : 's'}</p>
    </button>
  );
}

function MedalhaCard({ label, value, total, color, bg, onClick }) {
  const pct = percentual(value, total);
  return (
    <button
      type="button"
      onClick={onClick}
      className="smart-tooltip relative overflow-hidden rounded-xl border p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[#C9963A]/25"
      style={{ background: `linear-gradient(145deg, ${bg}, #ffffff 78%)`, borderColor: `${color}40` }}
      data-tooltip={`${label}: ${numero(value)} dupla(s), ${pct}% do total.`}
    >
      <span className="pointer-events-none absolute right-3 top-3 h-14 w-14 rounded-full opacity-10" style={{ backgroundColor: color }} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
        <span className="rounded-full border bg-white/80 px-2.5 py-1 text-xs font-bold shadow-sm" style={{ color, borderColor: `${color}22` }}>{pct}%</span>
      </div>
      <p className="mt-3 text-3xl font-bold leading-none" style={{ color }}>{numero(value)}</p>
      <div className="mt-4 h-2 rounded-full bg-white/75 shadow-inner">
        <div className="h-full rounded-full shadow-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </button>
  );
}

function RankingList({ title, items = [], valueKey, valueLabel, color, onItemClick }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{title}</h3>
      <div className="mt-4 space-y-2">
        {items.length > 0 ? items.slice(0, 5).map((item, index) => (
          <button
            key={`${title}-${item.id || item.nome}-${index}`}
            type="button"
            onClick={() => onItemClick?.(item)}
            className="smart-tooltip flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-[#F8FAFC] px-3 py-3 text-left transition-all duration-200 hover:border-[#C9963A]/45 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/15"
            data-tooltip={`${item.nome}: ${numero(item[valueKey])} ${valueLabel}.`}
          >
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-400">{index + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-[#1A3A6B]">{item.nome}</span>
              <span className="block truncate text-xs text-gray-400">{item.distrito || item.regiao || 'Associacao Paulistana'}</span>
            </span>
            <span className="text-right">
              <span className="block text-xl font-bold leading-none" style={{ color }}>{numero(item[valueKey])}</span>
              <span className="text-[10px] uppercase text-gray-400">{valueLabel}</span>
            </span>
          </button>
        )) : (
          <p className="rounded-lg bg-[#F8FAFC] px-3 py-4 text-sm text-gray-400">Sem dados para exibir.</p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const prefix = isDireto ? '/direto' : '';
  const [dados, setDados] = useState(null);
  const [duplas, setDuplas] = useState([]);
  const [estudosEncerrados, setEstudosEncerrados] = useState([]);
  const [totalEstudosCadastrados, setTotalEstudosCadastrados] = useState(0);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/relatorios/dashboard-associacao'),
      api.get('/relatorios/estudos-biblicos'),
      api.get('/relatorios/estudos-biblicos', { params: { encerrado: 'true' } }),
      api.get('/duplas'),
    ])
      .then(([dashboardRes, estudosRes, encerradosRes, duplasRes]) => {
        setDados(dashboardRes.data);
        setTotalEstudosCadastrados(Number(estudosRes.data?.total || 0));
        setEstudosEncerrados(Array.isArray(encerradosRes.data?.estudos) ? encerradosRes.data.estudos : []);
        setDuplas(Array.isArray(duplasRes.data) ? duplasRes.data : []);
      })
      .finally(() => setCarregando(false));
  }, []);

  const ministerio = dados?.ministerioPessoal || {};
  const dashboardDuplas = dados?.duplasMissionarias || {};
  const cobertura = dashboardDuplas.cobertura || {};
  const indicadores = dashboardDuplas.indicadoresGerais || [];
  const totalDuplas = dashboardDuplas.totalDuplas || duplas.length;
  const valorIndicador = (nome) => indicadores.find((item) => item.nome === nome)?.valor || 0;
  const batismosConfirmados = useMemo(() => totalBatismosEncerrados(estudosEncerrados), [estudosEncerrados]);

  const medalhas = useMemo(() => {
    const base = { ouro: 0, prata: 0, bronze: 0, semAtividade: 0 };
    juntarEstudosEncerradosNasDuplas(duplas, estudosEncerrados).forEach((dupla) => {
      base[getMedalha(dupla)] += 1;
    });
    return base;
  }, [duplas, estudosEncerrados]);

  const ativas = useMemo(() => duplas.filter((dupla) => normalizarStatus(dupla.status) === 'ATIVA').length, [duplas]);
  const semAtividade = medalhas.semAtividade;
  const comVisitacao = valorIndicador('Visitas');

  const abrir = (rota) => navigate(`${prefix}${rota}`);
  const abrirDupla = (dupla) => dupla?.id && abrir(`/duplas/${dupla.id}`);
  const abrirMedalha = (medalha) => abrir(`/duplas?status=${medalha}`);

  if (carregando) return <LoadingState mensagem="Carregando dashboard..." />;

  return (
    <div className="animate-fade-in-up">
      <div className="rounded-2xl border border-[#1A3A6B]/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#C9963A]">
              <span className="h-7 w-1 rounded-full bg-[#C9963A]" />
              Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#1A3A6B] sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>
              Duplas Missionárias
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-400">
              Visão geral da força missionária, estudos, visitação, batismos e desempenho das duplas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => abrir('/duplas')} className="btn-primary px-4 py-2 text-sm">
              Ver Duplas
            </button>
            <button type="button" onClick={() => abrir('/cadastro/estudos-biblicos')} className="btn-outline px-4 py-2 text-sm">
              Novo Estudo
            </button>
          </div>
        </div>
      </div>

      <Section eyebrow="Resumo principal" title="Indicadores essenciais">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total de duplas" value={totalDuplas} detail={`${numero(ativas)} ativas no sistema`} color="#1A3A6B" icon={<UsersIcon />} onClick={() => abrir('/duplas')} />
          <MetricCard label="Registros de estudos" value={totalEstudosCadastrados} detail="Individuais, pontos e classes" color="#0284c7" icon={<BookIcon />} onClick={() => abrir('/relatorios/estudos-cadastrados')} />
          <MetricCard label="Visitação" value={comVisitacao} detail="Resumo das assistências/visitas" color="#7c3aed" icon={<VisitIcon />} onClick={() => abrir('/relatorios/assistencia')} />
          <MetricCard label="Batismos" value={batismosConfirmados} detail="Encerramentos marcados como batismo" color="#0d9488" icon={<WaterIcon />} onClick={() => abrir('/relatorios/ranking-decisoes')} />
        </div>
      </Section>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <section className="rounded-xl border border-[#C9963A]/20 bg-gradient-to-br from-white via-[#fffaf0] to-[#f8fafc] p-5 shadow-sm shadow-[#1A3A6B]/5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Medalhas</p>
              <h2 className="text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Classificação das duplas</h2>
            </div>
            <div className="hidden h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#315a96] text-white shadow-lg shadow-[#1A3A6B]/20 sm:flex">
              <MedalIcon />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MedalhaCard label="Ouro" value={medalhas.ouro} total={totalDuplas} color="#C9963A" bg="#fffbeb" onClick={() => abrirMedalha('ouro')} />
            <MedalhaCard label="Prata" value={medalhas.prata} total={totalDuplas} color="#64748b" bg="#f8fafc" onClick={() => abrirMedalha('prata')} />
            <MedalhaCard label="Bronze" value={medalhas.bronze} total={totalDuplas} color="#92400e" bg="#fff7ed" onClick={() => abrirMedalha('bronze')} />
            <MedalhaCard label="Sem estudo/visita" value={semAtividade} total={totalDuplas} color="#475569" bg="#f1f5f9" onClick={() => abrirMedalha('semAtividade')} />
          </div>
        </section>

        <section className="rounded-xl border border-[#9db7d8]/45 bg-gradient-to-br from-[#edf5ff] via-[#dcecff] to-[#c9ddf5] p-5 text-[#173760] shadow-sm shadow-[#1A3A6B]/10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#a97822]">Pulso missionário</p>
          <h2 className="mt-1 text-2xl font-bold text-[#173760]" style={{ fontFamily: 'Georgia, serif' }}>Cobertura ativa</h2>
          <div className="mt-5 space-y-4">
            {[
              ['Com estudo bíblico', cobertura.estudoBiblico?.com || 0, '#38bdf8'],
              ['Com classe bíblica', cobertura.classeBiblica?.com || 0, '#c084fc'],
              ['Com ponto de estudo', cobertura.pontoEstudo?.com || 0, '#2dd4bf'],
            ].map(([label, value, color]) => (
              <div key={label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-[#173760]/85">{label}</span>
                  <span className="font-bold" style={{ color }}>{percentual(value, totalDuplas)}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/70 shadow-inner">
                  <div className="h-full rounded-full" style={{ width: `${percentual(value, totalDuplas)}%`, backgroundColor: color }} />
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => abrir('/relatorios/dashboard-associacao')} className="mt-6 w-full rounded-lg border border-[#173760]/15 bg-white/45 px-4 py-3 text-sm font-bold text-[#173760] transition-all hover:bg-white/70">
            Abrir relatório completo
          </button>
        </section>
      </div>

      <Section eyebrow="Cobertura" title="Onde precisamos avançar">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ProgressCard label="Duplas com estudo" value={cobertura.estudoBiblico?.com || 0} total={totalDuplas} color="#0284c7" detail="Estudo bíblico individual cadastrado" onClick={() => abrir('/duplas?filtro=comEstudo')} />
          <ProgressCard label="Duplas com visitação" value={duplas.filter((dupla) => getVisitacoesCount(dupla) > 0).length} total={totalDuplas} color="#7c3aed" detail="Ao menos uma visita registrada" onClick={() => abrir('/duplas?filtro=comVisitacoes')} />
          <ProgressCard label="Duplas sem atividade" value={semAtividade} total={totalDuplas} color="#64748b" detail="Sem estudo bíblico e sem visitação" onClick={() => abrir('/duplas?status=semAtividade')} />
        </div>
      </Section>

      <Section eyebrow="Rankings" title="Duplas em destaque">
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <RankingList title="Mais estudos" items={dashboardDuplas.topEstudos} valueKey="estudos" valueLabel="estudos" color="#0284c7" onItemClick={abrirDupla} />
          <RankingList title="Mais visitação" items={dashboardDuplas.topVisitas} valueKey="visitas" valueLabel="visitas" color="#7c3aed" onItemClick={abrirDupla} />
          <RankingList title="Mais batismos" items={dashboardDuplas.topBatismos} valueKey="batismos" valueLabel="batismos" color="#0d9488" onItemClick={abrirDupla} />
        </div>
      </Section>

      <Section eyebrow="Sub-classificação" title="Classes das duplas">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ['Classe A', ministerio.classes?.A || 0, '#047857', '#ecfdf5', 'Prontas ou com fruto batismal registrado'],
            ['Classe B', ministerio.classes?.B || 0, '#b45309', '#fffbeb', 'Com estudo, aguardando avanço'],
            ['Classe C', ministerio.classes?.C || 0, '#b91c1c', '#fef2f2', 'Sem estudo informado na classificação'],
          ].map(([label, value, color, bg, detail]) => (
            <button
              key={label}
              type="button"
              onClick={() => abrir(`/duplas?classe=${label.slice(-1)}`)}
              className="smart-tooltip rounded-xl border p-5 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#C9963A]/25"
              style={{ backgroundColor: bg, borderColor: `${color}30` }}
              data-tooltip={`${label}: ${numero(value)} dupla(s). Clique para filtrar.`}
            >
              <p className="text-sm font-bold" style={{ color }}>{label}</p>
              <p className="mt-2 text-3xl font-bold leading-none" style={{ color }}>{numero(value)}</p>
              <p className="mt-3 text-sm font-medium text-gray-500">{detail}</p>
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
