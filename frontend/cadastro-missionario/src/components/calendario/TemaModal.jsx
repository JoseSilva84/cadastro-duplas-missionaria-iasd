import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { toast } from '../../lib/toast';
import { PERFIS } from '../../contexts/AuthContext';
import {
  DATA_MAX, DATA_MIN, DEPARTAMENTOS, NIVEL_ESTILO, PERFIL_LABEL, STATUS_ACAO,
  corDaAcao, dia, formatarDia, formatarDiaCurto, moeda, origemDaAcao, periodoTema,
} from '../../lib/calendario';

const msgErro = (err, padrao) => err.response?.data?.erro || padrao;

const Campo = ({ label, children, className = '' }) => (
  <label className={`block text-[11px] font-bold uppercase tracking-wider text-slate-500 ${className}`}>
    {label}
    <div className="mt-1 normal-case tracking-normal">{children}</div>
  </label>
);

const Chip = ({ children, className = '' }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${className}`}>{children}</span>
);

const acaoVazia = () => ({
  id: null, nome: '', descricao: '', data: '', valor: '', responsavel: '', departamento: 'OUTRO',
  status: 'PLANEJADA', regiaoId: '', distritoId: '', igrejaId: '',
});

// ---------- formulario de uma acao ----------
function AcaoForm({ inicial, temaId, usuario, listas, onSalvo, onCancelar, onExcluida }) {
  const [form, setForm] = useState(() => ({
    ...inicial,
    data: dia(inicial.data),
    valor: inicial.valor ?? '',
    descricao: inicial.descricao || '',
    responsavel: inicial.responsavel || '',
    departamento: inicial.departamento || 'OUTRO',
    regiaoId: inicial.regiaoId ? String(inicial.regiaoId) : '',
    distritoId: inicial.distritoId ? String(inicial.distritoId) : '',
    igrejaId: inicial.igrejaId ? String(inicial.igrejaId) : '',
  }));
  const [salvando, setSalvando] = useState(false);
  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const perfil = usuario?.perfil;
  const ehAdmin = [PERFIS.SUPER_ADMIN, PERFIS.ADMINISTRADOR].includes(perfil);
  const ehRegional = [PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL].includes(perfil);
  const ehDistrital = perfil === PERFIS.PASTOR_DISTRITAL;
  const ehDiretor = perfil === PERFIS.DIRETOR_MISSIONARIO_IGREJA;

  const regiaoFixa = ehRegional ? String(usuario.regiaoId || '') : ehDistrital ? '' : '';
  const distritosDisponiveis = useMemo(() => {
    const regiao = ehRegional ? regiaoFixa : form.regiaoId;
    return listas.distritos.filter((d) => (!regiao || String(d.regiaoId) === String(regiao))
      && (!ehDistrital || String(d.id) === String(usuario.distritoId)));
  }, [listas.distritos, form.regiaoId, ehRegional, ehDistrital, regiaoFixa, usuario]);
  const igrejasDisponiveis = useMemo(() => {
    const distrito = ehDistrital ? String(usuario.distritoId || '') : form.distritoId;
    return listas.igrejas.filter((i) => (!distrito || String(i.distritoId) === String(distrito)));
  }, [listas.igrejas, form.distritoId, ehDistrital, usuario]);

  const aoMudarRegiao = (v) => setForm((f) => ({ ...f, regiaoId: v, distritoId: '', igrejaId: '' }));
  const aoMudarDistrito = (v) => setForm((f) => ({ ...f, distritoId: v, igrejaId: '' }));

  const nomeDe = (lista, id) => lista.find((x) => String(x.id) === String(id))?.nome;

  const salvar = async () => {
    if (!form.nome.trim()) { toast.error('Informe a ação missionária.'); return; }
    const corpo = {
      temaId,
      nome: form.nome,
      descricao: form.descricao,
      data: form.data || null,
      valor: form.valor === '' ? 0 : Number(form.valor),
      responsavel: form.responsavel,
      departamento: form.departamento,
      status: form.status,
    };
    if (!ehDiretor) {
      corpo.regiaoId = ehRegional ? Number(regiaoFixa) || null : form.regiaoId || null;
      corpo.distritoId = form.distritoId || null;
      corpo.igrejaId = form.igrejaId || null;
    }
    setSalvando(true);
    try {
      const res = form.id
        ? await api.put(`/calendario-missionario/acoes/${form.id}`, corpo)
        : await api.post('/calendario-missionario/acoes', corpo);
      toast.success(form.id ? 'Ação atualizada.' : 'Ação cadastrada.');
      onSalvo(res.data);
    } catch (err) {
      toast.error(msgErro(err, 'Erro ao salvar a ação.'));
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!window.confirm(`Excluir a ação "${form.nome}"?`)) return;
    try {
      await api.delete(`/calendario-missionario/acoes/${form.id}`);
      toast.success('Ação excluída.');
      onExcluida(form.id);
    } catch (err) {
      toast.error(msgErro(err, 'Erro ao excluir a ação.'));
    }
  };

  return (
    <div className="space-y-4 border-t border-slate-100 bg-white p-4">
      <Campo label="Ação missionária *">
        <input className="input-field" value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex.: Feira de Saúde na praça central" autoFocus={!form.id} />
      </Campo>

      <Campo label="Descrição do que será feito">
        <textarea className="input-field min-h-[180px] resize-y leading-relaxed" value={form.descricao} onChange={(e) => set('descricao', e.target.value)}
          placeholder={'Descreva a ação com detalhes: objetivo, público-alvo, local, equipe e voluntários, materiais necessários, como será divulgada, passo a passo...'} />
      </Campo>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Data"><input type="date" className="input-field" min={DATA_MIN} max={DATA_MAX} value={form.data} onChange={(e) => set('data', e.target.value)} /></Campo>
        <Campo label="Orçamento (R$)"><input type="number" inputMode="decimal" min="0" step="0.01" className="input-field" value={form.valor} onChange={(e) => set('valor', e.target.value)} placeholder="0,00" /></Campo>
        <Campo label="Responsável"><input className="input-field" value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} placeholder="Nome" /></Campo>
        <Campo label="Departamento">
          <select className="input-field" value={form.departamento} onChange={(e) => set('departamento', e.target.value)}>
            {Object.entries(DEPARTAMENTOS).map(([k, d]) => <option key={k} value={k}>{d.label}</option>)}
          </select>
        </Campo>
      </div>

      <Campo label="Situação" className="sm:max-w-xs">
        <select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>
          {Object.entries(STATUS_ACAO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Campo>

      <div className="rounded-xl border border-[#1A3A6B]/10 bg-slate-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#C9963A]">Onde acontece</p>
        <p className="mt-1 text-xs text-slate-500">
          Cadastrando como <strong className="text-[#1A3A6B]">{PERFIL_LABEL[perfil] || perfil}</strong>{usuario?.nome ? ` · ${usuario.nome}` : ''}
        </p>
        {ehDiretor ? (
          <p className="mt-2 text-sm font-bold text-[#1A3A6B]">Sua igreja{nomeDe(listas.igrejas, usuario.igrejaId) ? ` · ${nomeDe(listas.igrejas, usuario.igrejaId)}` : ''}</p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(ehAdmin || ehRegional) && (
              <Campo label="Região">
                <select className="input-field" value={ehRegional ? regiaoFixa : form.regiaoId} disabled={ehRegional} onChange={(e) => aoMudarRegiao(e.target.value)}>
                  {!ehRegional && <option value="">Todas / Associação</option>}
                  {listas.regioes.filter((r) => !ehRegional || String(r.id) === regiaoFixa).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </Campo>
            )}
            <Campo label="Distrito">
              <select className="input-field" value={ehDistrital ? String(usuario.distritoId || '') : form.distritoId} disabled={ehDistrital} onChange={(e) => aoMudarDistrito(e.target.value)}>
                {!ehDistrital && <option value="">{ehRegional ? 'Toda a região' : 'Todos'}</option>}
                {distritosDisponiveis.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Igreja">
              <select className="input-field" value={form.igrejaId} onChange={(e) => set('igrejaId', e.target.value)}>
                <option value="">Todas do distrito</option>
                {igrejasDisponiveis.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
              </select>
            </Campo>
          </div>
        )}
        {ehAdmin && !form.regiaoId && !form.distritoId && !form.igrejaId && (
          <p className="mt-2 text-xs text-slate-400">Sem seleção, a ação fica como ação da Associação.</p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          {form.id && <button type="button" className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50" onClick={excluir}>Excluir</button>}
          <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={onCancelar}>Cancelar</button>
        </div>
        <button type="button" className="btn-primary px-6 py-2 text-sm disabled:opacity-60" disabled={salvando} onClick={salvar}>{salvando ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Cadastrar ação'}</button>
      </div>
    </div>
  );
}

// ---------- leitura de uma acao (sem permissao de editar) ----------
function AcaoLeitura({ acao }) {
  const origem = origemDaAcao(acao);
  return (
    <div className="space-y-3 border-t border-slate-100 bg-white p-4 text-sm">
      <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{acao.descricao || <span className="text-slate-400">Sem descrição.</span>}</div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Data', formatarDia(acao.data)], ['Orçamento', moeda(acao.valor)], ['Responsável', acao.responsavel || '—'], ['Situação', STATUS_ACAO[acao.status]]].map(([t, v]) => (
          <div key={t}><dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t}</dt><dd className="font-semibold text-[#1A3A6B]">{v}</dd></div>
        ))}
      </dl>
      <p className="text-xs text-slate-400">Cadastrada por {acao.criadoPorNome || origem.cargo} ({origem.cargo}) · {origem.local}</p>
    </div>
  );
}

// ---------- modal ----------
export default function TemaModal({ tema, destaqueId, permissoes, usuario, listas, onFechar, onMudou }) {
  const novo = !tema?.id;
  const [temaForm, setTemaForm] = useState(() => ({
    nome: tema?.nome || '', descricao: tema?.descricao || '', tipo: tema?.tipo || 'OUTRO',
    dataInicio: dia(tema?.dataInicio), dataFim: dia(tema?.dataFim),
  }));
  const [salvandoTema, setSalvandoTema] = useState(false);
  const [aberta, setAberta] = useState(destaqueId || null);
  const acoes = tema?.acoes || [];
  const total = acoes.reduce((s, a) => s + Number(a.valor || 0), 0);

  useEffect(() => {
    const teclas = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', teclas);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', teclas); document.body.style.overflow = anterior; };
  }, [onFechar]);

  useEffect(() => {
    if (destaqueId) setTimeout(() => document.getElementById(`acao-${destaqueId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
  }, [destaqueId]);

  const setT = (campo, valor) => setTemaForm((f) => ({ ...f, [campo]: valor }));

  const salvarTema = async () => {
    if (!temaForm.nome.trim()) { toast.error('Informe o tema do evento.'); return; }
    const corpo = { ...temaForm, dataInicio: temaForm.dataInicio || null, dataFim: temaForm.dataFim || null };
    setSalvandoTema(true);
    try {
      if (novo) {
        const res = await api.post('/calendario-missionario/temas', corpo);
        toast.success('Tema criado. Agora adicione as ações.');
        onMudou(res.data.id);
      } else {
        await api.put(`/calendario-missionario/temas/${tema.id}`, corpo);
        toast.success('Tema atualizado.');
        onMudou(tema.id);
      }
    } catch (err) {
      toast.error(msgErro(err, 'Erro ao salvar o tema.'));
    } finally {
      setSalvandoTema(false);
    }
  };

  const excluirTema = async () => {
    if (!window.confirm(`Excluir o tema "${tema.nome}" e todas as ${acoes.length} ação(ões) ligadas a ele?`)) return;
    try {
      await api.delete(`/calendario-missionario/temas/${tema.id}`);
      toast.success('Tema excluído.');
      onMudou(null);
      onFechar();
    } catch (err) {
      toast.error(msgErro(err, 'Erro ao excluir o tema.'));
    }
  };

  const editarTema = permissoes.gerenciarTemas;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onFechar} role="dialog" aria-modal="true" aria-label="Evento do calendário">
      <div className="flex max-h-[94vh] w-full flex-col overflow-hidden rounded-t-3xl bg-slate-50 shadow-2xl sm:max-h-[90vh] sm:max-w-3xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {/* cabecalho do tema */}
        <div className="relative bg-gradient-to-br from-[#1A3A6B] to-[#13294d] p-5 text-white">
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/30 sm:hidden" />
          <button type="button" onClick={onFechar} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg transition hover:bg-white/25" aria-label="Fechar">×</button>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E3B965]">Tema do evento</p>
          {editarTema ? (
            <div className="mt-2 space-y-3 pr-10">
              <input className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xl font-bold text-white placeholder-white/50 outline-none focus:border-[#E3B965]" value={temaForm.nome} onChange={(e) => setT('nome', e.target.value)} placeholder="Tema do evento" style={{ fontFamily: 'Georgia, serif' }} />
              <div className="grid grid-cols-2 gap-2 sm:max-w-md">
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Início<input type="date" className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-[#E3B965]" min={DATA_MIN} max={DATA_MAX} value={temaForm.dataInicio} onChange={(e) => setT('dataInicio', e.target.value)} /></label>
                <label className="text-[11px] font-bold uppercase tracking-wider text-white/70">Fim<input type="date" className="mt-1 w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none [color-scheme:dark] focus:border-[#E3B965]" min={DATA_MIN} max={DATA_MAX} value={temaForm.dataFim} onChange={(e) => setT('dataFim', e.target.value)} /></label>
              </div>
              <textarea className="min-h-[70px] w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/50 outline-none focus:border-[#E3B965]" value={temaForm.descricao} onChange={(e) => setT('descricao', e.target.value)} placeholder="Orientações do tema para as igrejas (opcional)" />
              <div className="flex flex-wrap gap-2">
                <button type="button" className="rounded-lg bg-[#C9963A] px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-[#b4852f] disabled:opacity-60" disabled={salvandoTema} onClick={salvarTema}>{salvandoTema ? 'Salvando...' : novo ? 'Criar tema' : 'Salvar tema'}</button>
                {!novo && <button type="button" className="rounded-lg border border-red-300/60 px-4 py-2 text-sm font-bold text-red-200 transition hover:bg-red-500/20" onClick={excluirTema}>Excluir tema</button>}
              </div>
            </div>
          ) : (
            <div className="pr-10">
              <h2 className="mt-1 text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>{tema.nome}</h2>
              <p className="mt-1 text-sm text-white/70">{periodoTema(tema)}</p>
              {tema.descricao && <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white/10 p-3 text-sm leading-relaxed text-white/90">{tema.descricao}</p>}
            </div>
          )}
        </div>

        {/* acoes */}
        {!novo && (
          <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-[#C9963A]">Ações missionárias · {acoes.length}</h3>
              {permissoes.criarAcao && aberta !== 'nova' && (
                <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => setAberta('nova')}>+ Nova ação missionária</button>
              )}
            </div>

            {aberta === 'nova' && (
              <div className="overflow-hidden rounded-xl border-2 border-[#C9963A]/60 bg-white shadow-md">
                <div className="bg-[#FFF8E1] px-4 py-2 text-sm font-bold text-[#1A3A6B]">Nova ação para “{tema.nome}”</div>
                <AcaoForm inicial={acaoVazia()} temaId={tema.id} usuario={usuario} listas={listas}
                  onSalvo={(a) => { setAberta(a.id); onMudou(tema.id); }} onCancelar={() => setAberta(null)} onExcluida={() => {}} />
              </div>
            )}

            {acoes.map((a) => {
              const origem = origemDaAcao(a);
              const aberto = aberta === a.id;
              return (
                <div key={a.id} id={`acao-${a.id}`} className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${aberto ? 'border-[#C9963A]/60 shadow-md' : 'border-slate-200 hover:shadow-md'}`} style={{ borderLeft: `5px solid ${corDaAcao(a)}` }}>
                  <button type="button" className="flex w-full items-start gap-3 p-3 text-left" onClick={() => setAberta(aberto ? null : a.id)} aria-expanded={aberto}>
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-bold text-[#1A3A6B]">{a.nome}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <Chip className={NIVEL_ESTILO[origem.nivel]}>{origem.cargo}</Chip>
                        <Chip className="bg-slate-100 text-slate-600">{origem.local}</Chip>
                        {a.data && <Chip className="bg-[#C9963A]/10 text-[#9a6f1f]">{formatarDiaCurto(a.data)}</Chip>}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-[#1A3A6B]">{moeda(a.valor)}</p>
                      <p className="mt-1 text-xs text-slate-400">{aberto ? 'Fechar ▲' : a.podeEditar ? 'Editar ▼' : 'Ver ▼'}</p>
                    </div>
                  </button>
                  {aberto && (a.podeEditar && permissoes.criarAcao
                    ? <AcaoForm inicial={a} temaId={tema.id} usuario={usuario} listas={listas}
                      onSalvo={() => { onMudou(tema.id); }} onCancelar={() => setAberta(null)} onExcluida={() => { setAberta(null); onMudou(tema.id); }} />
                    : <AcaoLeitura acao={a} />)}
                </div>
              );
            })}

            {acoes.length === 0 && aberta !== 'nova' && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <p className="font-bold text-[#1A3A6B]">Nenhuma ação missionária ainda</p>
                <p className="mt-1 text-sm text-slate-400">{permissoes.criarAcao ? 'Use o botão acima para cadastrar a primeira ação deste tema.' : 'As ações cadastradas aparecerão aqui.'}</p>
              </div>
            )}
          </div>
        )}

        {novo && editarTema && <p className="p-5 text-sm text-slate-500">Depois de criar o tema, você poderá adicionar as ações missionárias.</p>}

        {!novo && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Orçamento do tema</span>
            <span className="text-lg font-bold text-[#1A3A6B]">{moeda(total)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
