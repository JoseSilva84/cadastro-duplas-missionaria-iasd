import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const formatarData = (valor) => {
  if (!valor) return 'Sem registro';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Sem registro';
  return data.toLocaleDateString('pt-BR');
};

const Icone = ({ children, cor = '#1A3A6B' }) => (
  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cor}12`, color: cor }}>
    {children}
  </div>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20a4 4 0 00-8 0M12 12a4 4 0 100-8 4 4 0 000 8zm7 8a3 3 0 00-4.5-2.6M5 20a3 3 0 014.5-2.6M18 11a3 3 0 100-6M6 11a3 3 0 110-6" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-7 4h8m-8 4h8m-8 4h5M9 3h6a2 2 0 012 2h1a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h1a2 2 0 012-2z" />
  </svg>
);

const VisitIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7-7.5 10.5-7.5 10.5S4.5 17.5 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19V5m4 14v-7m4 7V8m4 11v-4m4 4H4" />
  </svg>
);

function Indicador({ label, valor, detalhe, tooltip, cor, icon }) {
  return (
    <div
      className="smart-tooltip bg-white border border-gray-100 rounded-lg p-4 shadow-sm"
      data-tooltip={tooltip || detalhe || `${label}: total consolidado conforme os acompanhamentos registrados.`}
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <Icone cor={cor}>{icon}</Icone>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight" style={{ color: cor }}>{numero(valor)}</p>
          <p className="text-sm font-semibold text-[#1A3A6B] mt-1">{label}</p>
          {detalhe && <p className="text-xs text-gray-400 mt-1">{detalhe}</p>}
        </div>
      </div>
    </div>
  );
}

function Painel({ titulo, subtitulo, cor, children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible">
      <div className="px-5 py-4 border-b border-gray-100" style={{ borderTop: `4px solid ${cor}` }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: cor }}>{subtitulo}</p>
        <h2 className="text-xl font-bold text-[#1A3A6B] mt-1" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function Ranking({ titulo, itens = [], campo, label, cor }) {
  return (
    <div className="bg-[#F4F5F7] rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-[#1A3A6B] mb-3">{titulo}</h3>
      <div className="space-y-2">
        {itens.length ? itens.map((item, index) => (
          <div
            key={`${titulo}-${item.id}`}
            className="smart-tooltip bg-white rounded-lg border border-gray-100 px-3 py-3 flex items-center gap-3"
            data-tooltip={`${titulo}: ${item.nome} possui ${numero(item[campo])} ${label}.`}
            tabIndex={0}
          >
            <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">{index + 1}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#1A3A6B] truncate">{item.nome}</p>
              <p className="text-xs text-gray-400 truncate">{item.regiao}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold leading-tight" style={{ color: cor }}>{numero(item[campo])}</p>
              <p className="text-[10px] text-gray-400 uppercase">{label}</p>
            </div>
          </div>
        )) : <p className="text-sm text-gray-400">Sem dados para exibir.</p>}
      </div>
    </div>
  );
}

export default function DashboardCoordenadorRegional() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/relatorios/coordenadores-regionais')
      .then((res) => setDados(res.data))
      .finally(() => setCarregando(false));
  }, []);

  const resumo = dados?.resumo || {};
  const rankings = dados?.rankings || {};
  const coordenadores = dados?.coordenadores || [];
  const recentes = dados?.recentes || [];

  const coordenadoresOrdenados = useMemo(() => (
    [...coordenadores].sort((a, b) => b.totalAssistencias - a.totalAssistencias || a.nome.localeCompare(b.nome))
  ), [coordenadores]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="space-y-3 w-full max-w-4xl p-4">
          <div className="skeleton h-10 w-2/5" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((item) => <div key={item} className="skeleton h-28" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isDireto ? 'h-full overflow-y-auto bg-[#F4F5F7] p-4 sm:p-6 animate-fade-in' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Relatório</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Coordenador Regional
        </h1>
        <p className="text-gray-400 text-sm mt-1">Informações e desempenho dos acompanhamentos realizados pelos coordenadores regionais.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
        <Indicador label="Coordenadores ativos" valor={resumo.totalCoordenadores} tooltip="Coordenadores ativos: total de usuarios ativos com perfil de coordenador regional." cor="#1A3A6B" icon={<UsersIcon />} />
        <Indicador label="Assistências registradas" valor={resumo.totalAssistencias} tooltip="Assistencias registradas: total de saidas/acompanhamentos cadastrados pelos coordenadores." cor="#C9963A" icon={<VisitIcon />} />
        <Indicador label="Duplas acompanhadas" valor={resumo.totalDuplasAcompanhadas} detalhe="contagem total, incluindo repetições" tooltip="Duplas acompanhadas: soma de todas as duplas visitadas nas assistencias, incluindo repeticoes quando a mesma dupla aparece em mais de uma saida." cor="#0d9488" icon={<ChartIcon />} />
        <Indicador label="Relatórios preenchidos" valor={resumo.totalRelatorios} tooltip="Relatorios preenchidos: quantidade de assistencias que possuem observacoes ou relato registrado." cor="#7B2D8B" icon={<ClipboardIcon />} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Painel titulo="Dashboard de Acompanhamentos" subtitulo="Rankings" cor="#1A3A6B">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Ranking titulo="Mais assistências" itens={rankings.porAssistencias} campo="totalAssistencias" label="assist." cor="#1A3A6B" />
            <Ranking titulo="Mais duplas acompanhadas" itens={rankings.porDuplasAcompanhadas} campo="totalDuplasAcompanhadas" label="duplas" cor="#0d9488" />
            <Ranking titulo="Mais duplas únicas" itens={rankings.porDuplasUnicas} campo="duplasUnicas" label="únicas" cor="#C9963A" />
            <Ranking titulo="Mais relatórios preenchidos" itens={rankings.porRelatorios} campo="relatoriosPreenchidos" label="relat." cor="#7B2D8B" />
          </div>
        </Painel>

        <Painel titulo="Informações dos Coordenadores" subtitulo="Coordenação regional" cor="#C9963A">
          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {coordenadoresOrdenados.length ? coordenadoresOrdenados.map((coordenador) => (
              <div key={coordenador.id} className="bg-[#F4F5F7] rounded-lg border border-gray-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1A3A6B] truncate">{coordenador.nome}</p>
                    <p className="text-xs text-gray-400 truncate">{coordenador.email}</p>
                    <p className="text-xs font-semibold text-[#C9963A] mt-1">{coordenador.regiao}</p>
                  </div>
                  <button type="button" onClick={() => navigate(isDireto ? '/direto/registro-saida' : '/registro-saida')} className="btn-outline text-xs px-3 py-2">
                    Registrar assistência
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
                  <div className="smart-tooltip bg-white rounded-lg p-3" data-tooltip="Assistencias: total de saidas registradas por este coordenador." tabIndex={0}><p className="text-lg font-bold text-[#1A3A6B]">{numero(coordenador.totalAssistencias)}</p><p className="text-[10px] text-gray-400 uppercase">assistências</p></div>
                  <div className="smart-tooltip bg-white rounded-lg p-3" data-tooltip="Duplas: soma de duplas acompanhadas por este coordenador, incluindo repeticoes." tabIndex={0}><p className="text-lg font-bold text-[#0d9488]">{numero(coordenador.totalDuplasAcompanhadas)}</p><p className="text-[10px] text-gray-400 uppercase">duplas</p></div>
                  <div className="smart-tooltip bg-white rounded-lg p-3" data-tooltip="Unicas: quantidade de duplas distintas acompanhadas por este coordenador." tabIndex={0}><p className="text-lg font-bold text-[#C9963A]">{numero(coordenador.duplasUnicas)}</p><p className="text-[10px] text-gray-400 uppercase">únicas</p></div>
                  <div className="smart-tooltip bg-white rounded-lg p-3" data-tooltip="Relatorios: quantidade de acompanhamentos com relato preenchido." tabIndex={0}><p className="text-lg font-bold text-[#7B2D8B]">{numero(coordenador.relatoriosPreenchidos)}</p><p className="text-[10px] text-gray-400 uppercase">relatórios</p></div>
                </div>
                <div className="mt-3 text-xs text-gray-400">
                  Último acompanhamento: <span className="font-semibold text-gray-600">{formatarData(coordenador.ultimoAcompanhamento)}</span>
                  {coordenador.distritoMaisVisitado && (
                    <span> · Distrito mais visitado: <span className="font-semibold text-gray-600">{coordenador.distritoMaisVisitado.nome}</span></span>
                  )}
                </div>
              </div>
            )) : <p className="text-sm text-gray-400">Nenhum coordenador regional ativo encontrado.</p>}
          </div>
        </Painel>
      </div>

      <div className="mt-5">
        <Painel titulo="Últimos Acompanhamentos" subtitulo="Histórico recente" cor="#0d9488">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {recentes.length ? recentes.map((item) => (
              <div key={item.id} className="bg-[#F4F5F7] rounded-lg border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-[#1A3A6B] truncate">{item.coordenador}</p>
                    <p className="text-xs text-gray-400">{item.regiao} · {formatarData(item.dataSaida)}</p>
                  </div>
                  <span className="smart-tooltip px-2.5 py-1 rounded-full bg-white text-[#0d9488] text-xs font-bold" data-tooltip="Total de duplas vinculadas a este acompanhamento recente." tabIndex={0}>{numero(item.totalDuplas)} duplas</span>
                </div>
                {item.relatorio && <p className="text-sm text-gray-600 mt-3 line-clamp-3">{item.relatorio}</p>}
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.duplas.slice(0, 3).map((dupla) => (
                    <span key={`${item.id}-${dupla.id || dupla.nome}`} className="px-2 py-1 rounded-full bg-white text-[10px] font-semibold text-gray-500">
                      {dupla.nome}
                    </span>
                  ))}
                </div>
              </div>
            )) : <p className="text-sm text-gray-400">Nenhum acompanhamento registrado.</p>}
          </div>
        </Painel>
      </div>
    </div>
  );
}
