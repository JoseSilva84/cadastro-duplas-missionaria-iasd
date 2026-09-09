import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const PRIORIDADES = {
  Hot: 'Quente',
  Warm: 'Potencial',
  Cool: 'Morno',
  Cold: 'Frio',
};

const texto = (valor, fallback = 'Não informado') => {
  if (valor === null || valor === undefined || valor === '') return fallback;
  return String(valor);
};

const simNao = (valor) => valor ? 'Sim' : 'Não';

function dataCurta(valor) {
  if (!valor) return 'Não informada';
  const iso = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? texto(valor) : data.toLocaleDateString('pt-BR');
}

function nomeArquivo(valor) {
  return String(valor || 'lead')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70) || 'lead';
}

function adicionarCabecalho(doc, titulo, subtitulo) {
  const largura = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 35, 71);
  doc.rect(0, 0, largura, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(titulo, 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitulo, 14, 22);
  doc.setTextColor(30, 41, 59);
}

function adicionarPaginacao(doc) {
  const totalPaginas = doc.getNumberOfPages();
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Programa de Capacitação Missionária - Página ${pagina} de ${totalPaginas}`, largura / 2, altura - 6, { align: 'center' });
  }
}

export function resumoOperacionalLead(lead) {
  const partes = [];
  partes.push(lead.temWhatsapp ? 'Contato apto para WhatsApp.' : 'Sem WhatsApp disponível.');
  partes.push(lead.estudoAtivo ? 'Possui estudo ativo.' : 'Sem estudo ativo registrado.');
  if (lead.vipHistorico) partes.push('Lead identificado como VIP histórico.');
  if (lead.diasSemContato !== null && lead.diasSemContato !== undefined) partes.push(`${texto(lead.diasSemContato)} dias sem contato.`);
  return partes.join(' ');
}

export function exportarListaLeadsPdf(leads) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  adicionarCabecalho(
    doc,
    'Leads Novo Tempo - Filtragem',
    `${leads.length.toLocaleString('pt-BR')} leads - Gerado em ${new Date().toLocaleString('pt-BR')}`
  );

  autoTable(doc, {
    startY: 36,
    margin: { left: 10, right: 10, bottom: 14 },
    head: [['Nome', 'E-mail', 'WhatsApp', 'Distrito', 'Bairro', 'Material', 'Prioridade']],
    body: leads.map((lead) => [
      texto(lead.nome),
      texto(lead.email, '-'),
      texto(lead.whatsapp, '-'),
      texto(lead.distrito, '-'),
      texto(lead.bairro, '-'),
      texto(lead.material, '-'),
      PRIORIDADES[lead.prioridade] || texto(lead.prioridade, '-'),
    ]),
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 2, overflow: 'linebreak', textColor: [30, 41, 59] },
    headStyles: { fillColor: [26, 58, 107], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 43 },
      1: { cellWidth: 47 },
      2: { cellWidth: 30 },
      3: { cellWidth: 38 },
      4: { cellWidth: 34 },
      5: { cellWidth: 51 },
      6: { cellWidth: 25 },
    },
  });

  adicionarPaginacao(doc);
  doc.save('leads-novo-tempo-filtrados.pdf');
}

export function exportarLeadPdf(lead, igrejas = []) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const prioridade = PRIORIDADES[lead.prioridade] || texto(lead.prioridade);
  adicionarCabecalho(doc, texto(lead.nome, 'Detalhes do lead'), `${prioridade} - ${texto(lead.distrito)} - Gerado em ${new Date().toLocaleString('pt-BR')}`);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 58, 107);
  doc.text('Todos os dados', 14, 40);

  const dados = [
    ['Nome', texto(lead.nome)],
    ['ID', texto(lead.id)],
    ['WhatsApp', texto(lead.whatsapp)],
    ['E-mail', texto(lead.email)],
    ['Distrito', texto(lead.distrito)],
    ['Cidade', texto(lead.cidade)],
    ['Bairro', texto(lead.bairro)],
    ['Endereço completo', texto(lead.endereco)],
    ['Idade', texto(lead.idade)],
    ['Data de nascimento', dataCurta(lead.dataNascimento)],
    ['Gênero', texto(lead.genero)],
    ['Religião', texto(lead.religiao)],
    ['Prioridade', prioridade],
    ['Pontuação', texto(lead.pontuacao)],
    ['VIP histórico', simNao(lead.vipHistorico)],
    ['Estudo ativo', simNao(lead.estudoAtivo)],
    ['Material principal', texto(lead.material)],
    ['Origem', texto(lead.origem)],
    ['Status', texto(lead.status)],
    ['Observações', texto(lead.observacoes, 'Nenhuma')],
  ];

  autoTable(doc, {
    startY: 44,
    margin: { left: 14, right: 14, bottom: 14 },
    body: dados,
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2.7, overflow: 'linebreak', textColor: [30, 41, 59] },
    columnStyles: { 0: { cellWidth: 48, fontStyle: 'bold', fillColor: [241, 245, 249] }, 1: { cellWidth: 130 } },
  });

  let proximaLinha = (doc.lastAutoTable?.finalY || 44) + 9;
  if (proximaLinha > 260) {
    doc.addPage();
    proximaLinha = 18;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 58, 107);
  doc.text('Resumo operacional', 14, proximaLinha);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const resumo = doc.splitTextToSize(resumoOperacionalLead(lead), 178);
  doc.text(resumo, 14, proximaLinha + 6);
  proximaLinha += 12 + (resumo.length * 4);

  if (igrejas.length) {
    if (proximaLinha > 263) {
      doc.addPage();
      proximaLinha = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 58, 107);
    doc.text(`Igrejas do distrito (${igrejas.length})`, 14, proximaLinha);
    autoTable(doc, {
      startY: proximaLinha + 4,
      margin: { left: 14, right: 14, bottom: 14 },
      head: [['Igreja', 'Endereço']],
      body: igrejas.map((igreja) => [texto(igreja.nome), texto(igreja.endereco || igreja.geoNomeExibicao)]),
      theme: 'striped',
      styles: { font: 'helvetica', fontSize: 8, cellPadding: 2.3, overflow: 'linebreak' },
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255] },
      columnStyles: { 0: { cellWidth: 62 }, 1: { cellWidth: 116 } },
    });
  }

  adicionarPaginacao(doc);
  doc.save(`lead-${nomeArquivo(lead.nome)}.pdf`);
}
