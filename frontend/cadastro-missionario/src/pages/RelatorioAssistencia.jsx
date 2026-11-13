import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import BackButton from '../components/BackButton';
import EChart from '../components/EChart';
import { useAuth, PERFIS, ehAdmin } from '../contexts/AuthContext';
import {
  dataLocalISO,
  formatarDiaMes,
  intervaloDaSemana,
  intervaloDoMes,
  listarMesesDoAno,
  listarSemanasDoAno,
  rotuloMes,
  rotuloSemana,
  semanaISOAtual,
  semanaISOParaData,
} from '../lib/periodosRelatorio';

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

const extrairAnoDaSemana = (semana) => {
  const correspondencia = /^(\d{4})-W(\d{2})$/.exec(semana || '');
  return correspondencia ? Number(correspondencia[1]) : new Date().getFullYear();
};

const extrairAnoDoMes = (mes) => {
  const correspondencia = /^(\d{4})-(\d{2})$/.exec(mes || '');
  return correspondencia ? Number(correspondencia[1]) : new Date().getFullYear();
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

  const semanaVigente = useMemo(() => semanaISOAtual(), []);
  const mesVigente = useMemo(() => mesAtualISO(), []);

  const [dados, setDados] = useState(null);
  const [dadosAno, setDadosAno] = useState(null);
  const [coordenadores, setCoordenadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tipoPeriodo, setTipoPeriodo] = useState('semana');
  const [semanaSelecionada, setSemanaSelecionada] = useState(semanaVigente);
  const [mesSelecionado, setMesSelecionado] = useState(mesVigente);
  const [anoReferencia, setAnoReferencia] = useState(() => extrairAnoDaSemana(semanaVigente));
  const [exibirGradeSemanas, setExibirGradeSemanas] = useState(false);
  const [apenasSemanasComRegistros, setApenasSemanasComRegistros] = useState(false);
  const [filtros, setFiltros] = useState(() => ({
    ...intervaloDaSemana(semanaVigente),
    coordenadorId: '',
  }));
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [modalRegistrosAberto, setModalRegistrosAberto] = useState(false);

  const faixaSemanasRef = useRef(null);
  const podeRegistrarAssistencia = ehAdmin(usuario) || usuario?.perfil === PERFIS.COORDENADOR_REGIONAL;

  const semanasDoAno = useMemo(() => listarSemanasDoAno(anoReferencia), [anoReferencia]);
  const mesesDoAno = useMemo(() => listarMesesDoAno(anoReferencia), [anoReferencia]);

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

  useEffect(() => {
    const primeiraSemanaDe = semanasDoAno[0]?.de || `${anoReferencia}-01-01`;
    const ultimaSemanaAte = semanasDoAno[semanasDoAno.length - 1]?.ate || `${anoReferencia}-12-31`;
    const de = primeiraSemanaDe < `${anoReferencia}-01-01` ? primeiraSemanaDe : `${anoReferencia}-01-01`;
    const ate = ultimaSemanaAte > `${anoReferencia}-12-31` ? ultimaSemanaAte : `${anoReferencia}-12-31`;
    const params = { de, ate };
    if (filtros.coordenadorId) params.coordenadorId = filtros.coordenadorId;

    api.get('/relatorios/acompanhamento', { params })
      .then((res) => setDadosAno(res.data || null))
      .catch(() => setDadosAno(null));
  }, [anoReferencia, filtros.coordenadorId, semanasDoAno]);

  const atividadeAno = useMemo(() => {
    const porSemana = {};
    const porMes = {};

    (dadosAno?.porSemana || []).forEach((grupoSemana) => {
      const codigoPeloInicio = semanaISOParaData(`${grupoSemana.semanaInicio}T12:00:00`);
      if (codigoPeloInicio) {
        if (!porSemana[codigoPeloInicio]) porSemana[codigoPeloInicio] = { assistencias: 0, duplas: 0 };
        porSemana[codigoPeloInicio].assistencias += grupoSemana.saidas?.length || 0;
        porSemana[codigoPeloInicio].duplas += grupoSemana.totalDuplas || 0;
      }

      (grupoSemana.saidas || []).forEach((saida) => {
        const dataIso = typeof saida.dataSaida === 'string'
          ? saida.dataSaida.slice(0, 10)
          : dataLocalISO(new Date(saida.dataSaida));
        const chaveMes = dataIso.slice(0, 7);
        if (chaveMes) {
          if (!porMes[chaveMes]) porMes[chaveMes] = { assistencias: 0, duplas: 0 };
          porMes[chaveMes].assistencias += 1;
          porMes[chaveMes].duplas += saida.duplas?.length || 0;
        }
      });
    });

    const semanasComRegistro = semanasDoAno.filter((sem) => (porSemana[sem.codigo]?.assistencias || 0) > 0).length;
    const mesesComRegistro = mesesDoAno.filter((mes) => (porMes[mes.codigo]?.assistencias || 0) > 0).length;

    return {
      porSemana,
      porMes,
      semanasComRegistro,
      mesesComRegistro,
    };
  }, [dadosAno, mesesDoAno, semanasDoAno]);

  const semanasVisiveis = useMemo(() => {
    if (!apenasSemanasComRegistros) return semanasDoAno;
    const filtradas = semanasDoAno.filter((sem) => (atividadeAno.porSemana[sem.codigo]?.assistencias || 0) > 0 || sem.codigo === semanaSelecionada);
    return filtradas.length > 0 ? filtradas : semanasDoAno;
  }, [apenasSemanasComRegistros, atividadeAno.porSemana, semanaSelecionada, semanasDoAno]);

  useEffect(() => {
    if (tipoPeriodo !== 'semana' || exibirGradeSemanas || !faixaSemanasRef.current) return;
    const container = faixaSemanasRef.current;
    const elementoAtivo = container.querySelector(`[data-semana="${semanaSelecionada}"]`);
    if (elementoAtivo && typeof elementoAtivo.scrollIntoView === 'function') {
      elementoAtivo.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [semanaSelecionada, tipoPeriodo, exibirGradeSemanas, semanasVisiveis.length]);

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
            bairro: dupla.bairro || dupla.igreja?.nome || dupla.distrito?.nome || 'Sem bairro',
            coordenadores: new Set(),
            total: 0,
          };
        }
        if (saida.coordenador?.nome) {
          porDupla[chave].coordenadores.add(saida.coordenador.nome);
        }
        porDupla[chave].total += 1;
      });
    });

    const coordenadorMaisAtivo = Object.entries(porCoordenador)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];

    const listaDuplas = Object.values(porDupla)
      .map((item) => ({
        ...item,
        coordenadoresNomes: [...item.coordenadores].join(', '),
      }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));

    return {
      totalSaidas: dados?.totalSaidas || 0,
      totalDuplasVisitadas: dados?.totalDuplasVisitadas || 0,
      duplasUnicas: duplaIds.size,
      relatoriosPreenchidos,
      coordenadorMaisAtivo: coordenadorMaisAtivo ? { nome: coordenadorMaisAtivo[0], total: coordenadorMaisAtivo[1] } : null,
      duplasMaisVisitadas: listaDuplas.slice(0, 10),
      todasDuplasPeriodo: listaDuplas,
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
      const anoDaSemana = extrairAnoDaSemana(semanaSelecionada);
      setAnoReferencia(anoDaSemana);
      setFiltros((atual) => ({ ...atual, ...intervaloDaSemana(semanaSelecionada) }));
    } else if (tipo === 'mes') {
      const anoDoMes = extrairAnoDoMes(mesSelecionado);
      setAnoReferencia(anoDoMes);
      setFiltros((atual) => ({ ...atual, ...intervaloDoMes(mesSelecionado) }));
    }
  };

  const selecionarSemana = (semana) => {
    setSemanaSelecionada(semana);
    setAnoReferencia(extrairAnoDaSemana(semana));
    setTipoPeriodo('semana');
    setFiltros((atual) => ({ ...atual, ...intervaloDaSemana(semana) }));
  };

  const selecionarMes = (mes) => {
    setMesSelecionado(mes);
    setAnoReferencia(extrairAnoDoMes(mes));
    setTipoPeriodo('mes');
    setFiltros((atual) => ({ ...atual, ...intervaloDoMes(mes) }));
  };

  const alterarAnoReferencia = (novoAno) => {
    const anoValido = Number(novoAno);
    if (!Number.isInteger(anoValido) || anoValido < 2020 || anoValido > 2035) return;
    setAnoReferencia(anoValido);

    if (tipoPeriodo === 'semana') {
      const semanasNovoAno = listarSemanasDoAno(anoValido);
      const correspondencia = /^(\d{4})-W(\d{2})$/.exec(semanaSelecionada || '');
      const numAtual = correspondencia ? Number(correspondencia[2]) : 1;
      const numAlvo = Math.min(numAtual, semanasNovoAno.length);
      const novaSemana = `${anoValido}-W${String(numAlvo).padStart(2, '0')}`;
      setSemanaSelecionada(novaSemana);
      setFiltros((atual) => ({ ...atual, ...intervaloDaSemana(novaSemana) }));
    } else if (tipoPeriodo === 'mes') {
      const correspondencia = /^(\d{4})-(\d{2})$/.exec(mesSelecionado || '');
      const mesAlvo = correspondencia ? correspondencia[2] : '01';
      const novoMes = `${anoValido}-${mesAlvo}`;
      setMesSelecionado(novoMes);
      setFiltros((atual) => ({ ...atual, ...intervaloDoMes(novoMes) }));
    }
  };

  const navegarSemana = (direcao) => {
    const lista = semanasVisiveis.length > 0 ? semanasVisiveis : semanasDoAno;
    const indiceAtual = lista.findIndex((item) => item.codigo === semanaSelecionada);
    if (indiceAtual !== -1) {
      const novoIndice = indiceAtual + direcao;
      if (novoIndice >= 0 && novoIndice < lista.length) {
        selecionarSemana(lista[novoIndice].codigo);
        return;
      }
    }
    const novoAno = anoReferencia + (direcao > 0 ? 1 : -1);
    const semanasOutroAno = listarSemanasDoAno(novoAno);
    if (semanasOutroAno.length > 0) {
      const destino = direcao > 0 ? semanasOutroAno[0] : semanasOutroAno[semanasOutroAno.length - 1];
      selecionarSemana(destino.codigo);
    }
  };

  const navegarMes = (direcao) => {
    const indiceAtual = mesesDoAno.findIndex((item) => item.codigo === mesSelecionado);
    if (indiceAtual !== -1) {
      const novoIndice = indiceAtual + direcao;
      if (novoIndice >= 0 && novoIndice < mesesDoAno.length) {
        selecionarMes(mesesDoAno[novoIndice].codigo);
        return;
      }
    }
    const novoAno = anoReferencia + (direcao > 0 ? 1 : -1);
    const novoMesNumero = direcao > 0 ? '01' : '12';
    selecionarMes(`${novoAno}-${novoMesNumero}`);
  };

  const limparFiltros = () => {
    setTipoPeriodo('personalizado');
    setFiltros({ de: '', ate: '', coordenadorId: '' });
  };

  const filtrarSemanaAtual = () => {
    const semana = semanaISOAtual();
    setSemanaSelecionada(semana);
    setAnoReferencia(extrairAnoDaSemana(semana));
    setTipoPeriodo('semana');
    setFiltros((atual) => ({ ...atual, ...intervaloDaSemana(semana) }));
  };

  const intervaloSemanaAtiva = useMemo(
    () => intervaloDaSemana(semanaSelecionada),
    [semanaSelecionada]
  );

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
                <p className="mt-0.5 text-xs text-gray-400">
                  A semana vigente vem selecionada automaticamente. Clique nos quadrados abaixo para alternar rapidamente.
                </p>
              </div>
              <div className="inline-flex w-full rounded-xl border border-gray-200 bg-white p-1 sm:w-auto" role="group" aria-label="Tipo de período">
                {[['semana', 'Semana'], ['mes', 'Mês'], ['personalizado', 'Personalizado']].map(([valor, rotulo]) => (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => selecionarTipoPeriodo(valor)}
                    className={`min-h-10 flex-1 rounded-lg px-3.5 text-xs font-bold transition sm:flex-none ${tipoPeriodo === valor ? 'bg-[#1A3A6B] text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-[#1A3A6B]'}`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Linha principal de filtros: perfeitamente alinhada na mesma linha horizontal */}
          <div className="grid grid-cols-1 gap-3 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_auto] lg:items-end">
            {tipoPeriodo === 'semana' && (
              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Semana do ano</span>
                <div className="flex h-11 items-stretch gap-2">
                  <div className="inline-flex h-11 flex-shrink-0 items-center rounded-xl border border-gray-200 bg-white px-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => alterarAnoReferencia(anoReferencia - 1)}
                      className="flex h-9 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-[#1A3A6B]"
                      title="Ano anterior"
                      aria-label="Ano anterior"
                    >
                      ‹
                    </button>
                    <span className="px-2 text-xs font-extrabold text-[#1A3A6B]">{anoReferencia}</span>
                    <button
                      type="button"
                      onClick={() => alterarAnoReferencia(anoReferencia + 1)}
                      className="flex h-9 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-[#1A3A6B]"
                      title="Próximo ano"
                      aria-label="Próximo ano"
                    >
                      ›
                    </button>
                  </div>

                  <div className="flex h-11 min-w-0 flex-1 items-center justify-between rounded-xl border border-[#1A3A6B]/15 bg-[#1A3A6B]/[0.06] px-2 text-[#1A3A6B]">
                    <button
                      type="button"
                      onClick={() => navegarSemana(-1)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-bold text-[#1A3A6B] shadow-2xs transition hover:bg-white"
                      title="Semana anterior"
                      aria-label="Semana anterior"
                    >
                      ◀
                    </button>
                    <div className="min-w-0 px-2 text-center">
                      <span className="block truncate text-xs sm:text-sm font-extrabold leading-tight text-[#1A3A6B]">
                        {rotuloSemana(semanaSelecionada)}
                      </span>
                      {intervaloSemanaAtiva.de && (
                        <span className="block truncate text-[11px] font-semibold leading-tight text-[#1A3A6B]/75">
                          {formatarDiaMes(intervaloSemanaAtiva.de)}/{anoReferencia} — {formatarDiaMes(intervaloSemanaAtiva.ate)}/{anoReferencia}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => navegarSemana(1)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-bold text-[#1A3A6B] shadow-2xs transition hover:bg-white"
                      title="Próxima semana"
                      aria-label="Próxima semana"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tipoPeriodo === 'mes' && (
              <div>
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Mês do ano</span>
                <div className="flex h-11 items-stretch gap-2">
                  <div className="inline-flex h-11 flex-shrink-0 items-center rounded-xl border border-gray-200 bg-white px-1 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => alterarAnoReferencia(anoReferencia - 1)}
                      className="flex h-9 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-[#1A3A6B]"
                      title="Ano anterior"
                      aria-label="Ano anterior"
                    >
                      ‹
                    </button>
                    <span className="px-2 text-xs font-extrabold text-[#1A3A6B]">{anoReferencia}</span>
                    <button
                      type="button"
                      onClick={() => alterarAnoReferencia(anoReferencia + 1)}
                      className="flex h-9 w-8 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-[#1A3A6B]"
                      title="Próximo ano"
                      aria-label="Próximo ano"
                    >
                      ›
                    </button>
                  </div>

                  <div className="flex h-11 min-w-0 flex-1 items-center justify-between rounded-xl border border-[#1A3A6B]/15 bg-[#1A3A6B]/[0.06] px-2 text-[#1A3A6B]">
                    <button
                      type="button"
                      onClick={() => navegarMes(-1)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-bold text-[#1A3A6B] shadow-2xs transition hover:bg-white"
                      title="Mês anterior"
                      aria-label="Mês anterior"
                    >
                      ◀
                    </button>
                    <span className="truncate px-2 text-xs sm:text-sm font-extrabold text-[#1A3A6B]">
                      {rotuloMes(mesSelecionado)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navegarMes(1)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/80 text-sm font-bold text-[#1A3A6B] shadow-2xs transition hover:bg-white"
                      title="Próximo mês"
                      aria-label="Próximo mês"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tipoPeriodo === 'personalizado' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">De</span>
                  <input
                    type="date"
                    className="input-field h-11 py-0"
                    value={filtros.de}
                    onChange={(event) => setFiltros((atual) => ({ ...atual, de: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Até</span>
                  <input
                    type="date"
                    className="input-field h-11 py-0"
                    value={filtros.ate}
                    onChange={(event) => setFiltros((atual) => ({ ...atual, ate: event.target.value }))}
                  />
                </label>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Coordenador</span>
              <select
                className="input-field h-11 py-0"
                value={filtros.coordenadorId}
                onChange={(event) => setFiltros((atual) => ({ ...atual, coordenadorId: event.target.value }))}
              >
                <option value="">Todos os coordenadores</option>
                {coordenadores.map((coordenador) => (
                  <option key={coordenador.id} value={coordenador.id}>
                    {coordenador.nome}{coordenador.regiao?.nome ? ` - ${coordenador.regiao.nome}` : ''}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex h-11 items-center gap-2">
              <button
                type="button"
                className="btn-outline inline-flex h-11 flex-1 items-center justify-center whitespace-nowrap px-4 text-sm lg:flex-none"
                onClick={filtrarSemanaAtual}
              >
                Semana atual
              </button>
              <button
                type="button"
                className="btn-outline inline-flex h-11 items-center justify-center whitespace-nowrap px-4 text-sm"
                onClick={limparFiltros}
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Quadrados de todas as semanas (quando tipoPeriodo === 'semana') */}
          {tipoPeriodo === 'semana' && (
            <div className="border-t border-gray-100 bg-[#F8FAFC]/80 px-4 py-3.5 sm:px-6">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1A3A6B]">
                    Quadrados de semanas ({anoReferencia})
                  </span>
                  <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0d9488]">
                    {numero(atividadeAno.semanasComRegistro)} com assistência
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setApenasSemanasComRegistros((atual) => !atual)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                      apenasSemanasComRegistros
                        ? 'border-[#0d9488] bg-[#0d9488] text-white'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-[#1A3A6B]/30 hover:text-[#1A3A6B]'
                    }`}
                  >
                    {apenasSemanasComRegistros ? 'Mostrando só com registros' : 'Filtrar com registros'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExibirGradeSemanas((atual) => !atual)}
                    className="rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-bold text-gray-600 transition hover:border-[#1A3A6B]/30 hover:text-[#1A3A6B]"
                  >
                    {exibirGradeSemanas ? 'Ver em linha (◀ ▶)' : `Ver todas (${semanasVisiveis.length})`}
                  </button>
                </div>
              </div>

              {exibirGradeSemanas ? (
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12">
                  {semanasVisiveis.map((sem) => {
                    const selecionada = sem.codigo === semanaSelecionada;
                    const ehAtual = sem.codigo === semanaVigente;
                    const qtdAssistencias = atividadeAno.porSemana[sem.codigo]?.assistencias || 0;
                    return (
                      <button
                        key={sem.codigo}
                        type="button"
                        data-semana={sem.codigo}
                        onClick={() => selecionarSemana(sem.codigo)}
                        className={`group relative flex flex-col items-center justify-between rounded-xl border px-2 py-2 text-center transition ${
                          selecionada
                            ? 'border-[#1A3A6B] bg-[#1A3A6B] text-white shadow-sm ring-2 ring-[#C9963A]/50'
                            : qtdAssistencias > 0
                              ? 'border-[#0d9488]/40 bg-white text-[#1A3A6B] hover:border-[#1A3A6B] hover:shadow-2xs'
                              : 'border-gray-200/90 bg-white/80 text-gray-600 hover:border-[#1A3A6B]/40 hover:bg-white'
                        }`}
                      >
                        <div className="flex w-full items-center justify-between gap-1">
                          <span className={`text-xs font-extrabold ${selecionada ? 'text-white' : 'text-[#1A3A6B]'}`}>
                            {sem.rotuloCurto}
                          </span>
                          {ehAtual && (
                            <span className={`rounded px-1 py-0.2 text-[9px] font-extrabold uppercase ${selecionada ? 'bg-[#C9963A] text-white' : 'bg-[#C9963A]/15 text-[#C9963A]'}`}>
                              Atual
                            </span>
                          )}
                        </div>
                        <span className={`mt-1 text-[10px] font-medium leading-tight ${selecionada ? 'text-white/85' : 'text-gray-400'}`}>
                          {sem.intervaloCurto}
                        </span>
                        <span
                          className={`mt-1.5 inline-flex w-full items-center justify-center rounded-md px-1 py-0.5 text-[10px] font-bold ${
                            selecionada
                              ? 'bg-white/15 text-[#F2C979]'
                              : qtdAssistencias > 0
                                ? 'bg-[#0d9488]/10 text-[#0d9488]'
                                : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {qtdAssistencias > 0 ? `${qtdAssistencias} assist.` : '0 assist.'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navegarSemana(-1)}
                    className="flex h-16 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-bold text-[#1A3A6B] shadow-2xs transition hover:border-[#1A3A6B] hover:bg-[#1A3A6B] hover:text-white"
                    title="Selecionar semana anterior"
                    aria-label="Selecionar semana anterior"
                  >
                    ◀
                  </button>

                  <div
                    ref={faixaSemanasRef}
                    className="flex flex-1 items-stretch gap-1.5 overflow-x-auto scroll-smooth py-1 [scrollbar-width:thin]"
                  >
                    {semanasVisiveis.map((sem) => {
                      const selecionada = sem.codigo === semanaSelecionada;
                      const ehAtual = sem.codigo === semanaVigente;
                      const qtdAssistencias = atividadeAno.porSemana[sem.codigo]?.assistencias || 0;
                      return (
                        <button
                          key={sem.codigo}
                          type="button"
                          data-semana={sem.codigo}
                          onClick={() => selecionarSemana(sem.codigo)}
                          className={`group relative flex min-w-[5.5rem] flex-shrink-0 flex-col items-center justify-between rounded-xl border px-2.5 py-2 text-center transition ${
                            selecionada
                              ? 'border-[#1A3A6B] bg-[#1A3A6B] text-white shadow-sm ring-2 ring-[#C9963A]/55'
                              : qtdAssistencias > 0
                                ? 'border-[#0d9488]/40 bg-white text-[#1A3A6B] hover:border-[#1A3A6B] hover:shadow-2xs'
                                : 'border-gray-200/90 bg-white/85 text-gray-600 hover:border-[#1A3A6B]/40 hover:bg-white'
                          }`}
                        >
                          <div className="flex w-full items-center justify-between gap-1">
                            <span className={`text-xs font-extrabold ${selecionada ? 'text-white' : 'text-[#1A3A6B]'}`}>
                              {sem.rotuloCurto}
                            </span>
                            {ehAtual && (
                              <span className={`rounded px-1 text-[9px] font-extrabold uppercase ${selecionada ? 'bg-[#C9963A] text-white' : 'bg-[#C9963A]/15 text-[#C9963A]'}`}>
                                Atual
                              </span>
                            )}
                          </div>
                          <span className={`mt-1 text-[10px] font-medium leading-tight ${selecionada ? 'text-white/85' : 'text-gray-400'}`}>
                            {sem.intervaloCurto}
                          </span>
                          <span
                            className={`mt-1.5 inline-flex w-full items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              selecionada
                                ? 'bg-white/15 text-[#F2C979]'
                                : qtdAssistencias > 0
                                  ? 'bg-[#0d9488]/10 text-[#0d9488]'
                                  : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {qtdAssistencias > 0 ? `${qtdAssistencias} assist.` : '0 assist.'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => navegarSemana(1)}
                    className="flex h-16 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-bold text-[#1A3A6B] shadow-2xs transition hover:border-[#1A3A6B] hover:bg-[#1A3A6B] hover:text-white"
                    title="Selecionar próxima semana"
                    aria-label="Selecionar próxima semana"
                  >
                    ▶
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Quadrados de todos os meses (quando tipoPeriodo === 'mes') */}
          {tipoPeriodo === 'mes' && (
            <div className="border-t border-gray-100 bg-[#F8FAFC]/80 px-4 py-3.5 sm:px-6">
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#1A3A6B]">
                    Quadrados dos meses ({anoReferencia})
                  </span>
                  <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0d9488]">
                    {numero(atividadeAno.mesesComRegistro)} com assistência
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12">
                {mesesDoAno.map((mes) => {
                  const selecionado = mes.codigo === mesSelecionado;
                  const ehAtual = mes.codigo === mesVigente;
                  const qtdAssistencias = atividadeAno.porMes[mes.codigo]?.assistencias || 0;
                  return (
                    <button
                      key={mes.codigo}
                      type="button"
                      onClick={() => selecionarMes(mes.codigo)}
                      className={`flex flex-col items-center justify-between rounded-xl border px-2.5 py-2.5 text-center transition ${
                        selecionado
                          ? 'border-[#1A3A6B] bg-[#1A3A6B] text-white shadow-sm ring-2 ring-[#C9963A]/55'
                          : qtdAssistencias > 0
                            ? 'border-[#0d9488]/40 bg-white text-[#1A3A6B] hover:border-[#1A3A6B] hover:shadow-2xs'
                            : 'border-gray-200/90 bg-white/85 text-gray-600 hover:border-[#1A3A6B]/40 hover:bg-white'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1">
                        <span className={`text-xs font-extrabold uppercase ${selecionado ? 'text-white' : 'text-[#1A3A6B]'}`}>
                          {mes.nomeCurto}
                        </span>
                        {ehAtual && (
                          <span className={`rounded px-1 text-[9px] font-extrabold uppercase ${selecionado ? 'bg-[#C9963A] text-white' : 'bg-[#C9963A]/15 text-[#C9963A]'}`}>
                            Atual
                          </span>
                        )}
                      </div>
                      <span className={`mt-1 text-[10px] font-medium truncate w-full ${selecionado ? 'text-white/85' : 'text-gray-400'}`}>
                        {mes.nomeCompleto}
                      </span>
                      <span
                        className={`mt-1.5 inline-flex w-full items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                          selecionado
                            ? 'bg-white/15 text-[#F2C979]'
                            : qtdAssistencias > 0
                              ? 'bg-[#0d9488]/10 text-[#0d9488]'
                              : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {qtdAssistencias > 0 ? `${qtdAssistencias} assist.` : '0 assist.'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(filtros.de || filtros.ate) && (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 bg-[#F8FAFC] px-4 py-3 text-xs text-gray-500 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold uppercase tracking-wider text-[#C9963A]">Exibindo</span>
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-[#1A3A6B] shadow-sm">
                  {filtros.de ? formatarData(`${filtros.de}T12:00:00`) : 'início'} — {filtros.ate ? formatarData(`${filtros.ate}T12:00:00`) : 'hoje'}
                </span>
                {tipoPeriodo === 'semana' && (
                  <span className="rounded-full bg-[#1A3A6B]/10 px-3 py-1 font-bold text-[#1A3A6B]">
                    {rotuloSemana(semanaSelecionada)}
                  </span>
                )}
                {tipoPeriodo === 'mes' && (
                  <span className="rounded-full bg-[#1A3A6B]/10 px-3 py-1 font-bold text-[#1A3A6B]">
                    {rotuloMes(mesSelecionado)}
                  </span>
                )}
              </div>
              <span className="text-xs font-semibold text-gray-500">
                {numero(saidas.length)} assistência{saidas.length === 1 ? '' : 's'} · {numero(resumo.totalDuplasVisitadas)} dupla{resumo.totalDuplasVisitadas === 1 ? '' : 's'} acompanhada{resumo.totalDuplasVisitadas === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </section>

        {/* 1. Cards de indicadores do período selecionado */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Assistências" valor={resumo.totalSaidas} detalhe="Saídas registradas no período" cor="#7c3aed" />
          <MetricCard label="Duplas acompanhadas" valor={resumo.totalDuplasVisitadas} detalhe="Contagem total, incluindo repetições" cor="#0d9488" />
          <MetricCard label="Duplas únicas" valor={resumo.duplasUnicas} detalhe="Duplas distintas acompanhadas" cor="#1A3A6B" />
          <MetricCard label="Relatórios preenchidos" valor={resumo.relatoriosPreenchidos} detalhe={resumo.coordenadorMaisAtivo ? `Mais ativo: ${resumo.coordenadorMaisAtivo.nome}` : 'Com observações registradas'} cor="#C9963A" />
        </div>

        {/* 2. Histórico de assistências e Duplas acompanhadas (posicionados logo após os cards de indicadores) */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <section className="card xl:col-span-2">
            <div className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[#1A3A6B]">Histórico de assistências</h2>
                <p className="max-w-xl text-sm text-gray-400">
                  Quem deu a assistência, duplas acompanhadas e relatório de cada saída no período selecionado.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <span className="rounded-lg bg-[#1A3A6B]/10 px-3 py-2 text-sm font-bold text-[#1A3A6B]">{numero(saidas.length)} registros</span>
                {saidas.length > 0 && (
                  <button type="button" className="btn-outline whitespace-nowrap px-3 py-2 text-sm" onClick={() => setModalRegistrosAberto(true)}>
                    Ver todos os registros
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {saidas.slice(0, 8).map((saida) => {
                const duplasDaSaida = (saida.duplas || []).map((item) => item.dupla).filter(Boolean);
                const regiaoOuDistrito = saida.coordenador?.regiao?.nome || saida.distritoNome || saida.igrejaNome || '';
                return (
                  <button
                    key={saida.id}
                    type="button"
                    onClick={() => setRegistroSelecionado(saida)}
                    className="w-full overflow-hidden rounded-xl border border-gray-100 bg-white p-4 text-left transition hover:border-[#C9963A]/40 hover:shadow-sm"
                  >
                    <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[8rem_minmax(12rem,1.2fr)_5.5rem_minmax(0,1.45fr)] lg:items-start">
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Data</p>
                        <p className="font-bold text-[#1A3A6B]">{formatarData(saida.dataSaida)}</p>
                        {saida.tipoAssistencia && (
                          <span className="mt-1 inline-block rounded bg-[#C9963A]/12 px-2 py-0.5 text-[10px] font-bold text-[#C9963A]">
                            {saida.tipoAssistencia}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Quem deu a assistência</p>
                        <p className="break-words font-bold leading-snug text-[#1A3A6B]">{saida.coordenador?.nome || 'Sem coordenador'}</p>
                        {regiaoOuDistrito && (
                          <p className="mt-0.5 truncate text-xs font-medium text-[#C9963A]">{regiaoOuDistrito}</p>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Duplas</p>
                        <p className="text-2xl font-bold text-[#0d9488]">{numero(duplasDaSaida.length)}</p>
                      </div>
                      <div className="min-w-0 overflow-hidden">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Relato</p>
                        <p className="line-clamp-2 max-w-full break-words text-sm leading-snug text-gray-600 [overflow-wrap:anywhere]">
                          {saida.observacoes || 'Sem relato informado.'}
                        </p>
                      </div>
                    </div>

                    {duplasDaSaida.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-2.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mr-1">
                          Duplas acompanhadas:
                        </span>
                        {duplasDaSaida.map((dupla) => (
                          <span
                            key={`${saida.id}-dupla-${dupla.id}`}
                            className="inline-flex items-center rounded-lg bg-[#0d9488]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0d9488]"
                          >
                            {nomeDupla(dupla)}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}

              {saidas.length > 8 && (
                <button
                  type="button"
                  onClick={() => setModalRegistrosAberto(true)}
                  className="rounded-xl border border-dashed border-[#1A3A6B]/25 bg-[#F8FAFC] px-4 py-4 text-center text-sm font-bold text-[#1A3A6B] transition hover:border-[#C9963A]/50 hover:bg-white"
                >
                  Abrir lista completa com {numero(saidas.length)} registros
                </button>
              )}

              {saidas.length === 0 && (
                <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                  Nenhuma assistência encontrada para o período selecionado. Clique em outro quadrado de semana/mês acima para visualizar os relatórios.
                </div>
              )}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Duplas acompanhadas</h2>
            <p className="text-sm text-gray-400 mb-4">Duplas atendidas no período e quem realizou o acompanhamento.</p>
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
                    <span className="block truncate text-xs text-gray-400">{dupla.bairro}</span>
                    {dupla.coordenadoresNomes && (
                      <span className="mt-0.5 block truncate text-[11px] font-semibold text-[#C9963A]">
                        Coord.: {dupla.coordenadoresNomes}
                      </span>
                    )}
                  </span>
                  <span className="rounded-full bg-[#0d9488]/10 px-2.5 py-1 text-xs font-bold text-[#0d9488]">{dupla.total}x</span>
                </button>
              ))}
              {resumo.duplasMaisVisitadas.length === 0 && (
                <p className="rounded-xl bg-[#F4F5F7] px-4 py-8 text-center text-sm text-gray-400">
                  Nenhuma dupla acompanhada neste período.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* 3. Análise visual (Gráficos consolidados) */}
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

        {/* 4. Resumo por semana */}
        <section className="card">
          <h2 className="text-lg font-bold text-[#1A3A6B]">Resumo por semana</h2>
          <p className="text-sm text-gray-400 mb-4">Volume semanal das visitas de assistência no período consultado.</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(dados?.porSemana || []).map((semana) => {
              const codigoSem = semanaISOParaData(`${semana.semanaInicio}T12:00:00`);
              return (
                <button
                  key={semana.semanaInicio}
                  type="button"
                  onClick={() => codigoSem && selecionarSemana(codigoSem)}
                  className="rounded-xl border border-gray-100 bg-[#F8FAFC] p-4 text-left transition hover:border-[#C9963A]/50 hover:bg-white"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      Semana de {formatarData(`${semana.semanaInicio}T12:00:00`)}
                    </p>
                    {codigoSem && (
                      <span className="rounded-md bg-[#1A3A6B]/10 px-2 py-0.5 text-[11px] font-bold text-[#1A3A6B]">
                        {rotuloSemana(codigoSem)}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Info label="Saídas" valor={semana.saidas?.length || 0} />
                    <Info label="Duplas" valor={semana.totalDuplas || 0} />
                  </div>
                </button>
              );
            })}
            {(dados?.porSemana || []).length === 0 && <p className="text-sm text-gray-400">Sem semanas no período.</p>}
          </div>
        </section>
      </div>

      {modalRegistrosAberto && createPortal(
        <div className="app-modal-overlay" onClick={() => setModalRegistrosAberto(false)}>
          <div className="app-modal-panel max-w-6xl" onClick={(event) => event.stopPropagation()}>
            <div className="app-modal-header flex-col sm:flex-row">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Registros de assistência</p>
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
                        <p className="font-semibold text-gray-600">{formatarData(`${saida.semanaInicio}T12:00:00`)}</p>
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
                <Info label="Semana" valor={formatarData(`${registroSelecionado.semanaInicio}T12:00:00`)} />
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
