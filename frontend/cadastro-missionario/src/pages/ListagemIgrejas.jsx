import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function ListagemIgrejas() {
  const [igrejas, setIgrejas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/igrejas')
      .then((res) => setIgrejas(res.data))
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
          Todas as Igrejas
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Lista completa de congregações da Associação Paulistana</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
        {igrejas.map((igreja) => (
          <div
            key={igreja.id}
            className="w-full text-left card hover:border-[#1A3A6B]/20 group transition-all duration-300 hover:-translate-y-1 cursor-default"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#16a34a]/10 to-[#22c55e]/10 flex items-center justify-center flex-shrink-0 group-hover:from-[#16a34a]/20 group-hover:to-[#22c55e]/20 transition-colors">
                <span className="text-xl">⛪</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[#1A3A6B] text-sm truncate">
                  {igreja.nome}
                </h3>
                {igreja.distrito && (
                  <p className="text-[10px] text-gray-400 tracking-wide mt-0.5 truncate">
                    {igreja.distrito.nome} {igreja.distrito.regiao && `• ${igreja.distrito.regiao.nome}`}
                  </p>
                )}
                
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-xs text-gray-500 font-medium bg-gray-50 px-2 py-1 rounded-md">
                    <span className="text-green-600 mr-1">👨‍👩‍👧‍👦</span>
                    {(igreja.membros || 0).toLocaleString('pt-BR')} membros
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {igrejas.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-4">⛪</div>
          <p className="font-medium text-lg">Nenhuma igreja encontrada.</p>
        </div>
      )}
    </div>
  );
}
