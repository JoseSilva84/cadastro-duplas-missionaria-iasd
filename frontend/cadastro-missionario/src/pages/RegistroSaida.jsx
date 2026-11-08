import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from '../lib/toast';
import BackButton from '../components/BackButton';
import { FotoService } from '../foto.service';
import { compressImageToBase64 } from '../imageUtils';
import { ehAdmin, useAuth } from '../contexts/AuthContext';

export const TIPOS_ASSISTENCIA = [
  {
    valor: 'Treinamento de Igreja',
    label: 'Treinamento de Igreja',
    descricao: 'Capacitação e treinamento missionário com a igreja local',
    icone: '🏛️',
    cor: '#1A3A6B',
    bg: '#EEF3FB',
  },
  {
    valor: 'Assistência Estudo Bíblico',
    label: 'Assistência Estudo Bíblico',
    descricao: 'Acompanhamento prático em estudos bíblicos individuais ou pontos',
    icone: '📖',
    cor: '#0284c7',
    bg: '#E0F2FE',
  },
  {
    valor: 'Assistência Classe Bíblica',
    label: 'Assistência Classe Bíblica',
    descricao: 'Suporte, organização e acompanhamento de classe bíblica',
    icone: '🎓',
    cor: '#7c3aed',
    bg: '#F3E8FF',
  },
  {
    valor: 'Planejamento Missionário',
    label: 'Planejamento Missionário',
    descricao: 'Reunião estratégica e alinhamento de metas e ações missionárias',
    icone: '🧭',
    cor: '#C9963A',
    bg: '#FDF8EE',
  },
  {
    valor: 'Captação de Interessados',
    label: 'Captação de Interessados',
    descricao: 'Mobilização e ações para captação de novos interessados',
    icone: '🌱',
    cor: '#0d9488',
    bg: '#CCFBF1',
  },
  {
    valor: 'Visitação',
    label: 'Visitação',
    descricao: 'Visitação missionária e acompanhamento de campo com as duplas',
    icone: '🏠',
    cor: '#16a34a',
    bg: '#DCFCE7',
  },
  {
    valor: 'Mentoria de Interessados no Novo Tempo',
    label: 'Mentoria de Interessados no Novo Tempo',
    descricao: 'Mentoria e acompanhamento no atendimento de interessados da Novo Tempo',
    icone: '📻',
    cor: '#ea580c',
    bg: '#FFEDD5',
  },
];

const normalizarTexto = (valor = '') =>
  String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const destacarTrecho = (texto = '', termo = '') => {
  const textoStr = String(texto || '');
  const termoLimpo = normalizarTexto(termo);
  if (!termoLimpo) return textoStr;

  const textoNormalizado = String(textoStr)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const idx = textoNormalizado.indexOf(termoLimpo);
  if (idx === -1) return textoStr;

  const fim = idx + termoLimpo.length;
  return (
    <>
      {textoStr.slice(0, idx)}
      <mark className="bg-[#FDFBF5] text-[#B37E22] font-extrabold px-0.5 rounded border border-[#EED9B3]">
        {textoStr.slice(idx, fim)}
      </mark>
      {textoStr.slice(fim)}
    </>
  );
};

const formatarDataBr = (valor) => {
  if (!valor) return 'Não informada';
  const str = String(valor).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [ano, mes, dia] = str.split('-');
    return `${dia}/${mes}/${ano}`;
  }
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return 'Não informada';
  return data.toLocaleDateString('pt-BR');
};

const Campo = ({ label, children, obrigatorio }) => (
  <div className="block">
    <span className="block text-sm font-medium text-gray-600 mb-1.5">
      {label} {obrigatorio && <span className="text-red-400">*</span>}
    </span>
    {children}
  </div>
);

const FotoMini = ({ src, nome }) => {
  const inicial = (nome || '?').charAt(0).toUpperCase();
  if (src) return <img src={src} alt={nome} className="w-8 h-8 rounded-full object-cover ring-1 ring-white shadow-sm" />;
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white text-xs font-bold ring-1 ring-white shadow-sm">
      {inicial}
    </div>
  );
};

const SkeletonDuplas = () => (
  <div className="space-y-2">
    {[1, 2, 3, 4].map((item) => (
      <div key={item} className="rounded-xl border-2 border-gray-100 bg-white p-3 flex items-center gap-3">
        <div className="skeleton w-5 h-5 rounded" />
        <div className="flex items-center -space-x-2">
          <div className="skeleton w-8 h-8 rounded-full" />
          <div className="skeleton w-8 h-8 rounded-full" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-3/5" />
          <div className="skeleton h-3 w-2/5" />
        </div>
      </div>
    ))}
  </div>
);

/**
 * Select elegante e customizado para Tipo de Assistência
 */
function SeletorTipoAssistencia({ value, onChange, disabled = false }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const onClickFora = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  const selecionado = useMemo(
    () => TIPOS_ASSISTENCIA.find((item) => item.valor === value) || null,
    [value]
  );

  const opcoesFiltradas = useMemo(() => {
    const termo = normalizarTexto(busca);
    if (!termo) return TIPOS_ASSISTENCIA;
    return TIPOS_ASSISTENCIA.filter((item) =>
      normalizarTexto(`${item.label} ${item.descricao}`).includes(termo)
    );
  }, [busca]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setAberto((prev) => !prev)}
        className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 flex items-center justify-between gap-3 ${
          selecionado
            ? 'border-[#1A3A6B]/30 bg-gradient-to-r from-[#F8FAFF] to-white shadow-xs'
            : 'border-gray-200 bg-[#fafbfc] hover:border-[#1A3A6B]/40'
        } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        {selecionado ? (
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-xs border"
              style={{
                backgroundColor: selecionado.bg,
                color: selecionado.cor,
                borderColor: `${selecionado.cor}30`,
              }}
            >
              {selecionado.icone}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-sm sm:text-base text-[#1A3A6B] truncate">
                  {selecionado.label}
                </p>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: selecionado.bg, color: selecionado.cor }}
                >
                  Selecionado
                </span>
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{selecionado.descricao}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-xl bg-[#1A3A6B]/8 text-[#1A3A6B] flex items-center justify-center text-lg flex-shrink-0">
              ✨
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-700">
                Selecione o tipo de assistência realizada
              </p>
              <p className="text-xs text-gray-400 truncate">
                Treinamento, estudo bíblico, classe bíblica, planejamento, captação, visitação ou mentoria NT
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {selecionado && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange('');
                }
              }}
              style={{ minHeight: '28px' }}
              className="!min-h-0 px-2 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Limpar tipo de assistência"
            >
              Limpar
            </span>
          )}
          <span
            className={`w-8 h-8 rounded-lg bg-[#EEF3FB] text-[#1A3A6B] flex items-center justify-center transition-transform duration-200 ${
              aberto ? 'rotate-180 bg-[#1A3A6B] text-white' : ''
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </button>

      {aberto && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden animate-fade-in">
          <div className="p-3 bg-[#F8FAFC] border-b border-gray-100">
            <div className="relative">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Filtrar tipo de assistência..."
                className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#1A3A6B]"
              />
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto p-2 space-y-1.5">
            {opcoesFiltradas.map((item) => {
              const ativo = item.valor === value;
              return (
                <button
                  key={item.valor}
                  type="button"
                  onClick={() => {
                    onChange(item.valor);
                    setAberto(false);
                    setBusca('');
                  }}
                  className={`w-full rounded-xl p-3 text-left transition-all flex items-center justify-between gap-3 border ${
                    ativo
                      ? 'border-[#1A3A6B] bg-[#EEF3FB]/70 shadow-xs'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border"
                      style={{
                        backgroundColor: item.bg,
                        color: item.cor,
                        borderColor: `${item.cor}30`,
                      }}
                    >
                      {item.icone}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#1A3A6B] truncate">
                        {destacarTrecho(item.label, busca)}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {destacarTrecho(item.descricao, busca)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 border ${
                      ativo
                        ? 'bg-[#1A3A6B] border-[#1A3A6B] text-white'
                        : 'border-gray-300 bg-white text-transparent'
                    }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                </button>
              );
            })}
            {opcoesFiltradas.length === 0 && (
              <p className="text-center py-6 text-xs text-gray-400">
                Nenhum tipo de assistência encontrado para &ldquo;{busca}&rdquo;.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Buscador e Seletor Inteligente para Distrito ou Igreja da Região
 */
function SeletorLocalInteligente({
  label,
  icone,
  itens = [],
  value = '',
  onChange,
  placeholder = 'Digite para buscar ou selecione na lista...',
  subtituloItem,
  badgeItem,
  disabled = false,
  mensagemVazio = 'Nenhum item encontrado nesta região.',
}) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const onClickFora = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', onClickFora);
    return () => document.removeEventListener('mousedown', onClickFora);
  }, []);

  const itemSelecionado = useMemo(
    () => itens.find((item) => String(item.id) === String(value)) || null,
    [itens, value]
  );

  const itensFiltrados = useMemo(() => {
    const termo = normalizarTexto(busca);
    if (!termo) return itens;
    const tokens = termo.split(/\s+/).filter(Boolean);
    return itens.filter((item) => {
      const alvo = normalizarTexto(`${item.nome || ''} ${subtituloItem ? subtituloItem(item) : ''}`);
      return tokens.every((tk) => alvo.includes(tk));
    });
  }, [itens, busca, subtituloItem]);

  return (
    <div ref={containerRef} className="relative">
      {itemSelecionado && !aberto ? (
        <div className="rounded-xl border border-[#D4E1F5] bg-[#F8FAFF] px-3.5 py-2.5 flex items-center justify-between gap-2.5 transition-all">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1A3A6B] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
              {icone || (itemSelecionado.nome || label || 'L').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#C9963A]">
                {label} selecionado(a)
              </p>
              <p className="text-sm font-bold text-[#1A3A6B] truncate">
                {itemSelecionado.nome}
              </p>
              {subtituloItem && subtituloItem(itemSelecionado) && (
                <p className="text-xs text-gray-500 truncate">
                  {subtituloItem(itemSelecionado)}
                </p>
              )}
            </div>
          </div>

          {!disabled && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setAberto(true);
                  setTimeout(() => inputRef.current?.focus(), 40);
                }}
                style={{ minHeight: '32px' }}
                className="!min-h-0 px-2.5 py-1 rounded-lg text-xs font-bold text-[#1A3A6B] bg-white border border-gray-200 hover:border-[#1A3A6B] transition-colors"
              >
                Trocar
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setBusca('');
                }}
                style={{ minHeight: '32px' }}
                className="!min-h-0 px-2 py-1 rounded-lg text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
                title="Limpar seleção"
              >
                Limpar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            disabled={disabled}
            value={busca}
            onFocus={() => !disabled && setAberto(true)}
            onChange={(e) => {
              setBusca(e.target.value);
              setAberto(true);
            }}
            placeholder={placeholder}
            className="input-field pl-10 pr-24"
            style={{ paddingLeft: '2.5rem' }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {busca && (
              <button
                type="button"
                onClick={() => {
                  setBusca('');
                  inputRef.current?.focus();
                }}
                style={{ minHeight: '28px' }}
                className="!min-h-0 px-1.5 py-0.5 text-xs font-bold text-gray-400 hover:text-gray-600"
                title="Limpar busca"
              >
                ✕
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => !disabled && setAberto((prev) => !prev)}
              style={{ minHeight: '28px' }}
              className="!min-h-0 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#1A3A6B] bg-[#EEF3FB] hover:bg-[#E0E9F8] transition-colors"
            >
              {aberto ? 'Fechar' : `Lista (${itens.length})`}
            </button>
          </div>
        </div>
      )}

      {aberto && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden animate-fade-in">
          <div className="px-3.5 py-2 bg-[#F8FAFC] border-b border-gray-100 flex items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              {itensFiltrados.length === 0
                ? 'Nenhum resultado'
                : `${itensFiltrados.length} ${itensFiltrados.length === 1 ? 'opção disponível' : 'opções disponíveis'}`}
            </span>
            {itemSelecionado && (
              <button
                type="button"
                onClick={() => {
                  setAberto(false);
                  setBusca('');
                }}
                style={{ minHeight: '24px' }}
                className="!min-h-0 font-semibold text-[#1A3A6B] hover:underline"
              >
                Manter atual
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
            {itensFiltrados.length === 0 ? (
              <div className="p-5 text-center text-xs text-gray-400">
                {mensagemVazio}
              </div>
            ) : (
              itensFiltrados.map((item) => {
                const ativo = String(item.id) === String(value);
                const sub = subtituloItem ? subtituloItem(item) : '';
                const badge = badgeItem ? badgeItem(item) : '';
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChange(String(item.id), item);
                      setAberto(false);
                      setBusca('');
                    }}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-center justify-between gap-3 ${
                      ativo ? 'bg-[#EEF3FB] border-l-4 border-[#1A3A6B]' : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#1A3A6B] truncate">
                        {destacarTrecho(item.nome, busca)}
                      </p>
                      {sub && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {destacarTrecho(sub, busca)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {badge && (
                        <span className="text-[11px] font-semibold text-[#C9963A] bg-[#FDF8EE] px-2 py-0.5 rounded-full border border-[#C9963A]/20">
                          {badge}
                        </span>
                      )}
                      <span className="text-xs font-bold text-[#1A3A6B] bg-white border border-gray-200 rounded-lg px-2.5 py-1">
                        {ativo ? 'Selecionado' : 'Escolher'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegistroSaida() {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const isAdminUser = ehAdmin(usuario);
  const isDireto = location.pathname.startsWith('/direto');
  const prefix = isDireto ? '/direto' : '';

  // Para Super Admin e Admin, abre primeiramente no Modo Visualização antes de editar
  const [modoVisualizacao, setModoVisualizacao] = useState(() => Boolean(ehAdmin(usuario)));

  const [duplas, setDuplas] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [igrejas, setIgrejas] = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [historicoAssistencias, setHistoricoAssistencias] = useState([]);
  const [assistenciaEditandoId, setAssistenciaEditandoId] = useState(null);

  const [coordenadorId, setCoordenadorId] = useState('');
  const [trocandoCoordenador, setTrocandoCoordenador] = useState(false);
  const [editandoNomeCoord, setEditandoNomeCoord] = useState(false);
  const [nomeCoordenadorInput, setNomeCoordenadorInput] = useState('');
  const [salvandoCoordenador, setSalvandoCoordenador] = useState(false);
  const fotoInputRef = useRef(null);

  const [dataSaida, setDataSaida] = useState(new Date().toISOString().split('T')[0]);
  const [tipoAssistencia, setTipoAssistencia] = useState('');
  const [distritoId, setDistritoId] = useState('');
  const [igrejaId, setIgrejaId] = useState('');
  const [duplasSelecionadas, setDuplasSelecionadas] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const [busca, setBusca] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setModoVisualizacao(Boolean(ehAdmin(usuario)));
  }, [usuario?.perfil]);

  useEffect(() => {
    Promise.all([
      api.get('/duplas'),
      api.get('/acompanhamentos/coordenadores'),
      api.get('/distritos').catch(() => ({ data: [] })),
      api.get('/igrejas').catch(() => ({ data: [] })),
      api.get('/acompanhamentos').catch(() => ({ data: [] })),
    ]).then(async ([duplasRes, coordenadoresRes, distritosRes, igrejasRes, acompanhamentosRes]) => {
      const lista = Array.isArray(duplasRes.data) ? duplasRes.data : [];
      const listaCoordenadoresBruta = Array.isArray(coordenadoresRes.data) ? coordenadoresRes.data : [];
      const listaDistritos = Array.isArray(distritosRes.data) ? distritosRes.data : [];
      const listaIgrejas = Array.isArray(igrejasRes.data) ? igrejasRes.data : [];
      const listaAcompanhamentos = Array.isArray(acompanhamentosRes.data) ? acompanhamentosRes.data : [];

      const [listaComFotos, coordenadoresComFotos] = await Promise.all([
        Promise.all(
          lista.map(async (d) => {
            const [fotoLiderPreview, fotoMembro2Preview] = await Promise.all([
              FotoService.resolverFotoParaPreview(d.fotoLider).catch(() => ''),
              FotoService.resolverFotoParaPreview(d.fotoMembro2).catch(() => ''),
            ]);
            return { ...d, fotoLiderPreview, fotoMembro2Preview };
          })
        ),
        Promise.all(
          listaCoordenadoresBruta.map(async (coord) => {
            const fotoPreview = await FotoService.resolverFotoParaPreview(coord.fotoPerfil).catch(() => '');
            return { ...coord, fotoPreview };
          })
        ),
      ]);

      setDuplas(listaComFotos);
      setCoordenadores(coordenadoresComFotos);
      setDistritos(listaDistritos);
      setIgrejas(listaIgrejas);
      setHistoricoAssistencias(listaAcompanhamentos);

      const coordInicial = coordenadoresComFotos[0] || null;
      if (coordInicial) {
        setCoordenadorId(String(coordInicial.id));
        setNomeCoordenadorInput(coordInicial.nome || '');

        // Se for Admin/Super Admin no modo visualização e já houver assistência registrada para este coordenador,
        // pré-carrega os dados preenchidos para visualização imediata antes de editar
        if (ehAdmin(usuario)) {
          const ultimaDoCoordenador = listaAcompanhamentos.find(
            (item) => Number(item.coordenadorId || item.coordenador?.id) === Number(coordInicial.id)
          );
          if (ultimaDoCoordenador) {
            preencherFormularioComAssistencia(ultimaDoCoordenador);
          }
        }
      }
    }).catch(() => {
      toast.error('Erro ao carregar dados do registro de assistência.');
    }).finally(() => setCarregando(false));
  }, []);

  const preencherFormularioComAssistencia = (registro) => {
    if (!registro) return;
    setAssistenciaEditandoId(registro.id);
    if (registro.dataSaida) {
      setDataSaida(new Date(registro.dataSaida).toISOString().split('T')[0]);
    }
    setTipoAssistencia(registro.tipoAssistencia || '');
    const dId = registro.distritoId || registro.duplas?.[0]?.dupla?.distrito?.id || registro.duplas?.[0]?.dupla?.distritoId || '';
    const igId = registro.igrejaId || registro.duplas?.[0]?.dupla?.igreja?.id || registro.duplas?.[0]?.dupla?.igrejaId || '';
    setDistritoId(dId ? String(dId) : '');
    setIgrejaId(igId ? String(igId) : '');
    setObservacoes(registro.observacoes || '');
    const ids = (registro.duplas || [])
      .map((item) => item.dupla?.id || item.duplaId)
      .filter(Boolean);
    setDuplasSelecionadas(ids);
  };

  const limparParaNovaAssistencia = () => {
    setAssistenciaEditandoId(null);
    setDataSaida(new Date().toISOString().split('T')[0]);
    setTipoAssistencia('');
    setDistritoId('');
    setIgrejaId('');
    setDuplasSelecionadas([]);
    setObservacoes('');
  };

  const coordenadorSelecionado = useMemo(
    () => coordenadores.find((item) => String(item.id) === String(coordenadorId)) || null,
    [coordenadores, coordenadorId]
  );

  const regiaoSelecionadaId = coordenadorSelecionado?.regiao?.id;

  const assistenciasDoCoordenador = useMemo(
    () => historicoAssistencias.filter(
      (item) => Number(item.coordenadorId || item.coordenador?.id) === Number(coordenadorId)
    ),
    [historicoAssistencias, coordenadorId]
  );

  // Distritos pertencentes à região do coordenador selecionado
  const distritosDaRegiao = useMemo(() => {
    const mapa = new Map();

    distritos.forEach((d) => {
      const regId = d.regiaoId || d.regiao?.id;
      if (!regiaoSelecionadaId || Number(regId) === Number(regiaoSelecionadaId)) {
        mapa.set(String(d.id), {
          id: d.id,
          nome: d.nome,
          regiaoId: regId,
          regiaoNome: d.regiao?.nome || coordenadorSelecionado?.regiao?.nome || '',
        });
      }
    });

    duplas.forEach((dupla) => {
      const d = dupla.distrito;
      if (!d?.id) return;
      const regId = d.regiaoId || d.regiao?.id;
      if (!regiaoSelecionadaId || Number(regId) === Number(regiaoSelecionadaId)) {
        if (!mapa.has(String(d.id))) {
          mapa.set(String(d.id), {
            id: d.id,
            nome: d.nome,
            regiaoId: regId,
            regiaoNome: d.regiao?.nome || coordenadorSelecionado?.regiao?.nome || '',
          });
        }
      }
    });

    return [...mapa.values()].sort((a, b) =>
      String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' })
    );
  }, [distritos, duplas, regiaoSelecionadaId, coordenadorSelecionado]);

  // Igrejas pertencentes à região do coordenador (e filtradas pelo distrito quando selecionado)
  const igrejasDaRegiao = useMemo(() => {
    const idsDistritosRegiao = new Set(distritosDaRegiao.map((d) => String(d.id)));
    const mapaDistritoNome = new Map(distritosDaRegiao.map((d) => [String(d.id), d.nome]));
    const mapa = new Map();

    igrejas.forEach((ig) => {
      const distId = String(ig.distritoId || ig.distrito?.id || '');
      const regId = ig.distrito?.regiaoId || ig.distrito?.regiao?.id;
      const pertenceRegiao = !regiaoSelecionadaId
        || Number(regId) === Number(regiaoSelecionadaId)
        || idsDistritosRegiao.has(distId);
      if (!pertenceRegiao) return;

      mapa.set(String(ig.id), {
        id: ig.id,
        nome: ig.nome,
        distritoId: ig.distritoId || ig.distrito?.id || null,
        distritoNome: ig.distrito?.nome || mapaDistritoNome.get(distId) || '',
      });
    });

    duplas.forEach((dupla) => {
      const ig = dupla.igreja;
      if (!ig?.id) return;
      const distId = String(dupla.distritoId || dupla.distrito?.id || '');
      if (regiaoSelecionadaId && !idsDistritosRegiao.has(distId)) return;
      if (!mapa.has(String(ig.id))) {
        mapa.set(String(ig.id), {
          id: ig.id,
          nome: ig.nome,
          distritoId: dupla.distritoId || dupla.distrito?.id || null,
          distritoNome: dupla.distrito?.nome || mapaDistritoNome.get(distId) || '',
        });
      }
    });

    return [...mapa.values()].sort((a, b) =>
      String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR', { sensitivity: 'base' })
    );
  }, [igrejas, duplas, distritosDaRegiao, regiaoSelecionadaId]);

  const igrejasDisponiveisSelect = useMemo(() => {
    if (!distritoId) return igrejasDaRegiao;
    return igrejasDaRegiao.filter((ig) => String(ig.distritoId) === String(distritoId));
  }, [igrejasDaRegiao, distritoId]);

  const distritoSelecionadoObj = useMemo(
    () => distritosDaRegiao.find((d) => String(d.id) === String(distritoId)) || null,
    [distritosDaRegiao, distritoId]
  );

  const igrejaSelecionadaObj = useMemo(
    () => igrejasDaRegiao.find((ig) => String(ig.id) === String(igrejaId)) || null,
    [igrejasDaRegiao, igrejaId]
  );

  const duplasFiltradas = useMemo(() => {
    return duplas.filter((d) => {
      if (!coordenadorId) return false;
      if (regiaoSelecionadaId && Number(d.distrito?.regiaoId || d.distrito?.regiao?.id) !== Number(regiaoSelecionadaId)) {
        return false;
      }
      // Mantém duplas já selecionadas visíveis ou filtra pelo distrito/igreja escolhido
      const jaSelecionada = duplasSelecionadas.includes(d.id);
      if (!jaSelecionada) {
        if (distritoId && String(d.distritoId || d.distrito?.id) !== String(distritoId)) {
          return false;
        }
        if (igrejaId && String(d.igrejaId || d.igreja?.id) !== String(igrejaId)) {
          return false;
        }
      }
      if (!busca) return true;
      const termo = normalizarTexto(busca);
      return normalizarTexto(
        `${d.liderNome || ''} ${d.membro2Nome || ''} ${d.bairro || ''} ${d.igreja?.nome || ''} ${d.distrito?.nome || ''}`
      ).includes(termo);
    });
  }, [duplas, coordenadorId, regiaoSelecionadaId, distritoId, igrejaId, busca, duplasSelecionadas]);

  const objetosDuplasSelecionadas = useMemo(
    () => duplas.filter((d) => duplasSelecionadas.includes(d.id)),
    [duplas, duplasSelecionadas]
  );

  const toggleDupla = (id) => {
    if (modoVisualizacao) return;
    setDuplasSelecionadas((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const selecionarCoordenador = (id) => {
    setCoordenadorId(id);
    setTrocandoCoordenador(false);
    setEditandoNomeCoord(false);
    const coordenador = coordenadores.find((item) => String(item.id) === String(id));
    setNomeCoordenadorInput(coordenador?.nome || '');
    const regiaoId = coordenador?.regiao?.id;

    // Verifica se há assistência registrada para este coordenador quando em modo visualização
    const assistenciasCoord = historicoAssistencias.filter(
      (item) => Number(item.coordenadorId || item.coordenador?.id) === Number(id)
    );
    if (modoVisualizacao && assistenciasCoord.length > 0) {
      preencherFormularioComAssistencia(assistenciasCoord[0]);
      return;
    }

    setAssistenciaEditandoId(null);
    setDistritoId('');
    setIgrejaId('');
    if (regiaoId) {
      setDuplasSelecionadas((atuais) => atuais.filter((duplaId) => {
        const dupla = duplas.find((item) => item.id === duplaId);
        return Number(dupla?.distrito?.regiaoId || dupla?.distrito?.regiao?.id) === Number(regiaoId);
      }));
    } else {
      setDuplasSelecionadas([]);
    }
  };

  const handleSelecionarDistrito = (novoDistritoId) => {
    setDistritoId(novoDistritoId);
    if (!novoDistritoId) {
      return;
    }
    // Se a igreja atual não pertence ao novo distrito, limpa ou auto-seleciona
    const igrejasDoNovoDistrito = igrejasDaRegiao.filter(
      (ig) => String(ig.distritoId) === String(novoDistritoId)
    );
    if (igrejaId && !igrejasDoNovoDistrito.some((ig) => String(ig.id) === String(igrejaId))) {
      setIgrejaId(igrejasDoNovoDistrito.length === 1 ? String(igrejasDoNovoDistrito[0].id) : '');
    } else if (!igrejaId && igrejasDoNovoDistrito.length === 1) {
      setIgrejaId(String(igrejasDoNovoDistrito[0].id));
    }
  };

  const handleSelecionarIgreja = (novaIgrejaId, objetoIgreja) => {
    setIgrejaId(novaIgrejaId);
    if (novaIgrejaId) {
      const ig = objetoIgreja || igrejasDaRegiao.find((item) => String(item.id) === String(novaIgrejaId));
      if (ig?.distritoId && String(ig.distritoId) !== String(distritoId)) {
        setDistritoId(String(ig.distritoId));
      }
    }
  };

  const handleTrocarFotoCoordenador = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !coordenadorSelecionado) return;

    setSalvandoCoordenador(true);
    try {
      const base64 = await compressImageToBase64(file);
      let referenciaOuBase64 = base64;
      try {
        referenciaOuBase64 = await FotoService.salvarFotoPorReferencia(
          'coordenador_regional',
          coordenadorSelecionado.id,
          'perfil',
          base64
        );
      } catch {
        referenciaOuBase64 = base64;
      }

      const { data } = await api.patch(`/acompanhamentos/coordenadores/${coordenadorSelecionado.id}`, {
        fotoPerfil: referenciaOuBase64,
      });

      setCoordenadores((atuais) =>
        atuais.map((item) =>
          item.id === coordenadorSelecionado.id
            ? { ...item, fotoPerfil: data.fotoPerfil, fotoPreview: base64 }
            : item
        )
      );
      toast.success('Foto do coordenador regional atualizada com sucesso!');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar a foto do coordenador.');
    } finally {
      setSalvandoCoordenador(false);
    }
  };

  const handleSalvarNomeCoordenador = async () => {
    if (!coordenadorSelecionado || !nomeCoordenadorInput.trim()) return;
    setSalvandoCoordenador(true);
    try {
      const { data } = await api.patch(`/acompanhamentos/coordenadores/${coordenadorSelecionado.id}`, {
        nome: nomeCoordenadorInput.trim(),
      });
      setCoordenadores((atuais) =>
        atuais.map((item) =>
          item.id === coordenadorSelecionado.id
            ? { ...item, nome: data.nome }
            : item
        )
      );
      setEditandoNomeCoord(false);
      toast.success('Nome do coordenador atualizado!');
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar nome do coordenador.');
    } finally {
      setSalvandoCoordenador(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modoVisualizacao) {
      setModoVisualizacao(false);
      return;
    }
    if (!coordenadorId) {
      toast.error('Selecione o coordenador regional que fez a assistência.');
      return;
    }
    if (duplasSelecionadas.length === 0) {
      toast.error('Selecione ao menos uma dupla acompanhada.');
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        dataSaida,
        coordenadorId: Number(coordenadorId),
        tipoAssistencia: tipoAssistencia || null,
        distritoId: distritoId ? Number(distritoId) : null,
        distritoNome: distritoSelecionadoObj?.nome || null,
        igrejaId: igrejaId ? Number(igrejaId) : null,
        igrejaNome: igrejaSelecionadaObj?.nome || null,
        observacoes: observacoes || null,
        duplaIds: duplasSelecionadas,
      };

      if (assistenciaEditandoId) {
        const { data } = await api.put(`/acompanhamentos/${assistenciaEditandoId}`, payload);
        setHistoricoAssistencias((atuais) =>
          atuais.map((item) => (item.id === data.id ? data : item))
        );
        toast.success('Assistência atualizada com sucesso!');
        if (isAdminUser) {
          setModoVisualizacao(true);
          return;
        }
      } else {
        const { data } = await api.post('/acompanhamentos', payload);
        setHistoricoAssistencias((atuais) => [data, ...atuais]);
        toast.success(`Assistência registrada! ${duplasSelecionadas.length} dupla(s) acompanhada(s).`);
      }

      setTimeout(() => navigate(`${prefix}/relatorios/assistencia`), 800);
    } catch (err) {
      const erros = err.response?.data?.erros;
      toast.error(erros ? erros.map((erro) => erro.msg).join(', ') : err.response?.data?.erro || 'Erro ao registrar assistência.');
    } finally {
      setEnviando(false);
    }
  };

  const tipoObjSelecionado = TIPOS_ASSISTENCIA.find((t) => t.valor === tipoAssistencia) || null;

  return (
    <div className={isDireto ? 'flex flex-col h-full animate-fade-in' : 'min-h-screen animate-fade-in'}>
      {/* Cabeçalho */}
      <div className={isDireto ? 'flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4' : 'mb-6 p-4 sm:p-6'}>
        <BackButton fallbackTo={`${prefix}/relatorios/assistencia`} className="mb-3" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
              <p className="text-[#C9963A] text-sm font-semibold uppercase tracking-wider">Coordenador</p>
              {isAdminUser && (
                <span
                  className={`ml-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    modoVisualizacao
                      ? 'bg-[#EEF3FB] text-[#1A3A6B] border-[#1A3A6B]/20'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {modoVisualizacao ? '👁️ Modo Visualização' : '✏️ Modo Edição'}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Registro de Assistência (Coordenador Regional)
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {modoVisualizacao
                ? 'Visualize os dados preenchidos pelo coordenador regional antes de editar ou registrar nova assistência'
                : 'Selecione o coordenador regional, tipo de assistência, igreja/distrito e marque as duplas acompanhadas'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isAdminUser && (
              modoVisualizacao ? (
                <button
                  type="button"
                  onClick={() => setModoVisualizacao(false)}
                  className="btn-primary whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar Dados
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModoVisualizacao(true)}
                  className="btn-outline whitespace-nowrap px-4 py-2 text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Ver Visualização
                </button>
              )
            )}
            <button
              type="button"
              className="btn-outline whitespace-nowrap px-4 py-2 text-sm"
              onClick={() => navigate(`${prefix}/relatorios/assistencia`)}
            >
              Ver relatório
            </button>
          </div>
        </div>
      </div>

      {/* Input oculto para upload de foto do coordenador */}
      <input
        ref={fotoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleTrocarFotoCoordenador}
      />

      <form onSubmit={handleSubmit} className={isDireto ? 'flex-1 flex flex-col min-h-0' : ''}>
        <div className={isDireto ? 'flex-1 overflow-y-auto p-4 sm:p-6 bg-[#F4F5F7]' : 'p-4 sm:p-6'}>
          <div className="max-w-3xl mx-auto space-y-5">

            {/* Banner exclusivo para Super Admin / Admin controlar qual registro visualizar ou editar */}
            {isAdminUser && (
              <div className="rounded-2xl border border-[#1A3A6B]/15 bg-gradient-to-r from-[#1A3A6B] via-[#1f457e] to-[#2a5298] p-4 sm:p-5 text-white shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#e5b05a]">
                      Painel de Supervisão • Super Admin / Admin
                    </span>
                    <h2 className="text-base sm:text-lg font-bold mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>
                      {modoVisualizacao
                        ? 'Visualização prévia dos dados do Coordenador Regional'
                        : assistenciaEditandoId
                          ? `Editando Assistência #${assistenciaEditandoId}`
                          : 'Preenchendo Nova Assistência'}
                    </h2>
                    <p className="text-xs text-white/80 mt-0.5">
                      {modoVisualizacao
                        ? 'Inspecione os dados preenchidos abaixo e clique em "Habilitar Edição" quando desejar alterar ou cadastrar.'
                        : 'Você está no modo de edição. Altere os campos necessários ou adicione um novo registro.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    {modoVisualizacao ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setModoVisualizacao(false)}
                          style={{ minHeight: '38px' }}
                          className="!min-h-0 rounded-xl bg-[#C9963A] hover:bg-[#b8862f] text-white font-bold text-xs px-4 py-2 shadow-sm transition-all"
                        >
                          ✏️ Habilitar Edição
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            limparParaNovaAssistencia();
                            setModoVisualizacao(false);
                          }}
                          style={{ minHeight: '38px' }}
                          className="!min-h-0 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs px-3.5 py-2 border border-white/20 transition-all"
                        >
                          + Nova Assistência
                        </button>
                      </>
                    ) : (
                      <>
                        {assistenciaEditandoId && (
                          <button
                            type="button"
                            onClick={limparParaNovaAssistencia}
                            style={{ minHeight: '38px' }}
                            className="!min-h-0 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs px-3.5 py-2 border border-white/20 transition-all"
                          >
                            + Criar Novo Registro em Branco
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setModoVisualizacao(true)}
                          style={{ minHeight: '38px' }}
                          className="!min-h-0 rounded-xl bg-white text-[#1A3A6B] font-bold text-xs px-4 py-2 shadow-sm transition-all"
                        >
                          👁️ Voltar à Visualização
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Seletor de assistências já registradas por este coordenador */}
                {assistenciasDoCoordenador.length > 0 && (
                  <div className="mt-3.5 pt-3.5 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs text-white/85 font-medium">
                      📋 Registros preenchidos por <strong>{coordenadorSelecionado?.nome}</strong> ({assistenciasDoCoordenador.length}):
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={assistenciaEditandoId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            limparParaNovaAssistencia();
                            return;
                          }
                          const reg = assistenciasDoCoordenador.find((item) => String(item.id) === String(val));
                          if (reg) preencherFormularioComAssistencia(reg);
                        }}
                        style={{ minHeight: '34px' }}
                        className="rounded-lg bg-white/95 text-[#1A3A6B] text-xs font-semibold px-3 py-1.5 focus:outline-none"
                      >
                        <option value="">-- Novo registro em branco --</option>
                        {assistenciasDoCoordenador.map((reg) => (
                          <option key={reg.id} value={reg.id}>
                            {formatarDataBr(reg.dataSaida)}
                            {reg.tipoAssistencia ? ` • ${reg.tipoAssistencia}` : ''}
                            {reg.igrejaNome ? ` • ${reg.igrejaNome}` : ''}
                            {` (${reg.duplas?.length || 0} dupla(s))`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =================================================================
                SEÇÃO 1 — COORDENADOR REGIONAL (Foto + Nome + Região)
               ================================================================= */}
            <div className="card">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
                    1
                  </div>
                  <div>
                    <h2 className="font-bold text-[#1A3A6B]">Coordenador Regional</h2>
                    <p className="text-xs text-gray-400">
                      Identificação, foto e região do coordenador responsável pela assistência
                    </p>
                  </div>
                </div>
                {coordenadorSelecionado && coordenadores.length > 1 && !trocandoCoordenador && (
                  <button
                    type="button"
                    onClick={() => setTrocandoCoordenador(true)}
                    style={{ minHeight: '34px' }}
                    className="!min-h-0 px-3 py-1.5 rounded-xl text-xs font-bold text-[#1A3A6B] bg-[#EEF3FB] hover:bg-[#E0E9F8] transition-colors"
                  >
                    Trocar coordenador
                  </button>
                )}
              </div>

              {/* Caso ainda não haja coordenador selecionado ou o usuário clicou em "Trocar coordenador" */}
              {(!coordenadorSelecionado || trocandoCoordenador) && (
                <div className="mb-4">
                  <Campo label="Selecione o coordenador regional" obrigatorio>
                    <div className="flex gap-2">
                      <select
                        className="input-field flex-1"
                        value={coordenadorId}
                        onChange={(e) => selecionarCoordenador(e.target.value)}
                        required
                      >
                        <option value="">Selecione o coordenador regional</option>
                        {coordenadores.map((coordenador) => (
                          <option key={coordenador.id} value={coordenador.id}>
                            {coordenador.nome}{coordenador.regiao?.nome ? ` - ${coordenador.regiao.nome}` : ''}
                          </option>
                        ))}
                      </select>
                      {coordenadorSelecionado && trocandoCoordenador && (
                        <button
                          type="button"
                          onClick={() => setTrocandoCoordenador(false)}
                          className="btn-outline px-3 py-2 text-xs"
                        >
                          Manter
                        </button>
                      )}
                    </div>
                  </Campo>
                </div>
              )}

              {/* Card visual com Foto e Nome do Coordenador Regional (aparece tanto na visualização quanto na edição) */}
              {coordenadorSelecionado && (
                <div className="rounded-2xl border border-[#D4E1F5] bg-gradient-to-br from-[#F8FAFF] via-white to-[#FDF8EE]/50 p-4 sm:p-5 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
                  {/* Foto do Coordenador com opção de adicionar/trocar */}
                  <div className="flex flex-col items-center gap-2 flex-shrink-0">
                    <div
                      onClick={() => !salvandoCoordenador && fotoInputRef.current?.click()}
                      className="group relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#C9963A]/50 bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] shadow-md flex items-center justify-center cursor-pointer"
                      title="Clique para adicionar ou trocar a foto do coordenador"
                    >
                      {coordenadorSelecionado.fotoPreview ? (
                        <img
                          src={coordenadorSelecionado.fotoPreview}
                          alt={coordenadorSelecionado.nome}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-2xl sm:text-3xl font-bold text-white select-none">
                          {(coordenadorSelecionado.nome || 'C').charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-center p-1">
                        <span className="text-[11px] font-bold text-white leading-tight">
                          {salvandoCoordenador
                            ? 'Salvando...'
                            : coordenadorSelecionado.fotoPreview
                              ? 'Trocar foto'
                              : 'Adicionar foto'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={salvandoCoordenador}
                      onClick={() => fotoInputRef.current?.click()}
                      style={{ minHeight: '28px' }}
                      className="!min-h-0 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#1A3A6B] border border-gray-200 hover:border-[#1A3A6B] shadow-2xs transition-colors"
                    >
                      📷 {coordenadorSelecionado.fotoPreview ? 'Trocar foto' : 'Adicionar foto'}
                    </button>
                  </div>

                  {/* Dados do Coordenador (Nome, Região, E-mail e opção de editar nome) */}
                  <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#C9963A]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#9a6b18]">
                        🗺️ {coordenadorSelecionado.regiao?.nome || 'Região vinculada'}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                        ✓ Coordenador Regional
                      </span>
                    </div>

                    {editandoNomeCoord ? (
                      <div className="mt-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <input
                          type="text"
                          value={nomeCoordenadorInput}
                          onChange={(e) => setNomeCoordenadorInput(e.target.value)}
                          placeholder="Nome do coordenador regional"
                          className="input-field flex-1 text-sm font-semibold"
                        />
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={salvandoCoordenador}
                            onClick={handleSalvarNomeCoordenador}
                            style={{ minHeight: '38px' }}
                            className="!min-h-0 rounded-xl bg-[#1A3A6B] text-white text-xs font-bold px-3.5 py-2 hover:bg-[#0f2347] transition-colors"
                          >
                            Salvar nome
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditandoNomeCoord(false);
                              setNomeCoordenadorInput(coordenadorSelecionado.nome || '');
                            }}
                            style={{ minHeight: '38px' }}
                            className="!min-h-0 rounded-xl border border-gray-200 bg-white text-gray-600 text-xs font-semibold px-3 py-2 hover:bg-gray-50"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <h3
                          className="text-lg sm:text-xl font-bold text-[#1A3A6B] break-words"
                          style={{ fontFamily: 'Georgia, serif' }}
                        >
                          {coordenadorSelecionado.nome}
                        </h3>
                        {!modoVisualizacao && (
                          <button
                            type="button"
                            onClick={() => {
                              setNomeCoordenadorInput(coordenadorSelecionado.nome || '');
                              setEditandoNomeCoord(true);
                            }}
                            style={{ minHeight: '26px' }}
                            className="!min-h-0 text-[11px] font-semibold text-gray-400 hover:text-[#1A3A6B] px-2 py-0.5 rounded-md hover:bg-white transition-colors"
                            title="Editar nome do coordenador"
                          >
                            ✏️ Editar nome
                          </button>
                        )}
                      </div>
                    )}

                    {coordenadorSelecionado.email && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        ✉️ {coordenadorSelecionado.email}
                      </p>
                    )}

                    <div className="mt-3 pt-3 border-t border-gray-200/60 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-gray-500">
                      <span>
                        <strong className="text-[#1A3A6B]">{distritosDaRegiao.length}</strong> distrito(s) na região
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-[#1A3A6B]">{igrejasDaRegiao.length}</strong> igreja(s)
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-[#1A3A6B]">{assistenciasDoCoordenador.length}</strong> assistência(s) registrada(s)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* =================================================================
                SEÇÃO 2 — DATA DA ASSISTÊNCIA
               ================================================================= */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
                  2
                </div>
                <div>
                  <h2 className="font-bold text-[#1A3A6B]">Data da Assistência</h2>
                  <p className="text-xs text-gray-400">Data em que a atividade ou visita foi realizada</p>
                </div>
              </div>

              {modoVisualizacao ? (
                <div className="rounded-xl border border-gray-100 bg-[#F8FAFC] p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#1A3A6B]/10 text-[#1A3A6B] flex items-center justify-center text-lg">
                      📅
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Data da visita</p>
                      <p className="text-base font-bold text-[#1A3A6B] mt-0.5">{formatarDataBr(dataSaida)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Campo label="Data da visita" obrigatorio>
                    <input
                      type="date"
                      className="input-field"
                      value={dataSaida}
                      onChange={(e) => setDataSaida(e.target.value)}
                      required
                    />
                  </Campo>
                </div>
              )}
            </div>

            {/* =================================================================
                SEÇÃO 3 — TIPO DE ASSISTÊNCIA (Antes de Duplas Acompanhadas)
               ================================================================= */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
                  3
                </div>
                <div>
                  <h2 className="font-bold text-[#1A3A6B]">Tipo de Assistência</h2>
                  <p className="text-xs text-gray-400">
                    Modalidade da assistência realizada pelo coordenador regional
                  </p>
                </div>
              </div>

              {modoVisualizacao ? (
                tipoObjSelecionado ? (
                  <div className="rounded-xl border border-[#D4E1F5] bg-[#F8FAFF] p-4 flex items-center gap-3.5">
                    <span
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 border"
                      style={{
                        backgroundColor: tipoObjSelecionado.bg,
                        color: tipoObjSelecionado.cor,
                        borderColor: `${tipoObjSelecionado.cor}30`,
                      }}
                    >
                      {tipoObjSelecionado.icone}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#C9963A]">
                        Tipo de Assistência Preenchido
                      </p>
                      <p className="text-base font-bold text-[#1A3A6B]">{tipoObjSelecionado.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{tipoObjSelecionado.descricao}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-4 text-sm text-gray-400 flex items-center justify-between gap-3">
                    <span>Nenhum tipo de assistência selecionado neste registro.</span>
                    <button
                      type="button"
                      onClick={() => setModoVisualizacao(false)}
                      style={{ minHeight: '32px' }}
                      className="!min-h-0 text-xs font-bold text-[#1A3A6B] hover:underline"
                    >
                      Preencher agora →
                    </button>
                  </div>
                )
              ) : (
                <Campo label="Tipo de Assistência">
                  <SeletorTipoAssistencia
                    value={tipoAssistencia}
                    onChange={setTipoAssistencia}
                  />
                </Campo>
              )}
            </div>

            {/* =================================================================
                SEÇÃO 4 — IGREJA E DISTRITO (Busca Inteligente da Região)
               ================================================================= */}
            <div className="card">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
                  4
                </div>
                <div>
                  <h2 className="font-bold text-[#1A3A6B]">Igreja e Distrito</h2>
                  <p className="text-xs text-gray-400">
                    {coordenadorSelecionado?.regiao?.nome
                      ? `Busca inteligente de distritos e igrejas da ${coordenadorSelecionado.regiao.nome}`
                      : 'Selecione o coordenador para buscar distritos e igrejas da região'}
                  </p>
                </div>
              </div>

              {modoVisualizacao ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="rounded-xl border border-gray-100 bg-[#F8FAFC] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Distrito</p>
                    <p className="text-base font-bold text-[#1A3A6B] mt-1">
                      {distritoSelecionadoObj?.nome || 'Não especificado'}
                    </p>
                    {coordenadorSelecionado?.regiao?.nome && (
                      <p className="text-xs text-[#C9963A] font-medium mt-0.5">
                        {coordenadorSelecionado.regiao.nome}
                      </p>
                    )}
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-[#F8FAFC] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Igreja</p>
                    <p className="text-base font-bold text-[#1A3A6B] mt-1">
                      {igrejaSelecionadaObj?.nome || 'Não especificada'}
                    </p>
                    {igrejaSelecionadaObj?.distritoNome && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        Distrito {igrejaSelecionadaObj.distritoNome}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Campo label="Distrito (Busca Inteligente)">
                    <SeletorLocalInteligente
                      label="Distrito"
                      icone="⛪"
                      itens={distritosDaRegiao}
                      value={distritoId}
                      onChange={handleSelecionarDistrito}
                      disabled={!coordenadorId}
                      placeholder={
                        coordenadorId
                          ? 'Digite o nome do distrito...'
                          : 'Selecione o coordenador primeiro'
                      }
                      subtituloItem={(d) => d.regiaoNome || coordenadorSelecionado?.regiao?.nome || ''}
                      badgeItem={(d) => {
                        const qtdIgrejas = igrejasDaRegiao.filter((ig) => String(ig.distritoId) === String(d.id)).length;
                        return qtdIgrejas ? `${qtdIgrejas} igreja(s)` : '';
                      }}
                      mensagemVazio="Nenhum distrito encontrado para esta região."
                    />
                  </Campo>

                  <Campo label="Igreja (Busca Inteligente)">
                    <SeletorLocalInteligente
                      label="Igreja"
                      icone="🏛️"
                      itens={igrejasDisponiveisSelect}
                      value={igrejaId}
                      onChange={handleSelecionarIgreja}
                      disabled={!coordenadorId}
                      placeholder={
                        distritoSelecionadoObj
                          ? `Buscar igreja em ${distritoSelecionadoObj.nome}...`
                          : 'Digite o nome da igreja da região...'
                      }
                      subtituloItem={(ig) => (ig.distritoNome ? `Distrito: ${ig.distritoNome}` : '')}
                      badgeItem={(ig) => {
                        const qtdDuplas = duplas.filter((d) => String(d.igrejaId || d.igreja?.id) === String(ig.id)).length;
                        return qtdDuplas ? `${qtdDuplas} dupla(s)` : '';
                      }}
                      mensagemVazio="Nenhuma igreja encontrada para este filtro."
                    />
                  </Campo>
                </div>
              )}
            </div>

            {/* =================================================================
                SEÇÃO 5 — DUPLAS ACOMPANHADAS
               ================================================================= */}
            <div className="card">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
                    5
                  </div>
                  <div>
                    <h2 className="font-bold text-[#1A3A6B]">Duplas Acompanhadas</h2>
                    <p className="text-xs text-[#C9963A] font-medium">
                      {duplasSelecionadas.length > 0
                        ? `${duplasSelecionadas.length} dupla(s) selecionada(s)`
                        : igrejaSelecionadaObj
                          ? `Igreja ${igrejaSelecionadaObj.nome}`
                          : distritoSelecionadoObj
                            ? `Distrito ${distritoSelecionadoObj.nome}`
                            : coordenadorSelecionado?.regiao?.nome || 'Selecione o coordenador para ver as duplas da região'}
                    </p>
                  </div>
                </div>
              </div>

              {modoVisualizacao ? (
                objetosDuplasSelecionadas.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {objetosDuplasSelecionadas.map((dupla) => (
                      <div
                        key={dupla.id}
                        className="rounded-xl border border-[#D4E1F5] bg-[#F8FAFF] p-3 flex items-center gap-3"
                      >
                        <div className="flex items-center -space-x-2 flex-shrink-0">
                          <FotoMini src={dupla.fotoLiderPreview} nome={dupla.liderNome} />
                          <FotoMini src={dupla.fotoMembro2Preview} nome={dupla.membro2Nome} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-sm text-[#1A3A6B] truncate">
                            {dupla.liderNome} + {dupla.membro2Nome}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {dupla.igreja?.nome || dupla.bairro || 'Sem local'}
                            {dupla.distrito?.nome ? ` • ${dupla.distrito.nome}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 p-6 text-center text-sm text-gray-400">
                    Nenhuma dupla selecionada neste registro.
                  </div>
                )
              ) : (
                <>
                  <div className="relative mb-4">
                    <svg className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Filtrar duplas por nome, igreja, distrito ou bairro..."
                      className="input-field pl-12"
                      style={{ paddingLeft: '3.25rem' }}
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>

                  {carregando ? (
                    <SkeletonDuplas />
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {duplasFiltradas.map((dupla) => {
                        const selecionada = duplasSelecionadas.includes(dupla.id);
                        return (
                          <button
                            key={dupla.id}
                            type="button"
                            onClick={() => toggleDupla(dupla.id)}
                            className={`w-full min-h-[64px] text-left rounded-xl border-2 p-3 transition-all duration-200 flex items-center gap-3 active:scale-[0.99] active:opacity-80 ${
                              selecionada ? 'border-[#1A3A6B] bg-[#1A3A6B]/5' : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              selecionada ? 'bg-[#1A3A6B] border-[#1A3A6B]' : 'border-gray-300 bg-white'
                            }`}>
                              {selecionada && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>

                            <div className="flex items-center -space-x-2 flex-shrink-0">
                              <FotoMini src={dupla.fotoLiderPreview} nome={dupla.liderNome} />
                              <FotoMini src={dupla.fotoMembro2Preview} nome={dupla.membro2Nome} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className={`font-semibold text-sm truncate ${selecionada ? 'text-[#1A3A6B]' : 'text-gray-700'}`}>
                                {dupla.liderNome} + {dupla.membro2Nome}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {[dupla.igreja?.nome, dupla.distrito?.nome, dupla.bairro].filter(Boolean).join(' • ')}
                              </p>
                            </div>

                            {dupla.ultimoAcompanhamento && (
                              <span className="hidden sm:inline text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                                {new Date(dupla.ultimoAcompanhamento).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </button>
                        );
                      })}

                      {duplasFiltradas.length === 0 && (
                        <div className="text-center py-8 text-gray-400 space-y-2">
                          <p>{coordenadorId ? 'Nenhuma dupla encontrada para o filtro selecionado.' : 'Selecione um coordenador regional.'}</p>
                          {(distritoId || igrejaId) && (
                            <button
                              type="button"
                              onClick={() => {
                                setDistritoId('');
                                setIgrejaId('');
                              }}
                              style={{ minHeight: '32px' }}
                              className="!min-h-0 text-xs font-bold text-[#1A3A6B] underline"
                            >
                              Ver todas as duplas da região
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {duplasSelecionadas.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => setDuplasSelecionadas([])}
                        className="min-h-11 text-xs text-gray-400 hover:text-gray-600 transition-colors active:scale-95"
                      >
                        Limpar seleção
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* =================================================================
                SEÇÃO 6 — RELATÓRIO DESCRITIVO DA ATIVIDADE (Altura Maior)
               ================================================================= */}
            <div className="card">
              <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#2a5298] flex items-center justify-center text-white font-bold text-sm shadow-md">
                    6
                  </div>
                  <div>
                    <h2 className="font-bold text-[#1A3A6B]">Relatório Descritivo da Atividade</h2>
                    <p className="text-xs text-gray-400">
                      Descrição detalhada da atividade realizada, orientações e encaminhamentos
                    </p>
                  </div>
                </div>
              </div>

              {modoVisualizacao ? (
                <div
                  style={{ minHeight: '320px' }}
                  className="rounded-xl border border-gray-200 bg-[#fafbfc] p-4 sm:p-5 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap"
                >
                  {observacoes ? (
                    observacoes
                  ) : (
                    <span className="text-gray-400 italic">
                      Nenhum relatório descritivo preenchido para esta atividade.
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <Campo label="Relatório Descritivo da Atividade">
                    <textarea
                      rows={16}
                      style={{ minHeight: '420px' }}
                      className="input-field !min-h-[420px] sm:!min-h-[480px] resize-y text-sm leading-relaxed py-3.5"
                      placeholder="Descreva detalhadamente como foi a atividade realizada, treinamentos ou orientações ministradas, dificuldades identificadas e próximos passos combinados..."
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      spellCheck="true"
                    />
                  </Campo>
                  <div className="mt-2 flex flex-col gap-1 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                    <span>Campo amplo e livre, sem limite de caracteres. Você também pode expandir pelo canto inferior.</span>
                    <span className="font-semibold text-[#1A3A6B]">{observacoes.length.toLocaleString('pt-BR')} caracteres</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Barra inferior de ações */}
        <div className={isDireto
          ? 'flex-shrink-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3'
          : 'max-w-3xl mx-auto flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 sm:p-6 pb-24 sm:pb-8'
        }>
          <div className="text-sm text-gray-500">
            {duplasSelecionadas.length > 0
              ? <span className="font-medium text-[#1A3A6B]">{duplasSelecionadas.length} dupla(s) selecionada(s)</span>
              : 'Nenhuma dupla selecionada'}
          </div>
          <div className="flex w-full sm:w-auto gap-3">
            <button type="button" onClick={() => navigate(-1)} className="btn-outline flex-1 sm:flex-none">
              Cancelar
            </button>
            {modoVisualizacao ? (
              <button
                type="button"
                onClick={() => setModoVisualizacao(false)}
                className="btn-primary flex flex-1 sm:flex-none items-center justify-center gap-2"
              >
                ✏️ Editar Dados
              </button>
            ) : (
              <button
                type="submit"
                disabled={enviando || duplasSelecionadas.length === 0 || !coordenadorId}
                className="btn-primary flex flex-1 sm:flex-none items-center justify-center gap-2"
              >
                {enviando ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                    {assistenciaEditandoId ? 'Salvar Alterações' : 'Registrar Assistência'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
