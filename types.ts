
export interface Scene {
  title: string;
  description: string;
  textOverlay: string;
  narration: string;
  voice_direction?: string;
  active_reference?: 'front' | 'back';
  imageEditPrompt: string;
  videoGenPrompt: string;
}

export interface UGCConcept {
  title: string;
  strategy: string;
  viralCaption: string;
  hashtags: string[];
  scenes: Scene[]; 
}

export interface AnalysisResponse {
  concepts: UGCConcept[];
}

export interface UploadedImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

export type GenerationMode = 'none' | 'manual' | 'merged';
export type NarrationStyle = string;

export interface GenerationOptions {
  textOverlayMode: GenerationMode;
  narrationMode: GenerationMode;
  narrationStyle: NarrationStyle;
  sceneCount: number;
}

// --- PRO STUDIO TYPES (REMASTERED) ---

export interface ProductStrategy {
  name: string;
  category: string; // Updated to use preset categories
  marketLevel: string; // NEW: Economy, Mid-Range, Luxury
  usp: string;
  offer: string; 
  targetPersona: string; // NEW: Specific persona (e.g. "Busy Mom")
  brandVoice: string; // NEW: Tone of voice (e.g. "Sassy Bestie")
  marketingAngle: string; 
  painPoint: string;
  isWearable: boolean; 
  isConsumable: boolean; // NEW: For Food/Drink logic
}

export interface VisualSuggestions {
    setting: string;
    lighting: string;
    mood: string;
    cameraAngle: string;
}

export interface ProductData {
    name: string;
    category: string;
    usp: string;
    targetAudience: string;
    promo?: string;
    isWearable: boolean; 
    visualSuggestions: VisualSuggestions; 
}

export interface TalentConfig {
  enabled: boolean;
  mode: 'builder' | 'custom' | 'upload';
  image?: UploadedImage | null;
  customPrompt?: string;
  details: {
    gender: string;
    ageGroup: string;
    ethnicity: string;
    lookVibe: string; 
    bodyType: string;
    skinTone: string;
    hairStyle: string; 
    makeupLook: string; 
    clothingStyle: string;
    clothingColor: string; 
    hijab: string;
  };
}

export interface CinematographyConfig {
  mode: 'builder' | 'upload';
  image?: UploadedImage | null; 
  settingType: string; 
  locationDetail: string; 
  lighting: string; 
  cameraAngle: string; 
  depthOfField: string; 
  colorGrade: string; 
}

export interface ProOptions {
  strategy: ProductStrategy;
  talent: TalentConfig;
  cinema: CinematographyConfig;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

// --- HISTORY TYPES ---
export interface HistoryItem {
  id: string;
  timestamp: number;
  mode: 'instant' | 'studio' | 'outfit';
  image: UploadedImage;
  backImage?: UploadedImage; // NEW: Store back image if available
  analysis: AnalysisResponse;
  modelType?: string; // NEW: Stores the outfit model type (e.g. "Cute Asian")
  // NEW: Store generation parameters to allow consistent regeneration from history
  genParams?: {
    sceneCount: number;
    chaosLevel: number;
    narrationStyle?: NarrationStyle;
  };
}