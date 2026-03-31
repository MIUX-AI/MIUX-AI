export interface WeightedItem {
    label: string;
    weight: number; // 8 = Common, 4 = Uncommon, 1-2 = Rare/Chaotic
}

export interface WeightedLocation {
    name: string;
    desc: string;
    vibe: string;
    weight: number;
}

// Helper: Convert string array to weighted pool based on index to ensure distribution
export const toWeighted = (items: string[]): WeightedItem[] => {
    return items.map((label, index) => {
        // First 60% are common (8), next 30% uncommon (4), last 10% rare (2)
        const ratio = index / items.length;
        let weight = 8;
        if (ratio > 0.6) weight = 4;
        if (ratio > 0.9) weight = 2;
        return { label, weight };
    });
}

// Keep track of recently picked items to prevent repetition
const recentPicks = new Set<string>();

export const clearRecentPicks = () => {
    recentPicks.clear();
};

// Helper: Pick item based on weight and chaos level
export const pickWeightedRandom = <T extends { weight: number, label?: string, name?: string }>(
    pool: T[], 
    chaosLevel: number = 3,
    avoidRepeat: boolean = true
): T => {
    // Adjust weights based on chaos level smoothly
    const adjustedPool = pool.map(item => {
        let adjustedWeight = item.weight;
        
        if (chaosLevel >= 4) {
            // Boost rare items, slightly reduce common
            if (item.weight <= 4) adjustedWeight += (chaosLevel * 2);
            if (item.weight === 8) adjustedWeight = Math.max(2, adjustedWeight - chaosLevel);
        } else if (chaosLevel <= 2) {
            // Reduce rare items, boost common
            if (item.weight <= 4) adjustedWeight = Math.max(0.1, adjustedWeight - (3 - chaosLevel) * 2);
            if (item.weight === 8) adjustedWeight += (3 - chaosLevel) * 2;
        }

        // Penalty for recently picked items
        const identifier = item.label || item.name || '';
        if (avoidRepeat && recentPicks.has(identifier)) {
            adjustedWeight *= 0.1; // 90% penalty
        }

        return { item, weight: adjustedWeight };
    });

    const totalWeight = adjustedPool.reduce((sum, i) => sum + i.weight, 0);
    
    // Fallback if totalWeight is 0
    if (totalWeight <= 0) {
        const fallback = pool[Math.floor(Math.random() * pool.length)];
        const id = fallback.label || fallback.name || '';
        if (id) recentPicks.add(id);
        return fallback;
    }

    let random = Math.random() * totalWeight;
    
    for (const entry of adjustedPool) {
        if (random < entry.weight) {
            const id = entry.item.label || entry.item.name || '';
            if (id) {
                recentPicks.add(id);
                // Keep set size manageable
                if (recentPicks.size > 30) {
                    const first = recentPicks.values().next().value;
                    if (first) recentPicks.delete(first);
                }
            }
            return entry.item;
        }
        random -= entry.weight;
    }
    
    return adjustedPool[0].item;
};

// === 3. DATA POOLS (WEIGHTED INITIALIZATION) ===

const RAW_HAND_FEMININE = [
    "Delicate female hands with short natural nails", "Hands with chipped red nail polish",
    "Manicured nude gel nails, almond shape", "Pale hands wearing dainty gold rings",
    "Hands with a small faded tattoo on the wrist", "Soft hands with glossy lip tint smudge on thumb",
    "Elegant hands with French tips", "Hands wearing a thin silver bracelet",
    "Hands with a silk scrunchie on the wrist", "Matte black sharp stiletto nails",
    "Hands wearing a colorful friendship bracelet", "Hands with mismatched playful nail art",
    "Hands with fading henna design", "Hands with classic white nail tips"
];
export const POOL_HAND_FEMININE = toWeighted(RAW_HAND_FEMININE);

const RAW_HAND_MASCULINE = [
    "Veiny male hands with a silver thumb ring", "Rough worker hands with visible calluses",
    "Tan hands wearing a vintage gold watch", "Hands wearing Distressed Leather Biker Gloves",
    "Hands with prominent knuckles and a dark tattoo", "Masculine hands with short clipped nails",
    "Hands with a slight dirt smudge on the index finger", "Veiny hands gripping tightly",
    "Male hands with slight hair on knuckles", "Clean male hands with neatly trimmed nails",
    "Hands wearing a chunky resin ring", "Hands wearing a retro digital watch",
    "Hands with a chunky gold chain bracelet"
];
export const POOL_HAND_MASCULINE = toWeighted(RAW_HAND_MASCULINE);

const RAW_HAND_NEUTRAL = [
    "Hands wearing Black Nitrile (Medical) Gloves", "Hands wearing White Cotton Archival Gloves",
    "Bare hands with slight dry skin texture", "Pale hands with blue veins visible",
    "Hands with a band-aid on the index finger", "Hands with ink smudges on the fingertips",
    "Neutral hands with neatly trimmed nails", "Hands wearing a simple black smartwatch",
    "Hands with dry knuckles and natural texture", "Short bitten fingernails, raw look",
    "Hands scattered with natural freckles", "Oily skin texture on fingers (Natural)",
    "Hands holding a car key loosely", "Hands with a black hair tie on wrist",
    "Wrinkled elderly hands with character", "Hands with a small healing papercut",
    "Palms with visible life lines", "Hands with a wooden beaded bracelet",
    "Hands with uneven cuticle texture", "Hands with a plaster on the thumb",
    "Hands with slight sunburn redness", "Hands with glitter residue on fingers"
];
export const POOL_HAND_NEUTRAL = toWeighted(RAW_HAND_NEUTRAL);

export const getHandPoolForModel = (modelSelection: string) => {
    const s = modelSelection.toLowerCase();
    if (s.includes('boy') || s.includes('guy') || s.includes('pria') || s.includes('cowok') || s.includes('oppa')) {
        return POOL_HAND_MASCULINE;
    }
    if (s.includes('girl') || s.includes('wanita') || s.includes('cewek') || s.includes('hijab') || s.includes('muslimah')) {
        return POOL_HAND_FEMININE;
    }
    return POOL_HAND_NEUTRAL;
};

const RAW_HAND_ACTIVITY = [
    "Squeezing the product bottle firmly", "Tapping the bottle cap with fingernail",
    "Unboxing with one hand, struggling slightly", "Holding product up against the sky",
    "Gripping the package edge tightly", "Tilting product to catch the light texture",
    "Rubbing product texture on back of hand", "Pointing at the logo with index finger",
    "Covering the barcode with thumb", "Lifting product slightly from table",
    "Pushing product forward into camera", "Rotating product slowly to show side",
    "Scratching the label edge absentmindedly", "Smoothing out the plastic wrapper",
    "Crushing the empty box after opening", "Holding product submerged in water",
    "Dipping index finger into product", "Swatching product on inner wrist",
    "Peeling off the safety seal", "Shaking the bottle vigorously",
    "Clutching product tightly in fist", "Resting hand casually on top of product",
    "Flicking the packaging", "Tracing the text on box with finger",
    "Holding product up to a light source", "Comparing two products side by side",
    "Catching the light with the bottle curve", "Squeezing tube from the very bottom",
    "Twisting the cap off in motion", "Pulling the tab open",
    "Ripping the plastic wrap off", "Poking the product surface (jelly/cream)",
    "Wiping a smudge off the bottle", "Holding product sideways",
    "Balancing product on open palm", "Hiding product behind hand then revealing",
    "Knocking on the container to show solidity", "Spinning the jar on the table",
    "Sliding product across the surface", "Picking up product from the floor",
    "Holding product near a window", "Blocking the sun with the product",
    "Clamping product between two fingers", "Dangling product by the lid",
    "Pressing the pump dispenser", "Scooping product with finger",
    "Smearing texture on skin", "Patting product into skin",
    "Washing product off hand", "Gripping with fingertips only (claw grip)",
    "Holding product against denim fabric", "Resting product on knee",
    "Holding product over a balcony ledge", "Aligning product with horizon line",
    "Holding product in front of a mirror", "Tossing product slightly in air",
    "Catching product", "Rolling product between palms",
    "Scratching a lottery ticket style motion", "Drumming fingers on product",
    "Holding product upside down", "Reading ingredients with finger trace",
    "Pulling product out of a messy bag", "Holding product against concrete wall",
    "Holding product over a cup of coffee", "Dipping product into water glass",
    "Squeezing gel onto fingertip", "Rubbing texture between thumb and index",
    "Holding product against a neon sign", "Placing product on a receipt",
    "Holding product with sleeve pulled over hand", "Gently caressing the packaging",
    "Struggling to open the lid (realistic)", "Holding product in rain",
    "Holding product in snow/ice", "Burying product in sand",
    "Holding product against a pet's fur", "Creating a shadow puppet with product",
    "Holding product against a laptop screen", "Product resting on open palm (Top down)"
];
export const POOL_HAND_ACTIVITY = toWeighted(RAW_HAND_ACTIVITY);

const RAW_HAND_LOCATION = [
    "Messy bedroom duvet cover", "Passenger seat of a moving car",
    "Bathroom sink porcelain with water drops", "Kitchen granite counter, slightly cluttered",
    "Scratched wooden coffee table", "Concrete pavement outside",
    "Green grass in garden", "Supermarket shelf aisle",
    "School desk with graffiti", "Office keyboard in background",
    "Laptop trackpad area", "Denim jeans lap",
    "Tile floor in bathroom", "Gym rubber floor mat",
    "Yoga mat texture", "Beach sand",
    "Poolside wet tiles", "Car dashboard with dust",
    "Steering wheel background", "Bus seat fabric pattern",
    "Subway pole background", "Elevator mirror reflection",
    "Changing room bench", "Cafe marble table",
    "Picnic blanket check pattern", "Cardboard box texture",
    "Bubble wrap background", "Crumpled white bed sheets",
    "White fluffy rug", "Hardwood floor with scratches",
    "Brick wall ledge", "Dusty window sill",
    "Glass table with smudges", "Plastic patio chair",
    "Rusty metal railing", "Escalator handrail",
    "Library bookshelf background", "Grocery cart handle",
    "Convenience store fridge shelf", "Vending machine slot",
    "Restaurant napkin", "Fast food tray",
    "Cinema cup holder", "Airplane tray table",
    "Suitcase handle", "Backpack fabric texture",
    "Leather jacket lap", "Hoodie pocket area",
    "Sneaker box top", "Makeup bag interior",
    "Wet asphalt road", "Mossy rock surface",
    "Tree bark texture", "Chain link fence",
    "Laundromat washing machine top", "Public toilet sink (Clean)",
    "ATM machine keypad", "Gas station pump handle",
    "Vintage vinyl record player", "Gaming mousepad"
];
export const POOL_HAND_LOCATION = toWeighted(RAW_HAND_LOCATION);

const RAW_HAND_LIGHTING = [
    "Harsh direct flash (Paparazzi style)", "Dim bedroom lamp (Warm)",
    "Bathroom fluorescent (Greenish)", "Natural window side light",
    "Golden hour sunbeam", "Car interior dome light",
    "Streetlight orange glow", "Neon sign reflection (Red/Blue)",
    "Computer screen blue light", "TV flicker glow",
    "Candlelight flicker", "Refrigerator light (Cool white)",
    "Phone torch light", "Overcast daylight (Flat)",
    "Shadowy corner", "Bright midday sun (Hard shadows)",
    "Dappled tree shade", "Soft morning haze",
    "Flash reflection in mirror", "Red brake light glow",
    "Disco ball reflection", "Ring light reflection (Circular)",
    "Amateur Softbox studio", "Flashlight beam",
    "Under-shelf LED strip", "Aquarium glow",
    "Laptop screen glow", "Dashboard backlight",
    "Fireworks reflection", "Cinema screen reflection"
];
export const POOL_HAND_LIGHTING = toWeighted(RAW_HAND_LIGHTING);

const RAW_HAND_IMPERFECTION = [
    "Slight motion blur on thumb", "Out of focus background",
    "Fingerprint smudge on product", "Dust particles floating in air",
    "Hair stuck to product static", "Lint on sleeve fabric",
    "Dry skin visible on knuckles", "Hangnail visible",
    "Slightly overexposed flash hotspot", "Underexposed crushed shadows",
    "Grainy ISO noise", "Lens flare from flash",
    "Smudge on camera lens", "Crooked horizon line",
    "Cluttered background objects", "Messy cables in background",
    "Unmade bed in background", "Trash bin visible in corner",
    "Dirty fingernails (Slight)", "Chipped table paint",
    "Water droplets on lens", "Reflection of photographer in bottle",
    "Shadow of phone visible", "Uneven lighting",
    "Color cast (Yellow/Blue)", "Flash washout on label text",
    "Blurry product text", "Shaky hand capture",
    "Focus missed (on background)", "Cut off finger in frame",
    "Extra hand entering frame", "Pet fur on clothes",
    "Wrinkled sleeve fabric", "Loose thread on cuff",
    "Watch reflection glare", "Jewelry catching flash",
    "Skin texture pores visible", "Veins popping out",
    "Redness on skin", "Bandage edge peeling",
    "Coffee ring stain on table", "Crumbs on surface",
    "Scratches on product surface", "Dent in packaging",
    "Price tag residue", "Condensation droplets running down",
    "Grease spot on background", "Overwhelmed composition"
];
export const POOL_HAND_IMPERFECTION = toWeighted(RAW_HAND_IMPERFECTION);

// NEW: Lighting Styles Pool (To replace hardcoded flash in geminiService)
const RAW_LIGHTING_STYLES = [
    "Harsh direct flash (Paparazzi style, high contrast, red-eye)",
    "Soft diffused window light (Golden hour, warm, flattering)",
    "Moody neon glow (Cyberpunk vibe, red/blue/purple rim light)",
    "Fluorescent overhead (Convenience store/office, slightly green tint, unflattering)",
    "Dim ambient room light (Only illuminated by phone screen/TV glow)",
    "Overcast daylight (Flat, soft shadows, moody grey tones)",
    "Chiaroscuro (High contrast, deep shadows, single soft light source)",
    "Warm Tungsten (Cozy, dim, yellow-orange glow from a vintage lamp)",
    "Dappled sunlight (Shadows of leaves across face)",
    "Ring light reflection (Catchlights in eyes, beauty vlogger style)",
    "Streetlight glow (Orange sodium vapor light, cinematic night)",
    "Sunset backlight (Silhouette effect, lens flare)",
    "Harsh midday sun (Deep dark shadows under eyes and nose)",
    "Club laser lights (Chaotic, colorful streaks, motion blur)",
    "Fridge light glow (Cool white, illuminating face in dark room)",
    "Photobox booth light (Bright, even, slightly washed out)"
];
export const POOL_LIGHTING_STYLES = toWeighted(RAW_LIGHTING_STYLES);

export const HUMAN_STYLE_POOLS: Record<string, WeightedItem[]> = {
    'TIKTOK_GIRL': toWeighted([
        "Hair: Messy Wolf Cut with bleached tips. Vibe: Y2K Grunge, oversized headphones around neck, deadpan expression.",
        "Hair: Slicked back greasy bun. Vibe: 'Clean Girl' but real, acne patch on cheek, oversized grey hoodie.",
        "Hair: Long messy waves with flyaways. Vibe: Coquette, pink ribbon in hair, crying makeup aesthetic.",
        "Hair: Hime cut (block bangs). Vibe: E-girl, heavy eyeliner, septum piercing, nonchalant.",
        "Hair: Messy bed hair, no brushing. Vibe: Rotting in bed, comfortable, oversized t-shirt, glasses.",
        "Hair: Two space buns (messy). Vibe: Festival aftermath, glitter on cheeks, tired eyes.",
        "Hair: Clip-in bangs (visible clip). Vibe: DIY haircut, chaotic energy, chewing gum.",
        "Hair: Dyed red hair, faded roots. Vibe: Indie sleaze, smudged mascara, leather jacket.",
        "Hair: Ponytail with scrunchie. Vibe: Gym rat, sweaty glow, redness on face, sporty.",
        "Hair: Bleached eyebrows. Vibe: High fashion amateur, weird angle, fish-eye lens effect.",
        "Hair: Ribbon braids. Vibe: Balletcore, leg warmers, sitting on floor.",
        "Hair: Wet hair look. Vibe: Fresh out of shower, towel on head, skincare routine.",
        "Hair: Messy layers with butterfly clips. Vibe: 2000s revival, colorful beads, chaotic room.",
        "Hair: Half-up half-down. Vibe: Library study session, stress acne, piles of books.",
        "Hair: Short bob with beanie. Vibe: Skater girl, baggy jeans, bruised knee.",
        "Hair: Long straight hair tucked in jacket. Vibe: Cold weather, red nose, scarf.",
        "Hair: Curly hair frizz halo. Vibe: Humidity, natural texture, no product.",
        "Hair: Bandana over hair. Vibe: Bad hair day, sunglasses inside, cool attitude.",
        "Hair: pigtails. Vibe: Irony, oversized graphic tee, eating chips.",
        "Hair: Messy top knot. Vibe: Exam season, dark circles, energy drink in hand."
    ]),
    'OPPA_KOREA': toWeighted([
        "Hair: Long Wolf Cut (Mullet) covering neck. Vibe: Edgy Rocker, eyebrow slit, piercings.",
        "Hair: Two-block cut with messy bangs (Comma hair). Vibe: Soft Boyfriend, oversized hoodie, glasses.",
        "Hair: Slightly wet look, brushed back. Vibe: Late night, unbuttoned shirt, flash photography.",
        "Hair: Messy bed hair (Perm). Vibe: Morning coffee, grey sweatpants, cozy.",
        "Hair: Buzz cut. Vibe: Military service leave, rebellious, streetwear.",
        "Hair: Bowl cut (Texture). Vibe: Nerd chic, thick rim glasses, library setting.",
        "Hair: Bleached blonde tips. Vibe: Idol trainee, practice room mirror, sweat.",
        "Hair: Long hair tied back. Vibe: Artist, paint on hands, apron.",
        "Hair: Middle part (Curtain bangs). Vibe: Classic, trench coat, city street.",
        "Hair: Cap worn backwards. Vibe: Street dancer, baggy cargo pants, sneakers.",
        "Hair: Beanie covering ears. Vibe: Winter date, puffer jacket, holding hot pack.",
        "Hair: Spiky messy hair. Vibe: 90s retro protagonist, band aid on nose.",
        "Hair: Wet hair towel dry. Vibe: Bathroom selfie, foggy mirror.",
        "Hair: Slicked side part. Vibe: Wedding guest, loosening tie, tired.",
        "Hair: Shaggy layers. Vibe: Indie band member, guitar case, smoking area (implied).",
        "Hair: Pink dyed hair. Vibe: Punk pop, colorful sweater, playground at night.",
        "Hair: Man bun (Messy). Vibe: Cafe owner, apron, rolling up sleeves."
    ]),
    'HIJAB_MUSLIMAH': toWeighted([
        "Style: Syar'i Layering (Pastel). Vibe: Feminine, garden background, soft natural light.",
        "Style: Hijab Segi Empat (Clean). Vibe: Office look, blazer, holding coffee, candid motion blur.",
        "Style: Malaysian Style (Bawal). Vibe: Neat draping, baju kurung, formal event, direct flash.",
        "Style: White Mukena (Prayer). Vibe: Spiritual, soft morning light, texture detail.",
        "Style: Batik Dress & Hijab. Vibe: Formal occasion, holding clutch, candid interaction.",
        "Style: Instant Sport Hijab. Vibe: Post-workout, sweaty glow, red face, natural.",
        "Style: Pashmina Silk (Flowy). Vibe: Kondangan outfit, elegant, flash photography, texture focus.",
        "Style: Simple Bergo (Daily). Vibe: Casual home setting, holding groceries, natural sunlight."
    ]),
    'HIJAB_CREATOR': toWeighted([
        "Style: Loose Pashmina (Meleyot). Vibe: Gen Z aesthetic, oversized shirt, headphones, messy room.",
        "Style: Turban & Big Earrings. Vibe: Edgy fashion, sunglasses, night street flash.",
        "Style: Hoodie over Inner Ninja. Vibe: Streetwear, cool attitude, city night background.",
        "Style: Pashmina Crinkle (Messy). Vibe: Cafe hangout, earth tones, laughing covering mouth.",
        "Style: Printed Scarf (Satin). Vibe: Brunch date, bright outfit, sunlight reflection.",
        "Style: Denim on Denim Hijab. Vibe: Casual street, tote bag, walking motion.",
        "Style: Monochrom Outfit. Vibe: Minimalist, aesthetic wall background, shadow play.",
        "Style: Leather Jacket & Black Pashmina. Vibe: Grunge aesthetic, neon alleyway, moody lighting."
    ]),
    'REALISTIC_STREET': toWeighted([
        "Style: Batik Shirt (Loose). Vibe: Office worker lunch break, lanyard visible, holding iced tea.",
        "Style: Gojek/Grab Jacket (Open). Vibe: Resting on bike, smoking break, helmet on arm.",
        "Style: High School Uniform (Untucked). Vibe: After school hangout, backpack on one shoulder.",
        "Style: Kebaya Modern with Sneakers. Vibe: Wedding reception guest, tired feet.",
        "Style: Flannel Shirt tied around waist. Vibe: Concert queue, holding ticket.",
        "Style: Oversized Jersey. Vibe: Futsal aftermath, sweating, drinking water.",
        "Style: Batik Sarong & T-shirt. Vibe: Relaxing at porch, sandals, morning coffee.",
        "Style: Denim Jacket & Tote Bag. Vibe: Art gallery date, adjusting glasses.",
        "Style: Raincoat (Plastic). Vibe: Caught in rain, wet hair, holding umbrella.",
        "Style: Helm Proyek. Vibe: Site visit, dusty clothes, holding blueprint.",
        "Style: Masker Duckbill (Chin). Vibe: Commuter train, tired eyes, holding handstrap.",
        "Style: Safari Suit (PNS). Vibe: Monday morning, ID card, holding map."
    ])
};

const RAW_HUMAN_LOCATIONS = [
    { name: "CAR INTERIOR (FLASH)", desc: "Inside car night. Flash + dash lights. Sun visor mirror angle.", vibe: "Intimate Drive", weight: 8 },
    { name: "ELEVATOR MIRROR", desc: "Metal elevator. Harsh fluorescent + Flash starburst. Mirror Selfie.", vibe: "OOTD Check", weight: 8 },
    { name: "STREET CORNER (NIGHT)", desc: "Wet asphalt, neon reflections. Direct Hard Flash. Dark bg.", vibe: "Paparazzi", weight: 6 },
    { name: "MESSY BEDROOM", desc: "Unmade bed, clothes pile. Pitch black room + Phone Flash.", vibe: "Raw GRWM", weight: 8 },
    { name: "CAFE TABLE (POV)", desc: "Metal table. Dim light + Flash. Red plastic stool visible.", vibe: "Date POV", weight: 8 },
    { name: "PARKING LOT BASEMENT", desc: "Concrete walls, pipes. Green fluorescent + Flash.", vibe: "Grunge Industrial", weight: 4 },
    { name: "SUPERMARKET AISLE", desc: "Bright white lights, colorful shelves. Candid wide angle.", vibe: "Late Night Snack", weight: 6 },
    { name: "BATHROOM MIRROR", desc: "Dirty mirror, toothpaste spots. Flash reflection.", vibe: "Realist Selfie", weight: 8 },
    { name: "ESCALATOR (DOWN)", desc: "Looking down, metal steps. Mall lighting.", vibe: "Transit", weight: 4 },
    { name: "ROOFTOP LEDGE", desc: "City lights background (Bokeh). Wind blowing hair.", vibe: "Melancholy", weight: 2 },
    { name: "CONVENIENCE STORE", desc: "Fridge glow light. Holding drink.", vibe: "Chill", weight: 6 },
    { name: "BUS STOP (RAIN)", desc: "Wet glass, street lights blurry. Umbrella.", vibe: "Waiting", weight: 4 },
    { name: "OFFICE CUBICLE", desc: "Monitor glow, messy desk. Post-it notes.", vibe: "Overtime", weight: 4 },
    { name: "GYM MIRROR", desc: "Fluorescent, gym equipment bg. Sweaty.", vibe: "Workout", weight: 6 },
    { name: "STAIRWELL", desc: "Echoey concrete stairs. Emergency exit light.", vibe: "Liminal Space", weight: 2 },
    { name: "BALCONY RAIL", desc: "Sunset sky, drying clothes bg. candid.", vibe: "Home", weight: 4 },
    { name: "TRAIN CARRIAGE", desc: "Subway seats, hand straps. Motion blur window.", vibe: "Commute", weight: 4 },
    { name: "FITTING ROOM", desc: "Bad overhead lighting, curtain bg. Clothes pile.", vibe: "Try-on", weight: 6 },
    { name: "LIBRARY STACKS", desc: "Rows of books, dust motes. Quiet.", vibe: "Study", weight: 2 },
    { name: "LAUNDROMAT", desc: "Washing machine spinning blur. Tiled floor.", vibe: "Chore", weight: 2 },
    { name: "COUNTRY CLUB LOUNGE", desc: "Leather armchairs, dim warm light. Old money.", vibe: "Luxury", weight: 4 },
    { name: "VINTAGE CAR INTERIOR", desc: "Wood paneling, leather steering wheel. Cinematic.", vibe: "Wealth", weight: 2 },
    { name: "NEON ALLEYWAY", desc: "Puddles reflecting pink/cyan neon. Cyberpunk.", vibe: "Gritty", weight: 4 },
    { name: "SERVER ROOM", desc: "Blinking server lights, dark corridor. Tech.", vibe: "Cyber", weight: 2 }
];
export const POOL_HUMAN_LOCATION: WeightedLocation[] = RAW_HUMAN_LOCATIONS;

const RAW_HUMAN_ACTIVITY = [
    "Applying lip gloss while looking into a mirror/phone", "Laughing covering mouth with one hand (shy)",
    "Fixing a hair flyaway or tucking hair behind ear", "Holding a coffee cup/drink, looking away bored",
    "Checking phone with a cracked screen", "Shielding eyes from the harsh flash light with hand",
    "Adjusting the collar/clothing, looking down", "Waving goodbye or doing a peace sign blurrily",
    "Eating a slice of pizza messily", "Fixing glasses on nose bridge",
    "Tying shoelaces (crouched)", "Holding a burning cigarette (or lollipop)",
    "Taking a photo of food (POV)", "Yawning covering mouth",
    "Stretching arms overhead", "Leaning against wall looking tired",
    "Digging through tote bag", "Applying pimple patch",
    "Drinking from a straw (awkward)", "Holding hands with someone (out of frame)",
    "Pointing at menu/sign", "Rubbing sleepy eyes",
    "Sneezing (mid-action)", "Laughing throwing head back",
    "Holding a cat/dog awkwardly", "Adjusting face mask",
    "Putting on earrings", "Checking watch/time",
    "Biting fingernail (nervous)", "Flipping hair back",
    "Holding heavy shopping bags", "Texting with both thumbs",
    "Applying eye drops", "Eating cup noodles",
    "Holding umbrella in wind", "Zipping up jacket",
    "Brushing crumbs off shirt", "Putting hair in ponytail",
    "Cleaning glasses with shirt", "Applying hand sanitizer",
    "Adjusting a silk tie or collar", "Holding a crystal glass of sparkling water",
    "Reading a vintage newspaper", "Looking out a rainy window thoughtfully",
    "Pulling up a dark hood", "Looking at a glowing screen reflection on face",
    "Exhaling vapor/smoke in the cold", "Adjusting a silver watch"
];
export const POOL_HUMAN_ACTIVITY = toWeighted(RAW_HUMAN_ACTIVITY);

const RAW_HUMAN_IMPERFECTION = [
    "Red-eye effect from flash", "Motion blur on hand moving",
    "Hair stuck to lip gloss", "Mascara smudge under eye",
    "Acne patch visible on chin", "Oily T-zone reflection",
    "Double chin angle (slight)", "Flyaway hairs static",
    "Bra strap showing accidentally", "Lint on black clothes",
    "Wrinkled shirt", "Food stain on corner of mouth",
    "Chapped lips texture", "Foundation separating on nose",
    "Uneven eyeliner", "Band-aid on finger",
    "Bruise on knee/arm", "Tan line visible",
    "Sweat stains on collar", "Messy room background visible",
    "Unmade bed in background", "Trash bin in corner of frame",
    "Photographer's shadow visible", "Flash glare on glasses",
    "Awkward hand posture", "Eyes half closed (blinking)",
    "Mouth slightly open (breathing)", "Bad posture (slouching)",
    "Phone reflection in sunglasses", "Dirty mirror spots",
    "Cluttered desk background", "Person walking past in blur",
    "Overexposed forehead", "Underexposed background",
    "Grainy low light noise", "Color cast green (fluorescent)",
    "Lens smudge effect", "Crooked horizon angle",
    "Cut off top of head", "Focus missed (on ear instead of eye)"
];
export const POOL_HUMAN_IMPERFECTION = toWeighted(RAW_HUMAN_IMPERFECTION);

// === 5. VIDEO GENERATION POOLS ===

const RAW_CAMERA_AMATEUR = [
    "Static tripod shot, subject moves in frame", "Slow handheld pan following the subject",
    "Slight handheld shake, amateur cameraman", "Subtle breathing sway, handheld", 
    "Dutch angle (slightly tilted), stable hold", "POV shot, looking down at hands/product", 
    "Camera placed on a table, looking up", "Handheld but trying to keep still", 
    "Static shot, subject walks towards camera"
];
export const POOL_CAMERA_AMATEUR = toWeighted(RAW_CAMERA_AMATEUR);

const RAW_CAMERA_CINEMATIC = [
    "Smooth slow push-in zoom to subject's face", "Smooth tracking shot, walking alongside subject",
    "Slow optical zoom in, cinematic blur", "Static shot, focus pull from background to foreground",
    "Gentle panning shot revealing the scene", "Low angle shot, slight upward tilt",
    "Over-the-shoulder shot, slight sway", "Smooth slow zoom out revealing environment", 
    "High angle shot, looking down steadily", "Cinematic slow-motion pan",
    "Smooth arc shot circling the subject slowly"
];
export const POOL_CAMERA_CINEMATIC = toWeighted(RAW_CAMERA_CINEMATIC);

export const resolveCameraMotion = (locationDesc: string, chaosLevel: number): { label: string, isCinematic: boolean } => {
    const desc = locationDesc.toLowerCase();
    const isDark = desc.includes('night') || desc.includes('dark') || desc.includes('dim') || desc.includes('basement') || desc.includes('club') || desc.includes('neon') || desc.includes('black') || desc.includes('fluorescent');

    if (isDark) {
        // Force safe, minimal movement for dark scenes to prevent AI glitches
        return { label: pickWeightedRandom(POOL_CAMERA_AMATEUR, 1).label, isCinematic: false };
    } else {
        // Bright/Outdoor: Can use cinematic or amateur
        const useCinematic = Math.random() > 0.5;
        if (useCinematic) {
            return { label: pickWeightedRandom(POOL_CAMERA_CINEMATIC, chaosLevel).label, isCinematic: true };
        } else {
            return { label: pickWeightedRandom(POOL_CAMERA_AMATEUR, chaosLevel).label, isCinematic: false };
        }
    }
};

const RAW_VIDEO_ARTIFACTS = [
    "Clean 4k, no artifacts", "Slight motion blur on fast movements",
    "Heavy motion blur, low shutter speed look", "Auto-focus hunting (blurring in and out)",
    "Digital noise in dark areas (high ISO)", "Rolling shutter distortion (jello effect) on fast pan",
    "Lens flare from a passing light source", "Sudden exposure shift (auto-exposure adjusting)",
    "Compression artifacts (blocky pixels) in shadows", "Color banding in the sky/background",
    "Dust particles visible floating in the light", "Smudged lens effect (soft glow around lights)",
    "Dropped frames (slight stutter)", "Flickering fluorescent lights in the background",
    "Vignetting (dark corners)", "Chromatic aberration (color fringing) on edges",
    "Overexposed highlights blowing out", "Underexposed subject, silhouette effect",
    "White balance shifting mid-shot", "Flash firing randomly"
];
export const POOL_VIDEO_ARTIFACTS = toWeighted(RAW_VIDEO_ARTIFACTS);

// === 6. HELPER TO GET STYLE KEY ===
export const mapModelToStyleKey = (modelSelection: string): string => {
    const s = modelSelection.toLowerCase();
    
    if (s.includes('creator') || s.includes('pashmina') || s.includes('trendy')) return 'HIJAB_CREATOR';
    if (s.includes('muslimah') || s.includes('syari') || s.includes('hijab')) return 'HIJAB_MUSLIMAH';
    
    if (s.includes('korean') || s.includes('oppa')) return 'OPPA_KOREA';
    
    if (s.includes('lokal') || s.includes('chindo') || s.includes('street')) return 'REALISTIC_STREET';
    
    // Fallback for males
    if (s.includes('boy') || s.includes('guy') || s.includes('pria') || s.includes('cowok')) return 'REALISTIC_STREET';
    
    return 'TIKTOK_GIRL'; 
};
