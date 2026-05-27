import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ehAdmin, useAuth } from '../contexts/AuthContext';

const coresPadrao = ['#1A3A6B', '#C9963A', '#2D6A4F', '#7B2D8B', '#C44D34'];

export default function Regioes() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const podeExcluir = ehAdmin(usuario);
  const [regioes, setRegioes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/regioes'),
      api.get('/relatorios/resumo'),
    ]).then(([r, s]) => {
      setRegioes(r.data);
      setResumo(s.data);
    }).finally(() => setCarregando(false));
  }, []);

  const excluirRegiao = async (event, regiao) => {
    event.stopPropagation();
    if (!window.confirm(`Excluir ${regiao.nome} e todos os cadastros vinculados?`)) return;
    try {
      await api.delete(`/regioes/${regiao.id}`);
      setRegioes((lista) => lista.filter((item) => item.id !== regiao.id));
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao remover região.');
    }
  };

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
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Painel Geral</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Regiões Missionárias
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Associação Paulistana — Igreja Adventista do Sétimo Dia</p>
      </div>

       {/* Indicadores gerais */}
       {resumo && (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 stagger-children">
          {[
            { label: 'Total de Duplas', valor: resumo.totalDuplas, cor: '#1A3A6B', icon: '✝️', gradient: 'from-[#1A3A6B] to-[#2a5298]' },
            { label: 'Duplas Ativas', valor: resumo.totalAtivas, cor: '#16a34a', icon: '✅', gradient: 'from-[#16a34a] to-[#22c55e]' },
            { label: 'Duplas Pendentes', valor: resumo.totalPendentes, cor: '#C9963A', icon: '⏳', gradient: 'from-[#C9963A] to-[#e5b05a]' },
            { label: 'Metas de Contatos', valor: resumo.totalPessoasAlcancadas, cor: '#7B2D8B', icon: '🙏', gradient: 'from-[#7B2D8B] to-[#9333ea]' },
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

      {/* Grid de regiões */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
        {regioes.map((regiao, idx) => {
          const cor = regiao.cor || coresPadrao[idx % coresPadrao.length];
          return (
            <div
              key={regiao.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/regioes/${regiao.id}/distritos`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') navigate(`/regioes/${regiao.id}/distritos`);
              }}
              className="text-left group cursor-pointer"
            >
              <div
                className="rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300 group-hover:-translate-y-2"
              >
                {/* Faixa colorida com gradiente */}
                <div
                  className="h-1.5 animate-gradient"
                  style={{ background: `linear-gradient(90deg, ${cor}, ${cor}88, ${cor})`, backgroundSize: '200% 100%' }}
                />

                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#1A3A6B] group-hover:text-[#C9963A] transition-colors duration-200" style={{ fontFamily: 'Georgia, serif' }}>
                        {regiao.nome}
                      </h2>
                      {regiao.descricao && (
                        <p className="text-gray-400 text-xs mt-0.5">{regiao.descricao}</p>
                      )}
                    </div>
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-md group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
                      style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
                    >
                      {regiao.nome.charAt(0)}
                    </div>
                  </div>

                  {/* Contadores */}
                  <div
                    className="rounded-xl p-4 flex justify-around transition-all duration-300 group-hover:scale-[1.02]"
                    style={{ backgroundColor: cor + '10' }}
                  >
                    <div className="text-center">
                      <p className="text-xl font-bold" style={{ color: cor }}>{regiao.totalDistritos}</p>
                      <p className="text-gray-500 text-xs">Distritos</p>
                    </div>
                    <div className="w-px bg-gray-200/60" />
                    <div className="text-center">
                      <p className="text-xl font-bold" style={{ color: cor }}>{regiao.totalDuplas}</p>
                      <p className="text-gray-500 text-xs">Duplas</p>
                    </div>
                    <div className="w-px bg-gray-200/60" />
                    <div className="text-center">
                      <p className="text-xl font-bold" style={{ color: cor }}>{(regiao.totalMembros || 0).toLocaleString('pt-BR')}</p>
                      <p className="text-gray-500 text-xs">Membros</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold group-hover:gap-2.5 transition-all duration-200" style={{ color: cor }}>
                    <span>Ver distritos</span>
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  {podeExcluir && (
                    <button
                      type="button"
                      onClick={(event) => excluirRegiao(event, regiao)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
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
