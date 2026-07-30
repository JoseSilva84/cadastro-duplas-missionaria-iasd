import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import BackButton from '../components/BackButton';
import LoadingState from '../components/LoadingState';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';

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
                <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(12rem,1.2fr)_9rem_minmax(11rem,1fr)_minmax(12rem,1.1fr)_minmax(12rem,1fr)_8.5rem] lg:items-center">
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
                      onClick={() => navigate(caminhoDetalhes(aluno, '#atualizar-estudo'))}
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

                  <div className="flex flex-col gap-2">
                    <button type="button" className="btn-outline px-3 py-2 text-xs" onClick={() => navigate(caminhoDetalhes(aluno))}>
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
    </div>
  );
}
