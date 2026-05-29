import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function DropdownMenu({ label, icon, items }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const fecharFora = (event) => {
      if (!ref.current?.contains(event.target)) setAberto(false);
    };

    const fecharEsc = (event) => {
      if (event.key === 'Escape') setAberto(false);
    };

    document.addEventListener('mousedown', fecharFora);
    document.addEventListener('keydown', fecharEsc);
    return () => {
      document.removeEventListener('mousedown', fecharFora);
      document.removeEventListener('keydown', fecharEsc);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative flex-shrink-0"
      onMouseEnter={() => setAberto(true)}
      onMouseLeave={() => setAberto(false)}
    >
      <button
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        className={`flex items-center gap-2 px-3 lg:px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
          aberto ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'
        }`}
        aria-haspopup="menu"
        aria-expanded={aberto}
      >
        {icon}
        {label}
        <svg className={`w-3.5 h-3.5 transition-transform ${aberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {aberto && (
        <div className="absolute left-0 top-full pt-2 z-50 min-w-56">
          <div className="rounded-xl bg-white border border-gray-100 shadow-xl py-2 overflow-hidden">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setAberto(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1A3A6B] hover:bg-[#1A3A6B]/5 hover:text-[#C9963A] transition-colors"
              >
                <span className="w-5 text-center">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
