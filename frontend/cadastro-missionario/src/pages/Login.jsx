import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import VersiculoHero from '../components/VersiculoHero';

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
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await login(form.email, form.senha);
      navigate('/regioes');
    } catch (err) {
      console.error('Erro no login:', err);
      const mensagem = err.response?.data?.erro
        || err.response?.data?.message
        || err.message
        || 'Erro ao entrar. Verifique suas credenciais.';
      setErro(`Erro ao entrar: ${mensagem}`);
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
                Cadastro
              </h1>
              <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
                Duplas Missionárias
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

          {/* Estatísticas decorativas */}
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {[
              { label: 'Regiões', valor: '5+' },
              { label: 'Distritos', valor: '20+' },
              { label: 'Duplas', valor: '100+' },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-lg px-2 py-2 text-center">
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
            <h1 className="text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Cadastro
            </h1>
            <h1 className="text-2xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
              Duplas Missionárias
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
                <input
                  type="password"
                  id="senha"
                  required
                  placeholder="••••••••"
                  className="input-field"
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                />
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                  {erro}
                </div>
              )}

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

            {/* Credenciais de demo */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3">Credenciais de demonstração</p>
              <div className="space-y-2">
                {[
                  { perfil: 'Admin', email: 'admin@ap.adventistas.org', senha: 'Admin@123' },
                  { perfil: 'Coordenador', email: 'coord.centro@ap.adventistas.org', senha: 'Coord@123' },
                  { perfil: 'Pastor', email: 'pastor.santos@ap.adventistas.org', senha: 'Pastor@123' },
                ].map((cred) => (
                  <button
                    key={cred.perfil}
                    type="button"
                    onClick={() => setForm({ email: cred.email, senha: cred.senha })}
                    className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-[#1A3A6B]/5 border border-gray-100 transition-colors"
                  >
                    <span className="text-xs font-semibold text-[#1A3A6B]">{cred.perfil}: </span>
                    <span className="text-xs text-gray-500">{cred.email}</span>
                  </button>
                ))}
              </div>
            </div>
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
