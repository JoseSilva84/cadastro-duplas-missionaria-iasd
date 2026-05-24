import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';
import AvatarUpload from '../components/AvatarUpload';

const Campo = ({ label, obrigatorio, children, icone }) => (
  <div className="group/campo">
    <label className="flex items-center gap-1.5 text-sm font-medium text-gray-600 mb-1.5 group-focus-within/campo:text-[#1A3A6B] transition-colors">
      {icone && <span className="text-sm">{icone}</span>}
      {label} {obrigatorio && <span className="text-red-400">*</span>}
    </label>
    {children}
  </div>
);

const SecaoHeader = ({ numero, titulo, descricao }) => (
  <div className="flex items-center gap-3 mb-5 pb-3 border-b border-gray-100">
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md">
      {numero}
    </div>
    <div>
      <h2 className="font-bold text-[#1A3A6B]">{titulo}</h2>
      {descricao && <p className="text-xs text-gray-400">{descricao}</p>}
    </div>
  </div>
);

// Tipos de liderança suportados
const TIPOS = [
  {
    value: 'regional',
    label: 'Pastor Regional',
    descricao: 'Responsável por uma Região inteira',
    icon: '🏛️',
    cor: '#1A3A6B',
    bg: '#1A3A6B18',
  },
  {
    value: 'distrital',
    label: 'Pastor Distrital',
    descricao: 'Responsável por um Distrito',
    icon: '⛪',
    cor: '#2a5298',
    bg: '#2a529818',
  },
  {
    value: 'coordenador',
    label: 'Coordenador de Interessados',
    descricao: 'Responsável por acompanhar os interessados de uma Igreja',
    icon: '👤',
    cor: '#C9963A',
    bg: '#C9963A18',
  },
];

const CARGO_POR_TIPO = {
  regional: 'Pastor Regional',
  distrital: 'Pastor Distrital',
  coordenador: 'Coordenador de Interessados',
};

export default function CadastroPastores() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDireto = location.pathname.startsWith('/direto');

  const [tipo, setTipo] = useState('regional');
  const [foto, setFoto] = useState('');
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState(CARGO_POR_TIPO.regional);
  const [regiaoId, setRegiaoId] = useState('');
  const [distritoId, setDistritoId] = useState('');
  const [igrejaId, setIgrejaId] = useState('');

  const [regioes, setRegioes] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [enviando, setEnviando] = useState(false);

  // Carrega regiões ao montar
  useEffect(() => {
    api.get('/regioes').then((r) => setRegioes(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  // Carrega distritos quando região muda
  useEffect(() => {
    if (!regiaoId) { setDistritos([]); setDistritoId(''); return; }
    api.get('/distritos', { params: { regiaoId } })
      .then((r) => setDistritos(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [regiaoId]);

  // Carrega igrejas quando distrito muda
  useEffect(() => {
    if (!distritoId) { setIgrejas([]); setIgrejaId(''); return; }
    api.get(`/distritos/${distritoId}`)
      .then((r) => setIgrejas(r.data.igrejas || []))
      .catch(() => {});
  }, [distritoId]);

  // Zera os selects ao mudar o tipo
  const handleTipo = (t) => {
    setTipo(t);
    setRegiaoId('');
    setDistritoId('');
    setIgrejaId('');
    setCargo(CARGO_POR_TIPO[t]);
    setFoto('');
    setNome('');
  };

  const cargoAtual = CARGO_POR_TIPO[tipo];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) { toast.error('Informe o nome da liderança.'); return; }
    if (tipo === 'regional' && !regiaoId) { toast.error('Selecione a Região.'); return; }
    if (tipo === 'distrital' && !distritoId) { toast.error('Selecione o Distrito.'); return; }
    if (tipo === 'coordenador' && (!distritoId || !igrejaId)) { toast.error('Selecione Distrito e Igreja.'); return; }

    setEnviando(true);
    try {
      if (tipo === 'regional') {
        await api.patch(`/regioes/${regiaoId}`, {
          fotoConselheiro: foto || null,
          nomeConselheiro: nome,
          cargoConselheiro: cargoAtual,
        });
      } else if (tipo === 'distrital') {
        await api.patch(`/distritos/${distritoId}`, {
          fotoPastor: foto || null,
          nomePastor: nome,
          cargoPastor: cargoAtual,
        });
      } else {
        await api.patch(`/igrejas/${igrejaId}`, {
          fotoCoordInteressados: foto || null,
          nomeCoordInteressados: nome,
          cargoCoordInteressados: cargoAtual,
        });
      }
      toast.success('Liderança cadastrada com sucesso!');
      setFoto('');
      setNome('');
      setCargo(cargoAtual);
      setRegiaoId('');
      setDistritoId('');
      setIgrejaId('');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao salvar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const tipoSelecionado = TIPOS.find((t) => t.value === tipo);

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in' : 'min-h-screen animate-fade-in'}>
      {/* Cabeçalho */}
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-8 px-4 sm:px-6 pt-6'}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Cadastro</p>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Lideranças
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Cadastre foto e nome de pastores regionais, distritais e coordenadores de interessados
        </p>
      </div>

      <form onSubmit={handleSubmit} className={isDireto ? 'flex-1 flex flex-col min-h-0' : ''}>
        <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F5F7]' : 'px-4 sm:px-6 py-4 bg-[#F4F5F7]'}>
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Seção 1 — Tipo de Liderança */}
            <div className="card">
              <SecaoHeader numero="1" titulo="Tipo de Liderança" descricao="Selecione qual tipo de liderança você deseja cadastrar" />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TIPOS.map((t) => {
                  const ativo = tipo === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => handleTipo(t.value)}
                      className={`rounded-xl border-2 p-4 text-left transition-all duration-200 ${
                        ativo
                          ? 'shadow-md'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                      style={ativo ? { borderColor: t.cor, backgroundColor: t.bg } : {}}
                    >
                      <span className="text-2xl block mb-2">{t.icon}</span>
                      <p className="font-bold text-sm" style={{ color: ativo ? t.cor : '#1A3A6B' }}>
                        {t.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{t.descricao}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seção 2 — Foto e Dados */}
            <div className="card">
              <SecaoHeader
                numero="2"
                titulo={`Dados do ${tipoSelecionado?.label}`}
                descricao="Foto, nome e cargo desta liderança"
              />
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {/* Avatar */}
                <div className="flex justify-center sm:justify-start flex-shrink-0">
                  <AvatarUpload value={foto} onChange={setFoto} label="Foto" />
                </div>
                {/* Campos */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Campo label="Nome Completo" obrigatorio icone="👤">
                      <input
                        type="text"
                        className="input-field"
                        placeholder={`Nome do ${tipoSelecionado?.label}`}
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        required
                      />
                    </Campo>
                  </div>
                  <Campo label="Cargo / Função" icone="🏷️">
                    <input
                      type="text"
                      className="input-field bg-gray-50 text-[#1A3A6B] font-semibold cursor-not-allowed"
                      value={cargo}
                      readOnly
                      aria-readonly="true"
                    />
                  </Campo>
                </div>
              </div>
            </div>

            {/* Seção 3 — Vínculo (Região / Distrito / Igreja) */}
            <div className="card">
              <SecaoHeader
                numero="3"
                titulo="Vínculo"
                descricao={
                  tipo === 'regional'
                    ? 'Selecione a Região que esta liderança pastoral'
                    : tipo === 'distrital'
                    ? 'Selecione o Distrito que este pastor serve'
                    : 'Selecione o Distrito e a Igreja onde o coordenador atua'
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Região — sempre visível */}
                <Campo label="Região" obrigatorio={tipo === 'regional'} icone="🗺️">
                  <select
                    className="input-field"
                    value={regiaoId}
                    onChange={(e) => setRegiaoId(e.target.value)}
                    required={tipo === 'regional'}
                  >
                    <option value="">Selecione a Região</option>
                    {regioes.map((r) => (
                      <option key={r.id} value={r.id}>{r.nome}</option>
                    ))}
                  </select>
                </Campo>

                {/* Distrito — visível para distrital e coordenador */}
                {(tipo === 'distrital' || tipo === 'coordenador') && (
                  <Campo label="Distrito" obrigatorio icone="⛪">
                    <select
                      className="input-field"
                      value={distritoId}
                      onChange={(e) => setDistritoId(e.target.value)}
                      required
                      disabled={!regiaoId}
                    >
                      <option value="">Selecione o Distrito</option>
                      {distritos.map((d) => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </select>
                  </Campo>
                )}

                {/* Igreja — visível apenas para coordenador */}
                {tipo === 'coordenador' && (
                  <Campo label="Igreja" obrigatorio icone="🏠">
                    <select
                      className="input-field"
                      value={igrejaId}
                      onChange={(e) => setIgrejaId(e.target.value)}
                      required
                      disabled={!distritoId}
                    >
                      <option value="">Selecione a Igreja</option>
                      {igrejas.map((ig) => (
                        <option key={ig.id} value={ig.id}>{ig.nome}</option>
                      ))}
                    </select>
                  </Campo>
                )}
              </div>

              {/* Nota explicativa */}
              <div className="mt-4 flex items-start gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                <svg className="w-4 h-4 flex-shrink-0 text-gray-300 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {tipo === 'regional' && 'A foto e o nome do pastor regional aparecerão na página de Detalhes da Região.'}
                {tipo === 'distrital' && 'A foto e o nome do pastor distrital aparecerão na página de Detalhes do Distrito.'}
                {tipo === 'coordenador' && 'A foto e o nome do coordenador de interessados aparecerão na página da Igreja correspondente.'}
              </div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className={isDireto
          ? 'flex-shrink-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3'
          : 'max-w-3xl mx-auto flex justify-end gap-3 px-4 sm:px-6 py-6'
        }>
          <button type="button" onClick={() => navigate(-1)} className="btn-outline">Cancelar</button>
          <button type="submit" disabled={enviando} className="btn-primary flex items-center gap-2">
            {enviando ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Salvar Liderança
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
