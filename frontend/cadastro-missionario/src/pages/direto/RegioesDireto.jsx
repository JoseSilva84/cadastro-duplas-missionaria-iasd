import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { FotoService } from '../../foto.service';
import AvatarUpload from '../../components/AvatarUpload';
import { toast } from '../../lib/toast';
import { useAuth, PERFIS, ehAdmin } from '../../contexts/AuthContext';

const coresPadrao = ['#1A3A6B', '#C9963A', '#2D6A4F', '#7B2D8B', '#C44D34'];

const FotoConselheiro = ({ src, nome }) => {
  const inicial = (nome || '?').charAt(0).toUpperCase();
  if (src) return <img src={src} alt={nome || 'Conselheiro'} className="w-14 h-14 rounded-xl object-cover bg-gray-100 shadow-sm" />;
  return (
    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-lg font-bold shadow-sm">
      {inicial}
    </div>
  );
};

const valorDataInput = (valor) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toISOString().slice(0, 10);
};

const CampoCredencial = ({ label, children }) => (
  <label className="block">
    <span className="block text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">{label}</span>
    {children}
  </label>
);

const ModalPastorRegional = ({ regiao, fotoPreview, onClose, onSaved }) => {
  const [form, setForm] = useState(() => ({
    fotoConselheiro: fotoPreview || '',
    nomeConselheiro: regiao.nomeConselheiro || '',
    cargoConselheiro: regiao.cargoConselheiro || 'Pastor Departamental Regional',
    telefoneConselheiro: regiao.telefoneConselheiro || '',
    enderecoConselheiro: regiao.enderecoConselheiro || '',
    dataNascimentoConselheiro: valorDataInput(regiao.dataNascimentoConselheiro),
  }));
  const [salvando, setSalvando] = useState(false);

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const salvar = async (event) => {
    event.preventDefault();
    setSalvando(true);
    try {
      const fotoRef = await FotoService.salvarFotoPorReferencia('regiao', regiao.id, 'conselheiro', form.fotoConselheiro);
      const { data } = await api.patch(`/regioes/${regiao.id}`, {
        fotoConselheiro: fotoRef || null,
        nomeConselheiro: form.nomeConselheiro || null,
        cargoConselheiro: form.cargoConselheiro || 'Pastor Departamental Regional',
        telefoneConselheiro: form.telefoneConselheiro || null,
        enderecoConselheiro: form.enderecoConselheiro || null,
        dataNascimentoConselheiro: form.dataNascimentoConselheiro || null,
      });
      toast.success('Credenciais do pastor departamental regional atualizadas.');
      onSaved(data, form.fotoConselheiro);
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar pastor departamental regional.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-xl bg-white border border-gray-100 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
          <div>
            <p className="text-[#C9963A] text-xs font-bold uppercase tracking-wider">Credenciais</p>
            <h3 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Pastor Departamental Regional
            </h3>
            <p className="text-xs text-gray-400 mt-1">{regiao.nome}</p>
          </div>
          <button type="button" className="btn-outline text-sm" onClick={onClose}>Fechar</button>
        </div>

        <form onSubmit={salvar} className="p-5 bg-[#F4F5F7]">
          <div className="bg-white rounded-lg border border-gray-100 p-4">
            <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-5">
              <AvatarUpload value={form.fotoConselheiro} onChange={(valor) => set('fotoConselheiro', valor)} label="Foto" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <CampoCredencial label="Nome completo">
                    <input className="input-field" value={form.nomeConselheiro} onChange={(e) => set('nomeConselheiro', e.target.value)} placeholder="Nome do pastor departamental regional" />
                  </CampoCredencial>
                </div>
                <CampoCredencial label="Cargo">
                  <input className="input-field" value={form.cargoConselheiro} onChange={(e) => set('cargoConselheiro', e.target.value)} placeholder="Pastor Departamental Regional" />
                </CampoCredencial>
                <CampoCredencial label="WhatsApp">
                  <input className="input-field" value={form.telefoneConselheiro} onChange={(e) => set('telefoneConselheiro', e.target.value)} placeholder="(11) 99999-9999" />
                </CampoCredencial>
                <div className="sm:col-span-2">
                  <CampoCredencial label="Endereco">
                    <input className="input-field" value={form.enderecoConselheiro} onChange={(e) => set('enderecoConselheiro', e.target.value)} placeholder="Endereco residencial" />
                  </CampoCredencial>
                </div>
                <CampoCredencial label="Data de nascimento">
                  <input type="date" className="input-field" value={form.dataNascimentoConselheiro} onChange={(e) => set('dataNascimentoConselheiro', e.target.value)} />
                </CampoCredencial>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <button type="button" className="btn-outline" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar credenciais'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default function RegioesDireto() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const podeEditarPastorRegional = ehAdmin(usuario) || [PERFIS.PASTOR_REGIONAL, PERFIS.COORDENADOR_REGIONAL].includes(usuario?.perfil);
  const podeCriarDupla = ehAdmin(usuario) || [PERFIS.PASTOR_REGIONAL, PERFIS.PASTOR_DISTRITAL, PERFIS.COORDENADOR_REGIONAL].includes(usuario?.perfil);
  const [regioes, setRegioes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [porRegiao, setPorRegiao] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [regiaoSelecionada, setRegiaoSelecionada] = useState(null);
  const [distritosDetalhados, setDistritosDetalhados] = useState({});
  const [fotosConselheiro, setFotosConselheiro] = useState({});
  const [carregandoDistritos, setCarregandoDistritos] = useState(false);
  const [mostraDetalhe, setMostraDetalhe] = useState(false);
  const [editandoPastor, setEditandoPastor] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get('/regioes'),
      api.get('/relatorios/resumo'),
      api.get('/relatorios/por-regiao'),
    ]).then(([r, s, pr]) => {
      if (!ativo) return;
      setRegioes(r.data);
      setResumo(s.data);
      setPorRegiao(pr.data);
      r.data.forEach(async (regiao) => {
        const foto = await FotoService.resolverFotoParaPreview(regiao.fotoConselheiro).catch(() => '');
        if (ativo) {
          setFotosConselheiro((prev) => ({ ...prev, [regiao.id]: foto }));
        }
      });
      if (r.data.length > 0) {
        setRegiaoSelecionada(r.data[0]);
      }
    }).catch(() => {
      if (ativo) setCarregando(false);
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, []);

  async function selecionarRegiao(regiao) {
    setRegiaoSelecionada(regiao);
    setMostraDetalhe(true);
    setEditandoPastor(false);

    if (!distritosDetalhados[regiao.id]) {
      setCarregandoDistritos(true);
      try {
        const { data } = await api.get(`/regioes/${regiao.id}`);
        setDistritosDetalhados((prev) => ({
          ...prev,
          [regiao.id]: data.distritos || [],
        }));
      } catch {
        setDistritosDetalhados((prev) => ({
          ...prev,
          [regiao.id]: [],
        }));
      } finally {
        setCarregandoDistritos(false);
      }
    }
  }

  function getDistritos(regiao) {
    return distritosDetalhados[regiao.id] ?? regiao.distritos ?? [];
  }

  function atualizarPastorRegional(regiaoAtualizada, fotoPreview) {
    setRegiaoSelecionada((atual) => (atual?.id === regiaoAtualizada.id ? { ...atual, ...regiaoAtualizada } : atual));
    setRegioes((atuais) => atuais.map((regiao) => (
      regiao.id === regiaoAtualizada.id ? { ...regiao, ...regiaoAtualizada } : regiao
    )));
    setFotosConselheiro((atuais) => ({ ...atuais, [regiaoAtualizada.id]: fotoPreview }));
    setEditandoPastor(false);
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando regiões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* ===== PAINEL ESQUERDO: Lista de Regiões (Master) ===== */}
      <div className={`${
        mostraDetalhe ? 'hidden sm:flex' : 'flex'
      } w-full sm:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 bg-white flex-col h-full overflow-y-auto`}>
        {/* Cabeçalho do painel */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Visão Geral</p>
          </div>
          <h1 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Regiões Missionárias
          </h1>

          {/* Indicadores gerais — compactos em linha */}
          {resumo && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {[
                { label: 'Duplas', valor: resumo.totalDuplas, cor: '#1A3A6B' },
                { label: 'Ativas', valor: resumo.totalAtivas, cor: '#16a34a' },
                { label: 'Pendentes', valor: resumo.totalPendentes, cor: '#C9963A' },
                { label: 'Alcançadas', valor: resumo.totalPessoasAlcancadas, cor: '#7B2D8B' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                  <span className="text-sm font-bold" style={{ color: item.cor }}>{item.valor}</span>
                  <span className="text-gray-400 text-[10px]">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista de regiões */}
        <div className="flex-1">
          {regioes.map((regiao, idx) => {
            const cor = regiao.cor || coresPadrao[idx % coresPadrao.length];
            const selecionada = regiaoSelecionada?.id === regiao.id;

            return (
              <button
                type="button"
                key={regiao.id}
                onClick={() => selecionarRegiao(regiao)}
                className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                  selecionada
                    ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]'
                    : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
                }`}
              >
                <div className="px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm transition-transform duration-200 ${selecionada ? 'scale-110' : ''}`}
                        style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}
                      >
                        {regiao.nome.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h2 className={`text-sm font-semibold truncate transition-colors duration-200 ${selecionada ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                          {regiao.nome}
                        </h2>
                        {regiao.descricao && (
                          <p className="text-gray-400 text-[10px] truncate">{regiao.descricao}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <div className="text-right">
                        <span className="text-sm font-bold" style={{ color: cor }}>{regiao.totalDistritos}</span>
                        <span className="text-gray-400 text-[10px] ml-0.5">dist.</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold" style={{ color: cor }}>{regiao.totalDuplas}</span>
                        <span className="text-gray-400 text-[10px] ml-0.0">dup.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {regioes.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3 animate-float">✝️</div>
              <p className="font-medium">Nenhuma região cadastrada.</p>
              <p className="text-xs mt-1">Execute o seed do banco de dados.</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== PAINEL DIREITO: Detalhes da Região (Detail) ===== */}
      <div className={`${
        mostraDetalhe ? 'flex' : 'hidden sm:flex'
      } flex-1 flex-col h-full overflow-hidden bg-[#F4F5F7]`}>
        {!regiaoSelecionada ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-float">👈</div>
              <p className="font-medium text-lg">Selecione uma região</p>
              <p className="text-sm mt-1">Clique em uma região à esquerda para ver os detalhes.</p>
            </div>
          </div>
        ) : (
          <div key={regiaoSelecionada.id} className="flex flex-col h-full animate-slide-in-right">
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
                Voltar às regiões
              </button>
              <div className="flex items-center gap-2 mb-1">
                {(() => {
                  const cor = regiaoSelecionada.cor || coresPadrao[regioes.findIndex(r => r.id === regiaoSelecionada.id) % coresPadrao.length];
                  return <div className="w-3 h-3 rounded-full" style={{ background: cor }} />;
                })()}
                <span className="text-gray-400 text-xs font-medium">Região selecionada</span>
              </div>
              <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                {regiaoSelecionada.nome}
              </h2>
              {regiaoSelecionada.descricao && (
                <p className="text-gray-400 text-xs mt-0.5">{regiaoSelecionada.descricao}</p>
              )}
            </div>

            {/* Conteúdo do detail — scroll horizontal se necessário */}
            <div className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6">
              <div className="mb-6 flex justify-start">
                <div
                  role={podeEditarPastorRegional ? 'button' : undefined}
                  tabIndex={podeEditarPastorRegional ? 0 : undefined}
                  onClick={() => {
                    if (podeEditarPastorRegional) setEditandoPastor(true);
                  }}
                  onKeyDown={(event) => {
                    if (podeEditarPastorRegional && (event.key === 'Enter' || event.key === ' ')) {
                      event.preventDefault();
                      setEditandoPastor(true);
                    }
                  }}
                  title={podeEditarPastorRegional ? 'Abrir credenciais do pastor departamental regional' : 'Pastor departamental regional'}
                  className={`group bg-white rounded-xl border border-gray-100 shadow-sm p-4 w-full sm:max-w-md text-left transition-all duration-200 ${
                    podeEditarPastorRegional
                      ? 'hover:border-[#C9963A]/50 hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                      : 'cursor-default'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <FotoConselheiro src={fotosConselheiro[regiaoSelecionada.id]} nome={regiaoSelecionada.nomeConselheiro} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#C9963A]">Pastor departamental regional</p>
                      <h3 className="text-base font-bold text-[#1A3A6B] truncate" style={{ fontFamily: 'Georgia, serif' }}>
                        {regiaoSelecionada.nomeConselheiro || 'Nao informado'}
                      </h3>
                      <p className="text-xs text-gray-400 truncate">{regiaoSelecionada.cargoConselheiro || 'Conselheiro Regional'}</p>
                      {podeEditarPastorRegional && (
                        <p className="text-[10px] font-semibold text-[#1A3A6B] mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          Ver e editar credenciais
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cards de resumo da região */}
              {(() => {
                const cor = regiaoSelecionada.cor || coresPadrao[regioes.findIndex(r => r.id === regiaoSelecionada.id) % coresPadrao.length];
                return (
                  <div className="flex gap-3 mb-6 min-w-0">
                    <button
                      type="button"
                      onClick={() => document.getElementById('distritos-grid')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}>
                        {regiaoSelecionada.totalDistritos}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium text-left">Distritos</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/direto/duplas')}
                      className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: `linear-gradient(135deg, ${cor}, ${cor}cc)` }}>
                        {regiaoSelecionada.totalDuplas}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium text-left">Duplas</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => document.getElementById('distritos-grid')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-[#16a34a] to-[#22c55e]">
                        {regiaoSelecionada.totalIgrejas || 0}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium text-left">Igrejas</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => document.getElementById('distritos-grid')?.scrollIntoView({ behavior: 'smooth' })}
                      className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br from-[#7B2D8B] to-[#9d4ebd]">
                        {getDistritos(regiaoSelecionada).reduce((acc, d) => acc + (d.membros || 0), 0).toLocaleString('pt-BR')}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium text-left">Membros</p>
                      </div>
                    </button>

                    {/* Botão extra: Ação Rápida */}
                    {podeCriarDupla && (
                    <button
                      type="button"
                      onClick={() => navigate(`/direto/duplas/nova`)}
                      className="bg-white rounded-xl px-4 py-3 shadow-sm flex items-center gap-3 flex-shrink-0 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer border border-[#1A3A6B]/10 hover:border-[#1A3A6B]/30 group"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[#1A3A6B]/10 text-[#1A3A6B] font-bold text-sm group-hover:bg-[#1A3A6B] group-hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-[#1A3A6B] font-bold text-left uppercase tracking-wider">Nova Dupla</p>
                        <p className="text-[10px] text-gray-400">Nesta região</p>
                      </div>
                    </button>
                    )}

                  </div>
                );
              })()}

              {/* Título da seção de distritos */}
              <div id="distritos-grid" className="flex items-center gap-2 mb-4 scroll-mt-6">
                <svg className="w-4 h-4 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="text-sm font-bold text-[#1A3A6B]">
                  Distritos de {regiaoSelecionada.nome}
                </h3>
              </div>

              {/* Loading de distritos */}
              {carregandoDistritos && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 rounded-full border-[3px] border-[#1A3A6B]/20">
                    <div className="w-8 h-8 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
                  </div>
                </div>
              )}

              {/* Grid de distritos — horizontal scroll se necessário */}
              {!carregandoDistritos && (
                <div className="flex gap-3 overflow-x-auto pb-2" style={{ minWidth: 0 }}>
                  {getDistritos(regiaoSelecionada).map((distrito) => (
                    <button
                      type="button"
                      key={distrito.id}
                      onClick={() => navigate(`/direto/distritos/${distrito.id}`)}
                      className="flex-shrink-0 w-64 text-left bg-white rounded-xl p-4 border border-gray-100 hover:border-[#1A3A6B]/20 hover:shadow-md transition-all duration-200 group/distrito"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1A3A6B]/10 to-[#1A3A6B]/5 flex items-center justify-center flex-shrink-0 group-hover/distrito:from-[#1A3A6B]/20 group-hover/distrito:to-[#1A3A6B]/10 transition-all duration-300">
                          <svg className="w-5 h-5 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-[#1A3A6B] text-sm group-hover/distrito:text-[#C9963A] transition-colors duration-200 truncate">
                          {distrito.nome}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full bg-[#1A3A6B]/10 flex items-center justify-center text-[8px]">⛪</span>
                          {(distrito.igrejas || []).length} igrejas
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full bg-[#C9963A]/10 flex items-center justify-center text-[8px]">👥</span>
                          {distrito._count?.duplas ?? 0} duplas
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3.5 h-3.5 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center text-[8px]">👨‍👩‍👧‍👦</span>
                          {(distrito.membros || 0).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#1A3A6B] group-hover/distrito:text-[#C9963A] group-hover/distrito:gap-2.5 transition-all duration-200">
                        <span>Ver duplas</span>
                        <svg className="w-3 h-3 group-hover/distrito:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {!carregandoDistritos && getDistritos(regiaoSelecionada).length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-3xl mb-2">🏛️</div>
                  <p className="text-sm">Nenhum distrito nesta região.</p>
                </div>
              )}

              {/* Dashboard da Região */}
              {!carregandoDistritos && (() => {
                const relatorioDaRegiao = porRegiao.find(r => r.id === regiaoSelecionada.id);
                if (!relatorioDaRegiao) return null;
                return (
                  <div className="mt-10 mb-4 animate-fade-in">
                    <div className="flex items-center gap-2 mb-4">
                      <svg className="w-4 h-4 text-[#1A3A6B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <h3 className="text-sm font-bold text-[#1A3A6B]">
                        Dashboard - {regiaoSelecionada.nome}
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span className="text-base">👥</span> Duplas Missionárias
                        </p>
                        <p className="text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{relatorioDaRegiao.totalDuplas}</p>
                        <div className="flex gap-2 mt-2 text-[9px] font-bold uppercase tracking-wider">
                          <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">{relatorioDaRegiao.ativas} ativas</span>
                          <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{relatorioDaRegiao.inativas} inativas</span>
                        </div>
                      </div>
                      
                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span className="text-base">📖</span> Estudos Bíblicos
                        </p>
                        <p className="text-3xl font-bold text-[#C9963A]" style={{ fontFamily: 'Georgia, serif' }}>{relatorioDaRegiao.estudosAtivos}</p>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">Duplas dando estudo agora</p>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span className="text-base">🙏</span> Pessoas Alcançadas
                        </p>
                        <p className="text-3xl font-bold text-[#2D6A4F]" style={{ fontFamily: 'Georgia, serif' }}>{relatorioDaRegiao.totalPessoas}</p>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">Contatos e interessados</p>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center hover:shadow-md transition-shadow">
                        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span className="text-base">💧</span> Batismos
                        </p>
                        <p className="text-3xl font-bold text-[#7B2D8B]" style={{ fontFamily: 'Georgia, serif' }}>{relatorioDaRegiao.totalBatismos}</p>
                        <p className="text-[10px] text-gray-400 mt-2 font-medium">Frutos das duplas</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
      {editandoPastor && regiaoSelecionada && (
        <ModalPastorRegional
          regiao={regiaoSelecionada}
          fotoPreview={fotosConselheiro[regiaoSelecionada.id]}
          onClose={() => setEditandoPastor(false)}
          onSaved={atualizarPastorRegional}
        />
      )}
    </div>
  );
}
