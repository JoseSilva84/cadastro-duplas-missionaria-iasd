import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

export default function RedefinirAcesso() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ email: '', novaSenha: '', confirmarSenha: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [concluido, setConcluido] = useState(false);

  const setCampo = (campo, valor) => setForm((atual) => ({ ...atual, [campo]: valor }));

  const salvar = async (event) => {
    event.preventDefault();
    setErro('');
    if (!token) {
      setErro('Link de redefinição inválido. Solicite um novo QR Code.');
      return;
    }
    if (form.novaSenha.trim().length < 8) {
      setErro('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (form.novaSenha !== form.confirmarSenha) {
      setErro('As senhas informadas não conferem.');
      return;
    }

    setSalvando(true);
    try {
      await api.post('/auth/redefinir-acesso', {
        token,
        email: form.email,
        novaSenha: form.novaSenha,
      });
      setConcluido(true);
    } catch (err) {
      setErro(err.response?.data?.erro || 'Não foi possível redefinir o acesso.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F5F7] p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
        <div className="bg-gradient-to-br from-[#0f2347] to-[#1A3A6B] px-6 py-7 text-center">
          <img src="/logoiasd.png" alt="Logo IASD" className="mx-auto h-16 w-16 object-contain" />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-[#C9963A]">Acesso seguro</p>
          <h1 className="mt-1 text-2xl font-bold text-white" style={{ fontFamily: 'Georgia, serif' }}>Redefinir login e senha</h1>
        </div>

        {concluido ? (
          <div className="p-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-[#1A3A6B]">Acesso atualizado</h2>
            <p className="mt-2 text-sm text-gray-500">O QR Code foi invalidado. Entre usando seu novo e-mail e sua nova senha.</p>
            <Link to="/login" className="btn-primary mt-6 inline-flex w-full items-center justify-center">Ir para o login</Link>
          </div>
        ) : (
          <form onSubmit={salvar} className="space-y-5 p-6">
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Defina suas novas credenciais. Seus cadastros e vínculos continuarão preservados.
            </p>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Novo e-mail de acesso</span>
              <input type="email" value={form.email} onChange={(event) => setCampo('email', event.target.value)} required autoComplete="username" className="input-field" placeholder="seu@email.com" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Nova senha</span>
              <input type="password" value={form.novaSenha} onChange={(event) => setCampo('novaSenha', event.target.value)} minLength={8} required autoComplete="new-password" className="input-field" placeholder="Mínimo de 8 caracteres" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Confirmar nova senha</span>
              <input type="password" value={form.confirmarSenha} onChange={(event) => setCampo('confirmarSenha', event.target.value)} minLength={8} required autoComplete="new-password" className="input-field" placeholder="Repita a nova senha" />
            </label>

            {erro && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</div>}

            <button type="submit" disabled={salvando || !token} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
              {salvando ? 'Salvando...' : 'Salvar novo acesso'}
            </button>
            {!token && <p className="text-center text-xs text-red-600">Token ausente. Leia novamente o QR Code fornecido pelo administrador.</p>}
          </form>
        )}
      </div>
    </main>
  );
}
