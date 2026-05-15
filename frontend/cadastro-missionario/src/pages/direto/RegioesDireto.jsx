import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

const coresPadrao = ['#1A3A6B', '#C9963A', '#2D6A4F', '#7B2D8B', '#C44D34'];

export default function RegioesDireto() {
  const navigate = useNavigate();
  const [regioes, setRegioes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [regiaoExpandida, setRegiaoExpandida] = useState(null);
  const [distritosDetalhados, setDistritosDetalhados] = useState({});

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get('/regioes'),
      api.get('/relatorios/resumo'),
    ]).then(([r, s]) => {
      if (!ativo) return;
      setRegioes(r.data);
      setResumo(s.data);
    }).catch(() => {
      if (ativo) setCarregando(false);
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, []);

  async function toggleRegiao(regiaoId) {
    if (regiaoExpandida === regiaoId) {
      setRegiaoExpandida(null);
      return;
    }

    setRegiaoExpandida(regiaoId);

    // Carregar distritos detalhados com igrejas se ainda não carregados
    if (!distritosDetalhados[regiaoId]) {
      try {
        const { data } = await api.get(`/regioes/${regiaoId}`);
        setDistritosDetalhados((prev) => ({
          ...prev,
          [regiaoId]: data.distritos || [],
        }));
      } catch {
        setDistritosDetalhados((prev) => ({
          ...prev,
          [regiaoId]: [],
        }));
      }
    }
  }

  // Obtém os distritos de uma região (do detalhamento ou do resumo)
  function getDistritos(regiao) {
    return distritosDetalhados[regiao.id] ?? regiao.distritos ?? [];
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Cabeçalho */}
      <div className="mb-8 animate-fade-in-down">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Visão Geral</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Regiões Missionárias
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Associação Paulistana — Igreja Adventista do Sétimo Dia</p>
      </div>

      {/* Indicadores gerais */}
      {resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 stagger-children">
          {[
            { label: 'Total de Duplas', valor: resumo.totalDuplas, cor: '#1A3A6B', icon: '✝️', gradient: 'from-[#1A3A6B] to-[#2a5298]' },
            { label: 'Duplas Ativas', valor: resumo.totalAtivas, cor: '#16a34a', icon: '✅', gradient: 'from-[#16a34a] to-[#22c55e]' },
            { label: 'Duplas Pendentes', valor: resumo.totalPendentes, cor: '#C9963A', icon: '⏳', gradient: 'from-[#C9963A] to-[#e5b05a]' },
            { label: 'Pessoas Alcançadas', valor: resumo.totalPessoasAlcancadas, cor: '#7B2D8B', icon: '🙏', gradient: 'from-[#7B2D8B] to-[#9333ea]' },
          ].map((item) => (
            <div
              key={item.label}
              className="card group hover:-translate-y-1 transition-all duration-300 cursor-default"
              style={{ borderTop: `3px solid ${item.cor}` }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl sm:text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  {item.icon}
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold" style={{ color: item.cor }}>{item.valor}</p>
                  <p className="text-gray-500 text-xs font-medium">{item.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Master-Detail: Regiões com distritos expandidos inline */}
      <div className="space-y-4 stagger-children">
        {regioes.map((regiao, idx) => {
          const cor = regiao.cor || coresPadrao[idx % coresPadrao.length];
          const expandido = regiaoExpandida === regiao.id;
          const distritos = getDistritos(regiao);

          return (
            <div
              key={regiao.id}
              className="rounded-2xl overflow-hidden bg-white shadow-md transition-all duration-300"
            >
              {/* Master: Região */}
              <button
                type="button"
                onClick={() => toggleRegiao(regiao.id)}
                className="w-full text-left group"
              >
                <div className="relative">
                  <div
                    className="h-1.5"
                    style={{ background: `linear-gradient(90deg, ${cor}, ${cor}88, ${cor})` }}
                  />
                  <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-110"
                          style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
                        >
                          {regiao.nome.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-[#1A3A6B] group-hover:text-[#C9963A] transition-colors duration-200" style={{ fontFamily: 'Georgia, serif' }}>
                            {regiao.nome}
                          </h2>
                          {regiao.descricao && (
                            <p className="text-gray-400 text-xs mt-0.5">{regiao.descricao}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-3">
                          <div className="text-center">
                            <p className="text-lg font-bold" style={{ color: cor }}>{regiao.totalDistritos}</p>
                            <p className="text-gray-400 text-[10px]">Distritos</p>
                          </div>
                          <div className="w-px h-8 bg-gray-200" />
                          <div className="text-center">
                            <p className="text-lg font-bold" style={{ color: cor }}>{regiao.totalDuplas}</p>
                            <p className="text-gray-400 text-[10px]">Duplas</p>
                          </div>
                        </div>

                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${expandido ? 'bg-[#1A3A6B] text-white rotate-180' : 'bg-gray-100 text-gray-400 group-hover:bg-[#1A3A6B] group-hover:text-white'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:hidden items-center gap-4 mt-3">
                      <div className="rounded-lg px-3 py-1.5" style={{ backgroundColor: cor + '10' }}>
                        <span className="text-sm font-bold" style={{ color: cor }}>{regiao.totalDistritos}</span>
                        <span className="text-gray-400 text-xs ml-1">distritos</span>
                      </div>
                      <div className="rounded-lg px-3 py-1.5" style={{ backgroundColor: cor + '10' }}>
                        <span className="text-sm font-bold" style={{ color: cor }}>{regiao.totalDuplas}</span>
                        <span className="text-gray-400 text-xs ml-1">duplas</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Detail: Distritos da região (expandido inline) */}
              {expandido && (
                <div className="border-t border-gray-100 bg-[#F4F5F7]/50 animate-fade-in">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-4 h-4 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <h3 className="text-sm font-bold text-[#1A3A6B]">Distritos de {regiao.nome}</h3>
                    </div>

                    {/* Loading de distritos */}
                    {distritosDetalhados[regiao.id] === undefined && (
                      <div className="flex items-center justify-center py-6">
                        <div className="w-8 h-8 rounded-full border-[3px] border-[#1A3A6B]/20">
                          <div className="w-8 h-8 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {distritos.map((distrito) => (
                        <button
                          type="button"
                          key={distrito.id}
                          onClick={() => navigate(`/direto/distritos/${distrito.id}`)}
                          className="text-left bg-white rounded-xl p-4 border border-gray-100 hover:border-[#1A3A6B]/20 hover:shadow-md transition-all duration-200 group/distrito"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#1A3A6B]/10 to-[#1A3A6B]/5 flex items-center justify-center flex-shrink-0 group-hover/distrito:from-[#1A3A6B]/20 group-hover/distrito:to-[#1A3A6B]/10 transition-all duration-300">
                              <svg className="w-4 h-4 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

                    {distritos.length === 0 && distritosDetalhados[regiao.id] !== undefined && (
                      <div className="text-center py-8 text-gray-400">
                        <div className="text-3xl mb-2">🏛️</div>
                        <p className="text-sm">Nenhum distrito nesta região.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {regioes.length === 0 && (
        <div className="text-center py-20 text-gray-400 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">✝️</div>
          <p className="font-medium text-lg">Nenhuma região cadastrada.</p>
          <p className="text-sm mt-1">Execute o seed do banco de dados para iniciar.</p>
        </div>
      )}
    </div>
  );
}
