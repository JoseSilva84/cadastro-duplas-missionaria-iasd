import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';
import { toast } from '../lib/toast';

const totalLicoes = (serieId) => SERIES_ESTUDO.find((serie) => serie.id === serieId)?.licoes.length || 0;
const progresso = (estudo) => {
  const total = totalLicoes(estudo.serie);
  if (!total) return 0;
  return Math.min(100, Math.round((Number(estudo.licaoAtual || 0) / total) * 100));
};

const participantesResumo = (estudo) => (
  estudo.participantes?.length
    ? estudo.participantes.map((participante) => participante.nome).join(', ')
    : estudo.nomeEstudante
);

const classeInfo = {
  A: { label: 'A - Pronto para o batismo', curto: 'A', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  B: { label: 'B - Quer, mas tem impedimento', curto: 'B', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  C: { label: 'C - Nao esta pronto', curto: 'C', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const ClassificacaoBadge = ({ classe, motivo, compacto = false }) => {
  const info = classeInfo[classe];
  if (!info) return <span className="text-xs text-gray-400">Sem classificacao</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${compacto ? 'px-2 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'} ${info.bg} ${info.text} ${info.border}`} title={motivo || info.label}>
      <span className={`w-2 h-2 rounded-full ${info.dot}`} />
      {compacto ? info.curto : info.label}
    </span>
  );
};

const abrirPdf = ({ titulo, estudos, tipoRelatorio }) => {
  const linhas = estudos.map((item) => `
    <tr>
      <td>${tipoRelatorio === 'PONTO' ? item.nomeEstudante : participantesResumo(item)}</td>
      <td>${item.cidade || ''}/${item.estado || ''}</td>
      <td>${getSerieNome(item.serie)}</td>
      <td>${getLicaoLabel(item.serie, item.licaoAtual)}</td>
      <td>${tipoRelatorio === 'PONTO' ? (item.participantes || []).map((p) => `${p.nome}: ${p.classificacaoInteressado || '-'}`).join(', ') : (classeInfo[item.classificacaoInteressado]?.label || '-')}</td>
      <td>${progresso(item)}%</td>
      <td>${item.dupla?.liderNome || ''} + ${item.dupla?.membro2Nome || ''}</td>
      <td>${item.diaEstudo || ''}</td>
    </tr>
  `).join('');

  const janela = window.open('', '_blank');
  if (!janela) return;
  janela.document.write(`
    <html>
      <head>
        <title>${titulo}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; padding: 28px; }
          h1 { color: #1A3A6B; margin: 0 0 6px; }
          p { color: #6b7280; margin: 0 0 22px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #1A3A6B; color: white; text-align: left; padding: 9px; }
          td { border-bottom: 1px solid #e5e7eb; padding: 9px; vertical-align: top; }
        </style>
      </head>
      <body>
        <h1>${titulo}</h1>
        <p>${estudos.length} registro(s) exportado(s)</p>
        <table>
          <thead><tr><th>Nome</th><th>Cidade/UF</th><th>Série</th><th>Lição</th><th>Classificação</th><th>Progresso</th><th>Dupla</th><th>Dia</th></tr></thead>
          <tbody>${linhas || '<tr><td colspan="7">Nenhum registro encontrado.</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `);
  janela.document.close();
  janela.focus();
  janela.print();
};

export default function RelatorioEstudosBiblicos({ tipoRelatorio = 'UNICO' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const isPonto = tipoRelatorio === 'PONTO';
  const titulo = isPonto ? 'Pontos de Estudo Bíblico' : 'Estudantes Bíblicos';
  const [resultado, setResultado] = useState({ total: 0, estudos: [], porSerie: [] });
  const [duplas, setDuplas] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [licoesEditadas, setLicoesEditadas] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState({
    duplaId: '',
    serie: '',
    licaoAtual: '',
    cidade: '',
    nome: '',
    dataInicio: '',
    dataFim: '',
  });

  const licoes = useMemo(() => (
    SERIES_ESTUDO.find((serie) => serie.id === filtros.serie)?.licoes || []
  ), [filtros.serie]);

  const carregar = () => {
    setCarregando(true);
    const params = {
      ...Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor)),
      tipoEstudo: tipoRelatorio,
    };
    Promise.all([
      api.get('/relatorios/estudos-biblicos', { params }),
      api.get('/duplas'),
    ]).then(([relatorio, duplasRes]) => {
      setResultado(relatorio.data);
      setDuplas(Array.isArray(duplasRes.data) ? duplasRes.data : []);
      setSelecionado(relatorio.data.estudos?.[0] || null);
    }).finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoRelatorio]);

  const set = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
      ...(campo === 'serie' ? { licaoAtual: '' } : {}),
    }));
  };

  const salvarLicao = async (estudo) => {
    const licaoAtual = licoesEditadas[estudo.id];
    if (!licaoAtual || Number(licaoAtual) === Number(estudo.licaoAtual)) return;

    await api.put(`/estudos-biblicos/${estudo.id}`, {
      nomeEstudante: estudo.nomeEstudante,
      endereco: estudo.endereco,
      cidade: estudo.cidade,
      estado: estudo.estado,
      whatsapp: estudo.whatsapp,
      diaEstudo: estudo.diaEstudo,
      horarioEstudo: estudo.horarioEstudo || '',
      duplaId: estudo.duplaId,
      serie: estudo.serie,
      licaoAtual,
      tipoEstudo: estudo.tipoEstudo,
      sexo: estudo.sexo || '',
      classificacaoInteressado: estudo.classificacaoInteressado || '',
      observacoes: estudo.observacoes || '',
      motivoImpedimento: estudo.motivoImpedimento || '',
      participantes: estudo.participantes || undefined,
    });
    toast.success('Lição atualizada.');
    carregar();
  };

  const limpar = () => {
    setFiltros({ duplaId: '', serie: '', licaoAtual: '', cidade: '', nome: '', dataInicio: '', dataFim: '' });
    setTimeout(carregar, 0);
  };

  const mediaProgresso = resultado.estudos.length
    ? Math.round(resultado.estudos.reduce((acc, estudo) => acc + progresso(estudo), 0) / resultado.estudos.length)
    : 0;
  const concluidos = resultado.estudos.filter((estudo) => progresso(estudo) >= 100).length;
  const detalhesPath = (id) => {
    const base = isDireto ? '/direto/relatorios' : '/relatorios';
    return `${base}/${isPonto ? 'pontos-estudo' : 'estudos-biblicos'}/${id}`;
  };

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Relatório</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          {titulo}
        </h1>
        <p className="text-gray-400 text-sm mt-1">{resultado.total} registro(s) encontrado(s)</p>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card"><p className="text-xs text-gray-400">Registros</p><p className="text-2xl font-bold text-[#1A3A6B]">{resultado.total}</p></div>
          <div className="card"><p className="text-xs text-gray-400">Progresso médio</p><p className="text-2xl font-bold text-[#C9963A]">{mediaProgresso}%</p></div>
          <div className="card"><p className="text-xs text-gray-400">Concluídos</p><p className="text-2xl font-bold text-emerald-600">{concluidos}</p></div>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-3">
            <input className="input-field" placeholder={isPonto ? 'Buscar ponto/estudante' : 'Buscar estudante'} value={filtros.nome} onChange={(e) => set('nome', e.target.value)} />
            <select className="input-field" value={filtros.duplaId} onChange={(e) => set('duplaId', e.target.value)}>
              <option value="">Todas as duplas</option>
              {duplas.map((dupla) => <option key={dupla.id} value={dupla.id}>{dupla.liderNome} + {dupla.membro2Nome}</option>)}
            </select>
            <select className="input-field" value={filtros.serie} onChange={(e) => set('serie', e.target.value)}>
              <option value="">Todas as séries</option>
              {SERIES_ESTUDO.map((serie) => <option key={serie.id} value={serie.id}>{serie.nome}</option>)}
            </select>
            <select className="input-field" value={filtros.licaoAtual} onChange={(e) => set('licaoAtual', e.target.value)} disabled={!filtros.serie}>
              <option value="">Todas as lições</option>
              {licoes.map((licao) => <option key={licao.numero} value={licao.numero}>{licao.numero} - {licao.titulo}</option>)}
            </select>
            <input className="input-field" placeholder="Cidade" value={filtros.cidade} onChange={(e) => set('cidade', e.target.value)} />
            <input className="input-field" type="date" value={filtros.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} />
            <input className="input-field" type="date" value={filtros.dataFim} onChange={(e) => set('dataFim', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn-outline" onClick={limpar}>Limpar</button>
            <button type="button" className="btn-outline" onClick={() => abrirPdf({ titulo, estudos: resultado.estudos, tipoRelatorio })}>Exportar PDF</button>
            <button type="button" className="btn-primary" onClick={carregar}>Filtrar</button>
          </div>
        </div>

        {selecionado && (
          <div className="card border-l-4 border-l-[#C9963A]">
            <div className="flex flex-col lg:flex-row lg:items-center gap-5 justify-between">
              <div>
                <p className="text-xs text-gray-400">{isPonto ? 'Ponto selecionado' : 'Estudante selecionado'}</p>
                <h2 className="text-xl font-bold text-[#1A3A6B]">{isPonto ? selecionado.nomeEstudante : participantesResumo(selecionado)}</h2>
                <p className="text-sm text-gray-500">{getSerieNome(selecionado.serie)} · {getLicaoLabel(selecionado.serie, selecionado.licaoAtual)}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="min-w-[220px]">
                  <div className="flex items-center justify-between text-sm mb-1"><span>Progresso</span><strong>{progresso(selecionado)}%</strong></div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-[#C9963A]" style={{ width: `${progresso(selecionado)}%` }} /></div>
                </div>
                <button type="button" className="btn-primary px-4 py-2" onClick={() => navigate(detalhesPath(selecionado.id))}>
                  Ver detalhes
                </button>
              </div>
            </div>
            {isPonto && selecionado.participantes?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selecionado.participantes.map((participante) => (
                  <span key={participante.id} className="inline-flex items-center gap-2 rounded-full bg-[#1A3A6B]/5 px-2 py-1">
                    <span className="text-xs font-semibold text-[#1A3A6B]">{participante.nome}</span>
                    <ClassificacaoBadge classe={participante.classificacaoInteressado} motivo={participante.motivoImpedimento} compacto />
                  </span>
                ))}
              </div>
            )}
            {!isPonto && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ClassificacaoBadge classe={selecionado.classificacaoInteressado} motivo={selecionado.motivoImpedimento} />
                {selecionado.classificacaoInteressado === 'B' && selecionado.motivoImpedimento && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                    Motivo: {selecionado.motivoImpedimento}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="card overflow-hidden">
          {carregando ? (
            <p className="text-gray-400 text-sm">Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F4F5F7] text-gray-500">
                    <th className="text-left px-4 py-3">{isPonto ? 'Ponto/Estudantes' : 'Estudante'}</th>
                    <th className="text-left px-4 py-3">Cidade/Estado</th>
                    <th className="text-left px-4 py-3">Série</th>
                    <th className="text-left px-4 py-3">Lição Atual</th>
                    <th className="text-left px-4 py-3">Classificação</th>
                    <th className="text-left px-4 py-3">Progresso</th>
                    <th className="text-left px-4 py-3">Dupla</th>
                    <th className="text-left px-4 py-3">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.estudos.map((estudo) => {
                    const licoesDaSerie = SERIES_ESTUDO.find((serie) => serie.id === estudo.serie)?.licoes || [];
                    return (
                      <tr key={estudo.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => setSelecionado(estudo)}>
                        <td className="px-4 py-3 font-semibold text-[#1A3A6B]">{isPonto ? <><span>{estudo.nomeEstudante}</span><p className="text-xs text-gray-400 font-normal">{participantesResumo(estudo)}</p></> : estudo.nomeEstudante}</td>
                        <td className="px-4 py-3 text-gray-600">{estudo.cidade}/{estudo.estado}</td>
                        <td className="px-4 py-3 text-gray-600">{getSerieNome(estudo.serie)}</td>
                        <td className="px-4 py-3 text-gray-600" onClick={(e) => e.stopPropagation()}>
                          <select className="input-field min-w-56" value={licoesEditadas[estudo.id] || estudo.licaoAtual} onChange={(e) => setLicoesEditadas((prev) => ({ ...prev, [estudo.id]: e.target.value }))}>
                            {licoesDaSerie.map((licao) => <option key={licao.numero} value={licao.numero}>{licao.numero} - {licao.titulo}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {isPonto ? (
                            <div className="flex flex-wrap gap-1">
                              {(estudo.participantes || []).map((participante) => (
                                <ClassificacaoBadge key={participante.id} classe={participante.classificacaoInteressado} motivo={participante.motivoImpedimento} compacto />
                              ))}
                            </div>
                          ) : (
                            <ClassificacaoBadge classe={estudo.classificacaoInteressado} motivo={estudo.motivoImpedimento} compacto />
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="min-w-28"><div className="h-2 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-[#C9963A]" style={{ width: `${progresso(estudo)}%` }} /></div><span className="text-xs">{progresso(estudo)}%</span></div>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{estudo.dupla?.liderNome} + {estudo.dupla?.membro2Nome}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-2 min-w-28">
                            <button type="button" className="btn-outline text-xs px-3 py-2" onClick={() => navigate(detalhesPath(estudo.id))}>Detalhes</button>
                            <button type="button" className="btn-primary text-xs px-3 py-2" onClick={() => salvarLicao(estudo)}>Salvar lição</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {resultado.estudos.length === 0 && (
                    <tr><td className="px-4 py-8 text-center text-gray-400" colSpan="8">Nenhum registro encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
