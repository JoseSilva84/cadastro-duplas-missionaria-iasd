import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VersiculoHero from '../components/VersiculoHero';
import InstallPWA from '../components/InstallPWA';
import { toast } from '../lib/toast';
import api from '../lib/api';

// Logo IASD (PNG) — com background azul escuro para visibilidade
const Cruz = ({ size = 'w-25 h-25' }) => (
  <div
    className={`${size} flex items-center justify-center rounded-2xl shadow-md flex-shrink-0`}
    style={{ background: 'linear-gradient(135deg, #0f2347 0%, #1A3A6B 100%)' }}
  >
    <img src="/logoiasd.png" alt="Logo IASD" className="w-full h-full object-contain p-1.5" />
  </div>
);

const destinoPosLogin = () => '/dashboard';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: searchParams.get('email') || '',
    senha: '',
  });
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modalChaveAberto, setModalChaveAberto] = useState(false);
  const [chaveInput, setChaveInput] = useState('');
  const [validandoChave, setValidandoChave] = useState(false);
  const [estatisticas, setEstatisticas] = useState({
    regioes: '-',
    distritos: '-',
    duplas: '-',
    classes: '-',
    pontosEstudo: '-',
    classesBiblicas: '-',
    estudantes: '-',
    estudosIndividuais: '-',
    estudantesPontos: '-',
    estudantesClasses: '-',
  });

  useEffect(() => {
    api.get('/public/estatisticas')
      .then((res) => {
        setEstatisticas({
          regioes: res.data.regioes,
          distritos: res.data.distritos,
          duplas: res.data.duplas,
          classes: res.data.classes,
          pontosEstudo: res.data.pontosEstudo,
          classesBiblicas: res.data.classesBiblicas,
          estudantes: res.data.estudantes,
          estudosIndividuais: res.data.estudosIndividuais,
          estudantesPontos: res.data.estudantesPontos,
          estudantesClasses: res.data.estudantesClasses,
        });
      })
      .catch((err) => console.error('Erro ao carregar estatísticas:', err));
  }, []);

  // Se o usuário acessar /login?chave=..., redireciona direto para o cadastro com chave
  useEffect(() => {
    const chave = searchParams.get('chave');
    if (chave) {
      navigate(`/cadastro-dupla?chave=${encodeURIComponent(chave)}`, { replace: true });
    }
  }, [searchParams, navigate]);

  const handleValidarChaveModal = async (e) => {
    e?.preventDefault();
    const chave = String(chaveInput || '').trim().toUpperCase();
    if (!chave) {
      toast.error('Informe a chave de acesso.');
      return;
    }

    setValidandoChave(true);
    try {
      await api.get('/auth/validar-chave-cadastro', { params: { chave } });
      setModalChaveAberto(false);
      navigate(`/cadastro-dupla?chave=${encodeURIComponent(chave)}`);
    } catch (err) {
      const msg = err.response?.data?.erro || 'Chave de acesso inválida ou não encontrada.';
      toast.error(msg);
    } finally {
      setValidandoChave(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const usuarioLogado = await login(form.email, form.senha);
      navigate(destinoPosLogin(usuarioLogado), { replace: true });
    } catch (err) {
      console.error('Erro no login:', err);
      const mensagem = err.response?.data?.erro
        || err.response?.data?.message
        || err.message
        || 'Erro ao entrar. Verifique suas credenciais.';
      toast.error(`Erro ao entrar: ${mensagem}`);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <InstallPWA />
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Painel esquerdo — Identidade visual */}
      <div
        className="hidden lg:flex flex-col items-center justify-center w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0f2347 0%, #1A3A6B 55%, #2a5298 100%)' }}
      >
        {/* Padrão decorativo de fundo */}
        <div className="absolute inset-0 opacity-5">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute border border-white rounded-full"
              style={{
                width: `${(i + 1) * 120}px`,
                height: `${(i + 1) * 120}px`,
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-8 gap-4 py-6">
          {/* Cruz + Logo */}
          <div className="flex flex-col items-center gap-2">
            <Cruz />
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-28 h-0.5 rounded-full bg-[#C9963A]" />
              <h1 className="text-2xl font-bold text-white mt-1" style={{ fontFamily: 'Georgia, serif' }}>
                PROGRAMA
              </h1>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                CAPACITAÇÃO MISSIONÁRIA
              </h1>
              <p className="text-[#C9963A] font-semibold text-base tracking-wide mt-0.5">
                Associação Paulistana
              </p>
              <p className="text-white/60 text-xs mt-1 mb-5">
                <a href="https://www.adventistas.org/pt/" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                  @Igreja Adventista do Sétimo Dia
                </a>
              </p>
            </div>
          </div>

          {/* Versículo animado — Mateus 28:19 */}
          <VersiculoHero />

          {/* Estatísticas decorativas dinâmicas */}
          <div className="grid grid-cols-5 gap-3 w-full max-w-xl">
            {[
              { label: 'Regiões', valor: estatisticas.regioes, tooltip: 'Regioes: total de regioes missionarias cadastradas no sistema.' },
              { label: 'Distritos', valor: estatisticas.distritos, tooltip: 'Distritos: total de distritos cadastrados em todas as regioes.' },
              { label: 'Duplas', valor: estatisticas.duplas, tooltip: 'Duplas: total de duplas missionárias cadastradas.' },
              {
                label: 'PE + Classe',
                valor: estatisticas.classes,
                tooltip: `PE + Classe = pontos de estudo (${estatisticas.pontosEstudo}) + classes biblicas (${estatisticas.classesBiblicas}).`,
              },
              {
                label: 'Estudantes',
                valor: estatisticas.estudantes,
                tooltip: `Estudantes = estudos individuais (${estatisticas.estudosIndividuais}) + estudantes dos pontos (${estatisticas.estudantesPontos}) + estudantes das classes (${estatisticas.estudantesClasses}).`,
                tooltipClass: 'smart-tooltip-up smart-tooltip-right',
              },
            ].map((item) => (
              <div key={item.label} className={`smart-tooltip smart-tooltip-up ${item.tooltipClass || ''} bg-white/10 rounded-lg px-2 py-2 text-center`} data-tooltip={item.tooltip || item.label} tabIndex={0}>
                <p className="text-[#C9963A] font-bold text-lg">{item.valor}</p>
                <p className="text-white/70 text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — Formulário de login */}
      <div className="flex-1 flex items-center justify-center bg-[#F4F5F7] px-4 py-4 sm:px-6 sm:py-8 lg:py-12">
        <div className="w-full max-w-md">
          {/* Header mobile */}
          <div className="lg:hidden flex flex-col items-center mb-3 sm:mb-5 gap-1.5 sm:gap-2">
            <Cruz size="w-[102px] h-[102px] sm:w-[116px] sm:h-[116px]" />
            <h1 className="text-2xl sm:text-3xl font-black text-[#1A3A6B] text-center tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
              PCM
            </h1>
            <p className="text-[#C9963A] font-semibold text-xs sm:text-sm">Associação Paulistana</p>
          </div>

          {/* Card de login */}
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-5 sm:p-7 lg:p-8 border border-gray-100">
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-[#1A3A6B] text-center" style={{ fontFamily: 'Georgia, serif' }}>
                Bem-vindo
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1 text-center">Entre com suas credenciais para acessar o sistema</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4 lg:space-y-5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">E-mail</label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder="seu@email.com"
                  className="input-field py-2 sm:py-2.5"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    id="senha"
                    required
                    placeholder="••••••••"
                    className="input-field w-full pr-10 py-2 sm:py-2.5"
                    value={form.senha}
                    onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setMostrarSenha(!mostrarSenha)}
                  >
                    {mostrarSenha ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={carregando}
                className="btn-primary w-full flex items-center justify-center gap-2 mt-1 sm:mt-2 py-2.5 text-sm sm:text-base"
              >
                {carregando ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Entrando...
                  </>
                ) : 'Entrar'}
              </button>
            </form>

            {/* Separador e Botão de Auto-Cadastro com Chave de Acesso */}
            <div className="mt-3.5 sm:mt-5 lg:mt-6">
              <div className="relative flex py-1 sm:py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink mx-3 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-gray-400">ou</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button
                type="button"
                onClick={() => setModalChaveAberto(true)}
                className="mt-1 w-full group relative flex items-center justify-between gap-2.5 p-2 sm:p-2.5 lg:p-3.5 rounded-xl sm:rounded-2xl border-2 border-[#1A3A6B]/30 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 hover:from-blue-100/80 hover:to-blue-50 hover:border-[#1A3A6B] transition-all duration-300 shadow-xs hover:shadow-md active:scale-[0.99]"
              >
                <div className="flex items-center gap-2.5 sm:gap-3 text-left">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-[#1A3A6B] to-[#0f2347] text-white flex items-center justify-center shadow-xs flex-shrink-0 group-hover:scale-105 transition-transform text-sm sm:text-base lg:text-lg">
                    ✨
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-[#1A3A6B] group-hover:text-[#0f2347]">
                        <span className="lg:hidden">Cadastrar nova dupla</span>
                        <span className="hidden lg:inline">Cadastrar Nova Dupla</span>
                      </span>
                      <span className="text-[9px] sm:text-[10px] bg-[#1A3A6B]/15 text-[#1A3A6B] px-1.5 py-0.2 sm:py-0.5 rounded-full font-bold uppercase tracking-wider">Novo</span>
                    </div>
                    <p className="hidden lg:block text-xs text-gray-500 mt-0.5">Auto-cadastro com a chave do pastor</p>
                  </div>
                </div>
                <div className="text-[#1A3A6B] pr-1 group-hover:translate-x-1 transition-transform">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Modal para digitar a Chave de Acesso */}
          {modalChaveAberto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-md w-full border border-gray-100 relative">
                <button
                  type="button"
                  onClick={() => setModalChaveAberto(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 rounded-full p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1A3A6B] flex items-center justify-center text-2xl border border-blue-200 shadow-inner">
                    🔑
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1A3A6B]">Chave de Acesso</h3>
                    <p className="text-xs text-gray-500">Cadastro de Dupla Missionária</p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                  Para cadastrar sua dupla missionária, informe a chave de acesso fornecida pelo seu <strong>Pastor Distrital</strong> ou <strong>Coordenador Regional</strong>.
                </p>

                <form onSubmit={handleValidarChaveModal} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Código da Chave (Ex: ITAPEVI-2026)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="DIGITE SUA CHAVE AQUI"
                      value={chaveInput}
                      onChange={(e) => setChaveInput(e.target.value.toUpperCase())}
                      className="input-field font-mono uppercase text-center tracking-wider text-base"
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setModalChaveAberto(false)}
                      className="w-1/3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={validandoChave || !chaveInput.trim()}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold disabled:opacity-50"
                    >
                      {validandoChave ? 'Verificando...' : 'Avançar para Cadastro →'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} <a href="https://ap.adventistas.org/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:underline">
              Associação Paulistana
            </a> — IASD
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
