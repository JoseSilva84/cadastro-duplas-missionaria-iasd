import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

// Mapeamento dos tipos de projeto
const projetoLabel = {
  CASA_A_CASA: 'Casa em Casa',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  MISSAO_COM_AMIGOS: 'Estudo Bíblico',
  EVANGELISMO_PUBLICO: 'Evangelismo Público',
};

// Badge de status com cores corretas
const StatusBadge = ({ status }) => {
  const map = {
    ATIVA: 'badge-ativa',
    PENDENTE: 'badge-pendente',
    INATIVA: 'badge-inativa',
  };
  const label = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };
  return <span className={map[status]}>{label[status]}</span>;
};

export default function Duplas() {
  const { distritoId } = useParams();
  const navigate = useNavigate();
  const [duplas, setDuplas] = useState([]);
  const [distrito, setDistrito] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/duplas', { params: { distritoId } }),
      distritoId ? api.get(`/distritos/${distritoId}`) : Promise.resolve({ data: null }),
    ]).then(([d, dist]) => {
      setDuplas(d.data);
      setDistrito(dist.data);
    }).finally(() => setCarregando(false));
  }, [distritoId]);

  // Filtragem local
  const duplasFiltradas = duplas.filter((d) => {
    const matchStatus = !filtroStatus || d.status === filtroStatus;
    const matchBusca = !busca || d.liderNome.toLowerCase().includes(busca.toLowerCase()) ||
      d.membro2Nome.toLowerCase().includes(busca.toLowerCase()) ||
      d.bairro.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca && !d.comAmigos;
  });

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      {distrito && (
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6 flex-wrap">
          <button onClick={() => navigate('/regioes')} className="hover:text-[#1A3A6B]">Regiões</button>
          <span>/</span>
          <button onClick={() => navigate(`/regioes/${distrito.regiao.id}/distritos`)} className="hover:text-[#1A3A6B]">
            {distrito.regiao.nome}
          </button>
          <span>/</span>
          <span className="text-[#1A3A6B] font-medium">{distrito.nome}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div>
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">
            {distrito ? `Distrito ${distrito.nome}` : 'Todas as Duplas'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Duplas Missionárias
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">{duplasFiltradas.length} dupla(s) encontrada(s)</p>
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

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
        <input
          type="text"
          placeholder="Buscar por nome ou bairro..."
          className="input-field sm:max-w-xs"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="input-field sm:w-auto"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="ATIVA">Ativa</option>
          <option value="PENDENTE">Pendente</option>
          <option value="INATIVA">Inativa</option>
        </select>
      </div>

      {/* Lista de duplas */}
      <div className="space-y-3">
        {duplasFiltradas.map((dupla) => (
          <button
            key={dupla.id}
            onClick={() => navigate(`/duplas/${dupla.id}`)}
            className="w-full text-left card border-2 border-transparent hover:border-[#1A3A6B]/20 group transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar da dupla */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-[#1A3A6B] flex items-center justify-center text-white font-bold text-sm">
                      {dupla.liderNome.charAt(0)}
                    </div>
                    <div className="w-7 h-7 rounded-full bg-[#C9963A] flex items-center justify-center text-white font-bold text-xs absolute -bottom-1 -right-1 border-2 border-white">
                      {dupla.membro2Nome.charAt(0)}
                    </div>
                  </div>
                </div>

                {/* Dados */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1A3A6B] text-sm">{dupla.liderNome}</p>
                    <span className="text-gray-300 text-xs">+</span>
                    <p className="text-gray-600 text-sm">{dupla.membro2Nome}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <StatusBadge status={dupla.status} />
                    <span className="text-xs text-gray-400">📍 {dupla.bairro}</span>
                    <span className="text-xs text-gray-400">✝️ {projetoLabel[dupla.tipoProjeto]}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {dupla.pessoasAlcancadas > 0 && (
                  <div className="hidden sm:flex flex-col items-center">
                    <span className="text-lg font-bold text-[#C9963A]">{dupla.pessoasAlcancadas}</span>
                    <span className="text-xs text-gray-400">alcançadas</span>
                  </div>
                )}
                <svg className="w-5 h-5 text-gray-300 group-hover:text-[#1A3A6B] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </button>
        ))}
      </div>

      {duplasFiltradas.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">Nenhuma dupla encontrada.</p>
          <button onClick={() => navigate('/duplas/nova')} className="btn-primary mt-4 text-sm px-4 py-2">
            Cadastrar primeira dupla
          </button>
        </div>
      )}
    </div>
  );
}
