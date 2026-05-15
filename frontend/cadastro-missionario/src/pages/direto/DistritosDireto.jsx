import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';

export default function DistritosDireto() {
  const { distritoId } = useParams();
  const navigate = useNavigate();
  const [distrito, setDistrito] = useState(null);
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [duplaExpandida, setDuplaExpandida] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      api.get(`/distritos/${distritoId}`),
      api.get('/duplas', { params: { distritoId } }),
    ]).then(([d, p]) => {
      if (!ativo) return;
      setDistrito(d.data);
      setDuplas(Array.isArray(p.data) ? p.data : []);
    }).catch((err) => {
      if (!ativo) return;
      setErro(err?.response?.data?.erro || 'Erro ao carregar dados.');
    }).finally(() => {
      if (ativo) setCarregando(false);
    });
    return () => { ativo = false; };
  }, [distritoId]);

  function toggleDupla(duplaId) {
    setDuplaExpandida((prev) => (prev === duplaId ? null : duplaId));
  }

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-64">
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
      <div className="p-6 text-center animate-fade-in">
        <div className="text-4xl mb-4">⚠️</div>
        <p className="text-red-500 font-medium">{erro}</p>
        <button
          type="button"
          onClick={() => navigate('/direto/regioes')}
          className="btn-primary mt-4 text-sm"
        >
          Voltar para Regiões
        </button>
      </div>
    );
  }

  if (!distrito) {
    return (
      <div className="p-6 text-center animate-fade-in">
        <div className="text-4xl mb-4">🔍</div>
        <p className="text-red-500 font-medium">Distrito não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate('/direto/regioes')}
          className="btn-primary mt-4 text-sm"
        >
          Voltar para Regiões
        </button>
      </div>
    );
  }

  const igrejas = distrito.igrejas || [];
  const regiaoNome = distrito.regiao?.nome || '';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-400 mb-6 flex-wrap animate-fade-in-down">
        <button type="button" onClick={() => navigate('/direto/regioes')} className="hover:text-[#1A3A6B] transition-colors">
          Regiões
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-[#1A3A6B] font-medium">{distrito.nome}</span>
      </div>

      {/* Cabeçalho do distrito */}
      <div className="card mb-6 animate-fade-in-down" style={{ animationDelay: '100ms' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                {distrito.nome}
              </h1>
              <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                {regiaoNome && `Região ${regiaoNome} •`} {igrejas.length} igrejas • {duplas.length} duplas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/duplas/nova')}
            className="btn-primary flex items-center gap-2 self-start"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova Dupla
          </button>
        </div>

        {/* Igrejas do distrito */}
        {igrejas.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Igrejas / Congregações</p>
            <div className="flex flex-wrap gap-2">
              {igrejas.map((ig) => (
                <span key={ig.id} className="inline-flex items-center gap-1.5 bg-[#1A3A6B]/5 text-[#1A3A6B] text-xs font-medium px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1A3A6B]/40" />
                  {ig.nome}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Master-Detail: Duplas do distrito */}
      <div className="space-y-3 stagger-children">
        {duplas.map((dupla) => {
          const expandido = duplaExpandida === dupla.id;
          const statusColors = { ATIVA: '#16a34a', PENDENTE: '#C9963A', INATIVA: '#9ca3af' };
          const statusLabels = { ATIVA: 'Ativa', PENDENTE: 'Pendente', INATIVA: 'Inativa' };
          const cor = statusColors[dupla.status] || '#9ca3af';

          return (
            <div
              key={dupla.id}
              className="rounded-2xl overflow-hidden bg-white shadow-md transition-all duration-300"
            >
              {/* Master: Dupla resumida */}
              <button
                type="button"
                onClick={() => toggleDupla(dupla.id)}
                className="w-full text-left group"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {(dupla.liderNome || '?').charAt(0)}
                          </div>
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white font-bold text-[10px] absolute -bottom-0.5 -right-1 border-2 border-white shadow-sm">
                            {(dupla.membro2Nome || '?').charAt(0)}
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[#1A3A6B] text-sm group-hover:text-[#C9963A] transition-colors duration-200 truncate">
                            {dupla.liderNome || 'Sem nome'}
                          </p>
                          <span className="text-gray-300 text-xs">+</span>
                          <p className="text-gray-600 text-sm truncate">{dupla.membro2Nome || 'Sem nome'}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: cor + '20', color: cor }}
                          >
                            {statusLabels[dupla.status] || dupla.status}
                          </span>
                          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            {dupla.bairro || 'Sem bairro'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {dupla.pessoasAlcancadas > 0 && (
                        <div className="hidden sm:flex flex-col items-center bg-gradient-to-b from-[#C9963A]/10 to-[#C9963A]/5 rounded-lg px-2.5 py-1">
                          <span className="text-sm font-bold text-[#C9963A]">{dupla.pessoasAlcancadas}</span>
                          <span className="text-[8px] text-gray-400 -mt-0.5">alcançadas</span>
                        </div>
                      )}
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${expandido ? 'bg-[#1A3A6B] text-white rotate-180' : 'bg-gray-100 text-gray-400 group-hover:bg-[#1A3A6B] group-hover:text-white'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Detail: Dados completos da dupla (expandido inline) */}
              {expandido && (
                <div className="border-t border-gray-100 bg-[#F4F5F7]/50 animate-fade-in">
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-[10px] font-bold">1</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Líder</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Nome:</span> <span className="text-gray-700 font-medium">{dupla.liderNome || '—'}</span></div>
                          {dupla.liderTelefone && <div><span className="text-gray-400 text-xs">Telefone:</span> <span className="text-gray-700">{dupla.liderTelefone}</span></div>}
                          {dupla.liderEmail && <div><span className="text-gray-400 text-xs">E-mail:</span> <span className="text-gray-700">{dupla.liderEmail}</span></div>}
                          {dupla.liderIgreja && <div><span className="text-gray-400 text-xs">Igreja:</span> <span className="text-gray-700">{dupla.liderIgreja}</span></div>}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-[10px] font-bold">2</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Parceiro</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Nome:</span> <span className="text-gray-700 font-medium">{dupla.membro2Nome || '—'}</span></div>
                          {dupla.membro2Telefone && <div><span className="text-gray-400 text-xs">Telefone:</span> <span className="text-gray-700">{dupla.membro2Telefone}</span></div>}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📍</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Localização</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          {dupla.igreja?.nome && <div><span className="text-gray-400 text-xs">Igreja:</span> <span className="text-gray-700">{dupla.igreja.nome}</span></div>}
                          <div><span className="text-gray-400 text-xs">Bairro:</span> <span className="text-gray-700 font-medium">{dupla.bairro || '—'}</span></div>
                          {dupla.dataInicio && <div><span className="text-gray-400 text-xs">Início:</span> <span className="text-gray-700">{new Date(dupla.dataInicio).toLocaleDateString('pt-BR')}</span></div>}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📋</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Projeto</h4>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div><span className="text-gray-400 text-xs">Tipo:</span> <span className="text-gray-700 font-medium">{dupla.tipoProjeto?.replace(/_/g, ' ') || '—'}</span></div>
                          <div><span className="text-gray-400 text-xs">Status:</span> <span className="font-semibold" style={{ color: cor }}>{statusLabels[dupla.status] || dupla.status}</span></div>
                          {dupla.pessoasAlcancadas > 0 && (
                            <div className="flex items-center gap-2 bg-[#C9963A]/10 rounded-lg px-3 py-2 mt-2">
                              <span className="text-lg">🙏</span>
                              <div>
                                <p className="text-[#C9963A] font-bold">{dupla.pessoasAlcancadas}</p>
                                <p className="text-gray-400 text-[10px]">pessoas alcançadas</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {dupla.observacoes && (
                      <div className="mt-4 bg-white rounded-xl p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-[#1A3A6B]/10 flex items-center justify-center text-xs">📝</div>
                          <h4 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-wide">Observações</h4>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{dupla.observacoes}</p>
                      </div>
                    )}

                    <div className="mt-4 flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/duplas/${dupla.id}/editar`)}
                        className="btn-outline text-sm px-4 py-2"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/duplas/${dupla.id}`)}
                        className="btn-primary text-sm px-4 py-2"
                      >
                        Ver detalhes completos
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {duplas.length === 0 && (
        <div className="text-center py-20 text-gray-400 animate-fade-in">
          <div className="text-5xl mb-4 animate-float">👥</div>
          <p className="font-medium text-lg">Nenhuma dupla neste distrito.</p>
          <button
            type="button"
            onClick={() => navigate('/duplas/nova')}
            className="btn-primary mt-6 text-sm px-5 py-2.5"
          >
            Cadastrar primeira dupla
          </button>
        </div>
      )}
    </div>
  );
}
