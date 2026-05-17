import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function ListagemIgrejasDireto() {
  const navigate = useNavigate();
  const [igrejas, setIgrejas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [igrejaSelecionada, setIgrejaSelecionada] = useState(null);

  useEffect(() => {
    api.get('/igrejas')
      .then((res) => {
        setIgrejas(res.data);
        if (res.data.length > 0) {
          setIgrejaSelecionada(res.data[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando igrejas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* ===== PAINEL ESQUERDO: Lista de Igrejas (Master) ===== */}
      <div className="w-full sm:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full overflow-hidden">
        {/* Cabeçalho do painel */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Geral</p>
          </div>
          <h1 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Todas as Igrejas
          </h1>
          <p className="text-gray-400 text-[10px] mt-1">{igrejas.length} igrejas encontradas</p>
        </div>

        {/* Lista de igrejas */}
        <div className="flex-1 overflow-y-auto">
          {igrejas.map((igreja) => {
            const selecionado = igrejaSelecionada?.id === igreja.id;

            return (
              <button
                type="button"
                key={igreja.id}
                onClick={() => setIgrejaSelecionada(igreja)}
                className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                  selecionado
                    ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]'
                    : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
                }`}
              >
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-[#16a34a]/10 to-[#22c55e]/10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${selecionado ? 'scale-110' : ''}`}>
                        <span className="text-xl">⛪</span>
                      </div>
                      <div className="min-w-0">
                        <h2 className={`text-sm font-semibold truncate transition-colors duration-200 ${selecionado ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                          {igreja.nome}
                        </h2>
                        {igreja.distrito && (
                          <p className="text-gray-400 text-[10px] truncate uppercase tracking-wide">
                            {igreja.distrito.nome}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== PAINEL DIREITO: Detalhes da Igreja (Detail) ===== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F4F5F7]">
        {!igrejaSelecionada ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-float">👈</div>
              <p className="font-medium text-lg">Selecione uma igreja</p>
              <p className="text-sm mt-1">Clique em uma igreja à esquerda para ver os detalhes.</p>
            </div>
          </div>
        ) : (
          <div key={igrejaSelecionada.id} className="flex flex-col h-full animate-slide-in-right">
            {/* Cabeçalho do detail */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Resumo da Igreja</span>
              </div>
              <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                {igrejaSelecionada.nome}
              </h2>
              {igrejaSelecionada.distrito && (
                <p className="text-gray-400 text-xs mt-0.5">
                  Distrito: {igrejaSelecionada.distrito.nome} 
                  {igrejaSelecionada.distrito.regiao && ` • Região: ${igrejaSelecionada.distrito.regiao.nome}`}
                </p>
              )}
            </div>

            {/* Conteúdo do detail — scroll horizontal */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6">
              <div className="flex gap-4 min-w-0">
                
                {/* Card: Estatísticas */}
                <div className="flex-shrink-0 w-72 bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📊</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Estatísticas</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Membros:</span><p className="text-gray-700 font-bold">{(igrejaSelecionada.membros || 0).toLocaleString('pt-BR')}</p></div>
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Duplas ativas/registradas:</span><p className="text-[#C9963A] font-bold">{igrejaSelecionada._count?.duplas || 0}</p></div>
                    </div>
                  </div>
                </div>

                {/* Card: Acompanhamento Missionário */}
                <div className="flex-shrink-0 w-72 bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center text-xs">📈</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Acompanhamento</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Estudos Bíblicos Ativos:</span><p className="text-[#0284c7] font-bold">{igrejaSelecionada.duplas?.filter(d => d.statusEstudoBiblico === 'ATIVO').length || 0}</p></div>
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Evangelismos Ativos:</span><p className="text-[#ea580c] font-bold">{igrejaSelecionada.duplas?.filter(d => d.statusEvangelismo === 'ATIVO').length || 0}</p></div>
                      <div className="flex justify-between items-center"><span className="text-gray-400 text-xs">Batismos Realizados:</span><p className="text-[#0d9488] font-bold">{igrejaSelecionada.duplas?.reduce((acc, d) => acc + (d.batismos || 0), 0) || 0}</p></div>
                    </div>
                  </div>
                </div>

                {/* Card: Ações Rápidas */}
                <div className="flex-shrink-0 w-72 bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#16a34a]/10 flex items-center justify-center text-xs">⚡</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Ações Rápidas</h4>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">O que você deseja fazer nesta igreja?</p>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/direto/duplas/nova?igrejaId=${igrejaSelecionada.id}&distritoId=${igrejaSelecionada.distritoId}`)}
                        className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Inscrever dupla para esta Igreja
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
