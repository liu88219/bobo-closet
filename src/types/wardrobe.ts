export type ClothingCategory =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'shoes'
  | 'bags'
  | 'accessories';

export type ColorTone =
  | 'cream'
  | 'oat'
  | 'camel'
  | 'cocoa'
  | 'charcoal'
  | 'denim'
  | 'sage'
  | 'blush'
  | 'sky'
  | 'butter'
  | 'lavender';

export type SeasonTag = 'spring' | 'summer' | 'autumn' | 'winter';

export type OccasionTag =
  | 'work'
  | 'cafe'
  | 'casual'
  | 'travel'
  | 'dinner'
  | 'sport';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type WeatherCondition = 'sunny' | 'cloudy' | 'rainy' | 'ac_cold';

export type WarmthLevel = 1 | 2 | 3 | 4 | 5;

export type CardVisualStyle = 'flatlay' | 'real' | 'pastel';

export type GarmentSilhouette =
  | 'tee'
  | 'shirt'
  | 'knit'
  | 'cardigan'
  | 'coat'
  | 'blazer'
  | 'jeans'
  | 'slacks'
  | 'skirt'
  | 'dress'
  | 'sneakers'
  | 'loafers'
  | 'boots'
  | 'tote'
  | 'crossbody'
  | 'hat'
  | 'scarf';

export interface WardrobeItem {
  id: string;
  name: string;
  category: ClothingCategory;
  subCategory: string;
  colorTone: ColorTone;
  colorHex: string;
  seasons: SeasonTag[];
  occasions: OccasionTag[];
  /**
   * 1: 盛夏涼感短袖/背心 (28°C+)
   * 2: 春夏薄長袖/襯衫 (23~27°C)
   * 3: 微涼針織/衛衣/薄西裝 (18~22°C)
   * 4: 秋冬毛衣/風衣 (14~18°C)
   * 5: 寒流大衣/羽絨 (<14°C)
   */
  warmth: WarmthLevel;
  silhouette: GarmentSilhouette;
  fitNote?: string;
  brand?: string;
  /** Primary image URL (repo path e.g. './wardrobe/knit.webp' or compressed Base64 Data URL) */
  imageUrl?: string;
  /** Hybrid Mode B: Clean #FAF8F3 matte cream flat-lay extraction */
  flatlayUrl?: string;
  /** Hybrid Mode A: Privacy-safe neck-down real worn crop */
  realCropUrl?: string;
  /** Hybrid Mode C: Dinotaeng dry oil-pastel crayon card */
  pastelUrl?: string;
  isFavorite?: boolean;
  inLaundry?: boolean;
  rainFriendly?: boolean;
  wearCount: number;
  lastWornDate?: string;
  /** Starter sample items so user sees how the cream lookbook works right away */
  isSample?: boolean;
  /** Items committed directly via AI chat assistant into repo */
  isRepoManaged?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SavedOutfit {
  id: string;
  title: string;
  itemIds: string[];
  occasion: OccasionTag;
  timeOfDay: TimeOfDay;
  temperature: number;
  weather: WeatherCondition;
  locationNote: string;
  companions?: string;
  stylistComment: string;
  colorFormula: string;
  wornDate?: string;
  selfieUrl?: string;
  isAiCurated?: boolean;
  isFavorite?: boolean;
  isSample?: boolean;
  isRepoManaged?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ClosetVaultState {
  items: WardrobeItem[];
  outfits: SavedOutfit[];
  deletedItemIds: Record<string, number>;
  deletedOutfitIds: Record<string, number>;
  customSubCategories?: Partial<Record<ClothingCategory, string[]>>;
  hideSamples: boolean;
  updatedAt: number;
}

export type MoodPalette =
  | 'any'
  | 'cream_tonal'
  | 'clean_denim'
  | 'latte_earth'
  | 'pastel_point';

export interface StylingContextInput {
  timeOfDay: TimeOfDay;
  temperature: number;
  weather: WeatherCondition;
  occasion: OccasionTag;
  locationNote: string;
  companions: string;
  moodPalette: MoodPalette;
  lockedItemIds: string[];
}

export interface GeneratedOutfitProposal {
  id: string;
  title: string;
  items: WardrobeItem[];
  score: number;
  colorFormula: string;
  stylistComment: string;
  weatherTip: string;
  companionWarning?: string;
}

export const CATEGORY_META: Record<
  ClothingCategory,
  { label: string; shortLabel: string; emoji: string }
> = {
  tops: { label: '上衣 Tops', shortLabel: '上衣', emoji: '👚' },
  bottoms: { label: '下身 Bottoms', shortLabel: '下身', emoji: '👖' },
  dresses: { label: '連身 / 洋裝', shortLabel: '洋裝', emoji: '👗' },
  outerwear: { label: '外套 / 罩衫', shortLabel: '外套', emoji: '🧥' },
  shoes: { label: '鞋履 Shoes', shortLabel: '鞋履', emoji: '👞' },
  bags: { label: '包款 Bags', shortLabel: '包款', emoji: '👜' },
  accessories: { label: '配件 / 帽飾', shortLabel: '配件', emoji: '🧢' },
};

export const COLOR_TONE_META: Record<
  ColorTone,
  { label: string; hex: string; borderHex: string; isNeutral: boolean }
> = {
  cream: { label: '奶油白', hex: '#FFFDF7', borderHex: '#DFCDAE', isNeutral: true },
  oat: { label: '燕麥杏', hex: '#EFE3D0', borderHex: '#D5C0A3', isNeutral: true },
  camel: { label: '焦糖駝', hex: '#CFA072', borderHex: '#B38254', isNeutral: true },
  cocoa: { label: '烤可可', hex: '#6E4D38', borderHex: '#543928', isNeutral: true },
  charcoal: { label: '霧感黑灰', hex: '#3E3A37', borderHex: '#2B2826', isNeutral: true },
  denim: { label: '丹寧藍', hex: '#7C9AB8', borderHex: '#607F9E', isNeutral: true },
  sage: { label: '鼠尾草綠', hex: '#A7BFA0', borderHex: '#88A380', isNeutral: false },
  blush: { label: '柔霧粉', hex: '#EBB6B0', borderHex: '#D49891', isNeutral: false },
  sky: { label: '寶寶藍', hex: '#B9D4E8', borderHex: '#96B6CF', isNeutral: false },
  butter: { label: '奶油鵝黃', hex: '#F5DF9D', borderHex: '#DEC273', isNeutral: false },
  lavender: { label: '薰衣草紫', hex: '#CFC3DF', borderHex: '#B2A3C7', isNeutral: false },
};

export const OCCASION_META: Record<
  OccasionTag,
  { label: string; icon: string; desc: string }
> = {
  work: { label: '通勤上班', icon: '💼', desc: '俐落得體、冷氣房友善' },
  cafe: { label: '咖啡廳探店', icon: '☕', desc: '溫柔鬆弛感、拍照上鏡' },
  casual: { label: '週末逛街', icon: '🛍️', desc: '舒適好走、輕盈百搭' },
  travel: { label: '旅行出遊', icon: '🧳', desc: '洋蔥式疊穿、耐走耐拍' },
  dinner: { label: '約會聚餐', icon: '🕯️', desc: '精緻小亮點、氣質加分' },
  sport: { label: '散步運動', icon: '🌿', desc: '透氣彈性、清爽活力' },
};

export const SEASON_META: Record<SeasonTag, { label: string }> = {
  spring: { label: '春' },
  summer: { label: '夏' },
  autumn: { label: '秋' },
  winter: { label: '冬' },
};

export const TIME_META: Record<
  TimeOfDay,
  { label: string; badge: string; tempHint: string }
> = {
  morning: { label: '早晨出門', badge: '☀️ 08:00–11:00', tempHint: '早晚微涼建議可脫式外搭' },
  afternoon: { label: '午後時光', badge: '☕ 12:00–16:30', tempHint: '光線柔和適合淺奶油色系上鏡' },
  evening: { label: '傍晚微風', badge: '🌇 17:00–19:30', tempHint: '入夜轉涼留意溫差疊穿' },
  night: { label: '夜晚聚會', badge: '🌙 19:30+', tempHint: '室內燈光暖黃，適合對比或質感配件' },
};

export const WEATHER_META: Record<
  WeatherCondition,
  { label: string; icon: string }
> = {
  sunny: { label: '晴朗好天氣', icon: '☀️' },
  cloudy: { label: '微風多雲', icon: '⛅' },
  rainy: { label: '下雨天', icon: '🌧️' },
  ac_cold: { label: '室內強冷氣', icon: '❄️' },
};
