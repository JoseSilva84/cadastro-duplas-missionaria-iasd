import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { toast } from '../../lib/toast';
import { PERFIS } from '../../contexts/AuthContext';
import {
  DATA_MAX, DATA_MIN, DEPARTAMENTOS, NIVEL_ESTILO, PERFIL_LABEL, STATUS_ACAO,
  corDaAcao, dia, formatarDia, formatarDiaCurto, moeda, origemDaAcao,
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

// Formulário de cadastro/edição de uma ação missionária
function AcaoForm({ inicial, evento, temaId, usuario, listas, onSalvo, onCancelar, onExcluida }) {
  const [form, setForm] = useState(() => ({
    ...inicial,
    data: dia(inicial.data) || dia(evento?.data) || '',
    valor: inicial.valor ?? '',
    descricao: inicial.descricao || '',
    responsavel: inicial.responsavel || '',
    departamento: inicial.departamento || evento?.departamento || 'OUTRO',
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
  const ehLocal = [PERFIS.DIRETOR_MISSIONARIO_IGREJA, PERFIS.DUPLA_MISSIONARIA].includes(perfil);

  const regiaoFixa = ehRegional ? String(usuario.regiaoId || '') : '';
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
      eventoId: evento.id,
      nome: form.nome,
      descricao: form.descricao,
      data: form.data || null,
      valor: form.valor === '' ? 0 : Number(form.valor),
      responsavel: form.responsavel,
      departamento: form.departamento,
      status: form.status,
    };
    if (!ehLocal) {
      corpo.regiaoId = ehRegional ? Number(regiaoFixa) || null : form.regiaoId || null;
      corpo.distritoId = form.distritoId || null;
      corpo.igrejaId = form.igrejaId || null;
    }
    setSalvando(true);
    try {
      const res = form.id
        ? await api.put(`/calendario-missionario/acoes/${form.id}`, corpo)
        : await api.post('/calendario-missionario/acoes', corpo);
      toast.success(form.id ? 'Ação atualizada.' : 'Ação cadastrada para este evento!');
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
    <div className="space-y-4 rounded-xl border border-[#C9963A]/40 bg-white p-4 shadow-sm">
      <div className="border-b border-slate-100 pb-2">
        <p className="text-xs font-bold text-[#1A3A6B]">
          {form.id ? 'Editando ação missionária' : `Nova ação para o evento “${evento.nome}”`}
        </p>
      </div>

      <Campo label="Ação Missionária *">
        <input
          className="input-field"
          value={form.nome}
          onChange={(e) => set('nome', e.target.value)}
          placeholder="Ex.: Distribuição de Cestas Básicas e Pesquisas Bíblicas"
          autoFocus={!form.id}
        />
      </Campo>

      <Campo label="Planejamento e Descrição detalhada">
        <textarea
          className="input-field min-h-[140px] resize-y leading-relaxed"
          value={form.descricao}
          onChange={(e) => set('descricao', e.target.value)}
          placeholder="Descreva o planejamento: objetivo, público-alvo, como a igreja/distrito vai atuar, equipes, materiais necessários, divulgação, metas..."
        />
      </Campo>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Data da Ação">
          <input
            type="date"
            className="input-field"
            min={DATA_MIN}
            max={DATA_MAX}
            value={form.data}
            onChange={(e) => set('data', e.target.value)}
          />
        </Campo>

        <Campo label="Orçamento (R$)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            className="input-field"
            value={form.valor}
            onChange={(e) => set('valor', e.target.value)}
            placeholder="0,00"
          />
        </Campo>

        <Campo label="Responsável">
          <input
            className="input-field"
            value={form.responsavel}
            onChange={(e) => set('responsavel', e.target.value)}
            placeholder="Nome do líder"
          />
        </Campo>

        <Campo label="Departamento">
          <select
            className="input-field"
            value={form.departamento}
            onChange={(e) => set('departamento', e.target.value)}
          >
            {Object.entries(DEPARTAMENTOS).map(([k, d]) => (
              <option key={k} value={k}>{d.label}</option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo label="Situação" className="sm:max-w-xs">
        <select
          className="input-field"
          value={form.status}
          onChange={(e) => set('status', e.target.value)}
        >
          {Object.entries(STATUS_ACAO).map(([k, l]) => (
            <option key={k} value={k}>{l}</option>
          ))}
        </select>
      </Campo>

      <div className="rounded-xl border border-[#1A3A6B]/10 bg-slate-50 p-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#C9963A]">Local de Atuação</p>
        <p className="mt-1 text-xs text-slate-500">
          Cadastrando como <strong className="text-[#1A3A6B]">{PERFIL_LABEL[perfil] || perfil}</strong>
          {usuario?.nome ? ` · ${usuario.nome}` : ''}
        </p>

        {ehLocal ? (
          <p className="mt-2 text-sm font-bold text-[#1A3A6B]">
            Sua igreja{nomeDe(listas.igrejas, usuario.igrejaId) ? ` · ${nomeDe(listas.igrejas, usuario.igrejaId)}` : ''}
          </p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(ehAdmin || ehRegional) && (
              <Campo label="Região">
                <select
                  className="input-field"
                  value={ehRegional ? regiaoFixa : form.regiaoId}
                  disabled={ehRegional}
                  onChange={(e) => aoMudarRegiao(e.target.value)}
                >
                  {!ehRegional && <option value="">Todas / Associação</option>}
                  {listas.regioes.filter((r) => !ehRegional || String(r.id) === regiaoFixa).map((r) => (
                    <option key={r.id} value={r.id}>{r.nome}</option>
                  ))}
                </select>
              </Campo>
            )}

            <Campo label="Distrito">
              <select
                className="input-field"
                value={ehDistrital ? String(usuario.distritoId || '') : form.distritoId}
                disabled={ehDistrital}
                onChange={(e) => aoMudarDistrito(e.target.value)}
              >
                {!ehDistrital && <option value="">{ehRegional ? 'Toda a região' : 'Todos'}</option>}
                {distritosDisponiveis.map((d) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Igreja">
              <select
                className="input-field"
                value={form.igrejaId}
                onChange={(e) => set('igrejaId', e.target.value)}
              >
                <option value="">Todas do distrito</option>
                {igrejasDisponiveis.map((i) => (
                  <option key={i.id} value={i.id}>{i.nome}</option>
                ))}
              </select>
            </Campo>
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between pt-2">
        <div className="flex gap-2">
          {form.id && (
            <button
              type="button"
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
              onClick={excluir}
            >
              Excluir
            </button>
          )}
          <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={onCancelar}>
            Cancelar
          </button>
        </div>
        <button
          type="button"
          className="btn-primary px-6 py-2 text-sm disabled:opacity-60"
          disabled={salvando}
          onClick={salvar}
        >
          {salvando ? 'Salvando...' : form.id ? 'Salvar alterações' : 'Salvar ação missionária'}
        </button>
      </div>
    </div>
  );
}

// Leitura de uma ação
function AcaoLeitura({ acao }) {
  const origem = origemDaAcao(acao);
  return (
    <div className="space-y-3 border-t border-slate-100 bg-white p-4 text-sm">
      <div className="whitespace-pre-wrap leading-relaxed text-slate-700">
        {acao.descricao || <span className="text-slate-400">Sem descrição detalhada.</span>}
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Data', formatarDia(acao.data)],
          ['Orçamento', moeda(acao.valor)],
          ['Responsável', acao.responsavel || '—'],
          ['Situação', STATUS_ACAO[acao.status] || acao.status],
        ].map(([t, v]) => (
          <div key={t}>
            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t}</dt>
            <dd className="font-semibold text-[#1A3A6B]">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-slate-400">
        Cadastrada por {acao.criadoPorNome || origem.cargo} ({origem.cargo}) · {origem.local}
      </p>
    </div>
  );
}

export default function EventoModal({
  evento,
  tema,
  destaqueAcaoId,
  permissoes,
  usuario,
  listas,
  onFechar,
  onMudou,
}) {
  const [aberta, setAberta] = useState(destaqueAcaoId || null);
  const acoes = evento?.acoes || [];
  const orcamentoTotal = acoes.reduce((s, a) => s + Number(a.valor || 0), 0);
  const depto = DEPARTAMENTOS[evento?.departamento] || DEPARTAMENTOS.OUTRO;

  useEffect(() => {
    const teclas = (e) => { if (e.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', teclas);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', teclas);
      document.body.style.overflow = anterior;
    };
  }, [onFechar]);

  useEffect(() => {
    if (destaqueAcaoId) {
      setTimeout(() => {
        document.getElementById(`acao-${destaqueAcaoId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 120);
    }
  }, [destaqueAcaoId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative my-auto flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Evento com Tema de destino */}
        <div
          className="relative text-white p-5 sm:p-6"
          style={{ background: `linear-gradient(135deg, ${depto.cor}, #1A3A6B)` }}
        >
          <button
            type="button"
            onClick={onFechar}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl font-bold transition hover:bg-white/25"
            aria-label="Fechar"
          >
            ×
          </button>

          <div className="flex flex-wrap items-center gap-2 pr-10">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              {depto.label}
            </span>
            {tema && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#E3B965]/20 border border-[#E3B965]/40 px-2.5 py-0.5 text-[11px] font-black text-[#FFF2C2]">
                <span>➔ Aponta para:</span>
                <strong className="text-white underline decoration-[#E3B965]">{tema.nome}</strong>
              </span>
            )}
          </div>

          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl" style={{ fontFamily: 'Georgia, serif' }}>
            {evento?.nome}
          </h2>

          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/80 font-medium">
            <span>Data de referência: <strong>{formatarDia(evento?.data)}</strong></span>
            {evento?.descricao && <span>· {evento.descricao}</span>}
          </div>
        </div>

        {/* Corpo com lista de ações e formulário */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1A3A6B]">
                Ações Missionárias das Igrejas e Distritos
              </h3>
              <p className="text-xs text-slate-500">
                {acoes.length} ação(ões) cadastradas frente a este evento
              </p>
            </div>

            {permissoes.criarAcao && aberta !== 'nova' && (
              <button
                type="button"
                className="btn-primary px-4 py-2 text-xs font-bold shadow-sm"
                onClick={() => setAberta('nova')}
              >
                + Nova Ação Missionária
              </button>
            )}
          </div>

          {/* Formulário para nova ação */}
          {aberta === 'nova' && (
            <AcaoForm
              inicial={acaoVazia()}
              evento={evento}
              temaId={tema?.id || evento?.temaId}
              usuario={usuario}
              listas={listas}
              onSalvo={(a) => {
                setAberta(a.id);
                onMudou();
              }}
              onCancelar={() => setAberta(null)}
              onExcluida={() => {}}
            />
          )}

          {/* Lista de Ações deste Evento */}
          {acoes.map((a) => {
            const origem = origemDaAcao(a);
            const aberto = aberta === a.id;
            return (
              <div
                key={a.id}
                id={`acao-${a.id}`}
                className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
                  aberto ? 'border-[#C9963A] ring-2 ring-[#C9963A]/30 shadow-md' : 'border-slate-200 hover:shadow-md'
                }`}
                style={{ borderLeft: `5px solid ${corDaAcao(a)}` }}
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-3 p-3.5 text-left"
                  onClick={() => setAberta(aberto ? null : a.id)}
                  aria-expanded={aberto}
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-black text-[#1A3A6B] text-base">{a.nome}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Chip className={NIVEL_ESTILO[origem.nivel]}>{origem.cargo}</Chip>
                      <Chip className="bg-slate-100 text-slate-700">{origem.local}</Chip>
                      {a.data && <Chip className="bg-[#C9963A]/10 text-[#9a6f1f]">{formatarDiaCurto(a.data)}</Chip>}
                      <Chip className="bg-slate-100 text-slate-500">{STATUS_ACAO[a.status] || a.status}</Chip>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-black text-[#1A3A6B]">{moeda(a.valor)}</p>
                    <p className="mt-1 text-xs font-bold text-[#C9963A]">
                      {aberto ? 'Fechar ▲' : a.podeEditar ? 'Editar / Detalhes ▼' : 'Ver Detalhes ▼'}
                    </p>
                  </div>
                </button>

                {aberto && (
                  a.podeEditar && permissoes.criarAcao ? (
                    <AcaoForm
                      inicial={a}
                      evento={evento}
                      temaId={tema?.id || evento?.temaId}
                      usuario={usuario}
                      listas={listas}
                      onSalvo={() => onMudou()}
                      onCancelar={() => setAberta(null)}
                      onExcluida={() => {
                        setAberta(null);
                        onMudou();
                      }}
                    />
                  ) : (
                    <AcaoLeitura acao={a} />
                  )
                )}
              </div>
            );
          })}

          {acoes.length === 0 && aberta !== 'nova' && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="font-bold text-[#1A3A6B]">Nenhuma ação cadastrada para este evento ainda</p>
              <p className="mt-1 text-xs text-slate-400">
                {permissoes.criarAcao
                  ? 'Clique no botão acima para cadastrar a ação planejada pela sua igreja ou distrito.'
                  : 'As ações planejadas aparecerão aqui.'}
              </p>
            </div>
          )}
        </div>

        {/* Rodapé do Evento */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-5 py-3.5">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">Orçamento Previsto</span>
            <p className="text-lg font-black text-[#1A3A6B]">{moeda(orcamentoTotal)}</p>
          </div>
          <button type="button" className="btn-outline px-4 py-1.5 text-xs font-bold" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
