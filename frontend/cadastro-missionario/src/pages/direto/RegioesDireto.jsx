import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const coresPadrao = ['#1A3A6B', '#C9963A', '#2D6A4F', '#7B2D8B', '#C44D34'];

export default function RegioesDireto() {
  const navigate = useNavigate();
  const [regioes, setRegioes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [regiaoSelecionada, setRegiaoSelecionada] = useState(null);
  const [distritosDetalhados, setDistritosDetalhados] = useState({});
  const [carregandoDistritos, setCarregandoDistritos] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get('/regioes'),
      api.get('/relatorios/resumo'),
    ]).then(([r, s]) => {
      if (!ativo) return;
      setRegioes(r.data);
      setResumo(s.data);
      if (r.data.length > 0) {
        setRegiaoSelecionada(r.data[0]);
      }
    }).catch(() => {
      if (ativo) setCarregando(false);
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, []);

  async function selecionarRegiao(regiao) {
    setRegiaoSelecionada(regiao);

    if (!distritosDetalhados[regiao.id]) {
      setCarregandoDistritos(true);
      try {
        const { data } = await api.get(`/regioes/${regiao.id}`);
        setDistritosDetalhados((prev) => ({
          ...prev,
          [regiao.id]: data.distritos || [],
        }));
      } catch {
        setDistritosDetalhados((prev) => ({
          ...prev,
          [regiao.id]: [],
        }));
      } finally {
        setCarregandoDistritos(false);
      }
    }
  }

  function getDistritos(regiao) {
    return distritosDetalhados[regiao.id] ?? regiao.distritos ?? [];
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando regiões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* ===== PAINEL ESQUERDO: Lista de Regiões (Master) ===== */}
      <div className="w-full sm:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full overflow-hidden">
        {/* Cabeçalho do painel */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Geral</p>
          </div>
          <h1 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Regiões Missionárias
          </h1>

          {/* Indicadores gerais — compactos em linha */}
          {resumo && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                { label: 'Duplas', valor: resumo.totalDuplas, cor: '#1A3A6B' },
                { label: 'Ativas', valor: resumo.totalAtivas, cor: '#16a34a' },
                { label: 'Pendentes', valor: resumo.totalPendentes, cor: '#C9963A' },
                { label: 'Alcançadas', valor: resumo.totalPessoasAlcancadas, cor: '#7B2D8B' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <span className="text-sm font-bold" style={{ color: item.cor }}>{item.valor}</span>
                  <span className="text-gray-400 text-[10px]">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de regiões */}
        <div className="flex-1 overflow-y-auto">
          {regioes.map((regiao, idx) => {
            const cor = regiao.cor || coresPadrao[idx % coresPadrao.length];
            const selecionada = regiaoSelecionada?.id === regiao.id;

            return (
              <button
                type="button"
                key={regiao.id}
                onClick={() => selecionarRegiao(regiao)}
                className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                  selecionada
                    ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]'
                    : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
                }`}
              >
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm transition-transform duration-200 ${selecionada ? 'scale-110' : ''}`}
                        style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
                      >
                        {regiao.nome.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h2 className={`text-sm font-semibold truncate transition-colors duration-200 ${selecionada ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                          {regiao.nome}
                        </h2>
                        {regiao.descricao && (
                          <p className="text-gray-400 text-[10px] truncate">{regiao.descricao}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <div className="text-right">
                        <span className="text-sm font-bold" style={{ color: cor }}>{regiao.totalDistritos}</span>
                        <span className="text-gray-400 text-[10px] ml-0.5">dist.</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold" style={{ color: cor }}>{regiao.totalDuplas}</span>
                        <span className="text-gray-400 text-[10px] ml-0.0">dup.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {regioes.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3 animate-float">✝️</div>
              <p className="font-medium">Nenhuma região cadastrada.</p>
              <p className="text-xs mt-1">Execute o seed do banco de dados.</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== PAINEL DIREITO: Detalhes da Região (Detail) ===== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F4F5F7]">
        {!regiaoSelecionada ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-float">👈</div>
              <p className="font-medium text-lg">Selecione uma região</p>
              <p className="text-sm mt-1">Clique em uma região à esquerda para ver os detalhes.</p>
            </div>
          </div>
        ) : (
          <div key={regiaoSelecionada.id} className="flex flex-col h-full animate-slide-in-right">
            {/* Cabeçalho do detail */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-2 mb-1">
                {(() => {
                  const cor = regiaoSelecionada.cor || coresPadrao[regioes.findIndex(r => r.id === regiaoSelecionada.id) % coresPadrao.length];
                  return <div className="w-3 h-3 rounded-full" style={{ background: cor }} />;
                })()}
                <span className="text-gray-400 text-xs font-medium">Região selecionada</span>
              </div>
              <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                {regiaoSelecionada.nome}
              </h2>
              {regiaoSelecionada.descricao && (
                <p className="text-gray-400 text-xs mt-0.5">{regiaoSelecionada.descricao}</p>
              )}
            </div>

            {/* Conteúdo do detail — scroll horizontal se necessário */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6">
              {/* Cards de resumo da região */}
              {(() => {
                const cor = regiaoSelecionada.cor || coresPadrao[regioes.findIndex(r => r.id === regiaoSelecionada.id) % coresPadrao.length];
                return (
                  <div className="flex gap-3 mb-6 min-w-0">
                    <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}>
                        {regiaoSelecionada.totalDistritos}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Distritos</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}>
                        {regiaoSelecionada.totalDuplas}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Duplas</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-[#16a34a] to-[#22c55e]">
                        {regiaoSelecionada.totalIgrejas || 0}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Igrejas</p>
                      </div>
                    </div>
                    <div className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-[#7B2D8B] to-[#9d4ebd]">
                        {getDistritos(regiaoSelecionada).reduce((acc, d) => acc + (d.membros || 0), 0).toLocaleString('pt-BR')}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Membros</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Título da seção de distritos */}
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-4 h-4 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-sm font-bold text-[#1A3A6B]">
                  Distritos de {regiaoSelecionada.nome}
                </h3>
              </div>

              {/* Loading de distritos */}
              {carregandoDistritos && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-[3px] border-[#1A3A6B]/20">
                    <div className="w-8 h-8 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
                  </div>
                </div>
              )}

              {/* Grid de distritos — horizontal scroll se necessário */}
              {!carregandoDistritos && (
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ minWidth: 0 }}>
                  {getDistritos(regiaoSelecionada).map((distrito) => (
                    <button
                      type="button"
                      key={distrito.id}
                      onClick={() => navigate(`/direto/distritos/${distrito.id}`)}
                      className="flex-shrink-0 w-64 text-left bg-white rounded-xl p-4 border border-gray-100 hover:border-[#1A3A6B]/20 hover:shadow-md transition-all duration-200 group/distrito"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1A3A6B]/10 to-[#1A3A6B]/5 flex items-center justify-center flex-shrink-0 group-hover/distrito:from-[#1A3A6B]/20 group-hover/distrito:to-[#1A3A6B]/10 transition-all duration-300">
                          <svg className="w-5 h-5 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-[#1A3A6B] text-sm group-hover/distrito:text-[#C9963A] transition-colors duration-200 truncate">
                          {distrito.nome}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full bg-[#1A3A6B]/10 flex items-center justify-center text-[8px]">⛪</span>
                          {(distrito.igrejas || []).length} igrejas
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full bg-[#C9963A]/10 flex items-center justify-center text-[8px]">👥</span>
                          {distrito._count?.duplas ?? 0} duplas
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center text-[8px]">👨‍👩‍👧‍👦</span>
                          {(distrito.membros || 0).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#1A3A6B] group-hover/distrito:text-[#C9963A] group-hover/distrito:gap-2.5 transition-all duration-200">
                        <span>Ver duplas</span>
                        <svg className="w-3 h-3 group-hover/distrito:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!carregandoDistritos && getDistritos(regiaoSelecionada).length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">🏛️</div>
                  <p className="text-sm">Nenhum distrito nesta região.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
