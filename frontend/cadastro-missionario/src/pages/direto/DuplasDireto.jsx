import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../lib/api';
import { FotoService } from '../../foto.service';
import { ehAdmin, useAuth } from '../../contexts/AuthContext';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../../lib/seriesEstudo';

// ── Lógica de Gamificação (gameDuplas.md) ──────────────────────────────
function getMedalha(dupla) {
  const estudoAtivo = dupla.statusEstudoBiblico === 'ATIVO'
    || ((dupla?._count?.estudosBiblicos ?? dupla?.estudosBiblicos?.length ?? 0) > 0);
  const temBatismo  = (dupla.batismos || 0) > 0;
  const temPessoas  = (dupla.pessoasAlcancadas || 0) > 0;
  if (estudoAtivo && temBatismo && temPessoas) return 'ouro';
  if (estudoAtivo && !temBatismo && temPessoas) return 'prata';
  return 'bronze';
}

const medalhaConfig = {
  ouro:   { emoji: '🥇', label: 'Ouro',   cor: '#C9963A', bg: '#C9963A18' },
  prata:  { emoji: '🥈', label: 'Prata',  cor: '#6b7280', bg: '#6b728018' },
  bronze: { emoji: '🥉', label: 'Bronze', cor: '#92400e', bg: '#92400e15' },
};

const medalhaOrder = { ouro: 0, prata: 1, bronze: 2 };
const medalhaRegras = {
  ouro: 'Ouro: estudo bíblico ativo, pelo menos 1 batismo e pessoas alcançadas acima de 0.',
  prata: 'Prata: estudo bíblico ativo, pessoas alcançadas acima de 0 e ainda sem batismo registrado.',
  bronze: 'Bronze: dupla que ainda não atingiu todos os critérios de Ouro ou Prata.',
};

// Link clicável do WhatsApp Web
const WhatsAppLink = ({ numero }) => {
  if (!numero) return null;
  const limpo = numero.replace(/\D/g, '');
  return (
    <a
      href={`https://web.whatsapp.com/send?phone=55${limpo}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-[#25D366] font-medium hover:underline"
      title="Abrir no WhatsApp Web"
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </svg>
      {numero}
    </a>
  );
};

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

const statusColors = { ATIVA: '#16a34a', PENDENTE: '#C9963A', INATIVA: '#9ca3af' };
const statusLabels = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };
const statusAcompanhamentoLabels = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDO: 'Concluído',
  PENDENTE: 'Pendente',
};

const classeConfig = {
  A: { label: 'Classe A', cor: '#047857', bg: '#d1fae5' },
  B: { label: 'Classe B', cor: '#b45309', bg: '#fef3c7' },
  C: { label: 'Classe C', cor: '#b91c1c', bg: '#fee2e2' },
};
const classeRegras = {
  A: 'Classe A: levou pessoa ao batismo e possui pelo menos 1 estudo cadastrado.',
  B: 'Classe B: já deu estudo bíblico, mas ainda não registrou batismo.',
  C: 'Classe C: informou que ainda não deu estudo bíblico.',
};

const atividadeConfig = {
  ATIVA: { label: 'Ativa', cor: '#2563eb', bg: '#dbeafe' },
  INATIVA: { label: 'Sem atividade', cor: '#6b7280', bg: '#f3f4f6' },
};

const indicadorConfig = {
  estudos: { label: 'Estudos', cor: '#0f766e', bg: '#ccfbf1', border: '#99f6e4' },
  visitacoes: { label: 'Visitacoes', cor: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
};

const getEstudosCount = (dupla) => dupla?._count?.estudosBiblicos ?? dupla?.estudosBiblicos?.length ?? 0;
const getVisitacoesCount = (dupla) => dupla?._count?.acompanhamentos ?? dupla?.acompanhamentos?.length ?? 0;
const temEstudoCadastrado = (dupla) => getEstudosCount(dupla) > 0;
const temEstudoNaoRegistrado = (dupla) => (
  (dupla?.estudoAtualEmAndamento === true || dupla?.atividadeDupla === 'ATIVA' || dupla?.statusEstudoBiblico === 'ATIVO')
  && !temEstudoCadastrado(dupla)
);
const getClassificacaoDuplaDisplay = (dupla) => {
  if (dupla?.levouPessoaBatismo === true) return 'A';
  if (temEstudoCadastrado(dupla) || dupla?.jaDeuEstudoBiblico === true) return 'B';
  return dupla?.classificacaoDupla || null;
};
const getAtividadeDuplaDisplay = (dupla) => {
  if (
    dupla?.atividadeDupla === 'ATIVA'
    || dupla?.statusEstudoBiblico === 'ATIVO'
    || (dupla?.status === 'ATIVA' && temEstudoCadastrado(dupla))
  ) {
    return 'ATIVA';
  }
  return dupla?.atividadeDupla || null;
};
const pertenceClasseFiltro = (dupla, classe) => {
  if (!classe) return true;
  return getClassificacaoDuplaDisplay(dupla) === classe;
};

const formatarData = (valor) => {
  if (!valor) return null;
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString('pt-BR');
};

const tipoEstudoLabels = {
  UNICO: 'Estudo Bíblico',
  PONTO: 'Ponto de Estudo',
  CLASSE: 'Classe Bíblica',
};

const tipoEstudoCadastroPath = {
  UNICO: '/direto/cadastro/estudos-biblicos',
  PONTO: '/direto/cadastro/ponto-estudo',
  CLASSE: '/direto/cadastro/classe-biblica',
};

const tipoEstudoRelatorioPath = {
  UNICO: '/direto/relatorios/estudos-biblicos',
  PONTO: '/direto/relatorios/pontos-estudo',
  CLASSE: '/direto/relatorios/classes-biblicas/registros',
};

const totalLicoesSerie = (serieId) => SERIES_ESTUDO.find((serie) => serie.id === serieId)?.licoes?.length || 0;

const progressoEstudo = (estudo) => {
  const total = totalLicoesSerie(estudo?.serie);
  const atual = Number(estudo?.licaoAtual || 0);
  if (!total || !atual) return 0;
  return Math.min(100, Math.round((atual / total) * 100));
};

const editarEstudoPath = (estudo) => {
  const base = tipoEstudoCadastroPath[estudo?.tipoEstudo || 'UNICO'] || tipoEstudoCadastroPath.UNICO;
  return `${base}/${estudo.id}/editar`;
};

const montarPayloadAtualizacaoLicao = (estudo, dadosLicao) => ({
  nomeEstudante: estudo.nomeEstudante || 'Nao informado',
  endereco: estudo.endereco || 'Nao informado',
  cidade: estudo.cidade || 'Nao informada',
  estado: estudo.estado || 'SP',
  whatsapp: estudo.whatsapp || estudo.participantes?.[0]?.whatsapp || '00000000000',
  diaEstudo: estudo.diaEstudo || 'Nao informado',
  horarioEstudo: estudo.horarioEstudo || null,
  duplaId: estudo.duplaId || estudo.dupla?.id,
  serie: dadosLicao.serie,
  licaoAtual: Number(dadosLicao.licaoAtual),
  tipoEstudo: estudo.tipoEstudo || 'UNICO',
  sexo: estudo.sexo || null,
  classificacaoInteressado: estudo.classificacaoInteressado || null,
  motivoImpedimento: estudo.motivoImpedimento || null,
  vaIgreja: estudo.vaIgreja,
  leBiblia: estudo.leBiblia,
  estudaLicao: estudo.estudaLicao,
  devolveDizimos: estudo.devolveDizimos,
  cultoFamiliar: estudo.cultoFamiliar,
  observacoes: estudo.observacoes || null,
  participantes: ['PONTO', 'CLASSE'].includes(estudo.tipoEstudo)
    ? (estudo.participantes || []).map((participante) => ({
      nome: participante.nome,
      whatsapp: participante.whatsapp || null,
      sexo: participante.sexo || null,
      endereco: participante.endereco || null,
      classificacaoInteressado: participante.classificacaoInteressado || null,
      motivoImpedimento: participante.motivoImpedimento || null,
    }))
    : undefined,
});

const getClassificacaoAtividadeText = (dupla) => {
  const classe = classeConfig[dupla?.classificacaoDupla]?.label || 'Sem classe';
  const atividade = atividadeConfig[dupla?.atividadeDupla]?.label || 'Sem atividade';
  return `${classe} · ${atividade}`;
};

const getClassificacaoAtividadeDisplayText = (dupla) => {
  const classe = classeConfig[getClassificacaoDuplaDisplay(dupla)]?.label || 'Sem classe';
  const atividade = atividadeConfig[getAtividadeDuplaDisplay(dupla)]?.label || 'Sem atividade';
  return `${classe} - ${atividade}`;
};

const Chip = ({ children, config, compact = false, title }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full border font-semibold ${compact ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'}`}
    style={{ backgroundColor: config.bg, color: config.cor, borderColor: config.border || `${config.cor}35` }}
    title={title}
  >
    {children}
  </span>
);

const ClassificacaoAtividadeBadge = ({ dupla, compact = false }) => {
  const classificacao = getClassificacaoDuplaDisplay(dupla);
  const classe = classeConfig[classificacao] || { label: 'Sem classe', cor: '#475569', bg: '#f1f5f9' };
  const atividade = atividadeConfig[getAtividadeDuplaDisplay(dupla)] || atividadeConfig.INATIVA;

  return (
    <>
      <Chip config={classe} compact={compact} title={classeRegras[classificacao] || 'Sem regra de classe informada.'}>{classe.label}</Chip>
      <Chip config={atividade} compact={compact}>{atividade.label}</Chip>
    </>
  );
};

const IndicadorBadge = ({ tipo, valor, compact = false }) => {
  const config = indicadorConfig[tipo];
  return (
    <Chip config={config} compact={compact}>
      {config.label} {valor}
    </Chip>
  );
};

const resolverFotosDaDupla = async (dupla) => {
  const [fotoLiderPreview, fotoMembro2Preview] = await Promise.all([
    FotoService.resolverFotoParaPreview(dupla.fotoLider).catch(() => ''),
    FotoService.resolverFotoParaPreview(dupla.fotoMembro2).catch(() => ''),
  ]);

  return { ...dupla, fotoLiderPreview, fotoMembro2Preview };
};

const FotoPessoa = ({ src, nome, className, fallbackClassName, onPreview }) => {
  const inicial = (nome || '?').charAt(0);

  if (src) {
    return (
      <img
        src={src}
        alt={nome || 'Foto do membro'}
        className={`${className} object-cover bg-gray-100 ${onPreview ? 'cursor-zoom-in hover:ring-2 hover:ring-[#C9963A]/60 transition' : ''}`}
        role={onPreview ? 'button' : undefined}
        tabIndex={onPreview ? 0 : undefined}
        title={onPreview ? 'Clique para ampliar' : undefined}
        onClick={(event) => {
          if (!onPreview) return;
          event.stopPropagation();
          onPreview(src, nome);
        }}
        onKeyDown={(event) => {
          if (!onPreview || (event.key !== 'Enter' && event.key !== ' ')) return;
          event.preventDefault();
          event.stopPropagation();
          onPreview(src, nome);
        }}
      />
    );
  }

  return (
    <div className={`${className} ${fallbackClassName} flex items-center justify-center text-white font-bold`}>
      {inicial}
    </div>
  );
};

export default function DuplasDireto() {
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
  const podeExcluir = ehAdmin(usuario);
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [duplaSelecionadaId, setDuplaSelecionadaId] = useState(null);
  const [filtro, setFiltro] = useState(''); // pode ser status (ATIVA/INATIVA) ou medalha (ouro/prata/bronze)
  const [filtroClasse, setFiltroClasse] = useState(() => {
    return ['A', 'B', 'C'].includes(classeParam) ? classeParam : '';
  });
  const [filtroAtividade, setFiltroAtividade] = useState(() => {
    return ['ATIVA', 'INATIVA'].includes(atividadeParam) ? atividadeParam : '';
  });
  const [filtroEspecial, setFiltroEspecial] = useState(() => {
    return ['semEstudos', 'comVisitacoes', 'estudoNaoRegistrado'].includes(filtroEspecialParam) ? filtroEspecialParam : '';
  });
  const [busca, setBusca] = useState('');
  const [buscaFocada, setBuscaFocada] = useState(false);
  const [mostraDetalhe, setMostraDetalhe] = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [excluindoId, setExcluindoId] = useState(null);
  const [estudoLicaoModal, setEstudoLicaoModal] = useState(null);
  const [licoesRapidas, setLicoesRapidas] = useState({});
  const [salvandoLicaoId, setSalvandoLicaoId] = useState(null);

  const abrirFoto = (src, nome) => setFotoAmpliada({ src, nome });

  const abrirModalLicao = (estudo) => {
    setEstudoLicaoModal(estudo);
    setLicoesRapidas({
      [estudo.id]: {
        serie: estudo.serie || '',
        licaoAtual: estudo.licaoAtual ? String(estudo.licaoAtual) : '',
      },
    });
  };

  const fecharModalLicao = () => {
    setEstudoLicaoModal(null);
    setLicoesRapidas({});
  };

  const setLicaoRapida = (estudoId, campo, valor) => {
    setLicoesRapidas((atual) => ({
      ...atual,
      [estudoId]: {
        ...(atual[estudoId] || {}),
        [campo]: valor,
        ...(campo === 'serie' ? { licaoAtual: '' } : {}),
      },
    }));
  };

  const salvarLicaoRapida = async (estudo) => {
    const dadosLicao = licoesRapidas[estudo.id] || {};
    if (!dadosLicao.serie || !dadosLicao.licaoAtual) {
      alert('Selecione a série e a lição atual.');
      return;
    }

    try {
      setSalvandoLicaoId(estudo.id);
      const atualizado = await api.put(`/estudos-biblicos/${estudo.id}`, montarPayloadAtualizacaoLicao(estudo, dadosLicao));
      setDuplas((lista) => lista.map((dupla) => (
        dupla.id === duplaSelecionadaId
          ? {
            ...dupla,
            estudosBiblicos: (dupla.estudosBiblicos || []).map((item) => (
              item.id === estudo.id ? atualizado.data : item
            )),
          }
          : dupla
      )));
      fecharModalLicao();
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao atualizar a lição.');
    } finally {
      setSalvandoLicaoId(null);
    }
  };

  const excluirDupla = async () => {
    if (!duplaSelecionada || excluindoId) return;
    const confirmou = window.confirm(`Excluir a dupla ${duplaSelecionada.liderNome || ''} + ${duplaSelecionada.membro2Nome || ''}?`);
    if (!confirmou) return;

    try {
      setExcluindoId(duplaSelecionada.id);
      await api.delete(`/duplas/${duplaSelecionada.id}`);
      setDuplas((lista) => lista.filter((dupla) => dupla.id !== duplaSelecionada.id));
      setMostraDetalhe(false);
    } catch (err) {
      alert(err.response?.data?.erro || 'Erro ao remover dupla.');
    } finally {
      setExcluindoId(null);
    }
  };

  useEffect(() => {
    let ativo = true;
    api.get('/duplas').then(async (d) => {
      if (!ativo) return;
      const lista = Array.isArray(d.data) ? d.data : [];
      const listaComFotos = await Promise.all(lista.map(resolverFotosDaDupla));
      if (ativo) setDuplas(listaComFotos);
    }).catch(() => {
      if (ativo) setDuplas([]);
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, []);

  useEffect(() => {
    setFiltroClasse(['A', 'B', 'C'].includes(classeParam) ? classeParam : '');
  }, [classeParam]);

  useEffect(() => {
    setFiltro(['ATIVA', 'PENDENTE', 'INATIVA', 'ouro', 'prata', 'bronze'].includes(statusParam) ? statusParam : '');
  }, [statusParam]);

  useEffect(() => {
    setFiltroAtividade(['ATIVA', 'INATIVA'].includes(atividadeParam) ? atividadeParam : '');
  }, [atividadeParam]);

  useEffect(() => {
    setFiltroEspecial(['semEstudos', 'comVisitacoes', 'estudoNaoRegistrado'].includes(filtroEspecialParam) ? filtroEspecialParam : '');
  }, [filtroEspecialParam]);

  // Duplas com medalha calculada e ordenadas por medalha (Ouro → Prata → Bronze)
  const duplasComMedalha = useMemo(() =>
    [...duplas]
      .map(d => ({ ...d, _medalha: getMedalha(d) }))
      .sort((a, b) => medalhaOrder[a._medalha] - medalhaOrder[b._medalha]),
    [duplas]
  );

  // Contagem por medalha para os chips de filtro
  const contagemMedalha = useMemo(() => {
    const c = { ouro: 0, prata: 0, bronze: 0 };
    duplasComMedalha.forEach(d => { c[d._medalha] = (c[d._medalha] || 0) + 1; });
    return c;
  }, [duplasComMedalha]);

  // Filtra as duplas com base nos critérios de busca (memoizado)
  const duplasFiltradas = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const isMedalha = ['ouro', 'prata', 'bronze'].includes(filtro);
    return duplasComMedalha.filter((d) => {
      const matchFiltro = !filtro
        ? true
        : isMedalha
          ? d._medalha === filtro
          : d.status === filtro;
      const matchBusca = !termo ||
        (d.liderNome || '').toLowerCase().includes(termo) ||
        (d.membro2Nome || '').toLowerCase().includes(termo) ||
        (d.bairro || '').toLowerCase().includes(termo);
      const matchClasse = pertenceClasseFiltro(d, filtroClasse);
      const matchAtividade = !filtroAtividade || getAtividadeDuplaDisplay(d) === filtroAtividade;
      const matchEstudoAtivo = estudoAtivoParam !== '1' || d.estudoAtualEmAndamento === true || d.statusEstudoBiblico === 'ATIVO' || temEstudoCadastrado(d);
      const matchIgreja = !igrejaIdParam || String(d.igreja?.id || d.igrejaId || '') === igrejaIdParam;
      const matchRegiao = !regiaoIdParam || String(d.distrito?.regiao?.id || '') === regiaoIdParam;
      const matchTipoProjeto = !tipoProjetoParam || d.tipoProjeto === tipoProjetoParam;
      const matchBatismos = !minBatismosParam || (d.batismos || 0) >= minBatismosParam;
      const matchPessoas = !minPessoasParam || (d.pessoasAlcancadas || 0) >= minPessoasParam;
      const matchEspecial = !filtroEspecial
        || (filtroEspecial === 'semEstudos' && getEstudosCount(d) === 0)
        || (filtroEspecial === 'estudoNaoRegistrado' && temEstudoNaoRegistrado(d))
        || (filtroEspecial === 'comVisitacoes' && getVisitacoesCount(d) >= 1);
      return matchFiltro && matchClasse && matchAtividade && matchEstudoAtivo && matchIgreja && matchRegiao && matchTipoProjeto && matchBatismos && matchPessoas && matchEspecial && matchBusca;
    });
  }, [duplasComMedalha, filtro, filtroClasse, filtroAtividade, estudoAtivoParam, igrejaIdParam, regiaoIdParam, tipoProjetoParam, minBatismosParam, minPessoasParam, filtroEspecial, busca]);

  // Sincroniza a seleção quando a lista filtrada muda
  useEffect(() => {
    if (duplasFiltradas.length === 0) {
      setDuplaSelecionadaId(null);
      return;
    }

    const selecionadaAindaVisivel = duplasFiltradas.some(
      (d) => d.id === duplaSelecionadaId
    );

    if (!selecionadaAindaVisivel) {
      setDuplaSelecionadaId(duplasFiltradas[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duplasFiltradas, duplaSelecionadaId]);

  // Deriva o objeto completo da dupla selecionada (memoizado)
  const duplaSelecionada = useMemo(() => {
    if (!duplaSelecionadaId) return null;
    return duplas.find((d) => d.id === duplaSelecionadaId) || null;
  }, [duplaSelecionadaId, duplas]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando duplas...</p>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* ===== PAINEL ESQUERDO: Filtros + Lista de Duplas (Master) ===== */}
      <div className={`${
        mostraDetalhe ? 'hidden sm:flex' : 'flex'
      } w-full sm:w-80 lg:w-[360px] flex-shrink-0 border-r border-gray-200 bg-white flex-col h-full overflow-y-auto`}>
        {/* Cabeçalho + Filtros */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
                <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Direta</p>
              </div>
              <h1 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                Duplas
              </h1>
              <p className="text-gray-400 text-[10px]">{duplasFiltradas.length} dupla(s) encontrada(s)</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/direto/duplas/nova')}
              className="btn-primary flex items-center gap-1.5 text-xs px-3 py-2 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nova
            </button>
          </div>

          {/* Chips de medalha com contagem */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {/* Chip "Todas" */}
            <button
              type="button"
              onClick={() => { setFiltro(''); setFiltroClasse(''); setFiltroAtividade(''); setFiltroEspecial(''); }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-200 ${
                filtro === '' && filtroClasse === '' && filtroAtividade === '' && filtroEspecial === ''
                  ? 'bg-[#1A3A6B] text-white border-[#1A3A6B] shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#1A3A6B]/30'
              }`}
            >
              Todas
              <span
                className="rounded-full px-1.5 py-px text-[9px] font-bold"
                style={{
                  backgroundColor: filtro === '' && filtroClasse === '' && filtroAtividade === '' && filtroEspecial === '' ? 'rgba(255,255,255,0.25)' : '#f3f4f6',
                  color: filtro === '' && filtroClasse === '' && filtroAtividade === '' && filtroEspecial === '' ? 'white' : '#6b7280',
                }}
              >
                {duplas.length}
              </span>
            </button>

            {/* Chips ouro / prata / bronze */}
            {(['ouro', 'prata', 'bronze']).map((m) => {
              const cfg = medalhaConfig[m];
              const ativo = filtro === m;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFiltro(ativo ? '' : m)}
                  title={medalhaRegras[m]}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-200"
                  style={ativo
                    ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                    : { backgroundColor: cfg.bg, borderColor: cfg.cor + '55', color: cfg.cor }}
                >
                  {cfg.emoji}
                  {cfg.label}
                  <span
                    className="rounded-full px-1.5 py-px text-[9px] font-bold"
                    style={{
                      backgroundColor: ativo ? 'rgba(255,255,255,0.25)' : cfg.cor + '25',
                      color: ativo ? 'white' : cfg.cor,
                    }}
                  >
                    {contagemMedalha[m] || 0}
                  </span>
                </button>
              );
            })}

            {(['A', 'B', 'C']).map((classe) => {
              const cfg = classeConfig[classe];
              const ativo = filtroClasse === classe;
              const total = duplas.filter((dupla) => pertenceClasseFiltro(dupla, classe)).length;
              return (
                <button
                  key={classe}
                  type="button"
                  onClick={() => setFiltroClasse(ativo ? '' : classe)}
                  title={classeRegras[classe]}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-200"
                  style={ativo
                    ? { backgroundColor: cfg.cor, borderColor: cfg.cor, color: 'white' }
                    : { backgroundColor: cfg.bg, borderColor: cfg.cor + '55', color: cfg.cor }}
                >
                  Classe {classe}
                  <span
                    className="rounded-full px-1.5 py-px text-[9px] font-bold"
                    style={{
                      backgroundColor: ativo ? 'rgba(255,255,255,0.25)' : cfg.cor + '20',
                      color: ativo ? 'white' : cfg.cor,
                    }}
                  >
                    {total}
                  </span>
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
            ].map((item) => {
              const ativo = filtroEspecial === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFiltroEspecial(ativo ? '' : item.key)}
                  title={item.title}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all duration-200"
                  style={ativo
                    ? { backgroundColor: item.cor, borderColor: item.cor, color: 'white' }
                    : { backgroundColor: item.bg, borderColor: item.cor + '55', color: item.cor }}
                >
                  {item.label}
                  <span
                    className="rounded-full px-1.5 py-px text-[9px] font-bold"
                    style={{
                      backgroundColor: ativo ? 'rgba(255,255,255,0.25)' : item.cor + '20',
                      color: ativo ? 'white' : item.cor,
                    }}
                  >
                    {item.total}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtros de busca e filtro unificado */}
          <div className="flex gap-2 transition-all duration-300">
            {/* Campo de busca — expande ao focar */}
            <div className={`relative transition-all duration-300 ${buscaFocada ? 'flex-1' : 'flex-1'}`}>
              <svg
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors duration-200 ${buscaFocada ? 'text-[#1A3A6B]' : 'text-gray-400'}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={buscaFocada ? 'Digite nome, bairro ou parceiro...' : 'Buscar...'}
                className={`input-field pl-8 text-xs py-2 transition-all duration-300 ${
                  buscaFocada
                    ? 'ring-2 ring-[#1A3A6B]/30 border-[#1A3A6B]/50 placeholder-gray-400'
                    : ''
                }`}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                onFocus={() => setBuscaFocada(true)}
                onBlur={() => setBuscaFocada(false)}
              />
              {/* Botão limpar — só aparece quando há texto */}
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                  title="Limpar busca"
                >
                  <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Select — esconde suavemente ao focar na busca */}
            <div
              className="transition-all duration-300 overflow-hidden"
              style={{
                maxWidth: buscaFocada ? '0px' : '128px',
                opacity: buscaFocada ? 0 : 1,
                pointerEvents: buscaFocada ? 'none' : 'auto',
              }}
            >
              <select
                className="input-field text-xs py-2 w-32"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
              >
                <option value="">Todos</option>
                <optgroup label="Status">
                  <option value="ATIVA">Ativa</option>
                  <option value="INATIVA">Inativa</option>
                </optgroup>
                <optgroup label="Medalha">
                  <option value="ouro">Ouro</option>
                  <option value="prata">Prata</option>
                  <option value="bronze">Bronze</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de duplas */}
        <div className="flex-1">
          {duplasFiltradas.map((dupla) => {
            const selecionada = duplaSelecionada?.id === dupla.id;
            const mcfg = medalhaConfig[dupla._medalha];
            const classCfg = classeConfig[getClassificacaoDuplaDisplay(dupla)];
            const borderColor = classCfg?.cor || mcfg.cor;

            return (
              <button
                type="button"
                key={dupla.id}
                onClick={() => { setDuplaSelecionadaId(dupla.id); setMostraDetalhe(true); }}
                className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                  selecionada
                    ? 'bg-[#1A3A6B]/5'
                    : 'bg-white hover:bg-gray-50'
                }`}
                style={{ borderLeftColor: selecionada ? borderColor : borderColor + '60' }}
              >
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Fotos lado a lado, mesmo tamanho, sem sobreposição */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <FotoPessoa
                          src={dupla.fotoLiderPreview}
                          nome={dupla.liderNome}
                          className="w-8 h-8 rounded-full shadow-sm"
                          fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-[10px]"
                          onPreview={abrirFoto}
                        />
                        <FotoPessoa
                          src={dupla.fotoMembro2Preview}
                          nome={dupla.membro2Nome}
                          className="w-8 h-8 rounded-full shadow-sm"
                          fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-[10px]"
                          onPreview={abrirFoto}
                        />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className={`text-xs font-semibold truncate transition-colors ${selecionada ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                          {dupla.liderNome || 'Sem nome'}
                        </p>
                        <p className={`text-xs font-semibold truncate transition-colors ${selecionada ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                          <span className="text-gray-300 mr-1">+</span>{dupla.membro2Nome || 'Sem nome'}
                        </p>
                      </div>
                    </div>

                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: mcfg.bg, color: mcfg.cor }}
                      title={medalhaRegras[dupla._medalha]}
                    >
                      {mcfg.emoji} {mcfg.label}
                    </span>
                  </div>

                  <div className={`mt-2 pt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-gray-400 ${selecionada ? 'border-t border-gray-100' : ''}`}>
                    <span>{dupla.distrito?.nome || 'Sem distrito'}</span>
                    <IndicadorBadge tipo="estudos" valor={getEstudosCount(dupla)} compact />
                    <IndicadorBadge tipo="visitacoes" valor={getVisitacoesCount(dupla)} compact />
                    <ClassificacaoAtividadeBadge dupla={dupla} compact />
                  </div>
                </div>
              </button>
            );
          })}

          {duplasFiltradas.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2 animate-float">👥</div>
              <p className="text-sm">Nenhuma dupla encontrada.</p>
              <button
                type="button"
                onClick={() => navigate('/direto/duplas/nova')}
                className="btn-primary mt-4 text-xs px-4 py-2"
              >
                Cadastrar dupla
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== PAINEL DIREITO: Detalhes da Dupla (Detail) ===== */}
      <div className={`${
        mostraDetalhe ? 'flex' : 'hidden sm:flex'
      } flex-1 flex-col h-full overflow-hidden bg-[#F4F5F7]`}>
        {!duplaSelecionada ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-float">👈</div>
              <p className="font-medium text-lg">Selecione uma dupla</p>
              <p className="text-sm mt-1">Clique em uma dupla à esquerda para ver os detalhes.</p>
            </div>
          </div>
        ) : (
          <div key={duplaSelecionada.id} className="flex flex-col h-full animate-slide-in-right">
            {/* Cabeçalho do detail */}
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
              {/* Botão voltar (mobile) */}
              <button
                type="button"
                onClick={() => setMostraDetalhe(false)}
                className="sm:hidden flex items-center gap-1.5 text-xs text-[#1A3A6B] font-semibold mb-3 hover:text-[#C9963A] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar à lista
              </button>
              {/* Mobile: empilhado | sm+: lado a lado */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                {/* Fotos + Nomes */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <FotoPessoa
                      src={duplaSelecionada.fotoLiderPreview}
                      nome={duplaSelecionada.liderNome}
                      className="w-11 h-11 rounded-full shadow-md"
                      fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-sm"
                      onPreview={abrirFoto}
                    />
                    <FotoPessoa
                      src={duplaSelecionada.fotoMembro2Preview}
                      nome={duplaSelecionada.membro2Nome}
                      className="w-11 h-11 rounded-full shadow-md"
                      fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-sm"
                      onPreview={abrirFoto}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h2 className="text-base font-bold text-[#1A3A6B] leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                        {duplaSelecionada.liderNome || 'Sem nome'}
                      </h2>
                      <span className="text-gray-300 text-sm">+</span>
                      <h2 className="text-base font-bold text-[#1A3A6B] leading-tight">
                        {duplaSelecionada.membro2Nome || 'Sem nome'}
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <ClassificacaoAtividadeBadge dupla={duplaSelecionada} />
                      {(() => {
                        const cor = statusColors[duplaSelecionada.status] || '#9ca3af';
                        return (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: cor + '20', color: cor }}
                          >
                            {statusLabels[duplaSelecionada.status] || duplaSelecionada.status}
                          </span>
                        );
                      })()}
                      <span className="text-[10px] text-gray-400 hidden sm:inline">{duplaSelecionada.distrito?.nome || 'Sem distrito'}</span>
                    </div>
                  </div>
                </div>

                {/* Botões de ação — linha separada no mobile */}
                <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                  {podeExcluir && (
                    <button
                      type="button"
                      onClick={excluirDupla}
                      disabled={excluindoId === duplaSelecionada.id}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-xs font-semibold hover:bg-red-50 disabled:opacity-60 transition-all flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m-7 0a1 1 0 001-1h6a1 1 0 001 1m-8 0h8" />
                      </svg>
                      {excluindoId === duplaSelecionada.id ? 'Excluindo...' : 'Excluir'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/direto/duplas/${duplaSelecionada.id}/editar`)}
                    className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/direto/duplas/${duplaSelecionada.id}`)}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Ver completos
                  </button>
                </div>
              </div>
            </div>

            {/* Conteúdo do detail — grid vertical, sem scroll horizontal */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card: Membros (Líder + Parceiro lado a lado) */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-[10px] font-bold">👥</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Membros da Dupla</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Líder */}
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-[9px] font-bold">1</div>
                        <span className="text-xs font-semibold text-[#1A3A6B]">Membro</span>
                      </div>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center gap-3">
                          <FotoPessoa
                            src={duplaSelecionada.fotoLiderPreview}
                            nome={duplaSelecionada.liderNome}
                            className="w-11 h-11 rounded-full flex-shrink-0 ring-2 ring-[#1A3A6B]/10"
                            fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-sm"
                            onPreview={abrirFoto}
                          />
                          <div className="min-w-0">
                            <span className="text-gray-400 text-xs">Nome:</span>
                            <p className="text-gray-700 font-medium truncate">{duplaSelecionada.liderNome || '—'}</p>
                          </div>
                        </div>
                        {duplaSelecionada.liderTelefone && <div><span className="text-gray-400 text-xs">WhatsApp:</span><WhatsAppLink numero={duplaSelecionada.liderTelefone} /></div>}
                        {duplaSelecionada.liderEmail && <div><span className="text-gray-400 text-xs">E-mail:</span><p className="text-gray-700">{duplaSelecionada.liderEmail}</p></div>}
                        <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.liderIgreja || duplaSelecionada.igreja?.nome || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Distrito:</span><p className="text-gray-700">{duplaSelecionada.liderDistrito || duplaSelecionada.distrito?.nome || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Data de nascimento:</span><p className="text-gray-700">{formatarData(duplaSelecionada.liderDataNascimento) || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Endereço de correspondência:</span><p className="text-gray-700 break-words">{duplaSelecionada.liderEndereco || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Data de batismo:</span><p className="text-gray-700">{formatarData(duplaSelecionada.liderDataBatismo) || '—'}</p></div>
                      </div>
                    </div>

                    {/* Parceiro */}
                    <div>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-[9px] font-bold">2</div>
                        <span className="text-xs font-semibold text-[#1A3A6B]">Membro</span>
                      </div>
                      <div className="space-y-2.5 text-sm">
                        <div className="flex items-center gap-3">
                          <FotoPessoa
                            src={duplaSelecionada.fotoMembro2Preview}
                            nome={duplaSelecionada.membro2Nome}
                            className="w-11 h-11 rounded-full flex-shrink-0 ring-2 ring-[#C9963A]/20"
                            fallbackClassName="bg-gradient-to-br from-[#C9963A] to-[#e5b05a] text-sm"
                            onPreview={abrirFoto}
                          />
                          <div className="min-w-0">
                            <span className="text-gray-400 text-xs">Nome:</span>
                            <p className="text-gray-700 font-medium truncate">{duplaSelecionada.membro2Nome || '—'}</p>
                          </div>
                        </div>
                        {duplaSelecionada.membro2Telefone && <div><span className="text-gray-400 text-xs">WhatsApp:</span><WhatsAppLink numero={duplaSelecionada.membro2Telefone} /></div>}
                        {duplaSelecionada.membro2Email && <div><span className="text-gray-400 text-xs">E-mail:</span><p className="text-gray-700">{duplaSelecionada.membro2Email}</p></div>}
                        <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.membro2Igreja || duplaSelecionada.igreja?.nome || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Distrito:</span><p className="text-gray-700">{duplaSelecionada.membro2Distrito || duplaSelecionada.distrito?.nome || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Data de nascimento:</span><p className="text-gray-700">{formatarData(duplaSelecionada.membro2DataNascimento) || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Endereço de correspondência:</span><p className="text-gray-700 break-words">{duplaSelecionada.membro2Endereco || '—'}</p></div>
                        <div><span className="text-gray-400 text-xs">Data de batismo:</span><p className="text-gray-700">{formatarData(duplaSelecionada.membro2DataBatismo) || '—'}</p></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card: Localização */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📍</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Localização</h4>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    {duplaSelecionada.distrito?.regiao?.nome && <div><span className="text-gray-400 text-xs">Região:</span><p className="text-gray-700">{duplaSelecionada.distrito.regiao.nome}</p></div>}
                    {duplaSelecionada.distrito?.nome && <div><span className="text-gray-400 text-xs">Distrito:</span><p className="text-gray-700">{duplaSelecionada.distrito.nome}</p></div>}
                    {duplaSelecionada.igreja?.nome && <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.igreja.nome}</p></div>}
                    <div><span className="text-gray-400 text-xs">Bairro:</span><p className="text-gray-700 font-medium">{duplaSelecionada.bairro || '—'}</p></div>
                  </div>
                </div>

                {/* Card: Projeto */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📋</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Projeto</h4>
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div><span className="text-gray-400 text-xs">Tipo:</span><p className="text-gray-700 font-medium">{projetoLabel[duplaSelecionada.tipoProjeto] || duplaSelecionada.tipoProjeto || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Classe da dupla:</span><p className="text-gray-700 font-semibold">{getClassificacaoAtividadeDisplayText(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Estudos bíblicos:</span><p className="text-gray-700 font-medium">{getEstudosCount(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Visitações:</span><p className="text-gray-700 font-medium">{getVisitacoesCount(duplaSelecionada)}</p></div>
                    {(() => {
                      const cor = statusColors[duplaSelecionada.status] || '#9ca3af';
                      return (
                        <div><span className="text-gray-400 text-xs">Status:</span><p className="font-semibold" style={{ color: cor }}>{statusLabels[duplaSelecionada.status] || duplaSelecionada.status}</p></div>
                      );
                    })()}
                    {duplaSelecionada.pessoasAlcancadas > 0 && (
                      <div className="flex items-center gap-2 bg-[#C9963A]/10 rounded-lg px-3 py-2 mt-2">
                        <span className="text-lg">🙏</span>
                        <div>
                          <p className="text-[#C9963A] font-bold">{duplaSelecionada.pessoasAlcancadas}</p>
                          <p className="text-gray-400 text-[10px]">Meta de Contatos</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card: Observações */}
                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs font-bold text-[#1A3A6B]">AC</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Acompanhamento</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 text-sm">
                    <div><span className="text-gray-400 text-xs">Estudo bíblico:</span><p className="text-gray-700 font-medium">{duplaSelecionada.estudoBiblico || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Status do estudo:</span><p className="text-gray-700 font-medium">{statusAcompanhamentoLabels[duplaSelecionada.statusEstudoBiblico] || duplaSelecionada.statusEstudoBiblico || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Status da classe bíblica:</span><p className="text-gray-700 font-medium">{statusAcompanhamentoLabels[duplaSelecionada.statusEvangelismo] || duplaSelecionada.statusEvangelismo || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Estudos bíblicos cadastrados:</span><p className="text-gray-700 font-medium">{getEstudosCount(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Visitações registradas:</span><p className="text-gray-700 font-medium">{getVisitacoesCount(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Pessoas alcançadas:</span><p className="text-gray-700 font-medium">{duplaSelecionada.pessoasAlcancadas ?? 0}</p></div>
                    <div><span className="text-gray-400 text-xs">Batismos:</span><p className="text-gray-700 font-medium">{duplaSelecionada.batismos ?? 0}</p></div>
                    <div><span className="text-gray-400 text-xs">Último acompanhamento:</span><p className="text-gray-700 font-medium">{formatarData(duplaSelecionada.ultimoAcompanhamento) || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Início da dupla:</span><p className="text-gray-700 font-medium">{formatarData(duplaSelecionada.dataInicio) || '—'}</p></div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#16a34a]/10 flex items-center justify-center text-xs font-bold text-[#16a34a]">EB</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Estudos da Dupla</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(tipoEstudoCadastroPath).map(([tipo, path]) => (
                        <button
                          key={tipo}
                          type="button"
                          onClick={() => navigate(`${path}?duplaId=${duplaSelecionada.id}`)}
                          className="btn-outline text-xs px-3 py-1.5"
                        >
                          Novo {tipoEstudoLabels[tipo]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(!duplaSelecionada.estudosBiblicos || duplaSelecionada.estudosBiblicos.length === 0) ? (
                    <div className="rounded-lg border border-dashed border-gray-200 bg-[#F4F5F7] p-4 text-sm text-gray-500">
                      Nenhum estudo, ponto de estudo ou classe bíblica cadastrado para esta dupla.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {duplaSelecionada.estudosBiblicos.map((estudo) => {
                        const percentual = progressoEstudo(estudo);
                        const total = totalLicoesSerie(estudo.serie);
                        return (
                          <div key={estudo.id} className="rounded-lg border border-gray-100 bg-[#F8FAFC] p-4">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-[#1A3A6B]/10 text-[#1A3A6B]">
                                    {tipoEstudoLabels[estudo.tipoEstudo] || 'Estudo'}
                                  </span>
                                  <span className="text-[10px] text-gray-400">Atualizado em {formatarData(estudo.atualizadoEm) || '—'}</span>
                                </div>
                                <h5 className="font-bold text-[#1A3A6B] break-words">{estudo.nomeEstudante || 'Sem nome'}</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mt-3 text-xs">
                                  <div><span className="text-gray-400">Série:</span><p className="font-semibold text-gray-700">{getSerieNome(estudo.serie)}</p></div>
                                  <div><span className="text-gray-400">Lição atual:</span><p className="font-semibold text-gray-700">{getLicaoLabel(estudo.serie, estudo.licaoAtual)}</p></div>
                                  <div><span className="text-gray-400">Dia/horário:</span><p className="font-semibold text-gray-700">{estudo.diaEstudo || '—'} {estudo.horarioEstudo ? `às ${estudo.horarioEstudo}` : ''}</p></div>
                                  <div><span className="text-gray-400">Participantes:</span><p className="font-semibold text-gray-700">{estudo.participantes?.length || 1}</p></div>
                                </div>
                                <div className="mt-3">
                                  <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                                    <span>Progressão do estudo</span>
                                    <span>{percentual}%{total ? ` (${estudo.licaoAtual || 0}/${total})` : ''}</span>
                                  </div>
                                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                                    <div className="h-full rounded-full bg-[#16a34a]" style={{ width: `${percentual}%` }} />
                                  </div>
                                </div>
                                {estudo.observacoes && (
                                  <div className="mt-3 rounded-lg bg-white border border-gray-100 p-3">
                                    <span className="text-gray-400 text-xs">Observação:</span>
                                    <p className="text-sm text-gray-600 leading-relaxed break-words">{estudo.observacoes}</p>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-wrap lg:flex-col gap-2 lg:w-44">
                                <button
                                  type="button"
                                  onClick={() => abrirModalLicao(estudo)}
                                  className="btn-outline text-xs px-3 py-2"
                                >
                                  Atualizar lição
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(editarEstudoPath(estudo))}
                                  className="btn-primary text-xs px-3 py-2"
                                >
                                  Atualizar estudo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`${tipoEstudoRelatorioPath[estudo.tipoEstudo] || tipoEstudoRelatorioPath.UNICO}/${estudo.id}`)}
                                  className="btn-outline text-xs px-3 py-2"
                                >
                                  Ver detalhes
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {duplaSelecionada.observacoes && (
                  <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm md:col-span-2">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📝</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Observações</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{duplaSelecionada.observacoes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    {estudoLicaoModal && (() => {
      const edicaoLicao = licoesRapidas[estudoLicaoModal.id] || {};
      const licoesDaSerie = SERIES_ESTUDO.find((serie) => serie.id === edicaoLicao.serie)?.licoes || [];
      return (
        <div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={fecharModalLicao}
        >
          <div
            className="w-full max-w-xl rounded-xl bg-white shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-gray-100">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#16a34a]">Atualizar lição</p>
                <h3 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  {estudoLicaoModal.nomeEstudante || 'Estudo bíblico'}
                </h3>
              </div>
              <button
                type="button"
                onClick={fecharModalLicao}
                className="w-9 h-9 rounded-full border border-gray-200 text-gray-500 hover:text-[#1A3A6B] hover:border-[#1A3A6B]/30 transition flex items-center justify-center"
                title="Fechar"
                disabled={salvandoLicaoId === estudoLicaoModal.id}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Série</span>
                  <select
                    className="input-field text-sm"
                    value={edicaoLicao.serie || ''}
                    onChange={(event) => setLicaoRapida(estudoLicaoModal.id, 'serie', event.target.value)}
                  >
                    <option value="">Selecione a série</option>
                    {SERIES_ESTUDO.map((serie) => (
                      <option key={serie.id} value={serie.id}>{serie.nome}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="block text-xs font-semibold text-gray-500 mb-1">Lição atual</span>
                  <select
                    className="input-field text-sm"
                    value={edicaoLicao.licaoAtual || ''}
                    onChange={(event) => setLicaoRapida(estudoLicaoModal.id, 'licaoAtual', event.target.value)}
                    disabled={!edicaoLicao.serie}
                  >
                    <option value="">Selecione a lição</option>
                    {licoesDaSerie.map((licao) => (
                      <option key={licao.numero} value={licao.numero}>{licao.numero} - {licao.titulo}</option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 bg-[#F8FAFC]">
              <button
                type="button"
                onClick={fecharModalLicao}
                className="btn-outline text-sm px-4 py-2"
                disabled={salvandoLicaoId === estudoLicaoModal.id}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => salvarLicaoRapida(estudoLicaoModal)}
                className="btn-primary text-sm px-4 py-2"
                disabled={salvandoLicaoId === estudoLicaoModal.id}
              >
                {salvandoLicaoId === estudoLicaoModal.id ? 'Salvando...' : 'Salvar lição'}
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    {fotoAmpliada && (
      <div
        className="fixed inset-0 z-[80] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        onClick={() => setFotoAmpliada(null)}
      >
        <div
          className="relative w-full max-w-2xl flex flex-col items-center gap-4"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setFotoAmpliada(null)}
            className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/95 text-[#1A3A6B] flex items-center justify-center shadow-lg hover:bg-white transition"
            title="Fechar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={fotoAmpliada.src}
            alt={fotoAmpliada.nome || 'Foto ampliada'}
            className="max-h-[78vh] max-w-full rounded-2xl object-contain bg-white shadow-2xl"
          />
          {fotoAmpliada.nome && (
            <div className="px-4 py-2 rounded-full bg-white/95 text-[#1A3A6B] text-sm font-semibold shadow-lg">
              {fotoAmpliada.nome}
            </div>
          )}
        </div>
      </div>
    )}
    </>
  );
}
