import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const projetoLabel = {
  CASA_A_CASA: 'Casa em Casa',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  EVANGELISMO_PUBLICO: 'Evangelismo Público',
};

const projetoIcon = {
  CASA_A_CASA: '🏠',
  PEQUENOS_GRUPOS: '👥',
  ACAO_SOCIAL: '🤲',
  EVANGELISMO_PUBLICO: '📢',
};

const statusColors = { ATIVA: '#16a34a', PENDENTE: '#C9963A', INATIVA: '#9ca3af' };
const statusLabels = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };

export default function DuplasDireto() {
  const navigate = useNavigate();
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [duplaExpandida, setDuplaExpandida] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    let ativo = true;
    api.get('/duplas').then((d) => {
      if (!ativo) return;
      setDuplas(Array.isArray(d.data) ? d.data : []);
    }).catch(() => {
      if (ativo) setDuplas([]);
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, []);

  function toggleDupla(duplaId) {
    setDuplaExpandida((prev) => (prev === duplaId ? null : duplaId));
  }

  const duplasFiltradas = duplas.filter((d) => {
    const matchStatus = !filtroStatus || d.status === filtroStatus;
    const termo = busca.toLowerCase();
    const matchBusca = !busca ||
      (d.liderNome || '').toLowerCase().includes(termo) ||
      (d.membro2Nome || '').toLowerCase().includes(termo) ||
      (d.bairro || '').toLowerCase().includes(termo);
    return matchStatus && matchBusca;
  });

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando duplas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4 animate-fade-in-down">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Visão Direta</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Todas as Duplas
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">{duplasFiltradas.length} dupla(s) encontrada(s)</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/duplas/nova')}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Dupla
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 animate-fade-in-down" style={{ animationDelay: '100ms' }}>
        <div className="relative flex-1 sm:max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou bairro..."
            className="input-field pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="input-field sm:w-auto"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="ATIVA">Ativa</option>
          <option value="PENDENTE">Pendente</option>
          <option value="INATIVA">Inativa</option>
        </select>
      </div>

      {/* Master-Detail: Lista de duplas com detalhes expandidos inline */}
      <div className="space-y-3 stagger-children">
        {duplasFiltradas.map((dupla) => {
          const expandido = duplaExpandida === dupla.id;
          const cor = statusColors[dupla.status] || '#9ca3af';

          return (
            <div
              key={dupla.id}
              className="rounded-2xl overflow-hidden bg-white shadow-md transition-all duration-300"
            >
              {/* Master: Dupla resumida */}
              <button
                type="button"
                onClick={() => toggleDupla(dupla.id)}
                className="w-full text-left group"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {(dupla.liderNome || '?').charAt(0)}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white font-bold text-[10px] absolute -bottom-0.5 -right-1 border-2 border-white shadow-sm">
                            {(dupla.membro2Nome || '?').charAt(0)}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[#1A3A6B] text-sm group-hover:text-[#C9963A] transition-colors duration-200 truncate">
                            {dupla.liderNome || 'Sem nome'}
                          </p>
                          <span className="text-gray-300 text-xs">+</span>
                          <p className="text-gray-600 text-sm truncate">{dupla.membro2Nome || 'Sem nome'}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: cor + '20', color: cor }}
                          >
                            {statusLabels[dupla.status] || dupla.status || '—'}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            {dupla.bairro || 'Sem bairro'}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            {projetoIcon[dupla.tipoProjeto] || '📋'} {projetoLabel[dupla.tipoProjeto] || dupla.tipoProjeto || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {dupla.pessoasAlcancadas > 0 && (
                        <div className="hidden sm:flex flex-col items-center bg-gradient-to-b from-[#C9963A]/10 to-[#C9963A]/5 rounded-lg px-2.5 py-1">
                          <span className="text-sm font-bold text-[#C9963A]">{dupla.pessoasAlcancadas}</span>
                          <span className="text-[8px] text-gray-400 -mt-0.5">alcançadas</span>
                        </div>
                      )}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${expandido ? 'bg-[#1A3A6B] text-white rotate-180' : 'bg-gray-100 text-gray-400 group-hover:bg-[#1A3A6B] group-hover:text-white'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Detail: Dados completos da dupla (expandido inline) */}
              {expandido && (
                <div className="border-t border-gray-100 bg-[#F4F5F7]/50 animate-fade-in">
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-[10px] font-bold">1</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Líder</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Nome:</span> <span className="text-gray-700 font-medium">{dupla.liderNome || '—'}</span></div>
                          {dupla.liderTelefone && <div><span className="text-gray-400 text-xs">Telefone:</span> <span className="text-gray-700">{dupla.liderTelefone}</span></div>}
                          {dupla.liderEmail && <div><span className="text-gray-400 text-xs">E-mail:</span> <span className="text-gray-700">{dupla.liderEmail}</span></div>}
                          {dupla.liderIgreja && <div><span className="text-gray-400 text-xs">Igreja:</span> <span className="text-gray-700">{dupla.liderIgreja}</span></div>}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Parceiro</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Nome:</span> <span className="text-gray-700 font-medium">{dupla.membro2Nome || '—'}</span></div>
                          {dupla.membro2Telefone && <div><span className="text-gray-400 text-xs">Telefone:</span> <span className="text-gray-700">{dupla.membro2Telefone}</span></div>}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📍</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Localização</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          {dupla.distrito?.regiao?.nome && <div><span className="text-gray-400 text-xs">Região:</span> <span className="text-gray-700">{dupla.distrito.regiao.nome}</span></div>}
                          {dupla.distrito?.nome && <div><span className="text-gray-400 text-xs">Distrito:</span> <span className="text-gray-700">{dupla.distrito.nome}</span></div>}
                          {dupla.igreja?.nome && <div><span className="text-gray-400 text-xs">Igreja:</span> <span className="text-gray-700">{dupla.igreja.nome}</span></div>}
                          <div><span className="text-gray-400 text-xs">Bairro:</span> <span className="text-gray-700 font-medium">{dupla.bairro || '—'}</span></div>
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📋</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Projeto</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Tipo:</span> <span className="text-gray-700 font-medium">{projetoLabel[dupla.tipoProjeto] || dupla.tipoProjeto || '—'}</span></div>
                          <div><span className="text-gray-400 text-xs">Status:</span> <span className="font-semibold" style={{ color: cor }}>{statusLabels[dupla.status] || dupla.status || '—'}</span></div>
                          {dupla.pessoasAlcancadas > 0 && (
                            <div className="flex items-center gap-2 bg-[#C9963A]/10 rounded-lg px-3 py-2 mt-2">
                              <span className="text-lg">🙏</span>
                              <div>
                                <p className="text-[#C9963A] font-bold">{dupla.pessoasAlcancadas}</p>
                                <p className="text-gray-400 text-[10px]">pessoas alcançadas</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {dupla.observacoes && (
                      <div className="mt-4 bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📝</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Observações</h4>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{dupla.observacoes}</p>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/duplas/${dupla.id}/editar`)}
                        className="btn-outline text-sm px-4 py-2"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/duplas/${dupla.id}`)}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        Ver detalhes completos
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {duplasFiltradas.length === 0 && (
        <div className="text-center py-20 text-gray-400 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">👥</div>
          <p className="font-medium text-lg">Nenhuma dupla encontrada.</p>
          <button
            type="button"
            onClick={() => navigate('/duplas/nova')}
            className="btn-primary mt-6 text-sm px-5 py-2.5"
          >
            Cadastrar primeira dupla
          </button>
        </div>
      )}
    </div>
  );
}
