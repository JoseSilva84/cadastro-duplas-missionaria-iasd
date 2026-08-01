import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import EChart from '../components/EChart';
import BackButton from '../components/BackButton';

const cards = [
  ['novaDupla', 'Nova Dupla'],
  ['estudosBiblicos', 'Estudos Bíblicos'],
  ['pontosEstudo', 'Ponto de Estudo'],
  ['classesBiblicas', 'Classe Bíblica'],
  ['diretorMinisterioPessoal', 'Diretor Minist. Pessoal'],
  ['diretoresMissionarios', 'Diretor Missionário'],
  ['batismos', 'Batismos'],
  ['pessoasAlcancadas', 'Pessoas Alcançadas'],
];

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const escapeHtml = (valor = '') => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const corIndicador = {
  novaDupla: '#1A3A6B',
  estudosBiblicos: '#0284c7',
  pontosEstudo: '#0d9488',
  classesBiblicas: '#7B2D8B',
  diretorMinisterioPessoal: '#C9963A',
  diretoresMissionarios: '#2563eb',
  batismos: '#14b8a6',
  pessoasAlcancadas: '#ea580c',
};

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

const abrirPdfPersonalizado = ({ dados, nivel, escopoNome, imagensGraficos = [] }) => {
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
  const totalAtividades = metricas.reduce((acc, item) => acc + item.valor, 0);
  const cobertura = dados?.cobertura || {};
  const classificacoes = dados?.classificacoesDuplas || {};
  const linhasCobertura = [
    ['Duplas com estudo bíblico', cobertura.estudoBiblico?.com || 0],
    ['Duplas sem estudo bíblico', cobertura.estudoBiblico?.sem || 0],
    ['Estudos bíblicos cadastrados', cobertura.estudoBiblico?.totalEstudos || 0],
    ['Duplas com visitação', cobertura.visitacao?.com || 0],
    ['Duplas sem visitação', cobertura.visitacao?.sem || 0],
    ['Visitações registradas', cobertura.visitacao?.totalVisitas || 0],
    ['Classe A', classificacoes.A || 0],
    ['Classe B', classificacoes.B || 0],
    ['Classe C', classificacoes.C || 0],
    ['Sem classificação', classificacoes.semClassificacao || 0],
  ].map(([label, valor]) => `<tr><td>${escapeHtml(label)}</td><td><strong>${numero(valor)}</strong></td></tr>`).join('');
  const blocosGraficos = imagensGraficos.map((grafico) => `
    <div class="grafico">
      <h2>${escapeHtml(grafico.titulo)}</h2>
      <img src="${grafico.imagem}" alt="${escapeHtml(grafico.titulo)}" />
    </div>
  `).join('');
  const janela = window.open('', '_blank');
  if (!janela) return false;

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
          .rodape { color: #6b7280; font-size: 11px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <h1>Relatório Personalizado</h1>
        <p class="sub">Análise consolidada por ${escapeHtml(nivel)}: <strong>${escapeHtml(escopoNome)}</strong></p>
        <div class="meta">
          Total consolidado dos indicadores exibidos: <strong>${numero(totalAtividades)}</strong><br>
          Gerado em ${new Date().toLocaleString('pt-BR')}
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
    metricas.filter((item) => ['novaDupla', 'estudosBiblicos', 'pontosEstudo', 'classesBiblicas'].includes(item.key))
  ), [metricas]);

  const grupoImpacto = useMemo(() => (
    metricas.filter((item) => ['diretorMinisterioPessoal', 'diretoresMissionarios', 'batismos', 'pessoasAlcancadas'].includes(item.key))
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
      data: ['Duplas', 'Estudos', 'Pontos', 'Classes', 'Batismos', 'Pessoas'],
      axisLabel: { color: '#64748b' },
    },
    yAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [
      {
        name: 'Frentes missionárias',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: [
          dados?.novaDupla || 0,
          dados?.estudosBiblicos || 0,
          dados?.pontosEstudo || 0,
          dados?.classesBiblicas || 0,
          dados?.batismos || 0,
          dados?.pessoasAlcancadas || 0,
        ],
      },
      {
        name: 'Liderança',
        type: 'line',
        smooth: true,
        symbolSize: 8,
        data: [
          0,
          dados?.diretorMinisterioPessoal || 0,
          0,
          dados?.diretoresMissionarios || 0,
          0,
          0,
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
      xAxis: { type: 'category', data: ['Estudos bíblicos', 'Pontos', 'Classes', 'Estudo sem cadastro'], axisLabel: { color: '#64748b', interval: 0 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#eef2f7' } } },
      series: [{
        type: 'bar',
        barWidth: 30,
        data: [
          { value: cobertura.estudoBiblico?.totalEstudos || 0, itemStyle: { color: '#0284c7', borderRadius: [6, 6, 0, 0] } },
          { value: cobertura.pontoEstudo?.totalPontos || 0, itemStyle: { color: '#0d9488', borderRadius: [6, 6, 0, 0] } },
          { value: cobertura.classeBiblica?.totalClasses || 0, itemStyle: { color: '#7B2D8B', borderRadius: [6, 6, 0, 0] } },
          { value: dados?.duplasComEstudoSemCadastro || 0, itemStyle: { color: '#C9963A', borderRadius: [6, 6, 0, 0] } },
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
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar relatório personalizado.');
    } finally {
      setCarregando(false);
    }
  };

  const gerarPdf = () => {
    if (!dados) return;
    const ok = abrirPdfPersonalizado({
      dados,
      nivel: nivel === 'regiao' ? 'Região' : nivel === 'distrito' ? 'Distrito' : 'Igreja',
      escopoNome: escopoSelecionado?.nome || 'Escopo selecionado',
      imagensGraficos: coletarImagensGraficos(),
    });
    if (!ok) setErro('Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups.');
  };

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

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {metricas.map(({ key, label, valor, cor }) => (
              <div
                key={key}
                className="smart-tooltip card p-4"
                data-tooltip={`${label}: total consolidado para o escopo selecionado nos filtros do relatório personalizado.`}
                tabIndex={0}
              >
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                <p className="mt-2 text-3xl font-bold" style={{ color: cor }}>{numero(valor)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="card" data-report-chart data-report-title="Colunas por indicador">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Colunas por indicador</h2>
              <p className="mt-1 text-sm text-gray-400">Comparação direta dos totais no escopo selecionado.</p>
              <EChart option={colunaOption} className="h-80" />
            </section>

            <section className="card" data-report-chart data-report-title="Distribuição por área">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Distribuição por área</h2>
              <p className="mt-1 text-sm text-gray-400">Peso proporcional de cada indicador no relatório.</p>
              <EChart option={pizzaOption} className="h-80" />
            </section>

            <section className="card xl:col-span-2" data-report-chart data-report-title="Linha comparativa">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Linha comparativa</h2>
              <p className="mt-1 text-sm text-gray-400">Leitura sequencial entre frentes missionárias e liderança.</p>
              <EChart option={linhaOption} className="h-80" />
            </section>

            <section className="card" data-report-chart data-report-title="Cobertura das duplas">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Cobertura das duplas</h2>
              <p className="mt-1 text-sm text-gray-400">Duplas com e sem estudo, ponto, classe e visitação.</p>
              <EChart option={coberturaOption} className="h-80" />
            </section>

            <section className="card" data-report-chart data-report-title="Volume de estudos e visitação">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Volume de estudos e visitação</h2>
              <p className="mt-1 text-sm text-gray-400">Quantidade de estudos cadastrados e estudos informados sem cadastro.</p>
              <EChart option={volumeEstudosOption} className="h-80" />
            </section>

            <section className="card" data-report-chart data-report-title="Classificação das duplas">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Classificação das duplas</h2>
              <p className="mt-1 text-sm text-gray-400">Distribuição das duplas por Classe A, B, C e sem classificação.</p>
              <EChart option={classificacaoOption} className="h-80" />
            </section>

            <section className="card" data-report-chart data-report-title="Status das duplas">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Status das duplas</h2>
              <p className="mt-1 text-sm text-gray-400">Ativas, pendentes e inativas dentro da seleção.</p>
              <EChart option={statusOption} className="h-80" />
            </section>

            <section className="card" data-report-chart data-report-title="Duplas com mais estudos">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Duplas com mais estudos</h2>
              <p className="mt-1 text-sm text-gray-400">Ranking das duplas com maior volume de estudos cadastrados.</p>
              <EChart option={rankingEstudosOption} className="h-96" />
            </section>

            <section className="card" data-report-chart data-report-title="Duplas com mais visitações">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Duplas com mais visitações</h2>
              <p className="mt-1 text-sm text-gray-400">Ranking das duplas mais acompanhadas na seleção.</p>
              <EChart option={rankingVisitasOption} className="h-96" />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
