import React, { useMemo, useState } from 'react';
import {
  BookmarkPlus,
  Check,
  Copy,
  Lock,
  MapPin,
  Sparkles,
  Thermometer,
  Users,
  Wand2,
} from 'lucide-react';
import {
  CATEGORY_META,
  GeneratedOutfitProposal,
  MoodPalette,
  OCCASION_META,
  OccasionTag,
  SavedOutfit,
  StylingContextInput,
  TIME_META,
  TimeOfDay,
  WEATHER_META,
  WardrobeItem,
  WeatherCondition,
} from '../types/wardrobe';
import {
  buildAiPromptFromContext,
  generateOutfitProposals,
} from '../utils/outfitEngine';
import {
  StylistStudioIllustration,
  WardrobeItemVisual,
} from './MascotIllustrations';

interface OutfitStylistProps {
  items: WardrobeItem[];
  savedOutfits: SavedOutfit[];
  initialLockedItemId?: string | null;
  onClearInitialLock?: () => void;
  onSaveOutfitToLookbook: (
    proposal: GeneratedOutfitProposal,
    ctx: StylingContextInput,
    markWornToday: boolean
  ) => void;
}

const LOCATION_PRESETS = [
  '中山赤峰街咖啡廳',
  '辦公室會議冷氣房',
  '信義區百貨逛街',
  '美術館看展散步',
  '週末小旅行拍照',
];

const MOOD_OPTIONS: Array<{ id: MoodPalette; label: string; dot: string }> = [
  { id: 'any', label: '✨ 智能百搭最優解', dot: '#FAF5EC' },
  { id: 'cream_tonal', label: '🥛 純欲奶油同色系', dot: '#EFE3D0' },
  { id: 'clean_denim', label: '👖 鹽奶油 × 清爽丹寧', dot: '#7C9AB8' },
  { id: 'latte_earth', label: '🧸 焦糖拿鐵大地風', dot: '#CFA072' },
  { id: 'pastel_point', label: '🌷 奶油底 × 柔和亮點色', dot: '#EBB6B0' },
];

export const OutfitStylist: React.FC<OutfitStylistProps> = ({
  items,
  savedOutfits,
  initialLockedItemId,
  onClearInitialLock,
  onSaveOutfitToLookbook,
}) => {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('afternoon');
  const [temperature, setTemperature] = useState<number>(22);
  const [weather, setWeather] = useState<WeatherCondition>('sunny');
  const [occasion, setOccasion] = useState<OccasionTag>('cafe');
  const [locationNote, setLocationNote] = useState<string>('中山赤峰街咖啡廳');
  const [companions, setCompanions] = useState<string>('');
  const [moodPalette, setMoodPalette] = useState<MoodPalette>('any');
  const [lockedIds, setLockedIds] = useState<string[]>(
    initialLockedItemId ? [initialLockedItemId] : []
  );
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [savedProposalIds, setSavedProposalIds] = useState<Record<string, 'saved' | 'worn'>>({});

  React.useEffect(() => {
    if (initialLockedItemId) {
      setLockedIds([initialLockedItemId]);
      onClearInitialLock?.();
    }
  }, [initialLockedItemId, onClearInitialLock]);

  const cleanItems = useMemo(() => items.filter((i) => !i.inLaundry), [items]);

  const stylingContext: StylingContextInput = useMemo(
    () => ({
      timeOfDay,
      temperature,
      weather,
      occasion,
      locationNote,
      companions,
      moodPalette,
      lockedItemIds: lockedIds,
    }),
    [
      timeOfDay,
      temperature,
      weather,
      occasion,
      locationNote,
      companions,
      moodPalette,
      lockedIds,
    ]
  );

  const proposals = useMemo(
    () => generateOutfitProposals(items, stylingContext, savedOutfits),
    [items, stylingContext, savedOutfits]
  );

  const toggleLockItem = (id: string) => {
    setLockedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCopyPromptForAi = async () => {
    const text = buildAiPromptFromContext(items, stylingContext);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2500);
    } catch {
      alert(text);
    }
  };

  return (
    <div className="space-y-5">
      {/* Stylist Hero Card */}
      <div className="cream-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#F3E9D8] pb-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E7D6BE] text-[11px] font-bold text-[#8E6D56]">
              <Wand2 className="w-3 h-3 text-[#BA7E4D]" />
              Quokka & Bobo 情境穿搭造型室
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-[#422B1D]">
              今天要去哪裡呢？幫你從衣櫥搭好整套 ✨
            </h2>
            <p className="text-xs text-[#73533E]">
              自動排除待洗單品、考量溫差與雨天材質，還能避開跟同一位朋友穿重複組合！
            </p>
          </div>
          <StylistStudioIllustration className="w-44 h-24 self-center sm:self-auto shrink-0" />
        </div>

        {/* 1. Time & Occasion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#583D2B] mb-1.5">
              1. 出門時段
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(TIME_META) as TimeOfDay[]).map((t) => {
                const active = timeOfDay === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTimeOfDay(t)}
                    className={`p-2 rounded-2xl text-left border transition ${
                      active
                        ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                        : 'bg-[#FAF5EC] text-[#583D2B] border-[#E7D6BE] hover:bg-[#F3E9D8]'
                    }`}
                  >
                    <div className="text-xs font-bold">{TIME_META[t].label}</div>
                    <div
                      className={`text-[10px] ${
                        active ? 'text-[#E7D6BE]' : 'text-[#8E6D56]'
                      }`}
                    >
                      {TIME_META[t].badge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#583D2B] mb-1.5">
              2. 場合性質
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(OCCASION_META) as OccasionTag[]).map((occ) => {
                const active = occasion === occ;
                return (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setOccasion(occ)}
                    className={`py-2 px-2 rounded-2xl text-center border transition ${
                      active
                        ? 'bg-[#BA7E4D] text-[#FFFDF9] border-[#966036]'
                        : 'bg-[#FAF5EC] text-[#583D2B] border-[#E7D6BE] hover:bg-[#F3E9D8]'
                    }`}
                  >
                    <div className="text-sm">{OCCASION_META[occ].icon}</div>
                    <div className="text-xs font-bold mt-0.5">
                      {OCCASION_META[occ].label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. Temperature & Weather */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-2xl bg-[#FAF5EC] border border-[#E7D6BE] space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#583D2B]">
                <Thermometer className="w-3.5 h-3.5 text-[#BA7E4D]" />
                3. 今日氣溫：約 {temperature}°C
              </span>
              <div className="flex gap-1">
                {[
                  { label: '盛夏 29°', val: 29 },
                  { label: '舒適 24°', val: 24 },
                  { label: '微涼 20°', val: 20 },
                  { label: '偏冷 15°', val: 15 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => setTemperature(preset.val)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      temperature === preset.val
                        ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                        : 'bg-[#FFFDF9] text-[#73533E] border-[#E7D6BE]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="range"
              min={10}
              max={34}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-[#BA7E4D] cursor-pointer"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#583D2B] mb-1.5">
              4. 天氣與環境狀況
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {(Object.keys(WEATHER_META) as WeatherCondition[]).map((w) => {
                const active = weather === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWeather(w)}
                    className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition ${
                      active
                        ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                        : 'bg-[#FAF5EC] text-[#583D2B] border-[#E7D6BE]'
                    }`}
                  >
                    <div>{WEATHER_META[w].icon}</div>
                    <div className="mt-0.5">{WEATHER_META[w].label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. Location & Companion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-[#583D2B] mb-1">
              <MapPin className="w-3.5 h-3.5 text-[#BA7E4D]" />
              5. 地點描述（點選快捷或自行輸入）
            </label>
            <input
              type="text"
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="例：中山赤峰街咖啡廳、華山看展..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#FAF5EC] border border-[#E7D6BE] text-xs text-[#422B1D] focus:outline-none focus:border-[#BA7E4D]"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {LOCATION_PRESETS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocationNote(loc)}
                  className="px-2 py-0.5 rounded-full bg-[#FAF5EC] hover:bg-[#F3E9D8] border border-[#E7D6BE] text-[10px] font-semibold text-[#73533E]"
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-[#583D2B] mb-1">
              <Users className="w-3.5 h-3.5 text-[#BA7E4D]" />
              6. 見面對象（選填，幫你避開穿過同一套！）
            </label>
            <input
              type="text"
              value={companions}
              onChange={(e) => setCompanions(e.target.value)}
              placeholder="例：小芸、男友、部門同事..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#FAF5EC] border border-[#E7D6BE] text-xs text-[#422B1D] placeholder:text-[#B59B82] focus:outline-none focus:border-[#BA7E4D]"
            />
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mt-1.5">
              {MOOD_OPTIONS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMoodPalette(m.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                    moodPalette === m.id
                      ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                      : 'bg-[#FFFDF9] text-[#73533E] border-[#E7D6BE]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 7. Lock Specific Item ("Today I want to wear this!") */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#583D2B]">
              <Lock className="w-3.5 h-3.5 text-[#BA7E4D]" />
              指定今天想穿的主角單品（可點選鎖定 1～2 件，留空則全自動搭配）
            </span>
            {lockedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setLockedIds([])}
                className="text-[11px] font-bold text-[#BA7E4D] hover:underline"
              >
                清除鎖定 ({lockedIds.length})
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {cleanItems.map((item) => {
              const locked = lockedIds.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleLockItem(item.id)}
                  className={`shrink-0 flex items-center gap-2 p-1.5 pr-3 rounded-2xl border transition ${
                    locked
                      ? 'bg-[#F3E9D8] border-[#BA7E4D] ring-1 ring-[#BA7E4D]'
                      : 'bg-[#FFFDF9] border-[#E7D6BE] hover:bg-[#FAF5EC]'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0">
                    <WardrobeItemVisual
                      imageUrl={item.imageUrl}
                      silhouette={item.silhouette}
                      colorTone={item.colorTone}
                      name={item.name}
                      className="w-full h-full !rounded-xl"
                    />
                  </div>
                  <div className="text-left">
                    <div className="text-[11px] font-bold text-[#422B1D] max-w-[105px] truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-[#8E6D56]">
                      {locked ? '🔒 已鎖定必穿' : CATEGORY_META[item.category].shortLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Proposals Result Section */}
      {proposals.length === 0 ? (
        <div className="cream-card p-8 text-center space-y-2">
          <div className="text-3xl">🧸</div>
          <h3 className="text-base font-bold text-[#422B1D]">
            目前乾淨可穿的單品還不夠組出這個鎖定條件喔
          </h3>
          <p className="text-xs text-[#8E6D56]">
            試著減少鎖定單品，或先到「奶油衣櫥」新增幾件上衣與下身吧！
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h3 className="text-sm sm:text-base font-bold text-[#422B1D] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#BA7E4D]" />
              為你挑選的 {proposals.length} 套奶油穿搭提案
            </h3>
            <button
              type="button"
              onClick={handleCopyPromptForAi}
              className="bobo-btn-soft inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFFDF9] text-xs font-bold text-[#583D2B]"
            >
              {copiedPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#6C8A66]" />
                  <span>已複製！直接貼回對話框找 Jetski 細調</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#BA7E4D]" />
                  <span>複製衣櫥與情境請 Jetski AI 深度搭配</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {proposals.map((prop, index) => {
              const status = savedProposalIds[prop.id];
              return (
                <div
                  key={prop.id}
                  className="cream-card p-4 flex flex-col justify-between space-y-3.5"
                >
                  <div className="space-y-3">
                    {/* Proposal Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#F3E9D8] text-[10px] font-bold text-[#73533E]">
                          LOOK 0{index + 1} · 契合度 {prop.score}%
                        </span>
                        <h4 className="text-sm font-bold text-[#422B1D] mt-1">
                          {prop.title}
                        </h4>
                      </div>
                    </div>

                    {/* Visual Flat-Lay Collage */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 rounded-2xl bg-[#FAF5EC] border border-[#E7D6BE]">
                      {prop.items.map((item) => (
                        <div key={item.id} className="space-y-1">
                          <WardrobeItemVisual
                            imageUrl={item.imageUrl}
                            silhouette={item.silhouette}
                            colorTone={item.colorTone}
                            name={item.name}
                            className="w-full aspect-square !rounded-xl bg-[#FFFDF9]"
                          />
                          <div className="text-[10px] font-bold text-[#422B1D] truncate text-center px-0.5">
                            {item.name}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Color Formula & Stylist Note */}
                    <div className="space-y-2 text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-[#FAF5EC] border border-[#EADBC6] font-bold text-[#583D2B] text-[11px]">
                        🎨 配色公式：{prop.colorFormula}
                      </div>
                      <p className="text-[#583D2B] leading-relaxed text-xs">
                        {prop.stylistComment}
                      </p>
                      <p className="text-[11px] text-[#8E6D56] bg-[#FFFDF9] border border-dashed border-[#E7D6BE] rounded-xl px-3 py-2">
                        {prop.weatherTip}
                      </p>
                      {prop.companionWarning && (
                        <p className="text-[11px] font-bold text-[#9E473E] bg-[#FCF0EE] border border-[#EBA39A] rounded-xl px-3 py-1.5">
                          ⚠️ {prop.companionWarning}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-[#F3E9D8] flex items-center gap-2">
                    <button
                      type="button"
                      disabled={Boolean(status)}
                      onClick={() => {
                        onSaveOutfitToLookbook(prop, stylingContext, true);
                        setSavedProposalIds((prev) => ({ ...prev, [prop.id]: 'worn' }));
                      }}
                      className="bobo-btn flex-1 py-2 px-3 rounded-2xl bg-[#BA7E4D] disabled:bg-[#97B391] text-[#FFFDF9] text-xs font-bold flex items-center justify-center gap-1"
                    >
                      {status === 'worn' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>已記錄今日 OOTD！</span>
                        </>
                      ) : (
                        <span>✨ 今天穿這套 (+實穿)</span>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(status)}
                      onClick={() => {
                        onSaveOutfitToLookbook(prop, stylingContext, false);
                        setSavedProposalIds((prev) => ({ ...prev, [prop.id]: 'saved' }));
                      }}
                      className="bobo-btn-soft py-2 px-3 rounded-2xl bg-[#FAF5EC] text-[#583D2B] text-xs font-bold inline-flex items-center gap-1"
                      title="先收藏至穿搭靈感簿"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5 text-[#BA7E4D]" />
                      <span>{status === 'saved' ? '已收藏' : '收藏'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
