import {
  DEPARTAMENTOS, STATUS_ACAO, chaveMes, dia, formatarDia, moeda, periodoTema,
} from './calendario';

const escapar = (valor = '') => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const origem = (acao) => {
  if (acao.igrejaNome) return `Igreja ${acao.igrejaNome}`;
  if (acao.distritoNome) return `Distrito ${acao.distritoNome}`;
  if (acao.regiaoNome) return `Região ${acao.regiaoNome}`;
  return 'Associação';
};

const nomeEscopo = (filtro, listas) => {
  if (filtro.igrejaId) return `Igreja: ${listas.igrejas.find((item) => String(item.id) === String(filtro.igrejaId))?.nome || 'selecionada'}`;
  if (filtro.distritoId) return `Distrito: ${listas.distritos.find((item) => String(item.id) === String(filtro.distritoId))?.nome || 'selecionado'}`;
  if (filtro.regiaoId) return `Região: ${listas.regioes.find((item) => String(item.id) === String(filtro.regiaoId))?.nome || 'selecionada'}`;
  return 'Toda a Associação Paulistana';
};

const linhaTema = (tema) => `
  <article class="item tema">
    <div class="tipo">TEMA OFICIAL</div>
    <div class="conteudo">
      <strong>${escapar(tema.nome)}</strong>
      <span>${escapar(periodoTema(tema))}${tema.descricao ? ` - ${escapar(tema.descricao)}` : ''}</span>
    </div>
  </article>
`;

const linhaEvento = (evento, tema) => {
  const departamento = DEPARTAMENTOS[evento.departamento] || DEPARTAMENTOS.OUTRO;
  return `
    <article class="item evento" style="--cor:${departamento.cor}">
      <div class="tipo">EVENTO</div>
      <div class="conteudo">
        <strong>${escapar(evento.nome)}</strong>
        <span>${escapar(tema.nome)} - ${escapar(departamento.label)}${evento.descricao ? ` - ${escapar(evento.descricao)}` : ''}</span>
      </div>
      <div class="valor">${evento.totalAcoes || 0} ação(ões)<br>${escapar(moeda(evento.orcamentoTotal || 0))}</div>
    </article>
  `;
};

const linhaAcao = (acao, eventoNome, temaNome) => `
  <article class="item acao">
    <div class="tipo">AÇÃO</div>
    <div class="conteudo">
      <strong>${escapar(acao.nome)}</strong>
      <span>${escapar(eventoNome || temaNome)} - ${escapar(origem(acao))}${acao.responsavel ? ` - Responsável: ${escapar(acao.responsavel)}` : ''}</span>
      ${acao.descricao ? `<span class="descricao">${escapar(acao.descricao)}</span>` : ''}
    </div>
    <div class="valor">${escapar(STATUS_ACAO[acao.status] || acao.status || 'Planejada')}<br>${escapar(moeda(acao.valor || 0))}</div>
  </article>
`;

export function imprimirCalendarioCompleto({ opcaoAno, meses, temas, filtro, listas, totalAcoes, totalValor }) {
  const itens = [];
  const semData = [];

  temas.forEach((tema) => {
    const temaItem = { data: tema.dataInicio, html: linhaTema(tema), ordem: 0 };
    (tema.dataInicio ? itens : semData).push(temaItem);

    (tema.eventos || []).forEach((evento) => {
      const eventoItem = { data: evento.data, html: linhaEvento(evento, tema), ordem: 1 };
      (evento.data ? itens : semData).push(eventoItem);

      (evento.acoes || []).forEach((acao) => {
        const acaoItem = { data: acao.data, html: linhaAcao(acao, evento.nome, tema.nome), ordem: 2 };
        (acao.data ? itens : semData).push(acaoItem);
      });
    });

    (tema.acoes || []).forEach((acao) => {
      const acaoItem = { data: acao.data, html: linhaAcao(acao, null, tema.nome), ordem: 2 };
      (acao.data ? itens : semData).push(acaoItem);
    });
  });

  const mesHtml = meses.map((mes) => {
    const doMes = itens
      .filter((item) => chaveMes(item.data) === mes.key)
      .sort((a, b) => dia(a.data).localeCompare(dia(b.data)) || a.ordem - b.ordem);
    return `
      <section class="mes">
        <header><h2>${escapar(mes.nomeCompleto)} <span>${mes.ano}</span></h2><b>${doMes.length} item(ns)</b></header>
        <div class="itens">
          ${doMes.length ? doMes.map((item) => `<div class="linha-data"><time>${escapar(formatarDia(item.data))}</time>${item.html}</div>`).join('') : '<p class="vazio">Nenhuma atividade registrada neste mês.</p>'}
        </div>
      </section>
    `;
  }).join('');

  const semDataHtml = semData.length ? `
    <section class="mes sem-data">
      <header><h2>Itens sem data definida</h2><b>${semData.length} item(ns)</b></header>
      <div class="itens">${semData.map((item) => `<div class="linha-data"><time>Sem data</time>${item.html}</div>`).join('')}</div>
    </section>
  ` : '';

  const janela = window.open('', '_blank');
  if (!janela) return false;
  janela.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Calendário Missionário - ${escapar(opcaoAno.rotulo)}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #1e293b; font: 10px Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .cabecalho { border-bottom: 3px solid #C9963A; padding: 0 0 12px; margin-bottom: 12px; }
          .cabecalho .marca { color: #C9963A; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; }
          h1 { margin: 4px 0 3px; color: #1A3A6B; font: 800 27px Georgia, serif; }
          .subtitulo { color: #64748b; font-size: 11px; }
          .resumos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0 16px; }
          .resumo { border: 1px solid #dbe3ef; border-radius: 8px; padding: 8px 10px; }
          .resumo span { display: block; color: #64748b; font-size: 8px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
          .resumo strong { display: block; margin-top: 3px; color: #1A3A6B; font-size: 16px; }
          .mes { margin: 0 0 10px; border: 1px solid #dbe3ef; border-radius: 9px; overflow: hidden; break-inside: auto; }
          .mes > header { display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; background: #1A3A6B; color: white; break-after: avoid; }
          .mes h2 { margin: 0; font: 700 14px Georgia, serif; }
          .mes h2 span { color: #E3B965; }
          .mes header b { font-size: 9px; }
          .itens { padding: 4px 8px; }
          .linha-data { display: grid; grid-template-columns: 58px 1fr; gap: 7px; align-items: start; padding: 4px 0; border-bottom: 1px solid #eef2f7; break-inside: avoid; }
          .linha-data:last-child { border-bottom: 0; }
          time { padding-top: 5px; color: #64748b; font-size: 9px; font-weight: 700; }
          .item { display: grid; grid-template-columns: 66px 1fr 80px; gap: 8px; align-items: start; border-left: 4px solid #64748b; border-radius: 5px; background: #f8fafc; padding: 5px 7px; }
          .item.tema { grid-template-columns: 66px 1fr; border-left-color: #C9963A; background: #fffbeb; }
          .item.evento { border-left-color: var(--cor); }
          .item.acao { border-left-color: #0f766e; }
          .tipo { color: #64748b; font-size: 7px; font-weight: 800; letter-spacing: .08em; padding-top: 2px; }
          .conteudo strong { display: block; color: #1A3A6B; font-size: 10px; }
          .conteudo span { display: block; margin-top: 2px; color: #64748b; line-height: 1.35; }
          .conteudo .descricao { color: #334155; font-style: italic; }
          .valor { color: #334155; font-size: 8px; font-weight: 700; line-height: 1.4; text-align: right; }
          .vazio { margin: 6px; color: #94a3b8; font-style: italic; }
          .sem-data > header { background: #475569; }
          .rodape { margin-top: 12px; border-top: 1px solid #e2e8f0; padding-top: 7px; color: #94a3b8; font-size: 8px; text-align: center; }
          @media print { .mes { page-break-inside: auto; } .linha-data { page-break-inside: avoid; } }
        </style>
      </head>
      <body>
        <header class="cabecalho">
          <div class="marca">PCM - Associação Paulistana</div>
          <h1>Calendário Missionário</h1>
          <div class="subtitulo">${escapar(opcaoAno.rotulo)} - ${escapar(nomeEscopo(filtro, listas))}</div>
        </header>
        <section class="resumos">
          <div class="resumo"><span>Período</span><strong>${escapar(`${meses[0]?.nome}/${meses[0]?.ano} a ${meses[meses.length - 1]?.nome}/${meses[meses.length - 1]?.ano}`)}</strong></div>
          <div class="resumo"><span>Temas oficiais</span><strong>${temas.length}</strong></div>
          <div class="resumo"><span>Ações planejadas</span><strong>${totalAcoes}</strong></div>
          <div class="resumo"><span>Orçamento total</span><strong>${escapar(moeda(totalValor))}</strong></div>
        </section>
        ${mesHtml}
        ${semDataHtml}
        <footer class="rodape">Documento completo gerado pelo Programa de Capacitação Missionária em ${escapar(new Date().toLocaleString('pt-BR'))}.</footer>
        <script>window.addEventListener('load', () => setTimeout(() => window.print(), 250));</script>
      </body>
    </html>
  `);
  janela.document.close();
  return true;
}
