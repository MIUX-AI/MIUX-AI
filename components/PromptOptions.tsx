import React from 'react';
import { GenerationOptions, GenerationMode, NarrationStyle } from '../types';

interface PromptOptionsProps {
  options: GenerationOptions;
  onChange: (options: GenerationOptions) => void;
  disabled: boolean;
}

const PromptOptions: React.FC<PromptOptionsProps> = ({ options, onChange, disabled }) => {
  
  // -- Helper for Segmented Control Buttons --
  const ModeButton = ({ 
    active, 
    onClick, 
    label, 
    icon 
  }: { 
    active: boolean, 
    onClick: () => void, 
    label: string, 
    icon?: React.ReactNode 
  }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase transition-all
            ${active 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }
        `}
    >
        {icon}
        {label}
    </button>
  );

  return (
    <div className={`transition-opacity duration-300 ${disabled ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: AUDIO SETTINGS */}
        <div className="space-y-4">
            
            <div className="space-y-2">
                <div className="flex justify-between items-end">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mode Audio & Suara</label>
                </div>
                
                <div className="flex bg-black/40 p-1 rounded-xl">
                    <ModeButton 
                        active={options.narrationMode === 'manual'}
                        onClick={() => onChange({...options, narrationMode: 'manual'})}
                        label="Naskah + Dubbing"
                        icon={<span>🎙️</span>}
                    />
                    <ModeButton 
                        active={options.narrationMode === 'merged'}
                        onClick={() => onChange({...options, narrationMode: 'merged'})}
                        label="Gabung Prompt"
                        icon={<span>🎞️</span>}
                    />
                    <ModeButton 
                        active={options.narrationMode === 'none'}
                        onClick={() => onChange({...options, narrationMode: 'none'})}
                        label="Senyap"
                        icon={<span>🔇</span>}
                    />
                </div>
            </div>

            {/* CONDITIONAL: Narration Style (Only if Manual) */}
            {options.narrationMode === 'manual' && (
                <div className="animate-fade-in pt-1">
                     <p className="text-[9px] text-slate-500 mb-1.5 uppercase font-bold">Gaya Bicara:</p>
                     <div className="grid grid-cols-4 gap-2">
                        {[
                            { id: 'monolog', label: 'Monolog' },
                            { id: 'dialogue', label: 'Dialog (2 Org)' },
                            { id: 'asmr', label: 'ASMR / Soft' },
                            { id: 'hype', label: 'Hype / Cepat' }
                        ].map((style) => (
                             <button
                                key={style.id}
                                onClick={() => onChange({...options, narrationStyle: style.id as NarrationStyle})}
                                className={`py-1.5 rounded-lg border text-[9px] font-bold uppercase transition-all
                                    ${options.narrationStyle === style.id 
                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' 
                                        : 'bg-transparent border-white/5 text-slate-500 hover:border-white/20'
                                    }
                                `}
                            >
                                {style.label}
                            </button>
                        ))}
                     </div>
                </div>
            )}
        </div>

        {/* RIGHT COLUMN: TEXT & DURATION */}
        <div className="space-y-4">
            
            {/* Text Overlay */}
            <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teks di Layar (Overlay)</label>
                <div className="flex bg-black/40 p-1 rounded-xl">
                    <ModeButton 
                        active={options.textOverlayMode === 'manual'}
                        onClick={() => onChange({...options, textOverlayMode: 'manual'})}
                        label="Manual (Salin Teks)"
                    />
                    <ModeButton 
                        active={options.textOverlayMode === 'merged'}
                        onClick={() => onChange({...options, textOverlayMode: 'merged'})}
                        label="Otomatis di Video"
                    />
                     <ModeButton 
                        active={options.textOverlayMode === 'none'}
                        onClick={() => onChange({...options, textOverlayMode: 'none'})}
                        label="Tanpa Teks"
                    />
                </div>
            </div>

            {/* Scene Count */}
            <div className="flex items-center gap-4 bg-white/5 rounded-xl p-2 border border-white/5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap pl-2">Jumlah Scene</label>
                <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    step="1"
                    value={options.sceneCount} 
                    onChange={(e) => onChange({ ...options, sceneCount: parseInt(e.target.value) })}
                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500 text-white font-bold text-xs">
                    {options.sceneCount}
                </span>
            </div>
        </div>

      </div>
    </div>
  );
};

export default PromptOptions;