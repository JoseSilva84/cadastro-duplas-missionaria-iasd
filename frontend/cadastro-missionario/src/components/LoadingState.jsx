export default function LoadingState({ mensagem = 'Carregando dados...' }) {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-[3px] border-[#1A3A6B]/20" />
          <div className="absolute inset-0 h-12 w-12 animate-spin rounded-full border-[3px] border-transparent border-t-[#1A3A6B]" />
        </div>
        <p className="animate-pulse text-sm text-gray-400">{mensagem}</p>
      </div>
    </div>
  );
}
