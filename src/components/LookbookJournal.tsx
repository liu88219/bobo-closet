import React, { useRef } from 'react';
import { Calendar, Camera, Heart, MapPin, Trash2, Users } from 'lucide-react';
import {
  OCCASION_META,
  SavedOutfit,
  TIME_META,
  WEATHER_META,
  WardrobeItem,
} from '../types/wardrobe';
import { compressClothingImage } from '../utils/imageCompressor';
import { FullBodyOutfitCollage } from './FullBodyOutfitCollage';

interface LookbookJournalProps {
  outfits: SavedOutfit[];
  items: WardrobeItem[];
  hideSamples: boolean;
  onToggleFavoriteOutfit: (outfitId: string) => void;
  onDeleteOutfit: (outfitId: string) => void;
  onAttachSelfie: (outfitId: string, selfieDataUrl: string) => void;
  onWearOutfitToday: (outfitId: string) => void;
}

export const LookbookJournal: React.FC<LookbookJournalProps> = ({
  outfits,
  items,
  hideSamples,
  onToggleFavoriteOutfit,
  onDeleteOutfit,
  onAttachSelfie,
  onWearOutfitToday,
}) => {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const itemMap = React.useMemo(() => {
    const map = new Map<string, WardrobeItem>();
    items.forEach((i) => map.set(i.id, i));
    return map;
  }, [items]);

  const visibleOutfits = React.useMemo(
    () => outfits.filter((o) => !(hideSamples && o.isSample)),
    [outfits, hideSamples]
  );

  const handleSelfieChange = async (
    outfitId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl } = await compressClothingImage(file, 640, 0.78);
      onAttachSelfie(outfitId, dataUrl);
    } catch {
      alert('對鏡自拍照處理失敗，請換一張試試');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="cream-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[#422B1D]">
            📖 奶油穿搭靈感簿 ＆ OOTD 日記（{visibleOutfits.length} 套）
          </h2>
          <p className="text-xs text-[#73533E]">
            收藏 AI 推薦或日常穿搭組合，還能上傳出門對鏡自拍、記錄見面對象避免下次撞衫！
          </p>
        </div>
      </div>

      {visibleOutfits.length === 0 ? (
        <div className="cream-card p-8 text-center space-y-2">
          <div className="text-3xl">🪞</div>
          <h3 className="text-base font-bold text-[#422B1D]">
            還沒有收藏的穿搭日記唷
          </h3>
          <p className="text-xs text-[#8E6D56]">
            切到「✨ 今日穿搭顧問」挑一套喜歡的組合按下「收藏」或「今天穿這套」，就會出現在這裡！
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleOutfits.map((outfit) => {
            const matchedItems = outfit.itemIds
              .map((id) => itemMap.get(id))
              .filter((x): x is WardrobeItem => Boolean(x));

            return (
              <div
                key={outfit.id}
                className="cream-card p-4 flex flex-col justify-between space-y-3"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E7D6BE] text-[10px] font-bold text-[#73533E]">
                          {OCCASION_META[outfit.occasion].icon}{' '}
                          {OCCASION_META[outfit.occasion].label}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E7D6BE] text-[10px] font-bold text-[#73533E]">
                          {WEATHER_META[outfit.weather].icon} {outfit.temperature}°C ·{' '}
                          {TIME_META[outfit.timeOfDay].label}
                        </span>
                        {outfit.isSample && (
                          <span className="px-2 py-0.5 rounded-full bg-[#F3E9D8] text-[10px] font-bold text-[#8E6D56]">
                            範例靈感
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#422B1D] mt-1.5">
                        {outfit.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleFavoriteOutfit(outfit.id)}
                      className="w-8 h-8 rounded-full bg-[#FAF5EC] border border-[#E7D6BE] flex items-center justify-center shrink-0"
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          outfit.isFavorite
                            ? 'fill-[#E27D73] text-[#E27D73]'
                            : 'text-[#A48770]'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Metadata Chips (Date, Location, Companion) */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#73533E]">
                    {outfit.wornDate && (
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Calendar className="w-3.5 h-3.5 text-[#BA7E4D]" />
                        實穿日：{outfit.wornDate}
                      </span>
                    )}
                    {outfit.locationNote && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#BA7E4D]" />
                        {outfit.locationNote}
                      </span>
                    )}
                    {outfit.companions && (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#583D2B]">
                        <Users className="w-3.5 h-3.5 text-[#BA7E4D]" />
                        同行：{outfit.companions}
                      </span>
                    )}
                  </div>

                  {/* Selfie + Flat-lay Row */}
                  <div className="flex gap-2.5 items-stretch">
                    {outfit.selfieUrl &&
                      (outfit.selfieUrl.startsWith('data:image/') ||
                        outfit.selfieUrl.startsWith('./') ||
                        outfit.selfieUrl.startsWith('http')) && (
                        <div className="w-28 shrink-0 rounded-2xl overflow-hidden border border-[#E7D6BE] bg-[#FAF5EC]">
                          <img
                            src={outfit.selfieUrl}
                            alt="OOTD 實拍"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                    <div className="flex-1 min-w-0">
                      <FullBodyOutfitCollage items={matchedItems} compact />
                    </div>
                  </div>

                  <p className="text-xs text-[#583D2B] leading-relaxed bg-[#FAF5EC]/70 rounded-xl p-2.5 border border-[#EFE3D0]">
                    {outfit.stylistComment}
                  </p>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-[#F3E9D8] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      ref={(el) => {
                        fileRefs.current[outfit.id] = el;
                      }}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleSelfieChange(outfit.id, e)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileRefs.current[outfit.id]?.click()}
                      className="bobo-btn-soft inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FFFDF9] text-[11px] font-bold text-[#583D2B]"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#BA7E4D]" />
                      <span>{outfit.selfieUrl ? '更換 OOTD 實拍' : '上傳對鏡自拍'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onWearOutfitToday(outfit.id)}
                      className="bobo-btn-soft inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#FAF5EC] text-[11px] font-bold text-[#583D2B]"
                    >
                      <span>✨ 今天再穿一次</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`確定要刪除「${outfit.title}」穿搭紀錄嗎？`)) {
                        onDeleteOutfit(outfit.id);
                      }
                    }}
                    className="p-1.5 rounded-xl text-[#A48770] hover:text-[#9E473E] hover:bg-[#FCF0EE]"
                    title="刪除紀錄"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
