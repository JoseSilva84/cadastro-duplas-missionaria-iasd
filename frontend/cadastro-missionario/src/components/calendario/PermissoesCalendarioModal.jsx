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

const novoFormulario = (regiaoId = '') => ({
  perfil: 'PASTOR_REGIONAL',
  abrangencia: 'REGIAO',
  regiaoId: regiaoId ? String(regiaoId) : '',
  distritoId: '',
  podeVisualizar: true,
  podeEditar: false,
});

const Toggle = ({ ativo, onChange, titulo, descricao, cor = 'emerald' }) => (
  <button
    type="button"
    role="switch"
    aria-checked={ativo}
    onClick={() => onChange(!ativo)}
    className={`flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-left transition ${
      ativo
        ? cor === 'blue' ? 'border-blue-200 bg-blue-50' : 'border-emerald-200 bg-emerald-50'
        : 'border-slate-200 bg-slate-50'
    }`}
  >
    <span>
      <span className="block text-sm font-bold text-[#1A3A6B]">{titulo}</span>
      <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{descricao}</span>
    </span>
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${ativo ? (cor === 'blue' ? 'bg-blue-600' : 'bg-emerald-600') : 'bg-slate-300'}`}>
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
    (distrito) => String(distrito.regiaoId) === String(form.regiaoId)
  ), [listas.distritos, form.regiaoId]);

  const carregar = async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/calendario-missionario/permissoes');
      setRegras(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao carregar as permissões do calendário.');
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

  const alterar = (campo, valor) => setForm((atual) => {
    if (campo === 'regiaoId') return { ...atual, regiaoId: valor, distritoId: '' };
    if (campo === 'abrangencia') return { ...atual, abrangencia: valor, distritoId: '' };
    if (campo === 'podeVisualizar' && !valor) return { ...atual, podeVisualizar: false, podeEditar: false };
    if (campo === 'podeEditar' && valor) return { ...atual, podeVisualizar: true, podeEditar: true };
    return { ...atual, [campo]: valor };
  });

  const salvar = async () => {
    if (!form.regiaoId) { toast.error('Selecione a região.'); return; }
    if (form.abrangencia === 'DISTRITO' && !form.distritoId) { toast.error('Selecione o distrito.'); return; }
    setSalvando(true);
    try {
      await api.post('/calendario-missionario/permissoes', {
        perfil: form.perfil,
        regiaoId: Number(form.regiaoId),
        distritoId: form.abrangencia === 'DISTRITO' ? Number(form.distritoId) : null,
        podeVisualizar: form.podeVisualizar,
        podeEditar: form.podeEditar,
      });
      toast.success('Permissão do calendário salva.');
      setForm(novoFormulario(form.regiaoId));
      await carregar();
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar a permissão.');
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
      <div className="relative my-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titulo-permissoes-calendario">
        <div className="bg-gradient-to-br from-[#1A3A6B] to-[#112749] px-5 py-5 text-white sm:px-6">
          <button type="button" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl hover:bg-white/20" onClick={onFechar} aria-label="Fechar">×</button>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-[#E3B965]">Controle de acesso</p>
          <h2 id="titulo-permissoes-calendario" className="mt-1 pr-12 text-2xl font-black" style={{ fontFamily: 'Georgia, serif' }}>Permissões do Calendário Missionário</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/75">Escolha o perfil e aplique a regra em toda uma região ou somente em um distrito. Uma regra distrital prevalece sobre a regra regional.</p>
        </div>

        <div className="grid flex-1 gap-5 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-base font-black text-[#1A3A6B]">Conceder ou alterar uma permissão</h3>
            <p className="mt-1 text-xs text-slate-500">Salvar novamente o mesmo perfil e local atualiza a regra existente.</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">Nível de acesso
                <select className="input-field mt-1" value={form.perfil} onChange={(event) => alterar('perfil', event.target.value)}>
                  {PERFIS.map((perfil) => <option key={perfil} value={perfil}>{PERFIL_LABEL[perfil] || perfil}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">Aplicar em
                <select className="input-field mt-1" value={form.abrangencia} onChange={(event) => alterar('abrangencia', event.target.value)}>
                  <option value="REGIAO">Toda a região</option>
                  <option value="DISTRITO">Distrito específico</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">Região
                <select className="input-field mt-1" value={form.regiaoId} onChange={(event) => alterar('regiaoId', event.target.value)}>
                  <option value="">Selecione...</option>
                  {listas.regioes.map((regiao) => <option key={regiao.id} value={regiao.id}>{regiao.nome}</option>)}
                </select>
              </label>
              {form.abrangencia === 'DISTRITO' && (
                <label className="text-xs font-bold text-slate-600 sm:col-span-2">Distrito
                  <select className="input-field mt-1" value={form.distritoId} onChange={(event) => alterar('distritoId', event.target.value)} disabled={!form.regiaoId}>
                    <option value="">Selecione o distrito...</option>
                    {distritos.map((distrito) => <option key={distrito.id} value={distrito.id}>{distrito.nome}</option>)}
                  </select>
                </label>
              )}
            </div>

            <div className="mt-4 space-y-3">
              <Toggle ativo={form.podeVisualizar} onChange={(valor) => alterar('podeVisualizar', valor)} titulo="Pode visualizar o calendário" descricao="Permite abrir o calendário e consultar temas, eventos e ações do próprio escopo." cor="blue" />
              <Toggle ativo={form.podeEditar} onChange={(valor) => alterar('podeEditar', valor)} titulo="Pode editar o calendário" descricao="Permite cadastrar e alterar as próprias ações. Perfis de liderança também poderão gerenciar eventos." />
            </div>

            <button type="button" className="btn-primary mt-5 w-full px-5 py-2.5 text-sm disabled:opacity-60" disabled={salvando} onClick={salvar}>
              {salvando ? 'Salvando...' : 'Salvar permissão'}
            </button>
          </section>

          <section className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[#1A3A6B]">Regras configuradas</h3>
                <p className="text-xs text-slate-500">{regras.length} regra(s) personalizada(s)</p>
              </div>
            </div>

            <div className="mt-3 space-y-2.5">
              {carregando && <p className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-400">Carregando permissões...</p>}
              {!carregando && regras.map((regra) => (
                <article key={regra.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-[#1A3A6B]">{PERFIL_LABEL[regra.perfil] || regra.perfil}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{regra.distrito ? `Distrito ${regra.distrito.nome}` : `Região ${regra.regiao?.nome || ''}`}</p>
                    </div>
                    <button type="button" className="shrink-0 text-xs font-bold text-red-600 hover:underline" onClick={() => setExcluirAlvo(regra)}>Remover</button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${regra.podeVisualizar ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>{regra.podeVisualizar ? 'Pode visualizar' : 'Sem visualização'}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${regra.podeEditar ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{regra.podeEditar ? 'Pode editar' : 'Somente consulta'}</span>
                  </div>
                </article>
              ))}
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
