import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import api from '../lib/api';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';
import { toast } from '../lib/toast';

const totalLicoes = (serieId) => SERIES_ESTUDO.find((serie) => serie.id === serieId)?.licoes.length || 0;
const progresso = (estudo) => {
  const total = totalLicoes(estudo?.serie);
  if (!total) return 0;
  return Math.min(100, Math.round((Number(estudo?.licaoAtual || 0) / total) * 100));
};

const formatarBooleano = (valor) => {
  if (valor === true) return 'Sim';
  if (valor === false) return 'Não';
  return 'Não informado';
};

const classeInfo = {
  A: { label: 'A - Pronto para o batismo', dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  B: { label: 'B - Quer, mas tem impedimento', dot: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  C: { label: 'C - Nao esta pronto', dot: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const ClassificacaoBadge = ({ classe, motivo }) => {
  const info = classeInfo[classe];
  if (!info) return <span className="text-sm text-gray-400">Sem classificacao</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${info.bg} ${info.text} ${info.border}`} title={motivo || info.label}>
      <span className={`w-2 h-2 rounded-full ${info.dot}`} />
      {info.label}
    </span>
  );
};

const Info = ({ label, valor }) => (
  <div className="rounded-lg bg-[#F4F5F7] px-4 py-3">
    <p className="text-xs text-gray-400">{label}</p>
    <p className="text-sm font-semibold text-[#1A3A6B] break-words">{valor || '—'}</p>
  </div>
);

const KanbanCard = ({ titulo, children }) => (
  <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm min-h-52">
    <h3 className="text-sm font-bold text-[#1A3A6B] mb-3">{titulo}</h3>
    <div className="space-y-3">{children}</div>
  </section>
);

const valorBooleano = (valor) => {
  if (valor === 'true') return true;
  if (valor === 'false') return false;
  return '';
};

const booleanSelectValue = (valor) => {
  if (valor === true) return 'true';
  if (valor === false) return 'false';
  return '';
};

const montarForm = (estudo) => ({
  nomeEstudante: estudo?.nomeEstudante || '',
  whatsapp: estudo?.whatsapp || '',
  endereco: estudo?.endereco || '',
  cidade: estudo?.cidade || '',
  estado: estudo?.estado || '',
  sexo: estudo?.sexo || '',
  diaEstudo: estudo?.diaEstudo || '',
  horarioEstudo: estudo?.horarioEstudo || '',
  classificacaoInteressado: estudo?.classificacaoInteressado || '',
  motivoImpedimento: estudo?.motivoImpedimento || '',
  observacoes: estudo?.observacoes || '',
  vaIgreja: estudo?.vaIgreja ?? '',
  leBiblia: estudo?.leBiblia ?? '',
  estudaLicao: estudo?.estudaLicao ?? '',
  devolveDizimos: estudo?.devolveDizimos ?? '',
  cultoFamiliar: estudo?.cultoFamiliar ?? '',
  participantes: (estudo?.participantes || []).map((participante) => ({
    nome: participante.nome || '',
    whatsapp: participante.whatsapp || '',
    sexo: participante.sexo || '',
    endereco: participante.endereco || '',
    classificacaoInteressado: participante.classificacaoInteressado || '',
    motivoImpedimento: participante.motivoImpedimento || '',
  })),
});

export default function EstudanteDashboard() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const [estudo, setEstudo] = useState(null);
  const [licaoAtual, setLicaoAtual] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(false);
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [form, setForm] = useState(montarForm(null));

  const isPonto = estudo?.tipoEstudo === 'PONTO';
  const isClasse = estudo?.tipoEstudo === 'CLASSE';
  const isGrupo = isPonto || isClasse;
  const licoes = useMemo(() => (
    SERIES_ESTUDO.find((serie) => serie.id === estudo?.serie)?.licoes || []
  ), [estudo?.serie]);

  useEffect(() => {
    setCarregando(true);
    api.get(`/estudos-biblicos/${id}`)
      .then((res) => {
        setEstudo(res.data);
        setLicaoAtual(String(res.data.licaoAtual || ''));
        setForm(montarForm(res.data));
      })
      .catch(() => toast.error('Erro ao carregar detalhes do estudo.'))
      .finally(() => setCarregando(false));
  }, [id]);

  const salvarLicao = async () => {
    if (!estudo || !licaoAtual) return;
    setSalvando(true);
    try {
      const payload = {
        nomeEstudante: estudo.nomeEstudante,
        endereco: estudo.endereco,
        cidade: estudo.cidade,
        estado: estudo.estado,
        whatsapp: estudo.whatsapp,
        diaEstudo: estudo.diaEstudo,
        horarioEstudo: estudo.horarioEstudo || '',
        duplaId: estudo.duplaId,
        serie: estudo.serie,
        licaoAtual,
        tipoEstudo: estudo.tipoEstudo,
        sexo: estudo.sexo || '',
        classificacaoInteressado: estudo.classificacaoInteressado || '',
        observacoes: estudo.observacoes || '',
        motivoImpedimento: estudo.motivoImpedimento || '',
        participantes: estudo.participantes || undefined,
      };
      const { data } = await api.put(`/estudos-biblicos/${estudo.id}`, payload);
      setEstudo(data);
      setLicaoAtual(String(data.licaoAtual || ''));
      toast.success('Lição atualizada.');
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((e) => e.msg).join(', ') : 'Erro ao atualizar lição.');
    } finally {
      setSalvando(false);
    }
  };

  const alterarCampo = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const alterarParticipante = (index, campo, valor) => {
    setForm((atual) => ({
      ...atual,
      participantes: atual.participantes.map((participante, participanteIndex) => (
        participanteIndex === index ? { ...participante, [campo]: valor } : participante
      )),
    }));
  };

  const montarPayload = (dadosForm = form, licao = licaoAtual) => ({
    nomeEstudante: dadosForm.nomeEstudante,
    endereco: dadosForm.endereco,
    cidade: dadosForm.cidade,
    estado: dadosForm.estado,
    whatsapp: dadosForm.whatsapp || dadosForm.participantes?.[0]?.whatsapp || estudo.whatsapp,
    diaEstudo: dadosForm.diaEstudo,
    horarioEstudo: dadosForm.horarioEstudo || '',
    duplaId: estudo.duplaId,
    serie: estudo.serie,
    licaoAtual: licao,
    tipoEstudo: estudo.tipoEstudo,
    sexo: dadosForm.sexo || '',
    classificacaoInteressado: dadosForm.classificacaoInteressado || '',
    motivoImpedimento: dadosForm.classificacaoInteressado === 'B' ? dadosForm.motivoImpedimento : '',
    vaIgreja: dadosForm.vaIgreja === '' ? undefined : dadosForm.vaIgreja,
    leBiblia: dadosForm.leBiblia === '' ? undefined : dadosForm.leBiblia,
    estudaLicao: dadosForm.estudaLicao === '' ? undefined : dadosForm.estudaLicao,
    devolveDizimos: dadosForm.devolveDizimos === '' ? undefined : dadosForm.devolveDizimos,
    cultoFamiliar: dadosForm.cultoFamiliar === '' ? undefined : dadosForm.cultoFamiliar,
    observacoes: dadosForm.observacoes || '',
    participantes: ['PONTO', 'CLASSE'].includes(estudo.tipoEstudo) ? dadosForm.participantes.map((participante) => ({
      ...participante,
      motivoImpedimento: participante.classificacaoInteressado === 'B' ? participante.motivoImpedimento : '',
    })) : undefined,
  });

  const salvarDados = async () => {
    if (!estudo) return;
    if (form.classificacaoInteressado === 'B' && !form.motivoImpedimento.trim()) {
      toast.error('Informe o motivo do impedimento para estudante classe B.');
      return;
    }

    const participanteSemMotivo = form.participantes.findIndex((participante) => (
      participante.classificacaoInteressado === 'B' && !participante.motivoImpedimento.trim()
    ));
    if (participanteSemMotivo >= 0) {
      toast.error(`Informe o motivo do impedimento do estudante ${participanteSemMotivo + 1}.`);
      return;
    }

    setSalvandoDados(true);
    try {
      const { data } = await api.put(`/estudos-biblicos/${estudo.id}`, montarPayload());
      setEstudo(data);
      setForm(montarForm(data));
      setLicaoAtual(String(data.licaoAtual || ''));
      setEditando(false);
      toast.success('Dados do estudante atualizados.');
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((e) => e.msg).join(', ') : 'Erro ao atualizar dados do estudante.');
    } finally {
      setSalvandoDados(false);
    }
  };

  if (carregando) {
    return <div className="p-8 text-gray-400">Carregando detalhes...</div>;
  }

  if (!estudo) {
    return <div className="p-8 text-gray-400">Registro não encontrado.</div>;
  }

  const percentual = progresso(estudo);
  const titulo = isPonto ? estudo.nomeEstudante : estudo.nomeEstudante;
  const baseRelatorio = `${isDireto ? '/direto' : ''}/relatorios/${isPonto ? 'pontos-estudo' : isClasse ? 'classes-biblicas/registros' : 'estudos-biblicos'}`;

  return (
    <div className={isDireto ? 'flex flex-col h-full bg-[#F4F5F7] animate-fade-in' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-6'}>
        <button type="button" className="text-sm font-semibold text-[#1A3A6B] mb-3" onClick={() => navigate(baseRelatorio)}>
          Voltar ao relatório
        </button>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">{isPonto ? 'Ponto de Estudo' : isClasse ? 'Classe Bíblica' : 'Dashboard do Estudante'}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h1>
            <p className="text-gray-400 text-sm mt-1">{getSerieNome(estudo.serie)} · {getLicaoLabel(estudo.serie, estudo.licaoAtual)}</p>
          </div>
          <div className="w-full lg:w-72 space-y-3">
            <div className="flex items-center justify-between text-sm mb-1"><span>Progresso geral</span><strong>{percentual}%</strong></div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-[#C9963A]" style={{ width: `${percentual}%` }} /></div>
            <button
              type="button"
              className="w-full rounded-lg border border-[#1A3A6B] px-4 py-2 text-sm font-semibold text-[#1A3A6B] hover:bg-[#1A3A6B] hover:text-white transition-colors"
              onClick={() => {
                setForm(montarForm(estudo));
                setEditando((valor) => !valor);
              }}
            >
              {editando ? 'Fechar edicao' : 'Editar dados'}
            </button>
          </div>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-xs text-gray-400">Lição atual</p><p className="text-2xl font-bold text-[#1A3A6B]">{estudo.licaoAtual}</p></div>
          <div className="card"><p className="text-xs text-gray-400">Total da série</p><p className="text-2xl font-bold text-[#1A3A6B]">{totalLicoes(estudo.serie)}</p></div>
          <div className="card"><p className="text-xs text-gray-400">Progresso</p><p className="text-2xl font-bold text-[#C9963A]">{percentual}%</p></div>
          <div className="card">
            <p className="text-xs text-gray-400">{isGrupo ? 'Estudantes' : 'Classificacao'}</p>
            {isGrupo ? (
              <p className="text-2xl font-bold text-emerald-600">{estudo.participantes?.length || 0}</p>
            ) : (
              <div className="mt-2"><ClassificacaoBadge classe={estudo.classificacaoInteressado} motivo={estudo.motivoImpedimento} /></div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
            <label>
              <span className="block text-sm font-medium text-gray-600 mb-1.5">Adicionar / atualizar lição semanal</span>
              <select className="input-field" value={licaoAtual} onChange={(e) => setLicaoAtual(e.target.value)}>
                {licoes.map((licao) => <option key={licao.numero} value={licao.numero}>{licao.numero} - {licao.titulo}</option>)}
              </select>
            </label>
            <button type="button" className="btn-primary h-12 px-6" onClick={salvarLicao} disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar lição'}
            </button>
          </div>
        </div>

        {editando && (
          <div className="card">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-[#1A3A6B]">Editar dados {isPonto ? 'do ponto de estudo' : isClasse ? 'da classe bíblica' : 'do estudante'}</h2>
                <p className="text-sm text-gray-400">Atualize cadastro, acompanhamento e decisao em um so lugar.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-[#1A3A6B] px-4 py-2 text-sm font-semibold text-[#1A3A6B]"
                  onClick={() => {
                    setForm(montarForm(estudo));
                    setEditando(false);
                  }}
                >
                  Cancelar
                </button>
                <button type="button" className="btn-primary px-5 py-2" onClick={salvarDados} disabled={salvandoDados}>
                  {salvandoDados ? 'Salvando...' : 'Salvar dados'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <label>
                <span className="block text-sm font-medium text-gray-600 mb-1.5">{isPonto ? 'Nome do ponto' : isClasse ? 'Nome da classe' : 'Nome do estudante'}</span>
                <input className="input-field" value={form.nomeEstudante} onChange={(e) => alterarCampo('nomeEstudante', e.target.value)} />
              </label>
              <label>
                <span className="block text-sm font-medium text-gray-600 mb-1.5">WhatsApp</span>
                <input className="input-field" value={form.whatsapp} onChange={(e) => alterarCampo('whatsapp', e.target.value)} />
              </label>
              <label>
                <span className="block text-sm font-medium text-gray-600 mb-1.5">Cidade</span>
                <input className="input-field" value={form.cidade} onChange={(e) => alterarCampo('cidade', e.target.value)} />
              </label>
              <label>
                <span className="block text-sm font-medium text-gray-600 mb-1.5">Estado</span>
                <input className="input-field uppercase" maxLength={2} value={form.estado} onChange={(e) => alterarCampo('estado', e.target.value.toUpperCase())} />
              </label>
              <label className="md:col-span-2">
                <span className="block text-sm font-medium text-gray-600 mb-1.5">Endereco</span>
                <input className="input-field" value={form.endereco} onChange={(e) => alterarCampo('endereco', e.target.value)} />
              </label>
              <label>
                <span className="block text-sm font-medium text-gray-600 mb-1.5">Dia do estudo</span>
                <input className="input-field" value={form.diaEstudo} onChange={(e) => alterarCampo('diaEstudo', e.target.value)} />
              </label>
              <label>
                <span className="block text-sm font-medium text-gray-600 mb-1.5">Horario</span>
                <input className="input-field" value={form.horarioEstudo} onChange={(e) => alterarCampo('horarioEstudo', e.target.value)} />
              </label>

              {!isGrupo && (
                <>
                  <label>
                    <span className="block text-sm font-medium text-gray-600 mb-1.5">Sexo</span>
                    <select className="input-field" value={form.sexo} onChange={(e) => alterarCampo('sexo', e.target.value)}>
                      <option value="">Selecione</option>
                      <option value="Feminino">Feminino</option>
                      <option value="Masculino">Masculino</option>
                    </select>
                  </label>
                  <label>
                    <span className="block text-sm font-medium text-gray-600 mb-1.5">Classificacao</span>
                    <select className="input-field" value={form.classificacaoInteressado} onChange={(e) => alterarCampo('classificacaoInteressado', e.target.value)}>
                      <option value="">Sem classificacao</option>
                      <option value="A">A - Pronto para o batismo</option>
                      <option value="B">B - Quer, mas tem impedimento</option>
                      <option value="C">C - Nao esta pronto</option>
                    </select>
                  </label>
                  {form.classificacaoInteressado === 'B' && (
                    <label className="md:col-span-2">
                      <span className="block text-sm font-medium text-gray-600 mb-1.5">Motivo do impedimento</span>
                      <textarea className="input-field min-h-24" value={form.motivoImpedimento} onChange={(e) => alterarCampo('motivoImpedimento', e.target.value)} />
                    </label>
                  )}
                </>
              )}
            </div>

            {!isGrupo && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-5">
                {[
                  ['vaIgreja', 'Vai a igreja?'],
                  ['leBiblia', 'Le a Biblia?'],
                  ['estudaLicao', 'Estuda a licao?'],
                  ['devolveDizimos', 'Devolve dizimos?'],
                  ['cultoFamiliar', 'Culto familiar?'],
                ].map(([campo, label]) => (
                  <label key={campo}>
                    <span className="block text-sm font-medium text-gray-600 mb-1.5">{label}</span>
                    <select className="input-field" value={booleanSelectValue(form[campo])} onChange={(e) => alterarCampo(campo, valorBooleano(e.target.value))}>
                      <option value="">Nao informado</option>
                      <option value="true">Sim</option>
                      <option value="false">Nao</option>
                    </select>
                  </label>
                ))}
              </div>
            )}

            {isGrupo && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-[#1A3A6B] mb-3">{isPonto ? 'Estudantes do ponto' : 'Estudantes da classe'}</h3>
                <div className="space-y-4">
                  {form.participantes.map((participante, index) => (
                    <div key={`${participante.nome}-${index}`} className="rounded-xl bg-[#F4F5F7] p-4">
                      <p className="font-bold text-[#1A3A6B] mb-3">Estudante {index + 1}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <label>
                          <span className="block text-sm font-medium text-gray-600 mb-1.5">Nome</span>
                          <input className="input-field" value={participante.nome} onChange={(e) => alterarParticipante(index, 'nome', e.target.value)} />
                        </label>
                        <label>
                          <span className="block text-sm font-medium text-gray-600 mb-1.5">WhatsApp</span>
                          <input className="input-field" value={participante.whatsapp} onChange={(e) => alterarParticipante(index, 'whatsapp', e.target.value)} />
                        </label>
                        <label>
                          <span className="block text-sm font-medium text-gray-600 mb-1.5">Sexo</span>
                          <select className="input-field" value={participante.sexo} onChange={(e) => alterarParticipante(index, 'sexo', e.target.value)}>
                            <option value="">Selecione</option>
                            <option value="Feminino">Feminino</option>
                            <option value="Masculino">Masculino</option>
                          </select>
                        </label>
                        <label>
                          <span className="block text-sm font-medium text-gray-600 mb-1.5">Classificacao</span>
                          <select className="input-field" value={participante.classificacaoInteressado} onChange={(e) => alterarParticipante(index, 'classificacaoInteressado', e.target.value)}>
                            <option value="">Sem classificacao</option>
                            <option value="A">A - Pronto para o batismo</option>
                            <option value="B">B - Quer, mas tem impedimento</option>
                            <option value="C">C - Nao esta pronto</option>
                          </select>
                        </label>
                        <label className="md:col-span-2">
                          <span className="block text-sm font-medium text-gray-600 mb-1.5">Endereco</span>
                          <input className="input-field" value={participante.endereco} onChange={(e) => alterarParticipante(index, 'endereco', e.target.value)} />
                        </label>
                        {participante.classificacaoInteressado === 'B' && (
                          <label className="md:col-span-2">
                            <span className="block text-sm font-medium text-gray-600 mb-1.5">Motivo do impedimento</span>
                            <textarea className="input-field min-h-24" value={participante.motivoImpedimento} onChange={(e) => alterarParticipante(index, 'motivoImpedimento', e.target.value)} />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <label className="block mt-5">
              <span className="block text-sm font-medium text-gray-600 mb-1.5">Observacoes</span>
              <textarea className="input-field min-h-24" value={form.observacoes} onChange={(e) => alterarCampo('observacoes', e.target.value)} />
            </label>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <KanbanCard titulo="Cadastro">
            <Info label="WhatsApp" valor={estudo.whatsapp} />
            <Info label="Endereço" valor={estudo.endereco} />
            <Info label="Cidade/Estado" valor={`${estudo.cidade}/${estudo.estado}`} />
            {!isGrupo && <Info label="Sexo" valor={estudo.sexo} />}
          </KanbanCard>

          <KanbanCard titulo="Jornada do Estudo">
            <Info label="Série" valor={getSerieNome(estudo.serie)} />
            <Info label="Lição atual" valor={getLicaoLabel(estudo.serie, estudo.licaoAtual)} />
            <Info label="Dia / Horário" valor={`${estudo.diaEstudo || '—'} · ${estudo.horarioEstudo || '—'}`} />
          </KanbanCard>

          <KanbanCard titulo="Acompanhamento Espiritual">
            <Info label="Vai à igreja?" valor={formatarBooleano(estudo.vaIgreja)} />
            <Info label="Lê a Bíblia?" valor={formatarBooleano(estudo.leBiblia)} />
            <Info label="Estuda a lição?" valor={formatarBooleano(estudo.estudaLicao)} />
            <Info label="Devolve dízimos?" valor={formatarBooleano(estudo.devolveDizimos)} />
            <Info label="Culto familiar?" valor={formatarBooleano(estudo.cultoFamiliar)} />
          </KanbanCard>

          <KanbanCard titulo={isPonto ? 'Estudantes do Ponto' : isClasse ? 'Estudantes da Classe' : 'Decisão'}>
            {isGrupo ? (
              estudo.participantes?.map((participante) => (
                <div key={participante.id} className="rounded-lg bg-[#F4F5F7] px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">{participante.nome}</p>
                  <ClassificacaoBadge classe={participante.classificacaoInteressado} motivo={participante.motivoImpedimento} />
                  {participante.classificacaoInteressado === 'B' && participante.motivoImpedimento && (
                    <p className="text-xs text-amber-700 mt-2">Motivo: {participante.motivoImpedimento}</p>
                  )}
                </div>
              ))
            ) : (
              <>
                <div className="rounded-lg bg-[#F4F5F7] px-4 py-3">
                  <p className="text-xs text-gray-400 mb-1">Classificacao</p>
                  <ClassificacaoBadge classe={estudo.classificacaoInteressado} motivo={estudo.motivoImpedimento} />
                </div>
                {estudo.classificacaoInteressado === 'B' && (
                  <Info label="Motivo do impedimento" valor={estudo.motivoImpedimento} />
                )}
                <Info label="Observacao" valor={estudo.observacoes} />
              </>
            )}
          </KanbanCard>
        </div>

        <div className="card">
          <h2 className="font-bold text-[#1A3A6B] mb-3">Dupla responsável</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Info label="Dupla" valor={`${estudo.dupla?.liderNome || ''} + ${estudo.dupla?.membro2Nome || ''}`} />
            <Info label="Bairro" valor={estudo.dupla?.bairro} />
            <Info label="Distrito" valor={estudo.dupla?.distrito?.nome} />
          </div>
        </div>
      </div>
    </div>
  );
}
