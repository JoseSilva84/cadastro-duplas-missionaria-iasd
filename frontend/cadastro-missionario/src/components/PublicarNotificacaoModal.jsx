import { useEffect, useState } from 'react';
import api from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';
import { useAuth, PERFIS } from '../contexts/AuthContext';

const rotulosEscopo = {
  TODOS: 'Todos os usuários ativos do sistema',
  REGIAO: 'Usuários da sua região, inclusive distritos e igrejas',
  DISTRITO: 'Usuários do seu distrito, inclusive igrejas e duplas',
};
const rotulosStatus = { AGENDADA: 'Agendada', PROCESSANDO: 'Enviando', PUBLICADA: 'Publicada', CANCELADA: 'Cancelada', ERRO: 'Falha no envio' };
const rotulosPerfil = {
  SUPER_ADMIN: 'Super administradores', ADMINISTRADOR: 'Administradores',
  PASTOR_REGIONAL: 'Pastores regionais', COORDENADOR_REGIONAL: 'Coordenadores regionais',
  PASTOR_DISTRITAL: 'Pastores distritais', DIRETOR_MISSIONARIO_IGREJA: 'Diretores missionários',
  DUPLA_MISSIONARIA: 'Duplas missionárias',
};
const dataLocal = (valor) => valor ? new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '';

export default function PublicarNotificacaoModal({ aberto, aoFechar }) {
  const { usuario } = useAuth();
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [url, setUrl] = useState('');
  const [tipo, setTipo] = useState('COMUNICADO');
  const [quando, setQuando] = useState('AGORA');
  const [dataHora, setDataHora] = useState('');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dataMinima, setDataMinima] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [modoDestinatarios, setModoDestinatarios] = useState('TODOS');
  const [perfisSelecionados, setPerfisSelecionados] = useState([]);
  const [usuarioIdsSelecionados, setUsuarioIdsSelecionados] = useState([]);
  const [buscaPessoa, setBuscaPessoa] = useState('');

  const carregar = async () => {
    setCarregando(true);
    try {
      const [publicacoes, destinatarios] = await Promise.all([
        api.get('/notificacoes/publicacoes'), api.get('/notificacoes/publicacoes/destinatarios'),
      ]);
      setDados(publicacoes.data);
      setUsuarios(destinatarios.data.usuarios);
    } catch (erro) {
      toastError(erro.response?.data?.erro || 'Não foi possível carregar as publicações.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (aberto) {
      setDataMinima(new Date(Date.now() + 60_000).toLocaleString('sv-SE').replace(' ', 'T').slice(0, 16));
      void carregar();
    }
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return undefined;
    const aoTeclar = (evento) => { if (evento.key === 'Escape' && !salvando) aoFechar(); };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, aoFechar, salvando]);

  if (!aberto) return null;

  const perfisDisponiveis = Object.keys(rotulosPerfil).filter((perfil) => usuarios.some((pessoa) => pessoa.perfil === perfil));
  const quantidadeSelecionada = modoDestinatarios === 'TODOS' ? usuarios.length : usuarios.filter((pessoa) =>
    perfisSelecionados.includes(pessoa.perfil) || usuarioIdsSelecionados.includes(pessoa.id)).length;
  const pessoasFiltradas = usuarios.filter((pessoa) => {
    const termo = buscaPessoa.trim().toLocaleLowerCase('pt-BR');
    return !termo || `${pessoa.nome} ${rotulosPerfil[pessoa.perfil]} ${pessoa.regiao?.nome || ''} ${pessoa.distrito?.nome || ''} ${pessoa.igreja?.nome || ''}`.toLocaleLowerCase('pt-BR').includes(termo);
  });
  const alternarPerfil = (perfil) => setPerfisSelecionados((atuais) => atuais.includes(perfil) ? atuais.filter((item) => item !== perfil) : [...atuais, perfil]);
  const alternarPessoa = (id) => setUsuarioIdsSelecionados((atuais) => atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]);

  const enviar = async (evento) => {
    evento.preventDefault();
    if (quando === 'AGENDAR' && (!dataHora || new Date(dataHora) <= new Date())) {
      toastError('Escolha uma data e um horário futuros.');
      return;
    }
    if (modoDestinatarios === 'SELECIONADOS' && !quantidadeSelecionada) {
      toastError('Selecione pelo menos um destinatário.');
      return;
    }
    setSalvando(true);
    try {
      const resposta = await api.post('/notificacoes/publicacoes', {
        titulo: titulo.trim(), mensagem: mensagem.trim(), url: url.trim() || null,
        tipo, agendadaPara: quando === 'AGENDAR' ? new Date(dataHora).toISOString() : null,
        modoDestinatarios, perfisSelecionados: modoDestinatarios === 'SELECIONADOS' ? perfisSelecionados : [],
        usuarioIdsSelecionados: modoDestinatarios === 'SELECIONADOS' ? usuarioIdsSelecionados : [],
      });
      if (resposta.data.item?.status === 'PUBLICADA') toastSuccess('Notificação publicada.');
      else if (resposta.data.item?.status === 'ERRO') toastError('O envio falhou. A publicação ficou registrada para o suporte.');
      else toastSuccess(quando === 'AGENDAR' ? 'Notificação agendada.' : 'O envio será retomado automaticamente.');
      setTitulo(''); setMensagem(''); setUrl(''); setTipo('COMUNICADO'); setQuando('AGORA'); setDataHora('');
      setModoDestinatarios('TODOS'); setPerfisSelecionados([]); setUsuarioIdsSelecionados([]); setBuscaPessoa('');
      await carregar();
    } catch (erro) {
      toastError(erro.response?.data?.erro || 'Não foi possível publicar a notificação.');
    } finally {
      setSalvando(false);
    }
  };

  const cancelar = async (id) => {
    try {
      await api.delete(`/notificacoes/publicacoes/${id}`);
      toastSuccess('Agendamento cancelado.');
      await carregar();
    } catch (erro) {
      toastError(erro.response?.data?.erro || 'Não foi possível cancelar o agendamento.');
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !salvando) aoFechar(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="publicar-notificacao-titulo" className="flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#B3812D]">Comunicação</p>
            <h2 id="publicar-notificacao-titulo" className="mt-1 text-xl font-bold text-[#142B50] sm:text-2xl">Publicar notificação</h2>
            <p className="mt-1 text-sm text-slate-500">Envie agora ou escolha quando a mensagem deve chegar.</p>
          </div>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">✕</button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-7">
          <form id="form-publicar-notificacao" onSubmit={enviar} className="space-y-4">
            <fieldset className="rounded-2xl border border-[#DCE5F1] bg-[#F5F8FC] p-4">
              <legend className="px-1 text-xs font-bold uppercase tracking-wide text-[#1A3A6B]">Quem recebe</legend>
              <p className="text-sm text-[#203758]">{rotulosEscopo[dados?.escopo] || 'Carregando abrangência…'}</p>
              <p className="mt-1 text-xs text-slate-500">{quantidadeSelecionada} pessoa(s) ativa(s) nesta seleção. Para agendamentos, a lista é conferida no envio.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[['TODOS', 'Todos no meu alcance'], ['SELECIONADOS', 'Escolher destinatários']].map(([valor, rotulo]) => (
                  <label key={valor} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${modoDestinatarios === valor ? 'border-[#1A3A6B] bg-white text-[#1A3A6B]' : 'border-slate-200 bg-white/60 text-slate-600'}`}>
                    <input type="radio" name="modo-destinatarios" checked={modoDestinatarios === valor} onChange={() => setModoDestinatarios(valor)} />{rotulo}
                  </label>
                ))}
              </div>
              {modoDestinatarios === 'SELECIONADOS' && <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm font-semibold text-[#203758]">Grupos inteiros</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {perfisDisponiveis.map((perfil) => <label key={perfil} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                      <input type="checkbox" checked={perfisSelecionados.includes(perfil)} onChange={() => alternarPerfil(perfil)} />
                      <span>{rotulosPerfil[perfil]} ({usuarios.filter((pessoa) => pessoa.perfil === perfil).length})</span>
                    </label>)}
                  </div>
                </div>
                <div>
                  <label htmlFor="busca-destinatario" className="mb-1.5 block text-sm font-semibold text-[#203758]">Pessoas específicas</label>
                  <input id="busca-destinatario" type="search" value={buscaPessoa} onChange={(evento) => setBuscaPessoa(evento.target.value)} placeholder="Buscar por nome, perfil ou local" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                  <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {pessoasFiltradas.length === 0 ? <p className="p-3 text-sm text-slate-500">Nenhuma pessoa encontrada.</p> : pessoasFiltradas.map((pessoa) => <label key={pessoa.id} className="flex cursor-pointer items-center gap-3 border-b border-slate-100 px-3 py-2 last:border-0 hover:bg-slate-50">
                      <input type="checkbox" checked={usuarioIdsSelecionados.includes(pessoa.id)} onChange={() => alternarPessoa(pessoa.id)} />
                      <span className="min-w-0 text-sm"><span className="block truncate font-medium text-slate-800">{pessoa.nome}</span><span className="block truncate text-xs text-slate-500">{rotulosPerfil[pessoa.perfil]}{pessoa.distrito?.nome ? ` · ${pessoa.distrito.nome}` : pessoa.regiao?.nome ? ` · ${pessoa.regiao.nome}` : pessoa.igreja?.nome ? ` · ${pessoa.igreja.nome}` : ''}</span></span>
                    </label>)}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Pessoas escolhidas individualmente recebem mesmo que não estejam em um grupo marcado.</p>
                </div>
              </div>}
            </fieldset>
            {usuario?.perfil === PERFIS.SUPER_ADMIN && (
              <div>
                <label htmlFor="publicacao-tipo" className="mb-1.5 block text-sm font-semibold text-slate-700">Categoria</label>
                <select id="publicacao-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#1A3A6B] focus:outline-none">
                  <option value="COMUNICADO">Comunicado</option>
                  <option value="NOVIDADE">Novidade do sistema</option>
                </select>
              </div>
            )}
            <div>
              <label htmlFor="publicacao-titulo" className="mb-1.5 block text-sm font-semibold text-slate-700">Título</label>
              <input id="publicacao-titulo" autoFocus required maxLength={160} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Nova ferramenta disponível" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#1A3A6B] focus:outline-none" />
            </div>
            <div>
              <label htmlFor="publicacao-mensagem" className="mb-1.5 block text-sm font-semibold text-slate-700">Mensagem</label>
              <textarea id="publicacao-mensagem" required maxLength={1000} rows={4} value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Escreva uma mensagem clara para os destinatários." className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#1A3A6B] focus:outline-none" />
              <p className="mt-1 text-right text-xs text-slate-400">{mensagem.length}/1000</p>
            </div>
            <div>
              <label htmlFor="publicacao-url" className="mb-1.5 block text-sm font-semibold text-slate-700">Link dentro do sistema <span className="font-normal text-slate-400">(opcional)</span></label>
              <input id="publicacao-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/calendario-missionario" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#1A3A6B] focus:outline-none" />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">Quando publicar?</legend>
              <div className="grid grid-cols-2 gap-2">
                {[['AGORA', 'Publicar agora'], ['AGENDAR', 'Agendar']].map(([valor, rotulo]) => (
                  <label key={valor} className={`cursor-pointer rounded-xl border px-3 py-3 text-center text-sm font-semibold ${quando === valor ? 'border-[#1A3A6B] bg-[#EDF3FA] text-[#1A3A6B]' : 'border-slate-200 text-slate-600'}`}>
                    <input type="radio" name="quando-publicar" value={valor} checked={quando === valor} onChange={() => setQuando(valor)} className="sr-only" />{rotulo}
                  </label>
                ))}
              </div>
            </fieldset>
            {quando === 'AGENDAR' && (
              <div>
                <label htmlFor="publicacao-data" className="mb-1.5 block text-sm font-semibold text-slate-700">Data e horário</label>
                <input id="publicacao-data" type="datetime-local" required min={dataMinima} value={dataHora} onChange={(e) => setDataHora(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-[#1A3A6B] focus:outline-none" />
                <p className="mt-1 text-xs text-slate-500">Horário local deste dispositivo.</p>
              </div>
            )}
          </form>
          <div className="mt-7 border-t border-slate-100 pt-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#142B50]">Suas publicações recentes</h3>
              <button type="button" onClick={() => void carregar()} disabled={carregando} className="text-xs font-semibold text-[#1A3A6B] hover:underline disabled:opacity-50">Atualizar</button>
            </div>
            <div className="mt-3 space-y-2">
              {carregando && !dados && <p className="text-sm text-slate-500">Carregando…</p>}
              {dados?.itens?.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Você ainda não publicou notificações.</p>}
              {dados?.itens?.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 text-sm font-semibold text-[#142B50]">{item.titulo}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.status === 'PUBLICADA' ? 'bg-green-50 text-green-700' : item.status === 'ERRO' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{rotulosStatus[item.status] || item.status}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{item.mensagem}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.modoDestinatarios === 'SELECIONADOS'
                    ? `Seleção: ${[
                      ...(item.perfisSelecionados || []).map((perfil) => rotulosPerfil[perfil] || perfil),
                      ...(item.usuarioIdsSelecionados?.length ? [`${item.usuarioIdsSelecionados.length} pessoa(s) específica(s)`] : []),
                    ].join(' + ')}`
                    : 'Todos no alcance do publicador'}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                    <span>{item.status === 'PUBLICADA' ? `Enviada em ${dataLocal(item.publicadaEm)} · ${item.quantidadeDestinatarios} destinatário(s)` : `Prevista para ${dataLocal(item.agendadaPara)}`}</span>
                    {item.status === 'AGENDADA' && <button type="button" onClick={() => void cancelar(item.id)} className="font-semibold text-red-600 hover:underline">Cancelar</button>}
                  </div>
                  {item.status === 'ERRO' && <p className="mt-2 text-xs text-red-700">O envio falhou. Contate o suporte.</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:justify-end sm:px-7">
          <button type="button" onClick={aoFechar} disabled={salvando} className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 sm:flex-none">Fechar</button>
          <button form="form-publicar-notificacao" type="submit" disabled={salvando || carregando || !dados || (modoDestinatarios === 'SELECIONADOS' && !quantidadeSelecionada)} className="flex-1 rounded-xl bg-[#1A3A6B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#142B50] disabled:opacity-50 sm:flex-none">{salvando ? 'Salvando…' : quando === 'AGENDAR' ? 'Agendar publicação' : 'Publicar agora'}</button>
        </div>
      </div>
    </div>
  );
}
