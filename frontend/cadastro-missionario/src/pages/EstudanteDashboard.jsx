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

export default function EstudanteDashboard() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isDireto = location.pathname.startsWith('/direto');
  const [estudo, setEstudo] = useState(null);
  const [licaoAtual, setLicaoAtual] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const isPonto = estudo?.tipoEstudo === 'PONTO';
  const licoes = useMemo(() => (
    SERIES_ESTUDO.find((serie) => serie.id === estudo?.serie)?.licoes || []
  ), [estudo?.serie]);

  useEffect(() => {
    setCarregando(true);
    api.get(`/estudos-biblicos/${id}`)
      .then((res) => {
        setEstudo(res.data);
        setLicaoAtual(String(res.data.licaoAtual || ''));
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

  if (carregando) {
    return <div className="p-8 text-gray-400">Carregando detalhes...</div>;
  }

  if (!estudo) {
    return <div className="p-8 text-gray-400">Registro não encontrado.</div>;
  }

  const percentual = progresso(estudo);
  const titulo = isPonto ? estudo.nomeEstudante : estudo.nomeEstudante;
  const baseRelatorio = `${isDireto ? '/direto' : ''}/relatorios/${isPonto ? 'pontos-estudo' : 'estudos-biblicos'}`;

  return (
    <div className={isDireto ? 'flex flex-col h-full bg-[#F4F5F7] animate-fade-in' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-6'}>
        <button type="button" className="text-sm font-semibold text-[#1A3A6B] mb-3" onClick={() => navigate(baseRelatorio)}>
          Voltar ao relatório
        </button>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">{isPonto ? 'Ponto de Estudo' : 'Dashboard do Estudante'}</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h1>
            <p className="text-gray-400 text-sm mt-1">{getSerieNome(estudo.serie)} · {getLicaoLabel(estudo.serie, estudo.licaoAtual)}</p>
          </div>
          <div className="w-full lg:w-72">
            <div className="flex items-center justify-between text-sm mb-1"><span>Progresso geral</span><strong>{percentual}%</strong></div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden"><div className="h-full bg-[#C9963A]" style={{ width: `${percentual}%` }} /></div>
          </div>
        </div>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 space-y-5' : 'space-y-5'}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card"><p className="text-xs text-gray-400">Lição atual</p><p className="text-2xl font-bold text-[#1A3A6B]">{estudo.licaoAtual}</p></div>
          <div className="card"><p className="text-xs text-gray-400">Total da série</p><p className="text-2xl font-bold text-[#1A3A6B]">{totalLicoes(estudo.serie)}</p></div>
          <div className="card"><p className="text-xs text-gray-400">Progresso</p><p className="text-2xl font-bold text-[#C9963A]">{percentual}%</p></div>
          <div className="card"><p className="text-xs text-gray-400">Classificação</p><p className="text-2xl font-bold text-emerald-600">{estudo.classificacaoInteressado || (isPonto ? `${estudo.participantes?.length || 0}` : '—')}</p></div>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <KanbanCard titulo="Cadastro">
            <Info label="WhatsApp" valor={estudo.whatsapp} />
            <Info label="Endereço" valor={estudo.endereco} />
            <Info label="Cidade/Estado" valor={`${estudo.cidade}/${estudo.estado}`} />
            {!isPonto && <Info label="Sexo" valor={estudo.sexo} />}
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

          <KanbanCard titulo={isPonto ? 'Estudantes do Ponto' : 'Decisão'}>
            {isPonto ? (
              estudo.participantes?.map((participante) => (
                <Info key={participante.id} label={`Classe ${participante.classificacaoInteressado || '-'}`} valor={participante.nome} />
              ))
            ) : (
              <>
                <Info label="Classificação" valor={estudo.classificacaoInteressado} />
                <Info label="Motivo / observação" valor={estudo.motivoImpedimento || estudo.observacoes} />
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
