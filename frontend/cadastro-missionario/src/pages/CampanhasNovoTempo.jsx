import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { exportarAceiteCampanhaPdf, exportarListaAceitesCampanhaPdf } from '../lib/pdfCampanhaNovoTempo';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');
const dataHora = (valor) => valor ? new Date(valor).toLocaleString('pt-BR') : '';
const erroDaApi = (falha, padrao) => falha.response?.data?.erro || padrao;

function Cartao({ titulo, valor, detalhe, cor }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
      <div className={`mb-3 h-1 w-12 rounded-full ${cor}`} />
      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{titulo}</p>
      <p className="mt-2 text-3xl font-bold text-[#1A3A6B]">{numero(valor)}</p>
      <p className="mt-1 text-xs text-gray-500">{detalhe}</p>
    </div>
  );
}

function Detalhe({ pessoa, campanha, carregando, erro, onFechar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3" onClick={onFechar}>
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7" onClick={(evento) => evento.stopPropagation()} role="dialog" aria-modal="true" aria-label="Detalhes da conversa">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">{campanha?.nome}</p>
            <h2 className="mt-1 text-2xl font-bold text-[#1A3A6B]">{pessoa?.nome || 'Conversa'}</h2>
          </div>
          <button type="button" onClick={onFechar} className="btn-outline px-3 py-2" aria-label="Fechar detalhes">Fechar</button>
        </div>
        {carregando && <p className="mt-6 text-sm text-gray-500">Carregando os detalhes da conversa...</p>}
        {erro && <p className="mt-6 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
        {pessoa && !carregando && (
          <>
            <div className="mt-6 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <p><strong>Distrito:</strong> {pessoa.distrito || 'Não informado'}</p>
              <p><strong>Igreja:</strong> {pessoa.igreja || 'Não informada'}</p>
              <p><strong>Telefone:</strong> {pessoa.telefone || 'Não informado'}</p>
              <p><strong>Situação:</strong> {pessoa.situacao || 'Não informada'}</p>
              <p className="sm:col-span-2"><strong>Endereço informado:</strong> {pessoa.endereco || 'Não informado no Amigos NT'}</p>
            </div>
            {pessoa.aceitou && (
              <button type="button" onClick={() => exportarAceiteCampanhaPdf(campanha, pessoa)} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Baixar aceite em PDF
              </button>
            )}
            <h3 className="mt-7 text-lg font-bold text-[#1A3A6B]">Conversa registrada</h3>
            {!pessoa.historicoCompleto && <p className="mt-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">O histórico completo não foi disponibilizado pelo Amigos NT agora. As mensagens abaixo são as que constam no resumo da campanha.</p>}
            {pessoa.mensagens?.length ? (
              <div className="mt-3 space-y-3">
                {pessoa.mensagens.map((mensagem, indice) => (
                  <div key={mensagem.id || indice} className={`max-w-[92%] rounded-xl p-3 text-sm ${/INBOUND|LEAD/i.test(mensagem.direcao) ? 'bg-slate-100 text-slate-800' : 'ml-auto bg-blue-50 text-blue-950'}`}>
                    <p className="mb-1 text-xs font-bold">{/INBOUND|LEAD/i.test(mensagem.direcao) ? 'Interessado' : 'Agente Ana'} {mensagem.data ? `· ${dataHora(mensagem.data)}` : ''}</p>
                    <p className="whitespace-pre-wrap break-words">{mensagem.texto}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 space-y-3 text-sm">
                {pessoa.ultimaMensagemInteressado && <div className="rounded-xl bg-slate-100 p-3"><strong>Última mensagem do interessado:</strong> {pessoa.ultimaMensagemInteressado}</div>}
                {pessoa.ultimaMensagemAgente && <div className="rounded-xl bg-blue-50 p-3"><strong>Última mensagem da agente:</strong> {pessoa.ultimaMensagemAgente}</div>}
                {!pessoa.ultimaMensagemInteressado && !pessoa.ultimaMensagemAgente && <p className="text-gray-500">O Amigos NT não incluiu mensagens neste resumo.</p>}
              </div>
            )}
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
        setCampanhaId((atual) => data.campanhas?.some((item) => item.id === atual) ? atual : data.campanhas?.[0]?.id || '');
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
    return () => { ativo = false; window.clearTimeout(timer); };
  }, []);

  useEffect(() => {
    if (!campanhaId) { setResumo(null); return undefined; }
    let ativo = true;
    setCarregandoRelatorio(true);
    setResumo(null);
    setDistritoId('');
    setIgreja('');
    setSituacao('');
    api.get(`/interessados-nt/campanhas/${encodeURIComponent(campanhaId)}/resumo`)
      .then(({ data }) => { if (ativo) { setResumo(data); setErro(''); } })
      .catch((falha) => { if (ativo) setErro(erroDaApi(falha, 'Não foi possível carregar o relatório.')); })
      .finally(() => { if (ativo) setCarregandoRelatorio(false); });
    return () => { ativo = false; };
  }, [campanhaId]);

  useEffect(() => {
    listaVersaoRef.current += 1;
    if (!campanhaId) { setLista({ itens: [], total: 0, temMais: false, pagina: 1 }); return undefined; }
    let ativo = true;
    setCarregandoLista(true);
    setCarregandoMais(false);
    setLista({ itens: [], total: 0, temMais: false, pagina: 1 });
    setErroLista('');
    api.get(`/interessados-nt/campanhas/${encodeURIComponent(campanhaId)}/conversas`, {
      params: { pagina: 1, limite: 25, distritoId: distritoId || undefined, igreja: igreja || undefined, situacao: situacao || undefined, aceitos: apenasAceitos ? '1' : '0' },
    }).then(({ data }) => { if (ativo) setLista(data); })
      .catch((falha) => { if (ativo) setErroLista(erroDaApi(falha, 'Não foi possível carregar as pessoas.')); })
      .finally(() => { if (ativo) setCarregandoLista(false); });
    return () => { ativo = false; };
  }, [campanhaId, distritoId, igreja, situacao, apenasAceitos]);

  async function carregarMais() {
    if (!lista.temMais || carregandoMais) return;
    const versao = listaVersaoRef.current;
    setCarregandoMais(true);
    setErroLista('');
    try {
      const { data } = await api.get(`/interessados-nt/campanhas/${encodeURIComponent(campanhaId)}/conversas`, {
        params: { pagina: lista.pagina + 1, limite: 25, distritoId: distritoId || undefined, igreja: igreja || undefined, situacao: situacao || undefined, aceitos: apenasAceitos ? '1' : '0' },
      });
      if (versao === listaVersaoRef.current) setLista((atual) => ({ ...data, itens: [...atual.itens, ...data.itens] }));
    } catch (falha) {
      if (versao === listaVersaoRef.current) setErroLista(erroDaApi(falha, 'Não foi possível carregar a próxima página.'));
    } finally { if (versao === listaVersaoRef.current) setCarregandoMais(false); }
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
    } finally { if (versao === detalheVersaoRef.current) setCarregandoPessoa(false); }
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
          params: { pagina, limite: 50, distritoId: distritoId || undefined, igreja: igreja || undefined, situacao: situacao || undefined, aceitos: '1' },
        });
        if (!data.itens?.length && data.temMais) throw new Error('A paginação do relatório não avançou.');
        pessoas.push(...data.itens);
        temMais = data.temMais;
        pagina += 1;
      }
      exportarListaAceitesCampanhaPdf(campanha, pessoas);
    } catch (falha) {
      setErroLista(erroDaApi(falha, 'Não foi possível gerar a relação de aceites.'));
    } finally { setExportandoLista(false); }
  }

  const campanha = catalogo?.campanhas?.find((item) => item.id === campanhaId);
  return (
    <div className={isDireto ? 'h-full overflow-y-auto bg-[#F4F5F7] p-4 sm:p-6' : 'w-full space-y-5 animate-fade-in'}>
      <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <button type="button" onClick={() => navigate(`${prefix}/interessados-nt`)} className="btn-outline px-4 py-2 text-sm">← Voltar aos interessados</button>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Contatos Novo Tempo</p>
            <h1 className="mt-2 text-2xl font-bold text-[#1A3A6B] sm:text-3xl" style={{ fontFamily: 'Georgia, serif' }}>Relatórios de campanhas</h1>
            <p className="mt-1 text-sm text-gray-500">Conversas e aceites da campanha dentro do seu território de acesso.</p>
          </div>
          {catalogo?.atualizadoEm && <p className="text-xs text-gray-400">Atualizado em {dataHora(catalogo.atualizadoEm)}</p>}
        </div>
        <label className="mt-6 block max-w-md text-xs font-bold uppercase tracking-wider text-gray-600" htmlFor="campanha-nt">Campanhas da associação</label>
        <select id="campanha-nt" value={campanhaId} onChange={(evento) => setCampanhaId(evento.target.value)} disabled={!catalogo?.campanhas?.length} className="mt-2 w-full max-w-md rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800">
          {!campanhaId && <option value="">Nenhuma campanha disponível</option>}
          {catalogo?.campanhas?.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}
        </select>
      </div>

      {erro && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{erro}</div>}
      {catalogo?.erroSincronizacao && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{catalogo.erroSincronizacao}</div>}
      {carregandoCatalogo && <div className="rounded-xl bg-white p-6 text-sm text-gray-500">Consultando as campanhas disponíveis...</div>}
      {!carregandoCatalogo && !campanhaId && !erro && <div className="rounded-xl bg-white p-6 text-sm text-gray-600">{catalogo?.sincronizando ? 'O primeiro relatório está sendo preparado.' : 'Ainda não há campanhas com conversas no seu território.'}</div>}
      {carregandoRelatorio && <div className="rounded-xl bg-white p-6 text-sm text-gray-500">Carregando o resumo da campanha...</div>}
      {resumo && (
        <>
          {resumo.dadosParciais && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Alguns registros da origem não puderam ser atribuídos com segurança a um distrito do PCM ou excederam o limite da origem. Os totais abaixo mostram os registros disponíveis neste relatório.</div>}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Cartao titulo="Contatos abordados" valor={resumo.totais.abordados} detalhe="Na campanha" cor="bg-blue-500" />
            <Cartao titulo="Responderam" valor={resumo.totais.responderam} detalhe="Conversas com resposta" cor="bg-orange-500" />
            <Cartao titulo="Aceitaram o brinde / visita" valor={resumo.totais.aceitaram} detalhe="Pessoas com aceite registrado" cor="bg-emerald-500" />
            <Cartao titulo="Conversas" valor={resumo.totais.conversas} detalhe="Registros vinculados ao território" cor="bg-violet-500" />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Resultado por distrito</h2>
              <p className="mt-1 text-xs text-gray-500">Selecione um distrito para filtrar a lista de pessoas.</p>
              <div className="mt-4 space-y-2">
                {resumo.distritos.map((item) => (
                  <button type="button" key={item.id} onClick={() => { setIgreja(''); setDistritoId(String(item.id) === distritoId ? '' : String(item.id)); }} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${String(item.id) === distritoId ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-slate-50 hover:border-emerald-300'}`}>
                    <strong className="text-[#1A3A6B]">{item.nome}</strong>
                    <span className="text-emerald-700">{numero(item.aceitaram)} aceites <span className="text-gray-500">· {numero(item.total)} conversas</span></span>
                  </button>
                ))}
              </div>
            </section>
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Situação das conversas</h2>
              <div className="mt-4 space-y-2">
                {resumo.situacoes.map((item) => (
                  <button type="button" key={item.nome} onClick={() => setSituacao(item.nome === situacao ? '' : item.nome)} className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${item.nome === situacao ? 'border-blue-500 bg-blue-50' : 'border-gray-100 bg-slate-50 hover:border-blue-300'}`}>
                    <span>{item.nome}</span><strong>{numero(item.total)}</strong>
                  </button>
                ))}
              </div>
            </section>
          </div>
          {resumo.igrejas?.length > 0 && <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Aceites por igreja</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {resumo.igrejas.map((item) => (
                <button type="button" key={`${item.distritoId}-${item.nome}`} onClick={() => { setDistritoId(String(item.distritoId)); setIgreja(igreja === item.nome && distritoId === String(item.distritoId) ? '' : item.nome); }} className={`rounded-xl border p-4 text-left ${igreja === item.nome && distritoId === String(item.distritoId) ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-slate-50 hover:border-emerald-300'}`}>
                  <strong className="block text-sm text-[#1A3A6B]">{item.nome}</strong>
                  <span className="mt-1 block text-xs text-gray-500">{resumo.distritos.find((distrito) => distrito.id === item.distritoId)?.nome}</span>
                  <span className="mt-3 block text-xl font-bold text-emerald-700">{numero(item.aceitaram)} aceites</span>
                </button>
              ))}
            </div>
          </section>}
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Funil dos atendimentos</h2>
              <div className="mt-5 space-y-4 text-sm">
                <div className="flex justify-between"><span>Contatos abordados</span><strong>{numero(resumo.totais.abordados)}</strong></div>
                <div className="flex justify-between"><span>Pessoas que responderam</span><strong>{numero(resumo.totais.responderam)}</strong></div>
                <div className="flex justify-between"><span>Pessoas que aceitaram</span><strong className="text-emerald-700">{numero(resumo.totais.aceitaram)}</strong></div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-gray-100 pt-4 text-center text-xs">
                <div><strong className="block text-xl text-emerald-700">{resumo.totais.abordados ? Math.round(resumo.totais.responderam / resumo.totais.abordados * 100) : 0}%</strong> Taxa de resposta</div>
                <div><strong className="block text-xl text-emerald-700">{resumo.totais.responderam ? Math.round(resumo.totais.aceitaram / resumo.totais.responderam * 100) : 0}%</strong> Aceites por resposta</div>
              </div>
            </section>
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Tempo até o aceite</h2>
              <p className="mt-1 text-xs text-gray-500">Desde o último contato com a Novo Tempo.</p>
              {resumo.faixasTempo?.length ? <div className="mt-4 space-y-3">
                {resumo.faixasTempo.map((faixa) => (
                  <div key={faixa.id || faixa.label} className="grid grid-cols-[minmax(100px,1fr)_minmax(60px,1.5fr)_auto] items-center gap-2 text-xs">
                    <span>{faixa.label}</span>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(0, Number(faixa.percentage) || 0))}%` }} /></div>
                    <strong>{numero(faixa.count)} · {faixa.percentage || 0}%</strong>
                  </div>
                ))}
              </div> : <p className="mt-5 text-sm text-gray-500">Este indicador não está disponível para este recorte territorial.</p>}
            </section>
          </div>
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-bold text-[#1A3A6B]">Pessoas da campanha</h2><p className="text-xs text-gray-500">Nomes carregados aos poucos. Abra uma pessoa para ver endereço, conversa e PDF.</p></div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={apenasAceitos} onChange={(evento) => setApenasAceitos(evento.target.checked)} /> Mostrar somente aceites</label>
                <button type="button" disabled={exportandoLista || !resumo.totais.aceitaram} onClick={baixarListaAceites} className="btn-outline px-3 py-2 text-sm">{exportandoLista ? 'Gerando PDF...' : 'Baixar lista de aceites (PDF)'}</button>
              </div>
            </div>
            {(distritoId || igreja || situacao) && <button type="button" onClick={() => { setDistritoId(''); setIgreja(''); setSituacao(''); }} className="mt-3 text-sm font-semibold text-blue-700">Limpar filtros</button>}
            {erroLista && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{erroLista}</p>}
            {carregandoLista ? <p className="mt-5 text-sm text-gray-500">Carregando nomes...</p> : (
              <>
                <p className="mt-4 text-xs text-gray-500">{numero(lista.itens.length)} de {numero(lista.total)} pessoa(s)</p>
                <div className="mt-3 divide-y divide-gray-100">
                  {lista.itens.map((item) => (
                    <button type="button" key={item.id} onClick={() => abrirPessoa(item)} className="flex w-full items-start justify-between gap-3 px-2 py-3 text-left hover:bg-slate-50">
                      <span><strong className="text-sm text-[#1A3A6B]">{item.nome}</strong><span className="mt-0.5 block text-xs text-gray-500">{item.distrito}{item.igreja ? ` · ${item.igreja}` : ''} · {item.situacao}{item.endereco ? ` · ${item.endereco}` : ''}</span></span>
                      <span className="text-sm text-blue-700">Abrir →</span>
                    </button>
                  ))}
                </div>
                {!lista.itens.length && <p className="py-5 text-sm text-gray-500">Nenhuma pessoa encontrada para este filtro.</p>}
                {lista.temMais && <button type="button" disabled={carregandoMais} onClick={carregarMais} className="mt-4 btn-outline px-4 py-2 text-sm">{carregandoMais ? 'Carregando...' : 'Carregar mais pessoas'}</button>}
              </>
            )}
          </section>
        </>
      )}
      {pessoaId && <Detalhe pessoa={pessoa} campanha={campanha} carregando={carregandoPessoa} erro={erroPessoa} onFechar={() => { detalheVersaoRef.current += 1; setPessoaId(''); setPessoa(null); }} />}
    </div>
  );
}
