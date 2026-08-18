import { useState } from 'react';
import api from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';

const DownloadIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3l7 3v5c0 4.5-2.9 8.6-7 10-4.1-1.4-7-5.5-7-10V6l7-3z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4" />
  </svg>
);

const nomeArquivoDaResposta = (headers) => {
  const disposition = headers?.['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] || `backup-duplas-missionarias-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
};

export default function Configuracoes() {
  const [gerando, setGerando] = useState(false);

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

  return (
    <div className="mx-auto max-w-5xl animate-fade-in p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C9963A]">Configurações</p>
        </div>
        <h1 className="text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Backup do Banco de Dados
        </h1>
        <p className="mt-1 text-sm text-gray-400">
          Área restrita ao Super Administrador.
        </p>
      </div>

      <div className="rounded-lg border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A3A6B]/10 text-[#1A3A6B]">
              <ShieldIcon />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[#1A3A6B]">Gerar arquivo de backup</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-500">
                O arquivo baixado contém os dados do sistema em JSON e deve ser guardado em local seguro.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={baixarBackup}
            disabled={gerando}
            className="btn-primary inline-flex items-center justify-center gap-2 self-start whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60 md:self-center"
          >
            <DownloadIcon />
            {gerando ? 'Gerando...' : 'Baixar backup'}
          </button>
        </div>
      </div>
    </div>
  );
}
