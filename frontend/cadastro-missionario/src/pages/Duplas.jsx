import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { FotoService } from '../foto.service';

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

// Retorna a medalha de gamificação de uma dupla conforme gameDuplas.md
function getMedalha(dupla) {
  const estudoAtivo = dupla.statusEstudoBiblico === 'ATIVO';
  const temBatismo = (dupla.batismos || 0) > 0;
  const temPessoas = (dupla.pessoasAlcancadas || 0) > 0;

  if (estudoAtivo && temBatismo && temPessoas) return 'ouro';
  if (estudoAtivo && !temBatismo && temPessoas) return 'prata';
  return 'bronze';
}

const medalhaConfig = {
  ouro:   { emoji: '🥇', label: 'Ouro',   cor: '#C9963A', bg: 'from-[#C9963A]/15 to-[#e5b05a]/10', border: 'border-[#C9963A]/30' },
  prata:  { emoji: '🥈', label: 'Prata',  cor: '#6b7280', bg: 'from-[#6b7280]/15 to-[#9ca3af]/10', border: 'border-[#9ca3af]/30' },
  bronze: { emoji: '🥉', label: 'Bronze', cor: '#92400e', bg: 'from-[#92400e]/15 to-[#b45309]/10', border: 'border-[#92400e]/25' },
};

const medalhaOrder = { ouro: 0, prata: 1, bronze: 2 };

const resolverFotosDaDupla = async (dupla) => {
  const [fotoLiderPreview, fotoMembro2Preview] = await Promise.all([
    FotoService.resolverFotoParaPreview(dupla.fotoLider).catch(() => ''),
    FotoService.resolverFotoParaPreview(dupla.fotoMembro2).catch(() => ''),
  ]);

  return { ...dupla, fotoLiderPreview, fotoMembro2Preview };
};

const FotoPessoa = ({ src, nome, className, fallbackClassName, onPreview }) => {
  const inicial = (nome || '?').charAt(0);

  if (src) {
    return (
      <img
        src={src}
        alt={nome || 'Foto do membro'}
        className={`${className} object-cover bg-gray-100 ${onPreview ? 'cursor-zoom-in hover:ring-2 hover:ring-[#C9963A]/60 transition' : ''}`}
        role={onPreview ? 'button' : undefined}
        tabIndex={onPreview ? 0 : undefined}
        title={onPreview ? 'Clique para ampliar' : undefined}
        onClick={(event) => {
          if (!onPreview) return;
          event.stopPropagation();
          onPreview(src, nome);
        }}
        onKeyDown={(event) => {
          if (!onPreview || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          event.stopPropagation();
          onPreview(src, nome);
        }}
      />
    );
  }

  return (
    <div className={`${className} ${fallbackClassName} flex items-center justify-center text-white font-bold`}>
      {inicial}
    </div>
  );
};

export default function Duplas() {
  const { distritoId } = useParams();
  const navigate = useNavigate();
  const [duplas, setDuplas] = useState([]);
  const [distrito, setDistrito] = useState(null);
  const [filtro, setFiltro] = useState(''); // status (ATIVA/PENDENTE/INATIVA) ou medalha (ouro/prata/bronze)
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
    }).finally(() => {
      setCarregando(false);
    });

    return () => { ativo = false; };
  }, [distritoId]);

  // Duplas com medalha calculada e ordenadas por medalha
  const duplasComMedalha = useMemo(() =>
    [...duplas]
      .map(d => ({ ...d, _medalha: getMedalha(d) }))
      .sort((a, b) => medalhaOrder[a._medalha] - medalhaOrder[b._medalha]),
    [duplas]
  );

  const duplasFiltradas = useMemo(() => {
    const isMedalha = ['ouro', 'prata', 'bronze'].includes(filtro);
    return duplasComMedalha.filter((d) => {
      const matchFiltro = !filtro
        ? true
        : isMedalha
          ? d._medalha === filtro
          : d.status === filtro;
      const matchBusca = !busca ||
        d.liderNome.toLowerCase().includes(busca.toLowerCase()) ||
        d.membro2Nome.toLowerCase().includes(busca.toLowerCase()) ||
        d.bairro.toLowerCase().includes(busca.toLowerCase());
      return matchFiltro && matchBusca;
    });
  }, [duplasComMedalha, filtro, busca]);

  // Contagem por medalha para os chips
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
          onClick={() => navigate(`/duplas/nova${distritoId ? `?distritoId=${distritoId}` : ''}`)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Dupla
        </button>
      </div>

      {/* Indicadores do Distrito/Região */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 animate-fade-in-down" style={{ animationDelay: '150ms' }}>
        {[
          { label: 'Duplas', valor: duplas.length, cor: '#1A3A6B', icon: '👥', gradient: 'from-[#1A3A6B] to-[#2a5298]' },
          ...(distrito ? [
            { label: 'Igrejas', valor: distrito.igrejas?.length || 0, cor: '#16a34a', icon: '⛪', gradient: 'from-[#16a34a] to-[#22c55e]' },
            { label: 'Membros', valor: (distrito.membros || 0).toLocaleString('pt-BR'), cor: '#7B2D8B', icon: '👨‍👩‍👧‍👦', gradient: 'from-[#7B2D8B] to-[#9333ea]' }
          ] : []),
          { label: 'Estudos Bíblicos', valor: duplas.filter(d => d.statusEstudoBiblico === 'ATIVO').length, cor: '#0284c7', icon: '📖', gradient: 'from-[#0284c7] to-[#0ea5e9]' },
          { label: 'Evangelismos', valor: duplas.filter(d => d.statusEvangelismo === 'ATIVO').length, cor: '#ea580c', icon: '📢', gradient: 'from-[#ea580c] to-[#f97316]' },
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

      {/* Chips de medalha com contagem */}
      <div className="flex flex-wrap gap-2 mb-3 animate-fade-in-down" style={{ animationDelay: '170ms' }}>
        <button
          type="button"
          onClick={() => setFiltro('')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
            filtro === ''
              ? 'bg-[#1A3A6B] text-white border-[#1A3A6B] shadow-md'
              : 'bg-white text-gray-500 border-gray-200 hover:border-[#1A3A6B]/40'
          }`}
        >
          Todas
          <span
            className="rounded-full px-1.5 py-px text-[10px] font-bold"
            style={{
              backgroundColor: filtro === '' ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
              color: filtro === '' ? 'white' : '#6b7280',
            }}
          >
            {duplas.length}
          </span>
        </button>

        {(['ouro', 'prata', 'bronze']).map((m) => {
          const cfg = medalhaConfig[m];
          const ativo = filtro === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setFiltro(ativo ? '' : m)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
              style={ativo
                ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                : { backgroundColor: cfg.bg, borderColor: cfg.cor + '55', color: cfg.cor }}
            >
              {cfg.emoji} {cfg.label}
              <span
                className="rounded-full px-1.5 py-px text-[10px] font-bold"
                style={{
                  backgroundColor: ativo ? 'rgba(255,255,255,0.25)' : cfg.cor + '25',
                  color: ativo ? 'white' : cfg.cor,
                }}
              >
                {contagemMedalha[m] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtros de texto e status/medalha unificados */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 animate-fade-in-down" style={{ animationDelay: '200ms' }}>
        {/* Campo de busca — expande ao focar */}
        <div className={`relative transition-all duration-300 ${buscaFocada ? 'flex-1' : 'flex-1 sm:max-w-xs'}`}>
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${buscaFocada ? 'text-[#1A3A6B]' : 'text-gray-400'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={buscaFocada ? 'Digite nome, bairro ou parceiro...' : 'Buscar por nome ou bairro...'}
            className={`input-field pl-10 transition-all duration-300 ${
              buscaFocada
                ? 'ring-2 ring-[#1A3A6B]/30 border-[#1A3A6B]/50'
                : ''
            }`}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setBuscaFocada(true)}
            onBlur={() => setBuscaFocada(false)}
          />
          {/* Botão limpar */}
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
              title="Limpar busca"
            >
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Select — desliza para fora ao focar na busca */}
        <div
          className="transition-all duration-300 overflow-hidden"
          style={{
            maxWidth: buscaFocada ? '0px' : '100%',
            opacity: buscaFocada ? 0 : 1,
            pointerEvents: buscaFocada ? 'none' : 'auto',
          }}
        >
          <select
            className="input-field sm:w-auto w-full"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
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
          return (
            <button
              key={dupla.id}
              onClick={() => navigate(`/duplas/${dupla.id}`)}
              className="w-full text-left card border-l-4 border-t-0 border-r-0 border-b-0 group transition-all duration-300 hover:-translate-y-0.5"
              style={{ borderLeftColor: cfg.cor }}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Avatar da dupla + medalha */}
                  <div className="flex-shrink-0">
                    <div className="relative">
                      <FotoPessoa
                        src={dupla.fotoLiderPreview}
                        nome={dupla.liderNome}
                        className="w-11 h-11 rounded-full shadow-md"
                        fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-sm"
                      />
                      <FotoPessoa
                        src={dupla.fotoMembro2Preview}
                        nome={dupla.membro2Nome}
                        className="w-8 h-8 rounded-full absolute -bottom-1 -right-1.5 border-2 border-white shadow-md"
                        fallbackClassName="bg-gradient-to-br from-[#C9963A] to-[#e5b05a] text-xs"
                      />
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

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Badge de medalha */}
                  <div
                    className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: cfg.cor + '18', color: cfg.cor }}
                  >
                    {cfg.emoji} {cfg.label}
                  </div>

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
