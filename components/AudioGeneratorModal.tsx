import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateSpeech } from '../services/geminiService';
import { NarrationStyle } from '../types';

interface AudioGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialText: string;
  narrationStyle: NarrationStyle;
  apiKey: string; // NEW PROP
}

const AudioGeneratorModal: React.FC<AudioGeneratorModalProps> = ({ isOpen, onClose, initialText, narrationStyle, apiKey }) => {
  const [text, setText] = useState(initialText);
  const [voice1, setVoice1] = useState('Kore');
  const [voice2, setVoice2] = useState('Fenrir'); // Default 2nd speaker
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const isDialogue = narrationStyle === 'dialogue';

  useEffect(() => {
    if (isOpen) {
        setText(initialText);
        setAudioUrl(null);
    }
  }, [isOpen, initialText]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!text.trim() || !apiKey) return;
    setIsGenerating(true);
    setAudioUrl(null);
    try {
        const url = await generateSpeech(apiKey, text, { 
            voiceName1: voice1,
            voiceName2: isDialogue ? voice2 : undefined,
            style: narrationStyle
        });
        setAudioUrl(url);
    } catch (e) {
        alert("Gagal membuat audio. Silakan coba lagi.");
        console.error(e);
    } finally {
        setIsGenerating(false);
    }
  };

  const voices = [
      { name: 'Kore', gender: 'F', desc: 'Tenang' },
      { name: 'Puck', gender: 'M', desc: 'Dinamis' },
      { name: 'Charon', gender: 'M', desc: 'Berwibawa' },
      { name: 'Fenrir', gender: 'M', desc: 'Intens' },
      { name: 'Zephyr', gender: 'F', desc: 'Lembut' },
  ];

  const VoiceSelector = ({ 
    selected, 
    onSelect, 
    label 
  }: { 
    selected: string; 
    onSelect: (v: string) => void; 
    label: string 
  }) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {voices.map((v) => (
                <button
                    key={v.name}
                    onClick={() => onSelect(v.name)}
                    className={`p-2 rounded-xl border text-left transition-all relative overflow-hidden group ${
                        selected === v.name 
                        ? 'bg-neon/20 border-neon text-white shadow-[0_0_15px_rgba(163,230,53,0.2)]' 
                        : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                    }`}
                >
                    <div className="text-sm font-bold flex justify-between">
                        {v.name}
                        <span className="text-[9px] opacity-70 bg-white/10 px-1 rounded">{v.gender}</span>
                    </div>
                    <div className="text-[10px] opacity-70 mt-0.5">{v.desc}</div>
                </button>
            ))}
        </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/90 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-[#0f0f12] border border-white/10 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col ring-1 ring-white/5 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neon/20 flex items-center justify-center text-neon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
            </div>
            <div>
                <h3 className="font-display font-bold text-white">Audio Studio</h3>
                <p className="text-xs text-slate-400 flex items-center gap-2">
                    Mode: <span className="text-neon uppercase font-bold">{narrationStyle}</span>
                </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body (Input Areas) */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
            
            {/* Voice Selection - Conditional for Dialogue */}
            {isDialogue ? (
                <div className="grid gap-4 p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                     <VoiceSelector selected={voice1} onSelect={setVoice1} label="Speaker A (Host)" />
                     <div className="h-px bg-white/5 w-full"></div>
                     <VoiceSelector selected={voice2} onSelect={setVoice2} label="Speaker B (Guest/Expert)" />
                     <p className="text-[10px] text-slate-500 italic mt-1">*Pastikan naskah menggunakan format "Speaker A: ... Speaker B: ..." agar suara terpisah.</p>
                </div>
            ) : (
                <VoiceSelector selected={voice1} onSelect={setVoice1} label="Pilih Suara (AI Character)" />
            )}

            {/* Script Editor */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Naskah Voiceover (Gabungan)</label>
                    <span className="text-[10px] text-slate-500">{text.length} karakter</span>
                </div>
                <textarea 
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="w-full h-40 bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/20 custom-scrollbar resize-none font-mono leading-relaxed"
                    placeholder="Masukkan naskah di sini..."
                ></textarea>
                
                {/* Helper Text for Special Styles */}
                {narrationStyle === 'asmr' && (
                    <p className="text-[10px] text-neon/80">ℹ️ Sistem akan menambahkan instruksi "berbisik/soft" secara otomatis saat generate.</p>
                )}
                {narrationStyle === 'hype' && (
                    <p className="text-[10px] text-neon/80">ℹ️ Sistem akan menambahkan instruksi "cepat/semangat" secara otomatis saat generate.</p>
                )}
            </div>
        </div>

        {/* Result Area - Now FIXED above footer, outside scroll area */}
        {audioUrl && (
            <div className="shrink-0 px-6 py-4 bg-neon/10 border-t border-white/5 backdrop-blur-sm animate-fade-in">
                <div className="bg-neon/20 border border-neon/20 rounded-xl p-3 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-neon flex items-center justify-center text-black shrink-0 shadow-lg shadow-neon/30">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                            <path fillRule="evenodd" d="M19.952 1.651a.75.75 0 0 1 .298.599V16.303a3 3 0 0 1-2.176 2.884l-1.32.377a2.553 2.553 0 1 1-1.403-4.909l2.311-.66a1.5 1.5 0 0 0 .437-.395.75.75 0 0 1 1.096 1.096 3 3 0 0 1-.84.779l-2.312.66a4.053 4.053 0 0 0-1.85 7.106l-1.32.377a.75.75 0 1 1-.42-1.44l1.32-.377a2.553 2.553 0 1 1 1.403-4.909l-2.311.66a1.5 1.5 0 0 0-.437.395.75.75 0 0 1-1.096-1.096 3 3 0 0 1 .84-.779l2.312-.66a4.053 4.053 0 0 0 1.85-7.106l1.32-.377a.75.75 0 0 1 .858.337Z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col w-full">
                        <span className="text-[10px] font-bold text-neon uppercase tracking-wider mb-1">Audio Ready</span>
                        <audio controls src={audioUrl} className="w-full h-8 rounded opacity-90" />
                    </div>
                    <a 
                        href={audioUrl} 
                        download={`vo-script-${isDialogue ? 'duo' : voice1}.wav`}
                        className="p-2.5 bg-neon/80 hover:bg-neon text-black rounded-lg transition-colors font-bold text-xs shrink-0 flex items-center gap-2 shadow-lg"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3-3m0 0 3-3m-3 3h7.5" />
                        </svg>
                        <span className="hidden sm:inline">Download</span>
                    </a>
                </div>
            </div>
        )}

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/5 bg-white/5 flex justify-end gap-3 shrink-0">
             <button 
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
             >
                Batal
             </button>
             <button 
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
                className={`px-6 py-2.5 rounded-xl text-black text-xs font-bold tracking-wide shadow-lg flex items-center gap-2 transition-all
                    ${isGenerating ? 'bg-neon/50 cursor-not-allowed' : 'bg-neon hover:bg-neon/80 hover:scale-105 shadow-neon/20'}
                `}
             >
                {isGenerating ? (
                    <>
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Memproses Audio...
                    </>
                ) : (
                    <>
                        <span>🎙️</span> Generate Audio
                    </>
                )}
             </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AudioGeneratorModal;