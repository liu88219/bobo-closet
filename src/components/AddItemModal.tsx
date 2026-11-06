import React, { useRef, useState } from 'react';
import { Camera, Check, Sparkles, Trash2, Upload, X } from 'lucide-react';
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
import { compressClothingImage } from '../utils/imageCompressor';
import { GarmentVectorIllustration } from './MascotIllustrations';

interface AddItemModalProps {
  initialItem?: WardrobeItem | null;
  onClose: () => void;
  onSave: (item: WardrobeItem) => void;
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
  onClose,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState(initialItem?.name || '');
  const [category, setCategory] = useState<ClothingCategory>(initialItem?.category || 'tops');
  const [subCategory, setSubCategory] = useState(
    initialItem?.subCategory || SUBCATEGORY_PRESETS.tops[0].label
  );
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
  const [isCompressing, setIsCompressing] = useState(false);
  const [autoColorHint, setAutoColorHint] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleCategoryChange = (nextCat: ClothingCategory) => {
    setCategory(nextCat);
    const firstPreset = SUBCATEGORY_PRESETS[nextCat][0];
    if (firstPreset) {
      setSubCategory(firstPreset.label);
      setSilhouette(firstPreset.silhouette);
      setWarmth(firstPreset.defaultWarmth);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    setAutoColorHint(null);
    try {
      const { dataUrl, suggestedColorTone } = await compressClothingImage(file);
      setImageUrl(dataUrl);
      setColorTone(suggestedColorTone);
      setAutoColorHint(`已自動辨識相近色系：${COLOR_TONE_META[suggestedColorTone].label}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '照片處理失敗，請換一張試試');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName =
      name.trim() || `${COLOR_TONE_META[colorTone].label}${subCategory}`;
    const now = Date.now();
    const saved: WardrobeItem = {
      id: initialItem?.id || `item-${now}-${Math.random().toString(36).slice(2, 7)}`,
      name: finalName,
      category,
      subCategory,
      colorTone,
      colorHex: COLOR_TONE_META[colorTone].hex,
      seasons,
      occasions,
      warmth,
      silhouette,
      fitNote: fitNote.trim() || undefined,
      brand: brand.trim() || undefined,
      imageUrl,
      isFavorite,
      inLaundry: initialItem?.inLaundry ?? false,
      rainFriendly,
      wearCount: initialItem?.wearCount ?? 0,
      lastWornDate: initialItem?.lastWornDate,
      isSample: false,
      createdAt: initialItem?.createdAt && initialItem.createdAt > 1000 ? initialItem.createdAt : now,
      updatedAt: now,
    };
    onSave(saved);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#422B1D]/35 backdrop-blur-[2px] p-0 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#FFFDF9] border-t-2 sm:border-2 border-[#E7D6BE] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#422B1D]">
              {initialItem ? '✏️ 編輯衣櫥單品' : '🧺 新增衣服到奶油衣櫥'}
            </h2>
            <p className="text-xs text-[#8E6D56]">
              拍照上傳或直接選奶油手繪版型，AI 顧問就能立刻納入穿搭組合
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[#FAF5EC] text-[#73533E] hover:bg-[#F3E9D8]"
            aria-label="關閉"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo / Vector Preview Area */}
          <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-[#FAF5EC] border border-[#E7D6BE]">
            <div className="w-24 h-24 shrink-0 rounded-2xl overflow-hidden bg-[#FFFDF9] border border-[#E7D6BE] relative">
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
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="bobo-btn-soft inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFDF9] text-xs font-bold text-[#422B1D]"
                >
                  {isCompressing ? (
                    <span>壓縮處理中...</span>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5 text-[#BA7E4D]" />
                      <span>拍照 / 選相簿照片</span>
                    </>
                  )}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl(undefined);
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
                <p className="text-[11px] text-[#6C8A66] font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> {autoColorHint}
                </p>
              ) : (
                <p className="text-[11px] text-[#8E6D56] leading-relaxed">
                  自動智慧壓縮不佔空間，沒拍照片也會自動套用同色系奶油插畫 ✨
                </p>
              )}
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-[#583D2B] mb-1.5">1. 服飾分類</label>
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
                        ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                        : 'bg-[#FAF5EC] text-[#73533E] border-[#E7D6BE] hover:bg-[#F3E9D8]'
                    }`}
                  >
                    <div>{CATEGORY_META[cat].emoji}</div>
                    <div className="mt-0.5">{CATEGORY_META[cat].shortLabel}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Subcategory Presets */}
          <div>
            <label className="block text-xs font-bold text-[#583D2B] mb-1.5">
              2. 款式版型（點擊快速帶入）
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
                        ? 'bg-[#F3E9D8] border-[#BA7E4D] text-[#422B1D]'
                        : 'bg-[#FFFDF9] border-[#E7D6BE] text-[#8E6D56]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Item Name & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-[#583D2B] mb-1">
                單品名稱（留空會自動依色系命名）
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`例：${COLOR_TONE_META[colorTone].label}${subCategory}`}
                className="w-full px-3.5 py-2 rounded-xl bg-[#FAF5EC] border border-[#E7D6BE] text-sm text-[#422B1D] placeholder:text-[#B59B82] focus:outline-none focus:border-[#BA7E4D]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#583D2B] mb-1">品牌（選填）</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="例：UNIQLO / 韓貨"
                className="w-full px-3 py-2 rounded-xl bg-[#FAF5EC] border border-[#E7D6BE] text-sm text-[#422B1D] placeholder:text-[#B59B82] focus:outline-none focus:border-[#BA7E4D]"
              />
            </div>
          </div>

          {/* Color Tone Swatches */}
          <div>
            <label className="block text-xs font-bold text-[#583D2B] mb-1.5">
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
                        ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D] shadow-sm'
                        : 'bg-[#FFFDF9] text-[#583D2B] border-[#E7D6BE]'
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
              <label className="block text-xs font-bold text-[#583D2B] mb-1.5">4. 保暖厚度</label>
              <select
                value={warmth}
                onChange={(e) => setWarmth(Number(e.target.value) as WarmthLevel)}
                className="w-full px-3 py-2 rounded-xl bg-[#FAF5EC] border border-[#E7D6BE] text-xs font-bold text-[#422B1D] focus:outline-none focus:border-[#BA7E4D]"
              >
                {([1, 2, 3, 4, 5] as WarmthLevel[]).map((lv) => (
                  <option key={lv} value={lv}>
                    {WARMTH_LABELS[lv]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#583D2B] mb-1.5">適穿季節</label>
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
                          ? 'bg-[#BA7E4D] text-[#FFFDF9] border-[#966036]'
                          : 'bg-[#FAF5EC] text-[#8E6D56] border-[#E7D6BE]'
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
            <label className="block text-xs font-bold text-[#583D2B] mb-1.5">
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
                        ? 'bg-[#F3E9D8] border-[#BA7E4D] text-[#422B1D]'
                        : 'bg-[#FFFDF9] border-[#E7D6BE] text-[#8E6D56]'
                    }`}
                  >
                    <span>{OCCASION_META[occ].icon}</span>
                    <span>{OCCASION_META[occ].label}</span>
                    {active && <Check className="w-3 h-3 text-[#BA7E4D]" />}
                  </button>
                );
              })}
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
                  : 'bg-[#FAF5EC] border-[#E7D6BE] text-[#8E6D56]'
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
                  : 'bg-[#FAF5EC] border-[#E7D6BE] text-[#8E6D56]'
              }`}
            >
              {isFavorite ? '❤️ 本命最愛單品' : '🤍 標記為最愛單品'}
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#583D2B] mb-1">
              版型 / 穿搭小備註（選填）
            </label>
            <input
              type="text"
              value={fitNote}
              onChange={(e) => setFitNote(e.target.value)}
              placeholder="例：高腰顯腿長、需要紮衣服、適合搭白襪..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#FAF5EC] border border-[#E7D6BE] text-xs text-[#422B1D] placeholder:text-[#B59B82] focus:outline-none focus:border-[#BA7E4D]"
            />
          </div>

          {/* Submit Footer */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {initialItem && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`確定要從衣櫥移除「${initialItem.name}」嗎？`)) {
                    onDelete(initialItem.id);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-[#FCF0EE] text-[#9E473E] text-xs font-bold"
              >
                <Trash2 className="w-4 h-4" />
                刪除單品
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-[#FAF5EC] text-[#73533E] text-xs font-bold"
              >
                取消
              </button>
              <button
                type="submit"
                className="bobo-btn px-5 py-2.5 rounded-2xl bg-[#BA7E4D] text-[#FFFDF9] text-xs font-bold"
              >
                {initialItem ? '儲存變更 ✨' : '放進奶油衣櫥 🧺'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
