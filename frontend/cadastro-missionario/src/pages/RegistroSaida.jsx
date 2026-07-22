import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';
import { FotoService } from '../foto.service';

const Campo = ({ label, children, obrigatorio }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-600 mb-1.5">
      {label} {obrigatorio && <span className="text-red-400">*</span>}
    </span>
    {children}
  </label>
);

const FotoMini = ({ src, nome }) => {
  const inicial = (nome || '?').charAt(0).toUpperCase();
  if (src) return <img src={src} alt={nome} className="w-8 h-8 rounded-full object-cover ring-1 ring-white shadow-sm" />;
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-xs font-bold ring-1 ring-white shadow-sm">
      {inicial}
    </div>
  );
};

const SkeletonDuplas = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4].map((item) => (
      <div key={item} className="rounded-xl border-2 border-gray-100 bg-white p-3 flex items-center gap-3">
        <div className="skeleton w-5 h-5 rounded" />
        <div className="flex items-center -space-x-2">
          <div className="skeleton w-8 h-8 rounded-full" />
          <div className="skeleton w-8 h-8 rounded-full" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/5" />
          <div className="skeleton h-3 w-2/5" />
        </div>
      </div>
    ))}
  </div>
);

export default function RegistroSaida() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');

  const [duplas, setDuplas] = useState([]);
  const [duplasSelecionadas, setDuplasSelecionadas] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [coordenadorId, setCoordenadorId] = useState('');
  const [dataSaida, setDataSaida] = useState(new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');
  const [busca, setBusca] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/duplas'),
      api.get('/acompanhamentos/coordenadores'),
    ]).then(async ([duplasRes, coordenadoresRes]) => {
      const lista = Array.isArray(duplasRes.data) ? duplasRes.data : [];
      const listaCoordenadores = Array.isArray(coordenadoresRes.data) ? coordenadoresRes.data : [];
      const listaComFotos = await Promise.all(
        lista.map(async (d) => {
          const [fotoLiderPreview, fotoMembro2Preview] = await Promise.all([
            FotoService.resolverFotoParaPreview(d.fotoLider).catch(() => ''),
            FotoService.resolverFotoParaPreview(d.fotoMembro2).catch(() => ''),
          ]);
          return { ...d, fotoLiderPreview, fotoMembro2Preview };
        })
      );
      setDuplas(listaComFotos);
      setCoordenadores(listaCoordenadores);
      if (listaCoordenadores.length === 1) {
        setCoordenadorId(String(listaCoordenadores[0].id));
      }
    }).catch(() => {
      toast.error('Erro ao carregar dados do registro de assistência.');
    }).finally(() => setCarregando(false));
  }, []);

  const duplasFiltradas = duplas.filter((d) => {
    if (!busca) return true;
    const termo = busca.toLowerCase();
    return (
      (d.liderNome || '').toLowerCase().includes(termo) ||
      (d.membro2Nome || '').toLowerCase().includes(termo) ||
      (d.bairro || '').toLowerCase().includes(termo)
    );
  });

  const toggleDupla = (id) => {
    setDuplasSelecionadas((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!coordenadorId) {
      toast.error('Selecione o coordenador regional que fez a assistência.');
      return;
    }
    if (duplasSelecionadas.length === 0) {
      toast.error('Selecione ao menos uma dupla acompanhada.');
      return;
    }

    setEnviando(true);
    try {
      await api.post('/acompanhamentos', {
        dataSaida,
        coordenadorId,
        observacoes: observacoes || null,
        duplaIds: duplasSelecionadas,
      });
      toast.success(`Assistência registrada! ${duplasSelecionadas.length} dupla(s) acompanhada(s).`);
      setTimeout(() => navigate(isDireto ? '/direto/duplas' : '/duplas'), 800);
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((erro) => erro.msg).join(', ') : err.response?.data?.erro || 'Erro ao registrar assistência.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in' : 'min-h-screen animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8 p-4 sm:p-6'}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Coordenador</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Registro de Assistência (Coordenador Regional)
        </h1>
        <p className="text-gray-400 text-sm mt-1">Selecione o coordenador regional e marque as duplas acompanhadas</p>
      </div>

      <form onSubmit={handleSubmit} className={isDireto ? 'flex-1 flex flex-col min-h-0' : ''}>
        <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F5F7]' : 'p-4 sm:p-6'}>
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="card">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">1</div>
                <h2 className="font-bold text-[#1A3A6B]">Coordenador Regional</h2>
              </div>
              <Campo label="Nome do coordenador que fez a assistência" obrigatorio>
                <select className="input-field" value={coordenadorId} onChange={(e) => setCoordenadorId(e.target.value)} required>
                  <option value="">Selecione o coordenador regional</option>
                  {coordenadores.map((coordenador) => (
                    <option key={coordenador.id} value={coordenador.id}>
                      {coordenador.nome}{coordenador.regiao?.nome ? ` - ${coordenador.regiao.nome}` : ''}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">2</div>
                <h2 className="font-bold text-[#1A3A6B]">Data da Assistência</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo label="Data da visita" obrigatorio>
                  <input type="date" className="input-field" value={dataSaida} onChange={(e) => setDataSaida(e.target.value)} required />
                </Campo>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">3</div>
                <div>
                  <h2 className="font-bold text-[#1A3A6B]">Duplas Acompanhadas</h2>
                  {duplasSelecionadas.length > 0 && (
                    <p className="text-xs text-[#C9963A] font-medium">{duplasSelecionadas.length} selecionada(s)</p>
                  )}
                </div>
              </div>

              <div className="relative mb-4">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Filtrar duplas por nome ou bairro..."
                  className="input-field pl-12"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>

              {carregando ? (
                <SkeletonDuplas />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {duplasFiltradas.map((dupla) => {
                    const selecionada = duplasSelecionadas.includes(dupla.id);
                    return (
                      <button
                        key={dupla.id}
                        type="button"
                        onClick={() => toggleDupla(dupla.id)}
                        className={`w-full min-h-[64px] text-left rounded-xl border-2 p-3 transition-all duration-200 flex items-center gap-3 active:scale-[0.99] active:opacity-80 ${
                          selecionada ? 'border-[#1A3A6B] bg-[#1A3A6B]/5' : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          selecionada ? 'bg-[#1A3A6B] border-[#1A3A6B]' : 'border-gray-300 bg-white'
                        }`}>
                          {selecionada && (
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        <div className="flex items-center -space-x-2 flex-shrink-0">
                          <FotoMini src={dupla.fotoLiderPreview} nome={dupla.liderNome} />
                          <FotoMini src={dupla.fotoMembro2Preview} nome={dupla.membro2Nome} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-sm truncate ${selecionada ? 'text-[#1A3A6B]' : 'text-gray-700'}`}>
                            {dupla.liderNome} + {dupla.membro2Nome}
                          </p>
                          {dupla.bairro && <p className="text-xs text-gray-400 truncate">{dupla.bairro}</p>}
                        </div>

                        {dupla.ultimoAcompanhamento && (
                          <span className="hidden sm:inline text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                            {new Date(dupla.ultimoAcompanhamento).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {duplasFiltradas.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <p>Nenhuma dupla encontrada.</p>
                    </div>
                  )}
                </div>
              )}

              {duplasSelecionadas.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button type="button" onClick={() => setDuplasSelecionadas([])} className="min-h-11 text-xs text-gray-400 hover:text-gray-600 transition-colors active:scale-95">
                    Limpar seleção
                  </button>
                </div>
              )}
            </div>

            <div className="card">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">4</div>
                <h2 className="font-bold text-[#1A3A6B]">Relatório do Acompanhamento</h2>
              </div>
              <Campo label="Relatório">
                <textarea
                  className="input-field min-h-32 resize-y"
                  placeholder="Descreva como foi o acompanhamento, orientações dadas, necessidades identificadas e próximos passos..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                />
              </Campo>
            </div>
          </div>
        </div>

        <div className={isDireto
          ? 'flex-shrink-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3'
          : 'max-w-3xl mx-auto flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 sm:p-6 pb-24 sm:pb-8'
        }>
          <div className="text-sm text-gray-500">
            {duplasSelecionadas.length > 0
              ? <span className="font-medium text-[#1A3A6B]">{duplasSelecionadas.length} dupla(s) selecionada(s)</span>
              : 'Nenhuma dupla selecionada'}
          </div>
          <div className="flex w-full sm:w-auto gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1 sm:flex-none">Cancelar</button>
            <button
              type="submit"
              disabled={enviando || duplasSelecionadas.length === 0 || !coordenadorId}
              className="btn-primary flex flex-1 sm:flex-none items-center justify-center gap-2"
            >
              {enviando ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Registrando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Registrar Assistência
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
