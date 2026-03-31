import React, { useState, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UGCConcept, Scene, GenerationOptions, UploadedImage } from '../types';
import { generateEditedImage } from '../services/geminiService';
import AudioGeneratorModal from './AudioGeneratorModal';

interface ConceptCardProps {
  concept: UGCConcept;
  index: number;
  defaultOpen?: boolean;
  options: GenerationOptions;
  onRegenerate: () => void;
  isRegenerating: boolean;
  originalImage: UploadedImage | null;
  backImage?: UploadedImage | null;
  apiKey: string; 
}

const CopyButton: React.FC<{ text: string; label: string; iconPath: string; rightElement?: React.ReactNode }> = ({ 
  text, 
  label, 
  iconPath, 
  rightElement
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex gap-2 w-full">
        <button
        onClick={(e) => {
            e.stopPropagation(); 
            handleCopy();
        }}
        // FIX: Changed w-full to flex-1 min-w-0 so it shrinks if rightElement exists
        className={`flex-1 min-w-0 flex items-center gap-3 px-3 py-3 text-xs rounded-none border text-left transition-all ${copied ? 'bg-neon/20 border-neon/50 text-neon' : 'bg-black border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'}`}
        >
        <div className="hidden sm:block opacity-50 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <path d={iconPath} />
            </svg>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[8px] uppercase tracking-widest font-bold mb-0.5 opacity-60">{label}</span>
            <span className="truncate font-mono text-[10px]">{text}</span>
        </div>
        {copied && <span className="text-[8px] font-bold text-neon tracking-widest shrink-0">COPIED</span>}
        </button>
        {rightElement && (
            <div className="shrink-0 flex items-stretch">
                {rightElement}
            </div>
        )}
    </div>
  );
};

const ImageSkeletonLoader = () => {
    return (
        <div className="relative mt-3 h-64 w-full bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center gap-3 overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-t from-neon/10 to-transparent animate-pulse"></div>
             <div className="w-8 h-8 border-2 border-neon border-t-transparent rounded-full animate-spin z-10"></div>
             <span className="text-[10px] font-mono text-neon tracking-widest uppercase z-10">Manifesting Visual...</span>
        </div>
    );
}

const SceneItem: React.FC<{ 
    scene: Scene; 
    index: number; 
    originalImage: UploadedImage | null;
    backImage?: UploadedImage | null;
    apiKey: string; 
}> = memo(({ scene, index, originalImage, backImage, apiKey }) => {
    const [isGeneratingImg, setIsGeneratingImg] = useState(false);
    const [generatedImg, setGeneratedImg] = useState<string | null>(null);

    const handleGenerateImage = async () => {
        if (!originalImage || !apiKey) return;
        setIsGeneratingImg(true);
        setGeneratedImg(null);
        try {
            // Determine which image to use based on active_reference if available
            const useBackImage = scene.active_reference === 'back' && backImage;
            const targetImage = useBackImage ? backImage : originalImage;

            const base64Data = await generateEditedImage(
                apiKey,
                targetImage.base64, 
                targetImage.mimeType, 
                scene.imageEditPrompt
            );
            setGeneratedImg(`data:image/png;base64,${base64Data}`);
        } catch (e: any) {
            if (e.message === "RATE_LIMIT") {
                alert("⚠️ Kuota API Image Generation habis (Error 429). Tunggu 1-2 menit lalu coba lagi.");
            } else {
                alert("Gagal membuat gambar. Coba lagi nanti.");
            }
        } finally {
            setIsGeneratingImg(false);
        }
    };

    return (
        <div className="relative pl-6 pb-8 border-l border-zinc-800 ml-2 group/scene">
            <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-700 group-hover/scene:bg-neon group-hover/scene:border-neon/50 transition-colors"></div>
            
            <div className="mb-4">
                 <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-neon/70 mb-1 block">Scene {index + 1}</span>
                 <p className="text-sm text-zinc-400 font-serif italic border-l-2 border-zinc-800 pl-3">"{scene.description}"</p>
            </div>

            <div className="space-y-2">
                <CopyButton 
                    label="VISUAL PROMPT" 
                    text={scene.imageEditPrompt} 
                    iconPath="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    rightElement={
                        <button
                            onClick={handleGenerateImage}
                            disabled={isGeneratingImg || !originalImage}
                            className={`px-4 border border-zinc-800 flex items-center justify-center transition-all ${isGeneratingImg ? 'bg-zinc-900 text-zinc-700' : 'bg-black text-zinc-400 hover:text-white hover:border-neon/50'}`}
                        >
                            <span className="text-lg">👁️</span>
                        </button>
                    }
                />

                {isGeneratingImg && <ImageSkeletonLoader />}

                {generatedImg && !isGeneratingImg && (
                    <div className="mt-3 relative border border-zinc-800 group/img">
                        {/* REMOVED GRAYSCALE HERE */}
                        <img src={generatedImg} className="w-full h-auto object-contain transition-all duration-700" />
                        <a 
                            href={generatedImg} 
                            download={`scene-${index+1}-studio-edition.png`}
                            className="absolute bottom-2 right-2 px-3 py-1 bg-black text-white text-[10px] font-bold uppercase tracking-widest border border-white/20 hover:bg-neon/30 transition-colors"
                        >
                            Save Evidence
                        </a>
                    </div>
                )}

                <CopyButton 
                    label="VIDEO PROMPT" 
                    text={scene.videoGenPrompt} 
                    iconPath="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z"
                />
            </div>
        </div>
    )
});

const ConceptCard: React.FC<ConceptCardProps> = memo(({ concept, index, defaultOpen = false, options, onRegenerate, isRegenerating, originalImage, backImage, apiKey }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAudioOpen, setIsAudioOpen] = useState(false);

  // Combine narration from all scenes into one script
  const combinedNarration = concept.scenes
    .map(s => s.narration)
    .filter(n => n && n.trim() !== '')
    .join('\n\n');

  return (
    <div className={`relative border border-zinc-800 bg-black/80 backdrop-blur-md transition-all duration-500 overflow-hidden group hover:border-neon/30 ${isRegenerating ? 'opacity-50' : ''}`}>
      <div 
        onClick={() => !isRegenerating && setIsOpen(!isOpen)}
        className="p-5 cursor-pointer flex items-center justify-between select-none"
      >
        <div className="flex items-center gap-4">
             <div className="text-2xl font-mono text-zinc-700 group-hover:text-neon transition-colors">
                #{index + 1}
            </div>
            <div>
                 <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 block">Konsep Visual</span>
                 <h3 className="text-lg font-bold text-zinc-300 group-hover:text-white transition-colors">{concept.title}</h3>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            <button
                onClick={(e) => { e.stopPropagation(); if (!isRegenerating) onRegenerate(); }}
                disabled={isRegenerating}
                className="p-2 text-zinc-600 hover:text-neon transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${isRegenerating ? 'animate-spin' : ''}`}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
            </button>
            <span className={`text-zinc-600 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {isOpen && !isRegenerating && (
        <div className="animate-fade-in border-t border-zinc-900 bg-zinc-950/50">
          <div className="px-5 py-6">
            <p className="text-xs text-zinc-500 mb-6 font-mono border-l border-neon/50 pl-3 uppercase">Strategy: {concept.strategy}</p>
            {concept.scenes.map((scene, idx) => (
                <SceneItem key={idx} scene={scene} index={idx} originalImage={originalImage} backImage={backImage} apiKey={apiKey} />
            ))}
          </div>
          
          <div className="bg-black border-t border-zinc-900 p-4">
             <CopyButton 
                 label="CAPTION & HASHTAGS" 
                 text={`${concept.viralCaption}\n\n${concept.hashtags ? concept.hashtags.map(tag => `#${tag}`).join(' ') : ''}`}
                 iconPath="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
             />
             
             {/* Audio Generator Trigger */}
             <div className="mt-4 pt-4 border-t border-zinc-900 flex justify-between items-center">
                 <button 
                     onClick={() => setIsAudioOpen(true)}
                     className="px-4 py-2 bg-red-900/10 text-red-500 hover:bg-red-900 hover:text-white border border-red-900/30 rounded-lg text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                 >
                     <span>🎙️</span> Dubbing Studio
                 </button>
             </div>
          </div>
        </div>
      )}

      {/* Audio Modal */}
      <AudioGeneratorModal 
          isOpen={isAudioOpen} 
          onClose={() => setIsAudioOpen(false)} 
          initialText={combinedNarration} 
          narrationStyle={options.narrationStyle || 'monolog'} 
          apiKey={apiKey} 
      />
    </div>
  );
});

export default ConceptCard;