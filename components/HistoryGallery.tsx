import React, { useEffect, useState } from 'react';
import { HistoryItem } from '../types';
import { getAllHistory, deleteHistoryItem, clearAllHistory } from '../services/historyService';

interface HistoryGalleryProps {
  onLoadItem: (item: HistoryItem) => void;
  isActive: boolean;
}

const HistoryGallery: React.FC<HistoryGalleryProps> = ({ onLoadItem, isActive }) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isActive) {
      loadData();
    }
  }, [isActive]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await getAllHistory();
      // FILTER: ONLY SHOW OUTFIT MODE
      const outfitItems = data.filter(item => item.mode === 'outfit');
      setItems(outfitItems);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
        await deleteHistoryItem(id);
        setItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
        console.error(err);
    }
  };

  const handleClearAll = async () => {
      try {
          await clearAllHistory();
          setItems([]);
      } catch (err) {
          console.error(err);
      }
  }

  if (isLoading) {
      return <div className="text-center text-neon font-mono animate-pulse mt-20 text-2xl">MEMBUKA ARSIP...</div>;
  }

  if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-80 text-zinc-700 border border-zinc-900 bg-black">
            <h3 className="text-xl font-mono mb-2 text-neon/50">KOSONG</h3>
            <p className="text-xs font-mono tracking-widest uppercase">Belum ada karya yang tersimpan.</p>
        </div>
      );
  }

  return (
    <div className="animate-fade-in w-full pb-20 px-2">
        <div className="flex justify-end mb-4">
            <button 
                onClick={handleClearAll}
                className="text-[10px] font-bold uppercase tracking-widest text-neon/70 hover:text-neon transition-colors"
            >
                HAPUS SEMUA
            </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            {items.map((item) => (
                <div 
                    key={item.id}
                    onClick={() => onLoadItem(item)}
                    className="group relative bg-zinc-900 border border-zinc-800 hover:border-neon/50 transition-all cursor-pointer overflow-hidden"
                >
                    {/* REMOVED GRAYSCALE HERE */}
                    <div className="aspect-[4/5] relative transition-all duration-700">
                         <img 
                            src={`data:${item.image.mimeType};base64,${item.image.base64}`} 
                            alt="Project" 
                            className="w-full h-full object-cover opacity-60 group-hover:opacity-100"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                         
                         <button
                            onClick={(e) => handleDelete(e, item.id)}
                            className="absolute top-2 right-2 p-1.5 bg-black/80 text-neon/70 hover:text-neon transition-colors"
                         >
                            ✕
                         </button>

                         <div className="absolute bottom-3 left-3 right-3">
                             <h4 className="font-bold text-white text-xs line-clamp-1 mb-1">
                                {item.analysis.concepts[0]?.title || "Unknown"}
                             </h4>
                             <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider">
                                {new Date(item.timestamp).toLocaleDateString('id-ID')}
                             </p>
                         </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default HistoryGallery;