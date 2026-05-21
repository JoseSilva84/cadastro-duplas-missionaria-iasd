import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { FotoService } from '../foto.service';

const projetoLabel = {
  CASA_A_CASA: 'Visitação',
  ESTUDO_BIBLICO: 'Estudo Bíblico',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  EVANGELISMO_PUBLICO: 'Evangelismo Público',
};

const projetoIcon = {
  CASA_A_CASA: '🏠',
  ESTUDO_BIBLICO: '📖',
  PEQUENOS_GRUPOS: '👥',
  ACAO_SOCIAL: '🤲',
  EVANGELISMO_PUBLICO: '📢',
};

// Configuração visual de Classe A/B/C
const classeConfig = {
  A: { label: 'Classe A', cor: '#16a34a', bg: '#dcfce7', desc: 'Já levou ao batismo' },
  B: { label: 'Classe B', cor: '#b45309', bg: '#fef3c7', desc: 'Deu estudo, sem batismo' },
  C: { label: 'Classe C', cor: '#dc2626', bg: '#fee2e2', desc: 'Nunca deu estudo' },
};

// Configuração visual de Atividade
const atividadeConfig = {
  ATIVA:   { label: 'Estudando',  cor: '#16a34a', bg: '#dcfce7', dot: '#22c55e' },
  INATIVA: { label: 'Sem estudo', cor: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
};

// Badge de status da dupla (ativa/pendente/inativa)
const StatusBadge = ({ status }) => {
  const map = { ATIVA: 'badge-ativa', PENDENTE: 'badge-pendente', INATIVA: 'badge-inativa' };
  const label = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };
  return <span className={map[status] || 'badge-inativa'}>{label[status] || status}</span>;
};

// Calcula a medalha de gamificação
function getMedalha(dupla) {
  const estudoAtivo = dupla.statusEstudoBiblico === 'ATIVO';
  const temBatismo = (dupla.batismos || 0) > 0;
  const temPessoas = (dupla.pessoasAlcancadas || 0) > 0;
  if (estudoAtivo && temBatismo && temPessoas) return 'ouro';
  if (estudoAtivo && !temBatismo && temPessoas) return 'prata';
  return 'bronze';
}

const medalhaConfig = {
  ouro:   { emoji: '🥇', label: 'Ouro',   cor: '#C9963A' },
  prata:  { emoji: '🥈', label: 'Prata',  cor: '#6b7280' },
  bronze: { emoji: '🥉', label: 'Bronze', cor: '#92400e' },
};

const medalhaOrder = { ouro: 0, prata: 1, bronze: 2 };

const resolverFotosDaDupla = async (dupla) => {
  const [fotoLiderPreview, fotoMembro2Preview] = await Promise.all([
    FotoService.resolverFotoParaPreview(dupla.fotoLider).catch(() => ''),
    FotoService.resolverFotoParaPreview(dupla.fotoMembro2).catch(() => ''),
  ]);
  return { ...dupla, fotoLiderPreview, fotoMembro2Preview };
};

// Foto de pessoa com tamanho fixo (aplicado externamente)
const FotoPessoa = ({ src, nome, className, fallbackGradient = 'from-[#1A3A6B] to-[#2a5298]' }) => {
  const inicial = (nome || '?').charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={nome || 'Foto'}
        className={`${className} object-cover bg-gray-100`}
      />
    );
  }
  return (
    <div className={`${className} bg-gradient-to-br ${fallbackGradient} flex items-center justify-center text-white font-bold`}>
      {inicial}
    </div>
  );
};

// Badge de acompanhamento do coordenador
const BadgeAcompanhamento = ({ data }) => {
  if (!data) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-400 border border-gray-200">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Sem visita
      </span>
    );
  }
  const dataFormatada = new Date(data).toLocaleDateString('pt-BR');
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Visitada {dataFormatada}
    </span>
  );
};

export default function Duplas() {
  const { distritoId } = useParams();
  const navigate = useNavigate();
  const [duplas, setDuplas] = useState([]);
  const [distrito, setDistrito] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [filtroClasse, setFiltroClasse] = useState('');
  const [filtroAtividade, setFiltroAtividade] = useState('');
  const [busca, setBusca] = useState('');
  const [buscaFocada, setBuscaFocada] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get('/duplas', { params: { distritoId } }),
      distritoId ? api.get(`/distritos/${distritoId}`) : Promise.resolve({ data: null }),
    ]).then(async ([d, dist]) => {
      if (!ativo) return;
      const lista = Array.isArray(d.data) ? d.data : [];
      const listaComFotos = await Promise.all(lista.map(resolverFotosDaDupla));
      setDuplas(listaComFotos);
      setDistrito(dist.data);
    }).finally(() => { setCarregando(false); });
    return () => { ativo = false; };
  }, [distritoId]);

  const duplasComMedalha = useMemo(() =>
    [...duplas]
      .map(d => ({ ...d, _medalha: getMedalha(d) }))
      .sort((a, b) => medalhaOrder[a._medalha] - medalhaOrder[b._medalha]),
    [duplas]
  );

  const duplasFiltradas = useMemo(() => {
    const isMedalha = ['ouro', 'prata', 'bronze'].includes(filtro);
    return duplasComMedalha.filter((d) => {
      const matchFiltro = !filtro ? true
        : isMedalha ? d._medalha === filtro
        : d.status === filtro;
      const matchClasse = !filtroClasse || d.classificacaoDupla === filtroClasse;
      const matchAtividade = !filtroAtividade || d.atividadeDupla === filtroAtividade;
      const matchBusca = !busca ||
        (d.liderNome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (d.membro2Nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (d.bairro || '').toLowerCase().includes(busca.toLowerCase());
      return matchFiltro && matchClasse && matchAtividade && matchBusca;
    });
  }, [duplasComMedalha, filtro, filtroClasse, filtroAtividade, busca]);

  const contagemMedalha = useMemo(() => {
    const c = { ouro: 0, prata: 0, bronze: 0 };
    duplasComMedalha.forEach(d => { c[d._medalha] = (c[d._medalha] || 0) + 1; });
    return c;
  }, [duplasComMedalha]);

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
          <button onClick={() => navigate(`/regioes/${distrito.regiao?.id}/distritos`)} className="hover:text-[#1A3A6B] transition-colors">
            {distrito.regiao?.nome}
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
          onClick={() => navigate(`/duplas/nova${distritoId ? `?distritoId=${distritoId}` : ''}`)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Dupla
        </button>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 animate-fade-in-down" style={{ animationDelay: '150ms' }}>
        {[
          { label: 'Duplas', valor: duplas.length, cor: '#1A3A6B', icon: '👥', gradient: 'from-[#1A3A6B] to-[#2a5298]' },
          ...(distrito ? [
            { label: 'Igrejas', valor: distrito.igrejas?.length || 0, cor: '#16a34a', icon: '⛪', gradient: 'from-[#16a34a] to-[#22c55e]' },
            { label: 'Membros', valor: (distrito.membros || 0).toLocaleString('pt-BR'), cor: '#7B2D8B', icon: '👨‍👩‍👧‍👦', gradient: 'from-[#7B2D8B] to-[#9333ea]' },
          ] : []),
          { label: 'Estudos', valor: duplas.filter(d => d.statusEstudoBiblico === 'ATIVO').length, cor: '#0284c7', icon: '📖', gradient: 'from-[#0284c7] to-[#0ea5e9]' },
          { label: 'Evangelismo', valor: duplas.filter(d => d.statusEvangelismo === 'ATIVO').length, cor: '#ea580c', icon: '📢', gradient: 'from-[#ea580c] to-[#f97316]' },
          { label: 'Batismos', valor: duplas.reduce((acc, d) => acc + (d.batismos || 0), 0), cor: '#0d9488', icon: '💧', gradient: 'from-[#0d9488] to-[#14b8a6]' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-all duration-300">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl shadow-md mb-2 group-hover:scale-110 transition-transform`}>
              {item.icon}
            </div>
            <p className="text-xl font-bold" style={{ color: item.cor }}>{item.valor}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Chips de filtro — Medalha + Classe + Atividade */}
      <div className="flex flex-wrap gap-2 mb-3 animate-fade-in-down" style={{ animationDelay: '170ms' }}>
        {/* Chip "Todas" */}
        <button
          type="button"
          onClick={() => { setFiltro(''); setFiltroClasse(''); setFiltroAtividade(''); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
            !filtro && !filtroClasse && !filtroAtividade
              ? 'bg-[#1A3A6B] text-white border-[#1A3A6B] shadow-md'
              : 'bg-white text-gray-500 border-gray-200 hover:border-[#1A3A6B]/40'
          }`}
        >
          Todas
          <span className="rounded-full px-1.5 py-px text-[10px] font-bold"
            style={{ backgroundColor: (!filtro && !filtroClasse && !filtroAtividade) ? 'rgba(255,255,255,0.25)' : '#f3f4f6', color: (!filtro && !filtroClasse && !filtroAtividade) ? 'white' : '#6b7280' }}>
            {duplas.length}
          </span>
        </button>

        {/* Medalhas */}
        {(['ouro', 'prata', 'bronze']).map((m) => {
          const cfg = medalhaConfig[m];
          const ativo = filtro === m;
          return (
            <button key={m} type="button"
              onClick={() => setFiltro(ativo ? '' : m)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
              style={ativo ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                : { backgroundColor: cfg.cor + '18', borderColor: cfg.cor + '55', color: cfg.cor }}
            >
              {cfg.emoji} {cfg.label}
              <span className="rounded-full px-1.5 py-px text-[10px] font-bold"
                style={{ backgroundColor: ativo ? 'rgba(255,255,255,0.25)' : cfg.cor + '25', color: ativo ? 'white' : cfg.cor }}>
                {contagemMedalha[m] || 0}
              </span>
            </button>
          );
        })}

        {/* Separador */}
        <div className="h-5 w-px bg-gray-200 self-center mx-0.5" />

        {/* Classe A/B/C */}
        {['A', 'B', 'C'].map((cls) => {
          const cfg = classeConfig[cls];
          const ativo = filtroClasse === cls;
          return (
            <button key={cls} type="button"
              onClick={() => setFiltroClasse(ativo ? '' : cls)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200"
              style={ativo ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                : { backgroundColor: cfg.bg, borderColor: cfg.cor + '60', color: cfg.cor }}
              title={cfg.desc}
            >
              Classe {cls}
            </button>
          );
        })}

        {/* Separador */}
        <div className="h-5 w-px bg-gray-200 self-center mx-0.5" />

        {/* Ativa / Sem estudo */}
        {['ATIVA', 'INATIVA'].map((atv) => {
          const cfg = atividadeConfig[atv];
          const ativo = filtroAtividade === atv;
          return (
            <button key={atv} type="button"
              onClick={() => setFiltroAtividade(ativo ? '' : atv)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
              style={ativo ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                : { backgroundColor: cfg.bg, borderColor: cfg.cor + '60', color: cfg.cor }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ativo ? 'rgba(255,255,255,0.8)' : cfg.dot }} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Barra de busca e filtro de status */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 animate-fade-in-down" style={{ animationDelay: '200ms' }}>
        <div className={`relative transition-all duration-300 ${buscaFocada ? 'flex-1' : 'flex-1 sm:max-w-xs'}`}>
          <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${buscaFocada ? 'text-[#1A3A6B]' : 'text-gray-400'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={buscaFocada ? 'Digite nome, bairro ou parceiro...' : 'Buscar por nome ou bairro...'}
            className={`input-field pl-10 transition-all duration-300 ${buscaFocada ? 'ring-2 ring-[#1A3A6B]/30 border-[#1A3A6B]/50' : ''}`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setBuscaFocada(true)}
            onBlur={() => setBuscaFocada(false)}
          />
          {busca && (
            <button type="button" onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="transition-all duration-300 overflow-hidden"
          style={{ maxWidth: buscaFocada ? '0px' : '100%', opacity: buscaFocada ? 0 : 1, pointerEvents: buscaFocada ? 'none' : 'auto' }}>
          <select className="input-field sm:w-auto w-full" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos os status</option>
            <optgroup label="Status">
              <option value="ATIVA">Ativa</option>
              <option value="PENDENTE">Pendente</option>
              <option value="INATIVA">Inativa</option>
            </optgroup>
            <optgroup label="Medalha">
              <option value="ouro">Ouro</option>
              <option value="prata">Prata</option>
              <option value="bronze">Bronze</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Lista de duplas */}
      <div className="space-y-3 stagger-children">
        {duplasFiltradas.map((dupla) => {
          const cfg = medalhaConfig[dupla._medalha];
          const clsCfg = dupla.classificacaoDupla ? classeConfig[dupla.classificacaoDupla] : null;
          const atvCfg = dupla.atividadeDupla ? atividadeConfig[dupla.atividadeDupla] : null;
          // Cor da borda esquerda: usa a cor da classe se definida, senão a da medalha
          const corBorda = clsCfg?.cor || cfg.cor;

          return (
            <button
              key={dupla.id}
              onClick={() => navigate(`/duplas/${dupla.id}`)}
              className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 p-4 group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderLeftColor: corBorda }}
            >
              {/* Linha principal */}
              <div className="flex items-center gap-3">

                {/* === MEMBRO 1 === foto + nome (mesmo tamanho que membro 2) */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FotoPessoa
                    src={dupla.fotoLiderPreview}
                    nome={dupla.liderNome}
                    className="w-10 h-10 rounded-full shadow-sm ring-2 ring-white group-hover:ring-[#1A3A6B]/20 transition-all flex-shrink-0"
                    fallbackGradient="from-[#1A3A6B] to-[#2a5298]"
                  />
                  <p className="font-semibold text-[#1A3A6B] text-sm group-hover:text-[#C9963A] transition-colors duration-200 truncate">
                    {dupla.liderNome}
                  </p>
                </div>

                {/* Divisor central */}
                <div className="flex-shrink-0 text-gray-300 font-bold text-lg select-none">+</div>

                {/* === MEMBRO 2 === foto + nome (mesmo tamanho que membro 1) */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FotoPessoa
                    src={dupla.fotoMembro2Preview}
                    nome={dupla.membro2Nome}
                    className="w-10 h-10 rounded-full shadow-sm ring-2 ring-white group-hover:ring-[#1A3A6B]/20 transition-all flex-shrink-0"
                    fallbackGradient="from-[#C9963A] to-[#e5b05a]"
                  />
                  <p className="font-semibold text-[#1A3A6B] text-sm group-hover:text-[#C9963A] transition-colors duration-200 truncate">
                    {dupla.membro2Nome}
                  </p>
                </div>

                {/* Badges de classe + atividade + medalha + seta */}
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0 ml-2">
                  {clsCfg && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      style={{ backgroundColor: clsCfg.bg, color: clsCfg.cor, borderColor: clsCfg.cor + '40' }}>
                      {dupla.classificacaoDupla}
                    </span>
                  )}
                  {atvCfg && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                      style={{ backgroundColor: atvCfg.bg, color: atvCfg.cor, borderColor: atvCfg.cor + '40' }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: atvCfg.dot }} />
                      {atvCfg.label}
                    </span>
                  )}
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: cfg.cor + '18', color: cfg.cor }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-[#1A3A6B] transition-all duration-200">
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Seta mobile */}
                <div className="sm:hidden w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-[#1A3A6B] transition-all duration-200 flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Rodapé do card: status + bairro + projeto + acompanhamento */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <StatusBadge status={dupla.status} />
                {dupla.bairro && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {dupla.bairro}
                  </span>
                )}
                {dupla.tipoProjeto && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    {projetoIcon[dupla.tipoProjeto]} {projetoLabel[dupla.tipoProjeto]}
                  </span>
                )}
                <BadgeAcompanhamento data={dupla.ultimoAcompanhamento} />
              </div>
            </button>
          );
        })}
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
