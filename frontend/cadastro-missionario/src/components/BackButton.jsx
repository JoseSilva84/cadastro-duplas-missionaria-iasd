import { useNavigate } from 'react-router-dom';

export default function BackButton({ fallbackTo = '/', label = 'Voltar', className = '' }) {
  const navigate = useNavigate();

  const voltar = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallbackTo, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={voltar}
      className={`inline-flex items-center gap-2 rounded-lg border border-[#1A3A6B]/20 bg-white px-3 py-2 text-sm font-semibold text-[#1A3A6B] shadow-sm transition-all duration-200 hover:border-[#1A3A6B] hover:bg-[#1A3A6B] hover:text-white active:scale-95 ${className}`}
      aria-label={label}
    >
      <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5" />
        <path d="m12 19-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
