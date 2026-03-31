import React, { useState, useEffect } from 'react';
import ConceptCard from './components/ConceptCard';
import WelcomeModal from './components/WelcomeModal';
import ApiKeyModal from './components/ApiKeyModal';
import OutfitStudio from './components/OutfitStudio';
import HistoryGallery from './components/HistoryGallery'; 
import ToastContainer from './components/Toast'; 
import { UploadedImage, AnalysisResponse, GenerationOptions, ToastMessage, ToastType, HistoryItem, NarrationStyle } from './types';
import { regenerateSingleConcept } from './services/geminiService';
import { saveHistoryItem } from './services/historyService'; 

// TYPE DEFINITION FOR NAVIGATION
type NavPage = 'create' | 'library';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<NavPage>('create');
  
  const [image, setImage] = useState<UploadedImage | null>(null); 
  const [backImage, setBackImage] = useState<UploadedImage | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0); 
  const [regeneratingIndices, setRegeneratingIndices] = useState<Set<number>>(new Set());
  const [showWelcome, setShowWelcome] = useState(false); 
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');

  // Toast State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Generation Parameters Store (for regeneration consistency)
  const [lastModelType, setLastModelType] = useState<string | undefined>(undefined); 
  const [currentSceneCount, setCurrentSceneCount] = useState<number>(5);
  const [currentChaosLevel, setCurrentChaosLevel] = useState<number>(3);
  const [currentNarrationStyle, setCurrentNarrationStyle] = useState<NarrationStyle>('monolog');

  // Shared Options (Minimal)
  const options: GenerationOptions = {
    textOverlayMode: 'none', 
    narrationMode: 'none',   
    narrationStyle: currentNarrationStyle, 
    sceneCount: currentSceneCount, // Synced with state
  };

  // --- STUDIO MESSAGES ---
  const LOADING_MESSAGES = [
      "Initializing Entropy Engine...",
      "Injecting Visual DNA...",
      "Bypassing AI Smoothing...",
      "Synthesizing Raw Textures...",
      "Assembling Concepts..."
  ];

  useEffect(() => {
    const storedKey = localStorage.getItem('miux_api_key');
    if (storedKey) {
        setApiKey(storedKey);
    } else {
        setShowApiKeyModal(true);
    }

    const hasVisited = localStorage.getItem('miux_black_visited');
    if (!hasVisited) {
        setShowWelcome(true);
        localStorage.setItem('miux_black_visited', 'true');
    }
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>; 
    if (isLoading) {
        setLoadingPhase(0);
        interval = setInterval(() => {
            setLoadingPhase(prev => (prev + 1) % LOADING_MESSAGES.length);
        }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    return () => {
        if (image?.previewUrl && image.previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(image.previewUrl);
        }
    };
  }, [image]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleSaveApiKey = (key: string) => {
      localStorage.setItem('miux_api_key', key);
      setApiKey(key);
      setShowApiKeyModal(false);
      showToast("API Key Berhasil Disimpan", 'success');
  };

  const clearApiKey = () => {
      localStorage.removeItem('miux_api_key');
      setApiKey('');
      setShowApiKeyModal(true);
      showToast("API Key Dihapus", 'info');
  };

  const autoSaveToHistory = async (img: UploadedImage, result: AnalysisResponse, modelType: string, sceneCount: number, chaosLevel: number, narrationStyle: NarrationStyle, secondaryImage?: UploadedImage | null) => {
      try {
          const newItem: HistoryItem = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              mode: 'outfit',
              image: img,
              backImage: secondaryImage || undefined,
              analysis: result,
              modelType: modelType,
              genParams: {
                  sceneCount,
                  chaosLevel,
                  narrationStyle
              }
          };
          await saveHistoryItem(newItem);
      } catch (e) {
          console.error("Auto-save failed", e);
      }
  };

  // HANDLER: Outfit Realism Mode (The Only Mode)
  const handleOutfitAnalysisCompleteWithModel = (result: AnalysisResponse, mainImage: UploadedImage, modelType: string, sceneCount: number, chaosLevel: number, narrationStyle: NarrationStyle, secondaryImage?: UploadedImage | null) => {
      setImage(mainImage);
      setBackImage(secondaryImage || null);
      setAnalysis(result);
      setLastModelType(modelType);
      setCurrentSceneCount(sceneCount);
      setCurrentChaosLevel(chaosLevel);
      setCurrentNarrationStyle(narrationStyle);
      showToast("Visual Studio Tercipta.", 'success');
      autoSaveToHistory(mainImage, result, modelType, sceneCount, chaosLevel, narrationStyle, secondaryImage);
  }

  // HANDLER: Load From History
  const handleLoadHistory = (item: HistoryItem) => {
      setImage(item.image);
      setBackImage(item.backImage || null);
      setAnalysis(item.analysis);
      setLastModelType(item.modelType);
      // Restore params if available, otherwise default
      if (item.genParams) {
          setCurrentSceneCount(item.genParams.sceneCount);
          setCurrentChaosLevel(item.genParams.chaosLevel);
          if (item.genParams.narrationStyle) setCurrentNarrationStyle(item.genParams.narrationStyle);
      } else {
          // Fallback based on result length
          setCurrentSceneCount(item.analysis.concepts[0]?.scenes.length || 5);
          setCurrentChaosLevel(3);
          setCurrentNarrationStyle('monolog');
      }
      setActivePage('create');
      showToast("Arsip Studio Dimuat.", 'success');
  };

  const handleRegenerateSingle = async (index: number) => {
    if (!image || !analysis) return;
    setRegeneratingIndices(prev => new Set(prev).add(index));
    
    try {
        // Use currentSceneCount and currentChaosLevel
        const newConcept = await regenerateSingleConcept(
            apiKey, 
            image.base64, 
            image.mimeType, 
            { ...options, sceneCount: currentSceneCount }, 
            lastModelType,
            currentChaosLevel,
            backImage
        );
        
        setAnalysis(prevAnalysis => {
            if (!prevAnalysis) return prevAnalysis;
            const updatedConcepts = [...prevAnalysis.concepts];
            updatedConcepts[index] = newConcept;
            const newAnalysis = { ...prevAnalysis, concepts: updatedConcepts };
            
            autoSaveToHistory(image, newAnalysis, lastModelType || 'Viral Cute Asian Girl (TikTok Celeb Aesthetic)', currentSceneCount, currentChaosLevel, currentNarrationStyle, backImage);
            return newAnalysis;
        });
        
        showToast(`Konsep ${index + 1} Diperbarui (Lv.${currentChaosLevel}).`, 'success');
        
    } catch (err) {
        console.error("Failed to regenerate single concept", err);
        showToast("Gagal Memperbarui.", 'error');
    } finally {
        setRegeneratingIndices(prev => {
            const next = new Set(prev);
            next.delete(index);
            return next;
        });
    }
  };

  const backToStudio = () => {
    setAnalysis(null);
  };

  const handleClearImage = () => {
    if (image?.previewUrl && image.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(image.previewUrl);
    }
    if (backImage?.previewUrl && backImage.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(backImage.previewUrl);
    }
    setImage(null);
    setBackImage(null);
    setAnalysis(null);
  };

  // --- BOTTOM NAV BUTTON ---
  const NavButton = ({ page, label, icon }: { page: NavPage, label: string, icon: React.ReactNode }) => (
    <button 
        onClick={() => setActivePage(page)}
        className={`flex flex-col items-center gap-1 p-2 transition-all duration-300 ${activePage === page ? 'text-neon scale-110' : 'text-zinc-600 hover:text-zinc-400'}`}
    >
        {icon}
        <span className={`text-[9px] font-bold uppercase tracking-widest ${activePage === page ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen relative text-zinc-300 font-sans overflow-hidden selection:bg-neon/30 selection:text-white flex flex-col bg-dark">
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* STUDIO BACKGROUND */}
      <div className="fixed inset-0 w-full h-full bg-dark -z-20"></div>
      <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-neon/5 rounded-full mix-blend-screen filter blur-[150px] animate-pulse-neon"></div>
          <div className="absolute bottom-0 -right-20 w-[600px] h-[600px] bg-neon/5 rounded-full mix-blend-screen filter blur-[180px] animate-pulse-neon" style={{animationDelay: '2s'}}></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 brightness-50 contrast-200"></div>
      </div>

      <WelcomeModal isOpen={showWelcome} onClose={() => setShowWelcome(false)} />
      <ApiKeyModal isOpen={showApiKeyModal} onSave={handleSaveApiKey} />

      {/* HEADER: STUDIO EDITION */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 pt-8 pb-4 bg-gradient-to-b from-dark via-dark/80 to-transparent">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => window.location.reload()}>
             {/* Logo Icon */}
             <div className="w-10 h-10 bg-zinc-900 border border-neon/30 rounded flex items-center justify-center group-hover:border-neon transition-colors shadow-[0_0_15px_rgba(163,230,53,0.1)]">
                <span className="text-xl font-mono text-neon">M</span>
             </div>
             <div>
                 <h1 className="font-mono text-3xl tracking-widest text-white leading-none group-hover:text-neon transition-colors glitch-text">MIUX</h1>
                 <span className="text-[9px] font-bold tracking-[0.3em] text-neon/70 uppercase block">Studio</span>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
              <button 
                 onClick={clearApiKey}
                 className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/50 text-zinc-600 border border-zinc-800 hover:text-red-500 hover:border-red-500/50 transition-all"
                 title="Hapus API Key"
              >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                 </svg>
              </button>
              <button 
                 onClick={() => setShowWelcome(true)}
                 className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900/50 text-zinc-600 border border-zinc-800 hover:text-neon hover:border-neon/50 transition-all"
              >
                 ?
              </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-28 pb-32 flex-grow w-full relative z-10">
        
        {activePage === 'create' && (
            <div className="animate-fade-in w-full">
                {!analysis ? (
                    <div className="bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative">
                         {/* Neon Line Top */}
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon/20 via-neon to-neon/20"></div>
                         
                         <OutfitStudio 
                            apiKey={apiKey}
                            onAnalysisComplete={handleOutfitAnalysisCompleteWithModel}
                            isLoading={isLoading}
                            initialImage={image}
                            initialBackImage={backImage}
                            onClearImage={handleClearImage}
                         />
                    </div>
                ) : (
                    <div className="space-y-8">
                         {/* Result Header */}
                         <div className="flex items-center gap-6 p-4 bg-zinc-900/30 border border-neon/20 rounded-2xl backdrop-blur-md">
                            {/* REMOVED GRAYSCALE HERE */}
                            <div className="flex gap-2">
                                <img src={`data:${image.mimeType};base64,${image.base64}`} className="w-20 h-20 object-cover rounded-lg border border-zinc-700 transition-all duration-500" />
                                {backImage && (
                                    <img src={`data:${backImage.mimeType};base64,${backImage.base64}`} className="w-20 h-20 object-cover rounded-lg border border-zinc-700 transition-all duration-500" />
                                )}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold font-display text-lg">Subjek Terdeteksi</h3>
                                <p className="text-xs text-neon/80 mt-1 uppercase tracking-widest font-mono animate-pulse">
                                    {isLoading ? LOADING_MESSAGES[loadingPhase] : `Analisa Selesai (${currentSceneCount} Scene)`}
                                </p>
                            </div>
                            {!isLoading && (
                                <button onClick={backToStudio} className="p-3 bg-neon/10 hover:bg-neon/30 text-neon hover:text-white rounded-xl border border-neon/30 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                                    </svg>
                                </button>
                            )}
                         </div>

                         {/* Loading Bar */}
                         {isLoading && (
                             <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                                 <div className="h-full bg-neon animate-progress shadow-[0_0_10px_#a3e635]"></div>
                             </div>
                         )}

                         {/* Concepts */}
                         {analysis && (
                             <div className="space-y-6">
                                 {analysis.concepts.map((concept, idx) => (
                                    <ConceptCard 
                                        key={idx} 
                                        concept={concept} 
                                        index={idx} 
                                        defaultOpen={idx === 0}
                                        options={options}
                                        onRegenerate={() => handleRegenerateSingle(idx)}
                                        isRegenerating={regeneratingIndices.has(idx)}
                                        originalImage={image}
                                        backImage={backImage}
                                        apiKey={apiKey}
                                    />
                                ))}
                             </div>
                         )}
                    </div>
                )}
            </div>
        )}

        {activePage === 'library' && (
            <div className="animate-fade-in">
                <h2 className="text-2xl font-mono text-neon mb-6 tracking-widest text-center">Arsip Studio</h2>
                <HistoryGallery isActive={activePage === 'library'} onLoadItem={handleLoadHistory} />
            </div>
        )}

      </main>

      {/* BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/5 pb-6 pt-2 z-50">
          <div className="max-w-md mx-auto flex justify-around items-center">
              <NavButton 
                page="create" 
                label="Create" 
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                    </svg>
                }
              />
              <NavButton 
                page="library" 
                label="Library" 
                icon={
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
                    </svg>
                }
              />
          </div>
      </div>

    </div>
  );
};

export default App;