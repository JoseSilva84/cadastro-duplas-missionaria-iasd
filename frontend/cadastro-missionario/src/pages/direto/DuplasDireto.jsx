import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { FotoService } from '../../foto.service';

// ── Lógica de Gamificação (gameDuplas.md) ──────────────────────────────
function getMedalha(dupla) {
  const estudoAtivo = dupla.statusEstudoBiblico === 'ATIVO';
  const temBatismo  = (dupla.batismos || 0) > 0;
  const temPessoas  = (dupla.pessoasAlcancadas || 0) > 0;
  if (estudoAtivo && temBatismo && temPessoas) return 'ouro';
  if (estudoAtivo && !temBatismo && temPessoas) return 'prata';
  return 'bronze';
}

const medalhaConfig = {
  ouro:   { emoji: '🥇', label: 'Ouro',   cor: '#C9963A', bg: '#C9963A18' },
  prata:  { emoji: '🥈', label: 'Prata',  cor: '#6b7280', bg: '#6b728018' },
  bronze: { emoji: '🥉', label: 'Bronze', cor: '#92400e', bg: '#92400e15' },
};

const medalhaOrder = { ouro: 0, prata: 1, bronze: 2 };

// Link clicável do WhatsApp Web
const WhatsAppLink = ({ numero }) => {
  if (!numero) return null;
  const limpo = numero.replace(/\D/g, '');
  return (
    <a
      href={`https://web.whatsapp.com/send?phone=55${limpo}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[#25D366] font-medium hover:underline"
      title="Abrir no WhatsApp Web"
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
      {numero}
    </a>
  );
};

const projetoLabel = {
  CASA_A_CASA: 'Visitação',
  ESTUDO_BIBLICO: 'Estudo Bíblico',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  EVANGELISMO_PUBLICO: 'Classe Bíblica',
};

const projetoIcon = {
  CASA_A_CASA: '🏠',
  ESTUDO_BIBLICO: '📖',
  PEQUENOS_GRUPOS: '👥',
  ACAO_SOCIAL: '🤲',
  EVANGELISMO_PUBLICO: '📢',
};

const statusColors = { ATIVA: '#16a34a', PENDENTE: '#C9963A', INATIVA: '#9ca3af' };
const statusLabels = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };
const statusAcompanhamentoLabels = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  PENDENTE: 'Pendente',
};

const classeConfig = {
  A: { label: 'Classe A', cor: '#1A3A6B', bg: '#1A3A6B14' },
  B: { label: 'Classe B', cor: '#C9963A', bg: '#C9963A18' },
  C: { label: 'Classe C', cor: '#6b7280', bg: '#6b728014' },
};

const atividadeConfig = {
  ATIVA: { label: 'Ativa', cor: '#16a34a', bg: '#16a34a18' },
  INATIVA: { label: 'Inativa', cor: '#6b7280', bg: '#6b728014' },
};

const getEstudosCount = (dupla) => dupla?._count?.estudosBiblicos ?? dupla?.estudosBiblicos?.length ?? 0;
const getVisitacoesCount = (dupla) => dupla?._count?.acompanhamentos ?? dupla?.acompanhamentos?.length ?? 0;

const formatarData = (valor) => {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString('pt-BR');
};

const getClassificacaoAtividadeText = (dupla) => {
  const classe = classeConfig[dupla?.classificacaoDupla]?.label || 'Sem classe';
  const atividade = atividadeConfig[dupla?.atividadeDupla]?.label || 'Sem atividade';
  return `${classe} · ${atividade}`;
};

const ClassificacaoAtividadeBadge = ({ dupla, compact = false }) => {
  const classe = classeConfig[dupla?.classificacaoDupla];
  const atividade = atividadeConfig[dupla?.atividadeDupla];
  const cor = classe?.cor || atividade?.cor || '#6b7280';
  const bg = classe?.bg || atividade?.bg || '#f3f4f6';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
      style={{ backgroundColor: bg, color: cor, borderColor: `${cor}35` }}
    >
      {getClassificacaoAtividadeText(dupla)}
    </span>
  );
};

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

export default function DuplasDireto() {
  const navigate = useNavigate();
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [duplaSelecionadaId, setDuplaSelecionadaId] = useState(null);
  const [filtro, setFiltro] = useState(''); // pode ser status (ATIVA/PENDENTE/INATIVA) ou medalha (ouro/prata/bronze)
  const [busca, setBusca] = useState('');
  const [buscaFocada, setBuscaFocada] = useState(false);
  const [mostraDetalhe, setMostraDetalhe] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  const abrirFoto = (src, nome) => setFotoAmpliada({ src, nome });

  useEffect(() => {
    let ativo = true;
    api.get('/duplas').then(async (d) => {
      if (!ativo) return;
      const lista = Array.isArray(d.data) ? d.data : [];
      const listaComFotos = await Promise.all(lista.map(resolverFotosDaDupla));
      if (ativo) setDuplas(listaComFotos);
    }).catch(() => {
      if (ativo) setDuplas([]);
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, []);

  // Duplas com medalha calculada e ordenadas por medalha (Ouro → Prata → Bronze)
  const duplasComMedalha = useMemo(() =>
    [...duplas]
      .map(d => ({ ...d, _medalha: getMedalha(d) }))
      .sort((a, b) => medalhaOrder[a._medalha] - medalhaOrder[b._medalha]),
    [duplas]
  );

  // Contagem por medalha para os chips de filtro
  const contagemMedalha = useMemo(() => {
    const c = { ouro: 0, prata: 0, bronze: 0 };
    duplasComMedalha.forEach(d => { c[d._medalha] = (c[d._medalha] || 0) + 1; });
    return c;
  }, [duplasComMedalha]);

  // Filtra as duplas com base nos critérios de busca (memoizado)
  const duplasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const isMedalha = ['ouro', 'prata', 'bronze'].includes(filtro);
    return duplasComMedalha.filter((d) => {
      const matchFiltro = !filtro
        ? true
        : isMedalha
          ? d._medalha === filtro
          : d.status === filtro;
      const matchBusca = !termo ||
        (d.liderNome || '').toLowerCase().includes(termo) ||
        (d.membro2Nome || '').toLowerCase().includes(termo) ||
        (d.bairro || '').toLowerCase().includes(termo);
      return matchFiltro && matchBusca;
    });
  }, [duplasComMedalha, filtro, busca]);

  // Sincroniza a seleção quando a lista filtrada muda
  useEffect(() => {
    if (duplasFiltradas.length === 0) {
      setDuplaSelecionadaId(null);
      return;
    }

    const selecionadaAindaVisivel = duplasFiltradas.some(
      (d) => d.id === duplaSelecionadaId
    );

    if (!selecionadaAindaVisivel) {
      setDuplaSelecionadaId(duplasFiltradas[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplasFiltradas, duplaSelecionadaId]);

  // Deriva o objeto completo da dupla selecionada (memoizado)
  const duplaSelecionada = useMemo(() => {
    if (!duplaSelecionadaId) return null;
    return duplas.find((d) => d.id === duplaSelecionadaId) || null;
  }, [duplaSelecionadaId, duplas]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando duplas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* ===== PAINEL ESQUERDO: Filtros + Lista de Duplas (Master) ===== */}
      <div className={`${
        mostraDetalhe ? 'hidden sm:flex' : 'flex'
      } w-full sm:w-80 lg:w-[360px] flex-shrink-0 border-r border-gray-200 bg-white flex-col h-full overflow-hidden`}>
        {/* Cabeçalho + Filtros */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
                <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Direta</p>
              </div>
              <h1 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                Todas as Duplas
              </h1>
              <p className="text-gray-400 text-[10px]">{duplasFiltradas.length} dupla(s) encontrada(s)</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/direto/duplas/nova')}
              className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova
            </button>
          </div>

          {/* Chips de medalha com contagem */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {/* Chip "Todas" */}
            <button
              type="button"
              onClick={() => setFiltro('')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-200 ${
                filtro === ''
                  ? 'bg-[#1A3A6B] text-white border-[#1A3A6B] shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#1A3A6B]/30'
              }`}
            >
              Todas
              <span
                className="rounded-full px-1.5 py-px text-[9px] font-bold"
                style={{
                  backgroundColor: filtro === '' ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                  color: filtro === '' ? 'white' : '#6b7280',
                }}
              >
                {duplas.length}
              </span>
            </button>

            {/* Chips ouro / prata / bronze */}
            {(['ouro', 'prata', 'bronze']).map((m) => {
              const cfg = medalhaConfig[m];
              const ativo = filtro === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFiltro(ativo ? '' : m)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-200"
                  style={ativo
                    ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                    : { backgroundColor: cfg.bg, borderColor: cfg.cor + '55', color: cfg.cor }}
                >
                  {cfg.emoji}
                  {cfg.label}
                  <span
                    className="rounded-full px-1.5 py-px text-[9px] font-bold"
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

          {/* Filtros de busca e filtro unificado */}
          <div className="flex gap-2 transition-all duration-300">
            {/* Campo de busca — expande ao focar */}
            <div className={`relative transition-all duration-300 ${buscaFocada ? 'flex-1' : 'flex-1'}`}>
              <svg
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors duration-200 ${buscaFocada ? 'text-[#1A3A6B]' : 'text-gray-400'}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={buscaFocada ? 'Digite nome, bairro ou parceiro...' : 'Buscar...'}
                className={`input-field pl-8 text-xs py-2 transition-all duration-300 ${
                  buscaFocada
                    ? 'ring-2 ring-[#1A3A6B]/30 border-[#1A3A6B]/50 placeholder-gray-400'
                    : ''
                }`}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onFocus={() => setBuscaFocada(true)}
                onBlur={() => setBuscaFocada(false)}
              />
              {/* Botão limpar — só aparece quando há texto */}
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                  title="Limpar busca"
                >
                  <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Select — esconde suavemente ao focar na busca */}
            <div
              className="transition-all duration-300 overflow-hidden"
              style={{
                maxWidth: buscaFocada ? '0px' : '128px',
                opacity: buscaFocada ? 0 : 1,
                pointerEvents: buscaFocada ? 'none' : 'auto',
              }}
            >
              <select
                className="input-field text-xs py-2 w-32"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="">Todos</option>
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
        </div>

        {/* Lista de duplas */}
        <div className="flex-1 overflow-y-auto">
          {duplasFiltradas.map((dupla) => {
            const selecionada = duplaSelecionada?.id === dupla.id;
            const mcfg = medalhaConfig[dupla._medalha];
            const classCfg = classeConfig[dupla.classificacaoDupla];
            const borderColor = classCfg?.cor || mcfg.cor;

            return (
              <button
                type="button"
                key={dupla.id}
                onClick={() => { setDuplaSelecionadaId(dupla.id); setMostraDetalhe(true); }}
                className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                  selecionada
                    ? 'bg-[#1A3A6B]/5'
                    : 'bg-white hover:bg-gray-50'
                }`}
                style={{ borderLeftColor: selecionada ? borderColor : borderColor + '60' }}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Fotos lado a lado, mesmo tamanho, sem sobreposição */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <FotoPessoa
                          src={dupla.fotoLiderPreview}
                          nome={dupla.liderNome}
                          className="w-8 h-8 rounded-full shadow-sm"
                          fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-[10px]"
                          onPreview={abrirFoto}
                        />
                        <FotoPessoa
                          src={dupla.fotoMembro2Preview}
                          nome={dupla.membro2Nome}
                          className="w-8 h-8 rounded-full shadow-sm"
                          fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-[10px]"
                          onPreview={abrirFoto}
                        />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className={`text-xs font-semibold truncate transition-colors ${selecionada ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                          {dupla.liderNome || 'Sem nome'}
                        </p>
                        <p className={`text-xs font-semibold truncate transition-colors ${selecionada ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                          <span className="text-gray-300 mr-1">+</span>{dupla.membro2Nome || 'Sem nome'}
                        </p>
                      </div>
                    </div>

                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: mcfg.bg, color: mcfg.cor }}
                    >
                      {mcfg.emoji} {mcfg.label}
                    </span>
                  </div>

                  <div className={`mt-2 pt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400 ${selecionada ? 'border-t border-gray-100' : ''}`}>
                    <span>{dupla.distrito?.nome || 'Sem distrito'}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span>Estudos {getEstudosCount(dupla)}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span>Visitações {getVisitacoesCount(dupla)}</span>
                    <ClassificacaoAtividadeBadge dupla={dupla} compact />
                  </div>
                </div>
              </button>
            );
          })}

          {duplasFiltradas.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2 animate-float">👥</div>
              <p className="text-sm">Nenhuma dupla encontrada.</p>
              <button
                type="button"
                onClick={() => navigate('/direto/duplas/nova')}
                className="btn-primary mt-4 text-xs px-4 py-2"
              >
                Cadastrar dupla
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== PAINEL DIREITO: Detalhes da Dupla (Detail) ===== */}
      <div className={`${
        mostraDetalhe ? 'flex' : 'hidden sm:flex'
      } flex-1 flex-col h-full overflow-hidden bg-[#F4F5F7]`}>
        {!duplaSelecionada ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-float">👈</div>
              <p className="font-medium text-lg">Selecione uma dupla</p>
              <p className="text-sm mt-1">Clique em uma dupla à esquerda para ver os detalhes.</p>
            </div>
          </div>
        ) : (
          <div key={duplaSelecionada.id} className="flex flex-col h-full animate-slide-in-right">
            {/* Cabeçalho do detail */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
              {/* Botão voltar (mobile) */}
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
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Fotos lado a lado, mesmo tamanho */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <FotoPessoa
                      src={duplaSelecionada.fotoLiderPreview}
                      nome={duplaSelecionada.liderNome}
                      className="w-11 h-11 rounded-full shadow-md"
                      fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-sm"
                      onPreview={abrirFoto}
                    />
                    <FotoPessoa
                      src={duplaSelecionada.fotoMembro2Preview}
                      nome={duplaSelecionada.membro2Nome}
                      className="w-11 h-11 rounded-full shadow-md"
                      fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-sm"
                      onPreview={abrirFoto}
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                        {duplaSelecionada.liderNome || 'Sem nome'}
                      </h2>
                      <span className="text-gray-300">+</span>
                      <h2 className="text-lg font-bold text-[#1A3A6B]">
                        {duplaSelecionada.membro2Nome || 'Sem nome'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <ClassificacaoAtividadeBadge dupla={duplaSelecionada} />
                      {(() => {
                        const cor = statusColors[duplaSelecionada.status] || '#9ca3af';
                        return (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: cor + '20', color: cor }}
                          >
                            {statusLabels[duplaSelecionada.status] || duplaSelecionada.status}
                          </span>
                        );
                      })()}
                      <span className="text-[10px] text-gray-400">{duplaSelecionada.distrito?.nome || 'Sem distrito'}</span>
                      <span className="text-[10px] text-gray-400">Estudos {getEstudosCount(duplaSelecionada)}</span>
                      <span className="text-[10px] text-gray-400">Visitações {getVisitacoesCount(duplaSelecionada)}</span>
                      <span className="text-[10px] text-gray-400">
                        {projetoIcon[duplaSelecionada.tipoProjeto] || '📋'} {projetoLabel[duplaSelecionada.tipoProjeto] || duplaSelecionada.tipoProjeto || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ações no header */}
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/direto/duplas/${duplaSelecionada.id}/editar`)}
                    className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/direto/duplas/${duplaSelecionada.id}`)}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver completos
                  </button>
                </div>
              </div>
            </div>

            {/* Conteúdo do detail — grid vertical, sem scroll horizontal */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card: Membros (Líder + Parceiro lado a lado) */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-[10px] font-bold">👥</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Membros da Dupla</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Líder */}
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-[9px] font-bold">1</div>
                        <span className="text-xs font-semibold text-[#1A3A6B]">Membro</span>
                      </div>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center gap-3">
                          <FotoPessoa
                            src={duplaSelecionada.fotoLiderPreview}
                            nome={duplaSelecionada.liderNome}
                            className="w-11 h-11 rounded-full flex-shrink-0 ring-2 ring-[#1A3A6B]/10"
                            fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-sm"
                            onPreview={abrirFoto}
                          />
                          <div className="min-w-0">
                            <span className="text-gray-400 text-xs">Nome:</span>
                            <p className="text-gray-700 font-medium truncate">{duplaSelecionada.liderNome || '—'}</p>
                          </div>
                        </div>
                        {duplaSelecionada.liderTelefone && <div><span className="text-gray-400 text-xs">WhatsApp:</span><WhatsAppLink numero={duplaSelecionada.liderTelefone} /></div>}
                        {duplaSelecionada.liderEmail && <div><span className="text-gray-400 text-xs">E-mail:</span><p className="text-gray-700">{duplaSelecionada.liderEmail}</p></div>}
                        <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.liderIgreja || duplaSelecionada.igreja?.nome || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Distrito:</span><p className="text-gray-700">{duplaSelecionada.liderDistrito || duplaSelecionada.distrito?.nome || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Data de nascimento:</span><p className="text-gray-700">{formatarData(duplaSelecionada.liderDataNascimento) || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Endereço de correspondência:</span><p className="text-gray-700 break-words">{duplaSelecionada.liderEndereco || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Data de batismo:</span><p className="text-gray-700">{formatarData(duplaSelecionada.liderDataBatismo) || '—'}</p></div>
                      </div>
                    </div>

                    {/* Parceiro */}
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-[9px] font-bold">2</div>
                        <span className="text-xs font-semibold text-[#1A3A6B]">Membro</span>
                      </div>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center gap-3">
                          <FotoPessoa
                            src={duplaSelecionada.fotoMembro2Preview}
                            nome={duplaSelecionada.membro2Nome}
                            className="w-11 h-11 rounded-full flex-shrink-0 ring-2 ring-[#C9963A]/20"
                            fallbackClassName="bg-gradient-to-br from-[#C9963A] to-[#e5b05a] text-sm"
                            onPreview={abrirFoto}
                          />
                          <div className="min-w-0">
                            <span className="text-gray-400 text-xs">Nome:</span>
                            <p className="text-gray-700 font-medium truncate">{duplaSelecionada.membro2Nome || '—'}</p>
                          </div>
                        </div>
                        {duplaSelecionada.membro2Telefone && <div><span className="text-gray-400 text-xs">WhatsApp:</span><WhatsAppLink numero={duplaSelecionada.membro2Telefone} /></div>}
                        {duplaSelecionada.membro2Email && <div><span className="text-gray-400 text-xs">E-mail:</span><p className="text-gray-700">{duplaSelecionada.membro2Email}</p></div>}
                        <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.membro2Igreja || duplaSelecionada.igreja?.nome || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Distrito:</span><p className="text-gray-700">{duplaSelecionada.membro2Distrito || duplaSelecionada.distrito?.nome || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Data de nascimento:</span><p className="text-gray-700">{formatarData(duplaSelecionada.membro2DataNascimento) || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Endereço de correspondência:</span><p className="text-gray-700 break-words">{duplaSelecionada.membro2Endereco || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Data de batismo:</span><p className="text-gray-700">{formatarData(duplaSelecionada.membro2DataBatismo) || '—'}</p></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card: Localização */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📍</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Localização</h4>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {duplaSelecionada.distrito?.regiao?.nome && <div><span className="text-gray-400 text-xs">Região:</span><p className="text-gray-700">{duplaSelecionada.distrito.regiao.nome}</p></div>}
                    {duplaSelecionada.distrito?.nome && <div><span className="text-gray-400 text-xs">Distrito:</span><p className="text-gray-700">{duplaSelecionada.distrito.nome}</p></div>}
                    {duplaSelecionada.igreja?.nome && <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.igreja.nome}</p></div>}
                    <div><span className="text-gray-400 text-xs">Bairro:</span><p className="text-gray-700 font-medium">{duplaSelecionada.bairro || '—'}</p></div>
                  </div>
                </div>

                {/* Card: Projeto */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📋</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Projeto</h4>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div><span className="text-gray-400 text-xs">Tipo:</span><p className="text-gray-700 font-medium">{projetoLabel[duplaSelecionada.tipoProjeto] || duplaSelecionada.tipoProjeto || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Classe da dupla:</span><p className="text-gray-700 font-semibold">{getClassificacaoAtividadeText(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Estudos bíblicos:</span><p className="text-gray-700 font-medium">{getEstudosCount(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Visitações:</span><p className="text-gray-700 font-medium">{getVisitacoesCount(duplaSelecionada)}</p></div>
                    {(() => {
                      const cor = statusColors[duplaSelecionada.status] || '#9ca3af';
                      return (
                        <div><span className="text-gray-400 text-xs">Status:</span><p className="font-semibold" style={{ color: cor }}>{statusLabels[duplaSelecionada.status] || duplaSelecionada.status}</p></div>
                      );
                    })()}
                    {duplaSelecionada.pessoasAlcancadas > 0 && (
                      <div className="flex items-center gap-2 bg-[#C9963A]/10 rounded-lg px-3 py-2 mt-2">
                        <span className="text-lg">🙏</span>
                        <div>
                          <p className="text-[#C9963A] font-bold">{duplaSelecionada.pessoasAlcancadas}</p>
                          <p className="text-gray-400 text-[10px]">Meta de Contatos</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card: Observações */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs font-bold text-[#1A3A6B]">AC</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Acompanhamento</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-gray-400 text-xs">Estudo bíblico:</span><p className="text-gray-700 font-medium">{duplaSelecionada.estudoBiblico || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Status do estudo:</span><p className="text-gray-700 font-medium">{statusAcompanhamentoLabels[duplaSelecionada.statusEstudoBiblico] || duplaSelecionada.statusEstudoBiblico || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Status da classe bíblica:</span><p className="text-gray-700 font-medium">{statusAcompanhamentoLabels[duplaSelecionada.statusEvangelismo] || duplaSelecionada.statusEvangelismo || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Estudos bíblicos cadastrados:</span><p className="text-gray-700 font-medium">{getEstudosCount(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Visitações registradas:</span><p className="text-gray-700 font-medium">{getVisitacoesCount(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Pessoas alcançadas:</span><p className="text-gray-700 font-medium">{duplaSelecionada.pessoasAlcancadas ?? 0}</p></div>
                    <div><span className="text-gray-400 text-xs">Batismos:</span><p className="text-gray-700 font-medium">{duplaSelecionada.batismos ?? 0}</p></div>
                    <div><span className="text-gray-400 text-xs">Último acompanhamento:</span><p className="text-gray-700 font-medium">{formatarData(duplaSelecionada.ultimoAcompanhamento) || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Início da dupla:</span><p className="text-gray-700 font-medium">{formatarData(duplaSelecionada.dataInicio) || '—'}</p></div>
                  </div>
                </div>

                {duplaSelecionada.observacoes && (
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📝</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Observações</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{duplaSelecionada.observacoes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    {fotoAmpliada && (
      <div
        className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        onClick={() => setFotoAmpliada(null)}
      >
        <div
          className="relative w-full max-w-2xl flex flex-col items-center gap-4"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setFotoAmpliada(null)}
            className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/95 text-[#1A3A6B] flex items-center justify-center shadow-lg hover:bg-white transition"
            title="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={fotoAmpliada.src}
            alt={fotoAmpliada.nome || 'Foto ampliada'}
            className="max-h-[78vh] max-w-full rounded-2xl object-contain bg-white shadow-2xl"
          />
          {fotoAmpliada.nome && (
            <div className="px-4 py-2 rounded-full bg-white/95 text-[#1A3A6B] text-sm font-semibold shadow-lg">
              {fotoAmpliada.nome}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
