import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function ListagemDistritos() {
  const navigate = useNavigate();
  const [distritos, setDistritos] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/distritos')
      .then((res) => setDistritos(res.data))
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }, []);

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-full overflow-y-auto animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Visão Geral</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Todos os Distritos
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Lista completa de distritos da Associação Paulistana</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {distritos.map((distrito) => (
          <button
            key={distrito.id}
            onClick={() => {
              if (window.location.pathname.startsWith('/direto')) {
                navigate(`/direto/distritos/${distrito.id}`);
              } else {
                navigate(`/distritos/${distrito.id}/duplas`);
              }
            }}
            className="w-full text-left card hover:border-[#1A3A6B]/20 group transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1A3A6B]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#1A3A6B]/20 transition-colors">
                <svg className="w-5 h-5 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[#1A3A6B] text-sm group-hover:text-[#C9963A] transition-colors truncate">
                  {distrito.nome}
                </h3>
                {distrito.regiao && (
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
                    {distrito.regiao.nome}
                  </p>
                )}
                
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs text-gray-500 font-medium">
                    <span className="text-green-600 mr-1">👨‍👩‍👧‍👦</span>
                    {(distrito.membros || 0).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-xs text-gray-500 font-medium">
                    <span className="text-[#C9963A] mr-1">👥</span>
                    {distrito._count?.duplas || 0}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {distritos.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-4">🏛️</div>
          <p className="font-medium text-lg">Nenhum distrito encontrado.</p>
        </div>
      )}
    </div>
  );
}
