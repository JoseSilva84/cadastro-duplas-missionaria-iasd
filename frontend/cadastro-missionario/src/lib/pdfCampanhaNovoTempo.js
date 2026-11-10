import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const linha = (valor) => String(valor || 'Não informado').replace(/\s+/g, ' ').trim();
const arquivo = (valor) => linha(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);

export function exportarAceiteCampanhaPdf(campanha, pessoa) {
  if (!pessoa?.aceitou) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  let y = 18;
  const adicionar = (rotulo, valor) => {
    if (y > altura - 24) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(rotulo, 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const trecho of doc.splitTextToSize(linha(valor), largura - 30)) {
      if (y > altura - 17) { doc.addPage(); y = 18; }
      doc.text(trecho, 15, y);
      y += 5;
    }
    y += 4;
  };

  doc.setFillColor(26, 58, 107);
  doc.rect(0, 0, largura, 31, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Aceite do brinde / visita', 15, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(linha(campanha?.nome), 15, 23);
  doc.setTextColor(30, 41, 59);
  y = 42;
  adicionar('Nome', pessoa.nome);
  adicionar('Distrito', pessoa.distrito);
  adicionar('Igreja', pessoa.igreja);
  adicionar('Endereço informado', pessoa.endereco);
  adicionar('Telefone', pessoa.telefone);
  adicionar('Situação', pessoa.situacao);
  adicionar('Atualizado em', pessoa.atualizadoEm ? new Date(pessoa.atualizadoEm).toLocaleString('pt-BR') : 'Não informado');
  adicionar('Conversas', `${pessoa.mensagens?.length || 0} mensagem(ns) registrada(s) no relatório`);
  if (!pessoa.historicoCompleto) adicionar('Disponibilidade do histórico', 'O Amigos NT forneceu somente as mensagens presentes no resumo da campanha.');
  if (pessoa.mensagens?.length) {
    pessoa.mensagens.forEach((mensagem) => {
      const remetente = /INBOUND|LEAD/i.test(mensagem.direcao) ? 'Interessado' : 'Agente Ana';
      adicionar(`${remetente}${mensagem.data ? ` - ${new Date(mensagem.data).toLocaleString('pt-BR')}` : ''}`, mensagem.texto);
    });
  } else {
    if (pessoa.ultimaMensagemInteressado) adicionar('Última mensagem do interessado', pessoa.ultimaMensagemInteressado);
    if (pessoa.ultimaMensagemAgente) adicionar('Última mensagem da agente', pessoa.ultimaMensagemAgente);
  }
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`PCM - ${pagina}/${paginas}`, largura - 15, altura - 8, { align: 'right' });
  }
  doc.save(`aceite-${arquivo(pessoa.nome)}.pdf`);
}

export function exportarConversaCampanhaPdf(campanha, pessoa) {
  if (!pessoa) return;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const largura = doc.internal.pageSize.getWidth();
  const altura = doc.internal.pageSize.getHeight();
  let y = 18;
  const adicionar = (rotulo, valor) => {
    if (y > altura - 24) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(rotulo, 15, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    for (const trecho of doc.splitTextToSize(linha(valor), largura - 30)) {
      if (y > altura - 17) { doc.addPage(); y = 18; }
      doc.text(trecho, 15, y);
      y += 5;
    }
    y += 4;
  };
  doc.setFillColor(26, 58, 107);
  doc.rect(0, 0, largura, 31, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Conversa da campanha', 15, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(linha(campanha?.nome), 15, 23);
  doc.setTextColor(30, 41, 59);
  y = 42;
  adicionar('Lead', pessoa.nome);
  adicionar('Distrito / Igreja', `${linha(pessoa.distrito)} / ${linha(pessoa.igreja)}`);
  adicionar('Telefone', pessoa.telefone);
  adicionar('Situação', pessoa.situacao);
  if (pessoa.mensagens?.length) {
    pessoa.mensagens.forEach((mensagem) => {
      const remetente = /INBOUND|LEAD/i.test(mensagem.direcao) ? 'Interessado' : 'Agente Ana';
      adicionar(`${remetente}${mensagem.data ? ` - ${new Date(mensagem.data).toLocaleString('pt-BR')}` : ''}`, mensagem.texto);
    });
  } else {
    if (pessoa.ultimaMensagemInteressado) adicionar('Última mensagem do interessado', pessoa.ultimaMensagemInteressado);
    if (pessoa.ultimaMensagemAgente) adicionar('Última mensagem da agente', pessoa.ultimaMensagemAgente);
  }
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`PCM - ${pagina}/${paginas}`, largura - 15, altura - 8, { align: 'right' });
  }
  doc.save(`conversa-${arquivo(pessoa.nome)}.pdf`);
}

export function criarListaAceitesCampanhaPdf(campanha, pessoas, recorte = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Pessoas que aceitaram o brinde / visita', 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${linha(campanha?.nome)} - ${pessoas.length.toLocaleString('pt-BR')} pessoa(s)`, 14, 23);
  let inicioTabela = 29;
  if (recorte.distrito) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Distrito: ${linha(recorte.distrito)}`, 14, 29);
    inicioTabela = 35;
  }
  if (recorte.igreja) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Igreja: ${linha(recorte.igreja)}`, 14, inicioTabela);
    inicioTabela += 6;
  }
  autoTable(doc, {
    startY: inicioTabela,
    head: [['Nome', 'Distrito', 'Igreja', 'Situação', 'Endereço']],
    body: pessoas.map((pessoa) => [
      linha(pessoa.nome), linha(pessoa.distrito), linha(pessoa.igreja), linha(pessoa.situacao), linha(pessoa.endereco),
    ]),
    margin: { left: 14, right: 14, bottom: 14 },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 1.8, overflow: 'linebreak', valign: 'top', lineWidth: 0.1 },
    headStyles: { fillColor: [26, 58, 107] },
    columnStyles: {
      0: { cellWidth: 52 }, 1: { cellWidth: 37 }, 2: { cellWidth: 43 }, 3: { cellWidth: 38 }, 4: { cellWidth: 99 },
    },
    rowPageBreak: 'avoid',
    didParseCell: (dados) => {
      if (dados.section === 'body' && dados.column.index === 4) {
        const tamanho = String(dados.cell.raw || '').length;
        if (tamanho > 180) dados.cell.styles.fontSize = 6;
        else if (tamanho > 100) dados.cell.styles.fontSize = 6.8;
      }
    },
  });
  const paginas = doc.getNumberOfPages();
  for (let pagina = 1; pagina <= paginas; pagina += 1) {
    doc.setPage(pagina);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`PCM - ${pagina}/${paginas}`, 283, 203, { align: 'right' });
  }
  return doc;
}

export function exportarListaAceitesCampanhaPdf(campanha, pessoas, recorte = {}) {
  const doc = criarListaAceitesCampanhaPdf(campanha, pessoas, recorte);
  doc.save(`aceites-${arquivo(campanha?.nome)}.pdf`);
}
