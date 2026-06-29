import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { PERFIS, useAuth } from '../../contexts/AuthContext';

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

export default function RelatoriosDireto() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const isPastorDistrital = usuario?.perfil === PERFIS.PASTOR_DISTRITAL;
  const [resumo, setResumo] = useState(null);
  const [porRegiao, setPorRegiao] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // 'GERAL' ou o id da regiao
  const [selecionado, setSelecionado] = useState('GERAL');
  const [mostraDetalhe, setMostraDetalhe] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/relatorios/resumo'),
      api.get('/relatorios/por-regiao'),
    ]).then(([r, pr]) => {
      setResumo(r.data);
      setPorRegiao(pr.data);
    }).finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
          </div>
          <p className="text-gray-400 text-sm animate-pulse">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  const regiaoSelecionada = porRegiao.find(r => r.id === selecionado);

  return (
    <div className="flex h-full overflow-hidden animate-fade-in">
      {/* ===== PAINEL ESQUERDO: Menu Master ===== */}
      <div className={`${
        mostraDetalhe ? 'hidden sm:flex' : 'flex'
      } w-full sm:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 bg-white flex-col h-full overflow-y-auto`}>
        {/* Cabeçalho do painel */}
        <div className="flex-shrink-0 p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
            <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider">Administração</p>
          </div>
          <h1 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Relatórios
          </h1>
          <p className="text-gray-400 text-[10px] mt-1">Selecione o nível de visualização</p>
        </div>

        {/* Lista Master */}
        <div className="flex-1">
          {/* Item: Associação Geral */}
          <button
            type="button"
            onClick={() => { setSelecionado('GERAL'); setMostraDetalhe(true); }}
            className={`w-full text-left transition-all duration-200 border-l-[3px] ${
              selecionado === 'GERAL'
                ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]'
                : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
            }`}
          >
            <div className="px-4 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-lg bg-[#1A3A6B] flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${selecionado === 'GERAL' ? 'scale-110' : ''}`}>
                  <span className="text-xl">🌎</span>
                </div>
                <div className="min-w-0">
                  <h2 className={`text-sm font-bold truncate transition-colors duration-200 ${selecionado === 'GERAL' ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                    Associação Paulistana
                  </h2>
                  <p className="text-gray-400 text-[10px] uppercase tracking-wide mt-0.5">Visão Global</p>
                </div>
              </div>
            </div>
          </button>

          <div className="px-4 py-3 bg-gray-50/50 border-y border-gray-100">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Por Região</h3>
          </div>

          {/* Itens: Regiões */}
          {porRegiao.map((regiao) => {
            const isSel = selecionado === regiao.id;
            return (
              <button
                type="button"
                key={regiao.id}
                onClick={() => { setSelecionado(regiao.id); setMostraDetalhe(true); }}
                className={`w-full text-left transition-all duration-200 border-l-[3px] ${
                  isSel
                    ? 'bg-[#1A3A6B]/5 border-l-[#C9963A]'
                    : 'bg-white border-l-transparent hover:bg-gray-50 hover:border-l-gray-300'
                }`}
              >
                <div className="px-4 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform duration-200 shadow-sm ${isSel ? 'scale-110' : ''}`} style={{ background: `linear-gradient(135deg, ${regiao.cor}, ${regiao.cor}cc)` }}>
                      <span className="text-white text-lg font-bold">{regiao.nome.split(' ').pop()}</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className={`text-sm font-semibold truncate transition-colors duration-200 ${isSel ? 'text-[#C9963A]' : 'text-[#1A3A6B]'}`}>
                        {regiao.nome}
                      </h2>
                      <p className="text-gray-400 text-[10px] uppercase tracking-wide mt-0.5">
                        {regiao.totalDistritos} distritos • {regiao.totalDuplas} duplas
                      </p>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== PAINEL DIREITO: Detalhes do Relatório (Detail) ===== */}
      <div className={`${
        mostraDetalhe ? 'flex' : 'hidden sm:flex'
      } flex-1 flex-col h-full overflow-hidden bg-[#F4F5F7]`}>
        {selecionado === 'GERAL' ? (
          /* RELATÓRIO GERAL */
          <div className="flex flex-col h-full animate-slide-in-right">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm">
              {/* Botão voltar (mobile) */}
              <button
                type="button"
                onClick={() => setMostraDetalhe(false)}
                className="sm:hidden flex items-center gap-1.5 text-xs text-[#1A3A6B] font-semibold mb-3 hover:text-[#C9963A] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider mb-1">Relatório Global</p>
              <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                Associação Paulistana
              </h2>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6">
              <div className="flex gap-4 min-w-max">
                
                {/* Painel: Indicadores */}
                <div className="w-[340px] flex-shrink-0 space-y-3">
                  <h2 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-widest px-1">Indicadores Principais</h2>
                  {[
                    { label: 'Total de Duplas', valor: resumo.totalDuplas, icon: '✝️', gradient: 'from-[#1A3A6B] to-[#2a5298]', cor: '#1A3A6B' },
                    { label: 'Duplas Ativas', valor: resumo.totalAtivas, icon: '✅', gradient: 'from-[#16a34a] to-[#22c55e]', cor: '#16a34a' },
                    { label: 'Duplas com Estudo Ativo', valor: resumo.estudosAtivos, icon: '📖', gradient: 'from-[#0284c7] to-[#0ea5e9]', cor: '#0284c7', detalhe: 'Duplas cujo status do estudo biblico esta ATIVO.' },
                    { label: 'Classes Bíblicas Ativas', valor: resumo.evangelismosAtivos, icon: '📢', gradient: 'from-[#ea580c] to-[#f97316]', cor: '#ea580c' },
                    { label: 'Batismos Realizados', valor: resumo.totalBatismos, icon: '💧', gradient: 'from-[#0d9488] to-[#14b8a6]', cor: '#0d9488' },
                    { label: 'Metas de contatos', valor: resumo.totalPessoasAlcancadas, icon: '🙏', gradient: 'from-[#7B2D8B] to-[#9333ea]', cor: '#7B2D8B' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="smart-tooltip bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300"
                      data-tooltip={item.detalhe || `${item.label}: total consolidado no relatorio global.`}
                      tabIndex={0}
                      style={{ borderLeft: `3px solid ${item.cor}` }}
                    >
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-lg shadow-md flex-shrink-0`}>{item.icon}</div>
                      <div>
                        <p className="text-xl font-bold" style={{ color: item.cor }}>{item.valor}</p>
                        <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {resumo?.classesBiblicas && (
                  <div className="w-[380px] flex-shrink-0 space-y-3">
                    <h2 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-widest px-1">Classe Bíblica</h2>
                    {['A', 'B', 'C'].map((classe) => (
                      <div key={classe} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold text-[#1A3A6B]">Estudos Classe {classe}</p>
                          <span
                            className="smart-tooltip text-xl font-bold text-[#C9963A]"
                            data-tooltip={`Classe ${classe}: total de estudantes em igrejas classificadas nesta faixa.`}
                            tabIndex={0}
                          >{resumo.classesBiblicas[classe]?.total || 0}</span>
                        </div>
                        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                          {(resumo.classesBiblicas[classe]?.igrejas || []).map((igreja) => (
                            <div key={igreja.id || igreja.nome} className="flex items-center justify-between gap-3 text-xs">
                              <span className="text-gray-600 truncate">{igreja.nome}</span>
                              <span className="font-bold text-[#1A3A6B]">{igreja.total}</span>
                            </div>
                          ))}
                          {(resumo.classesBiblicas[classe]?.igrejas || []).length === 0 && (
                            <p className="text-xs text-gray-400">Nenhuma igreja nesta classe.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Painel: Distribuição por Projetos */}
                {resumo?.porProjeto?.length > 0 && (
                  <div className="w-[300px] flex-shrink-0 space-y-3">
                    <h2 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-widest px-1">Por Tipo de Projeto</h2>
                    {resumo.porProjeto.map((p) => {
                      const pct = Math.round((p._count.tipoProjeto / Math.max(resumo.totalDuplas, 1)) * 100);
                      return (
                        <div
                          key={p.tipoProjeto}
                          className="smart-tooltip bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:-translate-y-0.5 transition-all duration-300"
                          data-tooltip={`${projetoLabel[p.tipoProjeto]}: ${p._count.tipoProjeto} dupla(s), equivalente a ${pct}% do total.`}
                          tabIndex={0}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{projetoIcon[p.tipoProjeto]}</span>
                              <p className="text-sm font-semibold text-[#1A3A6B]">{projetoLabel[p.tipoProjeto]}</p>
                            </div>
                            <span className="text-[#1A3A6B] font-bold text-lg">{p._count.tipoProjeto}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-[#C9963A] to-[#e5b05a] rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1 font-medium">{pct}% do total</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                
              </div>
            </div>
          </div>
        ) : regiaoSelecionada ? (
          /* RELATÓRIO POR REGIÃO */
          <div className="flex flex-col h-full animate-slide-in-right">
            <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 shadow-sm flex items-center justify-between">
              <div>
                {/* Botão voltar (mobile) */}
                <button
                  type="button"
                  onClick={() => setMostraDetalhe(false)}
                  className="sm:hidden flex items-center gap-1.5 text-xs text-[#1A3A6B] font-semibold mb-3 hover:text-[#C9963A] transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Voltar
                </button>
                <p className="text-[#C9963A] text-xs font-semibold uppercase tracking-wider mb-1">Relatório Regional</p>
                <h2 className="text-xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
                  {regiaoSelecionada.nome}
                </h2>
              </div>
              {!isPastorDistrital && (
                <button onClick={() => navigate('/direto/regioes')} className="btn-outline text-xs px-3 py-1.5 flex items-center gap-1.5">
                  Ver Região Detalhada
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6">
              <div className="flex gap-4 min-w-max">
                
                {/* Painel: Indicadores */}
                <div className="w-[340px] flex-shrink-0 space-y-3">
                  <h2 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-widest px-1" style={{ color: regiaoSelecionada.cor }}>Indicadores</h2>
                  {[
                    { label: 'Total de Duplas', valor: regiaoSelecionada.totalDuplas, icon: '✝️' },
                    { label: 'Duplas Ativas', valor: regiaoSelecionada.ativas, icon: '✅' },
                    { label: 'Duplas com Estudo Ativo', valor: regiaoSelecionada.estudosAtivos, icon: '📖', detalhe: 'Duplas desta regiao cujo status do estudo biblico esta ATIVO.' },
                    { label: 'Classes Bíblicas Ativas', valor: regiaoSelecionada.evangelismosAtivos, icon: '📢' },
                    { label: 'Batismos Realizados', valor: regiaoSelecionada.totalBatismos, icon: '💧' },
                    { label: 'metas de contatos', valor: regiaoSelecionada.totalPessoas, icon: '🙏' },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="smart-tooltip bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-300"
                      data-tooltip={item.detalhe || `${item.label}: total consolidado nesta regiao.`}
                      tabIndex={0}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md flex-shrink-0" style={{ background: `linear-gradient(135deg, ${regiaoSelecionada.cor}, ${regiaoSelecionada.cor}cc)` }}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="text-xl font-bold text-gray-800">{item.valor}</p>
                        <p className="text-xs text-gray-500 font-medium">{item.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Painel: Performance dos Distritos */}
                <div className="w-[340px] flex-shrink-0 space-y-3">
                  <h2 className="text-xs font-bold text-[#1A3A6B] uppercase tracking-widest px-1">Top Distritos (Duplas)</h2>
                  {regiaoSelecionada.distritos.map((distrito, index) => {
                    const pct = Math.round((distrito.totalDuplas / Math.max(regiaoSelecionada.totalDuplas, 1)) * 100);
                    return (
                      <div
                        key={distrito.id}
                        className="smart-tooltip bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:-translate-y-0.5 transition-all duration-300 relative"
                        data-tooltip={`${distrito.nome}: ${distrito.totalDuplas} dupla(s), ${pct}% das duplas da regiao.`}
                        tabIndex={0}
                      >
                        {index === 0 && <div className="absolute top-0 right-0 w-10 h-10 bg-[#C9963A] transform translate-x-5 -translate-y-5 rotate-45" />}
                        {index === 0 && <span className="absolute top-1 right-1 text-[10px] text-white font-bold" title="1º Lugar">🏆</span>}
                        
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm font-semibold text-[#1A3A6B] truncate pr-4">{distrito.nome}</p>
                          <span className="text-gray-800 font-bold text-lg">{distrito.totalDuplas}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: regiaoSelecionada.cor }} />
                        </div>
                        <div className="flex justify-between items-center mt-1.5">
                          <p className="text-xs text-gray-400 font-medium">{pct}% da região</p>
                          <p className="text-xs text-gray-400 font-medium">🙏 {distrito.totalPessoas} pessoas</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
