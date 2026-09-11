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

  const podeVerChaves = !usuario?.somenteLeitura && [
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

  // Estados para Chaves de Acesso
  const [chavesData, setChavesData] = useState(null);
  const [carregandoChaves, setCarregandoChaves] = useState(false);
  const [subAbaAdmin, setSubAbaAdmin] = useState('regioes');
  const [buscaDistrito, setBuscaDistrito] = useState('');
  const [filtroRegiaoAdmin, setFiltroRegiaoAdmin] = useState('');
  const [itemEditando, setItemEditando] = useState(null);
  const [salvandoChave, setSalvandoChave] = useState(false);

  const carregarChaves = async () => {
    setCarregandoChaves(true);
    try {
      const res = await api.get('/configuracoes/chaves-acesso');
      setChavesData(res.data);
    } catch (err) {
      toastError(err.response?.data?.erro || 'Erro ao carregar chaves de acesso.');
    } finally {
      setCarregandoChaves(false);
    }
  };

  const copiarTexto = (texto, mensagem) => {
    navigator.clipboard.writeText(texto);
    toastSuccess(mensagem || 'Copiado para a área de transferência!');
  };

  const copiarConviteWhatsApp = (tipo, nome, chave) => {
    const link = `${window.location.origin}/cadastro-dupla?chave=${encodeURIComponent(chave)}`;
    let msg = '';
    if (tipo === 'DISTRITO') {
      msg = `*PCM — Associação Paulistana*\n\nOlá, duplas missionárias do *Distrito de ${nome}*! 🙏✨\n\nPara cadastrar sua dupla e ter acesso ao sistema de acompanhamento da Associação Paulistana, acessem o link abaixo e usem a nossa chave distrital:\n\n🔑 *Chave de Acesso:* \`${chave}\`\n🔗 *Link Direto:* ${link}\n\nDeus abençoe ricamente o seu ministério!`;
    } else {
      msg = `*PCM — Associação Paulistana*\n\nOlá, líderes e duplas da *${nome}*! 🙏✨\n\nPara cadastrar sua dupla missionária no sistema da Associação Paulistana, usem a nossa chave regional:\n\n🔑 *Chave de Acesso:* \`${chave}\`\n🔗 *Link Direto:* ${link}\n\nDeus abençoe o ministério de cada dupla!`;
    }
    copiarTexto(msg, 'Mensagem formatada para WhatsApp copiada com sucesso!');
  };

  const salvarChaveEditada = async (e) => {
    e?.preventDefault();
    if (!itemEditando) return;
    setSalvandoChave(true);
    try {
      await api.put('/configuracoes/chaves-acesso', {
        tipo: itemEditando.tipo,
        id: itemEditando.id,
        chaveAcesso: itemEditando.chaveAcesso,
        chaveAtiva: itemEditando.chaveAtiva,
      });
      toastSuccess('Chave de acesso atualizada com sucesso!');
      setItemEditando(null);
      carregarChaves();
    } catch (err) {
      toastError(err.response?.data?.erro || 'Erro ao atualizar chave de acesso.');
    } finally {
      setSalvandoChave(false);
    }
  };

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
        {podeVerChaves && (
          <button
            type="button"
            onClick={() => {
              setAba('chaves');
              carregarChaves();
            }}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              aba === 'chaves' ? 'border-[#1A3A6B] text-[#1A3A6B]' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Chaves de acesso
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

      {/* ABA: CHAVES DE ACESSO */}
      {aba === 'chaves' && (
        <div className="space-y-6">
          {carregandoChaves ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <div className="w-10 h-10 border-4 border-[#1A3A6B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Carregando chaves de acesso...</p>
            </div>
          ) : !chavesData ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
              <p className="text-gray-500 text-sm">Nenhuma informação de chave disponível para o seu perfil.</p>
            </div>
          ) : chavesData.tipoUsuario === 'DISTRITAL' ? (
            /* ===================================================
               VISÃO DO PASTOR DISTRITAL
               =================================================== */
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#C9963A] flex items-center justify-center text-2xl border border-amber-200 shadow-sm flex-shrink-0">
                      📍
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-blue-50 text-[#1A3A6B] font-bold px-2.5 py-0.5 rounded-full border border-blue-100">
                          {chavesData.distrito?.regiao?.nome || 'Região'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                          chavesData.distrito?.chaveAtiva ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {chavesData.distrito?.chaveAtiva ? 'Chave Ativa' : 'Chave Desativada'}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#1A3A6B] mt-1" style={{ fontFamily: 'Georgia, serif' }}>
                        Distrito {chavesData.distrito?.nome}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setItemEditando({
                      tipo: 'DISTRITO',
                      id: chavesData.distrito.id,
                      nome: chavesData.distrito.nome,
                      chaveAcesso: chavesData.distrito.chaveAcesso || '',
                      chaveAtiva: chavesData.distrito.chaveAtiva ?? true,
                    })}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A3A6B] hover:text-[#0f2347] bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-xl border border-gray-200 transition self-start sm:self-center"
                  >
                    ✏️ Personalizar Chave
                  </button>
                </div>

                {/* Voucher da Chave */}
                <div className="my-6 p-5 sm:p-6 rounded-2xl border-2 border-[#C9963A]/40 bg-gradient-to-r from-amber-50/60 via-white to-amber-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#916719]">Chave de Auto-Cadastro Distrital</span>
                    <div className="mt-1 flex items-center gap-3">
                      <span className="font-mono text-2xl sm:text-3xl font-bold text-[#1A3A6B] tracking-wider selection:bg-amber-200">
                        {chavesData.distrito?.chaveAcesso}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      As duplas que usarem esta chave terão Região e Distrito travados automaticamente.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => copiarTexto(chavesData.distrito?.chaveAcesso, 'Chave copiada com sucesso!')}
                      className="btn-primary text-xs px-3.5 py-2.5 flex items-center gap-1.5 shadow-sm"
                    >
                      📋 Copiar Chave
                    </button>
                    <button
                      type="button"
                      onClick={() => copiarConviteWhatsApp('DISTRITO', chavesData.distrito?.nome, chavesData.distrito?.chaveAcesso)}
                      className="bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-sm flex items-center gap-1.5 transition active:scale-95"
                    >
                      💬 Mensagem WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => copiarTexto(`${window.location.origin}/cadastro-dupla?chave=${encodeURIComponent(chavesData.distrito?.chaveAcesso)}`, 'Link direto copiado!')}
                      className="border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold px-3 py-2.5 rounded-xl transition"
                    >
                      🔗 Link Direto
                    </button>
                  </div>
                </div>

                <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-1">
                  <p className="font-semibold text-gray-700">💡 Como orientar as duplas da sua igreja:</p>
                  <p>1. Clique em <strong>"Mensagem WhatsApp"</strong> e cole no grupo dos membros/duplas da igreja.</p>
                  <p>2. Os irmãos acessam o link e o distrito já entra preenchido e protegido; eles selecionam apenas a igreja.</p>
                  <p>3. Ao final do formulário, a dupla cria o login e a senha e já entra no sistema imediatamente!</p>
                </div>
              </div>
            </div>
          ) : chavesData.tipoUsuario === 'REGIONAL' ? (
            /* ===================================================
               VISÃO DO COORDENADOR REGIONAL / PASTOR REGIONAL
               =================================================== */
            <div className="space-y-6">
              {/* Card Destaque da Região */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#C9963A] flex items-center justify-center text-2xl border border-amber-200 shadow-sm flex-shrink-0">
                      🌐
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-amber-50 text-[#916719] font-bold px-2 py-0.5 rounded-full">
                          Chave Geral da Região
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          chavesData.regiao?.chaveAtiva ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {chavesData.regiao?.chaveAtiva ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-[#1A3A6B] mt-0.5" style={{ fontFamily: 'Georgia, serif' }}>
                        {chavesData.regiao?.nome}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <span className="font-mono text-base sm:text-lg font-bold text-[#1A3A6B] bg-amber-50/70 border border-amber-200 px-3 py-1.5 rounded-xl">
                      {chavesData.regiao?.chaveAcesso}
                    </span>
                    <button
                      type="button"
                      onClick={() => copiarTexto(chavesData.regiao?.chaveAcesso, 'Chave regional copiada!')}
                      className="btn-primary text-xs px-3 py-2 flex items-center gap-1"
                    >
                      📋 Copiar
                    </button>
                    <button
                      type="button"
                      onClick={() => copiarConviteWhatsApp('REGIAO', chavesData.regiao?.nome, chavesData.regiao?.chaveAcesso)}
                      className="bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1"
                    >
                      💬 WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemEditando({
                        tipo: 'REGIAO',
                        id: chavesData.regiao.id,
                        nome: chavesData.regiao.nome,
                        chaveAcesso: chavesData.regiao.chaveAcesso || '',
                        chaveAtiva: chavesData.regiao.chaveAtiva ?? true,
                      })}
                      className="text-xs text-gray-500 hover:text-gray-700 p-1.5 bg-gray-50 border border-gray-200 rounded-lg"
                      title="Editar chave da região"
                    >
                      ✏️
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Ao usar a chave regional, a região fica travada e a dupla poderá escolher qualquer um dos distritos pertencentes à sua região.
                </p>
              </div>

              {/* Tabela de Distritos da Região */}
              <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <div>
                    <h3 className="text-lg font-bold text-[#1A3A6B]">Distritos sob sua Coordenação</h3>
                    <p className="text-xs text-gray-400">Total de {chavesData.distritos?.length || 0} distritos nesta região</p>
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {chavesData.distritos?.map((d) => (
                    <div key={d.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50/60 px-2 rounded-xl transition">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#1A3A6B]">{d.nome}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                            d.chaveAtiva ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {d.chaveAtiva ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>
                        {d.nomePastor && (
                          <p className="text-xs text-gray-500 mt-0.5">Pr. {d.nomePastor}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <span className="font-mono text-xs font-bold text-[#1A3A6B] bg-gray-100 px-2.5 py-1.5 rounded-lg border border-gray-200">
                          {d.chaveAcesso}
                        </span>
                        <button
                          type="button"
                          onClick={() => copiarTexto(d.chaveAcesso, `Chave do distrito ${d.nome} copiada!`)}
                          className="text-xs font-semibold text-gray-600 hover:text-[#1A3A6B] bg-white border border-gray-200 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition"
                          title="Copiar código da chave"
                        >
                          📋
                        </button>
                        <button
                          type="button"
                          onClick={() => copiarConviteWhatsApp('DISTRITO', d.nome, d.chaveAcesso)}
                          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition"
                          title="Copiar mensagem para WhatsApp"
                        >
                          💬 WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemEditando({
                            tipo: 'DISTRITO',
                            id: d.id,
                            nome: d.nome,
                            chaveAcesso: d.chaveAcesso || '',
                            chaveAtiva: d.chaveAtiva ?? true,
                          })}
                          className="text-xs text-gray-400 hover:text-gray-700 p-1"
                          title="Editar chave"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ===================================================
               VISÃO DO ADMINISTRADOR / SUPER ADMIN
               =================================================== */
            <div className="space-y-6">
              {/* Seletor de Sub-abas */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setSubAbaAdmin('regioes')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      subAbaAdmin === 'regioes'
                        ? 'bg-white text-[#1A3A6B] shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    🌐 Chaves por Região ({chavesData.regioes?.length || 0})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubAbaAdmin('distritos')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      subAbaAdmin === 'distritos'
                        ? 'bg-white text-[#1A3A6B] shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    📍 Chaves por Distrito ({chavesData.distritos?.length || 0})
                  </button>
                </div>
              </div>

              {/* Sub-aba Regiões */}
              {subAbaAdmin === 'regioes' && (
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-[#1A3A6B]">Chaves de Acesso Regionais</h3>
                    <p className="text-xs text-gray-400">Chaves de escopo regional que travam a região no formulário</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {chavesData.regioes?.map((r) => (
                      <div key={r.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-sm transition">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-bold text-sm text-[#1A3A6B]">{r.nome}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            r.chaveAtiva ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {r.chaveAtiva ? 'Ativa' : 'Inativa'}
                          </span>
                        </div>

                        <div className="font-mono text-sm font-bold text-[#1A3A6B] bg-white p-2 rounded-xl border border-gray-200 text-center my-2.5 selection:bg-amber-100">
                          {r.chaveAcesso}
                        </div>

                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => copiarTexto(r.chaveAcesso, `Chave da ${r.nome} copiada!`)}
                            className="flex-1 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition"
                          >
                            📋 Copiar
                          </button>
                          <button
                            type="button"
                            onClick={() => copiarConviteWhatsApp('REGIAO', r.nome, r.chaveAcesso)}
                            className="flex-1 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-semibold transition"
                          >
                            💬 WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemEditando({
                              tipo: 'REGIAO',
                              id: r.id,
                              nome: r.nome,
                              chaveAcesso: r.chaveAcesso || '',
                              chaveAtiva: r.chaveAtiva ?? true,
                            })}
                            className="p-1.5 text-gray-400 hover:text-gray-700 transition"
                            title="Editar chave"
                          >
                            ✏️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-aba Distritos */}
              {subAbaAdmin === 'distritos' && (
                <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <div>
                      <h3 className="text-lg font-bold text-[#1A3A6B]">Chaves de Acesso Distritais</h3>
                      <p className="text-xs text-gray-400">Total de {chavesData.distritos?.length || 0} distritos cadastrados</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={filtroRegiaoAdmin}
                        onChange={(e) => setFiltroRegiaoAdmin(e.target.value)}
                        className="input-field text-xs py-2"
                      >
                        <option value="">Todas as Regiões</option>
                        {chavesData.regioes?.map((r) => (
                          <option key={r.id} value={r.id}>{r.nome}</option>
                        ))}
                      </select>

                      <input
                        type="text"
                        placeholder="Buscar distrito..."
                        value={buscaDistrito}
                        onChange={(e) => setBuscaDistrito(e.target.value)}
                        className="input-field text-xs py-2 sm:w-48"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-400 uppercase tracking-wider">
                          <th className="pb-3 font-semibold">Distrito</th>
                          <th className="pb-3 font-semibold">Região</th>
                          <th className="pb-3 font-semibold">Chave de Acesso</th>
                          <th className="pb-3 font-semibold">Status</th>
                          <th className="pb-3 font-semibold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {chavesData.distritos
                          ?.filter((d) => {
                            if (filtroRegiaoAdmin && Number(d.regiaoId) !== Number(filtroRegiaoAdmin)) return false;
                            if (buscaDistrito) {
                              const b = buscaDistrito.toLowerCase();
                              return d.nome.toLowerCase().includes(b) || d.chaveAcesso?.toLowerCase().includes(b);
                            }
                            return true;
                          })
                          .map((d) => (
                            <tr key={d.id} className="hover:bg-gray-50/60 transition">
                              <td className="py-3 font-bold text-gray-800">
                                {d.nome}
                                {d.nomePastor && (
                                  <span className="block font-normal text-[11px] text-gray-400">
                                    Pr. {d.nomePastor}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-gray-500">
                                {d.regiao?.nome || '-'}
                              </td>
                              <td className="py-3">
                                <span className="font-mono font-bold text-[#1A3A6B] bg-gray-100 px-2.5 py-1 rounded-md border border-gray-200">
                                  {d.chaveAcesso}
                                </span>
                              </td>
                              <td className="py-3">
                                <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  d.chaveAtiva ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                                }`}>
                                  {d.chaveAtiva ? 'Ativa' : 'Inativa'}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => copiarTexto(d.chaveAcesso, `Chave do ${d.nome} copiada!`)}
                                    className="p-1.5 text-gray-600 hover:text-[#1A3A6B] bg-white border border-gray-200 rounded-lg transition"
                                    title="Copiar chave"
                                  >
                                    📋
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => copiarConviteWhatsApp('DISTRITO', d.nome, d.chaveAcesso)}
                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 rounded-lg transition"
                                    title="Copiar WhatsApp"
                                  >
                                    💬
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setItemEditando({
                                      tipo: 'DISTRITO',
                                      id: d.id,
                                      nome: d.nome,
                                      chaveAcesso: d.chaveAcesso || '',
                                      chaveAtiva: d.chaveAtiva ?? true,
                                    })}
                                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition"
                                    title="Editar chave"
                                  >
                                    ✏️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Modal para Editar Chave */}
          {itemEditando && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-w-md w-full border border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#C9963A] flex items-center justify-center text-xl border border-amber-200">
                    🔑
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1A3A6B]">
                      Personalizar Chave
                    </h3>
                    <p className="text-xs text-gray-500">
                      {itemEditando.tipo === 'REGIAO' ? 'Região' : 'Distrito'}: {itemEditando.nome}
                    </p>
                  </div>
                </div>

                <form onSubmit={salvarChaveEditada} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Código da Chave de Acesso
                    </label>
                    <input
                      type="text"
                      required
                      value={itemEditando.chaveAcesso}
                      onChange={(e) => setItemEditando({
                        ...itemEditando,
                        chaveAcesso: e.target.value.toUpperCase().replace(/\s+/g, '-'),
                      })}
                      className="input-field font-mono uppercase text-base tracking-wider text-center"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Use letras maiúsculas, números e traços (ex: {itemEditando.tipo === 'REGIAO' ? 'REGIAO-3-2026' : 'ITAPEVI-2026'}).
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs font-semibold text-gray-700">Status da Chave</span>
                    <button
                      type="button"
                      onClick={() => setItemEditando({ ...itemEditando, chaveAtiva: !itemEditando.chaveAtiva })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                        itemEditando.chaveAtiva
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      {itemEditando.chaveAtiva ? '✓ Ativa' : '✕ Desativada'}
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setItemEditando(null)}
                      className="w-1/3 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={salvandoChave || !itemEditando.chaveAcesso.trim()}
                      className="btn-primary flex-1 py-2.5 text-xs font-bold disabled:opacity-50"
                    >
                      {salvandoChave ? 'Salvando...' : 'Salvar Chave'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
