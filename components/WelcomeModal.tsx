import React from 'react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/95 transition-opacity" onClick={onClose} />

      <div className="relative bg-black border border-neon/30 w-full max-w-sm p-8 text-center shadow-[0_0_50px_rgba(163,230,53,0.1)]">
        <h2 className="text-4xl font-mono text-neon mb-2 tracking-widest">MIUX STUDIO</h2>
        <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-6">Visual Realisme Tanpa Batas</p>
        
        <div className="space-y-4 text-left text-sm text-zinc-400 mb-8 font-sans">
            <p>Anda telah memasuki ruang kerja kreatif AI.</p>
            <ul className="list-disc pl-4 space-y-2 text-zinc-500">
                <li><strong className="text-zinc-300">Outfit Realism Only:</strong> Fokus mutlak pada fashion dan tekstur nyata.</li>
                <li><strong className="text-zinc-300">No Filter:</strong> Hasil raw, grainy, dan seperti foto amatir iPhone.</li>
                <li><strong className="text-zinc-300">Studio Mode:</strong> Antarmuka yang dirancang untuk profesional.</li>
            </ul>
        </div>

        <button 
            onClick={onClose}
            className="w-full py-3 bg-neon/10 hover:bg-neon/30 text-neon hover:text-white border border-neon/50 uppercase tracking-[0.2em] font-bold text-xs transition-all"
        >
            MASUK
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;