import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';

export default function DropdownMenu({ label, shortLabel, icon, items, align = 'left' }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const cores = ['#2563eb', '#7c3aed', '#db2777', '#0d9488', '#d97706', '#0284c7', '#059669', '#ea580c', '#9333ea', '#0891b2'];

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
        className={`flex items-center gap-1.5 xl:gap-2 px-2 lg:px-2.5 xl:px-4 py-2 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
          aberto ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white hover:bg-white/8'
        }`}
        aria-haspopup="menu"
        aria-expanded={aberto}
      >
        {icon}
        <span className="hidden xl:inline">{label}</span>
        <span className="inline xl:hidden">{shortLabel || label}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${aberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {aberto && (
        <div className={`absolute top-full pt-2 z-50 min-w-56 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          <div className="rounded-xl bg-white border border-gray-100 shadow-xl py-2 overflow-hidden">
            {items.map((item, indice) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setAberto(false)}
                style={{ '--dropdown-accent': cores[indice % cores.length] }}
                className="group flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1A3A6B] hover:bg-gray-50 transition-colors"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold transition-transform group-hover:-translate-y-0.5" style={{ color: 'var(--dropdown-accent)', background: 'color-mix(in srgb, var(--dropdown-accent) 10%, white)', borderColor: 'color-mix(in srgb, var(--dropdown-accent) 22%, white)' }}>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
