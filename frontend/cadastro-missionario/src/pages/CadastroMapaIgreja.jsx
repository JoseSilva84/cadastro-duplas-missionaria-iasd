import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';
import BackButton from '../components/BackButton';

const inicial = {
  distritoId: '',
  igrejaId: '',
  pastorNome: '',
  diretorMissionarioNome: '',
  primeiroAnciaoNome: '',
  anoOrganizacao: '',
  membros: 0,
  quantidadePequenosGrupos: '',
  semanaSanta: '',
  classeBiblica: '',
  aventureiros: '',
  quantidadeDuplasMissionarias: 0,
  desbravadores: '',
  dataEvangelismoColheita: '',
  acoesMissionarias: [],
};

const Campo = ({ label, children, obrigatorio, dica }) => (
  <label className="block min-w-0">
    <span className="mb-1.5 block text-sm font-semibold text-slate-600">
      {label} {obrigatorio && <span className="text-red-500">*</span>}
    </span>
    {children}
    {dica && <span className="mt-1 block text-xs text-slate-400">{dica}</span>}
  </label>
);

const Secao = ({ titulo, subtitulo, children }) => (
  <section className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
    <div className="mb-4 border-b border-slate-100 pb-3">
      <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">{titulo}</p>
      {subtitulo && <p className="mt-1 text-sm text-slate-400">{subtitulo}</p>}
    </div>
    {children}
  </section>
);

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

export default function CadastroMapaIgreja() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const [form, setForm] = useState(inicial);
  const [distritos, setDistritos] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const igrejaIdUrl = new URLSearchParams(location.search).get('igrejaId');
    Promise.all([api.get('/distritos'), api.get('/igrejas')]).then(([resDistritos, resIgrejas]) => {
      const listaDistritos = Array.isArray(resDistritos.data) ? resDistritos.data : [];
      const listaIgrejas = Array.isArray(resIgrejas.data) ? resIgrejas.data : [];
      setDistritos(listaDistritos);
      setIgrejas(listaIgrejas);
      const igrejaInicial = igrejaIdUrl
        ? listaIgrejas.find((igreja) => String(igreja.id) === String(igrejaIdUrl))
        : listaIgrejas.length === 1 ? listaIgrejas[0] : null;
      if (igrejaInicial) {
        setForm((prev) => ({
          ...prev,
          distritoId: String(igrejaInicial.distritoId || ''),
          igrejaId: String(igrejaInicial.id),
        }));
      }
    });
  }, [location.search]);

  const igrejasDoDistrito = useMemo(() => (
    igrejas.filter((igreja) => String(igreja.distritoId) === String(form.distritoId))
  ), [form.distritoId, igrejas]);

  useEffect(() => {
    if (!form.igrejaId) return;
    api.get('/mapa-igreja/base', { params: { igrejaId: form.igrejaId } }).then((res) => {
      const mapa = res.data?.mapa || {};
      const auto = res.data?.automatico || {};
      setForm((prev) => ({
        ...prev,
        pastorNome: mapa.pastorNome || auto.pastorNome || '',
        diretorMissionarioNome: mapa.diretorMissionarioNome || auto.diretorMissionarioNome || '',
        primeiroAnciaoNome: mapa.primeiroAnciaoNome || '',
        anoOrganizacao: mapa.anoOrganizacao || '',
        membros: auto.membros || 0,
        quantidadeDuplasMissionarias: auto.quantidadeDuplasMissionarias || 0,
        quantidadePequenosGrupos: mapa.quantidadePequenosGrupos ?? '',
        semanaSanta: mapa.semanaSanta ?? '',
        classeBiblica: mapa.classeBiblica ?? '',
        aventureiros: mapa.aventureiros ?? '',
        desbravadores: mapa.desbravadores ?? '',
        dataEvangelismoColheita: mapa.dataEvangelismoColheita ? mapa.dataEvangelismoColheita.slice(0, 10) : '',
        acoesMissionarias: Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias : [],
      }));
    });
  }, [form.igrejaId]);

  const set = (campo, valor) => {
    setForm((prev) => ({
      ...prev,
      [campo]: valor,
      ...(campo === 'distritoId' ? { igrejaId: '' } : {}),
    }));
  };

  const setAcao = (index, campo, valor) => {
    setForm((prev) => ({
      ...prev,
      acoesMissionarias: prev.acoesMissionarias.map((acao, i) => (
        i === index ? { ...acao, [campo]: valor } : acao
      )),
    }));
  };

  const adicionarAcao = () => {
    setForm((prev) => ({
      ...prev,
      acoesMissionarias: [...prev.acoesMissionarias, { nome: '', responsavel: '', data: '' }],
    }));
  };

  const removerAcao = (index) => {
    setForm((prev) => ({
      ...prev,
      acoesMissionarias: prev.acoesMissionarias.filter((_, i) => i !== index),
    }));
  };

  const salvar = async (event) => {
    event.preventDefault();
    setSalvando(true);
    try {
      await api.post('/mapa-igreja', form);
      toast.success('Mapa da Igreja salvo com sucesso.');
      navigate(isDireto ? '/direto/mapa-igreja' : '/mapa-igreja');
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((erro) => erro.msg).join(', ') : err.response?.data?.erro || 'Erro ao salvar Mapa da Igreja.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="animate-fade-in-up">
      <BackButton fallbackTo={isDireto ? '/direto/mapa-igreja' : '/mapa-igreja'} className="mb-5" />
      <div className="mb-6 rounded-2xl border border-[#1A3A6B]/10 bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Cadastro</p>
        <h1 className="mt-2 text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Mapa da Igreja</h1>
        <p className="mt-1 text-sm text-slate-400">Relatório analítico com liderança, estrutura missionária e ações da igreja.</p>
      </div>

      <form onSubmit={salvar} className="space-y-5">
        <Secao titulo="Igreja e liderança" subtitulo="Pastor e Diretor Missionário são preenchidos automaticamente quando já estiverem cadastrados.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Campo label="Distrito" obrigatorio>
              <select className="input-field" value={form.distritoId} onChange={(e) => set('distritoId', e.target.value)} required>
                <option value="">Selecione o distrito</option>
                {distritos.map((distrito) => <option key={distrito.id} value={distrito.id}>{distrito.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Igreja" obrigatorio>
              <select className="input-field" value={form.igrejaId} onChange={(e) => set('igrejaId', e.target.value)} required disabled={!form.distritoId}>
                <option value="">Selecione a igreja</option>
                {igrejasDoDistrito.map((igreja) => <option key={igreja.id} value={igreja.id}>{igreja.nome}</option>)}
              </select>
            </Campo>
            <Campo label="Quantos membros da igreja">
              <input className="input-field bg-slate-50 font-semibold text-[#1A3A6B]" value={numero(form.membros)} readOnly />
            </Campo>
            <Campo label="Pastor">
              <input className="input-field" value={form.pastorNome} onChange={(e) => set('pastorNome', e.target.value)} placeholder="Nome do pastor" />
            </Campo>
            <Campo label="Diretor Missionário">
              <input className="input-field" value={form.diretorMissionarioNome} onChange={(e) => set('diretorMissionarioNome', e.target.value)} placeholder="Nome do Diretor Missionário" />
            </Campo>
            <Campo label="Primeiro Ancião" obrigatorio>
              <input className="input-field" value={form.primeiroAnciaoNome} onChange={(e) => set('primeiroAnciaoNome', e.target.value)} placeholder="Nome do Primeiro Ancião" required />
            </Campo>
            <Campo label="Ano que se tornou igreja" obrigatorio dica="Use apenas ano, por exemplo: 1998.">
              <input type="number" min="1800" max={new Date().getFullYear() + 1} className="input-field" value={form.anoOrganizacao} onChange={(e) => set('anoOrganizacao', e.target.value)} required />
            </Campo>
            <Campo label="Data do evangelismo de colheita da igreja" obrigatorio>
              <input type="date" className="input-field" value={form.dataEvangelismoColheita} onChange={(e) => set('dataEvangelismoColheita', e.target.value)} required />
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Estrutura missionária">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ['quantidadePequenosGrupos', 'Quantidade de Pequeno Grupo'],
              ['semanaSanta', 'Semana Santa'],
              ['classeBiblica', 'Classe Bíblica'],
              ['aventureiros', 'Aventureiros'],
              ['desbravadores', 'Desbravadores'],
            ].map(([campo, label]) => (
              <Campo key={campo} label={label}>
                <input type="number" min="0" className="input-field" value={form[campo]} onChange={(e) => set(campo, e.target.value)} />
              </Campo>
            ))}
            <Campo label="Quantas duplas missionárias">
              <input className="input-field bg-slate-50 font-semibold text-[#1A3A6B]" value={numero(form.quantidadeDuplasMissionarias)} readOnly />
            </Campo>
          </div>
        </Secao>

        <Secao titulo="Ações missionárias">
          <div className="space-y-3">
            {form.acoesMissionarias.map((acao, index) => (
              <div key={`acao-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_1fr_170px_auto]">
                <input className="input-field bg-white" value={acao.nome || ''} onChange={(e) => setAcao(index, 'nome', e.target.value)} placeholder="Nome da ação" />
                <input className="input-field bg-white" value={acao.responsavel || ''} onChange={(e) => setAcao(index, 'responsavel', e.target.value)} placeholder="Responsável" />
                <input type="date" className="input-field bg-white" value={acao.data || ''} onChange={(e) => setAcao(index, 'data', e.target.value)} />
                <button type="button" className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => removerAcao(index)}>
                  Remover
                </button>
              </div>
            ))}
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={adicionarAcao}>
              + Adicionar mais ações
            </button>
          </div>
        </Secao>

        <div className="flex flex-col gap-2 pb-8 sm:flex-row sm:justify-end">
          <button type="button" className="btn-outline" onClick={() => navigate(-1)}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar Mapa da Igreja'}</button>
        </div>
      </form>
    </div>
  );
}
