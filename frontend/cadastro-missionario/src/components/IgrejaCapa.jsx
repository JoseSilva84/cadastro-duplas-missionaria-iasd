import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { FotoService } from '../foto.service';
import { toast } from '../lib/toast';
import AvatarUpload from './AvatarUpload';
import { useAuth, PERFIS } from '../contexts/AuthContext';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';

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
          <div class="box"><div class="label">Coordenador Regional</div><div class="value">${escaparHtml(relatorio.liderancas?.coordenadorMissionario?.nome || 'Não informado')}</div></div>
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
          ${linhaIndicador('Classes Bíblicas ativas', indicadores.evangelismosAtivos)}
          ${linhaIndicador('Batismos', indicadores.batismos)}
          ${linhaIndicador('Pessoas alcançadas', indicadores.pessoasAlcancadas)}
        </tbody></table>

        <h2>Duplas Missionárias</h2>
        <table>
          <thead><tr><th>Dupla</th><th>Status</th><th>Estudos</th><th>Classes Bíblicas</th><th>Batismos</th></tr></thead>
          <tbody>${duplas.length ? duplas.map(linhaDupla).join('') : '<tr><td colspan="5">Nenhuma dupla registrada.</td></tr>'}</tbody>
        </table>

        <div class="footer">Sistema de Duplas Missionárias · Associação Paulistana</div>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>
  `);
  janela.document.close();
};

const FotoBloco = ({ src, alt, tipo, onClick }) => (
  <button
    type="button"
    onClick={src ? onClick : undefined}
    disabled={!src}
    className={`group relative h-36 w-full overflow-hidden rounded-lg bg-[#F4F5F7] border border-gray-100 flex items-center justify-center transition-all duration-200 ${src ? 'cursor-zoom-in hover:-translate-y-0.5 hover:border-[#C9963A] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#C9963A]/50' : 'cursor-default'}`}
  >
    {src ? (
      <>
        <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <span className="absolute inset-0 bg-[#1A3A6B]/0 transition-colors duration-200 group-hover:bg-[#1A3A6B]/18" />
        <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-[#1A3A6B] opacity-0 shadow-sm transition-opacity duration-200 group-hover:opacity-100">
          Ampliar
        </span>
      </>
    ) : (
      <div className="text-center px-4">
        <div className="text-3xl text-gray-300 mb-2">{tipo === 'templo' ? '⛪' : '👤'}</div>
        <p className="text-xs text-gray-400">Sem foto cadastrada</p>
      </div>
    )}
  </button>
);

const InfoLinha = ({ label, valor }) => (
  <div className="min-w-0 py-2 border-b border-gray-50 last:border-b-0">
    <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{label}</p>
    <p className="min-w-0 text-sm text-gray-700 font-medium break-words">{valor || 'Não informado'}</p>
  </div>
);

const ColunaPessoa = ({ titulo, cargo, pessoa, foto, onFotoClick }) => (
  <section className="group bg-white rounded-lg border border-gray-100 shadow-sm p-4 min-w-0 transition-all duration-300 hover:-translate-y-1 hover:border-[#C9963A]/45 hover:shadow-xl">
    <div className="mb-3 min-h-20">
      <p className="text-[10px] uppercase tracking-wider text-[#C9963A] font-bold">{cargo}</p>
      <h3 className="text-base font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h3>
    </div>
    <FotoBloco src={foto} alt={pessoa.nome || titulo} onClick={() => onFotoClick?.({ src: foto, titulo, nome: pessoa.nome || titulo })} />
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
      toast.success('Dados da igreja salvos com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar os dados da igreja.');
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
              <h4 className="font-bold text-[#1A3A6B] mb-4">Coordenador Regional</h4>
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

// ─── Status e classificação labels ───────────────────────────────────────────
const statusColors = {
  ATIVO: '#16a34a',
  INATIVO: '#9ca3af',
  EM_FORMACAO: '#d97706',
  SUSPENSO: '#ef4444',
};
const statusLabels = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  EM_FORMACAO: 'Em formação',
  SUSPENSO: 'Suspenso',
};

const FotoPessoaIgreja = ({ src, nome, className }) => {
  const inicial = (nome || '?').charAt(0).toUpperCase();
  if (src) {
    return <img src={src} alt={nome || 'Foto'} className={`${className} object-cover`} />;
  }
  return (
    <div className={`${className} bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold`}>
      {inicial}
    </div>
  );
};

const WhatsAppLinkIgreja = ({ numero }) => {
  if (!numero) return <span className="text-gray-400 text-xs">Não informado</span>;
  const limpo = numero.replace(/\D/g, '');
  return (
    <a
      href={`https://web.whatsapp.com/send?phone=55${limpo}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-full min-w-0 items-start gap-1 align-top text-[#25D366] text-xs font-medium hover:underline"
    >
      <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
      <span className="min-w-0 break-all leading-snug">{numero}</span>
    </a>
  );
};

const getEstudosDupla = (dupla) => dupla?._count?.estudosBiblicos ?? dupla?.estudosBiblicos?.length ?? 0;
const totalLicoesSerie = (serieId) => SERIES_ESTUDO.find((serie) => serie.id === serieId)?.licoes?.length || 0;
const progressoEstudo = (estudo) => {
  const total = totalLicoesSerie(estudo?.serie);
  const atual = Number(estudo?.licaoAtual || 0);
  if (!total || !atual) return 0;
  return Math.min(100, Math.round((atual / total) * 100));
};

const tipoEstudoInfo = {
  UNICO: { label: 'Estudo Bíblico', path: '/relatorios/estudos-biblicos', cor: '#0284c7' },
  PONTO: { label: 'Ponto de Estudo', path: '/relatorios/pontos-estudo', cor: '#0f766e' },
  CLASSE: { label: 'Classe Bíblica', path: '/relatorios/classes-biblicas/registros', cor: '#ea580c' },
};
const temEstudoNaoRegistradoDupla = (dupla) => (
  (dupla?.estudoAtualEmAndamento === true || dupla?.atividadeDupla === 'ATIVA' || dupla?.statusEstudoBiblico === 'ATIVO')
  && getEstudosDupla(dupla) === 0
);

const BadgeEstudoDupla = ({ dupla }) => {
  const estudos = getEstudosDupla(dupla);
  if (estudos > 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
        {estudos} estudo{estudos === 1 ? '' : 's'} bíblico{estudos === 1 ? '' : 's'}
      </span>
    );
  }
  if (temEstudoNaoRegistradoDupla(dupla)) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
        Tem estudo, mas não cadastrado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
      Sem estudo bíblico
    </span>
  );
};

const InfoDupla = ({ label, valor, onClick }) => {
  const Wrapper = onClick ? 'button' : 'div';
  return (
  <Wrapper
    type={onClick ? 'button' : undefined}
    onClick={onClick}
    className={`w-full py-1.5 border-b border-gray-50 last:border-b-0 text-left ${onClick ? 'rounded-md px-1 -mx-1 transition-colors hover:bg-[#1A3A6B]/5 focus:outline-none focus:ring-2 focus:ring-[#C9963A]/30' : ''}`}
  >
    <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold">{label}</p>
    <p className="text-xs text-gray-700 font-medium mt-0.5 break-words">{valor || 'Não informado'}</p>
  </Wrapper>
  );
};

const ModalDupla = ({ dupla, onClose, onNavigate, prefix = '' }) => {
  if (!dupla) return null;
  const cor = statusColors[dupla.status] || '#9ca3af';
  const label = statusLabels[dupla.status] || dupla.status;
  const estudosLista = Array.isArray(dupla.estudosBiblicos) ? dupla.estudosBiblicos : [];
  const estudosIndividuais = estudosLista.filter((estudo) => (estudo.tipoEstudo || 'UNICO') === 'UNICO');
  const classesLista = estudosLista.filter((estudo) => estudo.tipoEstudo === 'CLASSE');
  const pontosLista = estudosLista.filter((estudo) => estudo.tipoEstudo === 'PONTO');
  const estudos = estudosLista.length > 0 ? estudosIndividuais.length : (dupla._count?.estudosBiblicos ?? 0);
  const classesB = estudosLista.length > 0 ? classesLista.length : (dupla._count?.acompanhamentos ?? dupla.acompanhamentos?.length ?? 0);
  const classe = dupla.classificacaoDupla || '';
  const igrejaId = dupla.igreja?.id || dupla.igrejaId || '';
  const abrirListaOuUnico = (lista, basePath) => {
    if (lista.length === 1) {
      onNavigate?.(`${prefix}${basePath}/${lista[0].id}`);
      return;
    }
    onNavigate?.(`${prefix}${basePath}?duplaId=${dupla.id}`);
  };
  const abrirEstudos = () => abrirListaOuUnico(estudosIndividuais, '/relatorios/estudos-biblicos');
  const abrirClasses = () => abrirListaOuUnico(classesLista, '/relatorios/classes-biblicas/registros');
  const abrirClassificacao = () => onNavigate?.(`${prefix}/duplas?classe=${classe}${igrejaId ? `&igrejaId=${igrejaId}` : ''}`);
  const abrirEstudo = (estudo) => {
    const info = tipoEstudoInfo[estudo.tipoEstudo || 'UNICO'] || tipoEstudoInfo.UNICO;
    onNavigate?.(`${prefix}${info.path}/${estudo.id}`);
  };

  const Membro = ({ titulo, foto, nome, dados }) => (
    <div className="bg-[#F4F5F7] rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <FotoPessoaIgreja src={foto} nome={nome} className="w-12 h-12 rounded-full flex-shrink-0 shadow-sm" />
        <div className="min-w-0">
          <p className="text-[9px] uppercase tracking-wider text-[#C9963A] font-bold">{titulo}</p>
          <p className="text-sm font-bold text-[#1A3A6B] truncate">{nome || 'Não informado'}</p>
        </div>
      </div>
      <div className="space-y-0">
        {dados.map(({ label: lb, valor }) => (
          <InfoDupla key={lb} label={lb} valor={valor} />
        ))}
      </div>
    </div>
  );

  const formatarData = (valor) => {
    if (!valor) return '';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const EstudoCard = ({ estudo }) => {
    const info = tipoEstudoInfo[estudo.tipoEstudo || 'UNICO'] || tipoEstudoInfo.UNICO;
    const progresso = progressoEstudo(estudo);
    const totalLicoes = totalLicoesSerie(estudo.serie);
    const participantes = ['PONTO', 'CLASSE'].includes(estudo.tipoEstudo)
      ? (estudo.participantes?.length || 0)
      : 1;

    return (
      <button
        type="button"
        onClick={() => abrirEstudo(estudo)}
        className="group w-full rounded-xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C9963A]/45 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#C9963A]/30"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: `${info.cor}18`, color: info.cor }}
              >
                {info.label}
              </span>
              <span className="text-[10px] font-semibold text-gray-400">
                Atualizado em {formatarData(estudo.atualizadoEm) || 'Não informado'}
              </span>
            </div>
            <h4 className="font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]">
              {estudo.nomeEstudante || 'Estudante sem nome'}
            </h4>
            <p className="mt-1 text-xs text-gray-500">
              {getSerieNome(estudo.serie)} · {getLicaoLabel(estudo.serie, estudo.licaoAtual)}
            </p>
          </div>
          <div className="rounded-lg bg-[#F4F5F7] px-3 py-2 text-center sm:min-w-24">
            <p className="text-lg font-bold text-[#1A3A6B]">{progresso}%</p>
            <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Progressão</p>
          </div>
        </div>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold text-gray-400">
            <span>Onde parou</span>
            <span>{totalLicoes ? `${estudo.licaoAtual || 0}/${totalLicoes}` : `Lição ${estudo.licaoAtual || 0}`}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progresso}%`, background: `linear-gradient(90deg, ${info.cor}, #C9963A)` }}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Dia/horário</span>
            <p className="font-semibold text-gray-700">{estudo.diaEstudo || 'Não informado'}{estudo.horarioEstudo ? ` às ${estudo.horarioEstudo}` : ''}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Participantes</span>
            <p className="font-semibold text-gray-700">{participantes}</p>
          </div>
          <div>
            <span className="text-[9px] font-bold uppercase tracking-wide text-gray-400">Contato</span>
            <p className="font-semibold text-gray-700 break-all">{estudo.whatsapp || 'Não informado'}</p>
          </div>
        </div>

        {estudo.observacoes && (
          <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/70 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wide text-amber-700">Observações</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-700">{estudo.observacoes}</p>
          </div>
        )}

        <p className="mt-3 text-right text-[9px] font-semibold text-gray-300 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          Abrir acompanhamento →
        </p>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#0B1220]/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-1 flex-shrink-0">
              <FotoPessoaIgreja src={dupla.fotoLiderPreview} nome={dupla.liderNome} className="w-10 h-10 rounded-full shadow" />
              <FotoPessoaIgreja src={dupla.fotoMembro2Preview} nome={dupla.membro2Nome} className="w-10 h-10 rounded-full shadow -ml-3 border-2 border-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-wider text-[#C9963A] font-bold">Dupla Missionária</p>
              <h3 className="text-base font-bold text-[#1A3A6B] truncate" style={{ fontFamily: 'Georgia, serif' }}>
                {dupla.liderNome || 'Sem nome'} + {dupla.membro2Nome || 'Sem nome'}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={{ background: cor + '18', color: cor }}>
              {label}
            </span>
            <button type="button" onClick={onClose} className="rounded-full border border-gray-200 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-[#1A3A6B] hover:border-[#1A3A6B]/40 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Indicadores */}
        <div className="flex-shrink-0 grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
          {[
            { icon: '📖', label: 'Estudos Bíblicos', val: estudos, hint: estudosIndividuais.length === 1 ? 'Abrir estudo' : 'Ver estudos' },
            { icon: '🏫', label: 'Classes Bíblicas', val: classesB, hint: classesLista.length === 1 ? 'Abrir classe' : 'Ver classes' },
            { icon: '🏆', label: 'Classificação', val: dupla.classificacaoDupla ? `Classe ${dupla.classificacaoDupla}` : 'Sem classe', hint: 'Filtrar duplas' },
          ].map(({ icon, label: lb, val, hint }, index) => {
            const onClick = index === 0 ? abrirEstudos : index === 1 ? abrirClasses : (classe ? abrirClassificacao : undefined);
            return (
            <button
              key={lb}
              type="button"
              onClick={onClick}
              disabled={!onClick}
              className="group bg-white px-4 py-3 text-center transition-all duration-300 hover:bg-[#1A3A6B]/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#C9963A]/30 disabled:cursor-default disabled:hover:bg-white"
            >
              <p className="text-lg transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110">{icon}</p>
              <p className="text-lg font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]">{val}</p>
              <p className="text-[9px] uppercase tracking-wider text-gray-400 font-bold mt-0.5">{lb}</p>
              <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-[#1A3A6B] opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {hint}
              </p>
            </button>
          );
          })}
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white">
          {/* Info da dupla */}
          <div className="grid grid-cols-2 gap-3">
            <InfoDupla label="Classificação da dupla" valor={dupla.classificacaoDupla ? `Classe ${dupla.classificacaoDupla}` : 'Sem classificação'} onClick={classe ? abrirClassificacao : undefined} />
            <InfoDupla label="Atividade da dupla" valor={dupla.atividadeDupla === 'ATIVA' ? 'Ativa' : dupla.atividadeDupla === 'INATIVA' ? 'Inativa' : 'Não informado'} />
            <InfoDupla label="Projeto" valor={dupla.tipoProjeto ? { CASA_A_CASA: 'Casa a Casa', ESTUDO_BIBLICO: 'Estudo Bíblico', PEQUENOS_GRUPOS: 'Pequenos Grupos', ACAO_SOCIAL: 'Ação Social', EVANGELISMO_PUBLICO: 'Classe Bíblica' }[dupla.tipoProjeto] || dupla.tipoProjeto : ''} />
            <InfoDupla label="Batismos" valor={dupla.batismos ?? dupla._count?.batismos ?? 0} />
            <InfoDupla label="Igreja" valor={dupla.igreja?.nome} />
            <InfoDupla label="Distrito" valor={dupla.igreja?.distrito?.nome} />
          </div>

          {/* Membros */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Membro
              titulo="Membro 1 — Líder"
              foto={dupla.fotoLiderPreview}
              nome={dupla.liderNome}
              dados={[
                { label: 'WhatsApp', valor: <WhatsAppLinkIgreja numero={dupla.whatsappLider} /> },
                { label: 'Igreja', valor: dupla.igrejaLider?.nome || dupla.igreja?.nome },
                { label: 'Distrito', valor: dupla.igrejaLider?.distrito?.nome || dupla.igreja?.distrito?.nome },
                { label: 'Data de nascimento', valor: formatarData(dupla.dataNascimentoLider) },
                { label: 'Endereço', valor: dupla.enderecoLider },
                { label: 'Data de batismo', valor: formatarData(dupla.dataBatismoLider) },
              ]}
            />
            <Membro
              titulo="Membro 2"
              foto={dupla.fotoMembro2Preview}
              nome={dupla.membro2Nome}
              dados={[
                { label: 'WhatsApp', valor: <WhatsAppLinkIgreja numero={dupla.whatsappMembro2} /> },
                { label: 'E-mail', valor: dupla.emailMembro2 },
                { label: 'Igreja', valor: dupla.igrejaMembro2?.nome || dupla.igreja?.nome },
                { label: 'Distrito', valor: dupla.igrejaMembro2?.distrito?.nome || dupla.igreja?.distrito?.nome },
                { label: 'Data de nascimento', valor: formatarData(dupla.dataNascimentoMembro2) },
                { label: 'Endereço', valor: dupla.enderecoMembro2 },
                { label: 'Data de batismo', valor: formatarData(dupla.dataBatismoMembro2) },
              ]}
            />
          </div>

          <section className="rounded-xl border border-gray-100 bg-[#F8FAFC] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#C9963A]">Estudos da Dupla</p>
                <h4 className="text-sm font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  Progressão e acompanhamento
                </h4>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-gray-500 shadow-sm">
                {estudosLista.length} registro{estudosLista.length === 1 ? '' : 's'}
              </span>
            </div>

            {estudosLista.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                Nenhum estudo bíblico, ponto de estudo ou classe bíblica cadastrado para esta dupla.
              </div>
            ) : (
              <div className="space-y-3">
                {estudosLista.map((estudo) => (
                  <EstudoCard key={estudo.id} estudo={estudo} />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default function IgrejaCapa({ igreja, onNovaDupla }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const prefix = location.pathname.startsWith('/direto') ? '/direto' : '';
  const somenteVisualizacao = usuario?.perfil === PERFIS.DUPLA_MISSIONARIA;
  const [igrejaAtual, setIgrejaAtual] = useState(igreja);
  const [relatorio, setRelatorio] = useState(null);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);
  const [fotos, setFotos] = useState({});
  const [editando, setEditando] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  // ── Duplas da Igreja ──────────────────────────────────────────────────────
  const [duplasIgreja, setDuplasIgreja] = useState([]);
  const [carregandoDuplas, setCarregandoDuplas] = useState(false);
  const [duplaSelecionada, setDuplaSelecionada] = useState(null);

  const navegarDoModal = (rota) => {
    setDuplaSelecionada(null);
    navigate(rota);
  };

  useEffect(() => {
    let ativo = true;
    if (!igreja?.id) return undefined;

    setIgrejaAtual(igreja);
    setRelatorio(null);
    setFotos({});
    setCarregandoRelatorio(true);
    setDuplasIgreja([]);

    api.get(`/relatorios/por-igreja/${igreja.id}`)
      .then((res) => { if (ativo) setRelatorio(res.data); })
      .catch(() => { if (ativo) setRelatorio(null); })
      .finally(() => { if (ativo) setCarregandoRelatorio(false); });

    // Carregar duplas da igreja
    setCarregandoDuplas(true);
    api.get('/duplas', { params: { igrejaId: igreja.id } })
      .then(async (res) => {
        if (!ativo) return;
        const lista = Array.isArray(res.data) ? res.data : [];
        const comFotos = await Promise.all(lista.map(async (dupla) => {
          const [fotoLiderPreview, fotoMembro2Preview] = await Promise.all([
            FotoService.resolverFotoParaPreview(dupla.fotoLider).catch(() => ''),
            FotoService.resolverFotoParaPreview(dupla.fotoMembro2).catch(() => ''),
          ]);
          return { ...dupla, fotoLiderPreview, fotoMembro2Preview };
        }));
        if (ativo) setDuplasIgreja(comFotos);
      })
      .catch(() => {})
      .finally(() => { if (ativo) setCarregandoDuplas(false); });

    const refs = {
      diretor: igreja.fotoDiretorMinisterioPessoal,
      pastor: igreja.distrito?.fotoPastor,
      coordenador: igreja.fotoCoordInteressados,
      igreja: igreja.fotoIgreja,
    };

    Promise.all(Object.entries(refs).map(async ([chave, ref]) => [
      chave,
      await FotoService.resolverFotoParaPreview(ref).catch(() => ''),
    ])).then((pares) => { if (ativo) setFotos(Object.fromEntries(pares)); });

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
            {!somenteVisualizacao && (
              <button type="button" onClick={() => setEditando(true)} className="btn-outline text-sm">
                Editar Dados
              </button>
            )}
            {!somenteVisualizacao && onNovaDupla && (
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
        <ColunaPessoa titulo="Diretor de Ministério Pessoal" cargo="Coluna 1" pessoa={diretor} foto={fotos.diretor} onFotoClick={setFotoAmpliada} />
        <ColunaPessoa titulo="Pastor" cargo={igrejaAtual.distrito?.cargoPastor || 'Coluna 2'} pessoa={pastor} foto={fotos.pastor} onFotoClick={setFotoAmpliada} />
        <ColunaPessoa titulo="Coordenador Regional" cargo={igrejaAtual.cargoCoordInteressados || 'Coluna 3'} pessoa={coordenador} foto={fotos.coordenador} onFotoClick={setFotoAmpliada} />

        <section className="group bg-white rounded-lg border border-gray-100 shadow-sm p-4 min-w-0 transition-all duration-300 hover:-translate-y-1 hover:border-[#C9963A]/45 hover:shadow-xl">
          <div className="mb-3 min-h-20">
            <p className="text-[10px] uppercase tracking-wider text-[#C9963A] font-bold">Coluna 4</p>
            <h3 className="text-base font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>Dados da Igreja</h3>
          </div>
          <FotoBloco
            src={fotos.igreja}
            alt={igrejaAtual.nome}
            tipo="templo"
            onClick={() => setFotoAmpliada({ src: fotos.igreja, titulo: 'Dados da Igreja', nome: igrejaAtual.nome })}
          />
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

      {/* ── Seção: Duplas Missionárias da Igreja ─────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#C9963A] font-bold">Duplas Missionárias</p>
            <h3 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              {igrejaAtual.nome}
            </h3>
          </div>
          <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">
            {carregandoDuplas ? '...' : `${duplasIgreja.length} dupla${duplasIgreja.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        {carregandoDuplas ? (
          <div className="flex items-center justify-center py-12">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-[3px] border-[#1A3A6B]/20" />
              <div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
            </div>
          </div>
        ) : duplasIgreja.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-medium text-sm">Nenhuma dupla cadastrada nesta igreja.</p>
            {!somenteVisualizacao && onNovaDupla && (
              <button type="button" onClick={onNovaDupla} className="btn-primary mt-4 text-sm px-5 py-2">
                Cadastrar Dupla
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {duplasIgreja.map((dupla) => {
              const cor = statusColors[dupla.status] || '#9ca3af';
              const label = statusLabels[dupla.status] || dupla.status;
              const estudos = getEstudosDupla(dupla);
              const classesB = dupla._count?.acompanhamentos ?? dupla.acompanhamentos?.length ?? 0;

              return (
                <button
                  type="button"
                  key={dupla.id}
                  onClick={() => setDuplaSelecionada(dupla)}
                  className="group text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#C9963A]/40 hover:-translate-y-0.5 transition-all duration-200 overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#C9963A]/30"
                >
                  {/* Faixa de status */}
                  <div className="h-1 w-full" style={{ background: cor }} />

                  <div className="p-4">
                    {/* Fotos + nomes */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center flex-shrink-0">
                        <FotoPessoaIgreja
                          src={dupla.fotoLiderPreview}
                          nome={dupla.liderNome}
                          className="w-10 h-10 rounded-full shadow"
                        />
                        <FotoPessoaIgreja
                          src={dupla.fotoMembro2Preview}
                          nome={dupla.membro2Nome}
                          className="w-10 h-10 rounded-full shadow -ml-3 border-2 border-white"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[#1A3A6B] truncate group-hover:text-[#C9963A] transition-colors">
                          {dupla.liderNome || 'Sem nome'}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          + {dupla.membro2Nome || 'Sem nome'}
                        </p>
                      </div>
                      <span
                        className="flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cor + '18', color: cor }}
                      >
                        {label}
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap items-center gap-1.5">
                      <BadgeEstudoDupla dupla={dupla} />
                      {dupla.classificacaoDupla && (
                        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                          Classe {dupla.classificacaoDupla} - {dupla.atividadeDupla === 'ATIVA' ? 'Ativa' : 'Inativa'}
                        </span>
                      )}
                    </div>

                    {/* Indicadores */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-50">
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#1A3A6B]">{estudos}</p>
                        <p className="text-[8px] uppercase tracking-wide text-gray-400 font-bold leading-tight">Estudos</p>
                      </div>
                      <div className="text-center border-x border-gray-50">
                        <p className="text-sm font-bold text-[#1A3A6B]">{classesB}</p>
                        <p className="text-[8px] uppercase tracking-wide text-gray-400 font-bold leading-tight">Classes B.</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold text-[#1A3A6B]">
                          {dupla.classificacaoDupla ? `C${dupla.classificacaoDupla}` : '—'}
                        </p>
                        <p className="text-[8px] uppercase tracking-wide text-gray-400 font-bold leading-tight">Classif.</p>
                      </div>
                    </div>

                    {/* Hint */}
                    <p className="text-[9px] text-gray-300 text-right mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      Clique para ver detalhes →
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

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

      {duplaSelecionada && (
        <ModalDupla dupla={duplaSelecionada} onClose={() => setDuplaSelecionada(null)} onNavigate={navegarDoModal} prefix={prefix} />
      )}

      {fotoAmpliada && (
        <div
          className="fixed inset-0 z-[60] bg-[#0B1220]/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setFotoAmpliada(null)}
        >
          <div className="w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-3 text-white">
              <div>
                <p className="text-xs uppercase tracking-wider text-[#D8A23A] font-bold">{fotoAmpliada.titulo}</p>
                <h3 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>{fotoAmpliada.nome}</h3>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                onClick={() => setFotoAmpliada(null)}
              >
                Fechar
              </button>
            </div>
            <div className="max-h-[78vh] overflow-hidden rounded-xl bg-white/5 shadow-2xl ring-1 ring-white/15">
              <img
                src={fotoAmpliada.src}
                alt={fotoAmpliada.nome || 'Imagem ampliada'}
                className="mx-auto max-h-[78vh] w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
