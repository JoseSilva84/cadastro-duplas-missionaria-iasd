import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const BadgeEstudo = ({ status }) => {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const map = {
    ATIVO: 'bg-blue-100 text-blue-700',
    DESATIVADO: 'bg-yellow-100 text-yellow-700',
    TERMINADO: 'bg-green-100 text-green-700',
  };
  const label = { ATIVO: 'Ativo', DESATIVADO: 'Pausado', TERMINADO: 'Concluído' };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>{label[status]}</span>;
};

const BadgeEvangelismo = ({ status }) => {
  if (!status) return <span className="text-xs text-gray-400">—</span>;
  const map = { ATIVO: 'bg-orange-100 text-orange-700', TERMINADO: 'bg-green-100 text-green-700' };
  const label = { ATIVO: 'Ativo', TERMINADO: 'Terminado' };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>{label[status]}</span>;
};

export default function ListagemIgrejas() {
  const navigate = useNavigate();
  const [igrejas, setIgrejas] = useState([]);
  const [igrejaSelecionada, setIgrejaSelecionada] = useState(null);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/igrejas')
      .then((res) => {
        setIgrejas(res.data);
        if (res.data.length > 0) setIgrejaSelecionada(res.data[0]);
      })
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }, []);

  const igrejasFiltradas = igrejas.filter(ig =>
    !busca || ig.nome.toLowerCase().includes(busca.toLowerCase()) ||
    ig.distrito?.nome.toLowerCase().includes(busca.toLowerCase())
  );

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64 h-full">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
        </div>
      </div>
    );
  }

  const duplasDaIgreja = igrejaSelecionada?.duplas || [];
  const estudosAtivos = duplasDaIgreja.filter(d => d.statusEstudoBiblico === 'ATIVO').length;
  const evangelismosAtivos = duplasDaIgreja.filter(d => d.statusEvangelismo === 'ATIVO').length;
  const totalBatismos = duplasDaIgreja.reduce((acc, d) => acc + (d.batismos || 0), 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Geral</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Todas as Igrejas
          </h1>
          <p className="text-gray-400 text-xs mt-1">{igrejas.length} congregações cadastradas</p>
        </div>
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou distrito..."
            className="input-field pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-6 h-[calc(100vh-260px)] min-h-[400px]">
        {/* Lista de igrejas */}
        <div className="w-72 lg:w-80 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-y-auto">
          {igrejasFiltradas.map((igreja) => {
            const sel = igrejaSelecionada?.id === igreja.id;
            return (
              <button
                key={igreja.id}
                type="button"
                onClick={() => setIgrejaSelecionada(igreja)}
                className={`w-full text-left px-4 py-3.5 border-l-[3px] transition-all duration-200 ${
                  sel ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]' : 'border-l-transparent hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br from-[#16a34a]/10 to-[#22c55e]/10 flex items-center justify-center flex-shrink-0 transition-transform ${sel ? 'scale-110' : ''}`}>
                    <span className="text-lg">⛪</span>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${sel ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>{igreja.nome}</p>
                    {igreja.distrito && (
                      <p className="text-[10px] text-gray-400 truncate uppercase tracking-wide">{igreja.distrito.nome}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-0.5">👨‍👩‍👧‍👦 {(igreja.membros || 0).toLocaleString('pt-BR')} membros</p>
                  </div>
                </div>
              </button>
            );
          })}
          {igrejasFiltradas.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">Nenhuma igreja encontrada.</div>
          )}
        </div>

        {/* Painel de detalhes */}
        {igrejaSelecionada && (
          <div key={igrejaSelecionada.id} className="flex-1 overflow-y-auto animate-fade-in">
            {/* Cabeçalho do detalhe */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider mb-1">Igreja Local</p>
                  <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                    {igrejaSelecionada.nome}
                  </h2>
                  {igrejaSelecionada.distrito && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {igrejaSelecionada.distrito.nome}
                      {igrejaSelecionada.distrito.regiao && ` • ${igrejaSelecionada.distrito.regiao.nome}`}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/duplas/nova?igrejaId=${igrejaSelecionada.id}&distritoId=${igrejaSelecionada.distritoId}`)}
                  className="btn-primary flex items-center gap-2 flex-shrink-0 text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nova Dupla
                </button>
              </div>
            </div>

            {/* Cards de Indicadores */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
              {[
                { label: 'Membros', valor: (igrejaSelecionada.membros || 0).toLocaleString('pt-BR'), icon: '👨‍👩‍👧‍👦', gradient: 'from-[#7B2D8B] to-[#9333ea]', cor: '#7B2D8B' },
                { label: 'Duplas', valor: igrejaSelecionada._count?.duplas || 0, icon: '👥', gradient: 'from-[#1A3A6B] to-[#2a5298]', cor: '#1A3A6B' },
                { label: 'Est. Bíblicos', valor: estudosAtivos, icon: '📖', gradient: 'from-[#0284c7] to-[#0ea5e9]', cor: '#0284c7' },
                { label: 'Evangelismos', valor: evangelismosAtivos, icon: '📢', gradient: 'from-[#ea580c] to-[#f97316]', cor: '#ea580c' },
                { label: 'Batismos', valor: totalBatismos, icon: '💧', gradient: 'from-[#0d9488] to-[#14b8a6]', cor: '#0d9488' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-lg shadow-md mb-1.5 group-hover:scale-110 transition-transform`}>
                    {item.icon}
                  </div>
                  <p className="text-lg font-bold" style={{ color: item.cor }}>{item.valor}</p>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Lista de Duplas da Igreja */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-[#1A3A6B] text-sm">Duplas Missionárias</h3>
                <span className="text-xs text-gray-400">{igrejaSelecionada._count?.duplas || 0} dupla(s)</span>
              </div>

              {duplasDaIgreja.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <div className="text-3xl mb-2">👥</div>
                  <p className="text-sm font-medium">Nenhuma dupla registrada</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/duplas/nova?igrejaId=${igrejaSelecionada.id}&distritoId=${igrejaSelecionada.distritoId}`)}
                    className="btn-primary mt-4 text-xs px-4 py-2"
                  >
                    Cadastrar primeira dupla
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {duplasDaIgreja.map((dupla) => (
                    <div key={dupla.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-xs shadow">
                            {dupla.liderNome?.charAt(0)}
                          </div>
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-[9px] font-bold absolute -bottom-1 -right-1 border-2 border-white">
                            {dupla.membro2Nome?.charAt(0)}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A3A6B] truncate">{dupla.liderNome} + {dupla.membro2Nome}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {dupla.estudoBiblico && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                📖 {dupla.estudoBiblico} <BadgeEstudo status={dupla.statusEstudoBiblico} />
                              </span>
                            )}
                            {dupla.statusEvangelismo && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                📢 <BadgeEvangelismo status={dupla.statusEvangelismo} />
                              </span>
                            )}
                            {dupla.batismos > 0 && (
                              <span className="text-[10px] text-teal-600 font-medium">💧 {dupla.batismos} batismo(s)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/duplas/${dupla.id}`)}
                        className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 hover:bg-[#1A3A6B] flex items-center justify-center transition-colors group/btn"
                      >
                        <svg className="w-4 h-4 text-gray-400 group-hover/btn:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
