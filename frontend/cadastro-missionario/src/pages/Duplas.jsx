import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const projetoLabel = {
  CASA_A_CASA: 'Casa em Casa',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  EVANGELISMO_PUBLICO: 'Evangelismo Público',
};

const projetoIcon = {
  CASA_A_CASA: '🏠',
  PEQUENOS_GRUPOS: '👥',
  ACAO_SOCIAL: '🤲',
  EVANGELISMO_PUBLICO: '📢',
};

const StatusBadge = ({ status }) => {
  const map = { ATIVA: 'badge-ativa', PENDENTE: 'badge-pendente', INATIVA: 'badge-inativa' };
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

  const duplasFiltradas = duplas.filter((d) => {
    const matchStatus = !filtroStatus || d.status === filtroStatus;
    const matchBusca = !busca || d.liderNome.toLowerCase().includes(busca.toLowerCase()) ||
      d.membro2Nome.toLowerCase().includes(busca.toLowerCase()) ||
      d.bairro.toLowerCase().includes(busca.toLowerCase());
    return matchStatus && matchBusca;
  });

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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      {distrito && (
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 mb-6 flex-wrap animate-fade-in-down">
          <button onClick={() => navigate('/regioes')} className="hover:text-[#1A3A6B] transition-colors">Regiões</button>
          <span className="text-gray-300">/</span>
          <button onClick={() => navigate(`/regioes/${distrito.regiao.id}/distritos`)} className="hover:text-[#1A3A6B] transition-colors">
            {distrito.regiao.nome}
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-[#1A3A6B] font-medium">{distrito.nome}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4 animate-fade-in-down" style={{ animationDelay: '100ms' }}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">
              {distrito ? `Distrito ${distrito.nome}` : 'Todas as Duplas'}
            </p>
          </div>
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
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 animate-fade-in-down" style={{ animationDelay: '200ms' }}>
        <div className="relative flex-1 sm:max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por nome ou bairro..."
            className="input-field pl-10"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
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
      <div className="space-y-3 stagger-children">
        {duplasFiltradas.map((dupla) => (
          <button
            key={dupla.id}
            onClick={() => navigate(`/duplas/${dupla.id}`)}
            className="w-full text-left card border-2 border-transparent hover:border-[#1A3A6B]/15 group transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {/* Avatar da dupla */}
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow duration-300">
                      {dupla.liderNome.charAt(0)}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white font-bold text-xs absolute -bottom-1 -right-1.5 border-2 border-white shadow-md">
                      {dupla.membro2Nome.charAt(0)}
                    </div>
                  </div>
                </div>

                {/* Dados */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-[#1A3A6B] text-sm group-hover:text-[#C9963A] transition-colors duration-200">{dupla.liderNome}</p>
                    <span className="text-gray-300 text-xs">+</span>
                    <p className="text-gray-600 text-sm">{dupla.membro2Nome}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <StatusBadge status={dupla.status} />
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                      {dupla.bairro}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      {projetoIcon[dupla.tipoProjeto]} {projetoLabel[dupla.tipoProjeto]}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {dupla.pessoasAlcancadas > 0 && (
                  <div className="hidden sm:flex flex-col items-center bg-gradient-to-b from-[#C9963A]/10 to-[#C9963A]/5 rounded-lg px-3 py-1.5">
                    <span className="text-lg font-bold text-[#C9963A]">{dupla.pessoasAlcancadas}</span>
                    <span className="text-[10px] text-gray-400 -mt-0.5">alcançadas</span>
                  </div>
                )}
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

      {duplasFiltradas.length === 0 && (
        <div className="text-center py-20 text-gray-400 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">👥</div>
          <p className="font-medium text-lg">Nenhuma dupla encontrada.</p>
          <button onClick={() => navigate('/duplas/nova')} className="btn-primary mt-6 text-sm px-5 py-2.5">
            Cadastrar primeira dupla
          </button>
        </div>
      )}
    </div>
  );
}
