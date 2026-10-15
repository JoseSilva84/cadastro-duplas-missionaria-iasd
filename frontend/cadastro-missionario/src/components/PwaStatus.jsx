import { useEffect, useState } from 'react';
import { aplicarAtualizacaoPwa } from '../lib/pwa';

export default function PwaStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [atualizacaoDisponivel, setAtualizacaoDisponivel] = useState(false);
  const [offlinePronto, setOfflinePronto] = useState(false);
  const [cacheFallback, setCacheFallback] = useState(false);

  useEffect(() => {
    const ficouOnline = () => setOnline(true);
    const ficouOffline = () => setOnline(false);
    const novaVersao = () => setAtualizacaoDisponivel(true);
    const prontoOffline = () => {
      setOfflinePronto(true);
      window.setTimeout(() => setOfflinePronto(false), 5000);
    };
    const usandoCache = () => {
      setCacheFallback(true);
      window.setTimeout(() => setCacheFallback(false), 8000);
    };

    window.addEventListener('online', ficouOnline);
    window.addEventListener('offline', ficouOffline);
    window.addEventListener('pcm:pwa-update', novaVersao);
    window.addEventListener('pcm:pwa-offline-ready', prontoOffline);
    window.addEventListener('pcm:cache-fallback', usandoCache);
    return () => {
      window.removeEventListener('online', ficouOnline);
      window.removeEventListener('offline', ficouOffline);
      window.removeEventListener('pcm:pwa-update', novaVersao);
      window.removeEventListener('pcm:pwa-offline-ready', prontoOffline);
      window.removeEventListener('pcm:cache-fallback', usandoCache);
    };
  }, []);

  if (online && !atualizacaoDisponivel && !offlinePronto && !cacheFallback) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[100] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 rounded-xl border border-white/20 bg-[#10274f] px-4 py-3 text-sm text-white shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-bold">
            {!online ? 'Você está sem conexão' : atualizacaoDisponivel ? 'Nova versão disponível' : cacheFallback ? 'Exibindo dados salvos' : 'Aplicativo pronto para uso offline'}
          </p>
          <p className="mt-0.5 text-xs text-white/75">
            {!online
              ? 'Os dados já salvos neste dispositivo continuam disponíveis.'
              : atualizacaoDisponivel
                ? 'Atualize para receber as melhorias mais recentes.'
                : cacheFallback
                  ? 'A consulta não respondeu, então mantivemos a última informação disponível neste dispositivo.'
                : 'As páginas e os dados salvos poderão ser consultados mesmo sem internet.'}
          </p>
        </div>
        {atualizacaoDisponivel && (
          <button type="button" onClick={() => aplicarAtualizacaoPwa()} className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#1A3A6B]">
            Atualizar
          </button>
        )}
      </div>
    </div>
  );
}
