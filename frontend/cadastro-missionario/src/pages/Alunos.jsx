import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import BackButton from '../components/BackButton';
import LoadingState from '../components/LoadingState';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';
import { toast } from '../lib/toast';

const tipoLabel = {
  UNICO: 'Estudo individual',
  PONTO: 'Ponto de Estudo',
  CLASSE: 'Classe Biblica',
};

const classeConfig = {
  A: { label: 'Classe A', cor: '#047857', bg: '#ecfdf5' },
  B: { label: 'Classe B', cor: '#C9963A', bg: '#fffbeb' },
  C: { label: 'Classe C', cor: '#b91c1c', bg: '#fef2f2' },
  SEM: { label: 'Sem classificacao', cor: '#64748b', bg: '#f8fafc' },
};

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const totalLicoes = (serieId) => SERIES_ESTUDO.find((serie) => serie.id === serieId)?.licoes.length || 0;

const progresso = (serie, licaoAtual) => {
  const total = totalLicoes(serie);
  if (!total) return 0;
  return Math.min(100, Math.round((Number(licaoAtual || 0) / total) * 100));
};

const nomeDupla = (dupla) => {
  if (!dupla) return 'Sem dupla';
  return `${dupla.liderNome || 'Lider'} + ${dupla.membro2Nome || 'Membro'}`;
};

const BadgeClasse = ({ classe }) => {
  const cfg = classeConfig[classe || 'SEM'] || classeConfig.SEM;
  return (
    <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: cfg.cor, backgroundColor: cfg.bg }}>
      {cfg.label}
    </span>
  );
};

const MetricCard = ({ label, valor, detalhe, cor, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group card relative overflow-hidden text-left transition-all duration-200 hover:-translate-y-1 hover:ring-1 hover:ring-[#C9963A]/35 focus:outline-none focus:ring-2 focus:ring-[#C9963A]/45"
  >
    <span className="absolute inset-x-0 top-0 h-1 opacity-80 transition-all duration-200 group-hover:h-1.5" style={{ backgroundColor: cor }} />
    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
    <p className="mt-2 text-3xl font-bold leading-none" style={{ color: cor }}>{numero(valor)}</p>
    {detalhe && <p className="mt-3 text-sm font-medium text-gray-500">{detalhe}</p>}
  </button>
);

const alunoDoEstudo = (estudo) => ({
  id: String(estudo.id),
  estudoId: estudo.id,
  participanteId: null,
  nome: estudo.nomeEstudante || 'Sem nome',
  whatsapp: estudo.whatsapp || '',
  endereco: estudo.endereco || '',
  tipoEstudo: estudo.tipoEstudo || 'UNICO',
  classificacao: estudo.classificacaoInteressado || 'SEM',
  motivoImpedimento: estudo.motivoImpedimento || '',
  serie: estudo.serie,
  licaoAtual: estudo.licaoAtual,
  progresso: progresso(estudo.serie, estudo.licaoAtual),
  origem: tipoLabel[estudo.tipoEstudo || 'UNICO'] || estudo.tipoEstudo,
  duplaId: estudo.dupla?.id,
  dupla: nomeDupla(estudo.dupla),
  igreja: estudo.dupla?.igreja?.nome || 'Sem igreja',
  distrito: estudo.dupla?.distrito?.nome || 'Sem distrito',
  regiao: estudo.dupla?.distrito?.regiao?.nome || 'Sem regiao',
});

const alunoDoParticipante = (estudo, participante) => ({
  ...alunoDoEstudo(estudo),
  id: `${estudo.id}-${participante.id}`,
  participanteId: participante.id,
  nome: participante.nome || 'Sem nome',
  whatsapp: participante.whatsapp || '',
  endereco: participante.endereco || estudo.endereco || '',
  classificacao: participante.classificacaoInteressado || 'SEM',
  motivoImpedimento: participante.motivoImpedimento || '',
});

export default function Alunos() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const prefix = isDireto ? '/direto' : '';
  const [dados, setDados] = useState({ estudos: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('');
  const [classe, setClasse] = useState('');
  const [modalAtualizacao, setModalAtualizacao] = useState(null);
  const [estudoSelecionadoId, setEstudoSelecionadoId] = useState('');
  const [licaoSelecionada, setLicaoSelecionada] = useState('');
  const [salvandoLicao, setSalvandoLicao] = useState(false);

  useEffect(() => {
    setCarregando(true);
    api.get('/relatorios/estudos-biblicos')
      .then((res) => setDados(res.data || { estudos: [] }))
      .catch((err) => setErro(err.response?.data?.erro || 'Erro ao carregar alunos.'))
      .finally(() => setCarregando(false));
  }, []);

  const alunos = useMemo(() => (
    (dados.estudos || []).flatMap((estudo) => {
      if (['PONTO', 'CLASSE'].includes(estudo.tipoEstudo)) {
        return (estudo.participantes || []).map((participante) => alunoDoParticipante(estudo, participante));
      }
      return [alunoDoEstudo(estudo)];
    })
  ), [dados]);

  const alunosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return alunos.filter((aluno) => {
      const texto = [
        aluno.nome,
        aluno.dupla,
        aluno.igreja,
        aluno.distrito,
        aluno.regiao,
        aluno.whatsapp,
      ].join(' ').toLowerCase();
      const matchBusca = !termo || texto.includes(termo);
      const matchTipo = !tipo || aluno.tipoEstudo === tipo;
      const matchClasse = !classe || aluno.classificacao === classe;
      return matchBusca && matchTipo && matchClasse;
    });
  }, [alunos, busca, tipo, classe]);

  const resumo = useMemo(() => ({
    total: alunos.length,
    individuais: alunos.filter((aluno) => aluno.tipoEstudo === 'UNICO').length,
    pontos: alunos.filter((aluno) => aluno.tipoEstudo === 'PONTO').length,
    classes: alunos.filter((aluno) => aluno.tipoEstudo === 'CLASSE').length,
    classeA: alunos.filter((aluno) => aluno.classificacao === 'A').length,
  }), [alunos]);

  const caminhoRelatorio = (tipoEstudo) => (
    `${prefix}/relatorios/${tipoEstudo === 'PONTO' ? 'pontos-estudo' : tipoEstudo === 'CLASSE' ? 'classes-biblicas/registros' : 'estudos-biblicos'}`
  );

  const caminhoDetalhes = (aluno, hash = '') => {
    const params = aluno.participanteId ? `?participante=${aluno.participanteId}` : '';
    return `${caminhoRelatorio(aluno.tipoEstudo)}/${aluno.estudoId}${params}${hash}`;
  };

  const estudos = dados.estudos || [];
  const estudoSelecionado = estudos.find((estudo) => String(estudo.id) === String(estudoSelecionadoId));
  const licoesModal = SERIES_ESTUDO.find((serie) => serie.id === estudoSelecionado?.serie)?.licoes || [];

  const abrirAtualizacao = (aluno) => {
    setModalAtualizacao(aluno);
    setEstudoSelecionadoId(String(aluno.estudoId));
    setLicaoSelecionada(String(aluno.licaoAtual || ''));
  };

  const mudarEstudoSelecionado = (id) => {
    const proximoEstudo = estudos.find((estudo) => String(estudo.id) === String(id));
    setEstudoSelecionadoId(id);
    setLicaoSelecionada(String(proximoEstudo?.licaoAtual || ''));
  };

  const salvarLicao = async () => {
    if (!estudoSelecionado || !licaoSelecionada) return;
    setSalvandoLicao(true);
    try {
      const payload = {
        nomeEstudante: estudoSelecionado.nomeEstudante,
        endereco: estudoSelecionado.endereco,
        cidade: estudoSelecionado.cidade,
        estado: estudoSelecionado.estado,
        whatsapp: estudoSelecionado.whatsapp,
        diaEstudo: estudoSelecionado.diaEstudo,
        horarioEstudo: estudoSelecionado.horarioEstudo || '',
        duplaId: estudoSelecionado.duplaId,
        serie: estudoSelecionado.serie,
        licaoAtual: licaoSelecionada,
        tipoEstudo: estudoSelecionado.tipoEstudo,
        sexo: estudoSelecionado.sexo || '',
        classificacaoInteressado: estudoSelecionado.classificacaoInteressado || '',
        observacoes: estudoSelecionado.observacoes || '',
        motivoImpedimento: estudoSelecionado.motivoImpedimento || '',
        participantes: estudoSelecionado.participantes || undefined,
      };
      const { data } = await api.put(`/estudos-biblicos/${estudoSelecionado.id}`, payload);
      setDados((atual) => ({
        ...atual,
        estudos: (atual.estudos || []).map((estudo) => (String(estudo.id) === String(data.id) ? data : estudo)),
      }));
      setModalAtualizacao(null);
      toast.success('Licao atualizada.');
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((e) => e.msg).join(', ') : 'Erro ao atualizar licao.');
    } finally {
      setSalvandoLicao(false);
    }
  };

  if (carregando) return <LoadingState mensagem="Carregando alunos..." />;

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <BackButton fallbackTo={isDireto ? '/direto/duplas' : '/duplas'} className="mb-3" />
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
              <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Alunos</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Todos os Alunos
            </h1>
            <p className="text-gray-400 text-sm mt-1">Alunos de estudos individuais, pontos de estudo e classes biblicas dentro do seu escopo de acesso.</p>
          </div>
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/cadastro/estudos-biblicos`)}>
            Novo aluno
          </button>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        {erro && <div className="card border border-red-100 text-sm text-red-600">{erro}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total de alunos" valor={resumo.total} detalhe="Todos os formatos" cor="#1A3A6B" onClick={() => navigate(`${prefix}/relatorios/estudos-cadastrados`)} />
          <MetricCard label="Individuais" valor={resumo.individuais} detalhe="Estudos individuais" cor="#0284c7" onClick={() => navigate(caminhoRelatorio('UNICO'))} />
          <MetricCard label="Pontos" valor={resumo.pontos} detalhe="Alunos em pontos" cor="#0d9488" onClick={() => navigate(caminhoRelatorio('PONTO'))} />
          <MetricCard label="Classes" valor={resumo.classes} detalhe="Alunos em classes" cor="#7B2D8B" onClick={() => navigate(caminhoRelatorio('CLASSE'))} />
          <MetricCard label="Classe A" valor={resumo.classeA} detalhe="Prontos para batismo" cor="#047857" onClick={() => { setClasse('A'); setTipo(''); setBusca(''); }} />
        </div>

        <section className="card">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_220px_220px_auto] lg:items-end">
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Buscar</span>
              <input className="input-field" value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Nome, dupla, igreja, distrito..." />
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Tipo</span>
              <select className="input-field" value={tipo} onChange={(event) => setTipo(event.target.value)}>
                <option value="">Todos</option>
                <option value="UNICO">Estudo individual</option>
                <option value="PONTO">Ponto de Estudo</option>
                <option value="CLASSE">Classe Biblica</option>
              </select>
            </label>
            <label>
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-400">Classe</span>
              <select className="input-field" value={classe} onChange={(event) => setClasse(event.target.value)}>
                <option value="">Todas</option>
                <option value="A">Classe A</option>
                <option value="B">Classe B</option>
                <option value="C">Classe C</option>
                <option value="SEM">Sem classificacao</option>
              </select>
            </label>
            <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => { setBusca(''); setTipo(''); setClasse(''); }}>
              Limpar
            </button>
          </div>
        </section>

        <section className="card">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1A3A6B]">Lista de alunos</h2>
              <p className="text-sm text-gray-400">Resultado conforme seu nivel de acesso.</p>
            </div>
            <span className="rounded-lg bg-[#1A3A6B]/10 px-3 py-2 text-sm font-bold text-[#1A3A6B]">{numero(alunosFiltrados.length)} aluno(s)</span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {alunosFiltrados.map((aluno) => (
              <article key={aluno.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C9963A]/50 hover:shadow-md">
                <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_9rem] xl:items-center">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[minmax(10rem,1fr)_8.5rem_minmax(9rem,0.9fr)_minmax(11rem,1fr)_minmax(11rem,1fr)] xl:items-center">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Aluno</p>
                      <p className="break-words text-base font-bold text-[#1A3A6B]">{aluno.nome}</p>
                      {aluno.whatsapp && <p className="mt-1 text-xs text-gray-400">{aluno.whatsapp}</p>}
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-gray-400">Classe</p>
                      <BadgeClasse classe={aluno.classificacao} />
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Origem</p>
                      <p className="text-sm font-semibold text-gray-700">{aluno.origem}</p>
                      <p className="text-xs text-gray-400">{getSerieNome(aluno.serie)}</p>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Progresso</p>
                        <span className="text-xs font-bold text-gray-600">{aluno.progresso}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-[#C9963A]" style={{ width: `${aluno.progresso}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-gray-400">{getLicaoLabel(aluno.serie, aluno.licaoAtual)}</p>
                      <button
                        type="button"
                        className="mt-2 text-xs font-bold text-[#1A3A6B] underline-offset-4 hover:text-[#C9963A] hover:underline"
                        onClick={() => abrirAtualizacao(aluno)}
                      >
                        Atualizar estudo
                      </button>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Local / dupla</p>
                      <p className="break-words text-sm font-semibold text-gray-700">{aluno.igreja}</p>
                      <p className="text-xs text-gray-400">{aluno.distrito} - {aluno.regiao}</p>
                      <p className="mt-1 break-words text-xs text-gray-500">{aluno.dupla}</p>
                    </div>
                  </div>

                  <div className="flex xl:justify-end">
                    <button type="button" className="btn-outline w-full px-3 py-2 text-xs xl:w-32" onClick={() => navigate(caminhoDetalhes(aluno))}>
                      Detalhes
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {alunosFiltrados.length === 0 && (
              <div className="rounded-xl bg-[#F4F5F7] px-4 py-10 text-center text-sm text-gray-400">
                Nenhum aluno encontrado para os filtros selecionados.
              </div>
            )}
          </div>
        </section>
      </div>

      {modalAtualizacao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f2347]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Atualizar estudo</p>
                  <h2 className="mt-1 text-xl font-bold text-[#1A3A6B]">Selecionar nova licao</h2>
                  <p className="mt-1 text-sm text-gray-400">{modalAtualizacao.nome}</p>
                </div>
                <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-100" onClick={() => setModalAtualizacao(null)}>
                  Fechar
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
              <label>
                <span className="mb-1.5 block text-sm font-semibold text-gray-600">Estudo</span>
                <select className="input-field" value={estudoSelecionadoId} onChange={(event) => mudarEstudoSelecionado(event.target.value)}>
                  {estudos.map((estudo) => (
                    <option key={estudo.id} value={estudo.id}>
                      {tipoLabel[estudo.tipoEstudo || 'UNICO'] || estudo.tipoEstudo} - {estudo.nomeEstudante || 'Sem nome'} - {getSerieNome(estudo.serie)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-5">
                <p className="mb-3 text-sm font-semibold text-gray-600">Licao</p>
                {licoesModal.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {licoesModal.map((licao) => {
                      const selecionada = String(licao.numero) === String(licaoSelecionada);
                      return (
                        <button
                          key={licao.numero}
                          type="button"
                          className={`min-h-24 rounded-xl border p-3 text-left transition-all ${selecionada ? 'border-[#1A3A6B] bg-[#1A3A6B] text-white shadow-md' : 'border-gray-100 bg-[#F4F5F7] text-[#1A3A6B] hover:border-[#C9963A]/50 hover:bg-white'}`}
                          onClick={() => setLicaoSelecionada(String(licao.numero))}
                        >
                          <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${selecionada ? 'bg-white/15 text-white' : 'bg-white text-[#C9963A]'}`}>{licao.numero}</span>
                          <span className="mt-3 block text-sm font-semibold leading-snug">{licao.titulo}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-xl bg-[#F4F5F7] px-4 py-8 text-center text-sm text-gray-400">
                    Nenhuma licao disponivel para a serie deste estudo.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end">
              <button type="button" className="btn-outline px-5 py-2 text-sm" onClick={() => setModalAtualizacao(null)}>
                Cancelar
              </button>
              <button type="button" className="btn-primary px-6 py-2 text-sm" onClick={salvarLicao} disabled={salvandoLicao || !licaoSelecionada || !estudoSelecionado}>
                {salvandoLicao ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
