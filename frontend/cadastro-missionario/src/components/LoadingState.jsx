export default function LoadingState({ mensagem = 'Carregando dados...' }) {
  return (
    <div className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-7xl animate-fade-in p-4 sm:p-6 lg:p-8" role="status" aria-live="polite">
      <div className="mb-8 space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-72 max-w-full animate-pulse rounded-lg bg-slate-200" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="h-3 w-24 rounded bg-slate-200" />
            <div className="mt-5 h-8 w-16 rounded bg-slate-200" />
            <div className="mt-3 h-3 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="mb-5 h-5 w-48 animate-pulse rounded bg-slate-200" />
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
      </div>
      <p className="mt-5 text-center text-sm font-medium text-slate-500">{mensagem}</p>
    </div>
  );
}
