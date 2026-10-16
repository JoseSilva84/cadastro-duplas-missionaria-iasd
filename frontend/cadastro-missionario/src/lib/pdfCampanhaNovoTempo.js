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

export function exportarListaAceitesCampanhaPdf(campanha, pessoas) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Pessoas que aceitaram o brinde / visita', 14, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${linha(campanha?.nome)} · ${pessoas.length.toLocaleString('pt-BR')} pessoa(s)`, 14, 23);
  autoTable(doc, {
    startY: 29,
    head: [['Nome', 'Distrito', 'Situação', 'Endereço informado']],
    body: pessoas.map((pessoa) => [linha(pessoa.nome), linha(pessoa.distrito), linha(pessoa.situacao), linha(pessoa.endereco)]),
    margin: { left: 14, right: 14, bottom: 14 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [26, 58, 107] },
    columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 43 }, 2: { cellWidth: 49 } },
  });
  doc.save(`aceites-${arquivo(campanha?.nome)}.pdf`);
}
