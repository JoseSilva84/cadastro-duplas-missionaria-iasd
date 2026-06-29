import { useEffect, useState } from 'react';
import api from '../lib/api';

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

export default function Relatorios() {
  const [resumo, setResumo] = useState(null);
  const [porRegiao, setPorRegiao] = useState([]);
  const [carregando, setCarregando] = useState(true);

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
      <div className="flex items-center justify-center min-h-64">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Cabeçalho */}
      <div className="mb-8 animate-fade-in-down">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Administração</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Relatórios
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Visão geral do programa missionário da Associação Paulistana</p>
      </div>

      {/* KPIs gerais */}
      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8 stagger-children">
          {[
            { label: 'Total Duplas', valor: resumo.totalDuplas, cor: '#1A3A6B', icon: '✝️', gradient: 'from-[#1A3A6B] to-[#2a5298]', tooltip: 'Total de duplas missionarias cadastradas no sistema.' },
            { label: 'Ativas', valor: resumo.totalAtivas, cor: '#16a34a', icon: '✅', gradient: 'from-[#16a34a] to-[#22c55e]', tooltip: 'Ativas: duplas com status ATIVA.' },
            { label: 'Pendentes', valor: resumo.totalPendentes, cor: '#C9963A', icon: '⏳', gradient: 'from-[#C9963A] to-[#e5b05a]', tooltip: 'Pendentes: duplas que ainda aguardam validacao ou regularizacao.' },
            { label: 'Inativas', valor: resumo.totalInativas, cor: '#9ca3af', icon: '⏸️', gradient: 'from-gray-400 to-gray-500', tooltip: 'Inativas: duplas com status INATIVA.' },
            { label: 'Metas de Contatos', valor: resumo.totalPessoasAlcancadas, cor: '#7B2D8B', icon: '🙏', gradient: 'from-[#7B2D8B] to-[#9333ea]', tooltip: 'Metas de contatos: soma das pessoas alcancadas registradas pelas duplas.' },
          ].map((item) => (
            <div
              key={item.label}
              className="smart-tooltip card text-center p-4 sm:p-6 hover:-translate-y-1 transition-all duration-300 cursor-default group"
              data-tooltip={item.tooltip}
              tabIndex={0}
              style={{ borderTop: `3px solid ${item.cor}` }}
            >
              <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-xl sm:text-2xl mx-auto mb-3 shadow-md group-hover:scale-110 transition-transform duration-300`}>
                {item.icon}
              </div>
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: item.cor }}>{item.valor}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {resumo?.classesBiblicas && (
        <div className="card mb-6 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0d9488] to-[#14b8a6] flex items-center justify-center text-white text-sm shadow-sm">CB</div>
            <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Classe Bíblica
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['A', 'B', 'C'].map((classe) => (
              <div key={classe} className="rounded-lg border border-gray-100 bg-[#F4F5F7] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-[#1A3A6B]">Estudos Classe {classe}</p>
                  <span
                    className="smart-tooltip text-xl font-bold text-[#C9963A]"
                    data-tooltip={`Classe ${classe}: total de estudantes em igrejas classificadas nesta faixa.`}
                    tabIndex={0}
                  >{resumo.classesBiblicas[classe]?.total || 0}</span>
                </div>
                <div className="space-y-2">
                  {(resumo.classesBiblicas[classe]?.igrejas || []).slice(0, 8).map((igreja) => (
                    <div key={igreja.id || igreja.nome} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-600 truncate">{igreja.nome}</span>
                      <span className="font-bold text-[#1A3A6B]">{igreja.total}</span>
                    </div>
                  ))}
                  {(resumo.classesBiblicas[classe]?.igrejas || []).length === 0 && (
                    <p className="text-sm text-gray-400">Nenhuma igreja nesta classe.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela por Região */}
      <div className="card mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-sm shadow-sm">📊</div>
          <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            Distribuição por Região
          </h2>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#F4F5F7] to-[#F4F5F7]/80">
                <th className="text-left px-4 py-3.5 font-semibold text-gray-500 rounded-l-lg">Região</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-500">Distritos</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-500">Duplas</th>
                <th className="text-center px-4 py-3.5 font-semibold text-gray-500">Pessoas</th>
                <th className="text-left px-4 py-3.5 font-semibold text-gray-500 rounded-r-lg">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {porRegiao.map((r, i) => {
                const maxDuplas = Math.max(...porRegiao.map((x) => x.totalDuplas), 1);
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-[#1A3A6B]/[0.02] transition-colors duration-150" style={{ animationDelay: `${i * 60}ms` }}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: r.cor }} />
                        <span className="font-medium text-[#1A3A6B]">{r.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-600 font-medium">{r.totalDistritos}</td>
                    <td className="px-4 py-4 text-center font-bold text-[#1A3A6B]">{r.totalDuplas}</td>
                    <td className="px-4 py-4 text-center text-[#C9963A] font-semibold">{r.totalPessoas}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${(r.totalDuplas / maxDuplas) * 100}%`,
                              background: `linear-gradient(90deg, ${r.cor}, ${r.cor}cc)`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right font-medium">
                          {Math.round((r.totalDuplas / maxDuplas) * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Distribuição por tipo de projeto */}
      {resumo?.porProjeto?.length > 0 && (
        <div className="card animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#C9963A] to-[#e5b05a] flex items-center justify-center text-white text-sm shadow-sm">📋</div>
            <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Duplas por Tipo de Projeto
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
            {resumo.porProjeto.map((p) => {
              const total = resumo.totalDuplas || 1;
              const pct = Math.round((p._count.tipoProjeto / total) * 100);
              return (
                <div
                  key={p.tipoProjeto}
                  className="smart-tooltip bg-gradient-to-br from-[#F4F5F7] to-[#F4F5F7]/50 rounded-xl p-4 border border-gray-100 hover:border-[#1A3A6B]/20 hover:shadow-md transition-all duration-300 group"
                  data-tooltip={`${projetoLabel[p.tipoProjeto]}: ${p._count.tipoProjeto} dupla(s), equivalente a ${pct}% do total.`}
                  tabIndex={0}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{projetoIcon[p.tipoProjeto]}</span>
                      <p className="text-sm font-medium text-gray-700">{projetoLabel[p.tipoProjeto]}</p>
                    </div>
                    <span className="text-[#1A3A6B] font-bold text-lg">{p._count.tipoProjeto}</span>
                  </div>
                  <div className="h-2 bg-gray-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#C9963A] to-[#e5b05a] rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 font-medium">{pct}% do total</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
