import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../lib/toast';
import EChart from '../components/EChart';

const Icone = ({ children, cor = '#1A3A6B' }) => (
  <div
    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
    style={{ backgroundColor: `${cor}12`, color: cor }}
  >
    {children}
  </div>
);

const GaugeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13a8 8 0 1116 0M12 13l4-4M7 17h10" />
  </svg>
);

const BookIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.25A6.75 6.75 0 005.25 3H4.5A1.5 1.5 0 003 4.5v13.25A2.25 2.25 0 005.25 20H6a6 6 0 016 3m0-16.75A6.75 6.75 0 0118.75 3h.75A1.5 1.5 0 0121 4.5v13.25A2.25 2.25 0 0118.75 20H18a6 6 0 00-6 3" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20a4 4 0 00-8 0M12 12a4 4 0 100-8 4 4 0 000 8zm7 8a3 3 0 00-4.5-2.6M5 20a3 3 0 014.5-2.6M18 11a3 3 0 100-6M6 11a3 3 0 110-6" />
  </svg>
);

const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5h6m-7 4h8m-8 4h8m-8 4h5M9 3h6a2 2 0 012 2h1a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h1a2 2 0 012-2z" />
  </svg>
);

const VisitIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7-7.5 10.5-7.5 10.5S4.5 17.5 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');

const classeMotivos = {
  A: 'Motivo da Classe A: duplas que informaram que ja levaram pelo menos uma pessoa ao batismo.',
  B: 'Motivo da Classe B: duplas que ja deram estudo biblico, mas ainda nao informaram batismo.',
  C: 'Motivo da Classe C: duplas que ainda nao informaram estudo biblico realizado.',
};

function Indicador({ label, valor, detalhe, tooltip, cor, icon, onClick }) {
  const Conteudo = (
    <>
      <div className="flex items-start gap-3">
        <Icone cor={cor}>{icon}</Icone>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-tight" style={{ color: cor }}>{numero(valor)}</p>
          <p className="text-sm font-semibold text-[#1A3A6B] mt-1">{label}</p>
          {detalhe && <p className="text-xs text-gray-400 mt-1">{detalhe}</p>}
        </div>
      </div>
    </>
  );

  const classes = `smart-tooltip bg-white border border-gray-100 rounded-lg p-4 shadow-sm hover:-translate-y-0.5 transition-all duration-200 ${onClick ? 'w-full text-left cursor-pointer hover:border-[#C9963A]/50 focus:outline-none focus:ring-2 focus:ring-[#C9963A]/25' : ''}`;

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      data-tooltip={tooltip || detalhe || `${label}: total consolidado conforme os registros atualmente carregados.`}
    >
      {Conteudo}
    </button>
  ) : (
    <div
      className={classes}
      data-tooltip={tooltip || detalhe || `${label}: total consolidado conforme os registros atualmente carregados.`}
      tabIndex={0}
    >
      {Conteudo}
    </div>
  );
}

function ClasseResumo({ classe, valor, cor, bg, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="smart-tooltip w-full text-left rounded-lg p-4 border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#1A3A6B]/20"
      data-tooltip={`Classe ${classe}: quantidade de duplas classificadas neste grupo missionario. ${classeMotivos[classe]} Clique para ver todas as duplas da Classe ${classe}.`}
      style={{ backgroundColor: bg, borderColor: `${cor}30` }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-bold" style={{ color: cor }}>Classe {classe}</span>
        <span className="text-xl font-bold" style={{ color: cor }}>{numero(valor)}</span>
      </div>
    </button>
  );
}

function DestaqueRanking({ label, item, cor, icon, detalhe }) {
  return (
    <div
      className="smart-tooltip bg-white border border-gray-100 rounded-lg p-4 shadow-sm"
      data-tooltip={`${label}: exibe o registro com maior total no indicador selecionado. Valor mostrado: ${numero(item?.total)} ${detalhe || 'registros'}.`}
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <Icone cor={cor}>{icon}</Icone>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
          <p className="text-lg font-bold text-[#1A3A6B] truncate mt-1">{item?.nome || 'Sem dados'}</p>
          <div className="flex items-end justify-between gap-3 mt-2">
            <p className="text-xs text-gray-400">{detalhe || 'Maior volume registrado'}</p>
            <p className="text-2xl font-bold leading-none" style={{ color: cor }}>{numero(item?.total)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ListaRanking({ titulo, itens = [], valorCampo, valorLabel, cor = '#1A3A6B', detalheCampo, onItemClick }) {
  return (
    <div className="bg-[#F4F5F7] rounded-lg border border-gray-100 p-4">
      <h3 className="text-sm font-bold text-[#1A3A6B] mb-3">{titulo}</h3>
      <div className="space-y-2">
        {itens.length > 0 ? itens.map((item, index) => {
          const Conteudo = (
            <>
              <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#1A3A6B] truncate">{item.nome}</p>
                {detalheCampo && <p className="text-xs text-gray-400 truncate">{item[detalheCampo]}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold leading-tight" style={{ color: cor }}>{numero(item[valorCampo])}</p>
                <p className="text-[10px] text-gray-400 uppercase">{valorLabel}</p>
              </div>
            </>
          );

          return onItemClick ? (
            <button
              key={`${titulo}-${item.id}-${index}`}
              type="button"
              onClick={() => onItemClick(item)}
              className="smart-tooltip w-full bg-white rounded-lg border border-gray-100 px-3 py-3 flex items-center gap-3 text-left hover:border-[#C9963A]/50 hover:shadow-sm transition-all active:scale-[0.99] active:opacity-80"
              data-tooltip={`${titulo}: ${item.nome} possui ${numero(item[valorCampo])} ${valorLabel}. Clique para abrir o detalhe relacionado.`}
            >
              {Conteudo}
            </button>
          ) : (
            <div
              key={`${titulo}-${item.id}-${index}`}
              className="smart-tooltip bg-white rounded-lg border border-gray-100 px-3 py-3 flex items-center gap-3"
              data-tooltip={`${titulo}: ${item.nome} possui ${numero(item[valorCampo])} ${valorLabel}.`}
              tabIndex={0}
            >
              {Conteudo}
            </div>
          );
        }) : (
          <p className="text-sm text-gray-400">Sem dados para exibir.</p>
        )}
      </div>
    </div>
  );
}

function Painel({ titulo, subtitulo, cor, children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-visible">
      <div className="px-5 py-4 border-b border-gray-100" style={{ borderTop: `4px solid ${cor}` }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: cor }}>{subtitulo}</p>
        <h2 className="text-xl font-bold text-[#1A3A6B] mt-1" style={{ fontFamily: 'Georgia, serif' }}>
          {titulo}
        </h2>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

function PainelGrafico({ titulo, subtitulo, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5 overflow-hidden">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#C9963A]">{subtitulo}</p>
          <h3 className="text-lg font-bold text-[#1A3A6B] truncate" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h3>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function DashboardAssociacao() {
  const location = useLocation();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const isDireto = location.pathname.startsWith('/direto');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formEscola, setFormEscola] = useState({
    unidadesAcao: 0,
    classeProfessores: 0,
    classeInteressados: 0,
    visitasDiretores: 0,
    visitasProfessores: 0,
    visitasAlunos: 0,
    quantidadePequenosGrupos: 0,
  });

  useEffect(() => {
    api.get('/relatorios/dashboard-associacao')
      .then((res) => {
        setDados(res.data);
        const escolaAtual = res.data?.escolaSabatina || {};
        const visitasAtuais = escolaAtual.visitasRealizadas || {};
        setFormEscola({
          unidadesAcao: escolaAtual.unidadesAcao || 0,
          classeProfessores: escolaAtual.classeProfessores || 0,
          classeInteressados: escolaAtual.classeInteressados || 0,
          visitasDiretores: visitasAtuais.diretores || 0,
          visitasProfessores: visitasAtuais.professores || 0,
          visitasAlunos: visitasAtuais.alunos || 0,
          quantidadePequenosGrupos: escolaAtual.quantidadePequenosGrupos || 0,
        });
      })
      .finally(() => setCarregando(false));
  }, []);

  const ministerio = dados?.ministerioPessoal || {};
  const escola = dados?.escolaSabatina || {};
  const dashboardDuplas = dados?.duplasMissionarias || {};
  const dashboardClasses = dados?.classesBiblicasDetalhes || {};
  const visitas = escola.visitasRealizadas || {};

  const visitasDetalhe = useMemo(() => ([
    { label: 'Diretores', valor: visitas.diretores || 0, cor: '#1A3A6B' },
    { label: 'Professores', valor: visitas.professores || 0, cor: '#C9963A' },
    { label: 'Alunos', valor: visitas.alunos || 0, cor: '#0d9488' },
  ]), [visitas.alunos, visitas.diretores, visitas.professores]);

  const classeChartOption = useMemo(() => {
    const classes = ministerio.classes || {};
    return {
      color: ['#16a34a', '#C9963A', '#dc2626'],
      tooltip: { trigger: 'item', formatter: '{b}: {c} duplas ({d}%)' },
      legend: { bottom: 0, icon: 'circle', textStyle: { color: '#64748b', fontSize: 11 } },
      series: [{
        name: 'Sub-classificacoes',
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: { formatter: '{b}\n{c}', color: '#1A3A6B', fontWeight: 700 },
        labelLine: { length: 10, length2: 8 },
        data: [
          { name: 'Classe A', value: classes.A || 0 },
          { name: 'Classe B', value: classes.B || 0 },
          { name: 'Classe C', value: classes.C || 0 },
        ],
      }],
    };
  }, [ministerio.classes]);

  const regiaoChartOption = useMemo(() => {
    const lista = dashboardDuplas.porRegiao || [];
    return {
      color: ['#1A3A6B', '#C9963A', '#0d9488'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 36, right: 12, top: 24, bottom: 54 },
      legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 11 } },
      xAxis: {
        type: 'category',
        data: lista.map((item) => item.nome),
        axisLabel: { color: '#64748b', rotate: 25, fontSize: 10 },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
      },
      series: [
        { name: 'Duplas', type: 'bar', data: lista.map((item) => item.duplas), barWidth: 16, itemStyle: { borderRadius: [5, 5, 0, 0] } },
        { name: 'Estudos', type: 'bar', data: lista.map((item) => item.estudos), barWidth: 16, itemStyle: { borderRadius: [5, 5, 0, 0] } },
        { name: 'Batismos', type: 'line', smooth: true, data: lista.map((item) => item.batismos), symbolSize: 7, lineStyle: { width: 3 } },
      ],
    };
  }, [dashboardDuplas.porRegiao]);

  const distritoChartOption = useMemo(() => {
    const lista = dashboardDuplas.porDistrito || [];
    return {
      color: ['#7B2D8B'],
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => `${params[0]?.name}<br/>${numero(params[0]?.value)} duplas` },
      grid: { left: 118, right: 18, top: 12, bottom: 18 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: lista.map((item) => item.nome),
        axisLabel: { color: '#475569', fontSize: 10, width: 104, overflow: 'truncate' },
        axisTick: { show: false },
      },
      series: [{
        name: 'Duplas',
        type: 'bar',
        data: lista.map((item) => item.duplas),
        barWidth: 14,
        itemStyle: { borderRadius: [0, 6, 6, 0] },
        label: { show: true, position: 'right', color: '#1A3A6B', fontWeight: 700 },
      }],
    };
  }, [dashboardDuplas.porDistrito]);

  const impactoChartOption = useMemo(() => {
    const listaBase = dashboardDuplas.indicadoresGerais || [];
    const lista = listaBase.length > 0
      ? listaBase
      : [
        { nome: 'Estudos', valor: 0 },
        { nome: 'Visitas', valor: 0 },
        { nome: 'Batismos', valor: 0 },
        { nome: 'Pessoas', valor: 0 },
      ];
    const maximo = Math.max(...lista.map((item) => item.valor || 0), 1);
    return {
      color: ['#1A3A6B'],
      tooltip: { trigger: 'axis' },
      radar: {
        radius: '64%',
        indicator: lista.map((item) => ({ name: item.nome, max: maximo })),
        axisName: { color: '#475569', fontSize: 11 },
        splitLine: { lineStyle: { color: '#e5e7eb' } },
        splitArea: { areaStyle: { color: ['rgba(26,58,107,0.03)', 'rgba(201,150,58,0.05)'] } },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
      },
      series: [{
        type: 'radar',
        data: [{ value: lista.map((item) => item.valor || 0), name: 'Indicadores' }],
        areaStyle: { color: 'rgba(26,58,107,0.18)' },
        lineStyle: { width: 3 },
        symbolSize: 6,
      }],
    };
  }, [dashboardDuplas.indicadoresGerais]);

  const podeEditarEscola = ['ADMINISTRADOR', 'LIDER_REGIOES'].includes(usuario?.perfil);
  const irParaDupla = (dupla) => {
    if (dupla?.id) navigate(isDireto ? `/direto/duplas/${dupla.id}` : `/duplas/${dupla.id}`);
  };
  const irParaClassesBiblicas = () => {
    navigate(isDireto ? '/direto/relatorios/classes-biblicas/registros' : '/relatorios/classes-biblicas/registros');
  };
  const irParaClassificacaoClasses = () => {
    navigate(isDireto ? '/direto/relatorios/classes-biblicas' : '/relatorios/classes-biblicas');
  };
  const caminho = (rota) => `${isDireto ? '/direto' : ''}${rota}`;
  const irParaDuplasPorClasse = (classe) => {
    navigate(`${caminho('/duplas')}?classe=${classe}`);
  };

  const setCampoEscola = (campo, valor) => {
    setFormEscola((prev) => ({ ...prev, [campo]: valor }));
  };

  const salvarEscolaSabatina = async () => {
    setSalvando(true);
    try {
      await api.patch('/relatorios/escola-sabatina-resumo', formEscola);
      const { data } = await api.get('/relatorios/dashboard-associacao');
      setDados(data);
      setEditando(false);
      toast.success('Resumo da Escola Sabatina atualizado.');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar Escola Sabatina.');
    } finally {
      setSalvando(false);
    }
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20 border-t-[#1A3A6B] animate-spin" />
      </div>
    );
  }

  return (
    <div className={isDireto ? 'h-full overflow-y-auto bg-[#F4F5F7] p-4 sm:p-6 animate-fade-in' : 'animate-fade-in'}>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Associação Paulistana</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Ministério Pessoal e Escola Sabatina
        </h1>
        <p className="text-gray-400 text-sm mt-1">Visão de resumo solicitada no planejamento das mudanças.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Painel titulo="Ministério Pessoal" subtitulo="Painel esquerdo" cor="#1A3A6B">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Indicador label="Atas duplas" valor={ministerio.atasDuplas} tooltip="Atas duplas: total de atas de acompanhamento registradas pelas duplas missionarias. Toque para abrir Registro de Assistencia." cor="#1A3A6B" icon={<ClipboardIcon />} onClick={() => navigate(caminho('/registro-saida'))} />
            <Indicador label="Registros cadastrados" valor={ministerio.quantidadeEstudos} tooltip="Registros cadastrados: estudos individuais + pontos de estudo + classes biblicas. Toque para abrir todos os registros que formam este total." cor="#0284c7" icon={<BookIcon />} onClick={() => navigate(caminho('/relatorios/estudos-cadastrados'))} />
            <Indicador label="Estudos individuais" valor={ministerio.quantidadeEstudosIndividuais} tooltip="Estudos individuais: total de estudantes cadastrados como estudo biblico individual. Toque para abrir Estudantes Biblicos." cor="#1A3A6B" icon={<BookIcon />} onClick={() => navigate(caminho('/relatorios/estudos-biblicos'))} />
            <Indicador label="Pontos estudos bíblicos" valor={ministerio.quantidadePontosEstudos} tooltip="Pontos de estudo biblico: quantidade de pontos cadastrados. Toque para abrir Pontos de Estudo." cor="#0d9488" icon={<GaugeIcon />} onClick={() => navigate(caminho('/relatorios/pontos-estudo'))} />
            <Indicador label="Estudantes nos pontos" valor={ministerio.quantidadeEstudantesPontos} tooltip="Estudantes nos pontos: soma dos participantes cadastrados dentro dos pontos. Toque para abrir Pontos de Estudo." cor="#0d9488" icon={<UsersIcon />} onClick={() => navigate(caminho('/relatorios/pontos-estudo'))} />
            <Indicador label="Classes bíblicas" valor={ministerio.quantidadeClasses} tooltip="Classes biblicas: total de classes cadastradas no sistema. Toque para abrir os registros de classes biblicas." cor="#7B2D8B" icon={<UsersIcon />} onClick={irParaClassesBiblicas} />
            <Indicador label="Estudantes em classes" valor={ministerio.quantidadeEstudantesClasses} tooltip="Estudantes em classes: soma dos participantes cadastrados dentro das classes. Toque para abrir os registros de classes biblicas." cor="#7B2D8B" icon={<ClipboardIcon />} onClick={irParaClassesBiblicas} />
            <div className="sm:col-span-2">
              <Indicador
                label="Qtidade de pessoas estudando"
                valor={ministerio.quantidadePessoasEstudando}
                detalhe="Individuais + pontos + classes."
                tooltip="Quantidade de pessoas estudando: estudos individuais + estudantes nos pontos + estudantes em classes. Toque para abrir todos os registros cadastrados."
                cor="#C9963A"
                icon={<UsersIcon />}
                onClick={() => navigate(caminho('/relatorios/estudos-cadastrados'))}
              />
            </div>
          </div>

          <div className="mt-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Sub-classificações de classes</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <ClasseResumo classe="A" valor={ministerio.classes?.A} cor="#16a34a" bg="#dcfce7" onClick={() => irParaDuplasPorClasse('A')} />
              <ClasseResumo classe="B" valor={ministerio.classes?.B} cor="#b45309" bg="#fef3c7" onClick={() => irParaDuplasPorClasse('B')} />
              <ClasseResumo classe="C" valor={ministerio.classes?.C} cor="#dc2626" bg="#fee2e2" onClick={() => irParaDuplasPorClasse('C')} />
            </div>
          </div>
        </Painel>

        <Painel titulo="Escola Sabatina" subtitulo="Painel direito" cor="#C9963A">
          {podeEditarEscola && (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={() => setEditando((atual) => !atual)}
                className="btn-outline text-xs px-3 py-2"
              >
                {editando ? 'Fechar edição' : 'Atualizar dados'}
              </button>
            </div>
          )}

          {editando && (
            <div className="bg-[#F4F5F7] rounded-lg p-4 border border-gray-100 mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['unidadesAcao', 'Unidades de ação'],
                  ['classeProfessores', 'Classe dos professores'],
                  ['classeInteressados', 'Classe de interessados'],
                  ['quantidadePequenosGrupos', 'Quantidade de Pequenos Grupos'],
                  ['visitasDiretores', 'Visitas dos diretores'],
                  ['visitasProfessores', 'Visitas dos professores'],
                  ['visitasAlunos', 'Visitas dos alunos'],
                ].map(([campo, label]) => (
                  <label key={campo} className="block">
                    <span className="block text-xs font-semibold text-gray-500 mb-1">{label}</span>
                    <input
                      type="number"
                      min="0"
                      className="input-field"
                      value={formEscola[campo]}
                      onChange={(e) => setCampoEscola(campo, e.target.value)}
                    />
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" className="btn-outline text-xs px-3 py-2" onClick={() => setEditando(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn-primary text-xs px-3 py-2" onClick={salvarEscolaSabatina} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar Escola Sabatina'}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Indicador label="Unidades de ação" valor={escola.unidadesAcao} tooltip="Unidades de acao: total informado para as unidades ativas da Escola Sabatina." cor="#1A3A6B" icon={<UsersIcon />} />
            <Indicador label="Classe dos professores" valor={escola.classeProfessores} tooltip="Classe dos professores: quantidade registrada para classes de professores da Escola Sabatina." cor="#7B2D8B" icon={<BookIcon />} />
            <Indicador label="Classe de interessados" valor={escola.classeInteressados} tooltip="Classe de interessados: quantidade registrada para classes de interessados da Escola Sabatina." cor="#0d9488" icon={<UsersIcon />} />
            <Indicador label="Pequenos Grupos" valor={escola.quantidadePequenosGrupos} tooltip="Pequenos Grupos: total de pequenos grupos informado no resumo da Escola Sabatina." cor="#C9963A" icon={<GaugeIcon />} />
          </div>

          <div className="mt-5 bg-[#F4F5F7] rounded-lg p-4 border border-gray-100">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-[#1A3A6B]">Visitas realizadas</h3>
                <p className="text-xs text-gray-400">Detalhamento por responsáveis</p>
              </div>
              <div
                className="smart-tooltip text-right"
                data-tooltip="Visitas realizadas: soma das visitas registradas para diretores, professores e alunos."
                tabIndex={0}
              >
                <p className="text-2xl font-bold text-[#1A3A6B]">{numero(visitas.total)}</p>
                <p className="text-xs text-gray-400">total</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {visitasDetalhe.map((item) => (
                <div
                  key={item.label}
                  className="smart-tooltip bg-white rounded-lg p-3 border border-gray-100"
                  data-tooltip={`Visitas de ${item.label.toLowerCase()}: total registrado neste grupo da Escola Sabatina.`}
                  tabIndex={0}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icone cor={item.cor}><VisitIcon /></Icone>
                    <span className="text-xs font-semibold text-gray-500">{item.label}</span>
                  </div>
                  <p className="text-xl font-bold" style={{ color: item.cor }}>{numero(item.valor)}</p>
                </div>
              ))}
            </div>
          </div>
        </Painel>
      </div>

      <section className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Analise visual</p>
            <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Panorama da Associacao Paulistana
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
          <PainelGrafico titulo="Classes das duplas" subtitulo="Distribuicao A/B/C">
            <EChart option={classeChartOption} className="h-72" />
          </PainelGrafico>
          <div className="xl:col-span-2">
            <PainelGrafico titulo="Forca missionaria por regiao" subtitulo="Duplas, estudos e batismos">
              <EChart option={regiaoChartOption} className="h-72" />
            </PainelGrafico>
          </div>
          <PainelGrafico titulo="Indicadores de impacto" subtitulo="Comparativo geral">
            <EChart option={impactoChartOption} className="h-72" />
          </PainelGrafico>
          <div className="xl:col-span-2">
            <PainelGrafico titulo="Distritos com mais duplas" subtitulo="Top distritos">
              <EChart option={distritoChartOption} className="h-80" />
            </PainelGrafico>
          </div>
          <div className="xl:col-span-2 bg-[#0f2347] rounded-xl border border-[#C9963A]/20 shadow-sm p-5 overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-[#e5b05a]">Ranking combinado</p>
                <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>Duplas em destaque</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(dashboardDuplas.topPerformance || []).map((item, index) => (
                <div key={`${item.nome}-${index}`} className="rounded-lg bg-white/10 border border-white/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#e5b05a]">#{index + 1}</p>
                      <p className="text-sm font-semibold text-white truncate">{item.nome}</p>
                    </div>
                    <p className="text-2xl font-bold text-[#e5b05a]">{numero(item.valor)}</p>
                  </div>
                </div>
              ))}
              {(dashboardDuplas.topPerformance || []).length === 0 && (
                <p className="text-sm text-white/60">Sem dados para exibir.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mt-5">
        <Painel titulo="Duplas Missionárias" subtitulo="Dashboard de desempenho" cor="#1A3A6B">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Indicador label="Total de duplas" valor={dashboardDuplas.totalDuplas} tooltip="Total de duplas missionarias cadastradas no escopo do dashboard." cor="#1A3A6B" icon={<UsersIcon />} />
            <DestaqueRanking
              label="Região com mais duplas"
              item={dashboardDuplas.regiaoMaisDuplas}
              cor="#C9963A"
              icon={<VisitIcon />}
              detalhe="duplas missionárias"
            />
            <DestaqueRanking
              label="Distrito com mais duplas"
              item={dashboardDuplas.distritoMaisDuplas}
              cor="#0d9488"
              icon={<GaugeIcon />}
              detalhe="duplas missionárias"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ListaRanking
              titulo="Duplas com mais estudos"
              itens={dashboardDuplas.topEstudos}
              valorCampo="estudos"
              valorLabel="estudos"
              detalheCampo="distrito"
              cor="#0284c7"
              onItemClick={irParaDupla}
            />
            <ListaRanking
              titulo="Duplas com mais batismos"
              itens={dashboardDuplas.topBatismos}
              valorCampo="batismos"
              valorLabel="batismos"
              detalheCampo="distrito"
              cor="#0d9488"
              onItemClick={irParaDupla}
            />
            <ListaRanking
              titulo="Duplas com mais visitas"
              itens={dashboardDuplas.topVisitas}
              valorCampo="visitas"
              valorLabel="visitas"
              detalheCampo="distrito"
              cor="#7B2D8B"
              onItemClick={irParaDupla}
            />
            <ListaRanking
              titulo="Duplas com mais pessoas alcançadas"
              itens={dashboardDuplas.topPessoasAlcancadas}
              valorCampo="pessoasAlcancadas"
              valorLabel="pessoas"
              detalheCampo="distrito"
              cor="#C9963A"
              onItemClick={irParaDupla}
            />
          </div>
        </Painel>

        <Painel titulo="Classes Bíblicas" subtitulo="Dashboard detalhado" cor="#7B2D8B">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <Indicador label="Classes bíblicas" valor={dashboardClasses.totalClasses} tooltip="Classes biblicas: total de classes cadastradas para acompanhamento." cor="#7B2D8B" icon={<BookIcon />} />
            <Indicador label="Duplas com classe" valor={dashboardClasses.totalDuplasComClasse} tooltip="Duplas com classe: quantidade de duplas que possuem ao menos uma classe biblica vinculada." cor="#1A3A6B" icon={<UsersIcon />} />
            <Indicador label="Estudantes em classes" valor={dashboardClasses.totalEstudantes} tooltip="Estudantes em classes: soma dos participantes cadastrados nas classes biblicas." cor="#C9963A" icon={<ClipboardIcon />} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <DestaqueRanking
              label="Região com mais classes"
              item={dashboardClasses.regiaoMaisClasses}
              cor="#C9963A"
              icon={<VisitIcon />}
              detalhe="classes bíblicas"
            />
            <DestaqueRanking
              label="Distrito com mais classes"
              item={dashboardClasses.distritoMaisClasses}
              cor="#0d9488"
              icon={<GaugeIcon />}
              detalhe="classes bíblicas"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ListaRanking
              titulo="Classes com mais estudantes"
              itens={dashboardClasses.topEstudantes}
              valorCampo="estudantes"
              valorLabel="estud."
              detalheCampo="dupla"
              cor="#C9963A"
              onItemClick={irParaClassificacaoClasses}
            />
            <ListaRanking
              titulo="Classes com mais batismos"
              itens={dashboardClasses.topBatismos}
              valorCampo="batismos"
              valorLabel="batismos"
              detalheCampo="dupla"
              cor="#0d9488"
              onItemClick={irParaClassificacaoClasses}
            />
            <div className="lg:col-span-2">
              <ListaRanking
                titulo="Classes mais avançadas na lição"
                itens={dashboardClasses.topLicaoAtual}
                valorCampo="licaoAtual"
                valorLabel="lição"
                detalheCampo="dupla"
                cor="#1A3A6B"
                onItemClick={irParaClassificacaoClasses}
              />
            </div>
          </div>
        </Painel>
      </div>
    </div>
  );
}
