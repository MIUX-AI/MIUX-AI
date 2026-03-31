import React, { useState } from 'react';
import FileUpload from './FileUpload';
import { UploadedImage, AnalysisResponse, NarrationStyle } from '../types';
import { generateOutfitConcepts } from '../services/geminiService';

interface OutfitStudioProps {
  onAnalysisComplete: (analysis: AnalysisResponse, image: UploadedImage, modelType: string, sceneCount: number, chaosLevel: number, narrationStyle: NarrationStyle, backImage?: UploadedImage | null) => void;
  isLoading: boolean;
  apiKey: string;
  initialImage?: UploadedImage | null;
  initialBackImage?: UploadedImage | null;
  onClearImage?: () => void;
}

const OutfitStudio: React.FC<OutfitStudioProps> = ({ onAnalysisComplete, isLoading, apiKey, initialImage, initialBackImage, onClearImage }) => {
  const [productImg, setProductImg] = useState<UploadedImage | null>(initialImage || null);
  const [productImgBack, setProductImgBack] = useState<UploadedImage | null>(initialBackImage || null);
  const [modelType, setModelType] = useState<string>('Viral Cute Asian Girl (TikTok Celeb Aesthetic)');
  const [localLoading, setLocalLoading] = useState(false); 
  const [sceneCount, setSceneCount] = useState<number>(5);
  const [chaosLevel, setChaosLevel] = useState<number>(3); // Default Level 3
  const [narrationStyle, setNarrationStyle] = useState<NarrationStyle>('monolog');

  React.useEffect(() => {
    setProductImg(initialImage || null);
    setProductImgBack(initialBackImage || null);
  }, [initialImage, initialBackImage]);

  const handleUpload = async (img: UploadedImage) => {
    setProductImg(img);
  };

  const handleUploadBack = async (img: UploadedImage) => {
    setProductImgBack(img);
  };

  const handleGenerate = async () => {
    if (!productImg || !apiKey) return;
    setLocalLoading(true); 
    try {
        // Pass chaosLevel to the service
        const result = await generateOutfitConcepts(apiKey, productImg.base64, productImg.mimeType, modelType, sceneCount, chaosLevel, narrationStyle, productImgBack);
        onAnalysisComplete(result, productImg, modelType, sceneCount, chaosLevel, narrationStyle, productImgBack);
    } catch (e) {
        console.error(e);
        throw e; 
    } finally {
        setLocalLoading(false);
    }
  };

  const isProcessing = isLoading || localLoading;

  const getChaosLabel = (level: number) => {
      switch(level) {
          case 1: return "Clean (Minimal)";
          case 2: return "Light (Balanced)";
          case 3: return "Real (Standard)";
          case 4: return "Raw (High)";
          case 5: return "Chaos (Extreme)";
          default: return "Standard";
      }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center p-6 bg-gradient-to-b from-black to-zinc-950">
        
        <div className="max-w-xl w-full space-y-8">
            <div className="space-y-3">
                <h2 className="text-4xl font-mono tracking-widest text-neon animate-pulse-neon shadow-neon drop-shadow-lg">
                    OUTFIT REALISM
                </h2>
                <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest border-t border-b border-zinc-800 py-2">
                    Visual Tanpa Filter. Estetika Gelap. 
                </p>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4 md:p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                
                <div className="relative z-10 flex flex-col items-center gap-6">
                    <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                        {/* FRONT IMAGE AREA */}
                        <div className="flex-1 max-w-[240px] flex flex-col gap-2">
                            {!productImg ? (
                                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed border-neon/50 flex flex-col items-center justify-center bg-black/50 hover:bg-zinc-900 transition-colors">
                                    <div className="scale-75 origin-center w-full">
                                        <FileUpload 
                                            variant="default" 
                                            onImageSelected={handleUpload} 
                                            isLoading={isProcessing} 
                                        />
                                    </div>
                                    <p className="absolute bottom-4 text-[10px] text-neon/60 uppercase tracking-widest font-bold text-center px-2">
                                        + Tampak Depan<br/>(Wajib)
                                    </p>
                                </div>
                            ) : (
                                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-zinc-800 shadow-[0_0_20px_rgba(255,0,0,0.1)] transition-all duration-700">
                                     <img src={productImg.previewUrl} className="w-full h-full object-cover" />
                                     <div className="absolute bottom-0 left-0 w-full bg-black/80 text-[10px] text-center py-1 font-mono text-neon">DEPAN</div>
                                     <button 
                                        onClick={() => {
                                            setProductImg(null);
                                            setProductImgBack(null);
                                            if (onClearImage) onClearImage();
                                        }}
                                        className="absolute top-0 right-0 p-2 bg-neon/80 text-black hover:bg-neon transition-colors rounded-bl-lg"
                                     >
                                        <span className="text-xs font-bold">X</span>
                                     </button>
                                </div>
                            )}
                        </div>

                        {/* BACK IMAGE AREA */}
                        <div className="flex-1 max-w-[240px] flex flex-col gap-2">
                            {!productImgBack ? (
                                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center bg-black/50 hover:bg-zinc-900 transition-colors">
                                    <div className="scale-75 origin-center w-full">
                                        <FileUpload 
                                            variant="default" 
                                            onImageSelected={handleUploadBack} 
                                            isLoading={isProcessing} 
                                        />
                                    </div>
                                    <p className="absolute bottom-4 text-[10px] text-zinc-500 uppercase tracking-widest font-bold text-center px-2">
                                        + Tampak Belakang<br/>(Opsional)
                                    </p>
                                </div>
                            ) : (
                                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden border-2 border-zinc-800 shadow-[0_0_20px_rgba(255,0,0,0.1)] transition-all duration-700">
                                     <img src={productImgBack.previewUrl} className="w-full h-full object-cover" />
                                     <div className="absolute bottom-0 left-0 w-full bg-black/80 text-[10px] text-center py-1 font-mono text-zinc-400">BELAKANG</div>
                                     <button 
                                        onClick={() => {
                                            setProductImgBack(null);
                                        }}
                                        className="absolute top-0 right-0 p-2 bg-zinc-700 text-white hover:bg-red-900 transition-colors rounded-bl-lg"
                                     >
                                        <span className="text-xs font-bold">X</span>
                                     </button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {productImg && (
                        <div className="space-y-6 w-full max-w-xs text-left border-t border-zinc-800 pt-6">
                            {/* Model Selector */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neon/80 uppercase tracking-widest">Subjek Target</label>
                                <select 
                                    value={modelType} 
                                    onChange={(e) => setModelType(e.target.value)}
                                    disabled={isProcessing}
                                    className="w-full bg-black border border-zinc-800 rounded-none px-3 py-3 text-xs text-zinc-300 focus:outline-none focus:border-red-900 transition-all font-mono"
                                >
                                    <optgroup label="--- VIRAL ---">
                                        <option value="Viral Cute Asian Girl (TikTok Celeb Aesthetic)">Asian Girl (Viral Cut)</option>
                                        <option value="Handsome Korean Guy (Long Wolf Cut Hair, Cool Vibe)">Korean Guy (Wolf Cut)</option>
                                        <option value="Clean Girl Aesthetic (Glowing Skin, Minimalist)">Clean Girl (Minimalist)</option>
                                        <option value="Edgy Y2K Girl (Flash Photography, Cool Attitude)">Edgy Y2K (Flash Photo)</option>
                                    </optgroup>
                                    <optgroup label="--- LOKAL ---">
                                        <option value="Hijab Muslimah Model (Fashion & Daily)">Hijab Muslimah (Fashion & Daily)</option>
                                        <option value="Hijab Fashion Creator (Modern Pashmina, Trendy)">Hijab Creator (Pashmina)</option>
                                        <option value="Cool Gen-Z Boy (Streetwear Vibe, Messy Hair)">Gen-Z Boy (Streetwear)</option>
                                        <option value="Chindo Girl (Luxury & Elegant)">Chindo Girl (Luxury)</option>
                                    </optgroup>
                                    <optgroup label="--- PRODUK ---">
                                        <option value="Faceless / Body Only (Focus on Outfit Details)">Faceless (Body Only)</option>
                                        <option value="Cinematic Product Review (Hands Only, Texture Focus, Hanging/Flatlay)">Cinematic Review (Hands Only)</option>
                                    </optgroup>
                                </select>
                            </div>

                            {/* Scene Count */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-bold text-neon/80 uppercase tracking-widest">Durasi</label>
                                    <span className="text-[10px] font-bold text-zinc-500">{sceneCount} Scene</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="3" 
                                    max="10" 
                                    step="1"
                                    value={sceneCount}
                                    onChange={(e) => setSceneCount(parseInt(e.target.value))}
                                    disabled={isProcessing}
                                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-neon hover:accent-neon/80"
                                />
                            </div>

                            {/* Chaos Level */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-bold text-neon/80 uppercase tracking-widest">Intensitas Realisme</label>
                                    <span className={`text-[10px] font-bold ${chaosLevel >= 4 ? 'text-neon animate-pulse' : 'text-zinc-500'}`}>
                                        Lv.{chaosLevel} {getChaosLabel(chaosLevel)}
                                    </span>
                                </div>
                                <div className="relative flex items-center gap-2">
                                    <span className="text-[8px] text-zinc-600">CLEAN</span>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="5" 
                                        step="1"
                                        value={chaosLevel}
                                        onChange={(e) => setChaosLevel(parseInt(e.target.value))}
                                        disabled={isProcessing}
                                        className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-neon hover:accent-neon/80"
                                    />
                                    <span className="text-[8px] text-neon/80 font-bold">CHAOS</span>
                                </div>
                            </div>

                            {/* Narration Style */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-neon/80 uppercase tracking-widest">Gaya Narasi (Dubbing)</label>
                                <select 
                                    value={narrationStyle} 
                                    onChange={(e) => setNarrationStyle(e.target.value as NarrationStyle)}
                                    disabled={isProcessing}
                                    className="w-full bg-black border border-zinc-800 rounded-none px-3 py-3 text-xs text-zinc-300 focus:outline-none focus:border-red-900 transition-all font-mono"
                                >
                                    <option value="monolog">Monolog (Natural/Informatif)</option>
                                    <option value="jaksel">Anak Jaksel (Trendy/Campur Inggris)</option>
                                    <option value="reviewer">Reviewer Jujur (Sarkas/Kritis)</option>
                                    <option value="asmr">Soft Girl ASMR (Berbisik/Estetik)</option>
                                    <option value="hype">Hypebeast Bro (Cepat/Energetik)</option>
                                    <option value="sales">Sales SPG (Hard Selling/Ramah)</option>
                                    <option value="storytime">Storytime (Curhat/Mengalir)</option>
                                </select>
                            </div>
                            
                            <button
                                onClick={handleGenerate}
                                disabled={isProcessing}
                                className={`w-full py-4 rounded-none font-bold text-sm tracking-[0.2em] shadow-xl transition-all duration-300 relative overflow-hidden group/btn border border-red-900/30
                                    ${isProcessing
                                        ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed'
                                        : 'bg-black text-red-500 hover:text-white hover:bg-red-900 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                                    }
                                `}
                            >
                                {isProcessing ? (
                                    <span className="animate-pulse">MEMPROSES...</span>
                                ) : (
                                    <span>BANGKITKAN</span>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};

export default OutfitStudio;