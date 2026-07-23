import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { FotoService } from '../foto.service';

const resolverFotosDaDupla = async (dupla) => {
  const [fotoLiderPreview, fotoMembro2Preview] = await Promise.all([
    FotoService.resolverFotoParaPreview(dupla.fotoLider).catch(() => ''),
    FotoService.resolverFotoParaPreview(dupla.fotoMembro2).catch(() => ''),
  ]);
  return { ...dupla, fotoLiderPreview, fotoMembro2Preview };
};

const FotoDupla = ({ src, nome, className, fallbackClassName }) => {
  const inicial = (nome || '?').charAt(0).toUpperCase();
  if (src) {
    return <img src={src} alt={nome || 'Foto'} className={`${className} object-cover bg-gray-100`} />;
  }
  return (
    <div className={`${className} ${fallbackClassName} flex items-center justify-center text-white font-bold`}>
      {inicial}
    </div>
  );
};

const BadgeEstudo = ({ status }) => {
  if (!status) return null;
  const map = { ATIVO: 'bg-blue-100 text-blue-700', DESATIVADO: 'bg-yellow-100 text-yellow-700', TERMINADO: 'bg-green-100 text-green-700' };
  const label = { ATIVO: 'Ativo', DESATIVADO: 'Pausado', TERMINADO: 'Concluído' };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>{label[status]}</span>;
};

const BadgeEvangelismo = ({ status }) => {
  if (!status) return null;
  const map = { ATIVO: 'bg-orange-100 text-orange-700', TERMINADO: 'bg-green-100 text-green-700' };
  const label = { ATIVO: 'Ativo', TERMINADO: 'Terminado' };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status]}`}>{label[status]}</span>;
};

const IconBase = ({ children, className = 'w-5 h-5 text-white' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const MembersIcon = () => (
  <IconBase>
    <circle cx="8" cy="8" r="3" strokeWidth={2} />
    <circle cx="16" cy="8" r="3" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-1a5 5 0 015-5M21 21v-1a5 5 0 00-5-5M8 15h8" />
  </IconBase>
);

const ChurchIcon = () => (
  <IconBase>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v8M9 6h6M4 21v-8a2 2 0 012-2h12a2 2 0 012 2v8" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 21v-5a3 3 0 016 0v5M2 21h20" />
  </IconBase>
);

const UsersIcon = () => (
  <IconBase>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </IconBase>
);

const BookOpenIcon = () => (
  <IconBase>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v14" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5.5A2.5 2.5 0 015.5 3H12v18H5.5A2.5 2.5 0 013 18.5v-13zM12 3h6.5A2.5 2.5 0 0121 5.5v13a2.5 2.5 0 01-2.5 2.5H12V3z" />
  </IconBase>
);

const MegaphoneIcon = () => (
  <IconBase>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13V8a2 2 0 012-2h2l9-3v16l-9-3H6a2 2 0 01-2-2v-1z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l1.5 4H12l-1.5-4M20 8.5a4 4 0 010 5" />
  </IconBase>
);

const DropletIcon = () => (
  <IconBase>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3.5S5.5 10.4 5.5 15a6.5 6.5 0 0013 0C18.5 10.4 12 3.5 12 3.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 16.5A3.2 3.2 0 0012 19" />
  </IconBase>
);

const getResumoDistrito = (distrito) => {
  const duplas = distrito?.duplas || [];
  return {
    duplas,
    estudosAtivos: duplas.filter(d => d.statusEstudoBiblico === 'ATIVO').length,
    evangelismosAtivos: duplas.filter(d => d.statusEvangelismo === 'ATIVO').length,
    totalBatismos: duplas.reduce((acc, d) => acc + (d.batismos || 0), 0),
  };
};

function ModalParcialDistrito({ distrito, onClose, navigate }) {
  if (!distrito) return null;

  const { duplas, estudosAtivos, evangelismosAtivos, totalBatismos } = getResumoDistrito(distrito);
  const indicadores = [
    { label: 'Membros', valor: (distrito.membros || 0).toLocaleString('pt-BR'), icon: <MembersIcon />, gradient: 'from-[#7B2D8B] to-[#9333ea]', cor: '#7B2D8B' },
    { label: 'Igrejas', valor: (distrito.igrejas || []).length, icon: <ChurchIcon />, gradient: 'from-[#16a34a] to-[#22c55e]', cor: '#16a34a' },
    { label: 'Duplas', valor: distrito._count?.duplas || duplas.length || 0, icon: <UsersIcon />, gradient: 'from-[#1A3A6B] to-[#2a5298]', cor: '#1A3A6B' },
    { label: 'Est. Bíblicos', valor: estudosAtivos, icon: <BookOpenIcon />, gradient: 'from-[#0284c7] to-[#0ea5e9]', cor: '#0284c7' },
    { label: 'Classes Bíblicas', valor: evangelismosAtivos, icon: <MegaphoneIcon />, gradient: 'from-[#ea580c] to-[#f97316]', cor: '#ea580c' },
    { label: 'Batismos', valor: totalBatismos, icon: <DropletIcon />, gradient: 'from-[#0d9488] to-[#14b8a6]', cor: '#0d9488' },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fechar parcial"
        onClick={onClose}
        className="absolute inset-0 h-full w-full bg-[#0b1a36]/60 backdrop-blur-sm"
      />
      <div className="absolute inset-x-3 top-4 bottom-4 overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in sm:inset-x-8 sm:top-8 sm:bottom-8">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9963A]">Parcial do distrito</p>
            <h2 className="mt-1 truncate text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              {distrito.nome}
            </h2>
            {distrito.regiao && (
              <p className="mt-0.5 truncate text-xs text-gray-400">Pertence à {distrito.regiao.nome}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-400 transition hover:border-[#1A3A6B] hover:text-[#1A3A6B]"
            aria-label="Fechar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="h-[calc(100%-73px)] overflow-y-auto p-4">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {indicadores.map((item) => (
              <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-3 text-center shadow-sm">
                <div className={`mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${item.gradient} text-white shadow-md`}>
                  {item.icon}
                </div>
                <p className="text-xl font-bold leading-none" style={{ color: item.cor }}>{item.valor}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-bold text-[#1A3A6B]">Igrejas / Congregações</h3>
              <span className="text-xs text-gray-400">{(distrito.igrejas || []).length} igrejas</span>
            </div>
            {(distrito.igrejas || []).length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">Nenhuma igreja neste distrito.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
                {distrito.igrejas.map((igreja) => (
                  <button
                    key={igreja.id}
                    type="button"
                    onClick={() => navigate(`/distritos/${distrito.id}/duplas?igrejaId=${igreja.id}`)}
                    className="rounded-lg border border-transparent bg-gray-50 p-3 text-center transition-all active:scale-95 hover:border-[#C9963A]/40 hover:bg-white hover:shadow-md"
                    title={`Ver duplas de ${igreja.nome}`}
                  >
                    <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#16a34a] to-[#22c55e] text-white shadow-md">
                      <ChurchIcon />
                    </span>
                    <p className="truncate text-xs font-bold text-[#1A3A6B]">{igreja.nome}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">{(igreja.membros || 0).toLocaleString('pt-BR')} membros</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <h3 className="text-sm font-bold text-[#1A3A6B]">Duplas Missionárias</h3>
              <span className="text-xs text-gray-400">{distrito._count?.duplas || duplas.length || 0} dupla(s)</span>
            </div>
            {duplas.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma dupla registrada.</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {duplas.map((dupla) => (
                  <button
                    key={dupla.id}
                    type="button"
                    onClick={() => navigate(`/duplas/${dupla.id}`)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="relative flex-shrink-0">
                        <FotoDupla
                          src={dupla.fotoLiderPreview}
                          nome={dupla.liderNome}
                          className="h-9 w-9 rounded-full shadow"
                          fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-xs"
                        />
                        <FotoDupla
                          src={dupla.fotoMembro2Preview}
                          nome={dupla.membro2Nome}
                          className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-2 border-white shadow-sm"
                          fallbackClassName="bg-gradient-to-br from-[#C9963A] to-[#e5b05a] text-[9px]"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-[#1A3A6B]">{dupla.liderNome} + {dupla.membro2Nome}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{dupla.igreja?.nome || dupla.igrejaNome || distrito.nome}</p>
                      </div>
                    </div>
                    <svg className="h-4 w-4 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sticky bottom-0 mt-4 grid grid-cols-2 gap-2 bg-white/95 pt-2 backdrop-blur">
            <button type="button" onClick={() => navigate(`/distritos/${distrito.id}/duplas`)} className="btn-primary px-3 py-2 text-xs">
              Ver Duplas
            </button>
            <button type="button" onClick={() => navigate(`/duplas/nova?distritoId=${distrito.id}`)} className="btn-outline px-3 py-2 text-xs">
              Nova Dupla
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ListagemDistritos() {
  const navigate = useNavigate();
  const [distritos, setDistritos] = useState([]);
  const [distritoSelecionado, setDistritoSelecionado] = useState(null);
  const [distritoModal, setDistritoModal] = useState(null);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/distritos')
      .then(async (res) => {
        const lista = Array.isArray(res.data) ? res.data : [];
        const listaComFotos = await Promise.all(lista.map(async (distrito) => ({
          ...distrito,
          duplas: await Promise.all((distrito.duplas || []).map(resolverFotosDaDupla)),
        })));
        setDistritos(listaComFotos);
        if (listaComFotos.length > 0) setDistritoSelecionado(listaComFotos[0]);
      })
      .catch((err) => console.error(err))
      .finally(() => setCarregando(false));
  }, []);

  const distritosFiltrados = distritos.filter(d =>
    !busca || d.nome.toLowerCase().includes(busca.toLowerCase()) ||
    d.regiao?.nome.toLowerCase().includes(busca.toLowerCase())
  );

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

  const duplasDist = distritoSelecionado?.duplas || [];
  const { estudosAtivos, evangelismosAtivos, totalBatismos } = getResumoDistrito(distritoSelecionado);

  const abrirParcial = (distrito) => {
    setDistritoSelecionado(distrito);
    if (window.matchMedia('(max-width: 1023.98px)').matches) {
      setDistritoModal(distrito);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Geral</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Todos os Distritos
          </h1>
          <p className="text-gray-400 text-xs mt-1">{distritos.length} distritos cadastrados</p>
        </div>
        <div className="relative w-full sm:w-72">
          <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou região..."
            className="input-field pl-12"
            style={{ paddingLeft: '3.25rem' }}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-260px)] lg:min-h-[400px]">
        {/* Lista de distritos */}
        <div className="w-full lg:w-80 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden lg:overflow-y-auto">
          {distritosFiltrados.map((distrito) => {
            const sel = distritoSelecionado?.id === distrito.id;
            return (
              <div
                key={distrito.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/distritos/${distrito.id}/duplas`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigate(`/distritos/${distrito.id}/duplas`);
                  }
                }}
                className={`w-full text-left px-4 py-3.5 border-l-[3px] transition-all duration-200 ${
                  sel ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]' : 'border-l-transparent hover:bg-gray-50'
                }`}
                title={`Ver duplas de ${distrito.nome}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center flex-shrink-0 transition-transform ${sel ? 'scale-110' : ''}`}>
                    <svg className="w-5 h-5 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${sel ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>{distrito.nome}</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          abrirParcial(distrito);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            event.stopPropagation();
                            abrirParcial(distrito);
                          }
                        }}
                        className={`min-h-0 flex-shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide transition-all duration-200 ${
                          sel
                            ? 'bg-[#C9963A]/15 text-[#C9963A]'
                            : 'bg-[#1A3A6B]/8 text-[#1A3A6B] hover:bg-[#C9963A]/15 hover:text-[#C9963A]'
                        }`}
                        title={`Ver parcial de ${distrito.nome}`}
                      >
                        Parcial
                      </button>
                    </div>
                    {distrito.regiao && (
                      <p className="text-[10px] text-gray-400 truncate uppercase tracking-wide">{distrito.regiao.nome}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[10px] text-gray-400">👨‍👩‍👧‍👦 {(distrito.membros || 0).toLocaleString('pt-BR')}</span>
                      <span className="text-[10px] text-gray-400">⛪ {(distrito.igrejas || []).length}</span>
                      <span className="text-[10px] font-bold text-[#1A3A6B]">👥 {distrito._count?.duplas || distrito.duplas?.length || 0}</span>
                    </div>
                  </div>
                  <span className="lg:hidden flex-shrink-0 rounded-full bg-[#1A3A6B]/8 px-2 py-1 text-[10px] font-bold text-[#1A3A6B]">
                    Ver
                  </span>
                </div>
              </div>
            );
          })}
          {distritosFiltrados.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">Nenhum distrito encontrado.</div>
          )}
        </div>

        {/* Painel de detalhes */}
        {distritoSelecionado && (
          <div key={distritoSelecionado.id} className="hidden lg:block flex-1 overflow-y-auto animate-fade-in">
            {/* Cabeçalho do detalhe */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider mb-1">Distrito</p>
                  <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                    {distritoSelecionado.nome}
                  </h2>
                  {distritoSelecionado.regiao && (
                    <p className="text-sm text-gray-500 mt-0.5">Pertence à {distritoSelecionado.regiao.nome}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/distritos/${distritoSelecionado.id}/duplas`)}
                    className="btn-outline text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver Duplas
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/duplas/nova?distritoId=${distritoSelecionado.id}`)}
                    className="btn-primary text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nova Dupla
                  </button>
                </div>
              </div>
            </div>

            {/* Cards de indicadores */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
              {[
                { label: 'Membros', valor: (distritoSelecionado.membros || 0).toLocaleString('pt-BR'), icon: <MembersIcon />, gradient: 'from-[#7B2D8B] to-[#9333ea]', cor: '#7B2D8B' },
                { label: 'Igrejas', valor: (distritoSelecionado.igrejas || []).length, icon: <ChurchIcon />, gradient: 'from-[#16a34a] to-[#22c55e]', cor: '#16a34a' },
                { label: 'Duplas', valor: distritoSelecionado._count?.duplas || 0, icon: <UsersIcon />, gradient: 'from-[#1A3A6B] to-[#2a5298]', cor: '#1A3A6B' },
                { label: 'Est. Bíblicos', valor: estudosAtivos, icon: <BookOpenIcon />, gradient: 'from-[#0284c7] to-[#0ea5e9]', cor: '#0284c7' },
                { label: 'Classes Bíblicas', valor: evangelismosAtivos, icon: <MegaphoneIcon />, gradient: 'from-[#ea580c] to-[#f97316]', cor: '#ea580c' },
                { label: 'Batismos', valor: totalBatismos, icon: <DropletIcon />, gradient: 'from-[#0d9488] to-[#14b8a6]', cor: '#0d9488' },
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group hover:-translate-y-1 hover:shadow-xl hover:border-[#C9963A]/35 transition-all duration-300">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-lg shadow-md mb-1.5 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                    {item.icon}
                  </div>
                  <p className="text-lg font-bold" style={{ color: item.cor }}>{item.valor}</p>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
                </div>
              ))}
            </div>

            {/* Igrejas do Distrito */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-[#1A3A6B] text-sm">Igrejas / Congregações</h3>
                <span className="text-xs text-gray-400">{(distritoSelecionado.igrejas || []).length} igrejas</span>
              </div>
              {(distritoSelecionado.igrejas || []).length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-sm">Nenhuma igreja neste distrito.</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
                  {distritoSelecionado.igrejas.map((igreja) => (
                    <button
                      key={igreja.id}
                      type="button"
                      onClick={() => navigate(`/distritos/${distritoSelecionado.id}/duplas?igrejaId=${igreja.id}`)}
                      className="group bg-gray-50 rounded-lg p-3 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-xl hover:border-[#C9963A]/40 border border-transparent focus:outline-none focus:ring-2 focus:ring-[#C9963A]/30"
                      title={`Ver duplas de ${igreja.nome}`}
                    >
                      <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#16a34a] to-[#22c55e] text-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                        <ChurchIcon />
                      </span>
                      <p className="text-xs font-semibold text-[#1A3A6B] truncate transition-colors duration-300 group-hover:text-[#C9963A]" title={igreja.nome}>{igreja.nome}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5 transition-colors duration-300 group-hover:text-gray-500">{(igreja.membros || 0).toLocaleString('pt-BR')} membros</p>
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#1A3A6B]/8 px-2 py-0.5 text-[9px] font-bold text-[#1A3A6B] opacity-0 transition-all duration-300 group-hover:opacity-100">
                        Ver duplas
                        <svg className="w-2.5 h-2.5 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Duplas do Distrito */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-[#1A3A6B] text-sm">Duplas Missionárias</h3>
                <span className="text-xs text-gray-400">{distritoSelecionado._count?.duplas || 0} dupla(s)</span>
              </div>
              {duplasDist.length === 0 ? (
                <div className="py-10 text-center text-gray-400">
                  <div className="text-3xl mb-2">👥</div>
                  <p className="text-sm font-medium">Nenhuma dupla registrada</p>
                  <button
                    type="button"
                    onClick={() => navigate(`/duplas/nova?distritoId=${distritoSelecionado.id}`)}
                    className="btn-primary mt-4 text-xs px-4 py-2"
                  >
                    Cadastrar primeira dupla
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {duplasDist.map((dupla) => (
                    <div key={dupla.id} className="px-5 py-3.5 hover:bg-gray-50 transition-colors flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex-shrink-0">
                          <FotoDupla
                            src={dupla.fotoLiderPreview}
                            nome={dupla.liderNome}
                            className="w-9 h-9 rounded-full shadow"
                            fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-xs"
                          />
                          <FotoDupla
                            src={dupla.fotoMembro2Preview}
                            nome={dupla.membro2Nome}
                            className="w-6 h-6 rounded-full absolute -bottom-1 -right-1 border-2 border-white shadow-sm"
                            fallbackClassName="bg-gradient-to-br from-[#C9963A] to-[#e5b05a] text-[9px]"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#1A3A6B] truncate">{dupla.liderNome} + {dupla.membro2Nome}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {dupla.estudoBiblico && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                📖 {dupla.estudoBiblico} <BadgeEstudo status={dupla.statusEstudoBiblico} />
                              </span>
                            )}
                            {dupla.statusEvangelismo && (
                              <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                📢 <BadgeEvangelismo status={dupla.statusEvangelismo} />
                              </span>
                            )}
                            {dupla.batismos > 0 && (
                              <span className="text-[10px] text-teal-600 font-medium">💧 {dupla.batismos} batismo(s)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/duplas/${dupla.id}`)}
                        className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-50 hover:bg-[#1A3A6B] flex items-center justify-center transition-colors group/btn"
                      >
                        <svg className="w-4 h-4 text-gray-400 group-hover/btn:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ModalParcialDistrito
        distrito={distritoModal}
        onClose={() => setDistritoModal(null)}
        navigate={navigate}
      />
    </div>
  );
}
