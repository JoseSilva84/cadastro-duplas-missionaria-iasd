import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { toast } from '../../lib/toast';
import { PERFIL_LABEL } from '../../lib/calendario';

const PERFIS = [
  'PASTOR_REGIONAL',
  'COORDENADOR_REGIONAL',
  'PASTOR_DISTRITAL',
  'DIRETOR_MISSIONARIO_IGREJA',
  'DUPLA_MISSIONARIA',
];

const GRUPOS_PERMISSOES = [
  {
    titulo: 'Temas oficiais',
    descricao: 'Os temas são gerais e aparecem para todos que visualizam o calendário.',
    itens: [
      ['podeCriarTema', 'Adicionar tema'],
      ['podeEditarTema', 'Editar tema'],
      ['podeExcluirTema', 'Excluir tema'],
    ],
  },
  {
    titulo: 'Eventos preparatórios',
    descricao: 'Ex.: Ações ASA, Feira de Saúde e outros eventos ligados ao tema.',
    itens: [
      ['podeCriarEvento', 'Adicionar evento'],
      ['podeEditarEvento', 'Editar evento'],
      ['podeExcluirEvento', 'Excluir evento'],
    ],
  },
  {
    titulo: 'Ações missionárias',
    descricao: 'Define o que o perfil poderá fazer com as ações do próprio acesso.',
    itens: [
      ['podeCriarAcao', 'Adicionar ação'],
      ['podeEditarAcao', 'Editar dados da ação'],
      ['podeExcluirAcao', 'Excluir ação'],
    ],
  },
  {
    titulo: 'Conteúdo das ações',
    descricao: 'Controle separado para as informações mais sensíveis do planejamento.',
    itens: [
      ['podeEditarPlanejamento', 'Editar planejamento'],
      ['podeEditarOrcamento', 'Editar orçamento'],
    ],
  },
];

const CAMPOS_EDICAO = GRUPOS_PERMISSOES.flatMap((grupo) => grupo.itens.map(([campo]) => campo));
const ROTULO_PERMISSAO = Object.fromEntries(
  GRUPOS_PERMISSOES.flatMap((grupo) => grupo.itens.map(([campo, rotulo]) => [campo, rotulo]))
);

const novoFormulario = (regiaoId = '') => ({
  perfis: ['PASTOR_REGIONAL'],
  abrangencia: 'REGIAO',
  regiaoIds: regiaoId ? [String(regiaoId)] : [],
  distritoIds: [],
  podeVisualizar: true,
  ...Object.fromEntries(CAMPOS_EDICAO.map((campo) => [campo, false])),
});

const SelecaoMultipla = ({ titulo, opcoes, selecionados, onChange, vazio = 'Nenhuma opção disponível.' }) => (
  <fieldset>
    <legend className="text-xs font-bold text-slate-600">{titulo}</legend>
    <div className="mt-1.5 flex max-h-36 flex-wrap gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-2.5">
      {opcoes.map((opcao) => {
        const valor = String(opcao.valor);
        const ativo = selecionados.includes(valor);
        return (
          <label
            key={valor}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition ${
              ativo ? 'border-[#1A3A6B] bg-[#1A3A6B] text-white shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-[#1A3A6B]/40'
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={ativo}
              onChange={() => onChange(ativo ? selecionados.filter((item) => item !== valor) : [...selecionados, valor])}
            />
            <span className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${ativo ? 'border-white/70 bg-white/15' : 'border-slate-300'}`}>
              {ativo ? '✓' : ''}
            </span>
            {opcao.rotulo}
          </label>
        );
      })}
      {!opcoes.length && <p className="p-2 text-xs text-slate-400">{vazio}</p>}
    </div>
  </fieldset>
);

const Toggle = ({ ativo, onChange, titulo, descricao, destaque = false }) => (
  <button
    type="button"
    role="switch"
    aria-checked={ativo}
    onClick={() => onChange(!ativo)}
    className={`flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-left transition ${
      ativo
        ? destaque ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'
        : 'border-slate-200 bg-slate-50'
    }`}
  >
    <span>
      <span className="block text-sm font-bold text-[#1A3A6B]">{titulo}</span>
      {descricao && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{descricao}</span>}
    </span>
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${ativo ? (destaque ? 'bg-blue-600' : 'bg-emerald-600') : 'bg-slate-300'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${ativo ? 'left-6' : 'left-1'}`} />
    </span>
  </button>
);

export default function PermissoesCalendarioModal({ listas, onFechar }) {
  const [regras, setRegras] = useState([]);
  const [form, setForm] = useState(() => novoFormulario(listas.regioes[0]?.id));
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [excluirAlvo, setExcluirAlvo] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  const distritos = useMemo(() => listas.distritos.filter(
    (distrito) => form.regiaoIds.includes(String(distrito.regiaoId))
  ), [listas.distritos, form.regiaoIds]);

  const carregar = async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/calendario-missionario/permissoes');
      setRegras(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao listar permissões do calendário.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    const fecharComEsc = (event) => { if (event.key === 'Escape') onFechar(); };
    document.addEventListener('keydown', fecharComEsc);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', fecharComEsc);
      document.body.style.overflow = overflowAnterior;
    };
  }, [onFechar]);

  const alterarRegioes = (regiaoIds) => setForm((atual) => {
    const idsDistritosValidos = new Set(
      listas.distritos.filter((distrito) => regiaoIds.includes(String(distrito.regiaoId))).map((distrito) => String(distrito.id))
    );
    return { ...atual, regiaoIds, distritoIds: atual.distritoIds.filter((id) => idsDistritosValidos.has(id)) };
  });

  const alterarPermissao = (campo, valor) => setForm((atual) => {
    if (campo === 'podeVisualizar' && !valor) {
      return { ...atual, podeVisualizar: false, ...Object.fromEntries(CAMPOS_EDICAO.map((chave) => [chave, false])) };
    }
    if (campo !== 'podeVisualizar' && valor) return { ...atual, podeVisualizar: true, [campo]: true };
    return { ...atual, [campo]: valor };
  });

  const salvar = async () => {
    if (!form.perfis.length) { toast.error('Selecione ao menos um nível de acesso.'); return; }
    if (!form.regiaoIds.length) { toast.error('Selecione ao menos uma região.'); return; }
    if (form.abrangencia === 'DISTRITO' && !form.distritoIds.length) { toast.error('Selecione ao menos um distrito.'); return; }
    setSalvando(true);
    try {
      const { data } = await api.post('/calendario-missionario/permissoes', {
        ...Object.fromEntries(['podeVisualizar', ...CAMPOS_EDICAO].map((campo) => [campo, form[campo]])),
        perfis: form.perfis,
        abrangencia: form.abrangencia,
        regiaoIds: form.regiaoIds.map(Number),
        ...(form.abrangencia === 'DISTRITO' ? { distritoIds: form.distritoIds.map(Number) } : {}),
      });
      const quantidade = Array.isArray(data) ? data.length : 1;
      toast.success(`${quantidade} permissão(ões) salva(s) com sucesso.`);
      setForm(novoFormulario(form.regiaoIds[0]));
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar as permissões.');
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!excluirAlvo) return;
    setExcluindo(true);
    try {
      await api.delete(`/calendario-missionario/permissoes/${excluirAlvo.id}`);
      toast.success('Regra removida. O padrão do sistema voltou a valer.');
      setExcluirAlvo(null);
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao remover a regra.');
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm sm:p-6" onClick={onFechar}>
      <div className="relative my-auto flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titulo-permissoes-calendario">
        <div className="bg-gradient-to-br from-[#1A3A6B] to-[#112749] px-5 py-5 text-white sm:px-6">
          <button type="button" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20" onClick={onFechar} aria-label="Fechar">×</button>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#E3B965]">Controle detalhado de acesso</p>
          <h2 id="titulo-permissoes-calendario" className="mt-1 pr-12 text-2xl font-black" style={{ fontFamily: 'Georgia, serif' }}>Permissões do Calendário Missionário</h2>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-white/75">Selecione vários níveis e regiões para aplicar a mesma regra de uma só vez. Regras de distrito continuam prevalecendo sobre regras da região.</p>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div>
              <h3 className="text-base font-black text-[#1A3A6B]">Conceder ou alterar permissões</h3>
              <p className="mt-1 text-xs text-slate-500">A combinação de perfil e local que já existir será atualizada.</p>
            </div>

            <SelecaoMultipla
              titulo="Níveis de acesso — selecione um ou mais"
              opcoes={PERFIS.map((perfil) => ({ valor: perfil, rotulo: PERFIL_LABEL[perfil] || perfil }))}
              selecionados={form.perfis}
              onChange={(perfis) => setForm((atual) => ({ ...atual, perfis }))}
            />

            <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
              <label className="text-xs font-bold text-slate-600">Aplicar em
                <select className="input-field mt-1" value={form.abrangencia} onChange={(event) => setForm((atual) => ({ ...atual, abrangencia: event.target.value, distritoIds: [] }))}>
                  <option value="REGIAO">Regiões inteiras</option>
                  <option value="DISTRITO">Distritos específicos</option>
                </select>
              </label>
              <SelecaoMultipla
                titulo="Regiões — selecione uma ou mais"
                opcoes={listas.regioes.map((regiao) => ({ valor: regiao.id, rotulo: regiao.nome }))}
                selecionados={form.regiaoIds}
                onChange={alterarRegioes}
              />
            </div>

            {form.abrangencia === 'DISTRITO' && (
              <SelecaoMultipla
                titulo="Distritos específicos — selecione um ou mais"
                opcoes={distritos.map((distrito) => ({ valor: distrito.id, rotulo: distrito.nome }))}
                selecionados={form.distritoIds}
                onChange={(distritoIds) => setForm((atual) => ({ ...atual, distritoIds }))}
                vazio="Selecione primeiro uma ou mais regiões."
              />
            )}

            <Toggle ativo={form.podeVisualizar} onChange={(valor) => alterarPermissao('podeVisualizar', valor)} titulo="Pode visualizar o calendário" descricao="Sem esta opção, o perfil não consegue abrir o calendário naquele local." destaque />

            <div className="grid gap-3 sm:grid-cols-2">
              {GRUPOS_PERMISSOES.map((grupo) => (
                <div key={grupo.titulo} className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-sm font-black text-[#1A3A6B]">{grupo.titulo}</p>
                  <p className="mt-0.5 min-h-8 text-[11px] leading-relaxed text-slate-500">{grupo.descricao}</p>
                  <div className="mt-2 space-y-2">
                    {grupo.itens.map(([campo, rotulo]) => (
                      <Toggle key={campo} ativo={form[campo]} onChange={(valor) => alterarPermissao(campo, valor)} titulo={rotulo} />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" className="btn-primary w-full px-5 py-2.5 text-sm disabled:opacity-60" disabled={salvando} onClick={salvar}>
              {salvando ? 'Salvando...' : 'Salvar permissões selecionadas'}
            </button>
          </section>

          <section className="min-w-0">
            <div>
              <h3 className="text-base font-black text-[#1A3A6B]">Regras configuradas</h3>
              <p className="text-xs text-slate-500">{regras.length} regra(s) personalizada(s)</p>
            </div>

            <div className="mt-3 space-y-2.5">
              {carregando && <p className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-400">Carregando permissões...</p>}
              {!carregando && regras.map((regra) => {
                const ativas = CAMPOS_EDICAO.filter((campo) => regra[campo]);
                return (
                  <article key={regra.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-black text-[#1A3A6B]">{PERFIL_LABEL[regra.perfil] || regra.perfil}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{regra.distrito ? `Distrito ${regra.distrito.nome}` : `Região ${regra.regiao?.nome || ''}`}</p>
                      </div>
                      <button type="button" className="shrink-0 text-xs font-bold text-red-600 hover:underline" onClick={() => setExcluirAlvo(regra)}>Remover</button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${regra.podeVisualizar ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{regra.podeVisualizar ? 'Pode visualizar' : 'Sem visualização'}</span>
                      {ativas.map((campo) => <span key={campo} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{ROTULO_PERMISSAO[campo]}</span>)}
                      {regra.podeVisualizar && !ativas.length && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Somente consulta</span>}
                    </div>
                  </article>
                );
              })}
              {!carregando && regras.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">Nenhuma regra personalizada. Os acessos atuais continuam seguindo o padrão do sistema.</p>}
            </div>
          </section>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-white px-5 py-3">
          <button type="button" className="btn-outline px-5 py-2 text-sm" onClick={onFechar}>Fechar</button>
        </div>

        {excluirAlvo && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm" onClick={() => setExcluirAlvo(null)}>
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#C9963A]">Confirmar alteração</p>
              <h3 className="mt-1 text-xl font-black text-[#1A3A6B]">Remover esta regra?</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">O acesso voltará a seguir o padrão original do sistema para este perfil e local.</p>
              <div className="mt-5 flex justify-end gap-2">
                <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => setExcluirAlvo(null)}>Cancelar</button>
                <button type="button" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60" disabled={excluindo} onClick={excluir}>{excluindo ? 'Removendo...' : 'Remover regra'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
