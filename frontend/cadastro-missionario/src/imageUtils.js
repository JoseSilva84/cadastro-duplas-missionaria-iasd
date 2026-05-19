/**
 * Comprime uma imagem e a converte para Base64.
 * Essencial para caber no limite de ~1MB do Firestore.
 * 
 * @param {File} file - Arquivo selecionado no <input type="file">.
 * @param {number} maxWidth - Largura máxima.
 * @param {number} maxHeight - Altura máxima.
 * @param {number} quality - Qualidade (0.0 a 1.0).
 * @returns {Promise<string>} - Imagem comprimida em Base64.
 */
export const compressImageToBase64 = (file, maxWidth = 300, maxHeight = 300, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Mantém a proporção da imagem
        if (width > height && width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};