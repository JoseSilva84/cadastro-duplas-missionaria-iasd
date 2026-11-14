import { useMemo, useState } from 'react';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const normalizarTexto = (valor = '') =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatarData = (valor) => {
  if (!valor) return 'Não informado';
  const str = String(valor).trim();
  const matchIso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
  }
  const data = new Date(str);
  if (Number.isNaN(data.getTime())) return 'Não informado';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

export const somarMapasIgreja = (mapas = []) => {
  const lista = Array.isArray(mapas) ? mapas : mapas ? [mapas] : [];
  return lista.reduce((acc, mapa) => {
    const acoes = Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias : [];
    const igrejaId = mapa.igrejaId || mapa.igreja?.id || null;
    const igrejaNome = mapa.igreja?.nome || 'Igreja não informada';
    const distritoId = mapa.igreja?.distrito?.id || mapa.igreja?.distritoId || null;
    const distritoNome = mapa.igreja?.distrito?.nome || '';
    const regiaoId = mapa.igreja?.distrito?.regiao?.id || null;
    const regiaoNome = mapa.igreja?.distrito?.regiao?.nome || '';
    const pastorNome = mapa.pastorNome || mapa.igreja?.distrito?.nomePastor || '';

    const acoesEnriquecidas = acoes.map((acao, idx) => ({
      ...acao,
      idUnico: `${mapa.id || igrejaId || 'm'}-${idx}-${acao.nome || ''}`,
      mapaId: mapa.id || null,
      igrejaId,
      igrejaNome: acao.igrejaNome || igrejaNome,
      distritoId,
      distritoNome: acao.distritoNome || distritoNome,
      regiaoId,
      regiaoNome: acao.regiaoNome || regiaoNome,
      pastorNome: acao.pastorNome || pastorNome,
    }));

    return {
      quantidadePequenosGrupos: acc.quantidadePequenosGrupos + Number(mapa.quantidadePequenosGrupos || 0),
      semanaSanta: acc.semanaSanta + Number(mapa.semanaSanta || 0),
      classeBiblica: acc.classeBiblica + Number(mapa.classeBiblica || 0),
      aventureiros: acc.aventureiros + Number(mapa.aventureiros || 0),
      desbravadores: acc.desbravadores + Number(mapa.desbravadores || 0),
      quantidadeDuplasMissionarias: acc.quantidadeDuplasMissionarias + Number(mapa.igreja?._count?.duplas || 0),
      acoesMissionarias: [...acc.acoesMissionarias, ...acoesEnriquecidas],
    };
  }, {
    quantidadePequenosGrupos: 0,
    semanaSanta: 0,
    classeBiblica: 0,
    aventureiros: 0,
    desbravadores: 0,
    quantidadeDuplasMissionarias: 0,
    acoesMissionarias: [],
  });
};

export const ESTRUTURA_CARDS_BASE = [
  ['Pequeno Grupo', 'quantidadePequenosGrupos', '#C9963A'],
  ['Semana Santa', 'semanaSanta', '#0d9488'],
  ['Classe Bíblica', 'classeBiblica', '#7c3aed'],
  ['Aventureiros', 'aventureiros', '#0284c7'],
  ['Duplas Missionárias', 'quantidadeDuplasMissionarias', '#1A3A6B'],
  ['Desbravadores', 'desbravadores', '#dc2626'],
];

const obterValorCampoMapa = (mapa, campo) => {
  if (campo === 'quantidadeDuplasMissionarias') {
    return Number(mapa?.igreja?._count?.duplas || 0);
  }
  return Number(mapa?.[campo] || 0);
};

export default function MapaIgrejaResumo({
  mapas,
  titulo = 'Mapa da Igreja',
  subtitulo,
  compacto = false,
  acoesFiltradasExternas = null,
  onSelecionarIgreja = null,
  indicadorAtivoExterno = null,
  onSelecionarIndicador = null,
}) {
  const lista = useMemo(() => (Array.isArray(mapas) ? mapas : mapas ? [mapas] : []), [mapas]);
  const resumo = useMemo(() => somarMapasIgreja(lista), [lista]);
  const multiplasIgrejas = lista.length > 1;

  const [indicadorExpandidoLocal, setIndicadorExpandidoLocal] = useState(null);
  const [buscaAcao, setBuscaAcao] = useState('');
  const [acaoAgrupadaSelecionada, setAcaoAgrupadaSelecionada] = useState('');
  const [igrejaFiltroAcao, setIgrejaFiltroAcao] = useState('');

  const indicadorAtivo = indicadorAtivoExterno !== null ? indicadorAtivoExterno : indicadorExpandidoLocal;

  const alternarIndicador = (campo) => {
    if (onSelecionarIndicador) {
      onSelecionarIndicador(indicadorAtivo === campo ? null : campo);
    } else {
      setIndicadorExpandidoLocal((atual) => (atual === campo ? null : campo));
    }
  };

  const acoesBase = acoesFiltradasExternas || resumo.acoesMissionarias;

  // Agrupamento inteligente de ações por título normalizado
  const gruposAcoes = useMemo(() => {
    const mapaGrupos = new Map();
    acoesBase.forEach((acao) => {
      const chave = normalizarTexto(acao.nome);
      if (!chave) return;
      if (!mapaGrupos.has(chave)) {
        mapaGrupos.set(chave, {
          chave,
          rotulo: String(acao.nome).trim(),
          total: 0,
          igrejas: new Set(),
        });
      }
      const grupo = mapaGrupos.get(chave);
      grupo.total += 1;
      if (acao.igrejaNome) grupo.igrejas.add(acao.igrejaNome);
    });
    return Array.from(mapaGrupos.values()).sort((a, b) => b.total - a.total || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  }, [acoesBase]);

  const igrejasComAcoes = useMemo(() => {
    const mapaIgrejas = new Map();
    acoesBase.forEach((acao) => {
      if (!acao.igrejaId && !acao.igrejaNome) return;
      const chave = String(acao.igrejaId || acao.igrejaNome);
      if (!mapaIgrejas.has(chave)) {
        mapaIgrejas.set(chave, {
          id: acao.igrejaId,
          nome: acao.igrejaNome,
          distritoNome: acao.distritoNome,
          total: 0,
        });
      }
      mapaIgrejas.get(chave).total += 1;
    });
    return Array.from(mapaIgrejas.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [acoesBase]);

  const acoesExibidas = useMemo(() => {
    const termo = normalizarTexto(buscaAcao);
    return acoesBase.filter((acao) => {
      if (acaoAgrupadaSelecionada && normalizarTexto(acao.nome) !== acaoAgrupadaSelecionada) {
        return false;
      }
      if (igrejaFiltroAcao && String(acao.igrejaId || acao.igrejaNome) !== String(igrejaFiltroAcao)) {
        return false;
      }
      if (!termo) return true;
      return (
        normalizarTexto(acao.nome).includes(termo) ||
        normalizarTexto(acao.responsavel).includes(termo) ||
        normalizarTexto(acao.igrejaNome).includes(termo) ||
        normalizarTexto(acao.distritoNome).includes(termo)
      );
    });
  }, [acoesBase, buscaAcao, acaoAgrupadaSelecionada, igrejaFiltroAcao]);

  const detalhamentoIndicador = useMemo(() => {
    if (!indicadorAtivo || !multiplasIgrejas) return null;
    const config = ESTRUTURA_CARDS_BASE.find(([, campo]) => campo === indicadorAtivo);
    if (!config) return null;
    const [label, campo, cor] = config;
    const itens = lista
      .map((mapa) => ({
        mapaId: mapa.id,
        igrejaId: mapa.igrejaId || mapa.igreja?.id,
        igrejaNome: mapa.igreja?.nome || 'Sem nome',
        distritoNome: mapa.igreja?.distrito?.nome || 'Sem distrito',
        regiaoNome: mapa.igreja?.distrito?.regiao?.nome || '',
        pastorNome: mapa.pastorNome || mapa.igreja?.distrito?.nomePastor || '',
        valor: obterValorCampoMapa(mapa, campo),
      }))
      .sort((a, b) => b.valor - a.valor || a.igrejaNome.localeCompare(b.igrejaNome, 'pt-BR'));

    const maxValor = Math.max(...itens.map((i) => i.valor), 1);
    return { label, campo, cor, itens, maxValor };
  }, [indicadorAtivo, lista, multiplasIgrejas]);

  return (
    <section className="group rounded-xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:border-[#C9963A]/60 hover:shadow-xl hover:shadow-[#1A3A6B]/5 sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9963A]">Relatório analítico</p>
          <h3 className="text-lg font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h3>
          {subtitulo && <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {multiplasIgrejas && (
            <span className="text-[11px] font-medium text-slate-400">
              Clique em um indicador abaixo para ver por igreja
            </span>
          )}
          <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            {lista.length} mapa{lista.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-3 ${compacto ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-3 xl:grid-cols-6'}`}>
        {ESTRUTURA_CARDS_BASE.map(([label, campo, cor]) => {
          const ativo = indicadorAtivo === campo;
          return (
            <button
              key={campo}
              type="button"
              onClick={() => multiplasIgrejas && alternarIndicador(campo)}
              className={`group/card text-left rounded-lg border p-3 transition-all duration-300 ease-out ${
                multiplasIgrejas ? 'cursor-pointer hover:-translate-y-1 hover:bg-white hover:shadow-lg' : 'cursor-default'
              } ${ativo ? 'bg-white ring-2 shadow-md' : 'bg-slate-50'}`}
              style={{
                borderColor: ativo ? cor : `${cor}30`,
                ...(ativo ? { '--tw-ring-color': `${cor}40` } : {}),
              }}
            >
              <div className="mb-2.5 flex items-center justify-between gap-1">
                <div className="h-1.5 w-10 rounded-full transition-all duration-300 group-hover/card:w-14" style={{ backgroundColor: cor }} />
                {multiplasIgrejas && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover/card:text-[#1A3A6B]">
                    {ativo ? 'Ocultar' : 'Ver igrejas'}
                  </span>
                )}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors duration-300 group-hover/card:text-[#1A3A6B]">{label}</p>
              <p className="mt-1 text-2xl font-bold transition-transform duration-300 group-hover/card:translate-x-0.5" style={{ color: cor }}>{numero(resumo[campo])}</p>
            </button>
          );
        })}
      </div>

      {/* Painel expansível ao clicar em qualquer indicador (ex.: Pequeno Grupo, Classe Bíblica, etc.) */}
      {detalhamentoIndicador && (
        <div className="mt-4 rounded-xl border border-[#1A3A6B]/15 bg-slate-50/80 p-4 animate-fade-in-up">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: detalhamentoIndicador.cor }}>
                Detalhamento por igreja mapeada
              </p>
              <h4 className="text-base font-bold text-[#1A3A6B]">
                {detalhamentoIndicador.label} — {numero(resumo[detalhamentoIndicador.campo])} no total
              </h4>
            </div>
            <button
              type="button"
              onClick={() => alternarIndicador(detalhamentoIndicador.campo)}
              className="self-start sm:self-auto rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Fechar detalhamento ✕
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {detalhamentoIndicador.itens.map((item) => {
              const largura = item.valor > 0 ? Math.max(8, Math.round((item.valor / detalhamentoIndicador.maxValor) * 100)) : 0;
              return (
                <div
                  key={item.igrejaId || item.igrejaNome}
                  onClick={() => onSelecionarIgreja && item.igrejaId && onSelecionarIgreja(item.igrejaId)}
                  className={`rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm transition-all ${
                    onSelecionarIgreja ? 'cursor-pointer hover:-translate-y-0.5 hover:border-[#C9963A] hover:shadow-md' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-sm text-[#1A3A6B]">{item.igrejaNome}</p>
                      <p className="truncate text-[11px] text-slate-400">
                        {item.distritoNome}{item.regiaoNome ? ` · ${item.regiaoNome}` : ''}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-lg px-2.5 py-1 text-sm font-black"
                      style={{ backgroundColor: `${detalhamentoIndicador.cor}15`, color: detalhamentoIndicador.cor }}
                    >
                      {numero(item.valor)}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${largura}%`, backgroundColor: detalhamentoIndicador.cor }}
                    />
                  </div>
                  {onSelecionarIgreja && (
                    <p className="mt-1.5 text-[10px] font-semibold text-[#C9963A]">
                      Abrir Mapa desta igreja →
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 transition-all duration-300 hover:border-[#C9963A]/40 hover:bg-white hover:shadow-lg sm:p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-[#1A3A6B]">Ações missionárias</p>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#1A3A6B] shadow-sm">
              {acoesExibidas.length}{acoesExibidas.length !== acoesBase.length ? ` de ${acoesBase.length}` : ''}
            </span>
          </div>

          {acoesBase.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {multiplasIgrejas && igrejasComAcoes.length > 1 && (
                <select
                  value={igrejaFiltroAcao}
                  onChange={(e) => setIgrejaFiltroAcao(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#1A3A6B] focus:outline-none"
                >
                  <option value="">Todas as igrejas com ações ({igrejasComAcoes.length})</option>
                  {igrejasComAcoes.map((ig) => (
                    <option key={ig.id || ig.nome} value={String(ig.id || ig.nome)}>
                      {ig.nome} ({ig.total} ação{ig.total === 1 ? '' : 'ões'})
                    </option>
                  ))}
                </select>
              )}

              {gruposAcoes.length > 1 && (
                <select
                  value={acaoAgrupadaSelecionada}
                  onChange={(e) => setAcaoAgrupadaSelecionada(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#1A3A6B] focus:outline-none"
                >
                  <option value="">Todas as ações ({gruposAcoes.length} tipos)</option>
                  {gruposAcoes.map((g) => (
                    <option key={g.chave} value={g.chave}>
                      {g.rotulo} ({g.total})
                    </option>
                  ))}
                </select>
              )}

              <div className="relative min-w-[200px] flex-1 sm:w-60">
                <input
                  type="text"
                  value={buscaAcao}
                  onChange={(e) => setBuscaAcao(e.target.value)}
                  placeholder="Pesquisar ação, responsável ou igreja..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-7 text-xs text-slate-700 placeholder:text-slate-400 focus:border-[#1A3A6B] focus:outline-none"
                />
                {buscaAcao && (
                  <button
                    type="button"
                    onClick={() => setBuscaAcao('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
                    title="Limpar pesquisa"
                  >
                    ✕
                  </button>
                )}
              </div>

              {(buscaAcao || acaoAgrupadaSelecionada || igrejaFiltroAcao) && (
                <button
                  type="button"
                  onClick={() => {
                    setBuscaAcao('');
                    setAcaoAgrupadaSelecionada('');
                    setIgrejaFiltroAcao('');
                  }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Limpar
                </button>
              )}
            </div>
          )}
        </div>

        {/* Chips inteligentes das ações mais cadastradas */}
        {multiplasIgrejas && gruposAcoes.length > 1 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Mais frequentes:
            </span>
            <button
              type="button"
              onClick={() => setAcaoAgrupadaSelecionada('')}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                !acaoAgrupadaSelecionada
                  ? 'bg-[#1A3A6B] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-[#1A3A6B]/40'
              }`}
            >
              Todas ({acoesBase.length})
            </button>
            {gruposAcoes.slice(0, 10).map((grupo) => {
              const ativo = acaoAgrupadaSelecionada === grupo.chave;
              return (
                <button
                  key={grupo.chave}
                  type="button"
                  onClick={() => setAcaoAgrupadaSelecionada(ativo ? '' : grupo.chave)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    ativo
                      ? 'bg-[#C9963A] text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-[#C9963A]'
                  }`}
                >
                  {grupo.rotulo} <span className="opacity-75">({grupo.total})</span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
          {acoesExibidas.map((acao, index) => (
            <div
              key={acao.idUnico || `${acao.nome}-${index}`}
              onClick={() => onSelecionarIgreja && acao.igrejaId && onSelecionarIgreja(acao.igrejaId)}
              className={`rounded-xl border border-slate-100 bg-white p-3 text-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C9963A]/50 hover:shadow-md ${
                onSelecionarIgreja && acao.igrejaId ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-[#1A3A6B]">{acao.nome}</p>
                <span className="shrink-0 rounded-full bg-[#C9963A]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#C9963A]">
                  {formatarData(acao.data)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Responsável: <span className="font-medium text-slate-700">{acao.responsavel || 'Não informado'}</span>
              </p>
              {multiplasIgrejas && acao.igrejaNome && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2">
                  <span className="inline-flex items-center rounded-md bg-[#1A3A6B]/8 px-2 py-0.5 text-[10px] font-bold text-[#1A3A6B]">
                    {acao.igrejaNome}
                  </span>
                  {acao.distritoNome && (
                    <span className="text-[10px] font-medium text-slate-400">
                      · {acao.distritoNome}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {acoesExibidas.length === 0 && (
            <p className="rounded-lg bg-white p-4 text-sm text-slate-400 md:col-span-2 xl:col-span-3">
              Nenhuma ação missionária encontrada para os filtros selecionados.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
