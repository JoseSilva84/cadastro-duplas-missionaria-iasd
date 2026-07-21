import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import IgrejaCapa from '../components/IgrejaCapa';
import { ehAdmin, useAuth } from '../contexts/AuthContext';

export default function ListagemIgrejas() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const podeExcluir = ehAdmin(usuario);
  const [igrejas, setIgrejas] = useState([]);
  const [igrejaSelecionada, setIgrejaSelecionada] = useState(null);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/igrejas')
      .then((res) => {
        setIgrejas(res.data);
        if (res.data.length > 0) setIgrejaSelecionada(res.data[0]);
      })
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }, []);

  const igrejasFiltradas = igrejas.filter((ig) => {
    const termo = busca.toLowerCase();
    return !termo || ig.nome.toLowerCase().includes(termo) || ig.distrito?.nome?.toLowerCase().includes(termo);
  });

  const excluirIgreja = async () => {
    if (!igrejaSelecionada) return;
    if (!window.confirm(`Excluir ${igrejaSelecionada.nome} e todos os cadastros vinculados?`)) return;
    try {
      await api.delete(`/igrejas/${igrejaSelecionada.id}`);
      setIgrejas((lista) => {
        const novaLista = lista.filter((igreja) => igreja.id !== igrejaSelecionada.id);
        setIgrejaSelecionada(novaLista[0] || null);
        return novaLista;
      });
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao remover igreja.');
    }
  };

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Geral</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Todas as Igrejas
          </h1>
          <p className="text-gray-400 text-xs mt-1">{igrejas.length} congregações cadastradas</p>
        </div>
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou distrito..."
            className="input-field pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {podeExcluir && igrejaSelecionada && (
          <button
            type="button"
            onClick={excluirIgreja}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            Excluir igreja
          </button>
        )}
      </div>

      <div className="flex flex-col xl:flex-row gap-6 min-h-[520px]">
        <div className="xl:w-80 flex-shrink-0 bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <div className="max-h-[260px] xl:max-h-[calc(100vh-260px)] overflow-y-auto">
            {igrejasFiltradas.map((igreja) => {
              const sel = igrejaSelecionada?.id === igreja.id;
              const totalDuplas = igreja._count?.duplas ?? igreja.duplas?.length ?? 0;
              return (
                <div
                  key={igreja.id}
                  className={`w-full text-left px-4 py-3.5 border-l-[3px] transition-all duration-200 ${
                    sel ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]' : 'border-l-transparent hover:bg-gray-50'
                  }`}
                >
                  <button type="button" onClick={() => setIgrejaSelecionada(igreja)} className="w-full text-left flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0 transition-transform ${sel ? 'scale-110' : ''}`}>
                      <span className="text-lg">⛪</span>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${sel ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>{igreja.nome}</p>
                      {igreja.distrito && (
                        <p className="text-[10px] text-gray-400 truncate uppercase tracking-wide">{igreja.distrito.nome}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5">{(igreja.membros || 0).toLocaleString('pt-BR')} membros</p>
                      {igreja.classeBiblica && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          {igreja.classeBiblica.classe ? `Classe ${igreja.classeBiblica.classe}` : 'Sem classificação'} · {igreja.classeBiblica.totalEstudantes || 0} estudantes
                        </p>
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/duplas?igrejaId=${igreja.id}`)}
                    className="mt-2 inline-flex min-h-0 items-center gap-1 rounded-full bg-[#1A3A6B]/8 px-2 py-1 text-[10px] font-bold text-[#1A3A6B] transition hover:bg-[#1A3A6B] hover:text-white"
                    title={`Ver duplas de ${igreja.nome}`}
                  >
                    👥 {totalDuplas} dupla{totalDuplas === 1 ? '' : 's'}
                  </button>
                </div>
              );
            })}
            {igrejasFiltradas.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">Nenhuma igreja encontrada.</div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {igrejaSelecionada && (
            <IgrejaCapa
              igreja={igrejaSelecionada}
              onNovaDupla={() => navigate(`/duplas/nova?igrejaId=${igrejaSelecionada.id}&distritoId=${igrejaSelecionada.distritoId}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
