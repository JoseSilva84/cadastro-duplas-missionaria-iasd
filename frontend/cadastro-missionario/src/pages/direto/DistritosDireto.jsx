import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../lib/api';
import { FotoService } from '../../foto.service';
import AvatarUpload from '../../components/AvatarUpload';
import { toast } from '../../lib/toast';
import { PERFIS, useAuth } from '../../contexts/AuthContext';

const projetoLabel = {
  CASA_A_CASA: 'Casa a casa',
  ESTUDO_BIBLICO: 'Estudo Biblico',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Acao Social',
  EVANGELISMO_PUBLICO: 'Classe Biblica',
};

const statusAcompanhamentoLabels = {
  ATIVO: 'Ativo',
  PAUSADO: 'Pausado',
  CONCLUIDO: 'Concluido',
  SEM_ATIVIDADE: 'Sem atividade',
};

const formatarData = (valor) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
};

const valorDataInput = (valor) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toISOString().slice(0, 10);
};

const getEstudosCount = (dupla) => dupla?._count?.estudosBiblicos ?? dupla?.estudosBiblicos?.length ?? 0;
const getVisitacoesCount = (dupla) => dupla?._count?.acompanhamentos ?? dupla?.acompanhamentos?.length ?? 0;
const temEstudoNaoRegistrado = (dupla) => (
  (dupla?.estudoAtualEmAndamento === true || dupla?.atividadeDupla === 'ATIVA' || dupla?.statusEstudoBiblico === 'ATIVO')
  && getEstudosCount(dupla) === 0
);

const getClassificacaoDuplaDisplay = (dupla) => {
  const totalEstudos = getEstudosCount(dupla);
  if (dupla?.levouPessoaBatismo === true) return 'A';
  if (totalEstudos > 0 || dupla?.jaDeuEstudoBiblico === true) return 'B';
  return dupla?.classificacaoDupla || null;
};

const getAtividadeDuplaDisplay = (dupla) => {
  const totalEstudos = getEstudosCount(dupla);
  if (
    dupla?.atividadeDupla === 'ATIVA'
    || dupla?.statusEstudoBiblico === 'ATIVO'
    || (dupla?.status === 'ATIVA' && totalEstudos > 0)
  ) {
    return 'ATIVA';
  }
  return dupla?.atividadeDupla || null;
};

const getClassificacaoAtividadeText = (dupla) => {
  if (!dupla?.classificacaoDupla) return 'Sem classe';
  return `Classe ${dupla.classificacaoDupla}${dupla.atividadeDupla ? ` · ${dupla.atividadeDupla === 'ATIVA' ? 'Ativa' : 'Inativa'}` : ''}`;
};

const getClassificacaoAtividadeDisplayText = (dupla) => {
  const classificacao = getClassificacaoDuplaDisplay(dupla);
  const atividade = getAtividadeDuplaDisplay(dupla);
  if (!classificacao) return 'Sem classe';
  return `Classe ${classificacao}${atividade ? ` - ${atividade === 'ATIVA' ? 'Ativa' : 'Inativa'}` : ''}`;
};

const boolLabel = (valor) => {
  if (valor === true) return 'Sim';
  if (valor === false) return 'Nao';
  return 'Nao informado';
};

const CampoModal = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">{label}</span>
    {children}
  </label>
);

// Link clicável do WhatsApp Web
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

const ModalPastorDistrital = ({ distrito, fotoPreview, onClose, onSaved }) => {
  const [form, setForm] = useState(() => ({
    fotoPastor: fotoPreview || '',
    nomePastor: distrito.nomePastor || '',
    cargoPastor: distrito.cargoPastor || 'Pastor Distrital',
    telefonePastor: distrito.telefonePastor || '',
    enderecoPastor: distrito.enderecoPastor || '',
    dataNascimentoPastor: valorDataInput(distrito.dataNascimentoPastor),
  }));
  const [salvando, setSalvando] = useState(false);

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const salvar = async (event) => {
    event.preventDefault();
    setSalvando(true);
    try {
      const fotoRef = await FotoService.salvarFotoPorReferencia('distrito', distrito.id, 'pastor', form.fotoPastor);
      const { data } = await api.patch(`/distritos/${distrito.id}`, {
        fotoPastor: fotoRef || null,
        nomePastor: form.nomePastor || null,
        cargoPastor: form.cargoPastor || 'Pastor Distrital',
        telefonePastor: form.telefonePastor || null,
        enderecoPastor: form.enderecoPastor || null,
        dataNascimentoPastor: form.dataNascimentoPastor || null,
      });
      toast.success('Cadastro do pastor distrital atualizado.');
      onSaved(data, form.fotoPastor);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar pastor distrital.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white border border-gray-100 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-[#C9963A] text-xs font-bold uppercase tracking-wider">Cadastro</p>
            <h3 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Pastor Distrital</h3>
            <p className="text-xs text-gray-400 mt-1">{distrito.nome}</p>
          </div>
          <button type="button" className="btn-outline text-sm" onClick={onClose}>Fechar</button>
        </div>

        <form onSubmit={salvar} className="p-5 bg-[#F4F5F7]">
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-5">
              <AvatarUpload value={form.fotoPastor} onChange={(valor) => set('fotoPastor', valor)} label="Foto" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <CampoModal label="Nome completo">
                    <input className="input-field" value={form.nomePastor} onChange={(e) => set('nomePastor', e.target.value)} placeholder="Nome do pastor distrital" />
                  </CampoModal>
                </div>
                <CampoModal label="Cargo">
                  <input className="input-field" value={form.cargoPastor} onChange={(e) => set('cargoPastor', e.target.value)} />
                </CampoModal>
                <CampoModal label="WhatsApp">
                  <input className="input-field" value={form.telefonePastor} onChange={(e) => set('telefonePastor', e.target.value)} placeholder="(11) 99999-9999" />
                </CampoModal>
                <div className="sm:col-span-2">
                  <CampoModal label="Endereco">
                    <input className="input-field" value={form.enderecoPastor} onChange={(e) => set('enderecoPastor', e.target.value)} placeholder="Endereco residencial" />
                  </CampoModal>
                </div>
                <CampoModal label="Data de nascimento">
                  <input type="date" className="input-field" value={form.dataNascimentoPastor} onChange={(e) => set('dataNascimentoPastor', e.target.value)} />
                </CampoModal>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar cadastro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DistritosDireto() {
  const { distritoId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const isPastorDistrital = usuario?.perfil === PERFIS.PASTOR_DISTRITAL;
  const voltarDestino = isPastorDistrital ? '/direto/distritos' : '/direto/regioes';
  const voltarLabel = isPastorDistrital ? 'Voltar para Distritos' : 'Voltar para Regiões';
  const [distrito, setDistrito] = useState(null);
  const [duplas, setDuplas] = useState([]);             // duplas atualmente exibidas (todas ou filtradas)
  const [todasDuplas, setTodasDuplas] = useState([]);   // cache de todas as duplas do distrito
  const [carregando, setCarregando] = useState(true);
  const [duplaSelecionada, setDuplaSelecionada] = useState(null);
  const [erro, setErro] = useState(null);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);
  const [estudoSelecionado, setEstudoSelecionado] = useState(null);
  const [fotoPastorPreview, setFotoPastorPreview] = useState('');
  const [editandoPastor, setEditandoPastor] = useState(false);

  // Controle de filtro por igreja
  const [igrejaSelecionadaId, setIgrejaSelecionadaId] = useState(null);
  const [duplasPorIgreja, setDuplasPorIgreja] = useState({}); // { [igrejaId]: { total, ativas, inativas, pendentes } }

  const abrirFoto = (src, nome) => setFotoAmpliada({ src, nome });

  const atualizarPastorDistrital = (distritoAtualizado, fotoPreview) => {
    setDistrito((atual) => ({ ...atual, ...distritoAtualizado }));
    setFotoPastorPreview(fotoPreview);
    setEditandoPastor(false);
  };

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get(`/distritos/${distritoId}`),
      api.get('/duplas', { params: { distritoId } }),
    ]).then(async ([d, p]) => {
      if (!ativo) return;
      setDistrito(d.data);
      const fotoPastor = await FotoService.resolverFotoParaPreview(d.data?.fotoPastor).catch(() => '');
      if (ativo) setFotoPastorPreview(fotoPastor);
      const listaDuplas = Array.isArray(p.data) ? p.data : [];
      const listaComFotos = await Promise.all(listaDuplas.map(resolverFotosDaDupla));
      if (ativo) {
        setTodasDuplas(listaComFotos);

        // Calcular contagem de duplas por igreja
        const contagem = {};
        listaComFotos.forEach((dupla) => {
          if (dupla.igrejaId) {
            if (!contagem[dupla.igrejaId]) {
              contagem[dupla.igrejaId] = { total: 0, ativas: 0, inativas: 0, pendentes: 0 };
            }
            contagem[dupla.igrejaId].total += 1;
            if (dupla.status === 'ATIVA') contagem[dupla.igrejaId].ativas += 1;
            if (dupla.status === 'INATIVA') contagem[dupla.igrejaId].inativas += 1;
            if (dupla.status === 'PENDENTE') contagem[dupla.igrejaId].pendentes += 1;
          }
        });
        setDuplasPorIgreja(contagem);

        // Auto-aplicar filtro de igreja se vier da tela de igrejas
        const igrejaIdDaNav = location.state?.filtrarIgrejaId;
        if (igrejaIdDaNav) {
          const filtradas = listaComFotos.filter((dup) => dup.igrejaId === igrejaIdDaNav);
          setIgrejaSelecionadaId(igrejaIdDaNav);
          setDuplas(filtradas);
          setDuplaSelecionada(filtradas.length > 0 ? filtradas[0] : null);
          // Limpar o state para não reaplicar ao trocar de tab
          navigate(location.pathname, { replace: true, state: {} });
        } else {
          setDuplas(listaComFotos);
          if (listaComFotos.length > 0) setDuplaSelecionada(listaComFotos[0]);
        }
      }
    }).catch((err) => {
      if (!ativo) return;
      setErro(err?.response?.data?.erro || 'Erro ao carregar dados.');
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, [distritoId]);

  // Filtrar duplas por igreja (sem nova chamada à API — usa cache)
  const handleSelecionarIgreja = (igrejaId) => {
    if (igrejaSelecionadaId === igrejaId) {
      // Deselecionar — mostrar todas as duplas do distrito
      setIgrejaSelecionadaId(null);
      setDuplas(todasDuplas);
      setDuplaSelecionada(todasDuplas.length > 0 ? todasDuplas[0] : null);
      return;
    }

    setIgrejaSelecionadaId(igrejaId);
    const filtradas = todasDuplas.filter((d) => d.igrejaId === igrejaId);
    setDuplas(filtradas);
    setDuplaSelecionada(filtradas.length > 0 ? filtradas[0] : null);
  };

  // Limpar filtro de igreja — exibe todas as duplas do distrito
  const limparFiltroIgreja = () => {
    setIgrejaSelecionadaId(null);
    setDuplas(todasDuplas);
    setDuplaSelecionada(todasDuplas.length > 0 ? todasDuplas[0] : null);
  };

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando distrito...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-500 font-medium">{erro}</p>
          <button
            type="button"
            onClick={() => navigate(voltarDestino)}
            className="btn-primary mt-4 text-sm"
          >
            {voltarLabel}
          </button>
        </div>
      </div>
    );
  }

  if (!distrito) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-red-500 font-medium">Distrito não encontrado.</p>
          <button
            type="button"
            onClick={() => navigate(voltarDestino)}
            className="btn-primary mt-4 text-sm"
          >
            {voltarLabel}
          </button>
        </div>
      </div>
    );
  }

  const igrejas = distrito.igrejas || [];
  const regiaoNome = distrito.regiao?.nome || '';
  const statusColors = { ATIVA: '#16a34a', PENDENTE: '#C9963A', INATIVA: '#9ca3af' };
  const statusLabels = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };

  // Nome da igreja filtrada (para exibir no cabeçalho da lista)
  const igrejaNomeFiltro = igrejaSelecionadaId
    ? igrejas.find((ig) => ig.id === igrejaSelecionadaId)?.nome
    : null;
  const statsIgrejaSelecionada = igrejaSelecionadaId
    ? duplasPorIgreja[igrejaSelecionadaId] || { total: duplas.length, ativas: 0, inativas: 0, pendentes: 0 }
    : null;

  return (
    <>
      <div className="flex h-full overflow-hidden animate-fade-in">
      {/* ===== PAINEL ESQUERDO: Info do Distrito + Lista de Duplas (Master) ===== */}
      <div className="w-full sm:w-80 lg:w-[340px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-full overflow-hidden">
        {/* ===== SEÇÃO SUPERIOR (comprime quando igreja está filtrada) ===== */}
        {igrejaSelecionadaId ? (
          /* ── Modo Filtrado: mostra apenas a igreja selecionada de forma compacta ── */
          <div className="flex-shrink-0 border-b border-gray-100">
            {/* Breadcrumb compacto */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
                <button type="button" onClick={() => navigate(voltarDestino)} className="hover:text-[#1A3A6B] transition-colors">
                  {isPastorDistrital ? 'Distritos' : 'Associação'}
                </button>
                <span className="text-gray-300">/</span>
                {!isPastorDistrital && (
                  <>
                    <button type="button" onClick={() => navigate('/direto/regioes')} className="hover:text-[#1A3A6B] transition-colors">{regiaoNome || 'Região'}</button>
                    <span className="text-gray-300">/</span>
                  </>
                )}
                <button type="button" onClick={limparFiltroIgreja} className="hover:text-[#1A3A6B] transition-colors">{distrito.nome}</button>
              </div>
            </div>

            {/* Igreja selecionada — barra compacta com botão para voltar */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 bg-[#C9963A]/8 border border-[#C9963A]/30 rounded-lg px-3 py-2">
                <div className="w-7 h-7 rounded-lg bg-[#C9963A]/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[#C9963A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M12 3v8m0 0l-3-3m3 3l3-3" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-[#C9963A]">Igreja selecionada</p>
                  <p className="text-xs font-bold text-[#1A3A6B] truncate">{igrejaNomeFiltro}</p>
                </div>
                <button
                  type="button"
                  onClick={limparFiltroIgreja}
                  className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#1A3A6B] hover:border-[#1A3A6B]/40 transition-all"
                  title="Voltar para todas as igrejas"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Cabeçalho da lista de duplas */}
            <div className="px-4 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Duplas da Igreja
                    <span className="block text-[10px] text-[#1A3A6B] normal-case tracking-normal truncate">
                      Total {statsIgrejaSelecionada?.total ?? duplas.length} - Ativas {statsIgrejaSelecionada?.ativas ?? 0} - Inativas {statsIgrejaSelecionada?.inativas ?? 0}
                    </span>
                  </p>
                  <p className="text-[10px] text-[#C9963A] font-semibold truncate">{igrejaNomeFiltro} • {duplas.length} dupla{duplas.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Modo Normal: mostra toda a info do distrito + igrejas ── */
          <div className="flex-shrink-0 border-b border-gray-100 overflow-y-auto" style={{ maxHeight: '60%' }}>
            {/* Breadcrumb */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
                <button type="button" onClick={() => navigate(voltarDestino)} className="hover:text-[#1A3A6B] transition-colors">
                  {isPastorDistrital ? 'Distritos' : 'Associação'}
                </button>
                <span className="text-gray-300">/</span>
                {!isPastorDistrital && (
                  <>
                    <button type="button" onClick={() => navigate('/direto/regioes')} className="hover:text-[#1A3A6B] transition-colors">{regiaoNome || 'Região'}</button>
                    <span className="text-gray-300">/</span>
                  </>
                )}
                <span className="text-[#1A3A6B] font-semibold">{distrito.nome}</span>
              </div>
            </div>

            {/* Info do distrito — compacta */}
            <div className="px-4 pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center shadow-md flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h1 className="text-base font-bold text-[#1A3A6B] truncate" style={{ fontFamily: 'Georgia, serif' }}>
                    {distrito.nome}
                  </h1>
                  <p className="text-gray-400 text-[10px]">
                    {regiaoNome && `Região ${regiaoNome} •`} {igrejas.length} igrejas • {todasDuplas.length} duplas • {(distrito.membros || 0).toLocaleString('pt-BR')} membros
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Igrejas do Distrito</p>
                {igrejas.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2">
                    {igrejas.map((ig) => {
                      const stats = duplasPorIgreja[ig.id] || { total: 0, ativas: 0, inativas: 0, pendentes: 0 };
                      const qtdDuplas = stats.total;
                      const isAtiva = igrejaSelecionadaId === ig.id;
                      return (
                        <button
                          type="button"
                          key={ig.id}
                          onClick={() => handleSelecionarIgreja(ig.id)}
                          className={`w-full text-left rounded-lg border px-3 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-[#C9963A]/30 ${
                            isAtiva
                              ? 'border-[#C9963A]/60 bg-[#C9963A]/5 shadow-sm'
                              : 'border-gray-100 bg-[#F4F5F7] hover:border-[#C9963A]/40 hover:bg-white hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${isAtiva ? 'bg-[#C9963A]/20' : 'bg-[#1A3A6B]/10'}`}>
                              <svg className={`w-4 h-4 ${isAtiva ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21v-8a2 2 0 012-2h14a2 2 0 012 2v8M12 3v8m0 0l-3-3m3 3l3-3" />
                              </svg>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold truncate ${isAtiva ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`} title={ig.nome}>{ig.nome}</p>
                              <p className="text-[10px] text-gray-400">{(ig.membros || 0).toLocaleString('pt-BR')} membros</p>
                              <p className="text-[9px] text-gray-500 mt-0.5">
                                {qtdDuplas} duplas - {stats.ativas} ativas - {stats.inativas} inativas
                              </p>
                            </div>
                            {/* Badge de duplas */}
                            <div className={`flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold ${isAtiva ? 'bg-[#C9963A] text-white' : 'bg-[#1A3A6B]/10 text-[#1A3A6B]'}`}>
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {qtdDuplas}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-100 bg-[#F4F5F7] px-3 py-3 text-center text-[11px] text-gray-400">
                    Nenhuma igreja cadastrada.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setEditandoPastor(true)}
                  title="Abrir cadastro do pastor distrital"
                  className="group mt-3 w-full text-left rounded-lg border border-gray-100 bg-white p-3 hover:border-[#C9963A]/50 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <FotoPessoa
                      src={fotoPastorPreview}
                      nome={distrito.nomePastor}
                      className="w-12 h-12 rounded-xl shadow-sm"
                      fallbackClassName="bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] text-sm"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9963A]">Pastor responsável</p>
                      <p className="text-sm font-bold text-[#1A3A6B] truncate">{distrito.nomePastor || 'Nao informado'}</p>
                      <p className="text-[11px] text-gray-400 truncate">{distrito.cargoPastor || 'Pastor Distrital'}</p>
                      <p className="text-[10px] font-semibold text-[#1A3A6B] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver e editar cadastro
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Cabeçalho da seção de duplas — modo normal */}
            <div className="px-4 pt-2 pb-2 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Duplas do Distrito</p>
            </div>
          </div>
        )}

        {/* Lista de duplas — sempre visível e scrollável */}
        <div className="flex-1 overflow-y-auto">
          {duplas.map((dupla) => {
                const selecionada = duplaSelecionada?.id === dupla.id;
                const cor = statusColors[dupla.status] || '#9ca3af';

                return (
                  <button
                    type="button"
                    key={dupla.id}
                    onClick={() => setDuplaSelecionada(dupla)}
                    className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                      selecionada
                        ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]'
                        : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
                    }`}
                  >
                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Fotos lado a lado, mesmo tamanho */}
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
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs font-semibold truncate transition-colors ${selecionada ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                              {dupla.liderNome || 'Sem nome'}
                            </p>
                            <p className={`text-[10px] font-medium truncate transition-colors ${selecionada ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>+ {dupla.membro2Nome || 'Sem nome'}</p>
                            
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md border border-gray-200 text-gray-500 whitespace-nowrap">
                                {getClassificacaoAtividadeDisplayText(dupla)}
                              </span>
                              {getEstudosCount(dupla) > 0 ? (
                                <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md bg-[#16a34a]/10 text-[#16a34a] whitespace-nowrap">
                                  📖 {dupla._count?.estudosBiblicos ?? 0} {((dupla._count?.estudosBiblicos ?? 0) === 1) ? 'estudo bíblico' : 'estudos bíblicos'}
                                </span>
                              ) : (
                                <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${temEstudoNaoRegistrado(dupla) ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                                  {temEstudoNaoRegistrado(dupla) ? 'Tem estudo, mas não registrou' : 'Sem estudo bíblico'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex-shrink-0">
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ backgroundColor: cor + '20', color: cor }}
                          >
                            {statusLabels[dupla.status] || dupla.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {duplas.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2 animate-float">👥</div>
                  <p className="text-sm">
                    {igrejaSelecionadaId
                      ? 'Nenhuma dupla nesta igreja.'
                      : 'Nenhuma dupla neste distrito.'}
                  </p>
                  {!igrejaSelecionadaId && (
                    <button
                      type="button"
                      onClick={() => navigate('/direto/duplas/nova')}
                      className="btn-primary mt-4 text-xs px-4 py-2"
                    >
                      Cadastrar dupla
                    </button>
                  )}
                </div>
              )}
        </div>

        <div className="flex-shrink-0 p-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => navigate('/direto/duplas/nova')}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Dupla
          </button>
        </div>
      </div>

      {/* ===== PAINEL DIREITO: Detalhes da Dupla (Detail) ===== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F4F5F7]">
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
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center gap-3">
                {/* Fotos lado a lado no cabeçalho */}
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
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                      {duplaSelecionada.liderNome || 'Sem nome'}
                    </h2>
                    <span className="text-gray-300">+</span>
                    <h2 className="text-lg font-bold text-[#1A3A6B]">
                      {duplaSelecionada.membro2Nome || 'Sem nome'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
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
                    <span className="text-[10px] text-gray-400">{duplaSelecionada.bairro || 'Sem bairro'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Conteúdo do detail — painel de cards com quebra responsiva */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 items-start">
                {/* Card: Membro 1 */}
                <div className="w-full bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-[10px] font-bold">1</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Membro 1</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-gray-400 text-xs">Nome:</span><p className="text-gray-700 font-medium">{duplaSelecionada.liderNome || '—'}</p></div>
                    {duplaSelecionada.liderTelefone && <div><span className="text-gray-400 text-xs">WhatsApp:</span><WhatsAppLink numero={duplaSelecionada.liderTelefone} /></div>}
                    {duplaSelecionada.liderEmail && <div><span className="text-gray-400 text-xs">E-mail:</span><p className="text-gray-700">{duplaSelecionada.liderEmail}</p></div>}
                    <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.liderIgreja || duplaSelecionada.igreja?.nome || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Distrito:</span><p className="text-gray-700">{duplaSelecionada.liderDistrito || duplaSelecionada.distrito?.nome || distrito.nome || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Data de nascimento:</span><p className="text-gray-700">{formatarData(duplaSelecionada.liderDataNascimento) || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Endereco de correspondencia:</span><p className="text-gray-700 break-words">{duplaSelecionada.liderEndereco || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Data de batismo:</span><p className="text-gray-700">{formatarData(duplaSelecionada.liderDataBatismo) || '—'}</p></div>
                  </div>
                </div>

                {/* Card: Membro 2 */}
                <div className="w-full bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Membro 2</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-gray-400 text-xs">Nome:</span><p className="text-gray-700 font-medium">{duplaSelecionada.membro2Nome || '—'}</p></div>
                    {duplaSelecionada.membro2Telefone && <div><span className="text-gray-400 text-xs">WhatsApp:</span><WhatsAppLink numero={duplaSelecionada.membro2Telefone} /></div>}
                    {duplaSelecionada.membro2Email && <div><span className="text-gray-400 text-xs">E-mail:</span><p className="text-gray-700">{duplaSelecionada.membro2Email}</p></div>}
                    <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.membro2Igreja || duplaSelecionada.igreja?.nome || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Distrito:</span><p className="text-gray-700">{duplaSelecionada.membro2Distrito || duplaSelecionada.distrito?.nome || distrito.nome || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Data de nascimento:</span><p className="text-gray-700">{formatarData(duplaSelecionada.membro2DataNascimento) || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Endereco de correspondencia:</span><p className="text-gray-700 break-words">{duplaSelecionada.membro2Endereco || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Data de batismo:</span><p className="text-gray-700">{formatarData(duplaSelecionada.membro2DataBatismo) || '—'}</p></div>
                  </div>
                </div>

                {/* Card: Projeto */}
                <div className="w-full sm:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📋</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Projeto</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-gray-400 text-xs">Tipo:</span><p className="text-gray-700 font-medium">{duplaSelecionada.tipoProjeto?.replace(/_/g, ' ') || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Classe da dupla:</span><p className="text-gray-700 font-semibold">{getClassificacaoAtividadeDisplayText(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Estudos biblicos:</span><p className="text-gray-700 font-medium">{getEstudosCount(duplaSelecionada)}</p></div>
                    <div><span className="text-gray-400 text-xs">Visitacoes:</span><p className="text-gray-700 font-medium">{getVisitacoesCount(duplaSelecionada)}</p></div>
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

                {/* Card: Localização */}
                <div className="w-full bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📍</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Localização</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    {duplaSelecionada.igreja?.nome && <div><span className="text-gray-400 text-xs">Igreja:</span><p className="text-gray-700">{duplaSelecionada.igreja.nome}</p></div>}
                    <div><span className="text-gray-400 text-xs">Bairro:</span><p className="text-gray-700 font-medium">{duplaSelecionada.bairro || '—'}</p></div>
                    {duplaSelecionada.dataInicio && <div><span className="text-gray-400 text-xs">Início:</span><p className="text-gray-700">{new Date(duplaSelecionada.dataInicio).toLocaleDateString('pt-BR')}</p></div>}
                  </div>
                </div>

                {/* Card: Observações */}
                <div className="w-full sm:row-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs font-bold text-[#1A3A6B]">AC</div>
                    <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Acompanhamento</h4>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div><span className="text-gray-400 text-xs">Estudo biblico:</span><p className="text-gray-700 font-medium">{duplaSelecionada.estudoBiblico || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Status do estudo:</span><p className="text-gray-700 font-medium">{statusAcompanhamentoLabels[duplaSelecionada.statusEstudoBiblico] || duplaSelecionada.statusEstudoBiblico || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Status da classe bíblica:</span><p className="text-gray-700 font-medium">{statusAcompanhamentoLabels[duplaSelecionada.statusEvangelismo] || duplaSelecionada.statusEvangelismo || '—'}</p></div>
                    <div><span className="text-gray-400 text-xs">Levou pessoa ao batismo?</span><p className="text-gray-700 font-medium">{boolLabel(duplaSelecionada.levouPessoaBatismo)}</p></div>
                    <div><span className="text-gray-400 text-xs">Ja deu estudo biblico?</span><p className="text-gray-700 font-medium">{boolLabel(duplaSelecionada.jaDeuEstudoBiblico)}</p></div>
                    <div><span className="text-gray-400 text-xs">Estudo em andamento?</span><p className="text-gray-700 font-medium">{boolLabel(duplaSelecionada.estudoAtualEmAndamento)}</p></div>
                    <div><span className="text-gray-400 text-xs">Batismos:</span><p className="text-gray-700 font-medium">{duplaSelecionada.batismos ?? 0}</p></div>
                    <div><span className="text-gray-400 text-xs">Ultimo acompanhamento:</span><p className="text-gray-700 font-medium">{formatarData(duplaSelecionada.ultimoAcompanhamento) || '—'}</p></div>
                  </div>
                </div>

                {/* Card: Estudos Bíblicos */}
                <div className="w-full bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#16a34a]/10 flex items-center justify-center text-xs">📖</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Estudos Bíblicos</h4>
                    </div>
                    <span className="text-xs font-bold text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded-md">
                      {duplaSelecionada.estudosBiblicos?.length || 0}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    {(!duplaSelecionada.estudosBiblicos || duplaSelecionada.estudosBiblicos.length === 0) ? (
                      <p className="text-sm text-gray-400 mt-2">
                        {temEstudoNaoRegistrado(duplaSelecionada) ? 'Tem estudo, mas não registrou o cadastro do estudo bíblico.' : 'Nenhum estudo bíblico registrado para esta dupla.'}
                      </p>
                    ) : (
                      <div className="space-y-2 mt-1 max-h-[300px] overflow-y-auto pr-1">
                        {duplaSelecionada.estudosBiblicos.map((estudo) => (
                          <div 
                            key={estudo.id} 
                            className="p-3 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:border-[#16a34a]/30 hover:bg-[#16a34a]/5 transition-colors group"
                            title={`Série: ${estudo.serie || 'Não informada'}\nDia: ${estudo.diaEstudo || '-'}\nHorário: ${estudo.horarioEstudo || '-'}`}
                            onClick={() => setEstudoSelecionado(estudo)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-bold text-[#1A3A6B] group-hover:text-[#16a34a] truncate transition-colors">{estudo.nomeEstudante}</p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{estudo.endereco || 'Endereço não informado'}</p>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                               <span className="text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 px-1.5 py-0.5 rounded">
                                 {estudo.sexo === 'M' || estudo.sexo === 'MASCULINO' ? 'Masculino' : (estudo.sexo === 'F' || estudo.sexo === 'FEMININO' ? 'Feminino' : 'S/ Sexo')}
                               </span>
                               <span className="text-[10px] font-semibold text-[#16a34a] bg-[#16a34a]/10 px-1.5 py-0.5 rounded">
                                 {estudo.classificacaoInteressado || 'Estudando'}
                               </span>
                            </div>
                            {estudo.observacoes && (
                              <div className="mt-2 rounded-lg border border-[#C9963A]/20 bg-[#C9963A]/10 px-2.5 py-2">
                                <div className="flex items-start gap-2">
                                  <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-[#C9963A]">Obs.</span>
                                  <p
                                    className="text-[11px] leading-snug text-gray-600"
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {estudo.observacoes}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {duplaSelecionada.observacoes && (
                  <div className="w-full bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-7 h-7 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📝</div>
                      <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Observações</h4>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{duplaSelecionada.observacoes}</p>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/direto/duplas/${duplaSelecionada.id}/editar`)}
                  className="btn-outline text-sm px-4 py-2"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/direto/duplas/${duplaSelecionada.id}`)}
                  className="btn-primary text-sm px-4 py-2"
                >
                  Ver detalhes completos
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>

    {editandoPastor && distrito && (
      <ModalPastorDistrital
        distrito={distrito}
        fotoPreview={fotoPastorPreview}
        onClose={() => setEditandoPastor(false)}
        onSaved={atualizarPastorDistrital}
      />
    )}

    {/* Modal: Foto Ampliada */}
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

    {/* Modal: Estudo Bíblico Detalhes */}
    {estudoSelecionado && (
      <div
        className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        onClick={() => setEstudoSelecionado(null)}
      >
        <div
          className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setEstudoSelecionado(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#16a34a]/10 flex items-center justify-center text-xl shadow-sm">📖</div>
            <div>
              <h2 className="text-lg font-bold text-[#1A3A6B]">{estudoSelecionado.nomeEstudante}</h2>
              <p className="text-xs text-gray-500">{estudoSelecionado.whatsapp || 'Sem telefone cadastrado'}</p>
            </div>
          </div>
          <div className="space-y-4 text-sm">
            <div><span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Endereço</span><p className="font-medium text-gray-700">{estudoSelecionado.endereco || '—'}, {estudoSelecionado.cidade || ''} - {estudoSelecionado.estado || ''}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Início</span><p className="font-medium text-gray-700">{formatarData(estudoSelecionado.criadoEm)}</p></div>
              <div><span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Dia do Estudo</span><p className="font-medium text-gray-700">{estudoSelecionado.diaEstudo || '—'}</p></div>
              <div><span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Horário</span><p className="font-medium text-gray-700">{estudoSelecionado.horarioEstudo || '—'}</p></div>
              <div><span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Classificação</span><p className="font-medium text-[#16a34a]">{estudoSelecionado.classificacaoInteressado || '—'}</p></div>
              <div><span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Série/Lição</span><p className="font-medium text-gray-700">{estudoSelecionado.serie ? `${estudoSelecionado.serie} (Lição ${estudoSelecionado.licaoAtual || 0})` : '—'}</p></div>
              <div><span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-0.5">Sexo</span><p className="font-medium text-gray-700">{estudoSelecionado.sexo === 'M' || estudoSelecionado.sexo === 'MASCULINO' ? 'Masculino' : (estudoSelecionado.sexo === 'F' || estudoSelecionado.sexo === 'FEMININO' ? 'Feminino' : '—')}</p></div>
            </div>
            {estudoSelecionado.observacoes && (
              <div className="mt-2"><span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Observações</span><p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">{estudoSelecionado.observacoes}</p></div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
            <button onClick={() => navigate(`/cadastro/estudos-biblicos`)} className="text-sm font-bold text-[#16a34a] hover:text-[#15803d] transition flex items-center gap-1">
              Gerenciar estudos bíblicos 
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
