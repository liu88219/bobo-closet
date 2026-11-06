import React, { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Crop,
  Minus,
  Plus,
  Scissors,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CATEGORY_META,
  COLOR_TONE_META,
  ClothingCategory,
  ColorTone,
  GarmentSilhouette,
  OCCASION_META,
  OccasionTag,
  SEASON_META,
  SeasonTag,
  WardrobeItem,
  WarmthLevel,
} from '../types/wardrobe';
import {
  NormalizedCropRect,
  cropAndCompressDataUrl,
  readFileAsDataUrl,
} from '../utils/imageCompressor';
import { GarmentVectorIllustration } from './MascotIllustrations';
import { PhotoRegionCropperModal } from './PhotoRegionCropperModal';

interface AddItemModalProps {
  initialItem?: WardrobeItem | null;
  customSubCategories?: Partial<Record<ClothingCategory, string[]>>;
  onAddCustomSubCategory?: (cat: ClothingCategory, label: string) => void;
  onRemoveCustomSubCategory?: (cat: ClothingCategory, label: string) => void;
  onClose: () => void;
  onSave: (item: WardrobeItem) => void;
  onSaveAndContinueSamePhoto?: (item: WardrobeItem) => void;
  onDelete?: (itemId: string) => void;
}

const SUBCATEGORY_PRESETS: Record<
  ClothingCategory,
  Array<{ label: string; silhouette: GarmentSilhouette; defaultWarmth: WarmthLevel }>
> = {
  tops: [
    { label: '短袖上衣', silhouette: 'tee', defaultWarmth: 1 },
    { label: '長袖襯衫', silhouette: 'shirt', defaultWarmth: 2 },
    { label: '針織毛衣', silhouette: 'knit', defaultWarmth: 3 },
    { label: '削肩/背心', silhouette: 'tee', defaultWarmth: 1 },
    { label: '大學T/衛衣', silhouette: 'knit', defaultWarmth: 3 },
  ],
  bottoms: [
    { label: '直筒牛仔褲', silhouette: 'jeans', defaultWarmth: 2 },
    { label: '西裝寬褲', silhouette: 'slacks', defaultWarmth: 2 },
    { label: 'A字中長裙', silhouette: 'skirt', defaultWarmth: 2 },
    { label: '百褶短裙/短褲', silhouette: 'skirt', defaultWarmth: 1 },
  ],
  dresses: [
    { label: '連身洋裝', silhouette: 'dress', defaultWarmth: 2 },
    { label: '針織長洋裝', silhouette: 'dress', defaultWarmth: 3 },
    { label: '吊帶背心裙', silhouette: 'dress', defaultWarmth: 2 },
  ],
  outerwear: [
    { label: '針織開襟外套', silhouette: 'cardigan', defaultWarmth: 3 },
    { label: '休閒西裝外套', silhouette: 'blazer', defaultWarmth: 3 },
    { label: '長版風衣/大衣', silhouette: 'coat', defaultWarmth: 4 },
    { label: '保暖羽絨/鋪棉', silhouette: 'coat', defaultWarmth: 5 },
  ],
  shoes: [
    { label: '德訓鞋/球鞋', silhouette: 'sneakers', defaultWarmth: 2 },
    { label: '樂福/瑪莉珍鞋', silhouette: 'loafers', defaultWarmth: 2 },
    { label: '短靴/長靴', silhouette: 'boots', defaultWarmth: 3 },
  ],
  bags: [
    { label: '雲朵肩背包', silhouette: 'crossbody', defaultWarmth: 1 },
    { label: '帆布托特包', silhouette: 'tote', defaultWarmth: 1 },
    { label: '皮革小廢包', silhouette: 'crossbody', defaultWarmth: 1 },
  ],
  accessories: [
    { label: '貝雷帽/棒球帽', silhouette: 'hat', defaultWarmth: 2 },
    { label: '圍巾/披肩', silhouette: 'scarf', defaultWarmth: 4 },
  ],
};

const WARMTH_LABELS: Record<WarmthLevel, string> = {
  1: 'Lv.1 涼感薄款 (28°C+)',
  2: 'Lv.2 四季適中 (23–27°C)',
  3: 'Lv.3 微涼針織 (18–22°C)',
  4: 'Lv.4 秋冬厚實 (14–18°C)',
  5: 'Lv.5 寒流保暖 (<14°C)',
};

export const AddItemModal: React.FC<AddItemModalProps> = ({
  initialItem,
  customSubCategories = {},
  onAddCustomSubCategory,
  onRemoveCustomSubCategory,
  onClose,
  onSave,
  onSaveAndContinueSamePhoto,
  onDelete,
}) => {
  const [name, setName] = useState(initialItem?.name || '');
  const [category, setCategory] = useState<ClothingCategory>(initialItem?.category || 'tops');
  const [subCategory, setSubCategory] = useState(
    initialItem?.subCategory || SUBCATEGORY_PRESETS.tops[0].label
  );
  const [customSubInput, setCustomSubInput] = useState('');
  const [silhouette, setSilhouette] = useState<GarmentSilhouette>(
    initialItem?.silhouette || 'tee'
  );
  const [colorTone, setColorTone] = useState<ColorTone>(initialItem?.colorTone || 'cream');
  const [seasons, setSeasons] = useState<SeasonTag[]>(
    initialItem?.seasons || ['spring', 'autumn']
  );
  const [occasions, setOccasions] = useState<OccasionTag[]>(
    initialItem?.occasions || ['casual', 'cafe']
  );
  const [warmth, setWarmth] = useState<WarmthLevel>(initialItem?.warmth || 2);
  const [fitNote, setFitNote] = useState(initialItem?.fitNote || '');
  const [brand, setBrand] = useState(initialItem?.brand || '');
  const [imageUrl, setImageUrl] = useState<string | undefined>(initialItem?.imageUrl);
  const [rainFriendly, setRainFriendly] = useState<boolean>(
    initialItem?.rainFriendly ?? true
  );
  const [isFavorite, setIsFavorite] = useState<boolean>(initialItem?.isFavorite ?? false);
  const [wearCount, setWearCount] = useState<number>(initialItem?.wearCount ?? 0);
  const [lastWornDate, setLastWornDate] = useState<string>(
    initialItem?.lastWornDate || ''
  );
  const [isCompressing, setIsCompressing] = useState(false);
  const [autoColorHint, setAutoColorHint] = useState<string | null>(null);

  const [rawSourceDataUrl, setRawSourceDataUrl] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [multiSplitCount, setMultiSplitCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const builtInLabels = new Set(SUBCATEGORY_PRESETS[category].map((p) => p.label));
  const extraCustomLabels = (customSubCategories[category] || []).filter(
    (lbl) => !builtInLabels.has(lbl)
  );
  // Also show current subCategory if it came from editing a custom item not yet in list
  const activeCustomNotInList =
    subCategory && !builtInLabels.has(subCategory) && !extraCustomLabels.includes(subCategory)
      ? [subCategory]
      : [];
  const allCustomForCat = [...extraCustomLabels, ...activeCustomNotInList];

  const handleCategoryChange = (nextCat: ClothingCategory) => {
    setCategory(nextCat);
    const firstPreset = SUBCATEGORY_PRESETS[nextCat][0];
    if (firstPreset) {
      setSubCategory(firstPreset.label);
      setSilhouette(firstPreset.silhouette);
      setWarmth(firstPreset.defaultWarmth);
    }
  };

  const handleAddCustomSub = () => {
    const clean = customSubInput.trim();
    if (!clean) return;
    setSubCategory(clean);
    onAddCustomSubCategory?.(category, clean);
    setCustomSubInput('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    setAutoColorHint(null);
    try {
      const rawUrl = await readFileAsDataUrl(file);
      setRawSourceDataUrl(rawUrl);
      setIsCropperOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '照片讀取失敗，請換一張試試');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleConfirmCrop = async (
    cropRect: NormalizedCropRect,
    suggestedCat?: ClothingCategory
  ) => {
    if (!rawSourceDataUrl) return;
    setIsCropperOpen(false);
    setIsCompressing(true);
    try {
      if (suggestedCat && suggestedCat !== category) {
        handleCategoryChange(suggestedCat);
      }
      const { dataUrl, suggestedColorTone } = await cropAndCompressDataUrl(
        rawSourceDataUrl,
        cropRect
      );
      setImageUrl(dataUrl);
      setColorTone(suggestedColorTone);
      setAutoColorHint(
        `已擷取選取部位並辨識色系：${COLOR_TONE_META[suggestedColorTone].label}`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : '裁切處理失敗');
    } finally {
      setIsCompressing(false);
    }
  };

  const toggleSeason = (s: SeasonTag) => {
    setSeasons((prev) =>
      prev.includes(s) ? (prev.length > 1 ? prev.filter((x) => x !== s) : prev) : [...prev, s]
    );
  };

  const toggleOccasion = (occ: OccasionTag) => {
    setOccasions((prev) =>
      prev.includes(occ)
        ? prev.length > 1
          ? prev.filter((x) => x !== occ)
          : prev
        : [...prev, occ]
    );
  };

  const buildItemObject = (): WardrobeItem => {
    const pendingCustom = customSubInput.trim();
    const resolvedSub = pendingCustom || subCategory;
    if (pendingCustom) {
      onAddCustomSubCategory?.(category, pendingCustom);
      setCustomSubInput('');
    }
    const finalName =
      name.trim() || `${COLOR_TONE_META[colorTone].label}${resolvedSub}`;
    const now = Date.now();
    return {
      id:
        initialItem && multiSplitCount === 0
          ? initialItem.id
          : `item-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name: finalName,
      category,
      subCategory: resolvedSub,
      colorTone,
      colorHex: COLOR_TONE_META[colorTone].hex,
      seasons,
      occasions,
      warmth,
      silhouette,
      fitNote: fitNote.trim() || undefined,
      brand: brand.trim() || undefined,
      imageUrl,
      flatlayUrl: initialItem && multiSplitCount === 0 ? initialItem.flatlayUrl : undefined,
      realCropUrl:
        imageUrl?.startsWith('data:image/')
          ? imageUrl
          : initialItem && multiSplitCount === 0
          ? initialItem.realCropUrl
          : undefined,
      pastelUrl: initialItem && multiSplitCount === 0 ? initialItem.pastelUrl : undefined,
      isFavorite,
      inLaundry: initialItem?.inLaundry ?? false,
      rainFriendly,
      wearCount: Math.max(0, wearCount),
      lastWornDate: lastWornDate.trim() || undefined,
      isSample: false,
      createdAt:
        initialItem?.createdAt && initialItem.createdAt > 1000 && multiSplitCount === 0
          ? initialItem.createdAt
          : now,
      updatedAt: now,
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(buildItemObject());
  };

  const handleSaveAndSplitNext = () => {
    if (!onSaveAndContinueSamePhoto || !rawSourceDataUrl) return;
    const saved = buildItemObject();
    onSaveAndContinueSamePhoto(saved);

    const nextCat: ClothingCategory =
      category === 'tops' || category === 'outerwear'
        ? 'bottoms'
        : category === 'bottoms'
        ? 'bags'
        : 'shoes';
    handleCategoryChange(nextCat);
    setName('');
    setFitNote('');
    setWearCount(0);
    setLastWornDate('');
    setMultiSplitCount((c) => c + 1);
    setIsCropperOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D251E]/40 backdrop-blur-[2px] p-0 sm:p-4">
        <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#FAF8F3] border-t sm:border border-[#DDD7C9] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#2D251E]">
                {initialItem && multiSplitCount === 0
                  ? '✏️ 編輯衣櫥單品'
                  : multiSplitCount > 0
                  ? `✂️ 同張穿搭照連切第 ${multiSplitCount + 1} 件單品`
                  : '🧺 新增衣服到奶油衣櫥'}
              </h2>
              <p className="text-xs text-[#8A7E70]">
                支援含人物全身照「局部框選避臉裁切」、自訂款式版型與實穿次數管理
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-[#EFECE4] text-[#5C5044] hover:bg-[#E2DDD1]"
              aria-label="關閉"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Photo / Vector Preview Area */}
            <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#EFECE4]/70 border border-[#DDD7C9]">
              <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-[#FAF8F3] border border-[#DDD7C9] relative">
                {imageUrl ? (
                  <img src={imageUrl} alt="預覽" className="w-full h-full object-cover" />
                ) : (
                  <GarmentVectorIllustration
                    silhouette={silhouette}
                    colorTone={colorTone}
                    className="w-full h-full"
                  />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isCompressing}
                    className="bobo-btn-soft inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F3] text-xs font-bold text-[#2D251E]"
                  >
                    {isCompressing ? (
                      <span>處理中...</span>
                    ) : (
                      <>
                        <Camera className="w-3.5 h-3.5 text-[#C48E63]" />
                        <span>拍照 / 選全身穿搭照</span>
                      </>
                    )}
                  </button>

                  {(rawSourceDataUrl || (imageUrl && imageUrl.startsWith('data:image/'))) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!rawSourceDataUrl && imageUrl) {
                          setRawSourceDataUrl(imageUrl);
                        }
                        setIsCropperOpen(true);
                      }}
                      className="bobo-btn-soft inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#F2CA62]/35 text-xs font-bold text-[#2D251E]"
                    >
                      <Crop className="w-3.5 h-3.5 text-[#5C5044]" />
                      <span>重新框選範圍</span>
                    </button>
                  )}

                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl(undefined);
                        setRawSourceDataUrl(null);
                        setAutoColorHint(null);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FCF0EE] text-xs font-semibold text-[#9E473E]"
                    >
                      <Upload className="w-3 h-3 rotate-180" />
                      改用手繪插畫
                    </button>
                  )}
                </div>
                {autoColorHint ? (
                  <p className="text-[11px] text-[#5B7A55] font-medium flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {autoColorHint}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#8A7E70] leading-relaxed">
                    上傳含人物照會自動開啟「局部框選器」，一鍵避開臉部並框出想要的單品大小 ✨
                  </p>
                )}
              </div>
            </div>

            {/* Category Selector */}
            <div>
              <label className="block text-xs font-bold text-[#5C5044] mb-1.5">
                1. 服飾分類
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {(Object.keys(CATEGORY_META) as ClothingCategory[]).map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryChange(cat)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition ${
                        active
                          ? 'bg-[#2D251E] text-[#FAF8F3] border-[#2D251E]'
                          : 'bg-[#EFECE4] text-[#5C5044] border-[#DDD7C9] hover:bg-[#E5E0D5]'
                      }`}
                    >
                      <div>{CATEGORY_META[cat].emoji}</div>
                      <div className="mt-0.5">{CATEGORY_META[cat].shortLabel}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subcategory Presets + Custom Subcategory Creator! */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#5C5044]">
                2. 款式版型（點選現有標籤，或新增你的專屬版型）
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUBCATEGORY_PRESETS[category].map((preset) => {
                  const active = subCategory === preset.label;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setSubCategory(preset.label);
                        setSilhouette(preset.silhouette);
                        setWarmth(preset.defaultWarmth);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                        active
                          ? 'bg-[#F2CA62]/50 border-[#C48E63] text-[#2D251E]'
                          : 'bg-[#FAF8F3] border-[#DDD7C9] text-[#8A7E70]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}

                {allCustomForCat.map((customLabel) => {
                  const active = subCategory === customLabel;
                  return (
                    <div
                      key={customLabel}
                      className={`inline-flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full text-xs font-bold border transition ${
                        active
                          ? 'bg-[#F2CA62]/50 border-[#C48E63] text-[#2D251E]'
                          : 'bg-[#FAF8F3] border-[#DDD7C9] text-[#5C5044]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSubCategory(customLabel)}
                        className="text-left"
                      >
                        ✨ {customLabel}
                      </button>
                      {onRemoveCustomSubCategory && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveCustomSubCategory(category, customLabel);
                            if (subCategory === customLabel) {
                              setSubCategory(SUBCATEGORY_PRESETS[category][0].label);
                            }
                          }}
                          className="w-4 h-4 rounded-full hover:bg-[#2D251E]/10 flex items-center justify-center text-[#8A7E70]"
                          title="移除此自訂版型標籤"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Inline Add Custom Subcategory Row */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSubInput}
                  onChange={(e) => setCustomSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomSub();
                    }
                  }}
                  placeholder="自訂款式版型（例：一字領針織、繭型褲、工裝裙、腋下包...）"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-[#EFECE4]/60 border border-[#DDD7C9] text-xs text-[#2D251E] placeholder:text-[#9E9284] focus:outline-none focus:border-[#C48E63]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomSub}
                  disabled={!customSubInput.trim()}
                  className="bobo-btn-soft shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FAF8F3] disabled:opacity-45 text-xs font-bold text-[#2D251E]"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C48E63]" />
                  <span>新增款式</span>
                </button>
              </div>
            </div>

            {/* Item Name & Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#5C5044] mb-1">
                  單品名稱（留空會自動依色系＋款式命名）
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`例：${COLOR_TONE_META[colorTone].label}${
                    customSubInput.trim() || subCategory
                  }`}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#EFECE4]/60 border border-[#DDD7C9] text-sm text-[#2D251E] placeholder:text-[#9E9284] focus:outline-none focus:border-[#C48E63]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5C5044] mb-1">
                  品牌（選填）
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="例：UNIQLO / 韓貨"
                  className="w-full px-3 py-2 rounded-xl bg-[#EFECE4]/60 border border-[#DDD7C9] text-sm text-[#2D251E] placeholder:text-[#9E9284] focus:outline-none focus:border-[#C48E63]"
                />
              </div>
            </div>

            {/* Color Tone Swatches */}
            <div>
              <label className="block text-xs font-bold text-[#5C5044] mb-1.5">
                3. 色系（目前：{COLOR_TONE_META[colorTone].label}）
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(COLOR_TONE_META) as ColorTone[]).map((tone) => {
                  const meta = COLOR_TONE_META[tone];
                  const active = colorTone === tone;
                  return (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setColorTone(tone)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold border transition ${
                        active
                          ? 'bg-[#2D251E] text-[#FAF8F3] border-[#2D251E] shadow-xs'
                          : 'bg-[#FAF8F3] text-[#5C5044] border-[#DDD7C9]'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: meta.hex,
                          border: `1.5px solid ${meta.borderHex}`,
                        }}
                      />
                      <span>{meta.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Warmth & Seasons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#5C5044] mb-1.5">
                  4. 保暖厚度
                </label>
                <select
                  value={warmth}
                  onChange={(e) => setWarmth(Number(e.target.value) as WarmthLevel)}
                  className="w-full px-3 py-2 rounded-xl bg-[#EFECE4]/60 border border-[#DDD7C9] text-xs font-bold text-[#2D251E] focus:outline-none focus:border-[#C48E63]"
                >
                  {([1, 2, 3, 4, 5] as WarmthLevel[]).map((lv) => (
                    <option key={lv} value={lv}>
                      {WARMTH_LABELS[lv]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5C5044] mb-1.5">
                  適穿季節
                </label>
                <div className="flex gap-1.5">
                  {(Object.keys(SEASON_META) as SeasonTag[]).map((s) => {
                    const active = seasons.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSeason(s)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                          active
                            ? 'bg-[#C48E63] text-[#FAF8F3] border-[#B07A4F]'
                            : 'bg-[#EFECE4]/60 text-[#8A7E70] border-[#DDD7C9]'
                        }`}
                      >
                        {SEASON_META[s].label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Occasions */}
            <div>
              <label className="block text-xs font-bold text-[#5C5044] mb-1.5">
                5. 適合場合（可複選）
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(OCCASION_META) as OccasionTag[]).map((occ) => {
                  const active = occasions.includes(occ);
                  return (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => toggleOccasion(occ)}
                      className={`flex items-center justify-center gap-1 py-2 px-2 rounded-xl text-xs font-bold border transition ${
                        active
                          ? 'bg-[#F2CA62]/40 border-[#C48E63] text-[#2D251E]'
                          : 'bg-[#FAF8F3] border-[#DDD7C9] text-[#8A7E70]'
                      }`}
                    >
                      <span>{OCCASION_META[occ].icon}</span>
                      <span>{OCCASION_META[occ].label}</span>
                      {active && <Check className="w-3 h-3 text-[#C48E63]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Wear Count & Last Worn Date Editor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-[#EFECE4]/55 border border-[#DDD7C9]">
              <div>
                <label className="block text-xs font-bold text-[#5C5044] mb-1">
                  6. 累積實穿次數（少穿的衣服 AI 會優先幫你搭配！）
                </label>
                <div className="inline-flex items-center gap-2 bg-[#FAF8F3] border border-[#DDD7C9] rounded-xl px-2 py-1">
                  <button
                    type="button"
                    onClick={() => setWearCount((c) => Math.max(0, c - 1))}
                    className="w-7 h-7 rounded-lg bg-[#EFECE4] text-[#2D251E] flex items-center justify-center"
                    aria-label="減少實穿次數"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={wearCount}
                    onChange={(e) =>
                      setWearCount(Math.max(0, parseInt(e.target.value || '0', 10) || 0))
                    }
                    className="w-14 text-center text-xs font-bold text-[#2D251E] bg-transparent focus:outline-none"
                  />
                  <span className="text-xs text-[#8A7E70] pr-1">次</span>
                  <button
                    type="button"
                    onClick={() => setWearCount((c) => c + 1)}
                    className="w-7 h-7 rounded-lg bg-[#F2CA62]/55 text-[#2D251E] flex items-center justify-center"
                    aria-label="增加實穿次數"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5C5044] mb-1">
                  最近穿搭日期（選填）
                </label>
                <input
                  type="date"
                  value={lastWornDate}
                  onChange={(e) => setLastWornDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F3] border border-[#DDD7C9] text-xs font-semibold text-[#2D251E] focus:outline-none focus:border-[#C48E63]"
                />
              </div>
            </div>

            {/* Extra Toggles & Fit Note */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRainFriendly((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  rainFriendly
                    ? 'bg-[#EEF3EC] border-[#97B391] text-[#4E6B48]'
                    : 'bg-[#EFECE4]/60 border-[#DDD7C9] text-[#8A7E70]'
                }`}
              >
                ☔ {rainFriendly ? '雨天可穿（不易髒/防潑水）' : '雨天不宜（易濕/拖地/麂皮）'}
              </button>
              <button
                type="button"
                onClick={() => setIsFavorite((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  isFavorite
                    ? 'bg-[#FCF0EE] border-[#EBA39A] text-[#9E473E]'
                    : 'bg-[#EFECE4]/60 border-[#DDD7C9] text-[#8A7E70]'
                }`}
              >
                {isFavorite ? '❤️ 本命最愛單品' : '🤍 標記為最愛單品'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5C5044] mb-1">
                版型 / 穿搭比例備註（選填）
              </label>
              <input
                type="text"
                value={fitNote}
                onChange={(e) => setFitNote(e.target.value)}
                placeholder="例：短版顯腿長、高腰不拖地、領口偏低可內搭白T..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#EFECE4]/60 border border-[#DDD7C9] text-xs text-[#2D251E] placeholder:text-[#9E9284] focus:outline-none focus:border-[#C48E63]"
              />
            </div>

            {/* Submit Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {initialItem && onDelete && multiSplitCount === 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`確定要從衣櫥移除「${initialItem.name}」嗎？`)) {
                      onDelete(initialItem.id);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FCF0EE] text-[#9E473E] text-xs font-bold"
                >
                  <Trash2 className="w-4 h-4" />
                  刪除
                </button>
              ) : (
                <div />
              )}

              <div className="flex flex-wrap items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2.5 rounded-2xl bg-[#EFECE4] text-[#5C5044] text-xs font-bold"
                >
                  {multiSplitCount > 0 ? '完成結束' : '取消'}
                </button>

                {rawSourceDataUrl && onSaveAndContinueSamePhoto && !initialItem && (
                  <button
                    type="button"
                    onClick={handleSaveAndSplitNext}
                    className="bobo-btn-soft inline-flex items-center gap-1 px-3.5 py-2.5 rounded-2xl bg-[#FAF8F3] text-[#2D251E] text-xs font-bold"
                  >
                    <Scissors className="w-3.5 h-3.5 text-[#C48E63]" />
                    <span>存好，繼續切同張下一件</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="bobo-btn px-5 py-2.5 rounded-2xl bg-[#F2CA62] text-[#2D251E] text-xs font-bold"
                >
                  {initialItem && multiSplitCount === 0 ? '儲存變更 ✨' : '放進奶油衣櫥 🧺'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {isCropperOpen && rawSourceDataUrl && (
        <PhotoRegionCropperModal
          sourceDataUrl={rawSourceDataUrl}
          initialCategory={category}
          onCancel={() => setIsCropperOpen(false)}
          onConfirmCrop={handleConfirmCrop}
        />
      )}
    </>
  );
};
