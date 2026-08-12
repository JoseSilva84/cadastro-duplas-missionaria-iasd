import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';
import EChart from '../components/EChart';
import MapaIgrejaResumo, { somarMapasIgreja } from '../components/MapaIgrejaResumo';

const cores = ['#1A3A6B', '#0d9488', '#7c3aed', '#ea580c', '#dc2626', '#C9963A'];

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');
const formatarData = (valor) => {
  if (!valor) return 'Não informado';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Não informado';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const CardIndicador = ({ label, valor, cor, detalhe }) => (
  <article className="group rounded-xl border bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#C9963A]/60 hover:shadow-2xl hover:shadow-[#1A3A6B]/10" style={{ borderColor: `${cor}35` }}>
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-lg" style={{ backgroundColor: cor }}>
      <span className="text-lg font-bold">{String(label).charAt(0)}</span>
    </div>
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors duration-300 group-hover:text-[#1A3A6B]">{label}</p>
    <p className="mt-1 text-3xl font-bold transition-transform duration-300 group-hover:translate-x-0.5" style={{ color: cor }}>{valor}</p>
    {detalhe && <p className="mt-1 text-sm text-slate-400">{detalhe}</p>}
  </article>
);

const LinhaLideranca = ({ label, valor }) => (
  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 break-words text-base font-bold text-[#1A3A6B]">{valor || 'Não informado'}</p>
  </div>
);

const MapaCard = ({ mapa, onEditar }) => {
  const igreja = mapa.igreja || {};
  const indicadores = [
    ['Pequeno Grupo', mapa.quantidadePequenosGrupos, '#C9963A'],
    ['Semana Santa', mapa.semanaSanta, '#0d9488'],
    ['Classe Bíblica', mapa.classeBiblica, '#7c3aed'],
    ['Aventureiros', mapa.aventureiros, '#0284c7'],
    ['Duplas Missionárias', igreja._count?.duplas || 0, '#1A3A6B'],
    ['Desbravadores', mapa.desbravadores, '#dc2626'],
  ];
  const acoes = Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias : [];

  return (
    <section className="group rounded-2xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#C9963A]/60 hover:shadow-2xl hover:shadow-[#1A3A6B]/10 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Mapa da Igreja</p>
          <h2 className="mt-1 break-words text-2xl font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>
            {igreja.nome}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {igreja.distrito?.nome || 'Sem distrito'} · {igreja.distrito?.regiao?.nome || 'Sem região'}
          </p>
        </div>
        <button type="button" className="btn-outline px-4 py-2 text-sm" onClick={() => onEditar(mapa)}>
          Editar cadastro
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <LinhaLideranca label="Pastor" valor={mapa.pastorNome} />
        <LinhaLideranca label="Diretor Missionário" valor={mapa.diretorMissionarioNome} />
        <LinhaLideranca label="Primeiro Ancião" valor={mapa.primeiroAnciaoNome} />
        <LinhaLideranca label="Ano que se tornou igreja" valor={mapa.anoOrganizacao} />
        <LinhaLideranca label="Membros da igreja" valor={numero(igreja.membros)} />
        <LinhaLideranca label="Evangelismo de colheita" valor={formatarData(mapa.dataEvangelismoColheita)} />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {indicadores.map(([label, valor, cor]) => (
          <CardIndicador key={label} label={label} valor={numero(valor)} cor={cor} />
        ))}
      </div>

      <div className="group/actions relative mt-5 overflow-hidden rounded-xl border border-slate-100 bg-slate-50 p-4 transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#C9963A]/50 hover:bg-white hover:shadow-2xl hover:shadow-[#1A3A6B]/10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(201,150,58,0.16),transparent_34%),linear-gradient(135deg,rgba(26,58,107,0.07),transparent_46%)] opacity-0 transition-opacity duration-500 group-hover/actions:opacity-100" />
        <div className="pointer-events-none absolute left-4 right-4 top-0 h-px bg-gradient-to-r from-transparent via-[#C9963A]/70 to-transparent opacity-0 transition-opacity duration-500 group-hover/actions:opacity-100" />
        <div className="relative flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A] transition-all duration-300 group-hover/actions:tracking-[0.22em]">Ações missionárias</p>
            <h3 className="text-lg font-bold text-[#1A3A6B] transition-colors duration-300 group-hover/actions:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>
              Planejamento local
            </h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm transition-all duration-300 group-hover/actions:-translate-y-0.5 group-hover/actions:bg-[#1A3A6B] group-hover/actions:text-white">{acoes.length} ação(ões)</span>
        </div>
        <div className="relative mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {acoes.map((acao, index) => (
            <div key={`${acao.nome}-${index}`} className="group/action rounded-xl border border-white bg-white p-3 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#C9963A]/40 hover:shadow-xl hover:shadow-[#1A3A6B]/10">
              <p className="font-bold text-[#1A3A6B] transition-colors duration-300 group-hover/action:text-[#C9963A]">{acao.nome}</p>
              <p className="mt-1 text-sm text-slate-400 transition-colors duration-300 group-hover/action:text-slate-500">{acao.responsavel || 'Sem responsável'}</p>
              <p className="mt-3 inline-flex rounded-full bg-[#C9963A]/10 px-2.5 py-1 text-xs font-bold uppercase tracking-widest text-[#C9963A] transition-all duration-300 group-hover/action:bg-[#C9963A] group-hover/action:text-white">{formatarData(acao.data)}</p>
            </div>
          ))}
          {acoes.length === 0 && (
            <p className="rounded-xl bg-white p-4 text-sm text-slate-400 md:col-span-2 xl:col-span-3">Nenhuma ação missionária cadastrada.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default function MapaIgreja() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const prefix = isDireto ? '/direto' : '';
  const [mapas, setMapas] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/mapa-igreja'), api.get('/igrejas')]).then(([mapasRes, igrejasRes]) => {
      setMapas(Array.isArray(mapasRes.data) ? mapasRes.data : []);
      setIgrejas(Array.isArray(igrejasRes.data) ? igrejasRes.data : []);
    }).finally(() => setCarregando(false));
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return mapas;
    return mapas.filter((mapa) => (
      mapa.igreja?.nome?.toLowerCase().includes(termo) ||
      mapa.igreja?.distrito?.nome?.toLowerCase().includes(termo) ||
      mapa.pastorNome?.toLowerCase().includes(termo)
    ));
  }, [busca, mapas]);

  const resumo = useMemo(() => ({
    igrejas: mapas.length,
    membros: mapas.reduce((acc, mapa) => acc + Number(mapa.igreja?.membros || 0), 0),
    pequenosGrupos: mapas.reduce((acc, mapa) => acc + Number(mapa.quantidadePequenosGrupos || 0), 0),
    acoes: mapas.reduce((acc, mapa) => acc + (Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias.length : 0), 0),
  }), [mapas]);

  const resumoAnalitico = useMemo(() => somarMapasIgreja(mapas), [mapas]);

  const indicadoresOption = useMemo(() => ({
    color: ['#1A3A6B'],
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 24, right: 16, top: 24, bottom: 58, containLabel: true },
    xAxis: {
      type: 'category',
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontWeight: 700, interval: 0, rotate: 18 },
      data: ['Pequeno Grupo', 'Semana Santa', 'Classe Biblica', 'Aventureiros', 'Duplas', 'Desbravadores'],
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#e5e7eb' } },
    },
    series: [{
      name: 'Total',
      type: 'bar',
      barWidth: 28,
      itemStyle: {
        borderRadius: [8, 8, 0, 0],
        color: (params) => ['#C9963A', '#0d9488', '#7c3aed', '#0284c7', '#1A3A6B', '#dc2626'][params.dataIndex],
      },
      data: [
        resumoAnalitico.quantidadePequenosGrupos,
        resumoAnalitico.semanaSanta,
        resumoAnalitico.classeBiblica,
        resumoAnalitico.aventureiros,
        resumoAnalitico.quantidadeDuplasMissionarias,
        resumoAnalitico.desbravadores,
      ],
    }],
  }), [resumoAnalitico]);

  const acoesPorIgrejaOption = useMemo(() => {
    const dados = mapas
      .map((mapa) => ({
        name: mapa.igreja?.nome || 'Sem igreja',
        value: Array.isArray(mapa.acoesMissionarias) ? mapa.acoesMissionarias.length : 0,
      }))
      .filter((item) => item.value > 0);

    return {
      color: cores,
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, type: 'scroll', textStyle: { color: '#64748b' } },
      series: [{
        name: 'Acoes missionarias',
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['50%', '42%'],
        avoidLabelOverlap: true,
        label: { color: '#334155', fontWeight: 700 },
        data: dados.length ? dados : [{ name: 'Sem acoes', value: 0 }],
      }],
    };
  }, [mapas]);

  if (carregando) return <LoadingState mensagem="Carregando Mapa da Igreja..." />;

  return (
    <div className="animate-fade-in-up">
      <div className="rounded-2xl border border-[#1A3A6B]/10 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Relatório analítico</p>
            <h1 className="mt-2 text-3xl font-bold text-[#1A3A6B] sm:text-4xl" style={{ fontFamily: 'Georgia, serif' }}>
              Mapa da Igreja
            </h1>
            <p className="mt-1 text-sm text-slate-400">Visão da liderança, estrutura missionária, ações e evangelismo de colheita.</p>
          </div>
          <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => navigate(`${prefix}/cadastro/mapa-igreja`)}>
            Novo cadastro
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardIndicador label="Igrejas mapeadas" valor={numero(resumo.igrejas)} cor={cores[0]} detalhe={`${igrejas.length} igreja(s) no escopo`} />
        <CardIndicador label="Membros" valor={numero(resumo.membros)} cor={cores[1]} />
        <CardIndicador label="Pequenos Grupos" valor={numero(resumo.pequenosGrupos)} cor={cores[2]} />
        <CardIndicador label="Ações Missionárias" valor={numero(resumo.acoes)} cor={cores[3]} />
      </div>

      <div className="mt-5">
        <MapaIgrejaResumo
          mapas={mapas}
          titulo="Mapa da Igreja - Geral"
          subtitulo="Consolidado de todas as igrejas mapeadas no escopo administrativo."
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="group rounded-2xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#C9963A]/60 hover:shadow-2xl hover:shadow-[#1A3A6B]/10 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Graficos</p>
          <h2 className="mt-1 text-xl font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>
            Estrutura missionaria
          </h2>
          <EChart option={indicadoresOption} className="h-80" />
        </section>

        <section className="group rounded-2xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#C9963A]/60 hover:shadow-2xl hover:shadow-[#1A3A6B]/10 sm:p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Graficos</p>
          <h2 className="mt-1 text-xl font-bold text-[#1A3A6B] transition-colors duration-300 group-hover:text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>
            Acoes missionarias por igreja
          </h2>
          <EChart option={acoesPorIgrejaOption} className="h-80" />
        </section>
      </div>

      <div className="mt-5 rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
        <input
          className="input-field"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por igreja, distrito ou pastor..."
        />
      </div>

      <div className="mt-5 space-y-5">
        {filtrados.map((mapa) => (
          <MapaCard key={mapa.id} mapa={mapa} onEditar={() => navigate(`${prefix}/cadastro/mapa-igreja?igrejaId=${mapa.igrejaId}`)} />
        ))}
        {filtrados.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-400">
            Nenhum Mapa da Igreja cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
