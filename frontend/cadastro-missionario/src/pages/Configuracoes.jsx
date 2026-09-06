import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PERFIS, useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';

const DownloadIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
  </svg>
);

const UploadIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21V9m0 0l-4 4m4-4l4 4M4 3h16" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.5-2.9 8.6-7 10-4.1-1.4-7-5.5-7-10V6l7-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
  </svg>
);

const UserIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21a8 8 0 10-16 0m12-13a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const nomeArquivoDaResposta = (headers) => {
  const disposition = headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || `backup-duplas-missionarias-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
};

export default function Configuracoes() {
  const { usuario, atualizarConta } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSuperAdmin = usuario?.perfil === PERFIS.SUPER_ADMIN;
  const podeGerenciarUsuarios = !usuario?.somenteLeitura && [
    PERFIS.SUPER_ADMIN,
    PERFIS.ADMINISTRADOR,
    PERFIS.PASTOR_REGIONAL,
    PERFIS.COORDENADOR_REGIONAL,
    PERFIS.PASTOR_DISTRITAL,
    PERFIS.DIRETOR_MISSIONARIO_IGREJA,
  ].includes(usuario?.perfil);
  const [aba, setAba] = useState('conta');
  const [conta, setConta] = useState({
    email: usuario?.email || '',
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: '',
  });
  const [salvandoConta, setSalvandoConta] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);
  const [arquivoBackup, setArquivoBackup] = useState(null);
  const [confirmacao, setConfirmacao] = useState('');
  const [resultadoRestore, setResultadoRestore] = useState(null);

  const alterarCampoConta = (campo, valor) => {
    setConta((atual) => ({ ...atual, [campo]: valor }));
  };

  const salvarConta = async (event) => {
    event.preventDefault();
    if (!conta.senhaAtual.trim()) {
      toastError('Informe sua senha atual.');
      return;
    }
    if (conta.novaSenha && conta.novaSenha.trim().length < 8) {
      toastError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (conta.novaSenha !== conta.confirmarSenha) {
      toastError('A confirmação da nova senha não confere.');
      return;
    }

    setSalvandoConta(true);
    try {
      const atualizado = await atualizarConta({
        email: conta.email,
        senhaAtual: conta.senhaAtual,
        novaSenha: conta.novaSenha,
      });
      setConta({ email: atualizado.email, senhaAtual: '', novaSenha: '', confirmarSenha: '' });
      toastSuccess('Dados de acesso atualizados com sucesso.');
    } catch (err) {
      toastError(err.response?.data?.erro || 'Erro ao atualizar os dados de acesso.');
    } finally {
      setSalvandoConta(false);
    }
  };

  const baixarBackup = async () => {
    setGerando(true);
    try {
      const resposta = await api.get('/configuracoes/backup', { responseType: 'blob' });
      const nomeArquivo = nomeArquivoDaResposta(resposta.headers);
      const url = URL.createObjectURL(new Blob([resposta.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toastSuccess('Backup gerado com sucesso.');
    } catch (err) {
      toastError(err.response?.data?.erro || 'Erro ao gerar backup.');
    } finally {
      setGerando(false);
    }
  };

  const restaurarBackup = async () => {
    if (!arquivoBackup) {
      toastError('Selecione um arquivo de backup.');
      return;
    }
    if (confirmacao !== 'RESTAURAR') {
      toastError('Digite RESTAURAR para confirmar.');
      return;
    }

    setRestaurando(true);
    setResultadoRestore(null);
    try {
      const texto = await arquivoBackup.text();
      const backup = JSON.parse(texto);
      const { data } = await api.post('/configuracoes/backup/restaurar', backup);
      setResultadoRestore(data);
      toastSuccess('Backup restaurado com sucesso.');
      setConfirmacao('');
    } catch (err) {
      const mensagem = err instanceof SyntaxError
        ? 'Arquivo JSON inválido.'
        : err.response?.data?.erro || 'Erro ao restaurar backup.';
      toastError(mensagem);
    } finally {
      setRestaurando(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C9963A]">Configurações</p>
        </div>
        <h1 className="text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>Configurações da conta</h1>
        <p className="mt-1 text-sm text-gray-400">Gerencie seus dados de acesso e segurança.</p>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto border-b border-gray-200">
        <button type="button" onClick={() => setAba('conta')} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${aba === 'conta' ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
          Conta
        </button>
        {podeGerenciarUsuarios && (
          <button
            type="button"
            onClick={() => navigate(location.pathname.startsWith('/direto/') ? '/direto/gestao-usuarios' : '/gestao-usuarios')}
            className="border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-gray-400 transition hover:text-gray-600"
          >
            Gestão de usuários
          </button>
        )}
        {isSuperAdmin && (
          <button type="button" onClick={() => setAba('backup')} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${aba === 'backup' ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
            Backup dos dados
          </button>
        )}
      </div>

      {aba === 'conta' && (
        <form onSubmit={salvarConta} className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1A3A6B]/10 text-[#1A3A6B]"><UserIcon /></div>
            <div>
              <h2 className="text-lg font-bold text-[#1A3A6B]">Dados de acesso</h2>
              <p className="mt-1 text-sm text-gray-500">A alteração do e-mail ou da senha não remove cadastros nem muda os vínculos da sua conta.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">E-mail de acesso (login)</span>
              <input type="email" value={conta.email} onChange={(event) => alterarCampoConta('email', event.target.value)} disabled={usuario?.somenteLeitura} required autoComplete="username" className="input-field disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500" />
              {usuario?.somenteLeitura && <span className="mt-1 block text-xs text-amber-700">O e-mail deste acesso de suporte é fixo; a senha pode ser alterada normalmente.</span>}
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Senha atual</span>
              <input type="password" value={conta.senhaAtual} onChange={(event) => alterarCampoConta('senhaAtual', event.target.value)} required autoComplete="current-password" className="input-field" placeholder="Confirme sua senha atual" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Nova senha</span>
              <input type="password" value={conta.novaSenha} onChange={(event) => alterarCampoConta('novaSenha', event.target.value)} minLength={8} autoComplete="new-password" className="input-field" placeholder="Deixe em branco para manter" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">Confirmar nova senha</span>
              <input type="password" value={conta.confirmarSenha} onChange={(event) => alterarCampoConta('confirmarSenha', event.target.value)} minLength={8} autoComplete="new-password" className="input-field" placeholder="Repita a nova senha" />
            </label>
          </div>

          <div className="mt-6 flex justify-end border-t border-gray-100 pt-5">
            <button type="submit" disabled={salvandoConta} className="btn-primary disabled:cursor-not-allowed disabled:opacity-60">{salvandoConta ? 'Salvando...' : 'Salvar dados de acesso'}</button>
          </div>
        </form>
      )}

      {aba === 'backup' && isSuperAdmin && (
        <div>
          <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#1A3A6B]/10 text-[#1A3A6B]"><ShieldIcon /></div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-[#1A3A6B]">Gerar arquivo de backup</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">O arquivo baixado contém os dados do sistema em JSON e deve ser guardado em local seguro.</p>
                </div>
              </div>
              <button type="button" onClick={baixarBackup} disabled={gerando} className="btn-primary inline-flex items-center justify-center gap-2 self-start whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 md:self-center"><DownloadIcon />{gerando ? 'Gerando...' : 'Baixar backup'}</button>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-red-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex min-w-0 gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600"><UploadIcon /></div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-[#1A3A6B]">Restaurar backup</h2>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">Esta ação substitui os dados atuais pelo conteúdo do arquivo de backup selecionado.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
                    <input type="file" accept="application/json,.json" onChange={(event) => setArquivoBackup(event.target.files?.[0] || null)} className="block w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-[#1A3A6B] file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
                    <input type="text" value={confirmacao} onChange={(event) => setConfirmacao(event.target.value)} placeholder="Digite RESTAURAR" className="input-field text-sm" />
                  </div>
                  {resultadoRestore && <p className="mt-3 text-sm font-medium text-green-700">Restauração concluída em {new Date(resultadoRestore.restauradoEm).toLocaleString('pt-BR')}.</p>}
                </div>
              </div>
              <button type="button" onClick={restaurarBackup} disabled={restaurando || !arquivoBackup || confirmacao !== 'RESTAURAR'} className="inline-flex items-center justify-center gap-2 self-start whitespace-nowrap rounded-lg border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 md:self-center"><UploadIcon />{restaurando ? 'Restaurando...' : 'Restaurar backup'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
