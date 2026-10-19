import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../lib/api';
import EChart from '../components/EChart';
import BackButton from '../components/BackButton';

const cards = [
  ['totalIgrejas', 'Igrejas'],
  ['novaDupla', 'Duplas'],
  ['estudosBiblicos', 'Estudos Bíblicos'],
  ['pontosEstudo', 'Ponto de Estudo'],
  ['classesBiblicas', 'Classe Bíblica'],
  ['batismosDuplas', 'Batismos de Duplas'],
  ['experienciaBatismo', 'Experiência de Batismo'],
  ['metaPessoasAlcancadas', 'Meta de Pessoas Alcançadas'],
  ['diretorMinisterioPessoal', 'Diretor Minist. Pessoal'],
  ['diretoresMissionarios', 'Diretor Missionário'],
];

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const escapeHtml = (valor = '') => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const corIndicador = {
  totalIgrejas: '#16a34a',
  novaDupla: '#1A3A6B',
  estudosBiblicos: '#0284c7',
  pontosEstudo: '#0d9488',
  classesBiblicas: '#7B2D8B',
  diretorMinisterioPessoal: '#C9963A',
  diretoresMissionarios: '#2563eb',
  batismosDuplas: '#14b8a6',
  experienciaBatismo: '#C9963A',
  metaPessoasAlcancadas: '#ea580c',
};

const tooltipIndicador = {
  totalIgrejas: 'Igrejas cadastradas no escopo selecionado.',
  novaDupla: 'Duplas vinculadas ao escopo selecionado.',
  estudosBiblicos: 'Estudos em andamento. Inclui fichas completas e registros resumidos informados pelas duplas.',
  pontosEstudo: 'Pontos de estudo com ficha em andamento no banco de dados.',
  classesBiblicas: 'Classes em andamento. Inclui fichas completas e registros resumidos informados pelas duplas.',
  batismosDuplas: 'Pessoas em estudos encerrados com o motivo Batismo.',
  experienciaBatismo: 'Experiência histórica de batismo informada no cadastro das duplas. Este número não representa batismos de estudos encerrados.',
  metaPessoasAlcancadas: 'Meta de pessoas alcançadas informada pelas duplas do escopo.',
  diretorMinisterioPessoal: 'Quantidade de igrejas usada como referência para Diretores de Ministério Pessoal.',
  diretoresMissionarios: 'Diretores missionários ativos vinculados ao escopo.',
};

const rotuloTipoEstudo = (tipo) => ({
  UNICO: 'Estudo bíblico',
  PONTO: 'Ponto de estudo',
  CLASSE: 'Classe bíblica',
}[tipo] || tipo || 'Não informado');

const formatarData = (valor) => {
  if (!valor) return 'Não informada';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? 'Não informada' : data.toLocaleDateString('pt-BR');
};

function SecaoProgressiva({ children, forcar = false, className = '', altura = 'min-h-80', ...props }) {
  const ref = useRef(null);
  const [visivel, setVisivel] = useState(forcar);

  useEffect(() => {
    if (forcar || visivel) {
      setVisivel(true);
      return undefined;
    }
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) {
        setVisivel(true);
        observador.disconnect();
      }
    }, { rootMargin: '500px 0px' });
    if (ref.current) observador.observe(ref.current);
    return () => observador.disconnect();
  }, [forcar, visivel]);

  return (
    <section ref={ref} className={`${className} ${!visivel ? altura : ''}`} {...props}>
      {visivel ? children : (
        <div className="flex h-full min-h-72 items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-400">
          Esta seção será carregada ao se aproximar da tela.
        </div>
      )}
    </section>
  );
}

function TabelaProgressiva({ itens = [], colunas = [], vazio = 'Nenhum registro encontrado.', maximo = null }) {
  const [limite, setLimite] = useState(15);
  const sentinela = useRef(null);
  const itensDisponiveis = maximo ? itens.slice(0, maximo) : itens;

  useEffect(() => setLimite(15), [itens]);

  useEffect(() => {
    if (limite >= itensDisponiveis.length) return undefined;
    const observador = new IntersectionObserver(([entrada]) => {
      if (entrada.isIntersecting) setLimite((atual) => Math.min(atual + 15, itensDisponiveis.length));
    }, { rootMargin: '250px 0px' });
    if (sentinela.current) observador.observe(sentinela.current);
    return () => observador.disconnect();
  }, [itensDisponiveis.length, limite]);

  if (!itens.length) {
    return <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">{vazio}</p>;
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {colunas.map((coluna) => (
                <th key={coluna.titulo} className="whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  {coluna.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {itensDisponiveis.slice(0, limite).map((item, indice) => (
              <tr
                key={item.id ?? `${indice}-${item.igreja || ''}`}
                className="align-top outline-none transition-colors duration-150 hover:bg-blue-50/70 active:bg-blue-100/80 focus-visible:bg-blue-50/70 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563eb]/35"
                tabIndex={0}
              >
                {colunas.map((coluna) => (
                  <td key={coluna.titulo} className="px-4 py-3 text-slate-600">
                    {coluna.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limite < itensDisponiveis.length && (
        <div ref={sentinela} className="py-3 text-center text-xs text-slate-400">
          Exibindo {numero(limite)} de {numero(itensDisponiveis.length)} registros…
        </div>
      )}
    </>
  );
}

function ModalDetalhes({ titulo, subtitulo, itens = [], colunas = [], vazio, aoFechar }) {
  const [busca, setBusca] = useState('');
  const tituloId = 'titulo-modal-relatorio-personalizado';

  useEffect(() => {
    const overflowAnterior = document.body.style.overflow;
    const fecharComEsc = (evento) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', fecharComEsc);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', fecharComEsc);
    };
  }, [aoFechar]);

  const normalizar = (valor) => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const termo = normalizar(busca.trim());
  const filtrados = termo
    ? itens.filter((item) => normalizar(Object.values(item).flat().join(' ')).includes(termo))
    : itens;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={(evento) => { if (evento.target === evento.currentTarget) aoFechar(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className="flex max-h-[calc(100dvh-1rem)] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#C9963A]">Relatório detalhado</p>
            <h2 id={tituloId} className="mt-1 text-xl font-bold text-[#1A3A6B] sm:text-2xl" style={{ fontFamily: 'Georgia, serif' }}>
              {titulo}
            </h2>
            {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-slate-200 text-xl text-slate-500 transition hover:border-slate-300 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]"
            aria-label="Fechar detalhes"
          >
            ×
          </button>
        </header>

        <div className="shrink-0 border-b border-slate-100 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block w-full sm:max-w-md">
              <span className="sr-only">Buscar nos detalhes</span>
              <input
                type="search"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar por nome, igreja, distrito…"
                className="input-field h-11 w-full pr-10"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
            </label>
            <span className="text-sm font-semibold text-slate-500">
              {numero(filtrados.length)} de {numero(itens.length)} registro(s)
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
          <TabelaProgressiva itens={filtrados} colunas={colunas} vazio={vazio} />
        </div>

        <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 text-right sm:px-6">
          <button type="button" className="btn-primary min-h-11 px-6" onClick={aoFechar}>Fechar</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

const montarMetricas = (dados) => cards.map(([key, label]) => ({
  key,
  label,
  valor: Number(dados?.[key] || 0),
  cor: corIndicador[key] || '#1A3A6B',
}));

const dadosOuVazio = (lista = [], label = 'Sem dados') => {
  const filtrada = lista.filter((item) => Number(item.value || 0) > 0);
  return filtrada.length ? filtrada : [{ name: label, value: 1, itemStyle: { color: '#cbd5e1' } }];
};

const coletarImagensGraficos = () => Array.from(document.querySelectorAll('[data-report-chart]'))
  .map((elemento) => {
    const canvas = elemento.querySelector('canvas');
    if (!canvas) return null;
    return {
      titulo: elemento.getAttribute('data-report-title') || 'Gráfico',
      imagem: canvas.toDataURL('image/png'),
    };
  })
  .filter(Boolean);

const abrirPdfPersonalizado = ({ dados, nivel, escopoNome, imagensGraficos = [], janelaExistente = null }) => {
  const metricas = montarMetricas(dados);
  const maior = Math.max(...metricas.map((item) => item.valor), 1);
  const linhas = metricas.map((item) => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td><strong>${numero(item.valor)}</strong></td>
      <td>
        <div class="bar"><span style="width:${Math.max(4, (item.valor / maior) * 100)}%; background:${item.cor};"></span></div>
      </td>
    </tr>
  `).join('');
  const cobertura = dados?.cobertura || {};
  const classificacoes = dados?.classificacoesDuplas || {};
  const linhasCobertura = [
    ['Duplas com estudo bíblico', cobertura.estudoBiblico?.com || 0],
    ['Duplas sem estudo bíblico', cobertura.estudoBiblico?.sem || 0],
    ['Estudos bíblicos com ficha completa', cobertura.estudoBiblico?.totalCadastrados || 0],
    ['Estudos bíblicos em registro resumido', cobertura.estudoBiblico?.totalResumidos || 0],
    ['Classes bíblicas com ficha completa', cobertura.classeBiblica?.totalCadastradas || 0],
    ['Classes bíblicas em registro resumido', cobertura.classeBiblica?.totalResumidas || 0],
    ['Duplas com visitação', cobertura.visitacao?.com || 0],
    ['Duplas sem visitação', cobertura.visitacao?.sem || 0],
    ['Visitações registradas', cobertura.visitacao?.totalVisitas || 0],
    ['Classe A', classificacoes.A || 0],
    ['Classe B', classificacoes.B || 0],
    ['Classe C', classificacoes.C || 0],
    ['Sem classificação', classificacoes.semClassificacao || 0],
  ].map(([label, valor]) => `<tr><td>${escapeHtml(label)}</td><td><strong>${numero(valor)}</strong></td></tr>`).join('');
  const linhasBatismos = (dados?.batismosDetalhados || []).map((item) => `
    <tr>
      <td>${escapeHtml((item.pessoas || []).join(', ') || item.estudo)}</td>
      <td>${numero(item.quantidade)}</td>
      <td>${escapeHtml(formatarData(item.data))}</td>
      <td>${escapeHtml(item.estudo)} (${escapeHtml(rotuloTipoEstudo(item.tipo))})</td>
      <td>${escapeHtml(item.dupla)}</td>
      <td>${escapeHtml(item.igreja)} / ${escapeHtml(item.distrito)} / ${escapeHtml(item.regiao)}</td>
    </tr>
  `).join('');
  const linhasEstudos = (dados?.detalhesEstudos || []).map((item) => `
    <tr>
      <td>${escapeHtml(rotuloTipoEstudo(item.tipo))}</td>
      <td>${escapeHtml(item.nome)}</td>
      <td>${escapeHtml((item.pessoas || []).join(', ') || (item.registroResumido ? 'Sem ficha individual' : 'Não informado'))}</td>
      <td>${item.licaoAtual ? `Lição ${numero(item.licaoAtual)}` : 'Não informada'}</td>
      <td>${escapeHtml(item.dupla)}</td>
      <td>${escapeHtml(item.igreja)} / ${escapeHtml(item.distrito)} / ${escapeHtml(item.regiao)}</td>
      <td>${item.registroResumido ? 'Registro resumido' : 'Ficha completa'}</td>
    </tr>
  `).join('');
  const linhasIgrejas = (dados?.duplasPorIgreja || []).map((item) => `
    <tr>
      <td>${escapeHtml(item.igreja)}</td>
      <td>${escapeHtml(item.distrito)}</td>
      <td>${escapeHtml(item.regiao)}</td>
      <td>${numero(item.quantidadeDuplas)}</td>
      <td>${numero(item.estudosBiblicos)}</td>
      <td>${numero(item.pontosEstudo)}</td>
      <td>${numero(item.classesBiblicas)}</td>
      <td>${numero(item.batismosDuplas)}</td>
    </tr>
  `).join('');
  const blocosGraficos = imagensGraficos.map((grafico) => `
    <div class="grafico">
      <h2>${escapeHtml(grafico.titulo)}</h2>
      <img src="${grafico.imagem}" alt="${escapeHtml(grafico.titulo)}" />
    </div>
  `).join('');
  const janela = janelaExistente || window.open('', '_blank');
  if (!janela) return false;

  janela.document.open();
  janela.document.write(`
    <html>
      <head>
        <title>Relatório Personalizado</title>
        <style>
          @page { margin: 16mm; }
          body { font-family: Arial, sans-serif; color: #1f2937; line-height: 1.45; }
          h1 { color: #1A3A6B; margin: 0 0 6px; font-size: 26px; }
          h2 { color: #1A3A6B; font-size: 17px; margin: 24px 0 10px; }
          .sub { color: #6b7280; margin: 0 0 20px; }
          .meta { border-left: 4px solid #C9963A; background: #f8fafc; padding: 12px 14px; margin-bottom: 18px; }
          .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
          .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #fff; }
          .card span { color: #6b7280; display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .card strong { color: #1A3A6B; display: block; font-size: 24px; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { background: #1A3A6B; color: white; padding: 9px; text-align: left; }
          td { border-bottom: 1px solid #e5e7eb; padding: 9px; vertical-align: middle; }
          .bar { height: 10px; border-radius: 999px; background: #eef2f7; overflow: hidden; }
          .bar span { display: block; height: 100%; border-radius: 999px; }
          .grafico { break-inside: avoid; page-break-inside: avoid; margin-top: 18px; }
          .grafico img { width: 100%; max-height: 310px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 10px; }
          .detalhes { margin-top: 24px; }
          .detalhes table { font-size: 10px; }
          .detalhes th, .detalhes td { padding: 6px; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          .rodape { color: #6b7280; font-size: 11px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <h1>Relatório Personalizado</h1>
        <p class="sub">Análise consolidada por ${escapeHtml(nivel)}: <strong>${escapeHtml(escopoNome)}</strong></p>
        <div class="meta">
          Dados filtrados diretamente pelo escopo selecionado.<br>
          Gerado em ${new Date().toLocaleString('pt-BR')}.
        </div>
        <div class="cards">
          ${metricas.map((item) => `<div class="card"><span>${escapeHtml(item.label)}</span><strong>${numero(item.valor)}</strong></div>`).join('')}
        </div>
        <h2>Comparativo por indicador</h2>
        <table>
          <thead><tr><th>Indicador</th><th>Total</th><th>Proporção visual</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        <h2>Cobertura e classificações</h2>
        <table>
          <thead><tr><th>Indicador detalhado</th><th>Total</th></tr></thead>
          <tbody>${linhasCobertura}</tbody>
        </table>
        <div class="detalhes">
          <h2>Batismos de duplas</h2>
          <table>
            <thead><tr><th>Quem foi batizado</th><th>Qtd.</th><th>Data</th><th>Estudo de origem</th><th>Dupla</th><th>Localização</th></tr></thead>
            <tbody>${linhasBatismos || '<tr><td colspan="6">Nenhum estudo encerrado com batismo neste escopo.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="detalhes">
          <h2>Estudos em andamento</h2>
          <table>
            <thead><tr><th>Tipo</th><th>Estudo</th><th>Pessoas</th><th>Lição</th><th>Dupla</th><th>Localização</th><th>Origem</th></tr></thead>
            <tbody>${linhasEstudos || '<tr><td colspan="7">Nenhum estudo em andamento neste escopo.</td></tr>'}</tbody>
          </table>
        </div>
        <div class="detalhes">
          <h2>Igrejas e atividade missionária</h2>
          <table>
            <thead><tr><th>Igreja</th><th>Distrito</th><th>Região</th><th>Duplas</th><th>Estudos</th><th>Pontos</th><th>Classes</th><th>Batismos</th></tr></thead>
            <tbody>${linhasIgrejas || '<tr><td colspan="8">Nenhuma igreja encontrada neste escopo.</td></tr>'}</tbody>
          </table>
        </div>
        ${blocosGraficos}
        <p class="rodape">Sistema de Duplas Missionárias - PCM Associação Paulistana.</p>
      </body>
    </html>
  `);
  janela.document.close();
  janela.focus();
  setTimeout(() => janela.print(), 250);
  return true;
};

export default function RelatorioPersonalizado() {
  const [nivel, setNivel] = useState('regiao');
  const [regioes, setRegioes] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [selecionado, setSelecionado] = useState('');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [renderizarTudo, setRenderizarTudo] = useState(false);
  const [modalIndicador, setModalIndicador] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/regioes'), api.get('/distritos'), api.get('/igrejas')])
      .then(([rRegioes, rDistritos, rIgrejas]) => {
        setRegioes(rRegioes.data);
        setDistritos(rDistritos.data);
        setIgrejas(rIgrejas.data);
        setSelecionado(String(rRegioes.data[0]?.id || ''));
      });
  }, []);

  useEffect(() => {
    const lista = nivel === 'regiao' ? regioes : nivel === 'distrito' ? distritos : igrejas;
    setSelecionado(String(lista[0]?.id || ''));
    setDados(null);
  }, [nivel, regioes, distritos, igrejas]);

  const opcoes = useMemo(() => {
    if (nivel === 'regiao') return regioes;
    if (nivel === 'distrito') return distritos;
    return igrejas;
  }, [nivel, regioes, distritos, igrejas]);

  const escopoSelecionado = useMemo(() => (
    opcoes.find((item) => String(item.id) === String(selecionado))
  ), [opcoes, selecionado]);

  const metricas = useMemo(() => montarMetricas(dados), [dados]);

  const grupoMinisterio = useMemo(() => (
    metricas.filter((item) => ['totalIgrejas', 'novaDupla', 'estudosBiblicos', 'pontosEstudo', 'classesBiblicas'].includes(item.key))
  ), [metricas]);

  const grupoImpacto = useMemo(() => (
    metricas.filter((item) => ['batismosDuplas', 'experienciaBatismo', 'metaPessoasAlcancadas', 'diretorMinisterioPessoal', 'diretoresMissionarios'].includes(item.key))
  ), [metricas]);

  const colunaOption = useMemo(() => ({
    color: metricas.map((item) => item.cor),
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 28, right: 16, bottom: 70, top: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: metricas.map((item) => item.label),
      axisLabel: { interval: 0, rotate: 28, color: '#64748b', fontSize: 11 },
    },
    yAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [{
      type: 'bar',
      barWidth: 28,
      data: metricas.map((item) => ({ value: item.valor, itemStyle: { color: item.cor, borderRadius: [6, 6, 0, 0] } })),
    }],
  }), [metricas]);

  const linhaOption = useMemo(() => ({
    color: ['#1A3A6B', '#C9963A'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { color: '#64748b' } },
    grid: { left: 28, right: 20, bottom: 48, top: 24, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Igrejas', 'Duplas', 'Estudos', 'Pontos', 'Classes', 'Batismos', 'Experiência', 'Meta'],
      axisLabel: { color: '#64748b' },
    },
    yAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [
      {
        name: 'Indicadores do escopo',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: [
          dados?.totalIgrejas || 0,
          dados?.novaDupla || 0,
          dados?.estudosBiblicos || 0,
          dados?.pontosEstudo || 0,
          dados?.classesBiblicas || 0,
          dados?.batismosDuplas || 0,
          dados?.experienciaBatismo || 0,
          dados?.metaPessoasAlcancadas || 0,
        ],
      },
    ],
  }), [dados]);

  const pizzaOption = useMemo(() => {
    const base = [...grupoMinisterio, ...grupoImpacto].filter((item) => item.valor > 0);
    const data = base.length ? base : [{ label: 'Sem dados', valor: 1, cor: '#cbd5e1' }];
    return {
      color: data.map((item) => item.cor),
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll', textStyle: { color: '#64748b' } },
      series: [{
        name: 'Distribuição',
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '43%'],
        avoidLabelOverlap: true,
        label: { formatter: '{b}\n{d}%', color: '#334155', fontSize: 11 },
        data: data.map((item) => ({ name: item.label, value: item.valor })),
      }],
    };
  }, [grupoMinisterio, grupoImpacto]);

  const coberturaOption = useMemo(() => {
    const cobertura = dados?.cobertura || {};
    const categorias = ['Estudo bíblico', 'Ponto de estudo', 'Classe bíblica', 'Visitação'];
    return {
      color: ['#0d9488', '#94a3b8'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { bottom: 0, textStyle: { color: '#64748b' } },
      grid: { left: 28, right: 18, top: 24, bottom: 46, containLabel: true },
      xAxis: { type: 'category', data: categorias, axisLabel: { color: '#64748b' } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: [
        {
          name: 'Com',
          type: 'bar',
          barWidth: 22,
          data: [
            cobertura.estudoBiblico?.com || 0,
            cobertura.pontoEstudo?.com || 0,
            cobertura.classeBiblica?.com || 0,
            cobertura.visitacao?.com || 0,
          ],
        },
        {
          name: 'Sem',
          type: 'bar',
          barWidth: 22,
          data: [
            cobertura.estudoBiblico?.sem || 0,
            cobertura.pontoEstudo?.sem || 0,
            cobertura.classeBiblica?.sem || 0,
            cobertura.visitacao?.sem || 0,
          ],
        },
      ],
    };
  }, [dados]);

  const volumeEstudosOption = useMemo(() => {
    const cobertura = dados?.cobertura || {};
    return {
      color: ['#0284c7', '#0d9488', '#7B2D8B', '#C9963A'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 28, right: 18, top: 24, bottom: 36, containLabel: true },
      xAxis: { type: 'category', data: ['Estudos com ficha', 'Estudos resumidos', 'Pontos', 'Classes com ficha', 'Classes resumidas'], axisLabel: { color: '#64748b', interval: 0, rotate: 18 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: [{
        type: 'bar',
        barWidth: 30,
        data: [
          { value: cobertura.estudoBiblico?.totalCadastrados || 0, itemStyle: { color: '#0284c7', borderRadius: [6, 6, 0, 0] } },
          { value: cobertura.estudoBiblico?.totalResumidos || 0, itemStyle: { color: '#C9963A', borderRadius: [6, 6, 0, 0] } },
          { value: cobertura.pontoEstudo?.totalPontos || 0, itemStyle: { color: '#0d9488', borderRadius: [6, 6, 0, 0] } },
          { value: cobertura.classeBiblica?.totalCadastradas || 0, itemStyle: { color: '#7B2D8B', borderRadius: [6, 6, 0, 0] } },
          { value: cobertura.classeBiblica?.totalResumidas || 0, itemStyle: { color: '#f59e0b', borderRadius: [6, 6, 0, 0] } },
        ],
      }],
    };
  }, [dados]);

  const classificacaoOption = useMemo(() => {
    const classes = dados?.classificacoesDuplas || {};
    return {
      color: ['#16a34a', '#d97706', '#dc2626', '#94a3b8'],
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: '#64748b' } },
      series: [{
        name: 'Classificação',
        type: 'pie',
        radius: '68%',
        center: ['50%', '43%'],
        label: { formatter: '{b}\n{c}', color: '#334155', fontSize: 11 },
        data: dadosOuVazio([
          { name: 'Classe A', value: classes.A || 0 },
          { name: 'Classe B', value: classes.B || 0 },
          { name: 'Classe C', value: classes.C || 0 },
          { name: 'Sem classificação', value: classes.semClassificacao || 0 },
        ]),
      }],
    };
  }, [dados]);

  const statusOption = useMemo(() => {
    const status = dados?.duplasPorStatus || {};
    return {
      color: ['#0d9488', '#C9963A', '#64748b'],
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { color: '#64748b' } },
      series: [{
        name: 'Status das duplas',
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['50%', '43%'],
        label: { formatter: '{b}\n{c}', color: '#334155', fontSize: 11 },
        data: dadosOuVazio([
          { name: 'Ativas', value: status.ativas || 0 },
          { name: 'Pendentes', value: status.pendentes || 0 },
          { name: 'Inativas', value: status.inativas || 0 },
        ]),
      }],
    };
  }, [dados]);

  const criarRankingOption = (titulo, lista = [], cor = '#1A3A6B') => ({
    color: [cor],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 120, right: 18, top: 20, bottom: 24, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    yAxis: {
      type: 'category',
      data: lista.map((item) => item.nome),
      axisLabel: { color: '#64748b', width: 120, overflow: 'truncate' },
    },
    series: [{
      name: titulo,
      type: 'bar',
      barWidth: 18,
      data: lista.map((item) => ({ value: item.valor, itemStyle: { borderRadius: [0, 6, 6, 0] } })),
    }],
  });

  const rankingEstudosOption = useMemo(() => (
    criarRankingOption('Estudos', dados?.rankings?.estudos || [], '#0284c7')
  ), [dados]);

  const rankingVisitasOption = useMemo(() => (
    criarRankingOption('Visitações', dados?.rankings?.visitas || [], '#7c3aed')
  ), [dados]);

  const gerar = async () => {
    if (!selecionado) return;
    setCarregando(true);
    setErro('');
    try {
      const params = { nivel };
      if (nivel === 'regiao') params.regiaoId = selecionado;
      if (nivel === 'distrito') params.distritoId = selecionado;
      if (nivel === 'igreja') params.igrejaId = selecionado;
      const { data } = await api.get('/relatorios/personalizado', { params });
      setDados(data);
      setRenderizarTudo(false);
      setModalIndicador(null);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar relatório personalizado.');
    } finally {
      setCarregando(false);
    }
  };

  const gerarPdf = async () => {
    if (!dados) return;
    const janelaPdf = window.open('', '_blank');
    if (!janelaPdf) {
      setErro('Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.');
      return;
    }
    janelaPdf.document.write('<p style="font-family:Arial,sans-serif;padding:24px">Preparando relatório completo…</p>');
    janelaPdf.document.close();
    setRenderizarTudo(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const ok = abrirPdfPersonalizado({
      dados,
      nivel: nivel === 'regiao' ? 'Região' : nivel === 'distrito' ? 'Distrito' : 'Igreja',
      escopoNome: escopoSelecionado?.nome || 'Escopo selecionado',
      imagensGraficos: coletarImagensGraficos(),
      janelaExistente: janelaPdf,
    });
    if (!ok) setErro('Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.');
  };

  const colunasBatismos = [
    {
      titulo: 'Quem foi batizado',
      render: (item) => <span className="font-semibold text-slate-800">{(item.pessoas || []).join(', ') || item.estudo}</span>,
    },
    { titulo: 'Qtd.', render: (item) => numero(item.quantidade) },
    { titulo: 'Data', render: (item) => formatarData(item.data) },
    {
      titulo: 'Estudo de origem',
      render: (item) => <>{item.estudo}<span className="mt-0.5 block text-xs text-slate-400">{rotuloTipoEstudo(item.tipo)}</span></>,
    },
    { titulo: 'Dupla', render: (item) => item.dupla },
    {
      titulo: 'Localização',
      render: (item) => <>{item.igreja}<span className="mt-0.5 block text-xs text-slate-400">{item.distrito} · {item.regiao}</span></>,
    },
  ];

  const colunasEstudos = [
    { titulo: 'Tipo', render: (item) => rotuloTipoEstudo(item.tipo) },
    {
      titulo: 'Estudo / estudante',
      render: (item) => <span className="font-semibold text-slate-800">{item.nome}</span>,
    },
    {
      titulo: 'Pessoas',
      render: (item) => (item.pessoas || []).join(', ') || (item.registroResumido ? 'Sem ficha individual' : 'Não informado'),
    },
    { titulo: 'Lição', render: (item) => (item.licaoAtual ? `Lição ${numero(item.licaoAtual)}` : 'Não informada') },
    { titulo: 'Dupla', render: (item) => item.dupla },
    {
      titulo: 'Igreja',
      render: (item) => <>{item.igreja}<span className="mt-0.5 block text-xs text-slate-400">{item.distrito} · {item.regiao}</span></>,
    },
    {
      titulo: 'Origem',
      render: (item) => (
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.registroResumido ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
          {item.registroResumido ? 'Registro resumido' : 'Ficha completa'}
        </span>
      ),
    },
  ];

  const colunasIgrejas = [
    { titulo: 'Igreja', render: (item) => <span className="font-semibold text-slate-800">{item.igreja}</span> },
    { titulo: 'Distrito / região', render: (item) => <>{item.distrito}<span className="mt-0.5 block text-xs text-slate-400">{item.regiao}</span></> },
    { titulo: 'Duplas', render: (item) => numero(item.quantidadeDuplas) },
    { titulo: 'Estudos', render: (item) => numero(item.estudosBiblicos) },
    { titulo: 'Pontos', render: (item) => numero(item.pontosEstudo) },
    { titulo: 'Classes', render: (item) => numero(item.classesBiblicas) },
    { titulo: 'Batismos', render: (item) => numero(item.batismosDuplas) },
  ];

  const colunasDuplas = [
    { titulo: 'Dupla', render: (item) => <span className="font-semibold text-slate-800">{item.nome}</span> },
    {
      titulo: 'Localização',
      render: (item) => <>{item.igreja}<span className="mt-0.5 block text-xs text-slate-400">{item.distrito} · {item.regiao}</span></>,
    },
    { titulo: 'Status', render: (item) => item.status || 'Não informado' },
    { titulo: 'Estudos', render: (item) => numero(item.estudosBiblicos) },
    { titulo: 'Pontos', render: (item) => numero(item.pontosEstudo) },
    { titulo: 'Classes', render: (item) => numero(item.classesBiblicas) },
    { titulo: 'Experiência de batismo', render: (item) => numero(item.experienciaBatismo) },
    { titulo: 'Meta alcançada', render: (item) => numero(item.metaPessoasAlcancadas) },
  ];

  const colunasExperiencia = [
    { titulo: 'Dupla', render: (item) => <span className="font-semibold text-slate-800">{item.nome}</span> },
    { titulo: 'Experiência de batismo', render: (item) => <strong className="text-amber-700">{numero(item.experienciaBatismo)}</strong> },
    { titulo: 'Igreja', render: (item) => item.igreja },
    { titulo: 'Distrito / região', render: (item) => `${item.distrito} · ${item.regiao}` },
  ];

  const colunasMetaPessoas = [
    { titulo: 'Dupla', render: (item) => <span className="font-semibold text-slate-800">{item.nome}</span> },
    { titulo: 'Meta de pessoas alcançadas', render: (item) => <strong className="text-orange-700">{numero(item.metaPessoasAlcancadas)}</strong> },
    { titulo: 'Igreja', render: (item) => item.igreja },
    { titulo: 'Distrito / região', render: (item) => `${item.distrito} · ${item.regiao}` },
  ];

  const colunasDiretoresMinisterio = [
    { titulo: 'Diretor de Ministério Pessoal', render: (item) => <span className="font-semibold text-slate-800">{item.nome}</span> },
    { titulo: 'Igreja', render: (item) => item.igreja },
    { titulo: 'Distrito', render: (item) => item.distrito },
    { titulo: 'Região', render: (item) => item.regiao },
  ];

  const colunasDiretoresMissionarios = [
    { titulo: 'Diretor missionário', render: (item) => <span className="font-semibold text-slate-800">{item.nome}</span> },
    { titulo: 'E-mail', render: (item) => item.email },
    { titulo: 'Igreja', render: (item) => item.igreja },
    { titulo: 'Distrito / região', render: (item) => `${item.distrito} · ${item.regiao}` },
  ];

  const configuracaoModal = (() => {
    if (!dados || !modalIndicador) return null;
    const estudosPorTipo = (tipo) => (dados.detalhesEstudos || []).filter((item) => item.tipo === tipo);
    const duplasDetalhadas = dados.duplasDetalhadas || [];
    const configuracoes = {
      totalIgrejas: {
        titulo: 'Igrejas do escopo',
        subtitulo: 'Duplas e atividades missionárias organizadas por igreja.',
        itens: dados.duplasPorIgreja || [],
        colunas: colunasIgrejas,
        vazio: 'Nenhuma igreja encontrada neste escopo.',
      },
      novaDupla: {
        titulo: 'Todas as duplas',
        subtitulo: 'Duplas, localização, status e indicadores no escopo selecionado.',
        itens: duplasDetalhadas,
        colunas: colunasDuplas,
        vazio: 'Nenhuma dupla encontrada neste escopo.',
      },
      estudosBiblicos: {
        titulo: 'Todos os estudos bíblicos',
        subtitulo: 'Fichas completas e registros resumidos em andamento.',
        itens: estudosPorTipo('UNICO'),
        colunas: colunasEstudos,
        vazio: 'Nenhum estudo bíblico em andamento neste escopo.',
      },
      todosEstudos: {
        titulo: 'Todos os estudos em andamento',
        subtitulo: 'Estudos bíblicos, pontos de estudo e classes bíblicas do escopo selecionado.',
        itens: dados.detalhesEstudos || [],
        colunas: colunasEstudos,
        vazio: 'Nenhum estudo em andamento neste escopo.',
      },
      pontosEstudo: {
        titulo: 'Todos os pontos de estudo',
        subtitulo: 'Pontos de estudo em andamento no escopo selecionado.',
        itens: estudosPorTipo('PONTO'),
        colunas: colunasEstudos,
        vazio: 'Nenhum ponto de estudo em andamento neste escopo.',
      },
      classesBiblicas: {
        titulo: 'Todas as classes bíblicas',
        subtitulo: 'Fichas completas e registros resumidos em andamento.',
        itens: estudosPorTipo('CLASSE'),
        colunas: colunasEstudos,
        vazio: 'Nenhuma classe bíblica em andamento neste escopo.',
      },
      batismosDuplas: {
        titulo: 'Todos os batismos de duplas',
        subtitulo: 'Pessoas batizadas, data, estudo de origem, dupla e localização.',
        itens: dados.batismosDetalhados || [],
        colunas: colunasBatismos,
        vazio: 'Nenhum estudo foi encerrado com batismo neste escopo.',
      },
      experienciaBatismo: {
        titulo: 'Experiências de batismo',
        subtitulo: 'Histórico de experiência informado no cadastro de cada dupla.',
        itens: duplasDetalhadas.filter((item) => item.experienciaBatismo > 0),
        colunas: colunasExperiencia,
        vazio: 'Nenhuma experiência de batismo foi informada neste escopo.',
      },
      metaPessoasAlcancadas: {
        titulo: 'Meta de pessoas alcançadas',
        subtitulo: 'Metas informadas pelas duplas do escopo selecionado.',
        itens: duplasDetalhadas.filter((item) => item.metaPessoasAlcancadas > 0),
        colunas: colunasMetaPessoas,
        vazio: 'Nenhuma meta de pessoas alcançadas foi informada neste escopo.',
      },
      diretorMinisterioPessoal: {
        titulo: 'Diretores de Ministério Pessoal',
        subtitulo: 'Responsáveis informados nas igrejas do escopo.',
        itens: dados.diretoresMinisterioPessoalDetalhados || [],
        colunas: colunasDiretoresMinisterio,
        vazio: 'Nenhuma igreja encontrada neste escopo.',
      },
      diretoresMissionarios: {
        titulo: 'Diretores missionários',
        subtitulo: 'Usuários ativos com acesso de Diretor Missionário de Igreja.',
        itens: dados.diretoresMissionariosDetalhados || [],
        colunas: colunasDiretoresMissionarios,
        vazio: 'Nenhum diretor missionário ativo encontrado neste escopo.',
      },
    };
    return configuracoes[modalIndicador] || null;
  })();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <BackButton fallbackTo="/relatorios" className="mb-3" />
        <p className="text-[#C9963A] text-xs font-bold uppercase tracking-wider">Administração</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Relatório Personalizado
        </h1>
      </div>

      <div className="card mb-6">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Analisar por</span>
            <select className="input-field" value={nivel} onChange={(e) => setNivel(e.target.value)}>
              <option value="regiao">Região</option>
              <option value="distrito">Distrito</option>
              <option value="igreja">Igreja</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Escopo</span>
            <select className="input-field" value={selecionado} onChange={(e) => setSelecionado(e.target.value)}>
              {opcoes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}{item.distrito?.nome ? ` (${item.distrito.nome})` : item.regiao?.nome ? ` (${item.regiao.nome})` : ''}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary h-11" onClick={gerar} disabled={carregando || !selecionado}>
            {carregando ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
        {erro && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      </div>

      {dados && (
        <div id="relatorio-personalizado-exportavel">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Resultado consolidado</p>
              <h2 className="mt-1 text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                {escopoSelecionado?.nome || 'Escopo selecionado'}
              </h2>
            </div>
            <button type="button" className="btn-outline self-start px-4 py-2 text-sm sm:self-auto" onClick={gerarPdf}>
              Gerar PDF
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {metricas.map(({ key, label, valor, cor }) => (
              <button
                type="button"
                key={key}
                className="smart-tooltip card group min-h-32 p-4 text-left outline-none transition duration-200 hover:-translate-y-0.5 hover:border-[#2563eb]/35 hover:bg-blue-50/40 hover:shadow-lg active:scale-[0.99] active:bg-blue-100/60 focus-visible:-translate-y-0.5 focus-visible:border-[#2563eb] focus-visible:ring-2 focus-visible:ring-[#2563eb]/30"
                data-tooltip={tooltipIndicador[key] || `${label}: total no escopo selecionado.`}
                onClick={() => setModalIndicador(key)}
                aria-haspopup="dialog"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-500">{label}</span>
                  <span className="shrink-0 text-[11px] font-bold text-[#1A3A6B] opacity-75 transition group-hover:opacity-100">Ver todos</span>
                </span>
                <p className="mt-2 text-3xl font-bold" style={{ color: cor }}>{numero(valor)}</p>
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5">
            <SecaoProgressiva forcar={renderizarTudo} className="card" altura="min-h-72">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#1A3A6B]">Batismos de duplas</h2>
                  <p className="mt-1 text-sm text-gray-400">Pessoas, data, estudo de origem, dupla e localização dos estudos encerrados com batismo.</p>
                </div>
                <div className="flex items-center gap-3">
                  <strong className="text-sm text-emerald-700">{numero(dados.batismosDuplas)} pessoa(s)</strong>
                  <button type="button" className="rounded-lg px-2 py-1 text-sm font-bold text-[#1A3A6B] transition hover:bg-blue-50 hover:text-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]" onClick={() => setModalIndicador('batismosDuplas')}>
                    Ver todos
                  </button>
                </div>
              </div>
              <TabelaProgressiva
                itens={dados.batismosDetalhados || []}
                colunas={colunasBatismos}
                vazio="Nenhum estudo foi encerrado com batismo neste escopo."
                maximo={5}
              />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card" altura="min-h-80">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#1A3A6B]">Estudos em andamento</h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Fichas individuais e registros resumidos das duplas. Os registros resumidos não possuem nome do estudante ou lição.
                  </p>
                </div>
                <button type="button" className="self-start rounded-lg px-2 py-1 text-sm font-bold text-[#1A3A6B] transition hover:bg-blue-50 hover:text-[#2563eb] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]" onClick={() => setModalIndicador('todosEstudos')}>
                  Ver todos
                </button>
              </div>
              <TabelaProgressiva
                itens={dados.detalhesEstudos || []}
                colunas={colunasEstudos}
                vazio="Nenhum estudo em andamento neste escopo."
                maximo={5}
              />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card" altura="min-h-72">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-[#1A3A6B]">Igrejas e atividade missionária</h2>
                <p className="mt-1 text-sm text-gray-400">Quantidade de duplas, estudos, classes e batismos por igreja do escopo.</p>
              </div>
              <TabelaProgressiva
                itens={dados.duplasPorIgreja || []}
                colunas={colunasIgrejas}
                vazio="Nenhuma igreja encontrada neste escopo."
              />
            </SecaoProgressiva>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SecaoProgressiva forcar={renderizarTudo} className="card" data-report-chart data-report-title="Colunas por indicador">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Colunas por indicador</h2>
              <p className="mt-1 text-sm text-gray-400">Comparação direta dos totais no escopo selecionado.</p>
              <EChart option={colunaOption} className="h-80" />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card" data-report-chart data-report-title="Distribuição por área">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Distribuição por área</h2>
              <p className="mt-1 text-sm text-gray-400">Peso proporcional de cada indicador no relatório.</p>
              <EChart option={pizzaOption} className="h-80" />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card xl:col-span-2" data-report-chart data-report-title="Linha comparativa">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Linha comparativa</h2>
              <p className="mt-1 text-sm text-gray-400">Leitura sequencial entre frentes missionárias e liderança.</p>
              <EChart option={linhaOption} className="h-80" />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card" data-report-chart data-report-title="Cobertura das duplas">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Cobertura das duplas</h2>
              <p className="mt-1 text-sm text-gray-400">Duplas com e sem estudo, ponto, classe e visitação.</p>
              <EChart option={coberturaOption} className="h-80" />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card" data-report-chart data-report-title="Volume de estudos e visitação">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Volume de estudos e visitação</h2>
              <p className="mt-1 text-sm text-gray-400">Fichas completas e registros resumidos, separados por tipo.</p>
              <EChart option={volumeEstudosOption} className="h-80" />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card" data-report-chart data-report-title="Classificação das duplas">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Classificação das duplas</h2>
              <p className="mt-1 text-sm text-gray-400">Distribuição das duplas por Classe A, B, C e sem classificação.</p>
              <EChart option={classificacaoOption} className="h-80" />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card" data-report-chart data-report-title="Status das duplas">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Status das duplas</h2>
              <p className="mt-1 text-sm text-gray-400">Ativas, pendentes e inativas dentro da seleção.</p>
              <EChart option={statusOption} className="h-80" />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card" data-report-chart data-report-title="Duplas com mais estudos">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Duplas com mais estudos</h2>
              <p className="mt-1 text-sm text-gray-400">Ranking das duplas com maior volume de estudos cadastrados.</p>
              <EChart option={rankingEstudosOption} className="h-96" />
            </SecaoProgressiva>

            <SecaoProgressiva forcar={renderizarTudo} className="card" data-report-chart data-report-title="Duplas com mais visitações">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Duplas com mais visitações</h2>
              <p className="mt-1 text-sm text-gray-400">Ranking das duplas mais acompanhadas na seleção.</p>
              <EChart option={rankingVisitasOption} className="h-96" />
            </SecaoProgressiva>
          </div>
        </div>
      )}

      {configuracaoModal && (
        <ModalDetalhes
          key={modalIndicador}
          titulo={configuracaoModal.titulo}
          subtitulo={configuracaoModal.subtitulo}
          itens={configuracaoModal.itens}
          colunas={configuracaoModal.colunas}
          vazio={configuracaoModal.vazio}
          aoFechar={() => setModalIndicador(null)}
        />
      )}
    </div>
  );
}
