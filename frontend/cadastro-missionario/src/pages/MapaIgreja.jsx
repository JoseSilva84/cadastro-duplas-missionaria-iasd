import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import LoadingState from '../components/LoadingState';

const cores = ['#1A3A6B', '#0d9488', '#7c3aed', '#ea580c', '#dc2626', '#C9963A'];

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');
const formatarData = (valor) => {
  if (!valor) return 'Não informado';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Não informado';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const CardIndicador = ({ label, valor, cor, detalhe }) => (
  <article className="rounded-xl border bg-white p-4 shadow-sm" style={{ borderColor: `${cor}35` }}>
    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md" style={{ backgroundColor: cor }}>
      <span className="text-lg font-bold">{String(label).charAt(0)}</span>
    </div>
    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
    <p className="mt-1 text-3xl font-bold" style={{ color: cor }}>{valor}</p>
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
    <section className="rounded-2xl border border-[#1A3A6B]/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Mapa da Igreja</p>
          <h2 className="mt-1 break-words text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
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

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Ações missionárias</p>
            <h3 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Planejamento local
            </h3>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">{acoes.length} ação(ões)</span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {acoes.map((acao, index) => (
            <div key={`${acao.nome}-${index}`} className="rounded-xl border border-white bg-white p-3 shadow-sm">
              <p className="font-bold text-[#1A3A6B]">{acao.nome}</p>
              <p className="mt-1 text-sm text-slate-400">{acao.responsavel || 'Sem responsável'}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-[#C9963A]">{formatarData(acao.data)}</p>
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
