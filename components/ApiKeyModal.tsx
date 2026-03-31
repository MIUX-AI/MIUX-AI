import React, { useState, useEffect } from 'react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onSave: (key: string) => void;
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onSave }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!inputKey.trim()) {
      setError('API Key tidak boleh kosong');
      return;
    }
    if (!inputKey.startsWith('AIza')) {
      setError('Format API Key sepertinya salah (biasanya dimulai dengan AIza)');
      return;
    }
    onSave(inputKey.trim());
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />

      {/* Content */}
      <div className="relative w-full max-w-md bg-[#0f0f12] border border-white/10 rounded-3xl p-8 shadow-2xl ring-1 ring-white/5">
        
        <div className="text-center mb-6">
            <div className="w-16 h-16 bg-zinc-900 border border-neon/30 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(163,230,53,0.1)]">
                <span className="text-3xl font-mono text-neon">M</span>
            </div>
            <h2 className="text-2xl font-mono tracking-widest text-white mb-2">MIUX <span className="text-neon">STUDIO</span></h2>
            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
                Akses ke Entropy Engine membutuhkan Google Gemini API Key. Key Anda hanya disimpan secara lokal di browser.
            </p>
        </div>

        <div className="space-y-4">
            <div>
                <label className="block text-[10px] font-bold text-neon/70 uppercase tracking-widest mb-2">Google Gemini API Key</label>
                <input 
                    type="password" 
                    value={inputKey}
                    onChange={(e) => {
                        setInputKey(e.target.value);
                        setError('');
                    }}
                    placeholder="AIzaSy..."
                    className="w-full bg-black/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neon focus:ring-1 focus:ring-neon/20 transition-all font-mono text-sm"
                />
                {error && <p className="text-red-400 text-xs mt-2 font-medium">⚠️ {error}</p>}
            </div>

            <button 
                onClick={handleSubmit}
                className="w-full py-3 bg-neon/10 hover:bg-neon text-neon hover:text-black border border-neon/30 rounded-xl font-bold text-xs tracking-widest uppercase transition-all"
            >
                INISIALISASI ENGINE
            </button>

            <div className="text-center pt-4 border-t border-zinc-800">
                <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[10px] text-zinc-400 hover:text-neon font-mono inline-flex items-center gap-1 transition-colors uppercase tracking-widest"
                >
                    DAPATKAN API KEY GRATIS
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                </a>
            </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;