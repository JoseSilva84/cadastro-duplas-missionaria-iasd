import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';
import EChart from '../components/EChart';

const faixaIgrejaConfig = {
  A: { titulo: 'Classe A', regra: '150 ou mais estudantes', cor: '#047857', bg: '#d1fae5' },
  B: { titulo: 'Classe B', regra: '67 a 149 estudantes', cor: '#b45309', bg: '#fef3c7' },
  C: { titulo: 'Classe C', regra: '28 a 66 estudantes', cor: '#1A3A6B', bg: '#dbeafe' },
  SEM: { titulo: 'Em formação', regra: 'Até 27 estudantes', cor: '#64748b', bg: '#f1f5f9' },
};

const classeAlunoConfig = {
  A: { label: 'A - Pronto para o batismo', cor: '#047857', bg: '#d1fae5' },
  B: { label: 'B - Quer, mas tem impedimento', cor: '#b45309', bg: '#fef3c7' },
  C: { label: 'C - Nao esta pronto', cor: '#b91c1c', bg: '#fee2e2' },
};

const classificarIgreja = (total) => {
  if (total >= 150) return 'A';
  if (total >= 67) return 'B';
  if (total >= 28) return 'C';
  return 'SEM';
};

const escapeHtml = (valor = '') => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const abrirPdfBatismo = (classe, estudante) => {
  const tituloDocumento = 'Relatorio para Comissao da Igreja: Aprovacao de Batismo';
  const dupla = `${classe.dupla?.liderNome || ''} + ${classe.dupla?.membro2Nome || ''}`;
  const classificacao = classeAlunoConfig[estudante.classificacaoInteressado]?.label || 'Sem classificacao';
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
          p { color: #6b7280; margin: 0 0 18px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          td { border: 1px solid #e5e7eb; padding: 10px; vertical-align: top; }
          .box { border-left: 4px solid #C9963A; background: #f8fafc; padding: 14px 16px; margin: 18px 0; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(tituloDocumento)}</h1>
        <p>Resumo automatico para recomendacao de batismo do estudante em Classe Biblica.</p>
        <div class="box">
          <strong>Candidato:</strong> ${escapeHtml(estudante.nome || 'Nao informado')}<br/>
          <strong>Classificacao:</strong> ${escapeHtml(classificacao)}<br/>
          <strong>Classe Biblica:</strong> ${escapeHtml(classe.nomeEstudante || 'Nao informada')}<br/>
          <strong>Igreja:</strong> ${escapeHtml(classe.dupla?.igreja?.nome || 'Nao informada')}<br/>
          <strong>Dupla responsavel:</strong> ${escapeHtml(dupla)}<br/>
          <strong>Serie e licao:</strong> ${escapeHtml(getSerieNome(classe.serie))} - ${escapeHtml(getLicaoLabel(classe.serie, classe.licaoAtual))}
        </div>
        <table>
          <tbody>
            <tr><td><strong>WhatsApp</strong></td><td>${escapeHtml(estudante.whatsapp || 'Nao informado')}</td></tr>
            <tr><td><strong>Endereco</strong></td><td>${escapeHtml(estudante.endereco || 'Nao informado')}</td></tr>
            <tr><td><strong>Motivo de impedimento</strong></td><td>${escapeHtml(estudante.motivoImpedimento || 'Nao informado')}</td></tr>
            <tr><td><strong>Observacoes da classe</strong></td><td>${escapeHtml(classe.observacoes || 'Sem observacoes registradas.')}</td></tr>
          </tbody>
        </table>
      </body>
    </html>
  `);
  janela.document.close();
  janela.focus();
  janela.print();
};

const BadgeClassificacao = ({ classe }) => {
  const cfg = classeAlunoConfig[classe];
  if (!cfg) return <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-500">Sem classificacao</span>;
  return (
    <span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.cor }}>
      {classe}
    </span>
  );
};

export default function RelatorioClassesBiblicas() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const [classesBiblicas, setClassesBiblicas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/relatorios/estudos-biblicos', { params: { tipoEstudo: 'CLASSE' } })
      .then((res) => setClassesBiblicas(res.data.estudos || []))
      .finally(() => setCarregando(false));
  }, []);

  const resumo = useMemo(() => {
    const igrejasMap = {};
    const classificacoes = { A: 0, B: 0, C: 0, SEM: 0 };
    let totalEstudantes = 0;

    classesBiblicas.forEach((classe) => {
      const igreja = classe.dupla?.igreja;
      const igrejaId = igreja?.id || `sem-${classe.id}`;
      const igrejaNome = igreja?.nome || 'Sem igreja vinculada';
      const participantes = classe.participantes || [];
      totalEstudantes += participantes.length;

      if (!igrejasMap[igrejaId]) {
        igrejasMap[igrejaId] = {
          id: igreja?.id || null,
          nome: igrejaNome,
          distrito: classe.dupla?.distrito?.nome || 'Sem distrito',
          regiao: classe.dupla?.distrito?.regiao?.nome || 'Sem regiao',
          total: 0,
          classes: [],
        };
      }

      igrejasMap[igrejaId].total += participantes.length;
      igrejasMap[igrejaId].classes.push(classe);
      participantes.forEach((estudante) => {
        classificacoes[estudante.classificacaoInteressado || 'SEM'] += 1;
      });
    });

    const igrejas = Object.values(igrejasMap)
      .map((igreja) => ({ ...igreja, faixa: classificarIgreja(igreja.total) }))
      .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));

    const porFaixa = { A: [], B: [], C: [], SEM: [] };
    igrejas.forEach((igreja) => porFaixa[igreja.faixa].push(igreja));

    return {
      totalClasses: classesBiblicas.length,
      totalEstudantes,
      totalIgrejas: igrejas.length,
      classificacoes,
      igrejas,
      porFaixa,
      maiorIgreja: igrejas[0] || null,
    };
  }, [classesBiblicas]);

  const maxClassificacao = Math.max(1, resumo.classificacoes.A, resumo.classificacoes.B, resumo.classificacoes.C);
  const maxIgreja = Math.max(1, ...resumo.igrejas.map((igreja) => igreja.total));
  const totalClassificados = resumo.classificacoes.A + resumo.classificacoes.B + resumo.classificacoes.C;
  const pctA = totalClassificados ? Math.round((resumo.classificacoes.A / totalClassificados) * 100) : 0;
  const pctB = totalClassificados ? Math.round((resumo.classificacoes.B / totalClassificados) * 100) : 0;
  const pctC = Math.max(0, 100 - pctA - pctB);
  const registrosPath = `${isDireto ? '/direto' : ''}/relatorios/classes-biblicas/registros`;
  const topClasses = [...classesBiblicas]
    .map((classe) => ({ nome: classe.nomeEstudante || `Classe ${classe.id}`, total: classe.participantes?.length || 0 }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
    .slice(0, 8);
  const chartBase = {
    textStyle: { fontFamily: 'Inter, Arial, sans-serif', color: '#334155' },
    tooltip: { trigger: 'item', backgroundColor: '#0f172a', borderWidth: 0, textStyle: { color: '#fff' } },
  };
  const classificacaoOption = {
    ...chartBase,
    color: ['#047857', '#C9963A', '#b91c1c', '#94a3b8'],
    legend: { bottom: 0, icon: 'circle' },
    series: [{
      name: 'Classificacao',
      type: 'pie',
      radius: ['48%', '72%'],
      center: ['50%', '43%'],
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 3 },
      label: { formatter: '{b}\n{c}', fontWeight: 700 },
      data: [
        { name: 'Classe A', value: resumo.classificacoes.A },
        { name: 'Classe B', value: resumo.classificacoes.B },
        { name: 'Classe C', value: resumo.classificacoes.C },
        { name: 'Sem classificacao', value: resumo.classificacoes.SEM },
      ],
    }],
  };
  const faixaOption = {
    ...chartBase,
    color: ['#047857', '#b45309', '#1A3A6B', '#64748b'],
    legend: { bottom: 0, icon: 'circle' },
    series: [{
      name: 'Faixas de igreja',
      type: 'pie',
      radius: '68%',
      center: ['50%', '43%'],
      roseType: 'radius',
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 3 },
      data: ['A', 'B', 'C', 'SEM'].map((faixa) => ({
        name: faixaIgrejaConfig[faixa].titulo,
        value: resumo.porFaixa[faixa].reduce((acc, igreja) => acc + igreja.total, 0),
      })),
    }],
  };
  const igrejaOption = {
    ...chartBase,
    color: ['#1A3A6B'],
    grid: { left: 132, right: 24, top: 20, bottom: 30 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f7' } } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: resumo.igrejas.slice(0, 8).map((item) => item.nome),
      axisLabel: { width: 112, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barWidth: 16,
      itemStyle: { borderRadius: [0, 8, 8, 0], color: '#1A3A6B' },
      label: { show: true, position: 'right', fontWeight: 700 },
      data: resumo.igrejas.slice(0, 8).map((item) => item.total),
    }],
  };
  const classesOption = {
    ...chartBase,
    color: ['#C9963A'],
    grid: { left: 132, right: 24, top: 20, bottom: 30 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#eef2f7' } } },
    yAxis: {
      type: 'category',
      inverse: true,
      data: topClasses.map((item) => item.nome),
      axisLabel: { width: 112, overflow: 'truncate' },
    },
    series: [{
      type: 'bar',
      barWidth: 16,
      itemStyle: { borderRadius: [0, 8, 8, 0], color: '#C9963A' },
      label: { show: true, position: 'right', fontWeight: 700 },
      data: topClasses.map((item) => item.total),
    }],
  };

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
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Classes Biblicas
            </h1>
            <p className="text-gray-400 text-sm mt-1">Igrejas agrupadas pelo total de estudantes em Classe Biblica, com estudantes e classificacoes.</p>
          </div>
          <button type="button" className="btn-primary px-4 py-2" onClick={() => navigate(registrosPath)}>
            Ver registros completos
          </button>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            ['Classes biblicas', resumo.totalClasses, '#1A3A6B'],
            ['Estudantes em classes', resumo.totalEstudantes, '#047857'],
            ['Igrejas com classes', resumo.totalIgrejas, '#C9963A'],
            ['Prontos para batismo', resumo.classificacoes.A, '#059669'],
          ].map(([label, valor, cor]) => (
            <div key={label} className="card">
              <p className="text-xs text-gray-400">{label}</p>
              <p className="text-3xl font-bold mt-1" style={{ color: cor }}>{valor}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Distribuicao A/B/C</h2>
            <p className="text-sm text-gray-400 mb-3">Classificacao individual dos estudantes em classes biblicas.</p>
            <EChart option={classificacaoOption} className="h-80" />
          </section>
          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Faixas das igrejas</h2>
            <p className="text-sm text-gray-400 mb-3">Total de estudantes por faixa de classificacao da igreja.</p>
            <EChart option={faixaOption} className="h-80" />
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Ranking por igreja</h2>
            <p className="text-sm text-gray-400 mb-3">Igrejas com maior volume de estudantes em classe biblica.</p>
            <EChart option={igrejaOption} className="h-96" />
          </section>
          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Maiores classes biblicas</h2>
            <p className="text-sm text-gray-400 mb-3">Classes com mais estudantes cadastrados.</p>
            <EChart option={classesOption} className="h-96" />
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="card xl:col-span-2">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#1A3A6B]">Classificação dos estudantes</h2>
                <p className="text-sm text-gray-400">Distribuicao A/B/C entre todos os alunos das classes biblicas.</p>
              </div>
              <div
                className="h-24 w-24 rounded-full border-[10px] border-white shadow-inner"
                style={{ background: `conic-gradient(#047857 0 ${pctA}%, #C9963A ${pctA}% ${pctA + pctB}%, #b91c1c ${pctA + pctB}% ${pctA + pctB + pctC}%, #e5e7eb ${pctA + pctB + pctC}% 100%)` }}
              />
            </div>
            <div className="space-y-3">
              {['A', 'B', 'C'].map((classe) => {
                const cfg = classeAlunoConfig[classe];
                const valor = resumo.classificacoes[classe];
                return (
                  <div key={classe}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold" style={{ color: cfg.cor }}>{cfg.label}</span>
                      <strong>{valor}</strong>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(valor / maxClassificacao) * 100}%`, backgroundColor: cfg.cor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Igrejas por estudantes</h2>
            <p className="text-sm text-gray-400 mb-4">Ranking das igrejas com classes biblicas cadastradas.</p>
            <div className="space-y-3">
              {resumo.igrejas.slice(0, 7).map((igreja) => {
                const cfg = faixaIgrejaConfig[igreja.faixa];
                return (
                  <div key={igreja.id || igreja.nome}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="font-semibold text-[#1A3A6B] truncate">{igreja.nome}</span>
                      <span style={{ color: cfg.cor }}>{igreja.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(igreja.total / maxIgreja) * 100}%`, backgroundColor: cfg.cor }} />
                    </div>
                  </div>
                );
              })}
              {resumo.igrejas.length === 0 && <p className="text-sm text-gray-400">Nenhuma classe biblica cadastrada.</p>}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {['A', 'B', 'C', 'SEM'].map((faixa) => {
            const cfg = faixaIgrejaConfig[faixa];
            const igrejas = resumo.porFaixa[faixa] || [];
            const total = igrejas.reduce((acc, igreja) => acc + igreja.total, 0);
            return (
              <section key={faixa} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-4 border-t-4 border-b border-gray-100" style={{ borderTopColor: cfg.cor }}>
                  <div className="flex justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{cfg.titulo}</h2>
                      <p className="text-xs text-gray-400">{cfg.regra}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color: cfg.cor }}>{total}</p>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">estudantes</p>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {igrejas.length === 0 ? (
                    <p className="p-4 text-sm text-gray-400">Nenhuma igreja nesta faixa.</p>
                  ) : igrejas.map((igreja) => (
                    <div key={igreja.id || igreja.nome} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1A3A6B] truncate">{igreja.nome}</p>
                          <p className="text-xs text-gray-400">{igreja.distrito}</p>
                        </div>
                        <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ color: cfg.cor, backgroundColor: cfg.bg }}>{igreja.total}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2">{igreja.classes.length} classe(s) biblica(s)</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-[#1A3A6B]">Classes e estudantes</h2>
            <p className="text-sm text-gray-400">Todos os registros de classe biblica, seus alunos, classificacoes e acoes de batismo.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {classesBiblicas.map((classe) => (
              <article key={classe.id} className="card">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-400">Classe biblica</p>
                    <h3 className="text-lg font-bold text-[#1A3A6B]">{classe.nomeEstudante || 'Classe sem nome'}</h3>
                    <p className="text-sm text-gray-500">{classe.dupla?.igreja?.nome || 'Sem igreja'} · {classe.dupla?.distrito?.nome || 'Sem distrito'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#C9963A]">{classe.participantes?.length || 0}</p>
                    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">estudantes</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(classe.participantes || []).map((estudante) => (
                    <div key={estudante.id} className="rounded-xl border border-gray-100 bg-[#F4F5F7] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1A3A6B] truncate">{estudante.nome}</p>
                          <p className="text-xs text-gray-400 truncate">{estudante.whatsapp || estudante.endereco || 'Sem contato informado'}</p>
                        </div>
                        <BadgeClassificacao classe={estudante.classificacaoInteressado} />
                      </div>
                      {estudante.motivoImpedimento && <p className="mt-2 text-xs text-amber-700">Motivo: {estudante.motivoImpedimento}</p>}
                      {estudante.classificacaoInteressado && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-[#1A3A6B]/30 bg-white px-2 py-1 text-[11px] font-semibold text-[#1A3A6B] hover:bg-[#1A3A6B]/5"
                            onClick={() => abrirPdfBatismo(classe, estudante)}
                          >
                            Recomendar o batismo
                          </button>
                          {estudante.classificacaoInteressado === 'A' && (
                            <button
                              type="button"
                              className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                              onClick={() => abrirPdfBatismo(classe, estudante)}
                            >
                              Batismo
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {(classe.participantes || []).length === 0 && <p className="text-sm text-gray-400">Nenhum estudante vinculado a esta classe.</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
