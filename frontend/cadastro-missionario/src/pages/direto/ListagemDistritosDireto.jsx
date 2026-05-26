import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function ListagemDistritosDireto() {
  const navigate = useNavigate();
  const [distritos, setDistritos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [distritoSelecionado, setDistritoSelecionado] = useState(null);
  const [busca, setBusca] = useState('');
  const [mostraDetalhe, setMostraDetalhe] = useState(false);

  useEffect(() => {
    api.get('/distritos')
      .then((res) => {
        setDistritos(res.data);
        if (res.data.length > 0) {
          setDistritoSelecionado(res.data[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }, []);

  const distritosFiltrados = distritos.filter((d) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      d.nome.toLowerCase().includes(q) ||
      d.regiao?.nome.toLowerCase().includes(q)
    );
  });

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando distritos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* ===== PAINEL ESQUERDO: Lista de Distritos (Master) ===== */}
      <div className={`${
        mostraDetalhe ? 'hidden sm:flex' : 'flex'
      } w-full sm:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 bg-white flex-col h-full overflow-hidden`}>
        {/* Cabeçalho do painel */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Geral</p>
          </div>
          <h1 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Todos os Distritos
          </h1>
          <p className="text-gray-400 text-[10px] mt-1">{distritos.length} distritos encontrados</p>

          {/* Campo de busca */}
          <div className="relative mt-3">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou região..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/20 focus:border-[#1A3A6B]/40 bg-gray-50 text-gray-700 placeholder-gray-400 transition-all"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Lista de distritos */}
        <div className="flex-1 overflow-y-auto">
          {distritosFiltrados.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-xs">
              {busca ? `Nenhum distrito encontrado para "${busca}".` : 'Nenhum distrito cadastrado.'}
            </div>
          )}
          {distritosFiltrados.map((distrito) => {
            const selecionado = distritoSelecionado?.id === distrito.id;

            return (
              <button
                type="button"
                key={distrito.id}
                onClick={() => { setDistritoSelecionado(distrito); setMostraDetalhe(true); }}
                className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                  selecionado
                    ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]'
                    : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
                }`}
              >
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${selecionado ? 'scale-110' : ''}`}>
                        <svg className="w-5 h-5 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h2 className={`text-sm font-semibold truncate transition-colors duration-200 ${selecionado ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                          {distrito.nome}
                        </h2>
                        {distrito.regiao && (
                          <p className="text-gray-400 text-[10px] truncate uppercase tracking-wide">{distrito.regiao.nome}</p>
                        )}
                        <p className="text-gray-400 text-[10px] mt-0.5">
                          ⛪ {(distrito.igrejas || []).length} igrejas &nbsp;·&nbsp; 👥 {distrito._count?.duplas || 0} duplas
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== PAINEL DIREITO: Detalhes do Distrito (Detail) ===== */}
      <div className={`${
        mostraDetalhe ? 'flex' : 'hidden sm:flex'
      } flex-1 flex-col h-full overflow-hidden bg-[#F4F5F7]`}>
        {!distritoSelecionado ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-float">👈</div>
              <p className="font-medium text-lg">Selecione um distrito</p>
              <p className="text-sm mt-1">Clique em um distrito à esquerda para ver os detalhes.</p>
            </div>
          </div>
        ) : (
          <div key={distritoSelecionado.id} className="flex flex-col h-full animate-slide-in-right">
            {/* Cabeçalho do detail */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
              {/* Botão voltar (mobile) */}
              <button
                type="button"
                onClick={() => setMostraDetalhe(false)}
                className="sm:hidden flex items-center gap-1.5 text-xs text-[#1A3A6B] font-semibold mb-3 hover:text-[#C9963A] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar à lista
              </button>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Resumo do Distrito</span>
              </div>
              <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                {distritoSelecionado.nome}
              </h2>
              {distritoSelecionado.regiao && (
                <p className="text-gray-400 text-xs mt-0.5">Pertence à Região: {distritoSelecionado.regiao.nome}</p>
              )}
            </div>

            {/* Conteúdo do detail — scroll horizontal */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(280px,360px)_minmax(260px,1fr)_minmax(260px,1fr)] gap-4 max-w-6xl">

                {/* Card: Estatísticas */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📊</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Estatísticas</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Membros:</span><p className="text-gray-700 font-bold">{(distritoSelecionado.membros || 0).toLocaleString('pt-BR')}</p></div>
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Igrejas:</span><p className="text-gray-700 font-bold">{(distritoSelecionado.igrejas || []).length}</p></div>
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Duplas:</span><p className="text-[#C9963A] font-bold">{distritoSelecionado._count?.duplas || 0}</p></div>
                    </div>
                  </div>
                </div>

                {/* Card: Acompanhamento Missionário */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center text-xs">📈</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Acompanhamento</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Estudos Bíblicos Ativos:</span><p className="text-[#0284c7] font-bold">{distritoSelecionado.duplas?.filter(d => d.statusEstudoBiblico === 'ATIVO').length || 0}</p></div>
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Classes Bíblicas Ativas:</span><p className="text-[#ea580c] font-bold">{distritoSelecionado.duplas?.filter(d => d.statusEvangelismo === 'ATIVO').length || 0}</p></div>
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Batismos Realizados:</span><p className="text-[#0d9488] font-bold">{distritoSelecionado.duplas?.reduce((acc, d) => acc + (d.batismos || 0), 0) || 0}</p></div>
                    </div>
                  </div>
                </div>

                {/* Card: Ações Rápidas */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#16a34a]/10 flex items-center justify-center text-xs">⚡</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Ações Rápidas</h4>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">O que você deseja fazer neste distrito?</p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/direto/duplas/nova?distritoId=${distritoSelecionado.id}`)}
                        className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Inscrever nova dupla
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/direto/distritos/${distritoSelecionado.id}`)}
                        className="w-full btn-outline text-xs py-2 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Ver detalhes completos
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card: Igrejas do Distrito */}
                {(distritoSelecionado.igrejas || []).length > 0 && (
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm xl:col-start-1 xl:row-start-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#16a34a]/10 flex items-center justify-center text-xs">⛪</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Igrejas</h4>
                    </div>
                    <div className="space-y-2">
                      {distritoSelecionado.igrejas.map((ig) => (
                        <div key={ig.id} className="text-xs py-1.5 border-b border-gray-50 last:border-0">
                          <p className="text-gray-700 font-medium break-words">{ig.nome}</p>
                          <p className="text-gray-400 mt-0.5">{(ig.membros || 0).toLocaleString('pt-BR')} membros</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
