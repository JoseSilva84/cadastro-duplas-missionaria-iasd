import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { FotoService } from '../foto.service';

const FotoConselheiro = ({ src, nome }) => {
  const inicial = (nome || '?').charAt(0).toUpperCase();
  if (src) return <img src={src} alt={nome || 'Conselheiro'} className="w-16 h-16 rounded-xl object-cover bg-gray-100 shadow-sm" />;
  return (
    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-xl font-bold shadow-sm">
      {inicial}
    </div>
  );
};

export default function Distritos() {
  const { regiaoId } = useParams();
  const navigate = useNavigate();
  const [regiao, setRegiao] = useState(null);
  const [fotoConselheiro, setFotoConselheiro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    api.get(`/regioes/${regiaoId}`)
      .then(async (r) => {
        if (!ativo) return;
        setRegiao(r.data);
        const foto = await FotoService.resolverFotoParaPreview(r.data.fotoConselheiro).catch(() => '');
        if (ativo) setFotoConselheiro(foto);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => { ativo = false; };
  }, [regiaoId]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
        </div>
      </div>
    );
  }

  if (!regiao) return <div className="p-6 text-red-500 animate-fade-in">Região não encontrada.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 mb-6 flex-wrap animate-fade-in-down">
        <button onClick={() => navigate('/regioes')} className="hover:text-[#1A3A6B] transition-colors">
          Regiões
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-[#1A3A6B] font-medium">{regiao.nome}</span>
      </div>

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-8 gap-4 animate-fade-in-down" style={{ animationDelay: '100ms' }}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Região</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            {regiao.nome}
          </h1>
          {regiao.descricao && (
            <p className="text-gray-400 text-xs sm:text-sm mt-1">{regiao.descricao}</p>
          )}
        </div>
        <button
          onClick={() => navigate('/duplas/nova')}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Dupla
        </button>
      </div>

       {/* Indicadores gerais da região */}
      <div className="mb-8 flex justify-start animate-fade-in-down" style={{ animationDelay: '125ms' }}>
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 w-full sm:max-w-md">
          <div className="flex items-center gap-4">
            <FotoConselheiro src={fotoConselheiro} nome={regiao.nomeConselheiro} />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Pr. Departamental / Conselheiro</p>
              <h2 className="text-lg font-bold text-[#1A3A6B] truncate" style={{ fontFamily: 'Georgia, serif' }}>
                {regiao.nomeConselheiro || 'Nao informado'}
              </h2>
              <p className="text-sm text-gray-400 truncate">{regiao.cargoConselheiro || 'Conselheiro Regional'}</p>
            </div>
          </div>
        </div>
      </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 animate-fade-in-down" style={{ animationDelay: '150ms' }}>
        {[
          { label: 'Distritos', valor: regiao.distritos.length, cor: '#1A3A6B', icon: '🏛️', gradient: 'from-[#1A3A6B] to-[#2a5298]' },
          { label: 'Igrejas', valor: regiao.distritos.reduce((acc, d) => acc + d.igrejas.length, 0), cor: '#16a34a', icon: '⛪', gradient: 'from-[#16a34a] to-[#22c55e]' },
          { label: 'Duplas', valor: regiao.distritos.reduce((acc, d) => acc + d._count.duplas, 0), cor: '#C9963A', icon: '👥', gradient: 'from-[#C9963A] to-[#e5b05a]' },
          { label: 'Membros', valor: regiao.distritos.reduce((acc, d) => acc + (d.membros || 0), 0).toLocaleString('pt-BR'), cor: '#7B2D8B', icon: '👨‍👩‍👧‍👦', gradient: 'from-[#7B2D8B] to-[#9333ea]' },
        ].map((item) => (
          <div
            key={item.label}
            className="card group cursor-default"
            style={{ borderTop: `3px solid ${item.cor}` }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl sm:text-2xl shadow-lg group-hover:scale-105 transition-transform duration-300`}>
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

      {/* Lista de distritos */}
      <div className="space-y-3 stagger-children">
        {regiao.distritos.map((distrito) => (
          <button
            key={distrito.id}
            onClick={() => navigate(`/distritos/${distrito.id}/duplas`)}
            className="w-full text-left card border-2 border-transparent hover:border-[#1A3A6B]/20 group transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A3A6B]/10 to-[#1A3A6B]/5 flex items-center justify-center flex-shrink-0 group-hover:from-[#1A3A6B]/20 group-hover:to-[#1A3A6B]/10 transition-all duration-300">
                  <svg className="w-6 h-6 text-[#1A3A6B] group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-[#1A3A6B] text-base group-hover:text-[#C9963A] transition-colors duration-200">{distrito.nome}</h3>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#1A3A6B]/10 flex items-center justify-center text-[10px]">⛪</span>
                      {distrito.igrejas.length} igrejas
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-[#C9963A]/10 flex items-center justify-center text-[10px]">👥</span>
                      {distrito._count.duplas} duplas
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center text-[10px]">👨‍👩‍👧‍👦</span>
                      {(distrito.membros || 0).toLocaleString('pt-BR')} membros
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:block">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${Math.min((distrito._count.duplas / 10) * 100, 100)}%`,
                          background: 'linear-gradient(90deg, #C9963A, #e5b05a)',
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-[#1A3A6B] transition-all duration-200">
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {regiao.distritos.length === 0 && (
        <div className="text-center py-20 text-gray-400 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">🏛️</div>
          <p className="font-medium text-lg">Nenhum distrito nesta região.</p>
        </div>
      )}
    </div>
  );
}
