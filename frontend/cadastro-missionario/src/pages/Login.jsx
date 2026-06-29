import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, PERFIS } from '../contexts/AuthContext';
import VersiculoHero from '../components/VersiculoHero';
import { toast } from '../lib/toast';
import api from '../lib/api';

// Logo IASD (PNG) — com background azul escuro para visibilidade
const Cruz = ({ size = 'w-25 h-25' }) => (
  <div
    className={`${size} flex items-center justify-center rounded-xl`}
    style={{ background: 'linear-gradient(135deg, #0f2347 0%, #1A3A6B 100%)' }}
  >
    <img src="/logoiasd.png" alt="Logo IASD" className="w-full h-full object-contain p-1" />
  </div>
);

export default function Login() {
  const { login, layout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [carregando, setCarregando] = useState(false);
  const [mostrarSenha, setMostrarSenha] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const usuarioLogado = await login(form.email, form.senha);
      // Se já tem layout salvo, vai direto para o destino
      if (layout === 'direto') {
        navigate(usuarioLogado?.perfil === PERFIS.PASTOR_DISTRITAL ? '/direto/distritos' : '/direto/regioes');
      } else if (layout === 'avancado') {
        navigate(usuarioLogado?.perfil === PERFIS.PASTOR_DISTRITAL ? '/distritos' : '/regioes');
      } else {
        navigate('/escolha-layout');
      }
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
    <div className="min-h-screen flex">
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
              { label: 'Duplas', valor: estatisticas.duplas, tooltip: 'Duplas: total de duplas missionarias cadastradas.' },
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
              <div key={item.label} className={`smart-tooltip ${item.tooltipClass || ''} bg-white/10 rounded-lg px-2 py-2 text-center`} data-tooltip={item.tooltip || item.label} tabIndex={0}>
                <p className="text-[#C9963A] font-bold text-lg">{item.valor}</p>
                <p className="text-white/70 text-xs">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — Formulário de login */}
      <div className="flex-1 flex items-center justify-center bg-[#F4F5F7] px-6 py-12">
        <div className="w-full max-w-md">
          {/* Header mobile */}
          <div className="lg:hidden flex flex-col items-center mb-8 gap-2">
            <Cruz />
            <h1 className="text-2xl font-bold text-[#1A3A6B] text-center" style={{ fontFamily: 'Georgia, serif' }}>
              PROGRAMA
            </h1>
            <h1 className="text-2xl font-bold text-[#1A3A6B] text-center" style={{ fontFamily: 'Georgia, serif' }}>
              CAPACITAÇÃO MISSIONÁRIA
            </h1>
            <p className="text-[#C9963A] font-semibold text-sm">Associação Paulistana</p>
          </div>

          {/* Card de login */}
          <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-[#1A3A6B] text-center" style={{ fontFamily: 'Georgia, serif' }}>
                Bem-vindo
              </h2>
              <p className="text-gray-500 text-sm mt-1 text-center">Entre com suas credenciais para acessar o sistema</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  id="email"
                  required
                  placeholder="seu@email.com"
                  className="input-field"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    id="senha"
                    required
                    placeholder="••••••••"
                    className="input-field w-full pr-10"
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
                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
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

          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} <a href="https://ap.adventistas.org/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:underline">
              Associação Paulistana
            </a> — IASD
          </p>
        </div>
      </div>
    </div>
  );
}
