import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { FotoService } from '../foto.service';
import { PERFIS, ehAdmin, useAuth } from '../contexts/AuthContext';

const projetoLabel = {
  CASA_A_CASA: 'Visitação',
  ESTUDO_BIBLICO: 'Estudo Bíblico',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  EVANGELISMO_PUBLICO: 'Classe Bíblica',
};

const projetoIcon = {
  CASA_A_CASA: '🏠',
  ESTUDO_BIBLICO: '📖',
  PEQUENOS_GRUPOS: '👥',
  ACAO_SOCIAL: '🤲',
  EVANGELISMO_PUBLICO: '📢',
};

// Configuração visual de Classe A/B/C
const classeConfig = {
  A: { label: 'Classe A', cor: '#16a34a', bg: '#dcfce7', desc: 'Já levou ao batismo' },
  B: { label: 'Classe B', cor: '#b45309', bg: '#fef3c7', desc: 'Deu estudo, sem batismo' },
  C: { label: 'Classe C', cor: '#dc2626', bg: '#fee2e2', desc: 'Nunca deu estudo' },
};

// Configuração visual de Atividade
const atividadeConfig = {
  ATIVA:   { label: 'Estudando',  cor: '#16a34a', bg: '#dcfce7', dot: '#22c55e' },
  INATIVA: { label: 'Sem estudo', cor: '#6b7280', bg: '#f3f4f6', dot: '#9ca3af' },
};

// Badge de status da dupla (ativa/pendente/inativa)
const StatusBadge = ({ status }) => {
  const map = { ATIVA: 'badge-ativa', PENDENTE: 'badge-pendente', INATIVA: 'badge-inativa' };
  const label = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };
  return <span className={map[status] || 'badge-inativa'}>{label[status] || status}</span>;
};

const medalhaConfig = {
  ouro:   { emoji: '🥇', label: 'Ouro',   cor: '#C9963A' },
  prata:  { emoji: '🥈', label: 'Prata',  cor: '#6b7280' },
  bronze: { emoji: '🥉', label: 'Bronze', cor: '#92400e' },
  semAtividade: { emoji: '', label: 'Dupla sem estudo/visita', cor: '#475569' },
};

const medalhaOrder = { ouro: 0, prata: 1, bronze: 2, semAtividade: 3 };
const getEstudosCount = (dupla) => dupla?._count?.estudosBiblicos ?? dupla?.estudosBiblicos?.length ?? 0;
const getVisitacoesCount = (dupla) => dupla?._count?.acompanhamentos ?? dupla?.acompanhamentos?.length ?? 0;
const normalizarStatus = (valor) => String(valor || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toUpperCase();
const temEstudoBiblicoAtivo = (dupla) => normalizarStatus(dupla?.statusEstudoBiblico) === 'ATIVO';
const temEstudoBiblicoAtivoOuFinalizado = (dupla) => (
  ['ATIVO', 'FINALIZADO', 'CONCLUIDO'].includes(normalizarStatus(dupla?.statusEstudoBiblico))
);
// Calcula a medalha de gamificação
function getMedalha(dupla) {
  const estudos = getEstudosCount(dupla);
  const temEstudo = estudos > 0;
  const estudoAtivo = temEstudoBiblicoAtivo(dupla) && temEstudo;
  const estudoAtivoOuFinalizado = temEstudoBiblicoAtivoOuFinalizado(dupla) && temEstudo;
  const temBatismo = (dupla.batismos || 0) > 0;
  const temVisitacao = getVisitacoesCount(dupla) >= 1;
  const temVisitacaoOuEstudo = temVisitacao || temEstudo;
  if (estudoAtivoOuFinalizado && temBatismo && temVisitacao) return 'ouro';
  if (estudoAtivo && !temBatismo && temVisitacaoOuEstudo) return 'prata';
  if (!estudoAtivo && temVisitacao) return 'bronze';
  return 'semAtividade';
}
const temEstudoNaoRegistrado = (dupla) => (
  (dupla?.estudoAtualEmAndamento === true || dupla?.atividadeDupla === 'ATIVA' || dupla?.statusEstudoBiblico === 'ATIVO')
  && getEstudosCount(dupla) === 0
);
const medalhaRegras = {
  ouro: 'Ouro: estudo bíblico ativo ou finalizado, pelo menos 1 batismo e visitação registrada.',
  prata: 'Prata: estudo bíblico ativo com 1 ou mais estudos cadastrados, visitação registrada ou estudo cadastrado, e ainda sem batismo registrado.',
  bronze: 'Bronze: dupla que não tem estudo bíblico ativo, mas tem visitação registrada.',
  semAtividade: 'Dupla sem estudo bíblico cadastrado e sem visitação registrada.',
};

const UsersIcon = ({ className = 'w-5 h-5 text-white' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" strokeWidth={2} />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const BookOpenIcon = ({ className = 'w-5 h-5 text-white' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7v14" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5.5A2.5 2.5 0 015.5 3H12v18H5.5A2.5 2.5 0 013 18.5v-13zM12 3h6.5A2.5 2.5 0 0121 5.5v13a2.5 2.5 0 01-2.5 2.5H12V3z" />
  </svg>
);

const MegaphoneIcon = ({ className = 'w-5 h-5 text-white' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13V8a2 2 0 012-2h2l9-3v16l-9-3H6a2 2 0 01-2-2v-1z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l1.5 4H12l-1.5-4M20 8.5a4 4 0 010 5" />
  </svg>
);

const DropletIcon = ({ className = 'w-5 h-5 text-white' }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3.5S5.5 10.4 5.5 15a6.5 6.5 0 0013 0C18.5 10.4 12 3.5 12 3.5z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 16.5A3.2 3.2 0 0012 19" />
  </svg>
);
const classeRegras = {
  A: 'Classe A: levou pessoa ao batismo e possui pelo menos 1 estudo cadastrado.',
  B: 'Classe B: já deu estudo bíblico, mas ainda não registrou batismo.',
  C: 'Classe C: informou que ainda não deu estudo bíblico.',
};
const temEstudoCadastrado = (dupla) => getEstudosCount(dupla) > 0;
const pertenceClasseFiltro = (dupla, classe) => {
  if (!classe) return true;
  if (classe === 'A') return dupla.classificacaoDupla === 'A' && temEstudoCadastrado(dupla);
  return dupla.classificacaoDupla === classe;
};

const resolverFotosDaDupla = async (dupla) => {
  const [fotoLiderPreview, fotoMembro2Preview] = await Promise.all([
    FotoService.resolverFotoParaPreview(dupla.fotoLider).catch(() => ''),
    FotoService.resolverFotoParaPreview(dupla.fotoMembro2).catch(() => ''),
  ]);
  return { ...dupla, fotoLiderPreview, fotoMembro2Preview };
};

const formatarData = (valor) => {
  if (!valor) return '—';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('pt-BR');
};

const sexoLabel = (valor) => {
  if (valor === 'M' || valor === 'MASCULINO') return 'Masculino';
  if (valor === 'F' || valor === 'FEMININO') return 'Feminino';
  return '—';
};

const InfoAdmin = ({ label, valor }) => (
  <div>
    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
    <p className="text-xs text-gray-700 break-words">{valor ?? '—'}</p>
  </div>
);

// Foto de pessoa com tamanho fixo (aplicado externamente)
const FotoPessoa = ({ src, nome, className, fallbackGradient = 'from-[#1A3A6B] to-[#2a5298]' }) => {
  const inicial = (nome || '?').charAt(0).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={nome || 'Foto'}
        className={`${className} object-cover bg-gray-100`}
      />
    );
  }
  return (
    <div className={`${className} bg-gradient-to-br ${fallbackGradient} flex items-center justify-center text-white font-bold`}>
      {inicial}
    </div>
  );
};

// Badge de acompanhamento do coordenador
const BadgeAcompanhamento = ({ data }) => {
  if (!data) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-400 border border-gray-200">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Sem visita
      </span>
    );
  }
  const dataFormatada = new Date(data).toLocaleDateString('pt-BR');
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Visitada {dataFormatada}
    </span>
  );
};

export default function Duplas() {
  const { distritoId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classeParam = searchParams.get('classe');
  const statusParam = searchParams.get('status');
  const atividadeParam = searchParams.get('atividade');
  const estudoAtivoParam = searchParams.get('estudoAtivo');
  const igrejaIdParam = searchParams.get('igrejaId');
  const regiaoIdParam = searchParams.get('regiaoId');
  const tipoProjetoParam = searchParams.get('tipoProjeto');
  const minBatismosParam = Number(searchParams.get('minBatismos') || 0);
  const minPessoasParam = Number(searchParams.get('minPessoas') || 0);
  const filtroEspecialParam = searchParams.get('filtro');
  const { usuario } = useAuth();
  const isPastorDistrital = usuario?.perfil === PERFIS.PASTOR_DISTRITAL;
  const isAdmin = ehAdmin(usuario);
  const [duplas, setDuplas] = useState([]);
  const [distrito, setDistrito] = useState(null);
  const [fotoPastorPreview, setFotoPastorPreview] = useState('');
  const [filtro, setFiltro] = useState('');
  const [filtroClasse, setFiltroClasse] = useState(() => {
    return ['A', 'B', 'C'].includes(classeParam) ? classeParam : '';
  });
  const [filtroAtividade, setFiltroAtividade] = useState('');
  const [filtroEspecial, setFiltroEspecial] = useState(() => {
    return ['semEstudos', 'comVisitacoes', 'comEstudo', 'estudoNaoRegistrado'].includes(filtroEspecialParam) ? filtroEspecialParam : '';
  });
  const [busca, setBusca] = useState('');
  const [buscaFocada, setBuscaFocada] = useState(false);
  const [filtroIgrejaId, setFiltroIgrejaId] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get('/duplas', { params: { distritoId } }),
      distritoId ? api.get(`/distritos/${distritoId}`) : Promise.resolve({ data: null }),
    ]).then(async ([d, dist]) => {
      if (!ativo) return;
      const lista = Array.isArray(d.data) ? d.data : [];
      const listaComFotos = await Promise.all(lista.map(resolverFotosDaDupla));
      const fotoPastor = await FotoService.resolverFotoParaPreview(dist.data?.fotoPastor).catch(() => '');
      setDuplas(listaComFotos);
      setDistrito(dist.data);
      if (ativo) setFotoPastorPreview(fotoPastor);
    }).finally(() => { setCarregando(false); });
    return () => { ativo = false; };
  }, [distritoId]);

  useEffect(() => {
    setFiltroClasse(['A', 'B', 'C'].includes(classeParam) ? classeParam : '');
  }, [classeParam]);

  useEffect(() => {
    setFiltro(['ATIVA', 'PENDENTE', 'INATIVA', 'ouro', 'prata', 'bronze', 'semAtividade'].includes(statusParam) ? statusParam : '');
  }, [statusParam]);

  useEffect(() => {
    setFiltroAtividade(['ATIVA', 'INATIVA'].includes(atividadeParam) ? atividadeParam : '');
  }, [atividadeParam]);

  useEffect(() => {
    setFiltroEspecial(['semEstudos', 'comVisitacoes', 'comEstudo', 'estudoNaoRegistrado'].includes(filtroEspecialParam) ? filtroEspecialParam : '');
  }, [filtroEspecialParam]);

  const duplasComMedalha = useMemo(() =>
    [...duplas]
      .map(d => ({ ...d, _medalha: getMedalha(d) }))
      .sort((a, b) => medalhaOrder[a._medalha] - medalhaOrder[b._medalha]),
    [duplas]
  );

  const duplasFiltradas = useMemo(() => {
    const isMedalha = ['ouro', 'prata', 'bronze', 'semAtividade'].includes(filtro);
    return duplasComMedalha.filter((d) => {
      const matchFiltro = !filtro ? true
        : isMedalha ? d._medalha === filtro
        : d.status === filtro;
      const matchClasse = pertenceClasseFiltro(d, filtroClasse);
      const matchAtividade = !filtroAtividade || d.atividadeDupla === filtroAtividade;
      const matchEstudoAtivo = estudoAtivoParam !== '1' || d.estudoAtualEmAndamento === true || d.statusEstudoBiblico === 'ATIVO';
      const matchBusca = !busca ||
        (d.liderNome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (d.membro2Nome || '').toLowerCase().includes(busca.toLowerCase()) ||
        (d.bairro || '').toLowerCase().includes(busca.toLowerCase());
      const matchIgreja = !filtroIgrejaId || (d.igreja?.id === filtroIgrejaId || d.igrejaId === filtroIgrejaId);
      const matchIgrejaQuery = !igrejaIdParam || String(d.igreja?.id || d.igrejaId || '') === igrejaIdParam;
      const matchRegiao = !regiaoIdParam || String(d.distrito?.regiao?.id || '') === regiaoIdParam;
      const matchTipoProjeto = !tipoProjetoParam || d.tipoProjeto === tipoProjetoParam;
      const matchBatismos = !minBatismosParam || (d.batismos || 0) >= minBatismosParam;
      const matchPessoas = !minPessoasParam || getVisitacoesCount(d) >= minPessoasParam;
      const matchEspecial = !filtroEspecial
        || (filtroEspecial === 'semEstudos' && getEstudosCount(d) === 0)
        || (filtroEspecial === 'estudoNaoRegistrado' && temEstudoNaoRegistrado(d))
        || (filtroEspecial === 'comVisitacoes' && getVisitacoesCount(d) >= 1)
        || (filtroEspecial === 'comEstudo' && getEstudosCount(d) >= 1);
      return matchFiltro && matchClasse && matchAtividade && matchEstudoAtivo && matchBusca && matchIgreja && matchIgrejaQuery && matchRegiao && matchTipoProjeto && matchBatismos && matchPessoas && matchEspecial;
    });
  }, [duplasComMedalha, filtro, filtroClasse, filtroAtividade, estudoAtivoParam, busca, filtroIgrejaId, igrejaIdParam, regiaoIdParam, tipoProjetoParam, minBatismosParam, minPessoasParam, filtroEspecial]);

  const contagemMedalha = useMemo(() => {
    const c = { ouro: 0, prata: 0, bronze: 0, semAtividade: 0 };
    duplasComMedalha.forEach(d => { c[d._medalha] = (c[d._medalha] || 0) + 1; });
    return c;
  }, [duplasComMedalha]);

  const duplasPorIgreja = useMemo(() => {
    const contagem = {};
    duplas.forEach((dupla) => {
      if (dupla.igreja?.id) {
        contagem[dupla.igreja.id] = (contagem[dupla.igreja.id] || 0) + 1;
      } else if (dupla.igrejaId) {
        contagem[dupla.igrejaId] = (contagem[dupla.igrejaId] || 0) + 1;
      }
    });
    return contagem;
  }, [duplas]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">

      {/* Breadcrumb */}
      {distrito && (
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 mb-6 flex-wrap animate-fade-in-down">
          <button onClick={() => navigate(isPastorDistrital ? '/distritos' : '/regioes')} className="hover:text-[#1A3A6B] transition-colors">
            {isPastorDistrital ? 'Distritos' : 'Associação'}
          </button>
          <span className="text-gray-300">/</span>
          {!isPastorDistrital && (
            <>
              <button onClick={() => navigate(`/regioes/${distrito.regiao?.id}/distritos`)} className="hover:text-[#1A3A6B] transition-colors">
                {distrito.regiao?.nome}
              </button>
              <span className="text-gray-300">/</span>
            </>
          )}
          <span className="text-[#1A3A6B] font-medium">{distrito.nome}</span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4 animate-fade-in-down" style={{ animationDelay: '100ms' }}>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">
              {distrito ? `Distrito ${distrito.nome}` : 'Duplas'}
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Duplas Missionárias
          </h1>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">{duplasFiltradas.length} dupla(s) encontrada(s)</p>
        </div>
        <button
          onClick={() => navigate(`/duplas/nova${distritoId ? `?distritoId=${distritoId}` : ''}`)}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Dupla
        </button>
      </div>

      {distrito && (
        <div className="mb-6 animate-fade-in-down" style={{ animationDelay: '125ms' }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-bold text-[#1A3A6B] uppercase tracking-widest">Igrejas do Distrito</h2>
            <span className="text-xs text-gray-400">{(distrito.igrejas || []).length} igreja(s)</span>
          </div>
          {(distrito.igrejas || []).length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-100 p-5 text-center text-sm text-gray-400">
              Nenhuma igreja cadastrada neste distrito.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {distrito.igrejas.map((igreja) => {
                const isSelected = filtroIgrejaId === igreja.id;
                return (
                <div 
                  key={igreja.id} 
                  onClick={() => setFiltroIgrejaId(isSelected ? null : igreja.id)}
                  className={`bg-white rounded-lg border ${isSelected ? 'border-[#1A3A6B] ring-1 ring-[#1A3A6B]' : 'border-gray-100 hover:border-[#1A3A6B]/20'} shadow-sm p-4 transition-all cursor-pointer transform ${isSelected ? 'scale-[1.02]' : 'hover:-translate-y-0.5'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M12 3v8m0 0l-3-3m3 3l3-3" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[#1A3A6B] text-sm truncate" title={igreja.nome}>{igreja.nome}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {(igreja.membros || 0).toLocaleString('pt-BR')} membros
                        <span className="mx-1.5">•</span>
                        {duplasPorIgreja[igreja.id] || 0} duplas
                      </p>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 bg-white rounded-lg border border-gray-100 shadow-sm p-4 w-full sm:max-w-md">
            <div className="flex items-center gap-4">
              <FotoPessoa
                src={fotoPastorPreview}
                nome={distrito.nomePastor}
                className="w-16 h-16 rounded-xl shadow-sm"
                fallbackGradient="from-[#1A3A6B] to-[#2a5298]"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#C9963A]">Pastor responsável</p>
                <h3 className="text-lg font-bold text-[#1A3A6B] truncate" style={{ fontFamily: 'Georgia, serif' }}>
                  {distrito.nomePastor || 'Nao informado'}
                </h3>
                <p className="text-sm text-gray-400 truncate">{distrito.cargoPastor || 'Pastor Distrital'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8 animate-fade-in-down" style={{ animationDelay: '150ms' }}>
        {[
          { label: 'Duplas', valor: duplas.length, cor: '#1A3A6B', icon: <UsersIcon />, gradient: 'from-[#1A3A6B] to-[#2a5298]' },
          ...(distrito ? [
            { label: 'Igrejas', valor: distrito.igrejas?.length || 0, cor: '#16a34a', icon: '⛪', gradient: 'from-[#16a34a] to-[#22c55e]' },
            { label: 'Membros', valor: (distrito.membros || 0).toLocaleString('pt-BR'), cor: '#7B2D8B', icon: '👨‍👩‍👧‍👦', gradient: 'from-[#7B2D8B] to-[#9333ea]' },
          ] : []),
          { label: 'Estudos', valor: duplas.filter(d => d.statusEstudoBiblico === 'ATIVO').length, cor: '#0284c7', icon: <BookOpenIcon />, gradient: 'from-[#0284c7] to-[#0ea5e9]' },
          { label: 'Classe Bíblica', valor: duplas.filter(d => d.statusEvangelismo === 'ATIVO').length, cor: '#ea580c', icon: <MegaphoneIcon />, gradient: 'from-[#ea580c] to-[#f97316]' },
          { label: 'Batismos', valor: duplas.reduce((acc, d) => acc + (d.batismos || 0), 0), cor: '#0d9488', icon: <DropletIcon />, gradient: 'from-[#0d9488] to-[#14b8a6]' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl p-3 sm:p-4 border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center group hover:-translate-y-1 transition-all duration-300">
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl shadow-md mb-2 group-hover:scale-110 transition-transform`}>
              {item.icon}
            </div>
            <p className="text-xl font-bold" style={{ color: item.cor }}>{item.valor}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium uppercase tracking-wider">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Chips de filtro — Medalha + Classe + Atividade */}
      <div className="flex flex-wrap gap-2 mb-3 animate-fade-in-down" style={{ animationDelay: '170ms' }}>
        {/* Chip "Todas" */}
        <button
          type="button"
          onClick={() => { setFiltro(''); setFiltroClasse(''); setFiltroAtividade(''); setFiltroEspecial(''); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
            !filtro && !filtroClasse && !filtroAtividade && !filtroEspecial
              ? 'bg-[#1A3A6B] text-white border-[#1A3A6B] shadow-md'
              : 'bg-white text-gray-500 border-gray-200 hover:border-[#1A3A6B]/40'
          }`}
        >
          Todas
          <span className="rounded-full px-1.5 py-px text-[10px] font-bold"
            style={{ backgroundColor: (!filtro && !filtroClasse && !filtroAtividade && !filtroEspecial) ? 'rgba(255,255,255,0.25)' : '#f3f4f6', color: (!filtro && !filtroClasse && !filtroAtividade && !filtroEspecial) ? 'white' : '#6b7280' }}>
            {duplas.length}
          </span>
        </button>

        {/* Medalhas */}
        {(['ouro', 'prata', 'bronze', 'semAtividade']).map((m) => {
          const cfg = medalhaConfig[m];
          const ativo = filtro === m;
          return (
            <button key={m} type="button"
              onClick={() => setFiltro(ativo ? '' : m)}
              title={medalhaRegras[m]}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
              style={ativo ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                : { backgroundColor: cfg.cor + '18', borderColor: cfg.cor + '55', color: cfg.cor }}
            >
              {cfg.emoji && `${cfg.emoji} `}{cfg.label}
              <span className="rounded-full px-1.5 py-px text-[10px] font-bold"
                style={{ backgroundColor: ativo ? 'rgba(255,255,255,0.25)' : cfg.cor + '25', color: ativo ? 'white' : cfg.cor }}>
                {contagemMedalha[m] || 0}
              </span>
            </button>
          );
        })}

        {/* Separador */}
        <div className="h-5 w-px bg-gray-200 self-center mx-0.5" />

        {/* Classe A/B/C */}
        {['A', 'B', 'C'].map((cls) => {
          const cfg = classeConfig[cls];
          const ativo = filtroClasse === cls;
          return (
            <button key={cls} type="button"
              onClick={() => setFiltroClasse(ativo ? '' : cls)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200"
              style={ativo ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                : { backgroundColor: cfg.bg, borderColor: cfg.cor + '60', color: cfg.cor }}
              title={classeRegras[cls]}
            >
              Classe {cls}
            </button>
          );
        })}

        {[
          {
            key: 'estudoNaoRegistrado',
            label: 'Dupla com estudo sem cadastro',
            total: duplas.filter(temEstudoNaoRegistrado).length,
            title: 'Duplas que responderam Sim em Estudo em andamento, mas ainda nao cadastraram o estudo biblico.',
            cor: '#b45309',
            bg: '#fef3c7',
          },
          {
            key: 'semEstudos',
            label: 'Sem atividade',
            total: duplas.filter((dupla) => dupla.estudoAtualEmAndamento !== true && getEstudosCount(dupla) === 0).length,
            title: 'Duplas que responderam Nao em Estudo em andamento e nao possuem estudo biblico cadastrado.',
            cor: '#64748b',
            bg: '#f1f5f9',
          },
          {
            key: 'comVisitacoes',
            label: 'Com visitação',
            total: duplas.filter((dupla) => getVisitacoesCount(dupla) >= 1).length,
            title: 'Duplas com visitação: duplas com Visitações 1 ou mais. Visitações 0 não entram.',
            cor: '#7c3aed',
            bg: '#ede9fe',
          },
          {
            key: 'comEstudo',
            label: 'Com Estudo',
            total: duplas.filter((dupla) => getEstudosCount(dupla) >= 1).length,
            title: 'Duplas com estudo: duplas com 1 ou mais estudos biblicos cadastrados.',
            cor: '#0284c7',
            bg: '#e0f2fe',
          },
        ].map((item) => {
          const ativo = filtroEspecial === item.key;
          return (
            <button key={item.key} type="button"
              onClick={() => setFiltroEspecial(ativo ? '' : item.key)}
              title={item.title}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
              style={ativo ? { backgroundColor: item.cor, borderColor: item.cor, color: 'white' }
                : { backgroundColor: item.bg, borderColor: item.cor + '60', color: item.cor }}
            >
              {item.label}
              <span className="rounded-full px-1.5 py-px text-[10px] font-bold"
                style={{ backgroundColor: ativo ? 'rgba(255,255,255,0.25)' : item.cor + '25', color: ativo ? 'white' : item.cor }}>
                {item.total}
              </span>
            </button>
          );
        })}

        {/* Separador */}
        <div className="h-5 w-px bg-gray-200 self-center mx-0.5" />

        {/* Ativa / Sem estudo */}
        {['ATIVA', 'INATIVA'].map((atv) => {
          const cfg = atividadeConfig[atv];
          const ativo = filtroAtividade === atv;
          return (
            <button key={atv} type="button"
              onClick={() => setFiltroAtividade(ativo ? '' : atv)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200"
              style={ativo ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                : { backgroundColor: cfg.bg, borderColor: cfg.cor + '60', color: cfg.cor }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ativo ? 'rgba(255,255,255,0.8)' : cfg.dot }} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Barra de busca e filtro de status */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6 animate-fade-in-down" style={{ animationDelay: '200ms' }}>
        <div className={`relative transition-all duration-300 ${buscaFocada ? 'flex-1' : 'flex-1 sm:max-w-xs'}`}>
          <svg className={`absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${buscaFocada ? 'text-[#1A3A6B]' : 'text-gray-400'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={buscaFocada ? 'Digite nome, bairro ou parceiro...' : 'Buscar por nome ou bairro...'}
            className={`input-field pl-12 transition-all duration-300 ${buscaFocada ? 'ring-2 ring-[#1A3A6B]/30 border-[#1A3A6B]/50' : ''}`}
            style={{ paddingLeft: '3.25rem' }}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setBuscaFocada(true)}
            onBlur={() => setBuscaFocada(false)}
          />
          {busca && (
            <button type="button" onClick={() => setBusca('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors">
              <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <div className="transition-all duration-300 overflow-hidden"
          style={{ maxWidth: buscaFocada ? '0px' : '100%', opacity: buscaFocada ? 0 : 1, pointerEvents: buscaFocada ? 'none' : 'auto' }}>
          <select className="input-field sm:w-auto w-full" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos os status</option>
            <optgroup label="Status">
              <option value="ATIVA">Ativa</option>
              <option value="INATIVA">Inativa</option>
            </optgroup>
            <optgroup label="Medalha">
              <option value="ouro">Ouro</option>
              <option value="prata">Prata</option>
              <option value="bronze">Bronze</option>
              <option value="semAtividade">Dupla sem estudo/visita</option>
            </optgroup>
          </select>
        </div>
      </div>

      {/* Lista de duplas */}
      <div className="space-y-3 stagger-children">
        {duplasFiltradas.map((dupla) => {
          const cfg = medalhaConfig[dupla._medalha];
          const clsCfg = dupla.classificacaoDupla ? classeConfig[dupla.classificacaoDupla] : null;
          const atvCfg = dupla.atividadeDupla ? atividadeConfig[dupla.atividadeDupla] : null;
          // Cor da borda esquerda: usa a cor da classe se definida, senão a da medalha
          const corBorda = clsCfg?.cor || cfg.cor;

          return (
            <button
              key={dupla.id}
              onClick={() => navigate(`/duplas/${dupla.id}`)}
              className="w-full text-left bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 p-4 group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
              style={{ borderLeftColor: corBorda }}
            >
              {/* Linha principal */}
              <div className="flex items-center gap-3">

                {/* === MEMBRO 1 === foto + nome (mesmo tamanho que membro 2) */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FotoPessoa
                    src={dupla.fotoLiderPreview}
                    nome={dupla.liderNome}
                    className="w-10 h-10 rounded-full shadow-sm ring-2 ring-white group-hover:ring-[#1A3A6B]/20 transition-all flex-shrink-0"
                    fallbackGradient="from-[#1A3A6B] to-[#2a5298]"
                  />
                  <p className="font-semibold text-[#1A3A6B] text-sm group-hover:text-[#C9963A] transition-colors duration-200 truncate">
                    {dupla.liderNome}
                  </p>
                </div>

                {/* Divisor central */}
                <div className="flex-shrink-0 text-gray-300 font-bold text-lg select-none">+</div>

                {/* === MEMBRO 2 === foto + nome (mesmo tamanho que membro 1) */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <FotoPessoa
                    src={dupla.fotoMembro2Preview}
                    nome={dupla.membro2Nome}
                    className="w-10 h-10 rounded-full shadow-sm ring-2 ring-white group-hover:ring-[#1A3A6B]/20 transition-all flex-shrink-0"
                    fallbackGradient="from-[#C9963A] to-[#e5b05a]"
                  />
                  <p className="font-semibold text-[#1A3A6B] text-sm group-hover:text-[#C9963A] transition-colors duration-200 truncate">
                    {dupla.membro2Nome}
                  </p>
                </div>

                {/* Badges de classe + atividade + medalha + estudos + seta */}
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0 ml-2">
                  {clsCfg && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border"
                      style={{ backgroundColor: clsCfg.bg, color: clsCfg.cor, borderColor: clsCfg.cor + '40' }}
                      title={classeRegras[dupla.classificacaoDupla]}>
                      {dupla.classificacaoDupla}
                    </span>
                  )}
                  {atvCfg && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
                      style={{ backgroundColor: atvCfg.bg, color: atvCfg.cor, borderColor: atvCfg.cor + '40' }}>
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: atvCfg.dot }} />
                      {atvCfg.label}
                    </span>
                  )}
                  {getEstudosCount(dupla) > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-[#16a34a]/10 text-[#16a34a] border-[#16a34a]/20">
                      📖 {dupla._count?.estudosBiblicos ?? 0} {((dupla._count?.estudosBiblicos ?? 0) === 1) ? 'estudo bíblico' : 'estudos bíblicos'}
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${temEstudoNaoRegistrado(dupla) ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-red-100 text-red-600 border-red-200'}`}>
                      {temEstudoNaoRegistrado(dupla) ? 'Tem estudo, mas não registrou' : 'Sem estudo bíblico'}
                    </span>
                  )}
                  <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: cfg.cor + '18', color: cfg.cor }}
                    title={medalhaRegras[dupla._medalha]}>
                    {cfg.emoji && `${cfg.emoji} `}{cfg.label}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-[#1A3A6B] transition-all duration-200">
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>

                {/* Seta mobile */}
                <div className="sm:hidden w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-[#1A3A6B] transition-all duration-200 flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Rodapé do card: status + bairro + projeto + acompanhamento */}
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <StatusBadge status={dupla.status} />
                {dupla.bairro && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {dupla.bairro}
                  </span>
                )}
                {dupla.tipoProjeto && (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    {projetoIcon[dupla.tipoProjeto]} {projetoLabel[dupla.tipoProjeto]}
                  </span>
                )}
                <BadgeAcompanhamento data={dupla.ultimoAcompanhamento} />
              </div>

              {isAdmin && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#1A3A6B]">Membro 1</p>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoAdmin label="Nome" valor={dupla.liderNome} />
                        <InfoAdmin label="WhatsApp" valor={dupla.liderTelefone} />
                        <InfoAdmin label="E-mail" valor={dupla.liderEmail} />
                        <InfoAdmin label="Sexo" valor={sexoLabel(dupla.liderSexo)} />
                        <InfoAdmin label="Nascimento" valor={formatarData(dupla.liderDataNascimento)} />
                        <InfoAdmin label="Batismo" valor={formatarData(dupla.liderDataBatismo)} />
                        <InfoAdmin label="Igreja" valor={dupla.liderIgreja || dupla.igreja?.nome} />
                        <InfoAdmin label="Distrito" valor={dupla.liderDistrito || dupla.distrito?.nome} />
                        <div className="col-span-2">
                          <InfoAdmin label="Endereço" valor={dupla.liderEndereco} />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#1A3A6B]">Membro 2</p>
                      <div className="grid grid-cols-2 gap-2">
                        <InfoAdmin label="Nome" valor={dupla.membro2Nome} />
                        <InfoAdmin label="WhatsApp" valor={dupla.membro2Telefone} />
                        <InfoAdmin label="E-mail" valor={dupla.membro2Email} />
                        <InfoAdmin label="Sexo" valor={sexoLabel(dupla.membro2Sexo)} />
                        <InfoAdmin label="Nascimento" valor={formatarData(dupla.membro2DataNascimento)} />
                        <InfoAdmin label="Batismo" valor={formatarData(dupla.membro2DataBatismo)} />
                        <InfoAdmin label="Igreja" valor={dupla.membro2Igreja || dupla.igreja?.nome} />
                        <InfoAdmin label="Distrito" valor={dupla.membro2Distrito || dupla.distrito?.nome} />
                        <div className="col-span-2">
                          <InfoAdmin label="Endereço" valor={dupla.membro2Endereco} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 rounded-lg bg-[#1A3A6B]/5 p-3">
                    <InfoAdmin label="Região" valor={dupla.distrito?.regiao?.nome || dupla.regiaoNome} />
                    <InfoAdmin label="Distrito" valor={dupla.distrito?.nome} />
                    <InfoAdmin label="Igreja" valor={dupla.igreja?.nome} />
                    <InfoAdmin label="Projeto" valor={projetoLabel[dupla.tipoProjeto] || dupla.tipoProjeto} />
                    <InfoAdmin label="Status" valor={dupla.status} />
                    <InfoAdmin label="Visitações" valor={getVisitacoesCount(dupla)} />
                    <InfoAdmin label="Batismos alcançados" valor={dupla.batismos} />
                    <InfoAdmin label="Início" valor={formatarData(dupla.dataInicio)} />
                    <div className="col-span-2 md:col-span-4">
                      <InfoAdmin label="Observações" valor={dupla.observacoes} />
                    </div>
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {duplasFiltradas.length === 0 && (
        <div className="text-center py-20 text-gray-400 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">👥</div>
          <p className="font-medium text-lg">Nenhuma dupla encontrada.</p>
          <button onClick={() => navigate('/duplas/nova')} className="btn-primary mt-6 text-sm px-5 py-2.5">
            Cadastrar primeira dupla
          </button>
        </div>
      )}
    </div>
  );
}
