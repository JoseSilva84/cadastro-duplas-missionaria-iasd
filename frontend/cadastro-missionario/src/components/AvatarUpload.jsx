import { useRef, useState } from 'react';
import { compressImageToBase64 } from '../imageUtils';

export default function AvatarUpload({ value, onChange, label }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const base64 = await compressImageToBase64(file);
      onChange(base64);
    } catch (error) {
      console.error('Erro ao processar imagem:', error);
      alert('Erro ao processar a imagem. Tente outra.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 mb-4">
      <div 
        className="relative w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-200 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-gray-400 text-3xl">
            {loading ? '⏳' : '📷'}
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
          <span className="text-white text-xs font-semibold">Alterar</span>
        </div>
      </div>
      <span className="text-sm text-gray-600 font-medium">{label || 'Adicionar Foto'}</span>
      <input 
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />
    </div>
  );
}
