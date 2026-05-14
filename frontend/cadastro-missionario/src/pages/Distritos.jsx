import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function Distritos() {
  const { regiaoId } = useParams();
  const navigate = useNavigate();
  const [regiao, setRegiao] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get(`/regioes/${regiaoId}`)
      .then((r) => setRegiao(r.data))
      .finally(() => setCarregando(false));
  }, [regiaoId]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!regiao) return <div className="p-6 text-red-500">Região não encontrada.</div>;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6 flex-wrap">
        <button onClick={() => navigate('/regioes')} className="hover:text-[#1A3A6B] transition-colors">
          Regiões
        </button>
        <span>/</span>
        <span className="text-[#1A3A6B] font-medium">{regiao.nome}</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
        <div>
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Região</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            {regiao.nome}
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">{regiao.descricao}</p>
        </div>
        <button
          onClick={() => navigate('/duplas/nova')}
          className="btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Dupla
        </button>
      </div>

      {/* Lista de distritos */}
      <div className="space-y-4">
        {regiao.distritos.map((distrito) => (
          <button
            key={distrito.id}
            onClick={() => navigate(`/distritos/${distrito.id}/duplas`)}
            className="w-full text-left card hover:border-[#1A3A6B]/30 border-2 border-transparent group transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Ícone do distrito */}
                <div className="w-12 h-12 rounded-xl bg-[#1A3A6B]/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-[#1A3A6B] text-base">{distrito.nome}</h3>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      ⛪ {distrito.igrejas.length} igrejas
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      👥 {distrito._count.duplas} duplas
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Barra de progresso das duplas */}
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#C9963A] rounded-full transition-all"
                        style={{ width: `${Math.min((distrito._count.duplas / 10) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-[#1A3A6B] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {regiao.distritos.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🏛️</p>
          <p className="font-medium">Nenhum distrito nesta região.</p>
        </div>
      )}
    </div>
  );
}
