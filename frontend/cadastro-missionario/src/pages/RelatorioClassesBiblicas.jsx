import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';

const classes = [
  { id: 'A', titulo: 'Classe A', regra: '150 ou mais estudantes', cor: '#16a34a', bg: '#dcfce7' },
  { id: 'B', titulo: 'Classe B', regra: '67 a 149 estudantes', cor: '#C9963A', bg: '#fef3c7' },
  { id: 'C', titulo: 'Classe C', regra: '28 a 66 estudantes', cor: '#1A3A6B', bg: '#dbeafe' },
];

export default function RelatorioClassesBiblicas() {
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api.get('/relatorios/resumo')
      .then((res) => setDados(res.data.classesBiblicas || {}))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full min-h-64">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent border-t-[#1A3A6B] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Relatório</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Classes Bíblicas
        </h1>
        <p className="text-gray-400 text-sm mt-1">Igrejas agrupadas pelo total de estudantes em Classe Bíblica.</p>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6' : ''}>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {classes.map((classe) => {
            const grupo = dados?.[classe.id] || { total: 0, igrejas: [] };
            return (
              <section key={classe.id} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-visible">
                <div className="p-4 border-b border-gray-100" style={{ borderTop: `4px solid ${classe.cor}` }}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>{classe.titulo}</h2>
                      <p className="text-xs text-gray-400 mt-0.5">{classe.regra}</p>
                    </div>
                    <div
                      className="smart-tooltip text-right"
                      data-tooltip={`${classe.titulo}: ${classe.regra}. O total mostra estudantes somados nas igrejas desta faixa.`}
                      tabIndex={0}
                    >
                      <p className="text-2xl font-bold" style={{ color: classe.cor }}>{grupo.total || 0}</p>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">estudantes</p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-gray-50">
                  {grupo.igrejas.length === 0 ? (
                    <div className="p-5 text-sm text-gray-400">Nenhuma igreja nesta classe.</div>
                  ) : grupo.igrejas.map((igreja) => (
                    <div key={igreja.id || igreja.nome} className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <p className="font-semibold text-[#1A3A6B] truncate">{igreja.nome}</p>
                        <p className="text-xs text-gray-400">Classe {classe.id}</p>
                      </div>
                      <span
                        className="smart-tooltip px-2.5 py-1 rounded-full text-xs font-bold"
                        data-tooltip={`${igreja.nome}: total de estudantes considerados na Classe ${classe.id}.`}
                        tabIndex={0}
                        style={{ color: classe.cor, backgroundColor: classe.bg }}
                      >
                        {igreja.total} estudantes
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
