import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { AnalysisResponse, GenerationOptions, UGCConcept, ProductData, UploadedImage } from "../types";
import { 
    pickWeightedRandom, 
    clearRecentPicks,
    getHandPoolForModel, 
    resolveCameraMotion,
    POOL_HAND_ACTIVITY, 
    POOL_HAND_LOCATION, 
    POOL_HAND_LIGHTING, 
    POOL_HAND_IMPERFECTION,
    HUMAN_STYLE_POOLS,
    POOL_HUMAN_LOCATION,
    POOL_HUMAN_ACTIVITY,
    POOL_HUMAN_IMPERFECTION,
    POOL_LIGHTING_STYLES,
    POOL_CAMERA_MOTION,
    POOL_VIDEO_ARTIFACTS,
    mapModelToStyleKey
} from "./entropyEngine";

// === 1. VISUAL DNA & NEGATIVE PROMPTS ===
const HYPER_REALISM_BASE = `
(RAW PHOTO, IPHONE 15 PRO MAX SNAPSHOT). style of viral tiktok photo, amateur photography style, authentic look, unedited, natural film grain.
SKIN/FACE RULES: authentic unretouched skin texture, natural skin details, imperfect lighting, raw candid photo, 4k, ultra-realistic.
DETAILS: natural hair dynamics, sharp eyes, realistic skin texture without AI smoothing. Natural beauty marks permitted.
`;

const RAW_NEGATIVE_PROMPT = `
cartoon, 3D render, anime, illustration, painting, text, watermark, logo, low quality, distorted face, bad anatomy, extra fingers,
posing, model behavior, expressive acting,
cinematic lighting, studio lighting, beauty filter, AI glow, plastic skin, skin smoothing,
perfect symmetry, airbrushed, digital art, professional photoshoot.
`;

const VIDEO_NEGATIVE_PROMPT = `
no face morphing
no extra fingers
no limb distortion
no logo distortion
no text warping
no background warping
no camera jump
no lighting shift
no flicker
no blur pumping
no artificial glow
no beauty filter
`;

const HYPER_REALISM_VIDEO_BASE = `
(RAW VIDEO, IPHONE 15 PRO MAX FOOTAGE).
viral tiktok style, amateur handheld realism, authentic look, unedited, natural film grain, no cinematic grading, no HDR look.
`;

// === 5. SCHEMAS ===
const visualStructureSchema = {
    type: Type.OBJECT,
    description: "Detailed visual breakdown for Image Generation. MUST BE IN ENGLISH.",
    properties: {
        subject_desc: { type: Type.STRING, description: "FULL VISUAL DESCRIPTION. Include specific details: 'authentic skin', 'natural texture', 'real lighting'." },
        action_pose: { type: Type.STRING, description: "EXACT action in ENGLISH. e.g. 'shielding eyes from light'." },
        product_placement: { type: Type.STRING, description: "Where is the product? e.g. 'worn naturally' OR 'placed on marble table'." },
        lighting_atmosphere: { type: Type.STRING, description: "Specific lighting instruction in ENGLISH." },
        camera_angle: { type: Type.STRING, description: "Specific camera angle in ENGLISH." }
    },
    required: ["subject_desc", "action_pose", "product_placement", "lighting_atmosphere", "camera_angle"]
};

const videoStructureSchema = {
    type: Type.OBJECT,
    description: "Detailed motion breakdown for Video Generation. MUST BE IN ENGLISH.",
    properties: {
        subject_movement: { type: Type.STRING, description: "Micro-movements ONLY. e.g. 'Slowly adjusting glasses', 'Subtle breathing motion', 'Minimal movement'." },
        scene_atmosphere: { type: Type.STRING, description: "Lighting and mood details. e.g. 'Harsh overhead fluorescent, slight green tint'." },
        micro_story: { type: Type.STRING, description: "Short emotional context. e.g. 'Subject is feeling impatient, tapping fingers before taking a sip.'" },
        camera_motion: { type: Type.STRING, description: "Specific mathematical camera movement. e.g. 'Static handheld with subtle micro shake. SMOOTH DIGITAL ZOOM PUSH-IN: 3-5% over 4 seconds'." },
        product_placement: { type: Type.STRING, description: "How the product is shown and remains stable. e.g. 'Logo and Japanese text on chest clearly visible and sharp'." },
        engine_safety_rules: { type: Type.STRING, description: "Specific safety rules for this scene to prevent glitches. e.g. 'no zoom jump, no focus breathing glitch, no face distortion'." }
    },
    required: ["subject_movement", "scene_atmosphere", "micro_story", "camera_motion", "product_placement", "engine_safety_rules"]
};

const conceptProperties = {
  title: { type: Type.STRING, description: "Judul konsep (Bahasa Indonesia)." },
  strategy: { type: Type.STRING, description: "Strategi (Bahasa Indonesia)." },
  viralCaption: { type: Type.STRING, description: "Caption sosmed (Bahasa Indonesia)." },
  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
  scenes: {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        textOverlay: { type: Type.STRING },
        narration: { type: Type.STRING },
        voice_direction: { type: Type.STRING, description: "Instruksi cara membaca narasi (misal: nada, kecepatan, emosi)." },
        active_reference: { type: Type.STRING, description: "Pilih 'front' atau 'back' berdasarkan sisi mana yang sedang difokuskan di scene ini." },
        visual_logic: visualStructureSchema,
        video_logic: videoStructureSchema
      },
      required: ["title", "description", "textOverlay", "narration", "voice_direction", "visual_logic", "video_logic"],
    },
  },
};

const fullResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: { 
      concepts: { 
          type: Type.ARRAY, 
          items: { 
              type: Type.OBJECT, 
              properties: conceptProperties,
              required: ["title", "strategy", "viralCaption", "hashtags", "scenes"]
          } 
      } 
  },
  required: ["concepts"]
};

const singleConceptSchema: Schema = {
  type: Type.OBJECT,
  properties: conceptProperties,
  required: ["title", "strategy", "viralCaption", "hashtags", "scenes"],
};

const productScanSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING },
        category: { type: Type.STRING },
        usp: { type: Type.STRING },
        targetAudience: { type: Type.STRING },
        isWearable: { type: Type.BOOLEAN },
        visualSuggestions: {
            type: Type.OBJECT,
            properties: {
                setting: { type: Type.STRING },
                lighting: { type: Type.STRING },
                mood: { type: Type.STRING },
                cameraAngle: { type: Type.STRING }
            },
            required: ["setting", "lighting", "mood", "cameraAngle"]
        }
    },
    required: ["name", "category", "usp", "targetAudience", "isWearable", "visualSuggestions"]
};

// === 6. PROMPT ASSEMBLERS ===

const getVoicePersonaPrompt = (style: string): string => {
    switch(style) {
        case 'jaksel':
            return "Gaya Narasi: Anak Jaksel (Trendy & Campur Inggris). Gunakan kata-kata seperti 'literally', 'which is', 'jujurly', 'vibes'. Nada bicara santai tapi flexing.";
        case 'reviewer':
            return "Gaya Narasi: Reviewer Jujur (Sarkas & To-the-point). Kritis, tidak basa-basi, fokus pada detail material/jahitan/kualitas. Nada bicara tegas dan sedikit galak.";
        case 'asmr':
            return "Gaya Narasi: Soft Girl ASMR (Berbisik & Estetik). Sangat pelan, fokus pada suara gesekan material, gunakan kata-kata puitis/lembut dan menenangkan.";
        case 'hype':
            return "Gaya Narasi: Hypebeast / Streetwear Bro (Energetik). Cepat, agresif, gunakan kata 'Bro', 'Gils', 'Cop or Drop', 'Sumpah ini keren banget'.";
        case 'sales':
            return "Gaya Narasi: Sales SPG (Hard Selling & Ramah). Fokus jualan, gunakan kata 'Kakak', 'Promo', 'Checkout sekarang', 'Jangan sampai kehabisan'.";
        case 'storytime':
            return "Gaya Narasi: Storytime (Curhat TikTok). Dimulai dengan 'Get ready with me sambil cerita...' atau 'Sumpah kalian harus tau...'. Mengalir seperti sedang bercerita ke teman dekat.";
        case 'monolog':
        default:
            return "Gaya Narasi: Monolog (Satu Suara). Natural, informatif, dan engaging seperti kreator TikTok pada umumnya.";
    }
};

const assembleImagePrompt = (logic: any): string => {
    return `${HYPER_REALISM_BASE}
Subject: ${logic.subject_desc}
Action: ${logic.action_pose}
Product: ${logic.product_placement}
Lighting: ${logic.lighting_atmosphere}
Angle: ${logic.camera_angle}`;
};

const assembleVideoPrompt = (logic: any, videoArtifacts: string, isCinematic: boolean): string => {
    return `${HYPER_REALISM_VIDEO_BASE}

SUBJECT:
${logic.subject_desc}

ACTION:
${logic.subject_movement}

PRODUCT:
${logic.product_placement || 'Worn naturally'}

LIGHTING & SCENE:
${logic.scene_atmosphere}

CAMERA:
${logic.camera_motion}

ENGINE SAFETY RULES:
- One main action per shot
- Movement must be minimal and slow
- Keep lighting consistent; no flicker
- ${logic.engine_safety_rules || 'stable lighting across frames'}
- ${videoArtifacts}

NEGATIVE PROMPT:
${VIDEO_NEGATIVE_PROMPT}`;
};

const processConcept = (concept: any, options: GenerationOptions, videoArtifacts?: string, locationDesc?: string, chaosLevel: number = 3): UGCConcept => {
  const processedScenes = concept.scenes.map((scene: any) => {
    if (scene.visual_logic && scene.video_logic && !scene.video_logic.subject_desc) {
        // Only fallback to visual_logic if video_logic doesn't have a specific subject description
        scene.video_logic.subject_desc = scene.visual_logic.subject_desc;
    }
    const compiledImagePrompt = assembleImagePrompt(scene.visual_logic);
    
    // Dynamically resolve camera motion per scene if not provided by Gemini, or use Gemini's if valid
    let sceneCamera = scene.video_logic.camera_motion;
    let isCinematic = false;
    
    if (!sceneCamera || sceneCamera.trim() === "") {
        const resolved = resolveCameraMotion(locationDesc || scene.video_logic.scene_atmosphere, chaosLevel);
        sceneCamera = resolved.label;
        isCinematic = resolved.isCinematic;
    } else {
        // Simple check if Gemini's motion is cinematic
        isCinematic = sceneCamera.toLowerCase().includes('cinematic') || sceneCamera.toLowerCase().includes('smooth') || sceneCamera.toLowerCase().includes('tracking');
    }

    const artifacts = videoArtifacts || "Slight motion blur";
    const compiledVideoPrompt = assembleVideoPrompt(scene.video_logic, artifacts, isCinematic);

    const newScene = { 
        ...scene,
        imageEditPrompt: compiledImagePrompt,
        videoGenPrompt: compiledVideoPrompt
    }; 
    delete newScene.visual_logic;
    delete newScene.video_logic;
    return newScene;
  });
  return { ...concept, scenes: processedScenes };
};

const cleanJsonString = (text: string): string => {
    let clean = text.trim();
    if (clean.startsWith('```json')) {
        clean = clean.replace(/^```json/, '').replace(/```$/, '');
    } else if (clean.startsWith('```')) {
        clean = clean.replace(/^```json/, '').replace(/```$/, '');
    }
    return clean;
}

// === 7. AUDIO HELPERS ===
const addWavHeader = (pcmData: Uint8Array, sampleRate: number = 24000, numChannels: number = 1): Uint8Array => {
    const headerLength = 44;
    const dataLength = pcmData.length;
    const fileSize = dataLength + headerLength - 8;
    const buffer = new ArrayBuffer(headerLength + dataLength);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, fileSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    const headerBytes = new Uint8Array(buffer, 0, headerLength);
    const finalBuffer = new Uint8Array(headerLength + dataLength);
    finalBuffer.set(headerBytes);
    finalBuffer.set(pcmData, headerLength);
    return finalBuffer;
};

const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
};

const base64ToUint8Array = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

// === PUBLIC API METHODS ===

export const analyzeProductImageOnly = async (apiKey: string, base64Image: string, mimeType: string): Promise<ProductData> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Image } },
                    { text: "Analyze product. JSON Output in Bahasa Indonesia." }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: productScanSchema
            }
        });
        const data = JSON.parse(cleanJsonString(response.text || "{}"));
        return { ...data, promo: "" };
    } catch (e) {
        throw e;
    }
};

/**
 * GENERATE OUTFIT CONCEPTS (UPDATED WITH ENTROPY ENGINE)
 */
export const generateOutfitConcepts = async (
    apiKey: string,
    base64Image: string, 
    mimeType: string, 
    modelType: string, // User Selection
    sceneCount: number = 3,
    chaosLevel: number = 3, // New: Chaos Intensity (1-5)
    narrationStyle: string = 'monolog',
    backImage?: UploadedImage | null
): Promise<AnalysisResponse> => {
    try {
        clearRecentPicks();
        const ai = new GoogleGenAI({ apiKey });
        
        // 1. ANALYZE MODEL TYPE & GENERATE RANDOM ATTRIBUTES
        const lowerType = modelType.toLowerCase();
        const isProductFocus = lowerType.includes('review') || lowerType.includes('hands only') || lowerType.includes('faceless');

        let coreStyle = "";
        let overlayChaos = "";
        let consistencyGuide = "";
        let negativePrompt = RAW_NEGATIVE_PROMPT;
        
        // Video specific chaos (capped at level 3 for safety)
        const videoChaosLevel = Math.min(chaosLevel, 3);
        const videoArtifacts = pickWeightedRandom(POOL_VIDEO_ARTIFACTS, videoChaosLevel);
        let resolvedCamera = { label: "Slight handheld shake", isCinematic: false };

        if (isProductFocus) {
            // === MODE A: PRODUCT/HANDS (SEPARATE LOGIC) ===
            const coreHand = pickWeightedRandom(getHandPoolForModel(modelType || ""), chaosLevel);
            const coreActivity = pickWeightedRandom(POOL_HAND_ACTIVITY, chaosLevel);
            const coreLocation = pickWeightedRandom(POOL_HAND_LOCATION, chaosLevel);
            resolvedCamera = resolveCameraMotion(coreLocation.label, videoChaosLevel);
            
            // Overlay Logic based on Chaos Level
            const overlayLight = pickWeightedRandom(POOL_HAND_LIGHTING, chaosLevel);
            let overlayImperfections: string[] = [];

            // Chaos Slider Logic for Imperfections
            if (chaosLevel >= 3) overlayImperfections.push(pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel).label);
            if (chaosLevel >= 4) overlayImperfections.push(pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel).label);
            if (chaosLevel === 5) {
                overlayImperfections.push(pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel).label);
                coreStyle += " EXTREME TEXTURE. NO AI SMOOTHING.";
            }

            coreStyle = `FOCUS: PRODUCT DETAILS & HANDS ONLY. NO FACES. NO FULL BODY.`;
            overlayChaos = `
            >>> HANDS CORE STRUCTURE <<<
            - Hand Detail: ${coreHand.label}
            - Activity: ${coreActivity.label}
            - Location: ${coreLocation.label}
            
            >>> CHAOS OVERLAY (Intensity ${chaosLevel}) <<<
            - Lighting: ${overlayLight.label}
            - Imperfections: ${overlayImperfections.length > 0 ? overlayImperfections.join(" + ") : "None (Clean)"}
            
            >>> VIDEO MOTION (Intensity ${chaosLevel}) <<<
            - Artifacts: ${videoArtifacts.label}
            - Camera: Gemini MUST choose a suitable camera motion for EACH scene.
            `;
            
            consistencyGuide = `Hand details (${coreHand.label}) in ${coreLocation.label}`;
            negativePrompt += ` face, head, eyes, mouth, human body, full body, cinematic, studio lighting, perfect composition.`;

        } else {
            // === MODE B: HUMAN MODEL (SEPARATE LOGIC) ===
            const styleKey = mapModelToStyleKey(modelType);
            const variations = HUMAN_STYLE_POOLS[styleKey] || HUMAN_STYLE_POOLS['TIKTOK_GIRL'];
            
            // Core Selection
            const coreLook = pickWeightedRandom(variations, chaosLevel);
            const coreLocation = pickWeightedRandom(POOL_HUMAN_LOCATION, chaosLevel);
            const coreActivity = pickWeightedRandom(POOL_HUMAN_ACTIVITY, chaosLevel);
            const coreLighting = pickWeightedRandom(POOL_LIGHTING_STYLES, chaosLevel);
            resolvedCamera = resolveCameraMotion(coreLocation.desc, videoChaosLevel);

            // Overlay Logic
            let overlayImperfections: string[] = [];
            if (chaosLevel >= 2) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel).label);
            if (chaosLevel >= 4) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel).label);
            if (chaosLevel === 5) overlayImperfections.push(pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel).label);

            coreStyle = `TARGET MODEL BASE: "${modelType}"`;
            
            overlayChaos = `
            >>> HUMAN CORE STRUCTURE <<<
            1. LOOK: ${coreLook.label}
            2. LOCATION: ${coreLocation.name} (${coreLocation.desc})
            3. LIGHTING: ${coreLighting.label}
            4. ACTIVITY: ${coreActivity.label}
            5. VIBE: ${coreLocation.vibe}

            >>> CHAOS OVERLAY (Intensity ${chaosLevel}) <<<
            - Imperfections: ${overlayImperfections.length > 0 ? overlayImperfections.join(" + ") : "Clean (Level 1)"}
            
            >>> VIDEO MOTION (Intensity ${chaosLevel}) <<<
            - Artifacts: ${videoArtifacts.label}
            - Camera: Gemini MUST choose a suitable camera motion for EACH scene.
            `;

            consistencyGuide = coreLook.label;
        }

        const VIDEO_TRAINING_RULES = `
        >>> VIDEO GENERATION TRAINING RULES <<<
        - One main action per shot (do NOT stack many actions).
        - Movement must be minimal and slow (e.g., subtle breathing, slow blinking).
        - Keep camera movement simple: either (A) static + zoom OR (B) tracking only OR (C) tracking + tiny zoom.
        - Avoid pan/tilt while zooming.
        - Keep zoom low: Smooth zoom (3-5% over 4s), Snap zoom (max 8% in 0.3s), Breath zoom (1-2% in/out).
        - Narrow depth of field allowed, but no focus hunting.
        - CRITICAL RULE: DO NOT write camera motions that rotate around the subject (no 180 or 360-degree spins). The AI Video model only has ONE starting frame. If you want to show the back of the shirt, create a COMPLETELY SEPARATE SCENE where the starting frame is already showing the back.
        `;

        const voicePersona = getVoicePersonaPrompt(narrationStyle);

        const outfitRule = isProductFocus ? `
        CRITICAL PRODUCT RULE:
        The user's PRODUCT is the absolute priority. Focus entirely on the texture, details, and material of the product. The product should be held, touched, or placed in the scene. DO NOT put the product on a human body. DO NOT describe a person wearing the product.` : `
        CRITICAL OUTFIT RULE:
        The user's PRODUCT is the absolute priority. If the product is a piece of clothing (shirt, jacket, dress, pants), the model MUST wear it as their primary outfit. If the 'Core Look' from the engine suggests a conflicting outfit (e.g., Engine suggests 'Batik Shirt' but Product is 'Denim Jacket', or Engine suggests 'Mukena' but Product is 'T-Shirt'), you MUST adapt the Core Look. Do NOT cover the product. Instead, turn the conflicting Core Look item into an accessory (e.g., tied around the waist, draped over the shoulder, held in hand, or worn open/unbuttoned to reveal the product underneath).`;

        const parts: any[] = [
            { inlineData: { mimeType, data: base64Image } }
        ];

        let backImageContext = "";
        if (backImage) {
            parts.push({ inlineData: { mimeType: backImage.mimeType, data: backImage.base64 } });
            backImageContext = `
            - PENTING: Anda menerima 2 gambar referensi. Gambar pertama adalah tampak DEPAN, gambar kedua adalah tampak BELAKANG.
            - Buatlah scene yang memamerkan kedua sisi produk secara logis.
            - Gunakan kolom 'active_reference' untuk menentukan sisi mana yang sedang difokuskan di setiap scene ('front' atau 'back').
            `;
        }

        const promptText = `
        ROLE: Viral TikTok Visual Director (Specialist in 'Ugly-Chic' & Flash Photography).
        TASK: Create 3 Video Concepts based on the uploaded image(s).
        ${backImageContext}
        
        ${coreStyle}
        
        ${overlayChaos}
        
        CRITICAL VISUAL INSTRUCTIONS:
        - Incorporate the "HYPER_REALISM_BASE" details into the prompt.
        - Hair and makeup should match the requested vibe (can be messy or neat, but must look real).
        - Eyes must be sharp but natural.
        - Background must feel like a real, lived-in space.

        >>> AUDIO & NARRATION INSTRUCTIONS <<<
        ${voicePersona}
        - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
        - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

        ${outfitRule}

        ${VIDEO_TRAINING_RULES}

        ${negativePrompt}

        OUTPUT RULES:
        1. **Scene Count**: Exactly ${sceneCount} scenes per concept.
        2. **Language**: User content (Title, Desc) in **BAHASA INDONESIA**. Prompts in **ENGLISH**.
        3. **Visual Consistency**: The model's look (${consistencyGuide}) must stay consistent across all scenes.
        4. **Realism**: Prompt must mention 'iPhone 15 Pro Max', 'Noise', 'Unedited'.
        5. **Hashtags**: Provide EXACTLY 5 relevant hashtags per concept.
        
        Output JSON Only.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: {
                parts: [
                    ...parts,
                    { text: promptText }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: fullResponseSchema,
                systemInstruction: "You are an AI that creates HYPER-REALISTIC, imperfect, candid content. You hate 'AI-look'. You love 'Raw TikTok' look.",
            },
        });

        const data = JSON.parse(cleanJsonString(response.text || "{}")) as AnalysisResponse;
        
        if (!data.concepts) {
            if ((data as any).scenes) {
                data.concepts = [data as any];
            } else {
                data.concepts = [];
            }
        }

        const options: GenerationOptions = { textOverlayMode: 'none', narrationMode: 'none', narrationStyle: narrationStyle, sceneCount };
        
        // Pass locationDesc to processConcept for dynamic camera resolution if Gemini fails
        const locationDesc = isProductFocus ? "Product Focus" : "Human Focus"; 
        data.concepts = data.concepts.map(c => processConcept(c, options, videoArtifacts.label, locationDesc, videoChaosLevel));

        return data;

    } catch (error) {
        console.error("Error generating Outfit prompts:", error);
        throw error;
    }
};

/**
 * REGENERATE SINGLE CONCEPT (ADAPTED FOR REALISM & CHAOS)
 */
export const regenerateSingleConcept = async (
    apiKey: string, 
    base64Image: string, 
    mimeType: string, 
    options: GenerationOptions, 
    modelType?: string,
    chaosLevel: number = 3, // Add Chaos Level Parameter
    backImage?: UploadedImage | null
): Promise<UGCConcept> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    let specificPrompt = "";
    let negativePrompt = RAW_NEGATIVE_PROMPT;
    
    const videoChaosLevel = Math.min(chaosLevel, 3);
    const videoArtifacts = pickWeightedRandom(POOL_VIDEO_ARTIFACTS, videoChaosLevel);
    let resolvedCamera = { label: "Slight handheld shake", isCinematic: false };

    if (modelType) {
        const lowerType = modelType.toLowerCase();
        const isProductFocus = lowerType.includes('review') || lowerType.includes('hands');
        const voicePersona = getVoicePersonaPrompt(options.narrationStyle || 'monolog');

        if (isProductFocus) {
             const hand = pickWeightedRandom(getHandPoolForModel(modelType || ""), chaosLevel);
             const activity = pickWeightedRandom(POOL_HAND_ACTIVITY, chaosLevel);
             const location = pickWeightedRandom(POOL_HAND_LOCATION, chaosLevel);
             const light = pickWeightedRandom(POOL_HAND_LIGHTING, chaosLevel);
             const flaw = pickWeightedRandom(POOL_HAND_IMPERFECTION, chaosLevel);
             resolvedCamera = resolveCameraMotion(location.label, videoChaosLevel);
             
             specificPrompt = `
             MODE: Product Realism Regeneration.
             - Hand: ${hand.label}
             - Activity: ${activity.label}
             - Location: ${location.label}
             - Light: ${light.label}
             - Flaw: ${flaw.label}
             - Video Artifact: ${videoArtifacts.label}
             - Camera: Choose a suitable camera motion for each scene.
             No Faces.

             CRITICAL PRODUCT RULE:
             The user's PRODUCT is the absolute priority. Focus entirely on the texture, details, and material of the product. The product should be held, touched, or placed in the scene. DO NOT put the product on a human body. DO NOT describe a person wearing the product.

             >>> AUDIO & NARRATION INSTRUCTIONS <<<
             ${voicePersona}
             - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
             - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

             >>> VIDEO GENERATION TRAINING RULES <<<
             - One main action per shot.
             - Movement must be minimal and slow.
             - Keep camera movement simple (static+zoom, tracking only).
             - Keep zoom low (3-5% smooth, max 8% snap).
             - CRITICAL RULE: DO NOT write camera motions that rotate around the subject (no 180 or 360-degree spins). The AI Video model only has ONE starting frame. If you want to show the back of the shirt, create a COMPLETELY SEPARATE SCENE where the starting frame is already showing the back.
             `;
        } else {
             const styleKey = mapModelToStyleKey(modelType);
             const variations = HUMAN_STYLE_POOLS[styleKey] || HUMAN_STYLE_POOLS['TIKTOK_GIRL'];
             
             const selectedStyle = pickWeightedRandom(variations, chaosLevel);
             const selectedLocation = pickWeightedRandom(POOL_HUMAN_LOCATION, chaosLevel);
             const selectedActivity = pickWeightedRandom(POOL_HUMAN_ACTIVITY, chaosLevel);
             const selectedLighting = pickWeightedRandom(POOL_LIGHTING_STYLES, chaosLevel);
             const selectedImperfection = pickWeightedRandom(POOL_HUMAN_IMPERFECTION, chaosLevel);
             resolvedCamera = resolveCameraMotion(selectedLocation.desc, videoChaosLevel);

             specificPrompt = `
             MODE: Human Realism Regeneration.
             BASE MODEL: ${modelType}
             
             NEW RANDOM VARIATION:
             - Look: ${selectedStyle.label}
             - Location: ${selectedLocation.name}
             - Lighting: ${selectedLighting.label}
             - Activity: ${selectedActivity.label}
             - Imperfection: ${selectedImperfection.label}
             - Video Artifact: ${videoArtifacts.label}
             - Camera: Choose a suitable camera motion for each scene.
             
             Apply 'HYPER_REALISM_BASE' specs (Authentic skin, Unedited look).
             
             CRITICAL OUTFIT RULE:
             The user's PRODUCT is the absolute priority. If the product is a piece of clothing, the model MUST wear it as their primary outfit. If the 'New Random Variation' suggests a conflicting outfit, you MUST adapt it. Do NOT cover the product. Instead, turn the conflicting item into an accessory (e.g., tied around the waist, draped over the shoulder, held in hand, or worn open/unbuttoned).

             >>> AUDIO & NARRATION INSTRUCTIONS <<<
             ${voicePersona}
             - Tulis naskah narasi yang SANGAT SESUAI dengan gaya di atas.
             - Isi kolom 'voice_direction' dengan instruksi cara membaca (misal: "Nada tinggi, cepat", "Berbisik pelan").

             >>> VIDEO GENERATION TRAINING RULES <<<
             - One main action per shot.
             - Movement must be minimal and slow.
             - Keep camera movement simple (static+zoom, tracking only).
             - Keep zoom low (3-5% smooth, max 8% snap).
             - CRITICAL RULE: DO NOT write camera motions that rotate around the subject (no 180 or 360-degree spins). The AI Video model only has ONE starting frame. If you want to show the back of the shirt, create a COMPLETELY SEPARATE SCENE where the starting frame is already showing the back.
             `;
        }
    } else {
        specificPrompt = "Create a viral UGC concept.";
    }

    const parts: any[] = [
      { inlineData: { mimeType: mimeType, data: base64Image } }
    ];

    let backImageContext = "";
    if (backImage) {
        parts.push({ inlineData: { mimeType: backImage.mimeType, data: backImage.base64 } });
        backImageContext = `
        - PENTING: Anda menerima 2 gambar referensi. Gambar pertama adalah tampak DEPAN, gambar kedua adalah tampak BELAKANG.
        - Buatlah scene yang memamerkan kedua sisi produk secara logis.
        - Gunakan kolom 'active_reference' untuk menentukan sisi mana yang sedang difokuskan di setiap scene ('front' atau 'back').
        `;
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          ...parts,
          {
            text: `Create ONE unique UGC video concept. ${options.sceneCount} Scenes.
            ${backImageContext}
            ${specificPrompt}
            ${negativePrompt}
            Provide EXACTLY 5 relevant hashtags.
            Output strict JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: singleConceptSchema,
      },
    });

    const concept = JSON.parse(cleanJsonString(response.text || "{}")); 
    const locationDesc = modelType?.toLowerCase().includes('review') || modelType?.toLowerCase().includes('hands') ? "Product Focus" : "Human Focus";
    return processConcept(concept, options, videoArtifacts.label, locationDesc, videoChaosLevel);

  } catch (error) {
    throw error;
  }
};

export const generateEditedImage = async (
    apiKey: string,
    base64Image: string, 
    mimeType: string, 
    prompt: string,
    references?: { talent?: UploadedImage; background?: UploadedImage }
): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const parts: any[] = [{ inlineData: { mimeType, data: base64Image } }];
        
        let systemContext = `ROLE: Photo Retoucher. Composite Product into scene. 
        PROMPT: ${prompt} 
        STYLE: ${HYPER_REALISM_BASE}`;

        if (references?.background) {
            parts.push({ inlineData: { mimeType: references.background.mimeType, data: references.background.base64 } });
            systemContext += `\nRef Background provided.`;
        }
        if (references?.talent) {
             parts.push({ inlineData: { mimeType: references.talent.mimeType, data: references.talent.base64 } });
             systemContext += `\nRef Talent provided.`;
        }
        parts.push({ text: systemContext });

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image', 
            contents: { parts },
        });

        const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (part?.inlineData?.data) return part.inlineData.data;
        throw new Error("No image generated");
    } catch (error: any) {
        if (error?.status === 429 || error?.message?.includes('429')) {
            throw new Error("RATE_LIMIT");
        }
        throw error;
    }
};

export const generateSpeech = async (apiKey: string, text: string, config: any): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey });
        const isMulti = !!config.voiceName2;
        let speechConfig: any = { voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName1 } } };
        
        if (isMulti) {
             speechConfig = {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: 'Speaker A', voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName1 } } },
                        { speaker: 'Speaker B', voiceConfig: { prebuiltVoiceConfig: { voiceName: config.voiceName2 } } }
                    ]
                }
             };
        }

        let promptText = text;
        if (config.style === 'asmr') {
            promptText = `Say softly and whisperingly: ${text}`;
        } else if (config.style === 'hype') {
            promptText = `Say energetically, quickly, and enthusiastically: ${text}`;
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: promptText }] }],
            config: { responseModalities: ["AUDIO"] as any, speechConfig },
        });
        const base64PCM = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if(!base64PCM) throw new Error("No audio");
        
        const pcmBytes = base64ToUint8Array(base64PCM);
        const wavBytes = addWavHeader(pcmBytes, 24000, 1);
        const base64Wav = uint8ArrayToBase64(wavBytes);

        return `data:audio/wav;base64,${base64Wav}`; 
    } catch (e) { throw e; }
}