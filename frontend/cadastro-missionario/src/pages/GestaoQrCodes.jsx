import { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import api from '../lib/api';
import { toastError, toastSuccess } from '../lib/toast';
import LoadingState from '../components/LoadingState';

const tipoBadge = {
  dupla: 'Dupla',
  igreja: 'Igreja',
  distrito: 'Distrito',
  regiao: 'Região',
  geral: 'Geral',
};

function QrCard({ item, onRenovar }) {
  const [imagem, setImagem] = useState('');

  useEffect(() => {
    let cancelado = false;
    QRCode.toDataURL(item.url, {
      width: 280,
      margin: 2,
      color: { dark: '#1A3A6B', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    }).then((dataUrl) => {
      if (!cancelado) setImagem(dataUrl);
    });
    return () => { cancelado = true; };
  }, [item.url]);

  const copiar = async () => {
    await navigator.clipboard.writeText(item.url);
    toastSuccess('Link do QR Code copiado.');
  };

  const baixar = () => {
    if (!imagem) return;
    const link = document.createElement('a');
    link.href = imagem;
    link.download = `pcm-qrcode-${item.tipo.toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex rounded-full bg-[#C9963A]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#8B6A28]">
            {tipoBadge[item.escopo] || item.escopo}
          </span>
          <h2 className="mt-2 text-lg font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
            {item.label}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">{item.descricao}</p>
        </div>
      </div>

      <div className="mt-5 flex justify-center rounded-2xl border border-gray-100 bg-gray-50 p-4">
        {imagem ? (
          <img src={imagem} alt={`QR Code - ${item.label}`} className="h-52 w-52 rounded-lg bg-white p-2" />
        ) : (
          <div className="flex h-52 w-52 items-center justify-center text-sm text-gray-400">Gerando QR Code...</div>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-gray-50 p-3">
        <p className="break-all text-xs font-medium text-gray-500">{item.url}</p>
        {item.renovavel && item.atualizadoEm && (
          <p className="mt-2 text-[11px] font-semibold text-amber-700">
            Renovado em {new Date(item.atualizadoEm).toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      <div className={`mt-4 grid gap-2 ${item.renovavel ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <button
          type="button"
          onClick={copiar}
          className="h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Copiar link
        </button>
        <button
          type="button"
          onClick={baixar}
          disabled={!imagem}
          className="h-10 rounded-lg bg-[#1A3A6B] text-sm font-semibold text-white transition hover:bg-[#0d2347] disabled:opacity-50"
        >
          Baixar PNG
        </button>
        {item.renovavel && (
          <button
            type="button"
            onClick={() => onRenovar(item)}
            className="h-10 rounded-lg border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            Renovar
          </button>
        )}
      </div>
    </article>
  );
}

export default function GestaoQrCodes() {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await api.get('/usuarios/qrcodes-ativacao');
      setItens(data || []);
    } catch (err) {
      toastError(err.response?.data?.erro || 'Erro ao carregar QR Codes.');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const renovar = async (item) => {
    const confirmar = window.confirm(`Renovar o QR Code de ${item.label}?\n\nO QR Code antigo deixará de funcionar e será necessário usar o novo PNG/link.`);
    if (!confirmar) return;
    try {
      await api.post(`/usuarios/qrcodes-ativacao/${item.tipo}/renovar`);
      toastSuccess('QR Code renovado. O link e a imagem foram atualizados.');
      await carregar();
    } catch (err) {
      toastError(err.response?.data?.erro || 'Erro ao renovar QR Code.');
    }
  };

  if (carregando) return <LoadingState mensagem="Carregando QR Codes..." />;

  return (
    <div className="mx-auto max-w-6xl animate-fade-in p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-[#C9963A] to-[#e5b05a]" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C9963A]">Configurações</p>
        </div>
        <h1 className="text-3xl font-bold text-[#1A3A6B]" style={{ fontFamily: 'Georgia, serif' }}>
          Gestão de QR Codes
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-gray-500">
          QR Codes gerais de ativação. Eles não carregam senha nem criam acesso direto: apenas abrem a tela para a pessoa se identificar e criar ou trocar o login.
        </p>
      </div>

      <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-relaxed text-amber-900">
        O QR Code do Super Administrador não é exibido. Presidente, Departamental MIPs e Departamentais têm QR Codes próprios de acesso geral.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {itens.map((item) => (
          <QrCard key={item.tipo} item={item} onRenovar={renovar} />
        ))}
      </div>
    </div>
  );
}
