import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../lib/api';
import IgrejaCapa from '../../components/IgrejaCapa';
import { ehAdmin, useAuth } from '../../contexts/AuthContext';

export default function ListagemIgrejasDireto() {
  const navigate = useNavigate();
  const { igrejaId } = useParams();
  const { usuario } = useAuth();
  const podeExcluir = ehAdmin(usuario);
  const [igrejas, setIgrejas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [igrejaSelecionada, setIgrejaSelecionada] = useState(null);
  const [busca, setBusca] = useState('');
  const [mostraDetalhe, setMostraDetalhe] = useState(false);

  useEffect(() => {
    api.get('/igrejas')
      .then((res) => {
        setIgrejas(res.data);
        if (res.data.length > 0) {
          const igrejaDaRota = igrejaId
            ? res.data.find((igreja) => String(igreja.id) === String(igrejaId))
            : null;
          setIgrejaSelecionada(igrejaDaRota || res.data[0]);
          setMostraDetalhe(Boolean(igrejaDaRota));
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }, [igrejaId]);

  const igrejasFiltradas = igrejas.filter((ig) => {
    const q = busca.toLowerCase();
    return !q || ig.nome.toLowerCase().includes(q) || ig.distrito?.nome?.toLowerCase().includes(q);
  });

  const excluirIgreja = async () => {
    if (!igrejaSelecionada) return;
    if (!window.confirm(`Excluir ${igrejaSelecionada.nome} e todos os cadastros vinculados?`)) return;
    try {
      await api.delete(`/igrejas/${igrejaSelecionada.id}`);
      setIgrejas((lista) => {
        const novaLista = lista.filter((igreja) => igreja.id !== igrejaSelecionada.id);
        const proxima = novaLista[0] || null;
        setIgrejaSelecionada(proxima);
        if (proxima) navigate(`/direto/igrejas/${proxima.id}`);
        else navigate('/direto/igrejas');
        return novaLista;
      });
      setMostraDetalhe(false);
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao remover igreja.');
    }
  };

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
      <div className={`${mostraDetalhe ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 bg-white flex-col h-full overflow-hidden`}>
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Geral</p>
          </div>
          <h1 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Todas as Igrejas
          </h1>
          <p className="text-gray-400 text-[10px] mt-1">{igrejas.length} igrejas encontradas</p>

          <div className="relative mt-3">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou distrito..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/20 focus:border-[#1A3A6B]/40 bg-gray-50 text-gray-700 placeholder-gray-400 transition-all"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {igrejasFiltradas.length === 0 && (
            <div className="py-10 text-center text-gray-400 text-xs">
              {busca ? `Nenhuma igreja encontrada para "${busca}".` : 'Nenhuma igreja cadastrada.'}
            </div>
          )}
          {igrejasFiltradas.map((igreja) => {
            const selecionado = igrejaSelecionada?.id === igreja.id;

            return (
              <button
                type="button"
                key={igreja.id}
                onClick={() => {
                  setIgrejaSelecionada(igreja);
                  setMostraDetalhe(true);
                  navigate(`/direto/igrejas/${igreja.id}`);
                }}
                className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                  selecionado
                    ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]'
                    : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
                }`}
              >
                <div className="px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg bg-[#16a34a]/10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${selecionado ? 'scale-110' : ''}`}>
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
                      <p className="text-gray-400 text-[10px] mt-0.5">
                        {(igreja.membros || 0).toLocaleString('pt-BR')} membros
                      </p>
                      {igreja.classeBiblica && (
                        <p className="text-[10px] text-gray-500 mt-1">
                          {igreja.classeBiblica.classe ? `Classe ${igreja.classeBiblica.classe}` : 'Sem classificação'} · {igreja.classeBiblica.totalEstudantes || 0} estudantes
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${mostraDetalhe ? 'flex' : 'hidden sm:flex'} flex-1 flex-col h-full overflow-hidden bg-[#F4F5F7]`}>
        {!igrejaSelecionada ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <p className="font-medium text-lg">Selecione uma igreja</p>
              <p className="text-sm mt-1">Clique em uma igreja à esquerda para ver os detalhes.</p>
            </div>
          </div>
        ) : (
          <div key={igrejaSelecionada.id} className="flex flex-col h-full animate-slide-in-right">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
              <button
                type="button"
                onClick={() => setMostraDetalhe(false)}
                className="sm:hidden flex items-center gap-1.5 text-xs text-[#1A3A6B] font-semibold mb-3 hover:text-[#C9963A] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar à lista
              </button>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Capa da Igreja</p>
                  <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                    {igrejaSelecionada.nome}
                  </h2>
                </div>
                {podeExcluir && (
                  <button
                    type="button"
                    onClick={excluirIgreja}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <IgrejaCapa
                igreja={igrejaSelecionada}
                onNovaDupla={() => navigate(`/direto/duplas/nova?igrejaId=${igrejaSelecionada.id}&distritoId=${igrejaSelecionada.distritoId}`)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
