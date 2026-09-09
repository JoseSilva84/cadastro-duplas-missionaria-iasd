import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { exportarLeadPdf, resumoOperacionalLead } from '../lib/pdfNovoTempo';
import { ICONE_IGREJA_NT } from '../lib/iconesMapaNovoTempo';

const PRIORIDADES = {
  Hot: ['Quente', '#dc2626'],
  Warm: ['Potencial', '#f97316'],
  Cool: ['Morno', '#2563eb'],
  Cold: ['Frio', '#334155'],
};

const normalizar = (valor) => String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const texto = (valor, fallback = 'Não informado') => valor === null || valor === undefined || valor === '' ? fallback : String(valor);
const simNao = (valor) => valor ? 'Sim' : 'Não';

function coordenadasValidas(item) {
  const latitude = Number(item?.latitude);
  const longitude = Number(item?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

function ehAproximada(item) {
  return /aproxim|fallback/i.test(`${item?.geoPrecisao || ''} ${item?.geoOrigem || ''}`);
}

function dataCurta(valor) {
  if (!valor) return 'Não informada';
  const iso = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? texto(valor) : data.toLocaleDateString('pt-BR');
}

function Campo({ rotulo, valor }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">{rotulo}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-900">{texto(valor)}</dd>
    </div>
  );
}

export default function ModalLeadNovoTempo({ lead, igrejas = [], onFechar }) {
  useEffect(() => {
    if (!lead) return undefined;
    const aoPressionar = (evento) => { if (evento.key === 'Escape') onFechar(); };
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', aoPressionar);
    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', aoPressionar);
    };
  }, [lead, onFechar]);

  const igrejasDoDistrito = useMemo(() => {
    if (!lead) return [];
    return igrejas.filter((igreja) => normalizar(igreja.distrito) === normalizar(lead.distrito));
  }, [igrejas, lead]);

  if (!lead) return null;

  const [prioridade, corPrioridade] = PRIORIDADES[lead.prioridade] || ['Sem prioridade', '#64748b'];
  const temLocalizacao = coordenadasValidas(lead);
  const centro = temLocalizacao ? [Number(lead.latitude), Number(lead.longitude)] : [-23.5505, -46.6333];
  const igrejasComLocalizacao = igrejasDoDistrito.filter(coordenadasValidas).slice(0, 30);
  const osm = temLocalizacao ? `https://www.openstreetmap.org/?mlat=${lead.latitude}&mlon=${lead.longitude}#map=15/${lead.latitude}/${lead.longitude}` : null;
  const camposExtras = Object.entries(lead.camposAdicionais || {});

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="titulo-modal-lead" className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm sm:p-6" onMouseDown={(evento) => { if (evento.target === evento.currentTarget) onFechar(); }}>
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-slate-100 shadow-2xl">
        <header className="flex flex-col gap-5 bg-gradient-to-r from-[#102044] via-[#1742a0] to-[#245be4] p-6 text-white sm:flex-row sm:items-start sm:justify-between sm:p-8">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">Detalhes do lead</p>
            <h2 id="titulo-modal-lead" className="mt-3 break-words text-2xl font-bold sm:text-3xl">{lead.nome}</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold uppercase">
              <span className="rounded-full px-3 py-1.5 text-white shadow" style={{ background: corPrioridade }}>{prioridade}</span>
              <span className="rounded-full border border-white/30 px-3 py-1.5">{texto(lead.distrito)}</span>
              <span className="rounded-full border border-white/30 px-3 py-1.5">Score {texto(lead.pontuacao, '0')}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" onClick={() => exportarLeadPdf(lead, igrejasDoDistrito)} className="rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20">Exportar PDF</button>
            <button type="button" onClick={onFechar} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-100">Fechar</button>
          </div>
        </header>

        <div className="overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
            <section>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Todos os dados</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Campo rotulo="Nome" valor={lead.nome} />
                <Campo rotulo="WhatsApp" valor={lead.whatsapp} />
                <Campo rotulo="E-mail" valor={lead.email} />
                <Campo rotulo="Distrito" valor={lead.distrito} />
                <Campo rotulo="Endereço completo" valor={lead.endereco} />
                <Campo rotulo="Cidade" valor={lead.cidade} />
                <Campo rotulo="Bairro" valor={lead.bairro} />
                <Campo rotulo="Idade" valor={lead.idade} />
                <Campo rotulo="Data de nascimento" valor={dataCurta(lead.dataNascimento)} />
                <Campo rotulo="Gênero" valor={lead.genero} />
                <Campo rotulo="Religião" valor={lead.religiao} />
                <Campo rotulo="VIP histórico" valor={simNao(lead.vipHistorico)} />
                <Campo rotulo="Estudo ativo" valor={simNao(lead.estudoAtivo)} />
                <Campo rotulo="Material principal" valor={lead.material} />
                <Campo rotulo="Origem" valor={lead.origem} />
                <Campo rotulo="Status" valor={lead.status} />
                <Campo rotulo="Canal" valor={lead.canal} />
                <Campo rotulo="ID" valor={lead.id} />
              </dl>
              {lead.observacoes && <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4"><h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Observações</h4><p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{lead.observacoes}</p></div>}
              {!!camposExtras.length && <details className="mt-3 rounded-xl border border-slate-200 bg-white p-4"><summary className="cursor-pointer text-sm font-bold text-[#1A3A6B]">Demais informações ({camposExtras.length})</summary><dl className="mt-4 grid gap-3 sm:grid-cols-2">{camposExtras.map(([nome, valor]) => <Campo key={nome} rotulo={nome} valor={typeof valor === 'object' ? JSON.stringify(valor) : valor} />)}</dl></details>}
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Resumo operacional</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-700">{resumoOperacionalLead(lead)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {lead.whatsapp && <a href={`https://wa.me/${String(lead.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">Abrir WhatsApp</a>}
                  {lead.email && <a href={`mailto:${lead.email}`} className="rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100">Enviar e-mail</a>}
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="p-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Localização do lead</h3>
                  <p className="mt-2 font-semibold text-slate-900">{lead.endereco || [lead.bairro, lead.cidade].filter(Boolean).join(' - ') || 'Endereço não informado'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-100 px-3 py-2" style={{ color: corPrioridade }}>{prioridade}</span>
                    <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">Igrejas {igrejasDoDistrito.length}</span>
                    {osm && <a href={osm} target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">Abrir no OSM</a>}
                  </div>
                </div>
                <div className="h-64 border-t border-slate-200">
                  {temLocalizacao ? (
                    <MapContainer center={centro} zoom={14} scrollWheelZoom={false} className="h-full w-full">
                      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <CircleMarker center={centro} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: corPrioridade, fillOpacity: 1 }}><Popup><strong>{lead.nome}</strong><br />{prioridade}</Popup></CircleMarker>
                      {igrejasComLocalizacao.map((igreja, indice) => <Marker key={`${igreja.nome}-${indice}`} position={[Number(igreja.latitude), Number(igreja.longitude)]} icon={ICONE_IGREJA_NT} zIndexOffset={1000}><Popup><strong>{igreja.nome}</strong><br />{igreja.distrito}<br />{igreja.endereco || igreja.geoNomeExibicao || 'Endereço não informado'}<br />{ehAproximada(igreja) ? 'Coordenada aproximada' : 'Coordenada exata'}</Popup></Marker>)}
                    </MapContainer>
                  ) : <div className="grid h-full place-items-center bg-slate-50 px-6 text-center text-sm text-slate-500">Este lead não possui coordenadas válidas para exibição no mapa.</div>}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}
