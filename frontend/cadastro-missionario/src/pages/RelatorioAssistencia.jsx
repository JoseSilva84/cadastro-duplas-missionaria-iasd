import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import BackButton from '../components/BackButton';
import EChart from '../components/EChart';
import { useAuth, PERFIS, ehAdmin } from '../contexts/AuthContext';
import { dataLocalISO, intervaloDaSemana, rotuloSemana, semanaISOAtual, semanaISOParaData } from '../lib/periodosRelatorio';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const PALAVRAS_IGNORADAS = new Set([
  'a', 'ao', 'aos', 'as', 'com', 'como', 'da', 'das', 'de', 'do', 'dos', 'e', 'ela', 'ele', 'em', 'essa', 'esse',
  'esta', 'este', 'foi', 'mais', 'mas', 'na', 'nas', 'no', 'nos', 'o', 'os', 'ou', 'para', 'pela', 'pelas', 'pelo',
  'pelos', 'por', 'que', 'se', 'sem', 'sua', 'suas', 'tambem', 'teve', 'um', 'uma', 'visita', 'assistencia', 'dupla',
]);

const normalizarPalavra = (valor) => valor
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

const hojeISO = () => dataLocalISO();

const mesAtualISO = () => hojeISO().slice(0, 7);

const intervaloDoMes = (mes) => {
  const correspondencia = /^(\d{4})-(\d{2})$/.exec(mes || '');
  if (!correspondencia) return { de: '', ate: '' };
  const ano = Number(correspondencia[1]);
  const indiceMes = Number(correspondencia[2]) - 1;
  return {
    de: dataLocalISO(new Date(ano, indiceMes, 1)),
    ate: dataLocalISO(new Date(ano, indiceMes + 1, 0)),
  };
};

const formatarData = (valor) => {
  if (!valor) return 'Sem data';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Sem data';
  return data.toLocaleDateString('pt-BR');
};

const nomeDupla = (dupla) => {
  if (!dupla) return 'Dupla não encontrada';
  return `${dupla.liderNome || 'Líder'} + ${dupla.membro2Nome || 'Membro'}`;
};

const MetricCard = ({ label, valor, detalhe, cor }) => (
  <div className="card p-3 sm:p-5 flex flex-col justify-between">
    <div>
      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 truncate">{label}</p>
      <p className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-black leading-none tracking-tight" style={{ color: cor }}>{numero(valor)}</p>
    </div>
    {detalhe && <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs font-medium text-gray-500 line-clamp-2">{detalhe}</p>}
  </div>
);

const Info = ({ label, valor }) => (
  <div className="rounded-lg bg-[#F4F5F7] px-4 py-3">
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
    <p className="mt-1 break-words text-sm font-semibold text-[#1A3A6B]">{valor || 'Não informado'}</p>
  </div>
);

export default function RelatorioAssistencia() {
  const { usuario } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const prefix = isDireto ? '/direto' : '';
  const [dados, setDados] = useState(null);
  const [coordenadores, setCoordenadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tipoPeriodo, setTipoPeriodo] = useState('semana');
  const [semanaSelecionada, setSemanaSelecionada] = useState(semanaISOAtual);
  const [mesSelecionado, setMesSelecionado] = useState(mesAtualISO);
  const [filtros, setFiltros] = useState({
    ...intervaloDaSemana(semanaISOAtual()),
    coordenadorId: '',
  });
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [modalRegistrosAberto, setModalRegistrosAberto] = useState(false);
  const podeRegistrarAssistencia = ehAdmin(usuario) || usuario?.perfil === PERFIS.COORDENADOR_REGIONAL;

  useEffect(() => {
    api.get('/acompanhamentos/coordenadores')
      .then((res) => setCoordenadores(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCoordenadores([]));
  }, []);

  useEffect(() => {
    const params = {};
    if (filtros.de) params.de = filtros.de;
    if (filtros.ate) params.ate = filtros.ate;
    if (filtros.coordenadorId) params.coordenadorId = filtros.coordenadorId;

    setCarregando(true);
    setErro('');
    api.get('/relatorios/acompanhamento', { params })
      .then((res) => setDados(res.data || null))
      .catch((err) => setErro(err.response?.data?.erro || 'Erro ao carregar resumo de assistência.'))
      .finally(() => setCarregando(false));
  }, [filtros]);

  const saidas = useMemo(() => (
    (dados?.porSemana || []).flatMap((semana) => (
      (semana.saidas || []).map((saida) => ({ ...saida, semanaInicio: semana.semanaInicio }))
    )).sort((a, b) => new Date(b.dataSaida) - new Date(a.dataSaida))
  ), [dados]);

  const resumo = useMemo(() => {
    const duplaIds = new Set();
    const porCoordenador = {};
    const porDupla = {};
    let relatoriosPreenchidos = 0;

    saidas.forEach((saida) => {
      if (String(saida.observacoes || '').trim()) relatoriosPreenchidos += 1;
      const coordenadorNome = saida.coordenador?.nome || 'Sem coordenador';
      porCoordenador[coordenadorNome] = (porCoordenador[coordenadorNome] || 0) + 1;

      (saida.duplas || []).forEach((item) => {
        const dupla = item.dupla;
        if (!dupla?.id) return;
        duplaIds.add(dupla.id);
        const chave = String(dupla.id);
        if (!porDupla[chave]) {
          porDupla[chave] = {
            id: dupla.id,
            nome: nomeDupla(dupla),
            bairro: dupla.bairro || 'Sem bairro',
            total: 0,
          };
        }
        porDupla[chave].total += 1;
      });
    });

    const coordenadorMaisAtivo = Object.entries(porCoordenador)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

    return {
      totalSaidas: dados?.totalSaidas || 0,
      totalDuplasVisitadas: dados?.totalDuplasVisitadas || 0,
      duplasUnicas: duplaIds.size,
      relatoriosPreenchidos,
      coordenadorMaisAtivo: coordenadorMaisAtivo ? { nome: coordenadorMaisAtivo[0], total: coordenadorMaisAtivo[1] } : null,
      duplasMaisVisitadas: Object.values(porDupla).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome)).slice(0, 8),
    };
  }, [dados, saidas]);

  const analiseGraficos = useMemo(() => {
    const porCoordenador = new Map();
    const frequenciaPalavras = new Map();

    saidas.forEach((saida) => {
      const coordenador = saida.coordenador?.nome || 'Sem coordenador';
      const atual = porCoordenador.get(coordenador) || { nome: coordenador, assistencias: 0, duplas: 0 };
      atual.assistencias += 1;
      atual.duplas += saida.duplas?.length || 0;
      porCoordenador.set(coordenador, atual);

      const palavras = String(saida.observacoes || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
      palavras.forEach((palavra) => {
        const chave = normalizarPalavra(palavra);
        if (chave.length < 4 || PALAVRAS_IGNORADAS.has(chave) || /^\d+$/.test(chave)) return;
        const registro = frequenciaPalavras.get(chave) || { nome: palavra, total: 0 };
        registro.total += 1;
        frequenciaPalavras.set(chave, registro);
      });
    });

    const semanas = [...(dados?.porSemana || [])]
      .sort((a, b) => new Date(a.semanaInicio) - new Date(b.semanaInicio))
      .map((semana) => ({
        nome: formatarData(`${semana.semanaInicio}T12:00:00`),
        assistencias: semana.saidas?.length || 0,
        duplas: semana.totalDuplas || 0,
      }));

    return {
      semanas,
      coordenadores: [...porCoordenador.values()]
        .sort((a, b) => b.assistencias - a.assistencias || b.duplas - a.duplas)
        .slice(0, 8),
      palavras: [...frequenciaPalavras.values()]
        .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
        .slice(0, 10),
      cobertura: [
        { name: 'Com relato', value: resumo.relatoriosPreenchidos },
        { name: 'Sem relato', value: Math.max(0, resumo.totalSaidas - resumo.relatoriosPreenchidos) },
      ],
    };
  }, [dados?.porSemana, resumo.relatoriosPreenchidos, resumo.totalSaidas, saidas]);

  const opcoesGraficos = useMemo(() => ({
    atividade: {
      color: ['#7c3aed', '#0d9488'],
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, data: ['Assistências', 'Duplas acompanhadas'] },
      grid: { left: 40, right: 22, top: 28, bottom: 58, containLabel: true },
      xAxis: { type: 'category', data: analiseGraficos.semanas.map((item) => item.nome), axisLabel: { color: '#64748b' } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: [
        { name: 'Assistências', type: 'bar', barMaxWidth: 34, data: analiseGraficos.semanas.map((item) => item.assistencias), itemStyle: { borderRadius: [7, 7, 0, 0] } },
        { name: 'Duplas acompanhadas', type: 'line', smooth: true, symbolSize: 8, data: analiseGraficos.semanas.map((item) => item.duplas), lineStyle: { width: 3 }, areaStyle: { opacity: 0.08 } },
      ],
    },
    cobertura: {
      color: ['#0d9488', '#e2e8f0'],
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { bottom: 0 },
      series: [{
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        label: { formatter: '{b}\n{c}', color: '#334155', fontWeight: 600 },
        data: analiseGraficos.cobertura,
      }],
    },
    coordenadores: {
      color: ['#1A3A6B', '#C9963A'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0 },
      grid: { left: 12, right: 20, top: 24, bottom: 55, containLabel: true },
      xAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#eef2f7' } } },
      yAxis: { type: 'category', inverse: true, data: analiseGraficos.coordenadores.map((item) => item.nome), axisLabel: { width: 130, overflow: 'truncate', color: '#475569' } },
      series: [
        { name: 'Assistências', type: 'bar', data: analiseGraficos.coordenadores.map((item) => item.assistencias), itemStyle: { borderRadius: [0, 6, 6, 0] } },
        { name: 'Duplas', type: 'bar', data: analiseGraficos.coordenadores.map((item) => item.duplas), itemStyle: { borderRadius: [0, 6, 6, 0] } },
      ],
    },
    palavras: {
      color: ['#7c3aed', '#0d9488', '#C9963A', '#2563eb', '#db2777', '#059669', '#ea580c', '#9333ea', '#0891b2', '#475569'],
      tooltip: { trigger: 'item', formatter: '{b}: {c} menções' },
      series: [{
        type: 'pie',
        roseType: 'radius',
        radius: ['20%', '72%'],
        center: ['50%', '48%'],
        label: { formatter: '{b}\n{c}', color: '#475569', fontSize: 11 },
        data: analiseGraficos.palavras.map((item) => ({ name: item.nome, value: item.total })),
      }],
    },
  }), [analiseGraficos]);

  const selecionarTipoPeriodo = (tipo) => {
    setTipoPeriodo(tipo);
    if (tipo === 'semana') {
      setFiltros((atual) => ({ ...atual, ...intervaloDaSemana(semanaSelecionada) }));
    } else if (tipo === 'mes') {
      setFiltros((atual) => ({ ...atual, ...intervaloDoMes(mesSelecionado) }));
    }
  };

  const selecionarSemana = (semana) => {
    setSemanaSelecionada(semana);
    setFiltros((atual) => ({ ...atual, ...intervaloDaSemana(semana) }));
  };

  const selecionarDataDaSemana = (data) => {
    const semana = semanaISOParaData(data);
    if (semana) selecionarSemana(semana);
  };

  const selecionarMes = (mes) => {
    setMesSelecionado(mes);
    setFiltros((atual) => ({ ...atual, ...intervaloDoMes(mes) }));
  };

  const limparFiltros = () => {
    setTipoPeriodo('personalizado');
    setFiltros({ de: '', ate: '', coordenadorId: '' });
  };

  const filtrarSemanaAtual = () => {
    const semana = semanaISOAtual();
    setSemanaSelecionada(semana);
    setTipoPeriodo('semana');
    setFiltros((atual) => ({ ...atual, ...intervaloDaSemana(semana) }));
  };

  if (carregando && !dados) return <LoadingState mensagem="Carregando resumo de assistência..." />;

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-3 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4 sm:px-6' : 'mb-6 sm:mb-8'}>
        <BackButton fallbackTo={isDireto ? '/direto/dashboard' : '/dashboard'} className="mb-3" />
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
              <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Coordenação Regional</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Relatório Coordenador Regional
            </h1>
            <p className="text-gray-400 text-sm mt-1">Indicadores, histórico e detalhes dos acompanhamentos realizados pelos coordenadores regionais.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/relatorios/coordenador-regional`)}>
              Visão geral regional
            </button>
            {podeRegistrarAssistencia && (
              <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/registro-saida`)}>
                Registrar nova assistência
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5' : 'space-y-4 sm:space-y-5'}>
        {erro && <div className="card border border-red-100 text-sm text-red-600">{erro}</div>}

        <section className="card overflow-hidden p-0">
          <div className="border-b border-gray-100 bg-gradient-to-r from-[#F8FAFC] to-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-[#1A3A6B]">Período do relatório</h2>
                <p className="mt-0.5 text-xs text-gray-400">A semana vigente vem selecionada automaticamente.</p>
              </div>
              <div className="inline-flex w-full rounded-xl border border-gray-200 bg-white p-1 sm:w-auto" role="group" aria-label="Tipo de período">
                {[['semana', 'Semana'], ['mes', 'Mês'], ['personalizado', 'Personalizado']].map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => selecionarTipoPeriodo(valor)}
                    className={`min-h-10 flex-1 rounded-lg px-3 text-xs font-bold transition sm:flex-none ${tipoPeriodo === valor ? 'bg-[#1A3A6B] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1A3A6B]'}`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 sm:p-6 xl:grid-cols-[1fr_1fr_1.25fr_auto_auto] xl:items-end">
            {tipoPeriodo === 'semana' && (
              <label className="xl:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Semana do ano</span>
                <span className="relative flex min-h-11 items-center justify-between rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#1A3A6B] shadow-xs transition focus-within:border-[#1A3A6B] focus-within:ring-2 focus-within:ring-[#1A3A6B]/15">
                  <span>{rotuloSemana(semanaSelecionada)}</span>
                  <svg className="h-4 w-4 text-[#1A3A6B]" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3m8-3v3M3 9h18M5 4h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" /></svg>
                  <input
                    type="date"
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    value={intervaloDaSemana(semanaSelecionada).de}
                    onChange={(event) => selecionarDataDaSemana(event.target.value)}
                    aria-label={`Escolher data da ${rotuloSemana(semanaSelecionada)}`}
                  />
                </span>
              </label>
            )}
            {tipoPeriodo === 'mes' && (
              <label className="xl:col-span-2">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Mês</span>
                <input type="month" className="input-field" value={mesSelecionado} onChange={(event) => selecionarMes(event.target.value)} />
              </label>
            )}
            {tipoPeriodo === 'personalizado' && (
              <>
                <label>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">De</span>
                  <input type="date" className="input-field" value={filtros.de} onChange={(event) => setFiltros((atual) => ({ ...atual, de: event.target.value }))} />
                </label>
                <label>
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Até</span>
                  <input type="date" className="input-field" value={filtros.ate} onChange={(event) => setFiltros((atual) => ({ ...atual, ate: event.target.value }))} />
                </label>
              </>
            )}
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Coordenador</span>
              <select className="input-field" value={filtros.coordenadorId} onChange={(event) => setFiltros((atual) => ({ ...atual, coordenadorId: event.target.value }))}>
                <option value="">Todos os coordenadores</option>
                {coordenadores.map((coordenador) => (
                  <option key={coordenador.id} value={coordenador.id}>
                    {coordenador.nome}{coordenador.regiao?.nome ? ` - ${coordenador.regiao.nome}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn-outline whitespace-nowrap px-4 py-2 text-sm" onClick={filtrarSemanaAtual}>Semana atual</button>
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={limparFiltros}>Limpar</button>
          </div>
          {(filtros.de || filtros.ate) && (
            <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-[#F8FAFC] px-4 py-3 text-xs text-gray-500 sm:px-6">
              <span className="font-bold uppercase tracking-wider text-[#C9963A]">Exibindo</span>
              <span className="rounded-full bg-white px-3 py-1 font-semibold text-[#1A3A6B] shadow-sm">
                {filtros.de ? formatarData(`${filtros.de}T12:00:00`) : 'início'} — {filtros.ate ? formatarData(`${filtros.ate}T12:00:00`) : 'hoje'}
              </span>
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Assistências" valor={resumo.totalSaidas} detalhe="Saídas registradas no período" cor="#7c3aed" />
          <MetricCard label="Duplas acompanhadas" valor={resumo.totalDuplasVisitadas} detalhe="Contagem total, incluindo repetições" cor="#0d9488" />
          <MetricCard label="Duplas únicas" valor={resumo.duplasUnicas} detalhe="Duplas distintas acompanhadas" cor="#1A3A6B" />
          <MetricCard label="Relatórios preenchidos" valor={resumo.relatoriosPreenchidos} detalhe={resumo.coordenadorMaisAtivo ? `Mais ativo: ${resumo.coordenadorMaisAtivo.nome}` : 'Com observações registradas'} cor="#C9963A" />
        </div>

        <section className="card overflow-hidden p-0">
          <div className="border-b border-gray-100 bg-gradient-to-r from-[#10284f] to-[#1A3A6B] px-5 py-5 text-white sm:px-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F2C979]">Análise visual</p>
            <h2 className="mt-1 text-xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Desempenho da assistência regional</h2>
            <p className="mt-1 max-w-3xl text-sm text-white/65">Os gráficos acompanham os filtros selecionados e consolidam visitas, duplas, coordenadores e os assuntos mais citados nos relatos.</p>
          </div>

          {saidas.length > 0 ? (
            <div className="grid grid-cols-1 gap-px bg-gray-100 lg:grid-cols-2">
              <div className="bg-white p-4 sm:p-5">
                <h3 className="font-bold text-[#1A3A6B]">Evolução por semana</h3>
                <p className="mt-1 text-xs text-gray-400">Assistências registradas e duplas acompanhadas.</p>
                <EChart option={opcoesGraficos.atividade} className="h-72 sm:h-80" />
              </div>
              <div className="bg-white p-4 sm:p-5">
                <h3 className="font-bold text-[#1A3A6B]">Preenchimento dos relatos</h3>
                <p className="mt-1 text-xs text-gray-400">Proporção de assistências com relatório detalhado.</p>
                <EChart option={opcoesGraficos.cobertura} className="h-72 sm:h-80" />
              </div>
              <div className="bg-white p-4 sm:p-5">
                <h3 className="font-bold text-[#1A3A6B]">Atuação por coordenador</h3>
                <p className="mt-1 text-xs text-gray-400">Comparativo entre assistências e duplas atendidas.</p>
                <EChart option={opcoesGraficos.coordenadores} className="h-72 sm:h-80" />
              </div>
              <div className="bg-white p-4 sm:p-5">
                <h3 className="font-bold text-[#1A3A6B]">Assuntos mais mencionados</h3>
                <p className="mt-1 text-xs text-gray-400">Termos recorrentes no conteúdo escrito pelos coordenadores.</p>
                {analiseGraficos.palavras.length > 0 ? (
                  <EChart option={opcoesGraficos.palavras} className="h-72 sm:h-80" />
                ) : (
                  <div className="flex h-72 items-center justify-center rounded-xl bg-[#F8FAFC] px-6 text-center text-sm text-gray-400 sm:h-80">
                    Preencha relatos mais detalhados para visualizar os assuntos recorrentes.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-gray-400">Nenhuma assistência encontrada para gerar os gráficos deste período.</div>
          )}
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="card xl:col-span-2">
            <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[#1A3A6B]">Histórico de assistências</h2>
                <p className="max-w-xl text-sm text-gray-400">Clique em uma saída para ver as duplas acompanhadas e o relato.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="rounded-lg bg-[#1A3A6B]/10 px-3 py-2 text-sm font-bold text-[#1A3A6B]">{numero(saidas.length)} registros</span>
                <button type="button" className="btn-outline whitespace-nowrap px-3 py-2 text-sm" onClick={() => setModalRegistrosAberto(true)}>
                  Ver todos os registros
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {saidas.slice(0, 6).map((saida) => (
                <button
                  key={saida.id}
                  type="button"
                  onClick={() => setRegistroSelecionado(saida)}
                  className="w-full overflow-hidden rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-[#C9963A]/40 hover:shadow-sm"
                >
                  <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[8.5rem_minmax(12rem,1.15fr)_6.5rem_minmax(0,1.45fr)] lg:items-start">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Data</p>
                      <p className="font-bold text-[#1A3A6B]">{formatarData(saida.dataSaida)}</p>
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Coordenador</p>
                      <p className="break-words font-semibold leading-snug text-gray-700">{saida.coordenador?.nome || 'Sem coordenador'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Duplas</p>
                      <p className="text-2xl font-bold text-[#0d9488]">{numero(saida.duplas?.length || 0)}</p>
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Relato</p>
                      <p className="line-clamp-2 max-w-full break-words text-sm leading-snug text-gray-500 [overflow-wrap:anywhere]">{saida.observacoes || 'Sem relato informado.'}</p>
                    </div>
                  </div>
                </button>
              ))}

              {saidas.length > 6 && (
                <button type="button" onClick={() => setModalRegistrosAberto(true)} className="rounded-xl border border-dashed border-[#1A3A6B]/25 bg-[#F8FAFC] px-4 py-4 text-center text-sm font-bold text-[#1A3A6B] transition hover:border-[#C9963A]/50 hover:bg-white">
                  Abrir lista completa com {numero(saidas.length)} registros
                </button>
              )}

              {saidas.length === 0 && (
                <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                  Nenhuma assistencia encontrada para os filtros selecionados.
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Duplas mais acompanhadas</h2>
            <p className="text-sm text-gray-400 mb-4">Ranking por repetição de visitas no período.</p>
            <div className="space-y-3">
              {resumo.duplasMaisVisitadas.map((dupla, index) => (
                <button
                  key={dupla.id}
                  type="button"
                  onClick={() => navigate(`${prefix}/duplas/${dupla.id}`)}
                  className="flex w-full items-center gap-3 rounded-lg border border-gray-100 bg-[#F8FAFC] px-3 py-3 text-left transition hover:border-[#C9963A]/40 hover:bg-white"
                >
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-400">{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-bold text-[#1A3A6B]">{dupla.nome}</span>
                    <span className="text-xs text-gray-400">{dupla.bairro}</span>
                  </span>
                  <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-bold text-[#0d9488]">{dupla.total}</span>
                </button>
              ))}
              {resumo.duplasMaisVisitadas.length === 0 && <p className="text-sm text-gray-400">Sem dados para exibir.</p>}
            </div>
          </section>
        </div>

        <section className="card">
          <h2 className="text-lg font-bold text-[#1A3A6B]">Resumo por semana</h2>
          <p className="text-sm text-gray-400 mb-4">Volume semanal das visitas de assistencia.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(dados?.porSemana || []).map((semana) => (
              <div key={semana.semanaInicio} className="rounded-xl border border-gray-100 bg-[#F8FAFC] p-4">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Semana de {formatarData(semana.semanaInicio)}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Info label="Saidas" valor={semana.saidas?.length || 0} />
                  <Info label="Duplas" valor={semana.totalDuplas || 0} />
                </div>
              </div>
            ))}
            {(dados?.porSemana || []).length === 0 && <p className="text-sm text-gray-400">Sem semanas no período.</p>}
          </div>
        </section>
      </div>

      {modalRegistrosAberto && createPortal(
        <div className="app-modal-overlay" onClick={() => setModalRegistrosAberto(false)}>
          <div className="app-modal-panel max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <div className="app-modal-header flex-col sm:flex-row">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Registros de assistencia</p>
                <h3 className="mt-1 text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  Todos os acompanhamentos
                </h3>
                <p className="mt-1 text-sm text-gray-400">{numero(saidas.length)} registro{saidas.length === 1 ? '' : 's'} no período selecionado.</p>
              </div>
              <button type="button" onClick={() => setModalRegistrosAberto(false)} className="flex h-11 w-11 items-center justify-center self-end rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#1A3A6B] sm:self-auto" aria-label="Fechar">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="app-modal-body">
              <div className="grid grid-cols-1 gap-3">
                {saidas.map((saida) => (
                  <button
                    key={`modal-${saida.id}`}
                    type="button"
                    onClick={() => {
                      setModalRegistrosAberto(false);
                      setRegistroSelecionado(saida);
                    }}
                    className="w-full overflow-hidden rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-[#C9963A]/40 hover:shadow-md"
                  >
                    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[8rem_minmax(12rem,1fr)_6rem_minmax(8rem,.85fr)_minmax(0,1.35fr)] lg:items-start">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Data</p>
                        <p className="font-bold text-[#1A3A6B]">{formatarData(saida.dataSaida)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Coordenador</p>
                        <p className="break-words font-semibold leading-snug text-gray-700">{saida.coordenador?.nome || 'Sem coordenador'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Duplas</p>
                        <p className="text-2xl font-bold text-[#0d9488]">{numero(saida.duplas?.length || 0)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Semana</p>
                        <p className="font-semibold text-gray-600">{formatarData(saida.semanaInicio)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Relato</p>
                        <p className="line-clamp-2 max-w-full break-words text-sm leading-snug text-gray-500 [overflow-wrap:anywhere]">{saida.observacoes || 'Sem relato informado.'}</p>
                      </div>
                    </div>
                  </button>
                ))}

                {saidas.length === 0 && (
                  <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                    Nenhuma assistência encontrada para os filtros selecionados.
                  </div>
                )}
              </div>
            </div>

            <div className="app-modal-footer flex-wrap">
              <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/relatorios/coordenador-regional`)}>
                Relatório regional
              </button>
              <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setModalRegistrosAberto(false)}>Fechar</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {registroSelecionado && createPortal(
        <div className="app-modal-overlay" onClick={() => setRegistroSelecionado(null)}>
          <div className="app-modal-panel max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <div className="app-modal-header">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Detalhe da assistência</p>
                <h3 className="mt-1 text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  {formatarData(registroSelecionado.dataSaida)}
                </h3>
                <p className="mt-1 text-sm text-gray-400">{registroSelecionado.coordenador?.nome || 'Sem coordenador'}</p>
              </div>
              <button type="button" onClick={() => setRegistroSelecionado(null)} className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-[#1A3A6B]" aria-label="Fechar">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div className="app-modal-body">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Info label="Data" valor={formatarData(registroSelecionado.dataSaida)} />
                <Info label="Duplas" valor={registroSelecionado.duplas?.length || 0} />
                <Info label="Semana" valor={formatarData(registroSelecionado.semanaInicio)} />
                {registroSelecionado.tipoAssistencia && (
                  <Info label="Tipo de Assistência" valor={registroSelecionado.tipoAssistencia} />
                )}
                {registroSelecionado.distritoNome && (
                  <Info label="Distrito" valor={registroSelecionado.distritoNome} />
                )}
                {registroSelecionado.igrejaNome && (
                  <Info label="Igreja" valor={registroSelecionado.igrejaNome} />
                )}
              </div>

              <div className="mt-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Relatório Descritivo da Atividade</h4>
                <p className="mt-2 min-h-44 whitespace-pre-wrap rounded-xl border border-[#1A3A6B]/10 bg-[#F4F5F7] p-5 text-sm leading-7 text-gray-700 shadow-inner [overflow-wrap:anywhere] sm:min-h-56 sm:p-6 sm:text-base">
                  {registroSelecionado.observacoes || 'Nenhum relatório descritivo foi preenchido neste acompanhamento.'}
                </p>
              </div>

              <div className="mt-5">
                <h4 className="text-sm font-bold uppercase tracking-widest text-gray-400">Duplas acompanhadas</h4>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(registroSelecionado.duplas || []).map((item) => (
                    <button
                      key={`${registroSelecionado.id}-${item.dupla?.id || item.id}`}
                      type="button"
                      onClick={() => item.dupla?.id && navigate(`${prefix}/duplas/${item.dupla.id}`)}
                      className="rounded-lg border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-[#C9963A]/40"
                    >
                      <p className="break-words text-sm font-bold text-[#1A3A6B]">{nomeDupla(item.dupla)}</p>
                      <p className="mt-1 text-xs text-gray-400">{item.dupla?.bairro || 'Sem bairro'}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="app-modal-footer">
              <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setRegistroSelecionado(null)}>Fechar</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
