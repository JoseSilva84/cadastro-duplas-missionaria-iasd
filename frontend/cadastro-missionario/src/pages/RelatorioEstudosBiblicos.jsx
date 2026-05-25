import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../lib/api';
import { SERIES_ESTUDO, getLicaoLabel, getSerieNome } from '../lib/seriesEstudo';

const baixarCsv = (linhas) => {
  const cabecalho = ['Estudante', 'Cidade/Estado', 'WhatsApp', 'Serie', 'Licao Atual', 'Dupla', 'Dia do Estudo', 'Horario'];
  const corpo = linhas.map((item) => [
    item.nomeEstudante,
    `${item.cidade}/${item.estado}`,
    item.whatsapp,
    getSerieNome(item.serie),
    getLicaoLabel(item.serie, item.licaoAtual),
    `${item.dupla?.liderNome || ''} + ${item.dupla?.membro2Nome || ''}`.trim(),
    item.diaEstudo,
    item.horarioEstudo,
  ]);

  const csv = [cabecalho, ...corpo]
    .map((linha) => linha.map((valor) => `"${String(valor || '').replace(/"/g, '""')}"`).join(';'))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'relatorio-estudos-biblicos.csv';
  link.click();
  URL.revokeObjectURL(url);
};

export default function RelatorioEstudosBiblicos() {
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');
  const [resultado, setResultado] = useState({ total: 0, estudos: [], porSerie: [] });
  const [duplas, setDuplas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState({
    duplaId: '',
    serie: '',
    licaoAtual: '',
    cidade: '',
    dataInicio: '',
    dataFim: '',
  });

  const licoes = useMemo(() => (
    SERIES_ESTUDO.find((serie) => serie.id === filtros.serie)?.licoes || []
  ), [filtros.serie]);

  const carregar = () => {
    setCarregando(true);
    const params = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor));
    Promise.all([
      api.get('/relatorios/estudos-biblicos', { params }),
      api.get('/duplas'),
    ]).then(([relatorio, duplasRes]) => {
      setResultado(relatorio.data);
      setDuplas(Array.isArray(duplasRes.data) ? duplasRes.data : []);
    }).finally(() => setCarregando(false));
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor,
      ...(campo === 'serie' ? { licaoAtual: '' } : {}),
    }));
  };

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in bg-[#F4F5F7]' : 'p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in'}>
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8'}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Relatório</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Estudos Bíblicos
        </h1>
        <p className="text-gray-400 text-sm mt-1">{resultado.total} estudo(s) encontrado(s)</p>
      </div>

      <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6' : ''}>
        <div className="card mb-5">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            <select className="input-field" value={filtros.duplaId} onChange={(e) => set('duplaId', e.target.value)}>
              <option value="">Todas as duplas</option>
              {duplas.map((dupla) => <option key={dupla.id} value={dupla.id}>{dupla.liderNome} + {dupla.membro2Nome}</option>)}
            </select>
            <select className="input-field" value={filtros.serie} onChange={(e) => set('serie', e.target.value)}>
              <option value="">Todas as séries</option>
              {SERIES_ESTUDO.map((serie) => <option key={serie.id} value={serie.id}>{serie.nome}</option>)}
            </select>
            <select className="input-field" value={filtros.licaoAtual} onChange={(e) => set('licaoAtual', e.target.value)} disabled={!filtros.serie}>
              <option value="">Todas as lições</option>
              {licoes.map((licao) => <option key={licao.numero} value={licao.numero}>{licao.numero} - {licao.titulo}</option>)}
            </select>
            <input className="input-field" placeholder="Cidade" value={filtros.cidade} onChange={(e) => set('cidade', e.target.value)} />
            <input className="input-field" type="date" value={filtros.dataInicio} onChange={(e) => set('dataInicio', e.target.value)} />
            <input className="input-field" type="date" value={filtros.dataFim} onChange={(e) => set('dataFim', e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn-outline" onClick={() => { setFiltros({ duplaId: '', serie: '', licaoAtual: '', cidade: '', dataInicio: '', dataFim: '' }); setTimeout(carregar, 0); }}>Limpar</button>
            <button type="button" className="btn-outline" onClick={() => baixarCsv(resultado.estudos)}>Exportar CSV</button>
            <button type="button" className="btn-primary" onClick={carregar}>Filtrar</button>
          </div>
        </div>

        <div className="card overflow-hidden">
          {carregando ? (
            <p className="text-gray-400 text-sm">Carregando estudos...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F4F5F7] text-gray-500">
                    <th className="text-left px-4 py-3">Estudante</th>
                    <th className="text-left px-4 py-3">Cidade/Estado</th>
                    <th className="text-left px-4 py-3">WhatsApp</th>
                    <th className="text-left px-4 py-3">Série</th>
                    <th className="text-left px-4 py-3">Lição Atual</th>
                    <th className="text-left px-4 py-3">Dupla</th>
                    <th className="text-left px-4 py-3">Dia</th>
                    <th className="text-left px-4 py-3">Horário</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.estudos.map((estudo) => (
                    <tr key={estudo.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-[#1A3A6B]">{estudo.nomeEstudante}</td>
                      <td className="px-4 py-3 text-gray-600">{estudo.cidade}/{estudo.estado}</td>
                      <td className="px-4 py-3 text-gray-600">{estudo.whatsapp}</td>
                      <td className="px-4 py-3 text-gray-600">{getSerieNome(estudo.serie)}</td>
                      <td className="px-4 py-3 text-gray-600">{getLicaoLabel(estudo.serie, estudo.licaoAtual)}</td>
                      <td className="px-4 py-3 text-gray-600">{estudo.dupla?.liderNome} + {estudo.dupla?.membro2Nome}</td>
                      <td className="px-4 py-3 text-gray-600">{estudo.diaEstudo}</td>
                      <td className="px-4 py-3 text-gray-600">{estudo.horarioEstudo || '—'}</td>
                    </tr>
                  ))}
                  {resultado.estudos.length === 0 && (
                    <tr><td className="px-4 py-8 text-center text-gray-400" colSpan="8">Nenhum estudo encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
