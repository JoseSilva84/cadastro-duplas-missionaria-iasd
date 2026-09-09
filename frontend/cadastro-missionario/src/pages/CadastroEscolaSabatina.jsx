import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';
import BackButton from '../components/BackButton';
import { ehAdmin, useAuth } from '../contexts/AuthContext';

const estadoInicial = {
  distritoId: '',
  igrejaId: '',
  unidadesAcao: '',
  classeProfessores: '',
  classeInteressados: '',
  visitasDiretores: '',
  visitasProfessores: '',
  visitasAlunos: '',
  quantidadePequenosGrupos: '',
  observacoes: '',
};

const Campo = ({ label, children, obrigatorio }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-600 mb-1.5">
      {label} {obrigatorio && <span className="text-red-400">*</span>}
    </span>
    {children}
  </label>
);

const Secao = ({ numero, titulo, children }) => (
  <section className="card">
    <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
      <div className="w-9 h-9 rounded-lg bg-[#1A3A6B] flex items-center justify-center text-white font-bold text-sm shadow-md">
        {numero}
      </div>
      <h2 className="font-bold text-[#1A3A6B]">{titulo}</h2>
    </div>
    {children}
  </section>
);

const nomeDupla = (dupla) => `${dupla.liderNome || 'Lider'} + ${dupla.membro2Nome || 'Membro'}`;

export default function CadastroEscolaSabatina() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const isDireto = location.pathname.startsWith('/direto');

  const [form, setForm] = useState(estadoInicial);
  const [distritos, setDistritos] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [duplas, setDuplas] = useState([]);
  const [duplaIds, setDuplaIds] = useState([]);
  const [busca, setBusca] = useState('');
  const [pequenosGruposEditado, setPequenosGruposEditado] = useState(false);
  const [carregandoDuplas, setCarregandoDuplas] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cadastros, setCadastros] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  const [excluindoId, setExcluindoId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/distritos'),
      api.get('/igrejas'),
      api.get('/escola-sabatina'),
    ]).then(([resDistritos, resIgrejas, resCadastros]) => {
      setDistritos(Array.isArray(resDistritos.data) ? resDistritos.data : []);
      setIgrejas(Array.isArray(resIgrejas.data) ? resIgrejas.data : []);
      setCadastros(Array.isArray(resCadastros.data) ? resCadastros.data : []);
    });
  }, []);

  useEffect(() => {
    if (!form.distritoId) {
      setForm((prev) => ({ ...prev, igrejaId: '' }));
      setDuplas([]);
      setDuplaIds([]);
      return;
    }

    setCarregandoDuplas(true);
    api.get(`/duplas?distritoId=${form.distritoId}`)
      .then((res) => {
        setDuplas(Array.isArray(res.data) ? res.data : []);
      })
      .finally(() => setCarregandoDuplas(false));
  }, [form.distritoId]);

  const igrejasDoDistrito = useMemo(() => (
    igrejas.filter((igreja) => String(igreja.distritoId) === String(form.distritoId))
  ), [form.distritoId, igrejas]);

  const duplasDaIgreja = useMemo(() => (
    duplas.filter((dupla) => String(dupla.igrejaId) === String(form.igrejaId))
  ), [duplas, form.igrejaId]);

  const duplasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return duplasDaIgreja;
    return duplasDaIgreja.filter((dupla) => (
      nomeDupla(dupla).toLowerCase().includes(termo) ||
      (dupla.bairro || '').toLowerCase().includes(termo) ||
      (dupla.tipoProjeto || '').toLowerCase().includes(termo)
    ));
  }, [busca, duplasDaIgreja]);

  const duplasSelecionadas = useMemo(() => (
    duplasDaIgreja.filter((dupla) => duplaIds.includes(dupla.id))
  ), [duplaIds, duplasDaIgreja]);

  const quantidadePequenosGruposCalculada = duplasSelecionadas.filter((dupla) => dupla.tipoProjeto === 'PEQUENOS_GRUPOS').length;
  const podeAlterarCadastro = (cadastro) => ehAdmin(usuario)
    || !cadastro.criadoPorId
    || Number(cadastro.criadoPorId) === Number(usuario?.id);

  useEffect(() => {
    setForm((prev) => {
      if (pequenosGruposEditado) return prev;
      return { ...prev, quantidadePequenosGrupos: String(quantidadePequenosGruposCalculada) };
    });
  }, [pequenosGruposEditado, quantidadePequenosGruposCalculada]);

  const set = (campo, valor) => {
    if (campo === 'distritoId' || campo === 'igrejaId') {
      setPequenosGruposEditado(false);
    }
    if (campo === 'distritoId' || campo === 'igrejaId') setDuplaIds([]);
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
      ...(campo === 'distritoId' || campo === 'igrejaId' ? { quantidadePequenosGrupos: '' } : {}),
      ...(campo === 'distritoId' ? { igrejaId: '' } : {}),
    }));
  };

  const toggleDupla = (id) => {
    setDuplaIds((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const selecionarTodas = () => {
    setDuplaIds(duplasDaIgreja.map((dupla) => dupla.id));
  };

  const limpar = () => {
    setForm(estadoInicial);
    setDuplaIds([]);
    setBusca('');
    setPequenosGruposEditado(false);
    setEditandoId(null);
  };

  const editarCadastro = (cadastro) => {
    setEditandoId(cadastro.id);
    setForm({
      distritoId: String(cadastro.distritoId),
      igrejaId: String(cadastro.igrejaId),
      unidadesAcao: String(cadastro.unidadesAcao ?? ''),
      classeProfessores: String(cadastro.classeProfessores ?? ''),
      classeInteressados: String(cadastro.classeInteressados ?? ''),
      visitasDiretores: String(cadastro.visitasDiretores ?? ''),
      visitasProfessores: String(cadastro.visitasProfessores ?? ''),
      visitasAlunos: String(cadastro.visitasAlunos ?? ''),
      quantidadePequenosGrupos: String(cadastro.quantidadePequenosGrupos ?? ''),
      observacoes: cadastro.observacoes || '',
    });
    setDuplaIds((cadastro.duplas || []).map((item) => item.duplaId || item.dupla?.id).filter(Boolean));
    setPequenosGruposEditado(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const excluirCadastro = async (cadastro) => {
    if (!window.confirm(`Excluir o cadastro da Escola Sabatina de ${cadastro.igreja?.nome || 'esta igreja'}?`)) return;
    setExcluindoId(cadastro.id);
    try {
      await api.delete(`/escola-sabatina/${cadastro.id}`);
      setCadastros((atuais) => atuais.filter((item) => item.id !== cadastro.id));
      if (editandoId === cadastro.id) limpar();
      toast.success('Cadastro da Escola Sabatina excluído.');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao excluir cadastro.');
    } finally {
      setExcluindoId(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (duplaIds.length === 0) {
      toast.error('Selecione ao menos uma dupla da igreja.');
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        ...form,
        duplaIds,
      };
      const { data } = editandoId
        ? await api.put(`/escola-sabatina/${editandoId}`, payload)
        : await api.post('/escola-sabatina', payload);

      setCadastros((atuais) => editandoId
        ? atuais.map((item) => item.id === data.id ? data : item)
        : [data, ...atuais]);
      toast.success(editandoId ? 'Cadastro da Escola Sabatina atualizado.' : `Escola Sabatina cadastrada. ${form.quantidadePequenosGrupos || 0} Pequeno(s) Grupo(s) informado(s).`);
      limpar();
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((e) => e.msg).join(', ') : err.response?.data?.erro || 'Erro ao salvar Escola Sabatina.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in' : 'min-h-screen animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <BackButton fallbackTo={isDireto ? '/direto/relatorios/dashboard-associacao' : '/relatorios/dashboard-associacao'} className="mb-3" />
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Cadastro</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Escola Sabatina
        </h1>
        <p className="text-gray-400 text-sm mt-1">Registre os indicadores por distrito, igreja e duplas selecionadas.</p>
      </div>

      <form onSubmit={handleSubmit} className={isDireto ? 'flex-1 flex flex-col min-h-0' : 'space-y-6'}>
        <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F5F7]' : 'space-y-6'}>
          <div className="max-w-6xl mx-auto space-y-5">
            <Secao numero="1" titulo="Distrito e Igreja">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Distrito" obrigatorio>
                  <select className="input-field" value={form.distritoId} onChange={(e) => set('distritoId', e.target.value)} required>
                    <option value="">Selecione o distrito</option>
                    {distritos.map((distrito) => (
                      <option key={distrito.id} value={distrito.id}>{distrito.nome}</option>
                    ))}
                  </select>
                </Campo>
                <Campo label="Igreja" obrigatorio>
                  <select className="input-field" value={form.igrejaId} onChange={(e) => set('igrejaId', e.target.value)} required disabled={!form.distritoId}>
                    <option value="">Selecione a igreja</option>
                    {igrejasDoDistrito.map((igreja) => (
                      <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>
                    ))}
                  </select>
                </Campo>
              </div>
            </Secao>

            <Secao numero="2" titulo="Indicadores">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                <Campo label="Unidades de acao" obrigatorio>
                  <input type="number" min="0" className="input-field" value={form.unidadesAcao} onChange={(e) => set('unidadesAcao', e.target.value)} required />
                </Campo>
                <Campo label="Classe dos professores" obrigatorio>
                  <input type="number" min="0" className="input-field" value={form.classeProfessores} onChange={(e) => set('classeProfessores', e.target.value)} required />
                </Campo>
                <Campo label="Classe de interessados" obrigatorio>
                  <input type="number" min="0" className="input-field" value={form.classeInteressados} onChange={(e) => set('classeInteressados', e.target.value)} required />
                </Campo>
                <Campo label="Quantidade de Pequenos Grupos">
                  <input
                    type="number"
                    min="0"
                    className="input-field"
                    value={form.quantidadePequenosGrupos}
                    onChange={(e) => {
                      setPequenosGruposEditado(true);
                      set('quantidadePequenosGrupos', e.target.value);
                    }}
                  />
                </Campo>
                <Campo label="Visitas dos diretores" obrigatorio>
                  <input type="number" min="0" className="input-field" value={form.visitasDiretores} onChange={(e) => set('visitasDiretores', e.target.value)} required />
                </Campo>
                <Campo label="Visitas dos professores" obrigatorio>
                  <input type="number" min="0" className="input-field" value={form.visitasProfessores} onChange={(e) => set('visitasProfessores', e.target.value)} required />
                </Campo>
                <Campo label="Visitas dos alunos" obrigatorio>
                  <input type="number" min="0" className="input-field" value={form.visitasAlunos} onChange={(e) => set('visitasAlunos', e.target.value)} required />
                </Campo>
                <Campo label="Observacoes">
                  <input className="input-field" value={form.observacoes} onChange={(e) => set('observacoes', e.target.value)} placeholder="Notas do cadastro" />
                </Campo>
              </div>
            </Secao>

            <Secao numero="3" titulo="Duplas da Igreja">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold text-[#1A3A6B]">
                    {duplaIds.length} dupla(s) selecionada(s)
                  </p>
                  <p className="text-xs text-gray-400">
                    Pequenos Grupos pela selecao: {quantidadePequenosGruposCalculada}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className="btn-outline text-xs px-3 py-2" onClick={selecionarTodas} disabled={!form.igrejaId || duplasDaIgreja.length === 0}>
                    Selecionar todas
                  </button>
                  <button type="button" className="btn-outline text-xs px-3 py-2" onClick={() => setDuplaIds([])} disabled={duplaIds.length === 0}>
                    Limpar
                  </button>
                </div>
              </div>

              <input
                type="text"
                className="input-field mb-4"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar duplas por nome, bairro ou projeto..."
                disabled={!form.igrejaId}
              />

              {!form.igrejaId ? (
                <div className="text-center py-8 text-gray-400">Selecione distrito e igreja para visualizar as duplas.</div>
              ) : carregandoDuplas ? (
                <div className="text-center py-8 text-gray-400">Carregando duplas...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto pr-1">
                  {duplasFiltradas.map((dupla) => {
                    const selecionada = duplaIds.includes(dupla.id);
                    const pequenoGrupo = dupla.tipoProjeto === 'PEQUENOS_GRUPOS';
                    return (
                      <button
                        key={dupla.id}
                        type="button"
                        onClick={() => toggleDupla(dupla.id)}
                        className={`text-left rounded-lg border-2 p-3 transition-all bg-white ${
                          selecionada ? 'border-[#1A3A6B] ring-2 ring-[#1A3A6B]/10' : 'border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            selecionada ? 'bg-[#1A3A6B] border-[#1A3A6B]' : 'border-gray-300'
                          }`}>
                            {selecionada && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm text-[#1A3A6B] truncate">{nomeDupla(dupla)}</p>
                            <p className="text-xs text-gray-400 truncate">{dupla.bairro || 'Sem bairro informado'}</p>
                            <span className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              pequenoGrupo ? 'bg-[#C9963A]/15 text-[#9a6b18]' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {pequenoGrupo ? 'Pequeno Grupo' : dupla.tipoProjeto}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {duplasFiltradas.length === 0 && (
                    <div className="md:col-span-2 text-center py-8 text-gray-400">
                      Nenhuma dupla encontrada para esta igreja.
                    </div>
                  )}
                </div>
              )}
            </Secao>

            <Secao numero="4" titulo="Cadastros realizados">
              <div className="space-y-3">
                {cadastros.map((cadastro) => (
                  <article key={cadastro.id} className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-bold text-[#1A3A6B]">{cadastro.igreja?.nome || 'Igreja'}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {cadastro.distrito?.nome || 'Distrito'} · {(cadastro.duplas || []).length} dupla(s) · {cadastro.quantidadePequenosGrupos || 0} Pequeno(s) Grupo(s)
                      </p>
                    </div>
                    {podeAlterarCadastro(cadastro) && (
                      <div className="flex gap-2">
                        <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => editarCadastro(cadastro)}>Editar</button>
                        <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50" disabled={excluindoId === cadastro.id} onClick={() => excluirCadastro(cadastro)}>
                          {excluindoId === cadastro.id ? 'Excluindo...' : 'Excluir'}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
                {!cadastros.length && <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">Nenhum cadastro realizado neste escopo.</p>}
              </div>
            </Secao>
          </div>
        </div>

        <div className={isDireto ? 'flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3' : 'max-w-6xl mx-auto flex justify-end gap-3 pb-8'}>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Cancelar</button>
          <button type="button" onClick={limpar} className="btn-outline">Limpar</button>
          <button type="submit" disabled={enviando || duplaIds.length === 0} className="btn-primary">
            {enviando ? 'Salvando...' : editandoId ? 'Atualizar Escola Sabatina' : 'Salvar Escola Sabatina'}
          </button>
        </div>
      </form>
    </div>
  );
}
