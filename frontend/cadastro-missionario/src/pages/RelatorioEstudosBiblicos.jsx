import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';
import { toast } from '../lib/toast';
import { ehAdmin, useAuth } from '../contexts/AuthContext';

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

const totalEstudantesDoEstudo = (estudo) => (
  ['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) ? (estudo.participantes?.length || 0) : 1
);

const contarClassificacoes = (estudos = []) => estudos.reduce((acc, estudo) => {
  if (['PONTO', 'CLASSE'].includes(estudo.tipoEstudo)) {
    (estudo.participantes || []).forEach((participante) => {
      if (participante.classificacaoInteressado && acc[participante.classificacaoInteressado] !== undefined) {
        acc[participante.classificacaoInteressado] += 1;
      }
    });
    return acc;
  }
  if (estudo.classificacaoInteressado && acc[estudo.classificacaoInteressado] !== undefined) {
    acc[estudo.classificacaoInteressado] += 1;
  }
  return acc;
}, { A: 0, B: 0, C: 0 });

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

const escapeHtml = (valor = '') => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatarBooleanoPdf = (valor) => {
  if (valor === true) return 'Sim';
  if (valor === false) return 'Nao';
  return 'Nao informado';
};

const abrirPdf = ({ titulo, estudos, tipoRelatorio }) => {
  const linhas = estudos.map((item) => `
    <tr>
      <td>${['PONTO', 'CLASSE'].includes(item.tipoEstudo) ? item.nomeEstudante : participantesResumo(item)}</td>
      <td>${item.cidade || ''}/${item.estado || ''}</td>
      <td>${getSerieNome(item.serie)}</td>
      <td>${getLicaoLabel(item.serie, item.licaoAtual)}</td>
      <td>${['PONTO', 'CLASSE'].includes(item.tipoEstudo) ? (item.participantes || []).map((p) => `${p.nome}: ${p.classificacaoInteressado || '-'}`).join(', ') : (classeInfo[item.classificacaoInteressado]?.label || '-')}</td>
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

const abrirPdfComissao = (estudo) => {
  if (!estudo || ['PONTO', 'CLASSE'].includes(estudo.tipoEstudo)) return;

  const tituloDocumento = 'Relatório para Comissão da Igreja: Aprovação de Batismo';
  const perguntas = [
    ['Está indo à igreja?', formatarBooleanoPdf(estudo.vaIgreja)],
    ['Estuda a Bíblia?', formatarBooleanoPdf(estudo.leBiblia)],
    ['Estuda a lição da Escola Sabatina?', formatarBooleanoPdf(estudo.estudaLicao)],
    ['Devolve os dízimos?', formatarBooleanoPdf(estudo.devolveDizimos)],
    ['Faz o culto familiar?', formatarBooleanoPdf(estudo.cultoFamiliar)],
  ];
  const linhasPerguntas = perguntas.map(([pergunta, resposta]) => `
    <tr>
      <td>${escapeHtml(pergunta)}</td>
      <td><strong>${escapeHtml(resposta)}</strong></td>
    </tr>
  `).join('');
  const nomeCandidato = participantesResumo(estudo);
  const dupla = `${estudo.dupla?.liderNome || ''} + ${estudo.dupla?.membro2Nome || ''}`;
  const igreja = estudo.dupla?.igreja?.nome || 'Nao informada';
  const distrito = estudo.dupla?.distrito?.nome || 'Nao informado';
  const regiao = estudo.dupla?.distrito?.regiao?.nome || 'Nao informada';
  const classificacao = classeInfo[estudo.classificacaoInteressado]?.label || 'Sem classificacao';
  const janela = window.open('', '_blank');
  if (!janela) return;

  janela.document.write(`
    <html>
      <head>
        <title>${escapeHtml(tituloDocumento)}</title>
        <style>
          @page { margin: 18mm; }
          body { font-family: Arial, sans-serif; color: #1f2937; line-height: 1.45; }
          h1 { color: #1A3A6B; font-size: 24px; margin: 0 0 8px; }
          h2 { color: #1A3A6B; font-size: 16px; margin: 24px 0 10px; }
          .subtitulo { color: #6b7280; margin: 0 0 22px; }
          .resumo { border-left: 4px solid #C9963A; background: #f8fafc; padding: 14px 16px; margin-bottom: 18px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 18px; }
          .item span { color: #6b7280; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
          .item strong { display: block; font-size: 14px; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #1A3A6B; color: white; padding: 10px; text-align: left; }
          td { border: 1px solid #e5e7eb; padding: 10px; vertical-align: top; }
          .nota { background: #fff7ed; border: 1px solid #fed7aa; padding: 12px; margin-top: 18px; color: #7c2d12; }
          .rodape { color: #6b7280; font-size: 11px; margin-top: 28px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(tituloDocumento)}</h1>
        <p class="subtitulo">Histórico detalhado da jornada do candidato para auxiliar a comissão da igreja na decisão sobre o voto de batismo.</p>

        <div class="resumo">
          <div class="grid">
            <div class="item"><span>Candidato</span><strong>${escapeHtml(nomeCandidato)}</strong></div>
            <div class="item"><span>Classificação</span><strong>${escapeHtml(classificacao)}</strong></div>
            <div class="item"><span>Igreja</span><strong>${escapeHtml(igreja)}</strong></div>
            <div class="item"><span>Distrito / Região</span><strong>${escapeHtml(distrito)} / ${escapeHtml(regiao)}</strong></div>
            <div class="item"><span>Dupla responsável</span><strong>${escapeHtml(dupla)}</strong></div>
            <div class="item"><span>Contato</span><strong>${escapeHtml(estudo.whatsapp || 'Nao informado')}</strong></div>
            <div class="item"><span>Série e lição atual</span><strong>${escapeHtml(getSerieNome(estudo.serie))} - ${escapeHtml(getLicaoLabel(estudo.serie, estudo.licaoAtual))}</strong></div>
            <div class="item"><span>Progresso</span><strong>${progresso(estudo)}%</strong></div>
          </div>
        </div>

        <h2>Informações espirituais do estudante</h2>
        <table>
          <thead><tr><th>Pergunta</th><th>Resposta registrada</th></tr></thead>
          <tbody>${linhasPerguntas}</tbody>
        </table>

        <h2>Histórico do acompanhamento</h2>
        <table>
          <tbody>
            <tr><td><strong>Dia / horário do estudo</strong></td><td>${escapeHtml(estudo.diaEstudo || 'Nao informado')} - ${escapeHtml(estudo.horarioEstudo || 'Nao informado')}</td></tr>
            <tr><td><strong>Cidade / Estado</strong></td><td>${escapeHtml(estudo.cidade || 'Nao informada')} / ${escapeHtml(estudo.estado || 'Nao informado')}</td></tr>
            <tr><td><strong>Endereço</strong></td><td>${escapeHtml(estudo.endereco || 'Nao informado')}</td></tr>
            <tr><td><strong>Observações</strong></td><td>${escapeHtml(estudo.observacoes || 'Sem observacoes registradas.')}</td></tr>
            <tr><td><strong>Motivo de impedimento</strong></td><td>${escapeHtml(estudo.motivoImpedimento || 'Nao informado')}</td></tr>
          </tbody>
        </table>

        <div class="nota">
          Este relatório organiza as informações cadastradas para consulta rápida da comissão. A recomendação final deve considerar a avaliação pastoral e o diálogo com o candidato.
        </div>
        <p class="rodape">Gerado em ${new Date().toLocaleString('pt-BR')} pelo Sistema de Duplas Missionárias.</p>
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
  const { usuario } = useAuth();
  const isDireto = location.pathname.startsWith('/direto');
  const podeExcluir = ehAdmin(usuario);
  const isPonto = tipoRelatorio === 'PONTO';
  const isClasse = tipoRelatorio === 'CLASSE';
  const isTodos = tipoRelatorio === 'TODOS';
  const isGrupo = isPonto || isClasse;
  const parametrosUrl = new URLSearchParams(location.search);
  const titulo = isPonto
    ? 'Pontos de Estudo Bíblico'
    : isClasse
      ? 'Classes Bíblicas Cadastradas'
      : isTodos
        ? 'Registros de Estudos Bíblicos'
        : 'Estudantes Bíblicos';
  const [resultado, setResultado] = useState({ total: 0, totalEstudantes: 0, estudos: [], porSerie: [] });
  const [totaisPorClassificacao, setTotaisPorClassificacao] = useState({ A: 0, B: 0, C: 0 });
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
    classificacaoInteressado: parametrosUrl.get('classificacaoInteressado') || '',
  });

  const licoes = useMemo(() => (
    SERIES_ESTUDO.find((serie) => serie.id === filtros.serie)?.licoes || []
  ), [filtros.serie]);

  const carregar = (filtrosAtuais = filtros) => {
    setCarregando(true);
    const params = {
      ...Object.fromEntries(Object.entries(filtrosAtuais).filter(([, valor]) => valor)),
      ...(isTodos ? {} : { tipoEstudo: tipoRelatorio }),
    };
    const paramsTotaisClassificacao = { ...params };
    delete paramsTotaisClassificacao.classificacaoInteressado;
    Promise.all([
      api.get('/relatorios/estudos-biblicos', { params }),
      api.get('/relatorios/estudos-biblicos', { params: paramsTotaisClassificacao }),
      api.get('/duplas'),
    ]).then(([relatorio, totaisClassificacaoRes, duplasRes]) => {
      setResultado(relatorio.data);
      setTotaisPorClassificacao(contarClassificacoes(totaisClassificacaoRes.data.estudos || []));
      setDuplas(Array.isArray(duplasRes.data) ? duplasRes.data : []);
      setSelecionado(relatorio.data.estudos?.[0] || null);
    }).finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoRelatorio]);

  useEffect(() => {
    const classificacaoInteressado = new URLSearchParams(location.search).get('classificacaoInteressado') || '';
    setFiltros((prev) => {
      if (prev.classificacaoInteressado === classificacaoInteressado) return prev;
      const proximos = { ...prev, classificacaoInteressado };
      carregar(proximos);
      return proximos;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

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

  const excluirEstudo = async (estudo) => {
    const nome = ['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) ? estudo.nomeEstudante : participantesResumo(estudo);
    if (!window.confirm(`Excluir ${nome}?`)) return;
    try {
      await api.delete(`/estudos-biblicos/${estudo.id}`);
      toast.success('Registro removido.');
      if (selecionado?.id === estudo.id) setSelecionado(null);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao remover registro.');
    }
  };

  const limpar = () => {
    const filtrosLimpos = { duplaId: '', serie: '', licaoAtual: '', cidade: '', nome: '', dataInicio: '', dataFim: '', classificacaoInteressado: '' };
    setFiltros(filtrosLimpos);
    navigate(location.pathname, { replace: true });
    carregar(filtrosLimpos);
  };

  const mediaProgresso = resultado.estudos.length
    ? Math.round(resultado.estudos.reduce((acc, estudo) => acc + progresso(estudo), 0) / resultado.estudos.length)
    : 0;
  const concluidos = resultado.estudos.filter((estudo) => progresso(estudo) >= 100).length;
  const totalEstudantes = resultado.totalEstudantes ?? resultado.estudos.reduce((acc, estudo) => acc + totalEstudantesDoEstudo(estudo), 0);
  const tooltipTotalEstudantes = isPonto
    ? 'Estudos nos pontos: soma dos estudantes/participantes cadastrados em todos os pontos filtrados.'
    : isClasse
      ? 'Estudantes em classes: soma dos participantes cadastrados em todas as classes biblicas filtradas.'
      : isTodos
        ? 'Pessoas envolvidas: estudos individuais + estudantes nos pontos + estudantes em classes.'
        : 'Estudantes: total de estudos biblicos individuais cadastrados nos filtros atuais.';
  const abrirClassificacao = (classe) => {
    const ativo = filtros.classificacaoInteressado === classe;
    const proximos = { ...filtros, classificacaoInteressado: ativo ? '' : classe };
    setFiltros(proximos);
    navigate(`${location.pathname}${ativo ? '' : `?classificacaoInteressado=${classe}`}`);
    carregar(proximos);
  };
  const detalhesPath = (estudo) => {
    const id = typeof estudo === 'object' ? estudo.id : estudo;
    const tipo = typeof estudo === 'object' ? estudo.tipoEstudo : tipoRelatorio;
    const base = isDireto ? '/direto/relatorios' : '/relatorios';
    if (tipo === 'PONTO') return `${base}/pontos-estudo/${id}`;
    if (tipo === 'CLASSE') return `${base}/classes-biblicas/registros/${id}`;
    return `${base}/estudos-biblicos/${id}`;
  };
  const abrirEstudo = (estudo) => {
    if (podeExcluir) {
      navigate(detalhesPath(estudo));
      return;
    }
    setSelecionado(estudo);
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
        <div className={`grid grid-cols-1 ${isGrupo || isTodos ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
          {isGrupo && (
            <div
              className="smart-tooltip card"
              data-tooltip={isPonto ? 'Pontos de estudo: quantidade de pontos cadastrados nos filtros atuais.' : 'Classes biblicas: quantidade de classes cadastradas nos filtros atuais.'}
              tabIndex={0}
            >
              <p className="text-xs text-gray-400">{isPonto ? 'Pontos de estudo' : 'Classes bíblicas'}</p>
              <p className="text-2xl font-bold text-[#1A3A6B]">{resultado.total}</p>
            </div>
          )}
          {isTodos && (
            <div
              className="smart-tooltip card"
              data-tooltip="Registros cadastrados: soma dos estudos individuais, pontos de estudo e classes biblicas filtrados."
              tabIndex={0}
            >
              <p className="text-xs text-gray-400">Registros cadastrados</p>
              <p className="text-2xl font-bold text-[#1A3A6B]">{resultado.total}</p>
            </div>
          )}
          <div className="smart-tooltip card" data-tooltip={tooltipTotalEstudantes} tabIndex={0}>
            <p className="text-xs text-gray-400">{isPonto ? 'Estudos nos pontos' : isClasse ? 'Estudantes em classes' : isTodos ? 'Pessoas envolvidas' : 'Estudantes'}</p>
            <p className="text-2xl font-bold text-[#1A3A6B]">{isGrupo || isTodos ? totalEstudantes : resultado.total}</p>
          </div>
          <div className="smart-tooltip card" data-tooltip="Progresso medio: media do percentual de licoes concluidas nos registros filtrados." tabIndex={0}><p className="text-xs text-gray-400">Progresso médio</p><p className="text-2xl font-bold text-[#C9963A]">{mediaProgresso}%</p></div>
          <div className="smart-tooltip card" data-tooltip="Concluidos: quantidade de estudos que chegaram a 100% da serie selecionada." tabIndex={0}><p className="text-xs text-gray-400">Concluídos</p><p className="text-2xl font-bold text-emerald-600">{concluidos}</p></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['A', 'B', 'C'].map((classe) => {
            const info = classeInfo[classe];
            const ativo = filtros.classificacaoInteressado === classe;
            return (
              <button
                key={classe}
                type="button"
                onClick={() => abrirClassificacao(classe)}
                className={`card text-left border transition-all hover:-translate-y-0.5 hover:shadow-md ${info.bg} ${info.border} ${ativo ? 'ring-2 ring-offset-2 ring-[#1A3A6B]/30' : ''}`}
                title={`Ver registros com classificacao ${classe}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${info.text}`}>Classificacao {classe}</p>
                    <p className="text-sm text-gray-500">{info.label.replace(`${classe} - `, '')}</p>
                  </div>
                  <span className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-xl font-bold ${info.text} bg-white/80`}>
                    {totaisPorClassificacao[classe]}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-7 gap-3">
            <input className="input-field" placeholder={isPonto ? 'Buscar ponto/estudante' : isClasse ? 'Buscar classe/estudante' : isTodos ? 'Buscar registro/estudante' : 'Buscar estudante'} value={filtros.nome} onChange={(e) => set('nome', e.target.value)} />
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
                <p className="text-xs text-gray-400">{isPonto ? 'Ponto selecionado' : isClasse ? 'Classe selecionada' : isTodos ? 'Registro selecionado' : 'Estudante selecionado'}</p>
                <h2 className="text-xl font-bold text-[#1A3A6B]">{['PONTO', 'CLASSE'].includes(selecionado.tipoEstudo) ? selecionado.nomeEstudante : participantesResumo(selecionado)}</h2>
                <p className="text-sm text-gray-500">{getSerieNome(selecionado.serie)} · {getLicaoLabel(selecionado.serie, selecionado.licaoAtual)}</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="min-w-[220px]">
                  <div className="flex items-center justify-between text-sm mb-1"><span>Progresso</span><strong>{progresso(selecionado)}%</strong></div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-[#C9963A]" style={{ width: `${progresso(selecionado)}%` }} /></div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {!['PONTO', 'CLASSE'].includes(selecionado.tipoEstudo) && (
                    <button type="button" className="btn-outline px-4 py-2" onClick={() => abrirPdfComissao(selecionado)}>
                      Recomendar à comissão
                    </button>
                  )}
                  <button type="button" className="btn-primary px-4 py-2" onClick={() => navigate(detalhesPath(selecionado))}>
                    Ver detalhes
                  </button>
                </div>
              </div>
            </div>
            {['PONTO', 'CLASSE'].includes(selecionado.tipoEstudo) && selecionado.participantes?.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {selecionado.participantes.map((participante) => (
                  <span key={participante.id} className="inline-flex items-center gap-2 rounded-full bg-[#1A3A6B]/5 px-2 py-1">
                    <span className="text-xs font-semibold text-[#1A3A6B]">{participante.nome}</span>
                    <ClassificacaoBadge classe={participante.classificacaoInteressado} motivo={participante.motivoImpedimento} compacto />
                  </span>
                ))}
              </div>
            )}
            {!['PONTO', 'CLASSE'].includes(selecionado.tipoEstudo) && (
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
            <div className="overflow-x-auto pb-2">
              <table className="w-full min-w-[1280px] text-sm">
                <thead>
                  <tr className="bg-[#F4F5F7] text-gray-500">
                    <th className="w-40 text-left px-4 py-3">{isGrupo ? (isPonto ? 'Ponto/Estudantes' : 'Classe/Estudantes') : isTodos ? 'Registro/Estudantes' : 'Estudante'}</th>
                    <th className="w-40 text-left px-4 py-3">Cidade/Estado</th>
                    <th className="w-32 text-left px-4 py-3">Série</th>
                    <th className="w-72 text-left px-4 py-3">Lição Atual</th>
                    <th className="w-40 text-left px-4 py-3">Classificação</th>
                    <th className="w-44 text-left px-4 py-3">Progresso</th>
                    <th className="w-40 text-left px-4 py-3">Dupla</th>
                    <th className="sticky right-0 z-20 w-36 bg-[#F4F5F7] text-left px-4 py-3 shadow-[-8px_0_16px_rgba(15,35,71,0.06)]">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.estudos.map((estudo) => {
                    const licoesDaSerie = SERIES_ESTUDO.find((serie) => serie.id === estudo.serie)?.licoes || [];
                    return (
                      <tr key={estudo.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer" onClick={() => abrirEstudo(estudo)}>
                        <td className="px-4 py-3 font-semibold text-[#1A3A6B]">{['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) ? <><span>{estudo.nomeEstudante}</span><p className="text-xs text-gray-400 font-normal">{participantesResumo(estudo)}</p></> : estudo.nomeEstudante}</td>
                        <td className="px-4 py-3 text-gray-600">{estudo.cidade}/{estudo.estado}</td>
                        <td className="px-4 py-3 text-gray-600">{getSerieNome(estudo.serie)}</td>
                        <td className="px-4 py-3 text-gray-600" onClick={(e) => e.stopPropagation()}>
                          <select className="input-field min-w-56" value={licoesEditadas[estudo.id] || estudo.licaoAtual} onChange={(e) => setLicoesEditadas((prev) => ({ ...prev, [estudo.id]: e.target.value }))}>
                            {licoesDaSerie.map((licao) => <option key={licao.numero} value={licao.numero}>{licao.numero} - {licao.titulo}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) ? (
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
                        <td className="px-4 py-3 text-gray-600 break-words">{estudo.dupla?.liderNome} + {estudo.dupla?.membro2Nome}</td>
                        <td className="sticky right-0 z-10 bg-white px-4 py-3 shadow-[-8px_0_16px_rgba(15,35,71,0.06)]" onClick={(e) => e.stopPropagation()}>
                          <div className="flex w-32 flex-col gap-2">
                            <button type="button" className="btn-outline w-full whitespace-nowrap text-xs px-3 py-2" onClick={() => navigate(detalhesPath(estudo))}>Detalhes</button>
                            <button type="button" className="btn-primary w-full whitespace-nowrap text-xs px-3 py-2" onClick={() => salvarLicao(estudo)}>Salvar lição</button>
                            {podeExcluir && (
                              <button type="button" className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50" onClick={() => excluirEstudo(estudo)}>Excluir</button>
                            )}
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
