import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

export default function CriarContaDupla() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [carregandoToken, setCarregandoToken] = useState(true);
  const [dadosDupla, setDadosDupla] = useState(null);
  const [erroToken, setErroToken] = useState('');

  const [form, setForm] = useState({ email: '', senha: '', confirmarSenha: '' });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    let ativo = true;

    if (!token) {
      setErroToken('Token de convite ausente. Leia novamente o QR Code fornecido pelo responsável.');
      setCarregandoToken(false);
      return;
    }

    const validarToken = async () => {
      try {
        setCarregandoToken(true);
        setErroToken('');
        const { data } = await api.get('/auth/validar-token-dupla', {
          params: { token },
        });
        if (!ativo) return;
        setDadosDupla(data);
        if (data.emailAtual) {
          setForm((atual) => ({ ...atual, email: data.emailAtual }));
        }
      } catch (err) {
        if (!ativo) return;
        setErroToken(
          err.response?.data?.erro ||
          'Este QR Code ou link expirou ou é inválido. Solicite um novo ao administrador ou coordenador.'
        );
      } finally {
        if (ativo) setCarregandoToken(false);
      }
    };

    validarToken();
    return () => {
      ativo = false;
    };
  }, [token]);

  const setCampo = (campo, valor) => {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErroForm('');

    if (!form.email || !form.email.includes('@')) {
      setErroForm('Informe um e-mail válido.');
      return;
    }

    if (form.senha.trim().length < 8) {
      setErroForm('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    if (form.senha !== form.confirmarSenha) {
      setErroForm('As senhas informadas não conferem.');
      return;
    }

    setSalvando(true);
    try {
      await api.post('/auth/criar-conta-dupla', {
        token,
        email: form.email,
        senha: form.senha,
      });
      setConcluido(true);
    } catch (err) {
      setErroForm(err.response?.data?.erro || 'Não foi possível criar o acesso da dupla.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F5F7] p-4 sm:p-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
        {/* Cabeçalho Institucional */}
        <div className="bg-gradient-to-br from-[#0f2347] to-[#1A3A6B] px-6 py-7 text-center">
          <img
            src="/logoiasd.png"
            alt="Logo IASD"
            className="mx-auto h-16 w-16 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-[#C9963A]">
            Dupla Missionária
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>
            Acesso ao Sistema
          </h1>
        </div>

        {/* Estado: Carregando validação do link */}
        {carregandoToken ? (
          <div className="p-8 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#1A3A6B] border-t-transparent" />
            <p className="mt-4 text-sm font-medium text-gray-600">Validando convite da dupla...</p>
          </div>
        ) : erroToken ? (
          /* Estado: Token Inválido / Expirado */
          <div className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-bold text-gray-900">Link ou QR Code Expirado</h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {erroToken}
            </p>
            <div className="mt-6 border-t border-gray-100 pt-4">
              <Link to="/login" className="btn-primary inline-flex w-full items-center justify-center">
                Ir para o login
              </Link>
            </div>
          </div>
        ) : concluido ? (
          /* Estado: Sucesso na Criação */
          <div className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#1A3A6B]">Conta configurada com sucesso!</h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              O acesso da dupla <strong>{dadosDupla?.dupla?.nome}</strong> está pronto.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Entre no sistema usando o e-mail <strong>{form.email}</strong> e a senha escolhida.
            </p>
            <Link to="/login" className="btn-primary mt-6 inline-flex w-full items-center justify-center py-2.5">
              Fazer login no sistema
            </Link>
          </div>
        ) : (
          /* Formulário de Criação */
          <form onSubmit={salvar} className="space-y-4 p-6">
            {/* Card com a Identificação da Dupla */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5">
              <div className="flex items-start gap-2.5">
                <span className="text-xl">👥</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1A3A6B]">
                    Dupla Missionária
                  </p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {dadosDupla?.dupla?.nome}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {dadosDupla?.dupla?.igrejaNome ? `${dadosDupla.dupla.igrejaNome} • ` : ''}
                    {dadosDupla?.dupla?.distritoNome || 'Associação Paulistana'}
                  </p>
                </div>
              </div>
            </div>

            {dadosDupla?.jaTemConta && (
              <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 border border-amber-200">
                ℹ️ Esta dupla já possuía um acesso anterior. Ao salvar, suas novas credenciais serão atualizadas.
              </p>
            )}

            <p className="text-xs text-gray-500 leading-relaxed">
              Defina o e-mail (login) e a senha que a dupla utilizará para entrar no sistema e acompanhar seus estudos bíblicos.
            </p>

            {/* Campo E-mail */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-700">
                E-mail de acesso (Login)
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setCampo('email', e.target.value)}
                placeholder="exemplo@gmail.com"
                className="input-field w-full text-sm"
                autoComplete="email"
              />
            </div>

            {/* Campo Nova Senha */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wide text-gray-700">
                  Senha de acesso
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="text-xs text-[#1A3A6B] hover:underline"
                >
                  {mostrarSenha ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                minLength={8}
                value={form.senha}
                onChange={(e) => setCampo('senha', e.target.value)}
                placeholder="Mínimo de 8 caracteres"
                className="input-field w-full text-sm"
                autoComplete="new-password"
              />
            </div>

            {/* Campo Confirmar Senha */}
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-700">
                Confirmar senha
              </label>
              <input
                type={mostrarSenha ? 'text' : 'password'}
                required
                minLength={8}
                value={form.confirmarSenha}
                onChange={(e) => setCampo('confirmarSenha', e.target.value)}
                placeholder="Repita a senha"
                className="input-field w-full text-sm"
                autoComplete="new-password"
              />
            </div>

            {erroForm && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {erroForm}
              </div>
            )}

            <button
              type="submit"
              disabled={salvando}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {salvando ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Salvando acesso...</span>
                </>
              ) : (
                <span>Criar acesso da dupla</span>
              )}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
