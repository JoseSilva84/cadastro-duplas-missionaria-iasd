import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import * as echarts from 'echarts';
import api from '../lib/api';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';

const tipoLabel = {
  UNICO: 'Estudantes Biblicos',
  PONTO: 'Pontos de Estudo',
  CLASSE: 'Classes Biblicas',
};

const tipoCor = {
  UNICO: '#1A3A6B',
  PONTO: '#0d9488',
  CLASSE: '#7B2D8B',
};

const classeLabel = {
  A: 'A - Pronto para batismo',
  B: 'B - Com impedimento',
  C: 'C - Nao pronto',
  SEM: 'Sem classificacao',
};

const classeCor = {
  A: '#047857',
  B: '#C9963A',
  C: '#b91c1c',
  SEM: '#94a3b8',
};

const progresso = (estudo) => {
  const total = SERIES_ESTUDO.find((serie) => serie.id === estudo.serie)?.licoes.length || 0;
  if (!total) return 0;
  return Math.min(100, Math.round((Number(estudo.licaoAtual || 0) / total) * 100));
};

const mesAno = (valor) => {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Sem data';
  return `${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
};

function Chart({ option, className = 'h-80' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;
    const chart = echarts.init(ref.current, null, { renderer: 'canvas' });
    chart.setOption(option);
    const resize = () => chart.resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      chart.dispose();
    };
  }, [option]);

  return <div ref={ref} className={`w-full ${className}`} />;
}

const agruparSoma = (itens, chaveFn) => itens.reduce((acc, item) => {
  const chave = chaveFn(item) || 'Nao informado';
  acc[chave] = (acc[chave] || 0) + 1;
  return acc;
}, {});

export default function RelatorioEstudosGeral() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const [dados, setDados] = useState({ estudos: [] });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/relatorios/estudos-biblicos')
      .then((res) => setDados(res.data || { estudos: [] }))
      .finally(() => setCarregando(false));
  }, []);

  const resumo = useMemo(() => {
    const estudos = dados.estudos || [];
    const estudantes = estudos.flatMap((estudo) => {
      if (['PONTO', 'CLASSE'].includes(estudo.tipoEstudo)) {
        return (estudo.participantes || []).map((participante) => ({
          id: `${estudo.id}-${participante.id}`,
          nome: participante.nome,
          tipoEstudo: estudo.tipoEstudo,
          classificacao: participante.classificacaoInteressado || 'SEM',
          igreja: estudo.dupla?.igreja?.nome || 'Sem igreja',
          distrito: estudo.dupla?.distrito?.nome || 'Sem distrito',
          serie: estudo.serie || 'Nao informado',
          progresso: progresso(estudo),
          criadoEm: estudo.criadoEm,
        }));
      }

      return [{
        id: estudo.id,
        nome: estudo.nomeEstudante,
        tipoEstudo: 'UNICO',
        classificacao: estudo.classificacaoInteressado || 'SEM',
        igreja: estudo.dupla?.igreja?.nome || 'Sem igreja',
        distrito: estudo.dupla?.distrito?.nome || 'Sem distrito',
        serie: estudo.serie || 'Nao informado',
        progresso: progresso(estudo),
        criadoEm: estudo.criadoEm,
        vaIgreja: estudo.vaIgreja,
        leBiblia: estudo.leBiblia,
        estudaLicao: estudo.estudaLicao,
        devolveDizimos: estudo.devolveDizimos,
        cultoFamiliar: estudo.cultoFamiliar,
      }];
    });

    const porTipo = agruparSoma(estudantes, (item) => item.tipoEstudo);
    const porClasse = agruparSoma(estudantes, (item) => item.classificacao);
    const porIgreja = Object.entries(agruparSoma(estudantes, (item) => item.igreja))
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
    const porSerie = Object.entries(agruparSoma(estudantes, (item) => getSerieNome(item.serie)))
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
    const porMes = Object.entries(agruparSoma(estudos, (item) => mesAno(item.criadoEm)))
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => {
        const [ma, aa] = a.nome.split('/').map(Number);
        const [mb, ab] = b.nome.split('/').map(Number);
        return (aa || 0) - (ab || 0) || (ma || 0) - (mb || 0);
      });
    const mediaProgresso = estudantes.length
      ? Math.round(estudantes.reduce((acc, item) => acc + item.progresso, 0) / estudantes.length)
      : 0;
    const estudosIndividuais = estudos.filter((item) => item.tipoEstudo === 'UNICO');
    const sim = (campo) => estudosIndividuais.filter((item) => item[campo] === true).length;
    const baseEspiritual = Math.max(1, estudosIndividuais.length);

    return {
      estudos,
      estudantes,
      porTipo,
      porClasse,
      porIgreja,
      porSerie,
      porMes,
      totalRegistros: estudos.length,
      totalEstudantes: estudantes.length,
      mediaProgresso,
      concluidos: estudantes.filter((item) => item.progresso >= 100).length,
      espiritual: [
        Math.round((sim('vaIgreja') / baseEspiritual) * 100),
        Math.round((sim('leBiblia') / baseEspiritual) * 100),
        Math.round((sim('estudaLicao') / baseEspiritual) * 100),
        Math.round((sim('devolveDizimos') / baseEspiritual) * 100),
        Math.round((sim('cultoFamiliar') / baseEspiritual) * 100),
      ],
    };
  }, [dados]);

  const chartBase = {
    textStyle: { fontFamily: 'Inter, Arial, sans-serif', color: '#334155' },
    tooltip: { trigger: 'item', backgroundColor: '#0f172a', borderWidth: 0, textStyle: { color: '#fff' } },
  };

  const tipoOption = {
    ...chartBase,
    color: [tipoCor.UNICO, tipoCor.PONTO, tipoCor.CLASSE],
    legend: { bottom: 0, icon: 'circle' },
    series: [{
      name: 'Meio de estudo',
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['50%', '43%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 3 },
      label: { formatter: '{b}\n{c}', fontWeight: 700 },
      data: ['UNICO', 'PONTO', 'CLASSE'].map((tipo) => ({
        name: tipoLabel[tipo],
        value: resumo.porTipo[tipo] || 0,
      })),
    }],
  };

  const classeOption = {
    ...chartBase,
    color: [classeCor.A, classeCor.B, classeCor.C, classeCor.SEM],
    grid: { left: 42, right: 18, top: 30, bottom: 38 },
    xAxis: { type: 'category', data: ['A', 'B', 'C', 'Sem'], axisTick: { show: false } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [{
      type: 'bar',
      barWidth: 38,
      itemStyle: { borderRadius: [8, 8, 0, 0] },
      label: { show: true, position: 'top', fontWeight: 700 },
      data: ['A', 'B', 'C', 'SEM'].map((classe) => ({
        value: resumo.porClasse[classe] || 0,
        itemStyle: { color: classeCor[classe] },
      })),
    }],
  };

  const igrejaOption = {
    ...chartBase,
    color: ['#1A3A6B'],
    grid: { left: 130, right: 24, top: 20, bottom: 30 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f7' } } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: resumo.porIgreja.slice(0, 8).map((item) => item.nome),
      axisLabel: { width: 110, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barWidth: 16,
      itemStyle: { borderRadius: [0, 8, 8, 0], color: '#1A3A6B' },
      label: { show: true, position: 'right', fontWeight: 700 },
      data: resumo.porIgreja.slice(0, 8).map((item) => item.total),
    }],
  };

  const serieOption = {
    ...chartBase,
    color: ['#C9963A'],
    grid: { left: 44, right: 20, top: 30, bottom: 80 },
    xAxis: {
      type: 'category',
      data: resumo.porSerie.slice(0, 8).map((item) => item.nome),
      axisLabel: { rotate: 35, width: 90, overflow: 'truncate' },
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [{
      type: 'bar',
      barWidth: 28,
      itemStyle: { borderRadius: [8, 8, 0, 0], color: '#C9963A' },
      data: resumo.porSerie.slice(0, 8).map((item) => item.total),
    }],
  };

  const evolucaoOption = {
    ...chartBase,
    color: ['#0d9488'],
    tooltip: { trigger: 'axis' },
    grid: { left: 44, right: 24, top: 28, bottom: 42 },
    xAxis: { type: 'category', boundaryGap: false, data: resumo.porMes.map((item) => item.nome) },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f7' } } },
    series: [{
      name: 'Registros',
      type: 'line',
      smooth: true,
      symbolSize: 8,
      areaStyle: { color: 'rgba(13,148,136,0.14)' },
      lineStyle: { width: 4 },
      data: resumo.porMes.map((item) => item.total),
    }],
  };

  const espiritualOption = {
    ...chartBase,
    tooltip: { trigger: 'item' },
    radar: {
      radius: '68%',
      indicator: [
        { name: 'Igreja', max: 100 },
        { name: 'Biblia', max: 100 },
        { name: 'Licao', max: 100 },
        { name: 'Dizimos', max: 100 },
        { name: 'Culto', max: 100 },
      ],
      splitArea: { areaStyle: { color: ['#f8fafc', '#eef2f7'] } },
      axisName: { color: '#475569', fontWeight: 700 },
    },
    series: [{
      type: 'radar',
      data: [{
        value: resumo.espiritual,
        name: 'Acompanhamento espiritual',
        areaStyle: { color: 'rgba(26,58,107,0.18)' },
        lineStyle: { color: '#1A3A6B', width: 3 },
        itemStyle: { color: '#1A3A6B' },
      }],
    }],
  };

  const caminho = (rota) => `${isDireto ? '/direto' : ''}${rota}`;

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Relatorio</p>
        </div>
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Estudos no Geral
            </h1>
            <p className="text-gray-400 text-sm mt-1">Visao consolidada de estudantes biblicos, pontos de estudo e classes biblicas.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-outline px-4 py-2" onClick={() => navigate(caminho('/relatorios/ranking-decisoes'))}>Ranking Decisões</button>
            <button type="button" className="btn-outline px-4 py-2" onClick={() => navigate(caminho('/relatorios/estudos-biblicos'))}>Estudantes</button>
            <button type="button" className="btn-outline px-4 py-2" onClick={() => navigate(caminho('/relatorios/pontos-estudo'))}>Pontos</button>
            <button type="button" className="btn-primary px-4 py-2" onClick={() => navigate(caminho('/relatorios/classes-biblicas'))}>Classes</button>
          </div>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ['Registros de estudo', resumo.totalRegistros, '#1A3A6B'],
            ['Pessoas envolvidas', resumo.totalEstudantes, '#0d9488'],
            ['Progresso medio', `${resumo.mediaProgresso}%`, '#C9963A'],
            ['Prontos para batismo', resumo.porClasse.A || 0, '#047857'],
          ].map(([label, valor, cor]) => (
            <div key={label} className="card">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: cor }}>{valor}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <section className="card xl:col-span-1">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Meios de estudo</h2>
            <p className="text-sm text-gray-400 mb-3">Distribuicao por origem do estudo biblico.</p>
            <Chart option={tipoOption} className="h-80" />
          </section>
          <section className="card xl:col-span-2">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Classificacao dos estudantes</h2>
            <p className="text-sm text-gray-400 mb-3">Volume de estudantes por prontidao para batismo.</p>
            <Chart option={classeOption} className="h-80" />
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Igrejas com mais estudantes</h2>
            <p className="text-sm text-gray-400 mb-3">Ranking somando estudos individuais, pontos e classes.</p>
            <Chart option={igrejaOption} className="h-96" />
          </section>
          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Series mais utilizadas</h2>
            <p className="text-sm text-gray-400 mb-3">Distribuicao dos estudos por serie biblica.</p>
            <Chart option={serieOption} className="h-96" />
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Evolucao de cadastros</h2>
            <p className="text-sm text-gray-400 mb-3">Registros criados ao longo dos meses.</p>
            <Chart option={evolucaoOption} className="h-80" />
          </section>
          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Acompanhamento espiritual</h2>
            <p className="text-sm text-gray-400 mb-3">Percentual de respostas positivas nos estudos individuais.</p>
            <Chart option={espiritualOption} className="h-80" />
          </section>
        </div>

        <section className="card overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#1A3A6B]">Ultimos estudos cadastrados</h2>
              <p className="text-sm text-gray-400">Amostra consolidada dos meios de estudo biblico.</p>
            </div>
            <button type="button" className="btn-outline px-4 py-2" onClick={() => navigate(caminho('/relatorios/estudos-cadastrados'))}>
              Ver todos
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-[#F4F5F7] text-gray-500">
                  <th className="px-4 py-3 text-left">Registro</th>
                  <th className="px-4 py-3 text-left">Meio</th>
                  <th className="px-4 py-3 text-left">Pessoas</th>
                  <th className="px-4 py-3 text-left">Igreja</th>
                  <th className="px-4 py-3 text-left">Serie</th>
                  <th className="px-4 py-3 text-left">Progresso</th>
                </tr>
              </thead>
              <tbody>
                {resumo.estudos.slice(0, 10).map((estudo) => (
                  <tr key={estudo.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-[#1A3A6B]">{estudo.nomeEstudante}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: tipoCor[estudo.tipoEstudo] || '#64748b' }}>
                        {tipoLabel[estudo.tipoEstudo] || estudo.tipoEstudo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) ? (estudo.participantes?.length || 0) : 1}</td>
                    <td className="px-4 py-3 text-gray-600">{estudo.dupla?.igreja?.nome || 'Sem igreja'}</td>
                    <td className="px-4 py-3 text-gray-600">{getSerieNome(estudo.serie)}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-[#C9963A]" style={{ width: `${progresso(estudo)}%` }} />
                      </div>
                      <span className="text-xs">{progresso(estudo)}%</span>
                    </td>
                  </tr>
                ))}
                {resumo.estudos.length === 0 && (
                  <tr><td className="px-4 py-8 text-center text-gray-400" colSpan="6">Nenhum estudo encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
