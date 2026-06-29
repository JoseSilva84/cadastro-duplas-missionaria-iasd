import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const cards = [
  ['novaDupla', 'Nova Dupla'],
  ['estudosBiblicos', 'Estudos Bíblicos'],
  ['pontosEstudo', 'Ponto de Estudo'],
  ['classesBiblicas', 'Classe Bíblica'],
  ['diretorMinisterioPessoal', 'Diretor Minist. Pessoal'],
  ['diretoresMissionarios', 'Diretor Missionário'],
  ['batismos', 'Batismos'],
  ['pessoasAlcancadas', 'Pessoas Alcançadas'],
];

export default function RelatorioPersonalizado() {
  const [nivel, setNivel] = useState('regiao');
  const [regioes, setRegioes] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [selecionado, setSelecionado] = useState('');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    Promise.all([api.get('/regioes'), api.get('/distritos'), api.get('/igrejas')])
      .then(([rRegioes, rDistritos, rIgrejas]) => {
        setRegioes(rRegioes.data);
        setDistritos(rDistritos.data);
        setIgrejas(rIgrejas.data);
        setSelecionado(String(rRegioes.data[0]?.id || ''));
      });
  }, []);

  useEffect(() => {
    const lista = nivel === 'regiao' ? regioes : nivel === 'distrito' ? distritos : igrejas;
    setSelecionado(String(lista[0]?.id || ''));
    setDados(null);
  }, [nivel, regioes, distritos, igrejas]);

  const opcoes = useMemo(() => {
    if (nivel === 'regiao') return regioes;
    if (nivel === 'distrito') return distritos;
    return igrejas;
  }, [nivel, regioes, distritos, igrejas]);

  const gerar = async () => {
    if (!selecionado) return;
    setCarregando(true);
    setErro('');
    try {
      const params = { nivel };
      if (nivel === 'regiao') params.regiaoId = selecionado;
      if (nivel === 'distrito') params.distritoId = selecionado;
      if (nivel === 'igreja') params.igrejaId = selecionado;
      const { data } = await api.get('/relatorios/personalizado', { params });
      setDados(data);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Erro ao gerar relatório personalizado.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <p className="text-[#C9963A] text-xs font-bold uppercase tracking-wider">Administração</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Relatório Personalizado
        </h1>
      </div>

      <div className="card mb-6">
        <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Analisar por</span>
            <select className="input-field" value={nivel} onChange={(e) => setNivel(e.target.value)}>
              <option value="regiao">Região</option>
              <option value="distrito">Distrito</option>
              <option value="igreja">Igreja</option>
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-xs font-semibold text-gray-600">Escopo</span>
            <select className="input-field" value={selecionado} onChange={(e) => setSelecionado(e.target.value)}>
              {opcoes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome}{item.distrito?.nome ? ` (${item.distrito.nome})` : item.regiao?.nome ? ` (${item.regiao.nome})` : ''}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="btn-primary h-11" onClick={gerar} disabled={carregando || !selecionado}>
            {carregando ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
        {erro && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
      </div>

      {dados && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map(([key, label]) => (
              <div
                key={key}
                className="smart-tooltip card p-4"
                data-tooltip={`${label}: total consolidado para o escopo selecionado nos filtros do relatorio personalizado.`}
                tabIndex={0}
              >
                <p className="text-xs font-semibold text-gray-500">{label}</p>
                <p className="mt-2 text-3xl font-bold text-[#1A3A6B]">{Number(dados[key] || 0).toLocaleString('pt-BR')}</p>
              </div>
            ))}
          </div>
          <div className="card mt-4">
            <h2 className="text-lg font-bold text-[#1A3A6B]">Escola Sabatina</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.entries(dados.escolaSabatina || {}).map(([key, valor]) => (
                <div
                  key={key}
                  className="smart-tooltip rounded-lg border border-gray-100 bg-gray-50 p-3"
                  data-tooltip={`${key}: total da Escola Sabatina no escopo selecionado.`}
                  tabIndex={0}
                >
                  <p className="text-xs font-semibold text-gray-500">{key}</p>
                  <p className="mt-1 text-xl font-bold text-[#C9963A]">{Number(valor || 0).toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
