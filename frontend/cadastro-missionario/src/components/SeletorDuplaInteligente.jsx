import { useEffect, useMemo, useRef, useState } from 'react';

const normalizarTexto = (valor = '') =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const nomeCompletoDupla = (dupla) => {
  if (!dupla) return '';
  return [dupla.liderNome, dupla.membro2Nome].filter(Boolean).join(' + ');
};

const nomeIgrejaDaDupla = (dupla) =>
  dupla?.igreja?.nome?.trim() || 'Sem igreja vinculada';

const nomeDistritoDaDupla = (dupla) =>
  dupla?.distrito?.nome?.trim() || '';

const destacarTrecho = (texto = '', termo = '') => {
  const textoStr = String(texto || '');
  const termoLimpo = normalizarTexto(termo);
  if (!termoLimpo) return textoStr;

  const textoNormalizado = String(textoStr)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const idx = textoNormalizado.indexOf(termoLimpo);
  if (idx === -1) return textoStr;

  const fim = idx + termoLimpo.length;
  return (
    <>
      {textoStr.slice(0, idx)}
      <mark className="bg-[#FDFBF5] text-[#B37E22] font-extrabold px-0.5 rounded border border-[#EED9B3]">
        {textoStr.slice(idx, fim)}
      </mark>
      {textoStr.slice(fim)}
    </>
  );
};

const PASSO_LISTA = 60;

export default function SeletorDuplaInteligente({
  duplas = [],
  value = '',
  onChange,
  placeholder = 'Digite o nome da dupla ou filtre por igreja...',
}) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const [igrejaFiltro, setIgrejaFiltro] = useState('TODAS');
  const [limiteVisivel, setLimiteVisivel] = useState(PASSO_LISTA);

  // Se houver apenas 1 dupla no escopo (ex: perfil Dupla Missionária) e nada selecionado, pré-seleciona
  useEffect(() => {
    if (!value && duplas.length === 1 && duplas[0]?.id) {
      onChange?.(String(duplas[0].id));
    }
  }, [duplas, value, onChange]);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    const handleClickFora = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  const duplaSelecionada = useMemo(
    () => duplas.find((d) => String(d.id) === String(value)) || null,
    [duplas, value]
  );

  // Lista de igrejas disponíveis dentro do escopo atual do usuário
  const igrejasDisponiveis = useMemo(() => {
    const mapa = new Map();
    duplas.forEach((dupla) => {
      const chave = dupla?.igreja?.id ? String(dupla.igreja.id) : 'SEM_IGREJA';
      const nome = nomeIgrejaDaDupla(dupla);
      const distrito = nomeDistritoDaDupla(dupla);
      const atual = mapa.get(chave) || {
        chave,
        nome,
        distrito,
        totalDuplas: 0,
      };
      atual.totalDuplas += 1;
      mapa.set(chave, atual);
    });

    return [...mapa.values()].sort((a, b) => {
      if (a.chave === 'SEM_IGREJA') return 1;
      if (b.chave === 'SEM_IGREJA') return -1;
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
  }, [duplas]);

  const temMultiplasIgrejas = igrejasDisponiveis.length > 1;

  // Filtra duplas por igreja selecionada e pelo texto digitado (1º membro, 2º membro, igreja ou distrito)
  const duplasFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);
    const tokens = termo.split(/\s+/).filter(Boolean);

    return duplas.filter((dupla) => {
      const chaveIgreja = dupla?.igreja?.id ? String(dupla.igreja.id) : 'SEM_IGREJA';
      if (igrejaFiltro !== 'TODAS' && chaveIgreja !== igrejaFiltro) {
        return false;
      }

      if (tokens.length === 0) return true;

      const textoAlvo = normalizarTexto(
        `${dupla.liderNome || ''} ${dupla.membro2Nome || ''} ${nomeIgrejaDaDupla(dupla)} ${nomeDistritoDaDupla(dupla)}`
      );

      return tokens.every((token) => textoAlvo.includes(token));
    });
  }, [duplas, igrejaFiltro, busca]);

  const duplasVisiveis = useMemo(
    () => duplasFiltradas.slice(0, limiteVisivel),
    [duplasFiltradas, limiteVisivel]
  );

  const handleSelecionarDupla = (dupla) => {
    onChange?.(String(dupla.id));
    setAberto(false);
    setBusca('');
  };

  const handleTrocarDupla = () => {
    setAberto(true);
    setLimiteVisivel(PASSO_LISTA);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  };

  const handleLimparSelecao = () => {
    onChange?.('');
    setBusca('');
    setAberto(true);
    setLimiteVisivel(PASSO_LISTA);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 40);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Estado 1: Dupla já selecionada e menu fechado -> Mostra Card de Confirmação claro */}
      {duplaSelecionada && !aberto ? (
        <div className="rounded-xl border border-[#D4E1F5] bg-[#F8FAFF] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 transition-all">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-sm">
              {(duplaSelecionada.liderNome || 'D').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1A3A6B] truncate">
                {nomeCompletoDupla(duplaSelecionada)}
              </p>
              <p className="text-xs text-gray-500 truncate">
                <span className="font-semibold text-[#B37E22]">
                  {nomeIgrejaDaDupla(duplaSelecionada)}
                </span>
                {nomeDistritoDaDupla(duplaSelecionada)
                  ? ` • Distrito ${nomeDistritoDaDupla(duplaSelecionada)}`
                  : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleTrocarDupla}
              className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#1A3A6B] bg-white border border-gray-200 hover:border-[#1A3A6B] transition-colors"
            >
              Trocar
            </button>
            {duplas.length > 1 && (
              <button
                type="button"
                onClick={handleLimparSelecao}
                className="px-2 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
                title="Remover seleção"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Estado 2: Buscador Inteligente (por Nome + por Igreja) */
        <div className="space-y-2">
          {/* Se o usuário tem mais de 1 igreja no escopo (Regional, Distrital, Admin), exibe seletor rápido de Igreja */}
          {temMultiplasIgrejas && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 bg-[#F8FAFC] p-2 rounded-xl border border-gray-200/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A3A6B] px-1 flex-shrink-0">
                1. Filtrar Igreja:
              </span>
              <select
                value={igrejaFiltro}
                onChange={(e) => {
                  setIgrejaFiltro(e.target.value);
                  setLimiteVisivel(PASSO_LISTA);
                  setAberto(true);
                }}
                className="w-full sm:flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#1A3A6B]"
              >
                <option value="TODAS">
                  Todas as igrejas do seu acesso ({duplas.length} duplas)
                </option>
                {igrejasDisponiveis.map((ig) => (
                  <option key={ig.chave} value={ig.chave}>
                    {ig.nome}
                    {ig.distrito ? ` (${ig.distrito})` : ''} — {ig.totalDuplas}{' '}
                    {ig.totalDuplas === 1 ? 'dupla' : 'duplas'}
                  </option>
                ))}
              </select>
              {igrejaFiltro !== 'TODAS' && (
                <button
                  type="button"
                  onClick={() => {
                    setIgrejaFiltro('TODAS');
                    setLimiteVisivel(PASSO_LISTA);
                  }}
                  className="text-[11px] font-bold text-[#B37E22] hover:underline px-1.5 py-0.5 self-end sm:self-center"
                >
                  Ver todas
                </button>
              )}
            </div>
          )}

          {/* Campo de busca por nome ou abertura da lista */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={busca}
              onFocus={() => {
                setAberto(true);
                setLimiteVisivel(PASSO_LISTA);
              }}
              onChange={(e) => {
                setBusca(e.target.value);
                setLimiteVisivel(PASSO_LISTA);
                setAberto(true);
              }}
              placeholder={
                igrejaFiltro !== 'TODAS'
                  ? 'Digite o nome da dupla nesta igreja ou clique para escolher...'
                  : placeholder
              }
              className="input-field pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {busca && (
                <button
                  type="button"
                  onClick={() => {
                    setBusca('');
                    inputRef.current?.focus();
                  }}
                  className="px-1.5 py-0.5 text-xs font-bold text-gray-400 hover:text-gray-600"
                  title="Limpar busca"
                >
                  ✕
                </button>
              )}
              <button
                type="button"
                onClick={() => setAberto((prev) => !prev)}
                className="px-2 py-1 rounded-md text-xs font-semibold text-[#1A3A6B] bg-[#EEF3FB] hover:bg-[#E0E9F8] transition-colors"
              >
                {aberto ? 'Fechar' : 'Lista'}
              </button>
            </div>
          </div>

          {duplaSelecionada && aberto && (
            <div className="flex items-center justify-between text-xs text-gray-500 px-1">
              <span>
                Atual: <strong className="text-[#1A3A6B]">{nomeCompletoDupla(duplaSelecionada)}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  setBusca('');
                }}
                className="font-semibold text-[#1A3A6B] hover:underline"
              >
                Manter dupla atual
              </button>
            </div>
          )}
        </div>
      )}

      {/* Menu suspenso com resultados filtrados */}
      {aberto && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden">
          <div className="px-3.5 py-2 bg-[#F8FAFC] border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              {duplasFiltradas.length === 0
                ? 'Nenhuma dupla encontrada'
                : `${duplasFiltradas.length} ${
                    duplasFiltradas.length === 1 ? 'dupla encontrada' : 'duplas encontradas'
                  }`}
              {igrejaFiltro !== 'TODAS' ? ' na igreja selecionada' : ''}
            </span>
            <span className="text-[11px] text-gray-400">
              Busque pelo 1º nome, 2º nome ou igreja
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {duplasVisiveis.length === 0 ? (
              <div className="p-5 text-center space-y-2">
                <p className="text-sm font-semibold text-gray-600">
                  Nenhuma dupla corresponde à busca.
                </p>
                {igrejaFiltro !== 'TODAS' && (
                  <button
                    type="button"
                    onClick={() => setIgrejaFiltro('TODAS')}
                    className="text-xs font-bold text-[#1A3A6B] underline"
                  >
                    Buscar em todas as igrejas do seu acesso
                  </button>
                )}
              </div>
            ) : (
              duplasVisiveis.map((dupla) => {
                const selecionada = String(dupla.id) === String(value);
                const nomeDupla = nomeCompletoDupla(dupla);
                const igrejaNome = nomeIgrejaDaDupla(dupla);
                const distritoNome = nomeDistritoDaDupla(dupla);

                return (
                  <button
                    key={dupla.id}
                    type="button"
                    onClick={() => handleSelecionarDupla(dupla)}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between gap-3 ${
                      selecionada
                        ? 'bg-[#EEF3FB] border-l-4 border-[#1A3A6B]'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#1A3A6B] truncate">
                        {destacarTrecho(nomeDupla, busca)}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 mt-0.5">
                        <span className="font-semibold text-[#B37E22]">
                          Igreja: {destacarTrecho(igrejaNome, busca)}
                        </span>
                        {distritoNome && (
                          <span>• Distrito: {destacarTrecho(distritoNome, busca)}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#1A3A6B] bg-white border border-gray-200 rounded-lg px-2.5 py-1 flex-shrink-0">
                      {selecionada ? 'Selecionada' : 'Escolher'}
                    </span>
                  </button>
                );
              })
            )}

            {duplasFiltradas.length > duplasVisiveis.length && (
              <div className="p-2.5 bg-[#F8FAFC] text-center">
                <button
                  type="button"
                  onClick={() => setLimiteVisivel((prev) => prev + PASSO_LISTA)}
                  className="text-xs font-bold text-[#1A3A6B] hover:underline"
                >
                  Mostrar mais duplas (+
                  {Math.min(PASSO_LISTA, duplasFiltradas.length - duplasVisiveis.length)} de{' '}
                  {duplasFiltradas.length - duplasVisiveis.length} restantes)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
