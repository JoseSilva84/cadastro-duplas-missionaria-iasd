import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { exportarAceiteCampanhaPdf, exportarListaAceitesCampanhaPdf } from '../lib/pdfCampanhaNovoTempo';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');
const dataHora = (valor) => (valor ? new Date(valor).toLocaleString('pt-BR') : '');
const erroDaApi = (falha, padrao) => falha.response?.data?.erro || padrao;

/* Ícones utilitários inline */
const Icones = {
  voltar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  megafone: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  chat: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  presente: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V6a2 2 0 10-2 2h2zm-7 4h14a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7a1 1 0 011-1z" />
    </svg>
  ),
  conversa: (
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  alerta: (
    <svg className="w-5 h-5 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  pdf: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  check: (
    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

function CartaoMetricaCampanha({ titulo, valor, detalhe, icone, corDestaque, corFundoIcone, corTextoIcone }) {
  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-[#C9963A]/40 hover:shadow-lg">
      <span className="absolute inset-x-0 top-0 h-1 transition-all duration-300 group-hover:h-1.5" style={{ backgroundColor: corDestaque }} />
      <div>
        <div className="flex items-start justify-between gap-2">
          <p className="min-h-[28px] sm:min-h-auto text-[10px] sm:text-xs font-bold uppercase tracking-wider text-gray-400 line-clamp-2">
            {titulo}
          </p>
          <div
            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl shadow-xs flex-shrink-0"
            style={{ backgroundColor: corFundoIcone, color: corTextoIcone }}
          >
            {icone}
          </div>
        </div>
        <p className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-black tracking-tight text-[#1A3A6B] leading-none">
          {numero(valor)}
        </p>
      </div>
      <p className="mt-2 sm:mt-2.5 text-[10px] sm:text-xs font-medium text-gray-500 line-clamp-1">
        {detalhe}
      </p>
    </div>
  );
}

function Detalhe({ pessoa, campanha, carregando, erro, onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs" onClick={onFechar}>
      <div
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 shadow-2xl transition-all"
        onClick={(evento) => evento.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes da conversa"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{campanha?.nome || 'Campanha'}</p>
            </div>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              {pessoa?.nome || 'Conversa'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Fechar detalhes"
          >
            Fechar
          </button>
        </div>

        {carregando && (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
              <div className="w-8 h-8 border-3 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
              <p>Carregando os detalhes da conversa...</p>
            </div>
          </div>
        )}

        {erro && <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700">{erro}</p>}

        {pessoa && !carregando && (
          <>
            <div className="mt-4 grid gap-2.5 rounded-xl border border-gray-100 bg-[#F8FAFC] p-4 text-xs sm:text-sm text-gray-700 sm:grid-cols-2">
              <p><strong>Distrito:</strong> {pessoa.distrito || 'Não informado'}</p>
              <p><strong>Igreja:</strong> {pessoa.igreja || 'Não informada'}</p>
              <p><strong>Telefone:</strong> {pessoa.telefone || 'Não informado'}</p>
              <p>
                <strong>Situação:</strong>{' '}
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${pessoa.aceitou ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-800'}`}>
                  {pessoa.situacao || 'Não informada'}
                </span>
              </p>
              <p className="sm:col-span-2"><strong>Endereço informado:</strong> {pessoa.endereco || 'Não informado no Amigos NT'}</p>
            </div>

            {pessoa.aceitou && (
              <button
                type="button"
                onClick={() => exportarAceiteCampanhaPdf(campanha, pessoa)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md transition-all hover:brightness-105"
              >
                {Icones.pdf}
                Baixar comprovante de aceite em PDF
              </button>
            )}

            <div className="mt-6 border-t border-gray-100 pt-5">
              <h3 className="text-base sm:text-lg font-bold text-[#1A3A6B]">Conversa registrada</h3>
              {!pessoa.historicoCompleto && (
                <p className="mt-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-800">
                  O histórico completo não foi disponibilizado pelo Amigos NT agora. As mensagens abaixo são as que constam no resumo da campanha.
                </p>
              )}

              {pessoa.mensagens?.length ? (
                <div className="mt-4 space-y-3">
                  {pessoa.mensagens.map((mensagem, indice) => {
                    const isLead = /INBOUND|LEAD/i.test(mensagem.direcao);
                    return (
                      <div
                        key={mensagem.id || indice}
                        className={`max-w-[90%] rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm shadow-xs ${
                          isLead
                            ? 'bg-slate-100 text-slate-800 rounded-tl-xs'
                            : 'ml-auto bg-[#1A3A6B] text-white rounded-tr-xs'
                        }`}
                      >
                        <p className={`mb-1 text-[10px] font-bold ${isLead ? 'text-slate-500' : 'text-blue-200'}`}>
                          {isLead ? 'Interessado' : 'Agente Ana'} {mensagem.data ? `· ${dataHora(mensagem.data)}` : ''}
                        </p>
                        <p className="whitespace-pre-wrap break-words">{mensagem.texto}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
                  {pessoa.ultimaMensagemInteressado && (
                    <div className="rounded-xl border border-gray-100 bg-slate-50 p-3.5">
                      <strong className="block text-gray-500 text-xs">Última mensagem do interessado:</strong>
                      <p className="mt-1 text-gray-800">{pessoa.ultimaMensagemInteressado}</p>
                    </div>
                  )}
                  {pessoa.ultimaMensagemAgente && (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
                      <strong className="block text-blue-600 text-xs">Última mensagem da agente:</strong>
                      <p className="mt-1 text-blue-950">{pessoa.ultimaMensagemAgente}</p>
                    </div>
                  )}
                  {!pessoa.ultimaMensagemInteressado && !pessoa.ultimaMensagemAgente && (
                    <p className="text-gray-400 py-3 text-center">O Amigos NT não incluiu mensagens neste resumo.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CampanhasNovoTempo() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefix = location.pathname.startsWith('/direto') ? '/direto' : '';
  const isDireto = Boolean(prefix);
  const [catalogo, setCatalogo] = useState(null);
  const [campanhaId, setCampanhaId] = useState('');
  const [resumo, setResumo] = useState(null);
  const [lista, setLista] = useState({ itens: [], total: 0, temMais: false, pagina: 1 });
  const [distritoId, setDistritoId] = useState('');
  const [igreja, setIgreja] = useState('');
  const [situacao, setSituacao] = useState('');
  const [apenasAceitos, setApenasAceitos] = useState(true);
  const [carregandoCatalogo, setCarregandoCatalogo] = useState(true);
  const [carregandoRelatorio, setCarregandoRelatorio] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [erro, setErro] = useState('');
  const [erroLista, setErroLista] = useState('');
  const [pessoaId, setPessoaId] = useState('');
  const [pessoa, setPessoa] = useState(null);
  const [carregandoPessoa, setCarregandoPessoa] = useState(false);
  const [erroPessoa, setErroPessoa] = useState('');
  const [exportandoLista, setExportandoLista] = useState(false);
  const listaVersaoRef = useRef(0);
  const detalheVersaoRef = useRef(0);

  useEffect(() => {
    let ativo = true;
    let timer;
    async function carregarCatalogo() {
      try {
        const { data } = await api.get('/interessados-nt/campanhas');
        if (!ativo) return;
        setCatalogo(data);
        setCampanhaId((atual) => (data.campanhas?.some((item) => item.id === atual) ? atual : data.campanhas?.[0]?.id || ''));
        setErro('');
        if (data.sincronizando || (!data.atualizadoEm && !data.erroSincronizacao)) {
          timer = window.setTimeout(carregarCatalogo, 15000);
        }
      } catch (falha) {
        if (ativo) setErro(erroDaApi(falha, 'Não foi possível consultar as campanhas.'));
      } finally {
        if (ativo) setCarregandoCatalogo(false);
      }
    }
    carregarCatalogo();
    return () => {
      ativo = false;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!campanhaId) {
      setResumo(null);
      return undefined;
    }
    let ativo = true;
    setCarregandoRelatorio(true);
    setResumo(null);
    setDistritoId('');
    setIgreja('');
    setSituacao('');
    api.get(`/interessados-nt/campanhas/${encodeURIComponent(campanhaId)}/resumo`)
      .then(({ data }) => {
        if (ativo) {
          setResumo(data);
          setErro('');
        }
      })
      .catch((falha) => {
        if (ativo) setErro(erroDaApi(falha, 'Não foi possível carregar o relatório.'));
      })
      .finally(() => {
        if (ativo) setCarregandoRelatorio(false);
      });
    return () => {
      ativo = false;
    };
  }, [campanhaId]);

  useEffect(() => {
    listaVersaoRef.current += 1;
    if (!campanhaId) {
      setLista({ itens: [], total: 0, temMais: false, pagina: 1 });
      return undefined;
    }
    let ativo = true;
    setCarregandoLista(true);
    setCarregandoMais(false);
    setLista({ itens: [], total: 0, temMais: false, pagina: 1 });
    setErroLista('');
    api.get(`/interessados-nt/campanhas/${encodeURIComponent(campanhaId)}/conversas`, {
      params: {
        pagina: 1,
        limite: 25,
        distritoId: distritoId || undefined,
        igreja: igreja || undefined,
        situacao: situacao || undefined,
        aceitos: apenasAceitos ? '1' : '0',
      },
    })
      .then(({ data }) => {
        if (ativo) setLista(data);
      })
      .catch((falha) => {
        if (ativo) setErroLista(erroDaApi(falha, 'Não foi possível carregar as pessoas.'));
      })
      .finally(() => {
        if (ativo) setCarregandoLista(false);
      });
    return () => {
      ativo = false;
    };
  }, [campanhaId, distritoId, igreja, situacao, apenasAceitos]);

  async function carregarMais() {
    if (!lista.temMais || carregandoMais) return;
    const versao = listaVersaoRef.current;
    setCarregandoMais(true);
    setErroLista('');
    try {
      const { data } = await api.get(`/interessados-nt/campanhas/${encodeURIComponent(campanhaId)}/conversas`, {
        params: {
          pagina: lista.pagina + 1,
          limite: 25,
          distritoId: distritoId || undefined,
          igreja: igreja || undefined,
          situacao: situacao || undefined,
          aceitos: apenasAceitos ? '1' : '0',
        },
      });
      if (versao === listaVersaoRef.current) setLista((atual) => ({ ...data, itens: [...atual.itens, ...data.itens] }));
    } catch (falha) {
      if (versao === listaVersaoRef.current) setErroLista(erroDaApi(falha, 'Não foi possível carregar a próxima página.'));
    } finally {
      if (versao === listaVersaoRef.current) setCarregandoMais(false);
    }
  }

  async function abrirPessoa(item) {
    const versao = ++detalheVersaoRef.current;
    setPessoaId(item.id);
    setPessoa(null);
    setErroPessoa('');
    setCarregandoPessoa(true);
    try {
      const { data } = await api.get(`/interessados-nt/campanhas/${encodeURIComponent(campanhaId)}/conversas/${encodeURIComponent(item.id)}`, { timeout: 35000 });
      if (versao === detalheVersaoRef.current) setPessoa(data);
    } catch (falha) {
      if (versao === detalheVersaoRef.current) setErroPessoa(erroDaApi(falha, 'Não foi possível abrir esta conversa.'));
    } finally {
      if (versao === detalheVersaoRef.current) setCarregandoPessoa(false);
    }
  }

  async function baixarListaAceites() {
    if (!campanhaId || exportandoLista) return;
    setExportandoLista(true);
    setErroLista('');
    try {
      const pessoas = [];
      let pagina = 1;
      let temMais = true;
      while (temMais) {
        const { data } = await api.get(`/interessados-nt/campanhas/${encodeURIComponent(campanhaId)}/conversas`, {
          params: {
            pagina,
            limite: 50,
            distritoId: distritoId || undefined,
            igreja: igreja || undefined,
            situacao: situacao || undefined,
            aceitos: '1',
          },
        });
        if (!data.itens?.length && data.temMais) throw new Error('A paginação do relatório não avançou.');
        pessoas.push(...data.itens);
        temMais = data.temMais;
        pagina += 1;
      }
      exportarListaAceitesCampanhaPdf(campanha, pessoas);
    } catch (falha) {
      setErroLista(erroDaApi(falha, 'Não foi possível gerar a relação de aceites.'));
    } finally {
      setExportandoLista(false);
    }
  }

  const campanha = catalogo?.campanhas?.find((item) => item.id === campanhaId);

  return (
    <div className={isDireto ? 'h-full overflow-y-auto bg-[#F4F5F7] p-3 sm:p-6 space-y-4 sm:space-y-6' : 'w-full space-y-4 sm:space-y-6 animate-fade-in'}>
      {/* Banner Principal com Identidade PCM */}
      <div className="rounded-2xl border border-[#1A3A6B]/10 bg-white p-4 sm:p-6 shadow-sm transition-all">
        <button
          type="button"
          onClick={() => navigate(`${prefix}/interessados-nt`)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          {Icones.voltar}
          Voltar aos interessados
        </button>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-[#C9963A]" />
              <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Contatos Novo Tempo</p>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Relatórios de campanhas
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500">
              Conversas e aceites da campanha dentro do seu território de acesso.
            </p>
          </div>
          {catalogo?.atualizadoEm && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-100 bg-[#F8FAFC] px-3 py-1 text-[11px] font-medium text-gray-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Atualizado em {dataHora(catalogo.atualizadoEm)}
            </div>
          )}
        </div>

        {/* Seletor moderno de campanhas */}
        <div className="mt-5 border-t border-gray-100 pt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5" htmlFor="campanha-nt">
            Campanhas da Associação
          </label>
          <div className="relative max-w-md">
            <select
              id="campanha-nt"
              value={campanhaId}
              onChange={(evento) => setCampanhaId(evento.target.value)}
              disabled={!catalogo?.campanhas?.length}
              className="w-full rounded-xl border border-gray-200 bg-[#F8FAFC] px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-800 transition-all focus:border-[#1A3A6B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/15"
            >
              {!campanhaId && <option value="">Nenhuma campanha disponível</option>}
              {catalogo?.campanhas?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {erro && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm text-red-700 shadow-2xs">
          {erro}
        </div>
      )}

      {catalogo?.erroSincronizacao && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs sm:text-sm text-amber-800 shadow-2xs">
          {catalogo.erroSincronizacao}
        </div>
      )}

      {carregandoCatalogo && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
          Consultando as campanhas disponíveis...
        </div>
      )}

      {!carregandoCatalogo && !campanhaId && !erro && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-600 shadow-sm text-center">
          {catalogo?.sincronizando
            ? 'O primeiro relatório está sendo preparado.'
            : catalogo?.erroSincronizacao
            ? 'O primeiro relatório ainda não foi importado. A importação será tentada novamente automaticamente.'
            : 'Ainda não há campanhas com conversas no seu território.'}
        </div>
      )}

      {carregandoRelatorio && (
        <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-gray-500 shadow-sm flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
          Carregando o resumo da campanha...
        </div>
      )}

      {resumo && (
        <>
          {/* Banner de Dados Parciais Estilizado */}
          {resumo.dadosParciais && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-[#fffbf2] to-amber-50/60 p-3.5 sm:p-4 text-xs sm:text-sm text-amber-900 shadow-2xs">
              {Icones.alerta}
              <div>
                <p className="font-bold text-amber-950">Aviso sobre os registros da campanha</p>
                <p className="mt-0.5 leading-relaxed text-amber-800/95">
                  Alguns registros da origem não puderam ser atribuídos com segurança a um distrito do PCM ou excederam o limite da origem. Os totais abaixo mostram os registros disponíveis neste relatório.
                </p>
              </div>
            </div>
          )}

          {/* Grid de Métricas: 2 colunas no Mobile, 2 a 4 no Tablet, 4 no Desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <CartaoMetricaCampanha
              titulo="Contatos abordados"
              valor={resumo.totais.abordados}
              detalhe="Total contactado na campanha"
              corDestaque="#2563EB"
              corFundoIcone="#EFF6FF"
              corTextoIcone="#2563EB"
              icone={Icones.megafone}
            />
            <CartaoMetricaCampanha
              titulo="Responderam"
              valor={resumo.totais.responderam}
              detalhe="Conversas ativas com resposta"
              corDestaque="#EA580C"
              corFundoIcone="#FFF7ED"
              corTextoIcone="#EA580C"
              icone={Icones.chat}
            />
            <CartaoMetricaCampanha
              titulo="Aceitaram brinde / visita"
              valor={resumo.totais.aceitaram}
              detalhe="Pessoas com aceite confirmado"
              corDestaque="#059669"
              corFundoIcone="#ECFDF5"
              corTextoIcone="#059669"
              icone={Icones.presente}
            />
            <CartaoMetricaCampanha
              titulo="Conversas"
              valor={resumo.totais.conversas}
              detalhe="Registros no seu território"
              corDestaque="#7C3AED"
              corFundoIcone="#F5F3FF"
              corTextoIcone="#7C3AED"
              icone={Icones.conversa}
            />
          </div>

          {/* Grids de Análise: Distrito e Situação */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#1A3A6B]">Resultado por distrito</h2>
                  <p className="mt-0.5 text-xs text-gray-400">Toque no distrito para filtrar a relação de pessoas.</p>
                </div>
                {distritoId && (
                  <button
                    type="button"
                    onClick={() => { setDistritoId(''); setIgreja(''); }}
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
              <div className="mt-3.5 space-y-2 max-h-80 overflow-y-auto pr-1">
                {resumo.distritos.map((item) => {
                  const selecionado = String(item.id) === distritoId;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => {
                        setIgreja('');
                        setDistritoId(selecionado ? '' : String(item.id));
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs sm:text-sm transition-all ${
                        selecionado
                          ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500'
                          : 'border-gray-100 bg-[#F8FAFC] hover:border-emerald-200 hover:bg-white'
                      }`}
                    >
                      <strong className="text-[#1A3A6B] truncate pr-2">{item.nome}</strong>
                      <span className="flex items-center gap-1.5 flex-shrink-0 text-emerald-700 font-bold">
                        <span>{numero(item.aceitaram)} aceites</span>
                        <span className="text-gray-400 font-normal">· {numero(item.total)} conv.</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-[#1A3A6B]">Situação das conversas</h2>
                  <p className="mt-0.5 text-xs text-gray-400">Filtre as pessoas por status de atendimento.</p>
                </div>
                {situacao && (
                  <button
                    type="button"
                    onClick={() => setSituacao('')}
                    className="text-xs font-semibold text-blue-700 hover:underline"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
              <div className="mt-3.5 space-y-2 max-h-80 overflow-y-auto pr-1">
                {resumo.situacoes.map((item) => {
                  const selecionado = item.nome === situacao;
                  return (
                    <button
                      type="button"
                      key={item.nome}
                      onClick={() => setSituacao(selecionado ? '' : item.nome)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3 text-left text-xs sm:text-sm transition-all ${
                        selecionado
                          ? 'border-blue-500 bg-blue-50/80 shadow-xs ring-1 ring-blue-500'
                          : 'border-gray-100 bg-[#F8FAFC] hover:border-blue-200 hover:bg-white'
                      }`}
                    >
                      <span className="truncate pr-2 text-gray-700 font-medium">{item.nome}</span>
                      <strong className="text-[#1A3A6B] flex-shrink-0 bg-white px-2 py-0.5 rounded-lg border border-gray-100">
                        {numero(item.total)}
                      </strong>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Aceites por igreja (se houver) */}
          {resumo.igrejas?.length > 0 && (
            <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-[#1A3A6B]">Aceites por igreja</h2>
              <p className="mt-0.5 text-xs text-gray-400">Distribuição nos templos do seu escopo.</p>
              <div className="mt-3.5 grid gap-2.5 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
                {resumo.igrejas.map((item) => {
                  const selecionado = igreja === item.nome && distritoId === String(item.distritoId);
                  return (
                    <button
                      type="button"
                      key={`${item.distritoId}-${item.nome}`}
                      onClick={() => {
                        setDistritoId(String(item.distritoId));
                        setIgreja(selecionado ? '' : item.nome);
                      }}
                      className={`rounded-xl border p-3 sm:p-4 text-left transition-all ${
                        selecionado
                          ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-500'
                          : 'border-gray-100 bg-[#F8FAFC] hover:border-emerald-200 hover:bg-white'
                      }`}
                    >
                      <strong className="block text-xs sm:text-sm text-[#1A3A6B] truncate">{item.nome}</strong>
                      <span className="mt-0.5 block text-[10px] sm:text-xs text-gray-400 truncate">
                        {resumo.distritos.find((distrito) => distrito.id === item.distritoId)?.nome}
                      </span>
                      <span className="mt-2 block text-base sm:text-xl font-black text-emerald-700">
                        {numero(item.aceitaram)} aceites
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Funil e Tempo de Atendimento */}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-[#1A3A6B]">Funil dos atendimentos</h2>
              <p className="mt-0.5 text-xs text-gray-400">Conversão de contatos abordados até o aceite.</p>

              <div className="mt-4 space-y-3 text-xs sm:text-sm">
                <div>
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>Contatos abordados</span>
                    <strong className="text-gray-900">{numero(resumo.totais.abordados)}</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500 w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>Pessoas que responderam</span>
                    <strong className="text-gray-900">{numero(resumo.totais.responderam)}</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all duration-500"
                      style={{
                        width: `${resumo.totais.abordados ? Math.min(100, (resumo.totais.responderam / resumo.totais.abordados) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>Pessoas que aceitaram</span>
                    <strong className="text-emerald-700 font-bold">{numero(resumo.totais.aceitaram)}</strong>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{
                        width: `${resumo.totais.abordados ? Math.min(100, (resumo.totais.aceitaram / resumo.totais.abordados) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-gray-100 pt-4 text-center">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <strong className="block text-lg sm:text-xl font-black text-emerald-700">
                    {resumo.totais.abordados ? Math.round((resumo.totais.responderam / resumo.totais.abordados) * 100) : 0}%
                  </strong>
                  <span className="text-[11px] text-gray-500 font-medium">Taxa de resposta</span>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <strong className="block text-lg sm:text-xl font-black text-emerald-700">
                    {resumo.totais.responderam ? Math.round((resumo.totais.aceitaram / resumo.totais.responderam) * 100) : 0}%
                  </strong>
                  <span className="text-[11px] text-gray-500 font-medium">Aceites por resposta</span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-sm">
              <h2 className="text-base sm:text-lg font-bold text-[#1A3A6B]">Tempo até o aceite</h2>
              <p className="mt-0.5 text-xs text-gray-400">Tempo decorrido desde o último contato com a Novo Tempo.</p>

              {resumo.faixasTempo?.length ? (
                <div className="mt-4 space-y-2.5">
                  {resumo.faixasTempo.map((faixa) => (
                    <div key={faixa.id || faixa.label} className="grid grid-cols-[minmax(90px,1.2fr)_minmax(60px,1.5fr)_auto] items-center gap-2 text-xs">
                      <span className="text-gray-600 truncate">{faixa.label}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, Number(faixa.percentage) || 0))}%` }}
                        />
                      </div>
                      <strong className="text-right text-gray-700">
                        {numero(faixa.count)} <span className="font-normal text-gray-400">· {faixa.percentage || 0}%</span>
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-xs sm:text-sm text-gray-400 text-center py-6">
                  Este indicador não está disponível para este recorte territorial.
                </p>
              )}
            </section>
          </div>

          {/* Lista de Pessoas da Campanha em Cards Touch-friendly */}
          <section className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#1A3A6B]">Pessoas da campanha</h2>
                <p className="text-xs text-gray-400">Toque em qualquer pessoa para abrir endereço, histórico e baixar o PDF.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={apenasAceitos}
                    onChange={(evento) => setApenasAceitos(evento.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                  />
                  Somente aceites
                </label>
                <button
                  type="button"
                  disabled={exportandoLista || !resumo.totais.aceitaram}
                  onClick={baixarListaAceites}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A3A6B] bg-[#1A3A6B] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#15305b] disabled:opacity-50 transition-colors"
                >
                  {Icones.pdf}
                  {exportandoLista ? 'Gerando...' : 'Baixar aceites (PDF)'}
                </button>
              </div>
            </div>

            {(distritoId || igreja || situacao) && (
              <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-gray-400">Filtros ativos:</span>
                {distritoId && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-800">
                    Distrito: {resumo.distritos.find((d) => String(d.id) === distritoId)?.nome || distritoId}
                  </span>
                )}
                {igreja && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-semibold text-emerald-800">
                    Igreja: {igreja}
                  </span>
                )}
                {situacao && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-800">
                    Situação: {situacao}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setDistritoId(''); setIgreja(''); setSituacao(''); }}
                  className="font-bold text-red-600 hover:underline ml-1"
                >
                  Limpar todos
                </button>
              </div>
            )}

            {erroLista && (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs sm:text-sm text-red-700">
                {erroLista}
              </p>
            )}

            {carregandoLista ? (
              <div className="flex items-center justify-center py-10 gap-2 text-xs sm:text-sm text-gray-500">
                <div className="w-5 h-5 border-2 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
                Carregando nomes...
              </div>
            ) : (
              <>
                <p className="mt-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Exibindo {numero(lista.itens.length)} de {numero(lista.total)} contatos encontrados
                </p>

                <div className="mt-3 grid gap-2 sm:grid-cols-1">
                  {lista.itens.map((item) => {
                    const iniciais = (item.nome || '?')
                      .split(' ')
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0])
                      .join('')
                      .toUpperCase();

                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => abrirPessoa(item)}
                        className="group flex w-full items-center justify-between gap-3 rounded-xl border border-gray-100 bg-[#F8FAFC] p-3 text-left transition-all hover:border-[#1A3A6B]/30 hover:bg-white hover:shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="flex h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1A3A6B]/10 font-bold text-xs sm:text-sm text-[#1A3A6B] transition-transform group-hover:scale-105">
                            {iniciais}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs sm:text-sm font-bold text-[#1A3A6B] group-hover:text-blue-700">
                              {item.nome}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-gray-500">
                              {item.distrito}
                              {item.igreja ? ` · ${item.igreja}` : ''}
                              {item.situacao ? ` · ${item.situacao}` : ''}
                            </p>
                            {item.endereco && (
                              <p className="mt-0.5 truncate text-[10px] text-gray-400">
                                📍 {item.endereco}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {item.aceitou && (
                            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                              {Icones.check} Aceitou
                            </span>
                          )}
                          <span className="text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                            Abrir →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {!lista.itens.length && (
                  <p className="py-8 text-center text-xs sm:text-sm text-gray-400">
                    Nenhuma pessoa encontrada para os filtros selecionados.
                  </p>
                )}

                {lista.temMais && (
                  <button
                    type="button"
                    disabled={carregandoMais}
                    onClick={carregarMais}
                    className="mt-4 w-full rounded-xl border border-gray-200 bg-white py-2.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {carregandoMais ? 'Carregando mais contatos...' : 'Carregar mais pessoas'}
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}

      {pessoaId && (
        <Detalhe
          pessoa={pessoa}
          campanha={campanha}
          carregando={carregandoPessoa}
          erro={erroPessoa}
          onFechar={() => {
            detalheVersaoRef.current += 1;
            setPessoaId('');
            setPessoa(null);
          }}
        />
      )}
    </div>
  );
}
