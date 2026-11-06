import React, { useMemo, useState } from 'react';
import {
  Droplets,
  Edit3,
  Eye,
  EyeOff,
  Heart,
  MessageSquareHeart,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  CATEGORY_META,
  COLOR_TONE_META,
  ClothingCategory,
  ColorTone,
  OCCASION_META,
  WardrobeItem,
} from '../types/wardrobe';
import { WardrobeItemVisual } from './MascotIllustrations';

interface WardrobeGalleryProps {
  items: WardrobeItem[];
  hideSamples: boolean;
  onToggleHideSamples: () => void;
  onOpenAddModal: () => void;
  onEditItem: (item: WardrobeItem) => void;
  onToggleFavorite: (itemId: string) => void;
  onToggleLaundry: (itemId: string) => void;
  onQuickStyleWithItem: (itemId: string) => void;
}

export const WardrobeGallery: React.FC<WardrobeGalleryProps> = ({
  items,
  hideSamples,
  onToggleHideSamples,
  onOpenAddModal,
  onEditItem,
  onToggleFavorite,
  onToggleLaundry,
  onQuickStyleWithItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | ClothingCategory>('all');
  const [selectedColor, setSelectedColor] = useState<'all' | ColorTone>('all');
  const [onlyClean, setOnlyClean] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const realCount = useMemo(() => items.filter((i) => !i.isSample).length, [items]);
  const sampleCount = useMemo(() => items.filter((i) => i.isSample).length, [items]);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (hideSamples && item.isSample) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedColor !== 'all' && item.colorTone !== selectedColor) return false;
      if (onlyClean && item.inLaundry) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${item.name} ${item.subCategory} ${item.brand || ''} ${
          item.fitNote || ''
        } ${COLOR_TONE_META[item.colorTone].label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, hideSamples, selectedCategory, selectedColor, onlyClean, searchQuery]);

  // Color distribution summary bar
  const paletteBreakdown = useMemo(() => {
    const base = items.filter((i) => !(hideSamples && i.isSample));
    if (base.length === 0) return [];
    const counts = new Map<ColorTone, number>();
    base.forEach((i) => counts.set(i.colorTone, (counts.get(i.colorTone) || 0) + 1));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tone, count]) => ({
        tone,
        count,
        pct: Math.round((count / base.length) * 100),
      }));
  }, [items, hideSamples]);

  return (
    <div className="space-y-4">
      {/* AI + Mobile Dual Workflow Banner */}
      <div className="cream-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E7D6BE] text-[11px] font-bold text-[#8E6D56]">
            <MessageSquareHeart className="w-3.5 h-3.5 text-[#BA7E4D]" />
            <span>雙模式入庫：對話傳圖給 AI ＆ 手機隨拍即存</span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-[#422B1D]">
            我的奶油膠囊衣櫥（共 {visibleItems.length} 件單品）
          </h2>
          <p className="text-xs text-[#73533E] leading-relaxed">
            你可以直接拍衣服請 AI 助手幫你建檔入庫，也能在手機點右側按鈕隨拍新增！
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {sampleCount > 0 && (
            <button
              type="button"
              onClick={onToggleHideSamples}
              className="bobo-btn-soft inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#FAF5EC] text-xs font-bold text-[#73533E]"
            >
              {hideSamples ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>顯示範例 ({sampleCount})</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>隱藏範例{realCount > 0 ? '' : '單品'}</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="bobo-btn inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#BA7E4D] text-[#FFFDF9] text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            <span>新增衣服照片</span>
          </button>
        </div>
      </div>

      {/* Color Harmony Bar */}
      {paletteBreakdown.length > 0 && (
        <div className="cream-card-soft px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#583D2B]">🎨 衣櫥色系比例</span>
            <span className="text-[11px] text-[#8E6D56]">
              點下方色票可篩選同色系單品
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full overflow-hidden flex border border-[#E7D6BE] bg-[#FAF5EC]">
            {paletteBreakdown.map((seg) => (
              <div
                key={seg.tone}
                style={{
                  width: `${Math.max(4, seg.pct)}%`,
                  backgroundColor: COLOR_TONE_META[seg.tone].hex,
                }}
                title={`${COLOR_TONE_META[seg.tone].label}: ${seg.count} 件 (${seg.pct}%)`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
            <button
              type="button"
              onClick={() => setSelectedColor('all')}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                selectedColor === 'all'
                  ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                  : 'bg-[#FFFDF9] text-[#73533E] border-[#E7D6BE]'
              }`}
            >
              全部色系
            </button>
            {paletteBreakdown.map(({ tone, count }) => {
              const meta = COLOR_TONE_META[tone];
              const active = selectedColor === tone;
              return (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setSelectedColor(active ? 'all' : tone)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition ${
                    active
                      ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                      : 'bg-[#FFFDF9] text-[#583D2B] border-[#E7D6BE]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: meta.hex,
                      border: `1.5px solid ${meta.borderHex}`,
                    }}
                  />
                  <span>
                    {meta.label} {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Strip + Search */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 flex-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-bold border transition ${
              selectedCategory === 'all'
                ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                : 'bg-[#FFFDF9] text-[#73533E] border-[#E7D6BE]'
            }`}
          >
            ✨ 全部 ({items.filter((i) => !(hideSamples && i.isSample)).length})
          </button>
          {(Object.keys(CATEGORY_META) as ClothingCategory[]).map((cat) => {
            const count = items.filter(
              (i) => !(hideSamples && i.isSample) && i.category === cat
            ).length;
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(active ? 'all' : cat)}
                className={`shrink-0 px-3 py-2 rounded-2xl text-xs font-bold border transition ${
                  active
                    ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                    : 'bg-[#FFFDF9] text-[#73533E] border-[#E7D6BE]'
                }`}
              >
                {CATEGORY_META[cat].emoji} {CATEGORY_META[cat].shortLabel} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-[#A48770] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋單品或材質..."
              className="w-full pl-8 pr-3 py-2 rounded-2xl bg-[#FFFDF9] border border-[#E7D6BE] text-xs text-[#422B1D] placeholder:text-[#B59B82] focus:outline-none focus:border-[#BA7E4D]"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyClean((v) => !v)}
            className={`shrink-0 px-3 py-2 rounded-2xl text-xs font-bold border transition ${
              onlyClean
                ? 'bg-[#EEF3EC] border-[#97B391] text-[#4E6B48]'
                : 'bg-[#FFFDF9] border-[#E7D6BE] text-[#8E6D56]'
            }`}
            title="排除正在清洗中的衣服"
          >
            {onlyClean ? '✅ 僅乾淨可穿' : '🧺 含待洗'}
          </button>
        </div>
      </div>

      {/* Empty State */}
      {visibleItems.length === 0 ? (
        <div className="cream-card p-8 text-center space-y-3">
          <div className="text-3xl">🧺</div>
          <h3 className="text-base font-bold text-[#422B1D]">
            這個篩選條件下還沒有衣服單品唷
          </h3>
          <p className="text-xs text-[#8E6D56] max-w-md mx-auto leading-relaxed">
            點選「＋ 新增衣服照片」拍下你的上衣、褲裙、外套或鞋子，也可以直接傳照片到對話框請 AI 助手幫你整理入庫！
          </p>
          <div className="flex justify-center gap-2 pt-1">
            {hideSamples && sampleCount > 0 && (
              <button
                type="button"
                onClick={onToggleHideSamples}
                className="bobo-btn-soft px-4 py-2 rounded-2xl bg-[#FAF5EC] text-xs font-bold text-[#73533E]"
              >
                先看看奶油範例衣櫥
              </button>
            )}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="bobo-btn px-4 py-2 rounded-2xl bg-[#BA7E4D] text-[#FFFDF9] text-xs font-bold"
            >
              ＋ 立即新增第一件衣服
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {visibleItems.map((item) => {
            const colorMeta = COLOR_TONE_META[item.colorTone];
            return (
              <div
                key={item.id}
                className={`cream-card p-3 flex flex-col justify-between transition ${
                  item.inLaundry ? 'opacity-65' : ''
                }`}
              >
                <div>
                  {/* Polaroid Visual Header */}
                  <div className="relative group">
                    <WardrobeItemVisual
                      imageUrl={item.imageUrl}
                      silhouette={item.silhouette}
                      colorTone={item.colorTone}
                      name={item.name}
                    />

                    {/* Top-left sample or laundry badge */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {item.isSample && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FFFDF9]/90 border border-[#E7D6BE] text-[10px] font-bold text-[#8E6D56]">
                          範例
                        </span>
                      )}
                      {item.inLaundry && (
                        <span className="px-2 py-0.5 rounded-full bg-[#422B1D]/85 text-[#FFFDF9] text-[10px] font-bold">
                          🧺 待洗中
                        </span>
                      )}
                    </div>

                    {/* Top-right favorite heart */}
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(item.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[#FFFDF9]/90 border border-[#E7D6BE] flex items-center justify-center shadow-sm"
                      aria-label="收藏最愛"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          item.isFavorite
                            ? 'fill-[#E27D73] text-[#E27D73]'
                            : 'text-[#A48770]'
                        }`}
                      />
                    </button>

                    {/* Bottom-left warmth + rain badge */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full bg-[#FFFDF9]/90 border border-[#E7D6BE] text-[10px] font-bold text-[#583D2B]">
                        厚度 Lv.{item.warmth}
                      </span>
                      {item.rainFriendly && (
                        <span
                          className="w-5 h-5 rounded-full bg-[#EEF3EC]/95 border border-[#97B391] flex items-center justify-center"
                          title="雨天友善"
                        >
                          <Droplets className="w-2.5 h-2.5 text-[#5A7D54]" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Item Info */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8E6D56]">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{
                            backgroundColor: colorMeta.hex,
                            border: `1px solid ${colorMeta.borderHex}`,
                          }}
                        />
                        {colorMeta.label} · {item.subCategory}
                      </span>
                      <span className="text-[10px] text-[#A48770] font-semibold">
                        穿過 {item.wearCount} 次
                      </span>
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-[#422B1D] line-clamp-1">
                      {item.name}
                    </h3>

                    {item.fitNote && (
                      <p className="text-[11px] text-[#8E6D56] line-clamp-2 leading-snug">
                        {item.fitNote}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {item.occasions.slice(0, 3).map((occ) => (
                        <span
                          key={occ}
                          className="px-1.5 py-0.5 rounded-md bg-[#FAF5EC] text-[10px] font-semibold text-[#73533E]"
                        >
                          {OCCASION_META[occ].icon} {OCCASION_META[occ].label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-3 pt-2 border-t border-[#F3E9D8] flex items-center justify-between gap-1">
                  <button
                    type="button"
                    onClick={() => onQuickStyleWithItem(item.id)}
                    disabled={item.inLaundry}
                    className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-[#FAF5EC] hover:bg-[#F3E9D8] disabled:opacity-40 text-[11px] font-bold text-[#583D2B] transition"
                  >
                    <Sparkles className="w-3 h-3 text-[#BA7E4D]" />
                    <span>穿這件搭</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleLaundry(item.id)}
                    className={`p-1.5 rounded-xl border text-[11px] transition ${
                      item.inLaundry
                        ? 'bg-[#422B1D] text-[#FFFDF9] border-[#422B1D]'
                        : 'bg-[#FFFDF9] text-[#8E6D56] border-[#E7D6BE] hover:bg-[#FAF5EC]'
                    }`}
                    title={item.inLaundry ? '洗好了！放回衣櫥' : '標記送洗/待洗中'}
                  >
                    🧺
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditItem(item)}
                    className="p-1.5 rounded-xl bg-[#FFFDF9] border border-[#E7D6BE] text-[#73533E] hover:bg-[#FAF5EC]"
                    title="編輯單品"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
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
