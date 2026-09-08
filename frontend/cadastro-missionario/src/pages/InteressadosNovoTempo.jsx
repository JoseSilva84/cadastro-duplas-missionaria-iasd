import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import BackButton from '../components/BackButton';
import LoadingState from '../components/LoadingState';

const icones = {
  pessoas: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1m-3 6H3v-2a4 4 0 014-4h3a4 4 0 014 4v2zm-2-9a4 4 0 100-8 4 4 0 000 8zm7-1a3 3 0 100-6" />
    </svg>
  ),
  whatsapp: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 01-13.7 7.66L3 21l1.34-4.3A9 9 0 1121 12z" />
    </svg>
  ),
  vip: (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 16L3 6l5 4 4-6 4 6 5-4-2 10H5zm0 4h14" />
    </svg>
  ),
};

const numero = (valor) => new Intl.NumberFormat('pt-BR').format(Number(valor) || 0);

const dataHora = (valor) => {
  if (!valor) return 'Não informado';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? String(valor) : data.toLocaleString('pt-BR');
};

const formatarWhatsapp = (valor) => {
  const digitos = String(valor || '').replace(/\D/g, '');
  if (!digitos) return 'Não informado';
  const nacional = digitos.startsWith('55') && digitos.length >= 12 ? digitos.slice(2) : digitos;
  if (nacional.length === 11) return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 7)}-${nacional.slice(7)}`;
  if (nacional.length === 10) return `(${nacional.slice(0, 2)}) ${nacional.slice(2, 6)}-${nacional.slice(6)}`;
  return valor;
};

function Cabecalho({ distrito, isDireto, atualizadoEm, onAtualizar, atualizando }) {
  return (
    <div className={isDireto ? 'flex-shrink-0 border-b border-gray-200 bg-white px-4 py-4 sm:px-6' : 'mb-7'}>
      {distrito && <BackButton fallbackTo={isDireto ? '/direto/interessados-nt' : '/interessados-nt'} className="mb-3" />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-sm font-semibold uppercase tracking-wider text-[#C9963A]">Contatos Novo Tempo</p>
          </div>
          <h1 className="text-2xl font-bold text-[#1A3A6B] sm:text-3xl" style={{ fontFamily: 'Georgia, serif' }}>
            {distrito ? `Interessados — ${distrito}` : 'Interessados NT'}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {distrito ? 'Informações dos leads interessados deste distrito.' : 'Visão administrativa dos leads recebidos pela Novo Tempo.'}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {atualizadoEm && <p className="text-xs text-gray-400">Atualizado em {dataHora(atualizadoEm)}</p>}
          <button type="button" className="btn-outline px-4 py-2 text-sm" disabled={atualizando} onClick={onAtualizar}>
            {atualizando ? 'Atualizando...' : 'Atualizar dados'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CardMetrica({ titulo, valor, detalhe, cor, icone }) {
  return (
    <div className="card relative overflow-hidden">
      <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: cor }} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{titulo}</p>
          <p className="mt-2 text-3xl font-bold" style={{ color: cor }}>{numero(valor)}</p>
          <p className="mt-1 text-sm text-gray-400">{detalhe}</p>
        </div>
        <span className="rounded-xl p-3" style={{ color: cor, backgroundColor: `${cor}16` }}>{icone}</span>
      </div>
    </div>
  );
}

function CardsResumo({ resumo }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <CardMetrica titulo="Leads interessados" valor={resumo?.totalInteressados} detalhe="Total recebido" cor="#1A3A6B" icone={icones.pessoas} />
      <CardMetrica titulo="Com WhatsApp" valor={resumo?.comWhatsapp} detalhe="Contatos com número válido" cor="#16845B" icone={icones.whatsapp} />
      <CardMetrica titulo="VIPs históricos" valor={resumo?.vipsHistoricos} detalhe="Leads identificados como VIP" cor="#C9963A" icone={icones.vip} />
    </div>
  );
}

function AvisoErro({ erro }) {
  return (
    <div className="card border border-red-100 bg-red-50/40">
      <h2 className="text-base font-bold text-red-700">Não foi possível carregar os contatos</h2>
      <p className="mt-2 text-sm text-red-600">{erro}</p>
      {erro.includes('ainda não configurada') && (
        <p className="mt-3 text-xs leading-relaxed text-gray-600">
          Configure a credencial somente no backend, usando <code>SEVENFLOW_API_TOKEN</code> ou <code>SEVENFLOW_LICENSE_KEY</code>, e reinicie o serviço.
        </p>
      )}
    </div>
  );
}

function VisaoDistritos({ dados, prefix }) {
  const navigate = useNavigate();
  return (
    <section className="card p-0">
      <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-bold text-[#1A3A6B]">Leads por distrito</h2>
        <p className="mt-1 text-sm text-gray-400">Clique em um distrito para abrir todos os dados dos interessados.</p>
      </div>
      <div className="divide-y divide-gray-100">
        {(dados.distritos || []).map((distrito) => (
          <button
            key={distrito.nome}
            type="button"
            onClick={() => navigate(`${prefix}/interessados-nt/distritos/${encodeURIComponent(distrito.nome)}`)}
            className="group grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-[#F8FAFC] sm:grid-cols-[1fr_70px_120px_90px_32px] sm:px-6"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-[#1A3A6B] group-hover:text-[#C9963A]">{distrito.nome}</p>
              <p className="mt-0.5 text-xs text-gray-400 sm:hidden">{numero(distrito.comWhatsapp)} com WhatsApp · {numero(distrito.vipsHistoricos)} VIPs</p>
            </div>
            <p className="text-right text-lg font-bold text-[#1A3A6B]">{numero(distrito.total)}</p>
            <p className="hidden text-center text-sm font-semibold text-emerald-700 sm:block">{numero(distrito.comWhatsapp)} WhatsApp</p>
            <p className="hidden text-center text-sm font-semibold text-[#C9963A] sm:block">{numero(distrito.vipsHistoricos)} VIPs</p>
            <svg className="hidden h-5 w-5 text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[#C9963A] sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
        {!dados.distritos?.length && <p className="px-6 py-10 text-center text-sm text-gray-400">Nenhum distrito encontrado nos contatos.</p>}
      </div>
    </section>
  );
}

function Campo({ rotulo, valor }) {
  if (valor === undefined || valor === null || valor === '') return null;
  const exibido = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{rotulo}</dt>
      <dd className="mt-1 break-words text-sm text-gray-700">{exibido}</dd>
    </div>
  );
}

function LeadCard({ lead }) {
  const camposExtras = Object.entries(lead.camposAdicionais || {});
  return (
    <article className="card p-0">
      <div className="flex flex-col gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-[#1A3A6B]">{lead.nome}</h2>
            {lead.vipHistorico && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">VIP histórico</span>}
          </div>
          <p className="mt-1 text-sm text-gray-400">ID {lead.id || 'não informado'}</p>
        </div>
        {lead.whatsapp && (
          <a
            href={`https://wa.me/${String(lead.whatsapp).replace(/\D/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Abrir WhatsApp
          </a>
        )}
      </div>
      <dl className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="WhatsApp" valor={formatarWhatsapp(lead.whatsapp)} />
        <Campo rotulo="E-mail" valor={lead.email || 'Não informado'} />
        <Campo rotulo="Status" valor={lead.status || 'Não informado'} />
        <Campo rotulo="Origem" valor={lead.origem || 'Não informada'} />
        <Campo rotulo="Criado em" valor={dataHora(lead.criadoEm)} />
        <Campo rotulo="Atualizado em" valor={dataHora(lead.atualizadoEm)} />
        <Campo rotulo="Tags" valor={lead.tags?.length ? lead.tags.join(', ') : 'Nenhuma'} />
        <Campo rotulo="Observações" valor={lead.observacoes || 'Nenhuma'} />
      </dl>
      {camposExtras.length > 0 && (
        <details className="border-t border-gray-100 px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#1A3A6B]">Ver demais informações ({camposExtras.length})</summary>
          <dl className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {camposExtras.map(([nome, valor]) => <Campo key={nome} rotulo={nome} valor={valor} />)}
          </dl>
        </details>
      )}
    </article>
  );
}

function VisaoLeads({ dados }) {
  const [busca, setBusca] = useState('');
  const [somenteWhatsapp, setSomenteWhatsapp] = useState(false);
  const [somenteVip, setSomenteVip] = useState(false);

  const leads = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return (dados.leads || []).filter((lead) => {
      const corresponde = !termo || [lead.nome, lead.whatsapp, lead.email, lead.origem, ...(lead.tags || [])]
        .join(' ')
        .toLocaleLowerCase('pt-BR')
        .includes(termo);
      return corresponde && (!somenteWhatsapp || lead.whatsapp) && (!somenteVip || lead.vipHistorico);
    });
  }, [busca, dados.leads, somenteVip, somenteWhatsapp]);

  return (
    <>
      <div className="card flex flex-col gap-3 sm:flex-row sm:items-center">
        <input className="input-field flex-1" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome, WhatsApp, e-mail, origem ou tag..." />
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-600">
          <input type="checkbox" checked={somenteWhatsapp} onChange={(e) => setSomenteWhatsapp(e.target.checked)} />
          Com WhatsApp
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-600">
          <input type="checkbox" checked={somenteVip} onChange={(e) => setSomenteVip(e.target.checked)} />
          VIPs históricos
        </label>
      </div>
      <p className="text-sm text-gray-400">Exibindo {numero(leads.length)} de {numero(dados.leads?.length)} leads.</p>
      <div className="space-y-4">
        {leads.map((lead) => <LeadCard key={lead.id || `${lead.nome}-${lead.whatsapp}`} lead={lead} />)}
        {!leads.length && <div className="card py-10 text-center text-sm text-gray-400">Nenhum lead corresponde aos filtros.</div>}
      </div>
    </>
  );
}

export default function InteressadosNovoTempo() {
  const { distrito } = useParams();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const prefix = isDireto ? '/direto' : '';
  const nomeDistrito = distrito || '';
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = async (forcar = false) => {
    if (forcar) setAtualizando(true);
    else setCarregando(true);
    setErro('');
    try {
      const caminho = nomeDistrito
        ? `/interessados-nt/distritos/${encodeURIComponent(nomeDistrito)}`
        : '/interessados-nt/resumo';
      const { data } = await api.get(caminho, { params: forcar ? { atualizar: 1 } : undefined });
      setDados(data);
    } catch (falha) {
      setErro(falha.response?.data?.erro || 'Erro inesperado ao consultar a integração.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  useEffect(() => {
    carregar();
    // O nome do distrito define integralmente a consulta desta tela.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeDistrito]);

  if (carregando) return <LoadingState mensagem="Carregando interessados do Novo Tempo..." />;

  return (
    <div className={isDireto ? 'flex h-full flex-col bg-[#F4F5F7] animate-fade-in' : 'mx-auto max-w-7xl p-4 animate-fade-in sm:p-6 lg:p-8'}>
      <Cabecalho distrito={dados?.distrito || nomeDistrito} isDireto={isDireto} atualizadoEm={dados?.atualizadoEm} onAtualizar={() => carregar(true)} atualizando={atualizando} />
      <div className={isDireto ? 'flex-1 space-y-5 overflow-y-auto p-4 sm:p-6' : 'space-y-5'}>
        {erro && <AvisoErro erro={erro} />}
        {dados && <CardsResumo resumo={dados.resumo} />}
        {dados && (nomeDistrito ? <VisaoLeads dados={dados} /> : <VisaoDistritos dados={dados} prefix={prefix} />)}
      </div>
    </div>
  );
}
