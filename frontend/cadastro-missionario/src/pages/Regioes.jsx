import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

// Cores padrão para regiões sem cor definida
const coresPadrao = ['#1A3A6B', '#C9963A', '#2D6A4F', '#7B2D8B', '#C44D34'];

export default function Regioes() {
  const navigate = useNavigate();
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

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando regiões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6 sm:mb-8">
        <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Painel Geral</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B] mt-1" style={{ fontFamily: 'Georgia, serif' }}>
          Regiões Missionárias
        </h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-1">Associação Paulistana — Igreja Adventista do Sétimo Dia</p>
      </div>

      {/* Indicadores gerais */}
      {resumo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total de Duplas', valor: resumo.totalDuplas, cor: '#1A3A6B', icon: '✝️' },
            { label: 'Duplas Ativas', valor: resumo.totalAtivas, cor: '#16a34a', icon: '✅' },
            { label: 'Duplas Pendentes', valor: resumo.totalPendentes, cor: '#C9963A', icon: '⏳' },
            { label: 'Pessoas Alcançadas', valor: resumo.totalPessoasAlcancadas, cor: '#2a5298', icon: '🙏' },
          ].map((item) => (
            <div key={item.label} className="card flex items-center gap-2 sm:gap-4 p-3 sm:p-6">
              <span className="text-2xl sm:text-3xl">{item.icon}</span>
              <div>
                <p className="text-xl sm:text-2xl font-bold" style={{ color: item.cor }}>{item.valor}</p>
                <p className="text-gray-500 text-xs font-medium">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid de regiões */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {regioes.map((regiao, idx) => {
          const cor = regiao.cor || coresPadrao[idx % coresPadrao.length];
          return (
            <button
              key={regiao.id}
              onClick={() => navigate(`/regioes/${regiao.id}/distritos`)}
              className="text-left group cursor-pointer"
            >
              <div
                className="rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1"
              >
                {/* Faixa colorida */}
                <div className="h-2" style={{ backgroundColor: cor }} />

                {/* Corpo do card */}
                <div className="bg-white p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                        {regiao.nome}
                      </h2>
                      {regiao.descricao && (
                        <p className="text-gray-400 text-xs mt-0.5">{regiao.descricao}</p>
                      )}
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                      style={{ backgroundColor: cor }}
                    >
                      {regiao.nome.charAt(0)}
                    </div>
                  </div>

                  {/* Contadores */}
                  <div
                    className="rounded-xl p-4 flex justify-around"
                    style={{ backgroundColor: cor + '15' }}
                  >
                    <div className="text-center">
                      <p className="text-xl font-bold" style={{ color: cor }}>{regiao.totalDistritos}</p>
                      <p className="text-gray-500 text-xs">Distritos</p>
                    </div>
                    <div className="w-px bg-gray-200" />
                    <div className="text-center">
                      <p className="text-xl font-bold" style={{ color: cor }}>{regiao.totalDuplas}</p>
                      <p className="text-gray-500 text-xs">Duplas</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1 text-xs font-medium" style={{ color: cor }}>
                    <span>Ver distritos</span>
                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {regioes.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">✝️</p>
          <p className="font-medium">Nenhuma região cadastrada.</p>
          <p className="text-sm mt-1">Execute o seed do banco de dados para iniciar.</p>
        </div>
      )}
    </div>
  );
}
