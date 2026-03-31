import React, { useRef, useState } from 'react';
import { UploadedImage } from '../types';
import { compressImage } from '../utils/imageOptimizer';

interface FileUploadProps {
  onImageSelected: (image: UploadedImage) => void;
  isLoading: boolean;
  variant?: 'default' | 'compact'; // New prop
}

const FileUpload: React.FC<FileUploadProps> = ({ onImageSelected, isLoading, variant = 'default' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("Mohon upload file gambar.");
      return;
    }

    setIsProcessing(true);
    try {
        const optimizedImage = await compressImage(file);
        onImageSelected(optimizedImage);
    } catch (error) {
        console.error("Compression failed", error);
        alert("Gagal memproses gambar.");
    } finally {
        setIsProcessing(false);
        // CRITICAL FIX: Reset input value so onChange triggers even if same file is selected again
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Compact Styles vs Default Styles
  const containerClasses = variant === 'compact' 
    ? `relative rounded-xl p-4 text-center transition-all duration-300 cursor-pointer group overflow-hidden bg-black/20 border border-dashed border-white/20 hover:border-neon/50 hover:bg-white/5`
    : `relative rounded-3xl p-10 text-center transition-all duration-500 cursor-pointer group overflow-hidden backdrop-blur-md bg-white/5 border border-white/10 hover:border-neon/50 hover:bg-white/10 shadow-xl`;

  const activeClasses = isDragging 
    ? 'border-neon bg-neon/10' 
    : '';

  return (
    <div 
      className={`${containerClasses} ${activeClasses} ${(isLoading || isProcessing) ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={inputRef} 
        onChange={handleChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Default Grid Pattern - Only for Default Variant */}
      {variant === 'default' && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center space-y-3">
        {isProcessing ? (
             <div className="flex flex-col items-center">
                <svg className="animate-spin h-8 w-8 text-neon mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-xs text-neon/70 font-mono animate-pulse">Mengompresi...</span>
             </div>
        ) : (
            variant === 'default' ? (
                <>
                    {/* Large Icon for Default */}
                     <div className={`p-5 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 text-neon/70 shadow-2xl group-hover:scale-110 group-hover:text-black group-hover:from-neon group-hover:to-neon/80 transition-all duration-500 mb-2`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-xl font-display font-bold text-white mb-2 group-hover:text-neon transition-colors">
                            Upload Foto Produk
                        </h3>
                        <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                            Geser file ke sini atau klik untuk menjelajah.
                        </p>
                    </div>
                </>
            ) : (
                <>
                    {/* Compact Icon & Text */}
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 group-hover:bg-neon group-hover:text-black transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-zinc-500 group-hover:text-neon">
                        Upload Foto
                    </span>
                </>
            )
        )}
      </div>
    </div>
  );
};

export default FileUpload;