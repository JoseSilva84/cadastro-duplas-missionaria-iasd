import { useEffect, useState } from 'react';
import { FotoService } from '../foto.service';

export default function UsuarioAvatar({ usuario, className = '', fallbackClassName = '' }) {
  const fotoReferencia = usuario?.identidade?.foto || '';
  const nome = usuario?.identidade?.nome || usuario?.nome || 'Usuário';
  const [foto, setFoto] = useState('');

  useEffect(() => {
    let ativo = true;
    setFoto('');
    if (!fotoReferencia) return () => { ativo = false; };

    FotoService.resolverFotoParaPreview(fotoReferencia)
      .then((resultado) => { if (ativo) setFoto(resultado || ''); })
      .catch(() => { if (ativo) setFoto(''); });

    return () => { ativo = false; };
  }, [fotoReferencia]);

  if (foto) {
    return <img src={foto} alt={nome} className={`object-cover ${className}`} />;
  }

  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-[#C9963A] to-[#e5b05a] font-bold text-white ${className} ${fallbackClassName}`}>
      {nome.charAt(0).toUpperCase()}
    </div>
  );
}
