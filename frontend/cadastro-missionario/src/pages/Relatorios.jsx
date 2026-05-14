import { useEffect, useState } from 'react';
import api from '../lib/api';

const projetoLabel = {
  CASA_A_CASA: 'Casa em Casa',
  PEQUENOS_GRUPOS: 'Pequenos Grupos',
  ACAO_SOCIAL: 'Ação Social',
  MISSAO_COM_AMIGOS: 'Estudo Bíblico',
  EVANGELISMO_PUBLICO: 'Evangelismo Público',
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
        <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-6 sm:mb-8">
        <p className="text-[#C9963A] text-xs sm:text-sm font-semibold uppercase tracking-wider">Administração</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Relatórios
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm mt-1">Visão geral do programa missionário da Associação Paulistana</p>
      </div>

      {/* KPIs gerais */}
      {resumo && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total Duplas', valor: resumo.totalDuplas, cor: '#1A3A6B', bg: '#1A3A6B15' },
            { label: 'Ativas', valor: resumo.totalAtivas, cor: '#16a34a', bg: '#16a34a15' },
            { label: 'Pendentes', valor: resumo.totalPendentes, cor: '#C9963A', bg: '#C9963A15' },
            { label: 'Inativas', valor: resumo.totalInativas, cor: '#9ca3af', bg: '#9ca3af15' },
            { label: 'Pessoas Alcançadas', valor: resumo.totalPessoasAlcancadas, cor: '#7B2D8B', bg: '#7B2D8B15' },
          ].map((item, idx) => (
            <div
              key={item.label}
              className="card text-center p-3 sm:p-6"
              style={{ borderTop: `3px solid ${item.cor}`, gridColumn: idx === 4 ? 'span 2 / span 2' : 'auto' }}
            >
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: item.cor }}>{item.valor}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabela por Região */}
      <div className="card mb-6">
        <h2 className="text-lg font-bold text-[#1A3A6B] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          Distribuição por Região
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F4F5F7]">
                <th className="text-left px-4 py-3 font-semibold text-gray-600 rounded-l-lg">Região</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Distritos</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Duplas</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-600">Pessoas Alcançadas</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 rounded-r-lg">Progresso</th>
              </tr>
            </thead>
            <tbody>
              {porRegiao.map((r) => {
                const maxDuplas = Math.max(...porRegiao.map((x) => x.totalDuplas), 1);
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.cor }} />
                        <span className="font-medium text-[#1A3A6B]">{r.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-600">{r.totalDistritos}</td>
                    <td className="px-4 py-4 text-center font-bold text-[#1A3A6B]">{r.totalDuplas}</td>
                    <td className="px-4 py-4 text-center text-[#C9963A] font-semibold">{r.totalPessoas}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(r.totalDuplas / maxDuplas) * 100}%`,
                              backgroundColor: r.cor,
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-8 text-right">
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
        <div className="card">
          <h2 className="text-lg font-bold text-[#1A3A6B] mb-4" style={{ fontFamily: 'Georgia, serif' }}>
            Duplas por Tipo de Projeto
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {resumo.porProjeto.map((p) => {
              const total = resumo.totalDuplas || 1;
              const pct = Math.round((p._count.tipoProjeto / total) * 100);
              return (
                <div key={p.tipoProjeto} className="bg-[#F4F5F7] rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm font-medium text-gray-700">{projetoLabel[p.tipoProjeto]}</p>
                    <span className="text-[#1A3A6B] font-bold">{p._count.tipoProjeto}</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-[#C9963A] rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{pct}% do total</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
