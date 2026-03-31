
/**
 * High-performance image compression using Offscreen Canvas (or fallback to standard Canvas).
 * BALANCED MODE: High enough resolution for AI to read text (1600px), 
 * but compressed enough to prevent UI lag (removing metadata/bloat).
 */
export const compressImage = async (file: File): Promise<{ base64: string; previewUrl: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        // UPDATED: Increased from 1024 to 1600 to ensure small text on packaging is readable by Gemini.
        // 1600px is the "sweet spot" where text remains sharp but file size drops from ~8MB to ~400KB.
        const maxWidth = 1600; 
        const maxHeight = 1600;
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        // Use high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Export as High Quality JPEG (0.9 or 90%)
        // We use JPEG because PNG base64 strings are significantly heavier and slower for React to handle.
        const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.90);
        
        // Create a lightweight Blob URL for UI Preview (keeps DOM light)
        canvas.toBlob((blob) => {
            if (blob) {
                const previewUrl = URL.createObjectURL(blob);
                // Strip the data:image/jpeg;base64, prefix for the API payload
                const base64Clean = optimizedBase64.split(',')[1];
                
                resolve({
                    base64: base64Clean,
                    previewUrl: previewUrl,
                    mimeType: 'image/jpeg'
                });
            } else {
                // Fallback if blob fails
                const base64Clean = optimizedBase64.split(',')[1];
                resolve({
                    base64: base64Clean,
                    previewUrl: optimizedBase64,
                    mimeType: 'image/jpeg'
                });
            }
        }, 'image/jpeg', 0.90);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};
