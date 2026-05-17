import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';

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

const statusColors = { ATIVA: '#16a34a', PENDENTE: '#C9963A', INATIVA: '#9ca3af' };
const statusLabels = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };

export default function DuplasDireto() {
  const navigate = useNavigate();
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [duplaSelecionadaId, setDuplaSelecionadaId] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [mostraDetalhe, setMostraDetalhe] = useState(false);

  useEffect(() => {
    let ativo = true;
    api.get('/duplas').then((d) => {
      if (!ativo) return;
      const lista = Array.isArray(d.data) ? d.data : [];
      setDuplas(lista);
    }).catch(() => {
      if (ativo) setDuplas([]);
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, []);

  // Filtra as duplas com base nos critérios de busca (memoizado)
  const duplasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return duplas.filter((d) => {
      const matchStatus = !filtroStatus || d.status === filtroStatus;
      const matchBusca = !termo ||
        (d.liderNome || '').toLowerCase().includes(termo) ||
        (d.membro2Nome || '').toLowerCase().includes(termo) ||
        (d.bairro || '').toLowerCase().includes(termo);
      return matchStatus && matchBusca;
    });
  }, [duplas, filtroStatus, busca]);

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

          {/* Filtros */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar..."
                className="input-field pl-8 text-xs py-2"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <select
              className="input-field text-xs py-2 w-28"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="ATIVA">Ativa</option>
              <option value="PENDENTE">Pendente</option>
              <option value="INATIVA">Inativa</option>
            </select>
          </div>
        </div>

        {/* Lista de duplas */}
        <div className="flex-1 overflow-y-auto">
          {duplasFiltradas.map((dupla) => {
            const selecionada = duplaSelecionada?.id === dupla.id;
            const cor = statusColors[dupla.status] || '#9ca3af';

            return (
              <button
                type="button"
                key={dupla.id}
                onClick={() => { setDuplaSelecionadaId(dupla.id); setMostraDetalhe(true); }}
                className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                  selecionada
                    ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]'
                    : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
                }`}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex-shrink-0 relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-[10px] shadow-sm">
                          {(dupla.liderNome || '?').charAt(0)}
                        </div>
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white font-bold text-[8px] absolute -bottom-0.5 -right-1 border border-white shadow-sm">
                          {(dupla.membro2Nome || '?').charAt(0)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate transition-colors ${selecionada ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                          {dupla.liderNome || 'Sem nome'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-gray-400 truncate">+ {dupla.membro2Nome || 'Sem nome'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: cor + '20', color: cor }}
                      >
                        {statusLabels[dupla.status] || dupla.status || '—'}
                      </span>
                      <span className="text-[9px] text-gray-400">
                        {projetoIcon[dupla.tipoProjeto] || '📋'}
                      </span>
                    </div>
                  </div>

                  {/* Info extra quando selecionada */}
                  {selecionada && (
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-400">
                      <span>{dupla.bairro || 'Sem bairro'}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>{projetoLabel[dupla.tipoProjeto] || dupla.tipoProjeto || '—'}</span>
                      {dupla.pessoasAlcancadas > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="text-[#C9963A] font-semibold">🙏 {dupla.pessoasAlcancadas}</span>
                        </>
                      )}
                    </div>
                  )}
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
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {(duplaSelecionada.liderNome || '?').charAt(0)}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white font-bold text-[10px] absolute -bottom-1 -right-1 border-2 border-white shadow-sm">
                      {(duplaSelecionada.membro2Nome || '?').charAt(0)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                        {duplaSelecionada.liderNome || 'Sem nome'}
                      </h2>
                      <span className="text-gray-300">+</span>
                      <h2 className="text-lg font-medium text-gray-600">
                        {duplaSelecionada.membro2Nome || 'Sem nome'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                      <span className="text-[10px] text-gray-400">{duplaSelecionada.bairro || 'Sem bairro'}</span>
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
                        <span className="text-xs font-semibold text-[#1A3A6B]">Líder</span>
                      </div>
                      <div className="space-y-2.5 text-sm">
                        <div><span className="text-gray-400 text-xs">Nome:</span><p className="text-gray-700 font-medium">{duplaSelecionada.liderNome || '—'}</p></div>
                        {duplaSelecionada.liderTelefone && <div><span className="text-gray-400 text-xs">Telefone:</span><p className="text-gray-700">{duplaSelecionada.liderTelefone}</p></div>}
                        {duplaSelecionada.liderEmail && <div><span className="text-gray-400 text-xs">E-mail:</span><p className="text-gray-700">{duplaSelecionada.liderEmail}</p></div>}
                        {duplaSelecionada.liderIgreja && <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.liderIgreja}</p></div>}
                      </div>
                    </div>

                    {/* Parceiro */}
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-[9px] font-bold">2</div>
                        <span className="text-xs font-semibold text-[#1A3A6B]">Parceiro</span>
                      </div>
                      <div className="space-y-2.5 text-sm">
                        <div><span className="text-gray-400 text-xs">Nome:</span><p className="text-gray-700 font-medium">{duplaSelecionada.membro2Nome || '—'}</p></div>
                        {duplaSelecionada.membro2Telefone && <div><span className="text-gray-400 text-xs">Telefone:</span><p className="text-gray-700">{duplaSelecionada.membro2Telefone}</p></div>}
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
                          <p className="text-gray-400 text-[10px]">pessoas alcançadas</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card: Observações */}
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
  );
}
