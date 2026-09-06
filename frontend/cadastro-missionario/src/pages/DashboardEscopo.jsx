import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingState from '../components/LoadingState';
import api from '../lib/api';
import { escopoUsuario, funcaoUsuario, nomePessoaUsuario } from '../lib/usuarioIdentidade';

const numero = (valor) => Number(valor || 0).toLocaleString('pt-BR');
const quantidadeEstudos = (dupla) => dupla?._count?.estudosBiblicos ?? dupla?.estudosBiblicos?.length ?? 0;
const quantidadeVisitas = (dupla) => dupla?._count?.acompanhamentos ?? 0;

const projetoLabel = {
  CASA_A_CASA: 'Visitação',
  ESTUDO_BIBLICO: 'Estudo Bíblico',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  EVANGELISMO_PUBLICO: 'Classe Bíblica',
};

function CardIndicador({ titulo, valor, detalhe, cor }) {
  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1.5 hover:border-[#C9963A]/35 hover:shadow-xl hover:shadow-[#1A3A6B]/10"
      style={{ borderTop: `3px solid ${cor}` }}
    >
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 transition-all duration-500 group-hover:scale-125 group-hover:opacity-10" style={{ backgroundColor: cor }} />
      <p className="relative text-xs font-bold uppercase tracking-wider text-gray-400 transition-colors duration-300 group-hover:text-gray-600">{titulo}</p>
      <p className="relative mt-2 text-3xl font-bold transition-transform duration-300 group-hover:translate-x-1" style={{ color: cor }}>{numero(valor)}</p>
      <p className="relative mt-2 text-xs text-gray-500">{detalhe}</p>
    </div>
  );
}

function Ranking({ titulo, itens, campo, cor }) {
  return (
    <div className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#C9963A]/30 hover:shadow-xl hover:shadow-[#1A3A6B]/10">
      <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{titulo}</h2>
      <div className="mt-4 space-y-2">
        {itens.slice(0, 5).map((item, indice) => (
          <div key={item.id} className="flex items-center gap-3 rounded-lg border border-transparent bg-[#F8FAFC] px-3 py-3 transition-all duration-200 hover:translate-x-1 hover:border-[#C9963A]/25 hover:bg-white hover:shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-xs font-bold text-gray-400 shadow-sm transition-colors duration-200 group-hover:text-[#C9963A]">{indice + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#1A3A6B]">{item.liderNome} &amp; {item.membro2Nome}</p>
              <p className="truncate text-[10px] text-gray-400">{item.igreja?.nome || item.distrito?.nome || 'Sem local informado'}</p>
            </div>
            <span className="text-xl font-bold" style={{ color: cor }}>{numero(item[campo])}</span>
          </div>
        ))}
        {itens.length === 0 && <p className="rounded-lg bg-[#F8FAFC] p-4 text-sm text-gray-400">Sem dados para exibir.</p>}
      </div>
    </div>
  );
}

export default function DashboardEscopo() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefixo = location.pathname.startsWith('/direto') ? '/direto' : '';
  const [resumo, setResumo] = useState(null);
  const [duplas, setDuplas] = useState([]);
  const [totalEstudos, setTotalEstudos] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/relatorios/resumo'),
      api.get('/relatorios/estudos-biblicos'),
      api.get('/duplas'),
    ])
      .then(([resumoResposta, estudosResposta, duplasResposta]) => {
        setResumo(resumoResposta.data);
        setTotalEstudos(Number(estudosResposta.data?.total || 0));
        setDuplas(Array.isArray(duplasResposta.data) ? duplasResposta.data : []);
      })
      .catch((err) => setErro(err.response?.data?.erro || 'Não foi possível carregar o dashboard do seu escopo.'))
      .finally(() => setCarregando(false));
  }, []);

  const rankings = useMemo(() => {
    const base = duplas.map((dupla) => ({
      ...dupla,
      estudos: quantidadeEstudos(dupla),
      visitas: quantidadeVisitas(dupla),
      batismos: Number(dupla.batismos || 0),
    }));
    const ordenar = (campo) => [...base].sort((a, b) => b[campo] - a[campo] || a.liderNome.localeCompare(b.liderNome));
    return { estudos: ordenar('estudos'), visitas: ordenar('visitas'), batismos: ordenar('batismos') };
  }, [duplas]);

  if (carregando) return <LoadingState mensagem="Carregando dashboard..." />;

  if (erro) {
    return <div className="m-6 rounded-xl border border-red-100 bg-red-50 p-5 text-sm font-medium text-red-700">{erro}</div>;
  }

  const escopo = escopoUsuario(usuario);
  const nomeEscopo = escopo.join(' • ') || 'Seu escopo de acesso';
  const totalDuplas = Number(resumo?.totalDuplas || 0);
  const status = [
    { nome: 'Ativas', valor: resumo?.totalAtivas, cor: '#16a34a' },
    { nome: 'Pendentes', valor: resumo?.totalPendentes, cor: '#C9963A' },
    { nome: 'Inativas', valor: resumo?.totalInativas, cor: '#64748b' },
  ];

  return (
    <div className="mx-auto max-w-7xl animate-fade-in p-4 sm:p-6 lg:p-8">
      <section className="group relative overflow-hidden rounded-2xl border border-[#1A3A6B]/10 bg-white p-5 shadow-sm transition-all duration-500 hover:border-[#C9963A]/30 hover:shadow-xl hover:shadow-[#1A3A6B]/10 sm:p-6">
        <span className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#C9963A] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-[0.08]" />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Dashboard do seu escopo</p>
            <h1 className="mt-2 text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{nomeEscopo}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {funcaoUsuario(usuario)} • {nomePessoaUsuario(usuario)} — indicadores limitados às informações permitidas para este acesso.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-2">
            <button type="button" onClick={() => navigate(`${prefixo}/relatorios`)} className="btn-primary px-4 py-2 text-sm">Abrir relatórios</button>
            <button type="button" onClick={() => navigate(`${prefixo}/duplas`)} className="btn-outline px-4 py-2 text-sm">Ver duplas</button>
          </div>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <CardIndicador titulo="Total de duplas" valor={totalDuplas} detalhe="Dentro do seu nível de acesso" cor="#1A3A6B" />
        <CardIndicador titulo="Estudos cadastrados" valor={totalEstudos} detalhe="Estudos, pontos e classes" cor="#0284c7" />
        <CardIndicador titulo="Batismos" valor={resumo?.totalBatismos} detalhe="Registrados pelas duplas do escopo" cor="#0d9488" />
        <CardIndicador titulo="Metas de contatos" valor={resumo?.totalPessoasAlcancadas} detalhe="Pessoas alcançadas no escopo" cor="#7B2D8B" />
      </section>

      <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#C9963A]/30 hover:shadow-xl hover:shadow-[#1A3A6B]/10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Situação das duplas</p>
          <div className="mt-5 space-y-5">
            {status.map((item) => {
              const percentual = totalDuplas > 0 ? Math.round((Number(item.valor || 0) / totalDuplas) * 100) : 0;
              return (
                <div key={item.nome}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[#1A3A6B]">{item.nome}</span>
                    <span className="font-bold" style={{ color: item.cor }}>{numero(item.valor)} • {percentual}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full transition-all duration-500 group-hover:brightness-110" style={{ width: `${percentual}%`, backgroundColor: item.cor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="group rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-[#C9963A]/30 hover:shadow-xl hover:shadow-[#1A3A6B]/10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Tipos de projeto</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(resumo?.porProjeto || []).map((projeto) => (
              <div key={projeto.tipoProjeto} className="rounded-lg border border-transparent bg-[#F8FAFC] p-4 transition-all duration-250 hover:-translate-y-0.5 hover:border-[#C9963A]/25 hover:bg-white hover:shadow-md">
                <p className="text-xs font-medium text-gray-500">{projetoLabel[projeto.tipoProjeto] || projeto.tipoProjeto}</p>
                <p className="mt-1 text-2xl font-bold text-[#1A3A6B]">{numero(projeto._count?.tipoProjeto)}</p>
              </div>
            ))}
            {(resumo?.porProjeto || []).length === 0 && <p className="text-sm text-gray-400">Sem projetos cadastrados neste escopo.</p>}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Destaques do seu escopo</p>
        <div className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <Ranking titulo="Mais estudos" itens={rankings.estudos} campo="estudos" cor="#0284c7" />
          <Ranking titulo="Mais visitação" itens={rankings.visitas} campo="visitas" cor="#7c3aed" />
          <Ranking titulo="Mais batismos" itens={rankings.batismos} campo="batismos" cor="#0d9488" />
        </div>
      </section>
    </div>
  );
}
