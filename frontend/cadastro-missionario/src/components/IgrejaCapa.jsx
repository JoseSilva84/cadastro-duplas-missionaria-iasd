import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { FotoService } from '../foto.service';
import AvatarUpload from './AvatarUpload';

const formatarNumero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const formatarData = (valor) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const valorDataInput = (valor) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toISOString().slice(0, 10);
};

const escaparHtml = (valor) => String(valor ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const gerarPdf = (relatorio) => {
  const indicadores = relatorio.indicadores || {};
  const duplas = relatorio.duplas || [];
  const janela = window.open('', '_blank', 'width=900,height=700');
  if (!janela) return;

  const linhaIndicador = (label, valor) => {
    const valorFormatado = typeof valor === 'number' ? formatarNumero(valor) : valor;
    return `<tr><td>${escaparHtml(label)}</td><td>${escaparHtml(valorFormatado)}</td></tr>`;
  };
  const linhaDupla = (dupla) => `
    <tr>
      <td>${escaparHtml(`${dupla.liderNome || ''} + ${dupla.membro2Nome || ''}`.trim())}</td>
      <td>${escaparHtml(dupla.status || '')}</td>
      <td>${escaparHtml(dupla.estudos || 0)}</td>
      <td>${escaparHtml(dupla.evangelismos || 0)}</td>
      <td>${escaparHtml(dupla.batismos || 0)}</td>
    </tr>
  `;

  janela.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Relatório - ${escaparHtml(relatorio.igreja?.nome || 'Igreja')}</title>
        <style>
          @page { size: A4; margin: 14mm; }
          body { font-family: Arial, sans-serif; color: #1f2937; }
          h1, h2 { color: #1A3A6B; margin: 0; }
          h1 { font-family: Georgia, serif; font-size: 26px; }
          h2 { font-size: 15px; margin-top: 24px; border-bottom: 2px solid #C9963A; padding-bottom: 6px; }
          .meta { color: #6b7280; font-size: 12px; margin-top: 6px; line-height: 1.6; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; }
          .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .label { color: #9ca3af; text-transform: uppercase; font-size: 10px; font-weight: 700; }
          .value { font-size: 14px; font-weight: 700; margin-top: 3px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          th { background: #1A3A6B; color: white; text-align: left; padding: 8px; }
          td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
          .footer { margin-top: 24px; color: #9ca3af; font-size: 11px; }
        </style>
      </head>
      <body>
        <h1>${escaparHtml(relatorio.igreja?.nome || '')}</h1>
        <div class="meta">
          Distrito ${escaparHtml(relatorio.igreja?.distrito || '')} · Região ${escaparHtml(relatorio.igreja?.regiao || '')}<br>
          Endereço: ${escaparHtml(relatorio.igreja?.endereco || 'Não informado')}<br>
          Gerado em ${escaparHtml(new Date(relatorio.geradoEm || Date.now()).toLocaleString('pt-BR'))}
        </div>

        <div class="grid">
          <div class="box"><div class="label">Diretor de Ministério Pessoal</div><div class="value">${escaparHtml(relatorio.liderancas?.diretorMinisterioPessoal?.nome || 'Não informado')}</div></div>
          <div class="box"><div class="label">Pastor</div><div class="value">${escaparHtml(relatorio.liderancas?.pastor?.nome || 'Não informado')}</div></div>
          <div class="box"><div class="label">Coordenador Missionário</div><div class="value">${escaparHtml(relatorio.liderancas?.coordenadorMissionario?.nome || 'Não informado')}</div></div>
          <div class="box"><div class="label">Membros</div><div class="value">${escaparHtml(formatarNumero(indicadores.quantidadeMembros))}</div></div>
        </div>

        <h2>Indicadores</h2>
        <table><tbody>
          ${linhaIndicador('Duplas missionárias', indicadores.quantidadeDuplasMissionarias)}
          ${linhaIndicador('Quantidade de estudos', indicadores.quantidadeEstudos)}
          ${linhaIndicador('Pontos de estudos', indicadores.quantidadePontosEstudos)}
          ${linhaIndicador('Classes bíblicas', indicadores.quantidadeClassesBiblicas)}
          ${linhaIndicador('Classificação da Classe Bíblica', indicadores.classeBiblica ? `Classe ${indicadores.classeBiblica}` : 'Sem classificação')}
          ${linhaIndicador('Estudantes em Classe Bíblica', indicadores.totalEstudantesClasseBiblica || 0)}
          ${linhaIndicador('Estudos ativos', indicadores.estudosAtivos)}
          ${linhaIndicador('Evangelismos ativos', indicadores.evangelismosAtivos)}
          ${linhaIndicador('Batismos', indicadores.batismos)}
          ${linhaIndicador('Pessoas alcançadas', indicadores.pessoasAlcancadas)}
        </tbody></table>

        <h2>Duplas Missionárias</h2>
        <table>
          <thead><tr><th>Dupla</th><th>Status</th><th>Estudos</th><th>Evangelismos</th><th>Batismos</th></tr></thead>
          <tbody>${duplas.length ? duplas.map(linhaDupla).join('') : '<tr><td colspan="5">Nenhuma dupla registrada.</td></tr>'}</tbody>
        </table>

        <div class="footer">Sistema de Duplas Missionárias · Associação Paulistana</div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  janela.document.close();
};

const FotoBloco = ({ src, alt, tipo }) => (
  <div className="aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#F4F5F7] border border-gray-100 flex items-center justify-center">
    {src ? (
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    ) : (
      <div className="text-center px-4">
        <div className="text-3xl text-gray-300 mb-2">{tipo === 'templo' ? '⛪' : '👤'}</div>
        <p className="text-xs text-gray-400">Sem foto cadastrada</p>
      </div>
    )}
  </div>
);

const InfoLinha = ({ label, valor }) => (
  <div className="py-2 border-b border-gray-50 last:border-b-0">
    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
    <p className="text-sm text-gray-700 font-medium break-words">{valor || 'Não informado'}</p>
  </div>
);

const ColunaPessoa = ({ titulo, cargo, pessoa, foto }) => (
  <section className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 min-w-0">
    <div className="mb-3">
      <p className="text-[10px] uppercase tracking-wider text-[#C9963A] font-bold">{cargo}</p>
      <h3 className="text-base font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h3>
    </div>
    <FotoBloco src={foto} alt={pessoa.nome || titulo} />
    <div className="mt-3">
      <InfoLinha label="Nome" valor={pessoa.nome} />
      <InfoLinha label="Endereço" valor={pessoa.endereco} />
      <InfoLinha label="WhatsApp" valor={pessoa.whatsapp || pessoa.telefone} />
      <InfoLinha label="Data de nascimento" valor={formatarData(pessoa.dataNascimento)} />
    </div>
  </section>
);

const Campo = ({ label, children }) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">{label}</span>
    {children}
  </label>
);

const ModalEdicao = ({ igreja, fotos, onClose, onSaved }) => {
  const [form, setForm] = useState(() => ({
    fotoDiretorMinisterioPessoal: fotos.diretor || '',
    nomeDiretorMinisterioPessoal: igreja.nomeDiretorMinisterioPessoal || '',
    enderecoDiretorMinisterioPessoal: igreja.enderecoDiretorMinisterioPessoal || '',
    whatsappDiretorMinisterioPessoal: igreja.whatsappDiretorMinisterioPessoal || '',
    dataNascimentoDiretorMinisterioPessoal: valorDataInput(igreja.dataNascimentoDiretorMinisterioPessoal),
    fotoPastor: fotos.pastor || '',
    nomePastor: igreja.distrito?.nomePastor || '',
    cargoPastor: igreja.distrito?.cargoPastor || 'Pastor Distrital',
    telefonePastor: igreja.distrito?.telefonePastor || '',
    enderecoPastor: igreja.distrito?.enderecoPastor || '',
    dataNascimentoPastor: valorDataInput(igreja.distrito?.dataNascimentoPastor),
    fotoCoordInteressados: fotos.coordenador || '',
    nomeCoordInteressados: igreja.nomeCoordInteressados || '',
    telefoneCoordInteressados: igreja.telefoneCoordInteressados || '',
    enderecoCoordInteressados: igreja.enderecoCoordInteressados || '',
    dataNascimentoCoordInteressados: valorDataInput(igreja.dataNascimentoCoordInteressados),
    fotoIgreja: fotos.igreja || '',
    endereco: igreja.endereco || '',
  }));
  const [salvando, setSalvando] = useState(false);

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const salvar = async (event) => {
    event.preventDefault();
    setSalvando(true);
    try {
      const [fotoDiretor, fotoPastor, fotoCoordenador, fotoIgreja] = await Promise.all([
        FotoService.salvarFotoPorReferencia('igreja', igreja.id, 'diretor_mp', form.fotoDiretorMinisterioPessoal),
        FotoService.salvarFotoPorReferencia('distrito', igreja.distritoId, 'pastor', form.fotoPastor),
        FotoService.salvarFotoPorReferencia('igreja', igreja.id, 'coordenador', form.fotoCoordInteressados),
        FotoService.salvarFotoPorReferencia('igreja', igreja.id, 'templo', form.fotoIgreja),
      ]);

      await Promise.all([
        api.patch(`/distritos/${igreja.distritoId}`, {
          fotoPastor,
          nomePastor: form.nomePastor || null,
          cargoPastor: form.cargoPastor || null,
          telefonePastor: form.telefonePastor || null,
          enderecoPastor: form.enderecoPastor || null,
          dataNascimentoPastor: form.dataNascimentoPastor || null,
        }),
        api.patch(`/igrejas/${igreja.id}`, {
          fotoDiretorMinisterioPessoal: fotoDiretor,
          nomeDiretorMinisterioPessoal: form.nomeDiretorMinisterioPessoal || null,
          enderecoDiretorMinisterioPessoal: form.enderecoDiretorMinisterioPessoal || null,
          whatsappDiretorMinisterioPessoal: form.whatsappDiretorMinisterioPessoal || null,
          dataNascimentoDiretorMinisterioPessoal: form.dataNascimentoDiretorMinisterioPessoal || null,
          fotoCoordInteressados: fotoCoordenador,
          nomeCoordInteressados: form.nomeCoordInteressados || null,
          telefoneCoordInteressados: form.telefoneCoordInteressados || null,
          enderecoCoordInteressados: form.enderecoCoordInteressados || null,
          dataNascimentoCoordInteressados: form.dataNascimentoCoordInteressados || null,
          fotoIgreja,
          endereco: form.endereco || null,
        }),
      ]);

      const { data } = await api.get(`/igrejas/${igreja.id}`);
      onSaved(data, {
        diretor: form.fotoDiretorMinisterioPessoal,
        pastor: form.fotoPastor,
        coordenador: form.fotoCoordInteressados,
        igreja: form.fotoIgreja,
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-lg shadow-xl border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[#C9963A] text-xs font-bold uppercase tracking-wider">Editar capa</p>
            <h3 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{igreja.nome}</h3>
          </div>
          <button type="button" className="btn-outline text-sm" onClick={onClose}>Fechar</button>
        </div>

        <form onSubmit={salvar} className="flex flex-col max-h-[calc(92vh-76px)]">
          <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#F4F5F7]">
            <section className="bg-white rounded-lg border border-gray-100 p-4">
              <h4 className="font-bold text-[#1A3A6B] mb-4">Diretor de Ministério Pessoal</h4>
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5">
                <AvatarUpload value={form.fotoDiretorMinisterioPessoal} onChange={(v) => set('fotoDiretorMinisterioPessoal', v)} label="Foto" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo label="Nome"><input className="input-field" value={form.nomeDiretorMinisterioPessoal} onChange={(e) => set('nomeDiretorMinisterioPessoal', e.target.value)} /></Campo>
                  <Campo label="WhatsApp"><input className="input-field" value={form.whatsappDiretorMinisterioPessoal} onChange={(e) => set('whatsappDiretorMinisterioPessoal', e.target.value)} /></Campo>
                  <Campo label="Endereço"><input className="input-field" value={form.enderecoDiretorMinisterioPessoal} onChange={(e) => set('enderecoDiretorMinisterioPessoal', e.target.value)} /></Campo>
                  <Campo label="Nascimento"><input type="date" className="input-field" value={form.dataNascimentoDiretorMinisterioPessoal} onChange={(e) => set('dataNascimentoDiretorMinisterioPessoal', e.target.value)} /></Campo>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-100 p-4">
              <h4 className="font-bold text-[#1A3A6B] mb-4">Pastor</h4>
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5">
                <AvatarUpload value={form.fotoPastor} onChange={(v) => set('fotoPastor', v)} label="Foto" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo label="Nome"><input className="input-field" value={form.nomePastor} onChange={(e) => set('nomePastor', e.target.value)} /></Campo>
                  <Campo label="Cargo"><input className="input-field" value={form.cargoPastor} onChange={(e) => set('cargoPastor', e.target.value)} /></Campo>
                  <Campo label="WhatsApp"><input className="input-field" value={form.telefonePastor} onChange={(e) => set('telefonePastor', e.target.value)} /></Campo>
                  <Campo label="Nascimento"><input type="date" className="input-field" value={form.dataNascimentoPastor} onChange={(e) => set('dataNascimentoPastor', e.target.value)} /></Campo>
                  <div className="sm:col-span-2">
                    <Campo label="Endereço"><input className="input-field" value={form.enderecoPastor} onChange={(e) => set('enderecoPastor', e.target.value)} /></Campo>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-100 p-4">
              <h4 className="font-bold text-[#1A3A6B] mb-4">Coordenador Missionário</h4>
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5">
                <AvatarUpload value={form.fotoCoordInteressados} onChange={(v) => set('fotoCoordInteressados', v)} label="Foto" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo label="Nome"><input className="input-field" value={form.nomeCoordInteressados} onChange={(e) => set('nomeCoordInteressados', e.target.value)} /></Campo>
                  <Campo label="WhatsApp"><input className="input-field" value={form.telefoneCoordInteressados} onChange={(e) => set('telefoneCoordInteressados', e.target.value)} /></Campo>
                  <Campo label="Endereço"><input className="input-field" value={form.enderecoCoordInteressados} onChange={(e) => set('enderecoCoordInteressados', e.target.value)} /></Campo>
                  <Campo label="Nascimento"><input type="date" className="input-field" value={form.dataNascimentoCoordInteressados} onChange={(e) => set('dataNascimentoCoordInteressados', e.target.value)} /></Campo>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-lg border border-gray-100 p-4">
              <h4 className="font-bold text-[#1A3A6B] mb-4">Dados da Igreja</h4>
              <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-5">
                <AvatarUpload value={form.fotoIgreja} onChange={(v) => set('fotoIgreja', v)} label="Foto" />
                <Campo label="Endereço da igreja"><input className="input-field" value={form.endereco} onChange={(e) => set('endereco', e.target.value)} /></Campo>
              </div>
            </section>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 bg-white flex justify-end gap-2">
            <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar alterações'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function IgrejaCapa({ igreja, onNovaDupla }) {
  const [igrejaAtual, setIgrejaAtual] = useState(igreja);
  const [relatorio, setRelatorio] = useState(null);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);
  const [fotos, setFotos] = useState({});
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    let ativo = true;
    if (!igreja?.id) return undefined;

    setIgrejaAtual(igreja);
    setRelatorio(null);
    setFotos({});
    setCarregandoRelatorio(true);

    api.get(`/relatorios/por-igreja/${igreja.id}`)
      .then((res) => {
        if (ativo) setRelatorio(res.data);
      })
      .catch(() => {
        if (ativo) setRelatorio(null);
      })
      .finally(() => {
        if (ativo) setCarregandoRelatorio(false);
      });

    const refs = {
      diretor: igreja.fotoDiretorMinisterioPessoal,
      pastor: igreja.distrito?.fotoPastor,
      coordenador: igreja.fotoCoordInteressados,
      igreja: igreja.fotoIgreja,
    };

    Promise.all(Object.entries(refs).map(async ([chave, ref]) => [
      chave,
      await FotoService.resolverFotoParaPreview(ref).catch(() => ''),
    ])).then((pares) => {
      if (ativo) setFotos(Object.fromEntries(pares));
    });

    return () => { ativo = false; };
  }, [igreja]);

  const indicadores = useMemo(() => {
    const duplas = igrejaAtual?.duplas || [];
    return relatorio?.indicadores || {
      quantidadeMembros: igrejaAtual?.membros || 0,
      quantidadeDuplasMissionarias: igrejaAtual?._count?.duplas || duplas.length,
      quantidadeEstudos: duplas.filter((dupla) => dupla.statusEstudoBiblico === 'ATIVO').length,
      quantidadePontosEstudos: 0,
      quantidadeClassesBiblicas: 0,
    };
  }, [igrejaAtual, relatorio]);

  if (!igrejaAtual) return null;

  const diretor = {
    nome: igrejaAtual.nomeDiretorMinisterioPessoal,
    endereco: igrejaAtual.enderecoDiretorMinisterioPessoal,
    whatsapp: igrejaAtual.whatsappDiretorMinisterioPessoal,
    dataNascimento: igrejaAtual.dataNascimentoDiretorMinisterioPessoal,
  };
  const pastor = {
    nome: igrejaAtual.distrito?.nomePastor,
    endereco: igrejaAtual.distrito?.enderecoPastor || (igrejaAtual.distrito?.nome ? `Distrito ${igrejaAtual.distrito.nome}` : ''),
    telefone: igrejaAtual.distrito?.telefonePastor,
    dataNascimento: igrejaAtual.distrito?.dataNascimentoPastor,
  };
  const coordenador = {
    nome: igrejaAtual.nomeCoordInteressados,
    endereco: igrejaAtual.enderecoCoordInteressados,
    telefone: igrejaAtual.telefoneCoordInteressados,
    dataNascimento: igrejaAtual.dataNascimentoCoordInteressados,
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider mb-1">Capa da Igreja</p>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              {igrejaAtual.nome}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {igrejaAtual.distrito?.nome || 'Distrito não informado'}
              {igrejaAtual.distrito?.regiao?.nome && ` • ${igrejaAtual.distrito.regiao.nome}`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <button type="button" onClick={() => setEditando(true)} className="btn-outline text-sm">
              Editar Dados
            </button>
            {onNovaDupla && (
              <button type="button" onClick={onNovaDupla} className="btn-outline text-sm">
                Nova Dupla
              </button>
            )}
            <button
              type="button"
              className="btn-primary text-sm"
              disabled={carregandoRelatorio}
              onClick={async () => {
                const dados = relatorio || (await api.get(`/relatorios/por-igreja/${igrejaAtual.id}`)).data;
                gerarPdf(dados);
              }}
            >
              {carregandoRelatorio ? 'Gerando...' : 'Gerar PDF'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-4">
        <ColunaPessoa titulo="Diretor de Ministério Pessoal" cargo="Coluna 1" pessoa={diretor} foto={fotos.diretor} />
        <ColunaPessoa titulo="Pastor" cargo={igrejaAtual.distrito?.cargoPastor || 'Coluna 2'} pessoa={pastor} foto={fotos.pastor} />
        <ColunaPessoa titulo="Coordenador Missionário" cargo={igrejaAtual.cargoCoordInteressados || 'Coluna 3'} pessoa={coordenador} foto={fotos.coordenador} />

        <section className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 min-w-0">
          <div className="mb-3">
            <p className="text-[10px] uppercase tracking-wider text-[#C9963A] font-bold">Coluna 4</p>
            <h3 className="text-base font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Dados da Igreja</h3>
          </div>
          <FotoBloco src={fotos.igreja} alt={igrejaAtual.nome} tipo="templo" />
          <div className="mt-3 grid grid-cols-1 gap-0">
            <InfoLinha label="Quantidade de membros" valor={formatarNumero(indicadores.quantidadeMembros)} />
            <InfoLinha label="Endereço da igreja" valor={igrejaAtual.endereco} />
            <InfoLinha label="Duplas missionárias" valor={formatarNumero(indicadores.quantidadeDuplasMissionarias)} />
            <InfoLinha label="Quantidade de estudos" valor={formatarNumero(indicadores.quantidadeEstudos)} />
            <InfoLinha label="Pontos de estudos" valor={formatarNumero(indicadores.quantidadePontosEstudos)} />
            <InfoLinha label="Classes bíblicas" valor={formatarNumero(indicadores.quantidadeClassesBiblicas)} />
            <InfoLinha label="Classificação classe bíblica" valor={(indicadores.classeBiblica || igrejaAtual.classeBiblica?.classe) ? `Classe ${indicadores.classeBiblica || igrejaAtual.classeBiblica?.classe}` : 'Sem classificação'} />
            <InfoLinha label="Estudantes em classe bíblica" valor={formatarNumero(indicadores.totalEstudantesClasseBiblica ?? igrejaAtual.classeBiblica?.totalEstudantes)} />
          </div>
        </section>
      </div>

      {editando && (
        <ModalEdicao
          igreja={igrejaAtual}
          fotos={fotos}
          onClose={() => setEditando(false)}
          onSaved={(atualizada, fotosAtualizadas) => {
            setIgrejaAtual(atualizada);
            setFotos(fotosAtualizadas);
            setEditando(false);
            setRelatorio(null);
          }}
        />
      )}
    </div>
  );
}
