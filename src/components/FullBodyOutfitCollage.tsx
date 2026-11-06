import React, { useState } from 'react';
import { LayoutGrid, UserRound } from 'lucide-react';
import { CATEGORY_META, CardVisualStyle, WardrobeItem } from '../types/wardrobe';
import { WardrobeItemVisual } from './MascotIllustrations';

interface FullBodyOutfitCollageProps {
  items: WardrobeItem[];
  compact?: boolean;
}

const STYLE_OPTIONS: Array<{ id: CardVisualStyle; label: string }> = [
  { id: 'flatlay', label: '🪄 平拍' },
  { id: 'real', label: '✂️ 實穿' },
  { id: 'pastel', label: '🎨 粉彩' },
];

/**
 * 模擬試衣間「全身上下比例直向拼圖」＋ 混合卡面三視角切換 (平拍 / 實穿 / 粉彩)
 */
export const FullBodyOutfitCollage: React.FC<FullBodyOutfitCollageProps> = ({
  items,
  compact = false,
}) => {
  const [viewMode, setViewMode] = useState<'silhouette' | 'grid'>('silhouette');
  const [visualStyle, setVisualStyle] = useState<CardVisualStyle>('flatlay');

  const hats = items.filter((i) => i.category === 'accessories');
  const tops = items.filter((i) => i.category === 'tops');
  const bottoms = items.filter((i) => i.category === 'bottoms');
  const dresses = items.filter((i) => i.category === 'dresses');
  const outerwear = items.filter((i) => i.category === 'outerwear');
  const shoes = items.filter((i) => i.category === 'shoes');
  const bags = items.filter((i) => i.category === 'bags');

  const sideColumnItems = [...outerwear, ...bags, ...hats.slice(1)];
  const topHat = hats[0];

  const renderVisual = (item: WardrobeItem, className: string) => (
    <WardrobeItemVisual
      imageUrl={item.imageUrl}
      flatlayUrl={item.flatlayUrl}
      realCropUrl={item.realCropUrl}
      pastelUrl={item.pastelUrl}
      preferredStyle={visualStyle}
      silhouette={item.silhouette}
      colorTone={item.colorTone}
      name={item.name}
      className={className}
    />
  );

  return (
    <div className="rounded-2xl bg-[#EFECE4]/75 border border-[#DDD7C9] p-2.5 space-y-2">
      {/* Header Mode & Hybrid Style Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-1 px-0.5">
        <div className="inline-flex rounded-full bg-[#FAF8F3] border border-[#DDD7C9] p-0.5">
          {STYLE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setVisualStyle(opt.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
                visualStyle === opt.id
                  ? 'bg-[#2D251E] text-[#FAF8F3]'
                  : 'text-[#8A7E70] hover:text-[#2D251E]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-full bg-[#FAF8F3] border border-[#DDD7C9] p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('silhouette')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
              viewMode === 'silhouette'
                ? 'bg-[#F2CA62] text-[#2D251E]'
                : 'text-[#8A7E70]'
            }`}
          >
            <UserRound className="w-2.5 h-2.5" />
            全貌
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition ${
              viewMode === 'grid'
                ? 'bg-[#F2CA62] text-[#2D251E]'
                : 'text-[#8A7E70]'
            }`}
          >
            <LayoutGrid className="w-2.5 h-2.5" />
            平鋪
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <div key={item.id} className="space-y-1">
              {renderVisual(item, 'w-full aspect-square !rounded-xl bg-[#FAF8F3]')}
              <div className="text-[10px] font-bold text-[#2D251E] truncate text-center px-0.5">
                {item.name}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`grid ${
            sideColumnItems.length > 0 ? 'grid-cols-12' : 'grid-cols-1'
          } gap-2 items-start`}
        >
          {/* Left Main Body Axis: Head -> Upper Body -> Lower Body -> Feet */}
          <div
            className={`${
              sideColumnItems.length > 0 ? 'col-span-7' : 'max-w-[200px] mx-auto w-full'
            } flex flex-col items-center space-y-1.5 bg-[#FAF8F3] rounded-2xl p-2 border border-[#E2DDD1]`}
          >
            <span className="text-[9px] font-bold text-[#8A7E70] tracking-wide">
              全身主軸比例
            </span>

            {topHat && (
              <div className="w-16 flex flex-col items-center">
                {renderVisual(topHat, 'w-14 h-12 !rounded-xl bg-[#FAF8F3]')}
                <span className="text-[9px] font-bold text-[#5C5044] truncate max-w-full mt-0.5">
                  {topHat.name}
                </span>
              </div>
            )}

            {dresses.length > 0 ? (
              dresses.map((dress) => (
                <div key={dress.id} className="w-full flex flex-col items-center">
                  {renderVisual(
                    dress,
                    `w-full ${compact ? 'h-32' : 'h-36'} !rounded-xl bg-[#FAF8F3]`
                  )}
                  <span className="text-[10px] font-bold text-[#2D251E] truncate max-w-full mt-0.5">
                    {dress.name}
                  </span>
                </div>
              ))
            ) : (
              <div className="w-full flex flex-col items-center space-y-1">
                {tops.map((top) => (
                  <div key={top.id} className="w-full flex flex-col items-center">
                    {renderVisual(
                      top,
                      `w-full ${
                        compact ? 'h-24' : 'h-28'
                      } !rounded-t-xl !rounded-b-md bg-[#FAF8F3]`
                    )}
                    <span className="text-[10px] font-bold text-[#2D251E] truncate max-w-full mt-0.5">
                      {top.name}
                    </span>
                  </div>
                ))}

                {bottoms.map((btm) => (
                  <div key={btm.id} className="w-full flex flex-col items-center">
                    {renderVisual(
                      btm,
                      `w-full ${
                        compact ? 'h-28' : 'h-32'
                      } !rounded-t-md !rounded-b-xl bg-[#FAF8F3]`
                    )}
                    <span className="text-[10px] font-bold text-[#2D251E] truncate max-w-full mt-0.5">
                      {btm.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {shoes.map((shoe) => (
              <div key={shoe.id} className="w-24 flex flex-col items-center pt-0.5">
                {renderVisual(shoe, 'w-20 h-14 !rounded-xl bg-[#FAF8F3]')}
                <span className="text-[9px] font-bold text-[#5C5044] truncate max-w-full mt-0.5">
                  {shoe.name}
                </span>
              </div>
            ))}
          </div>

          {/* Right Layering & Bag Axis */}
          {sideColumnItems.length > 0 && (
            <div className="col-span-5 flex flex-col space-y-2">
              {sideColumnItems.map((sideItem) => (
                <div
                  key={sideItem.id}
                  className="bg-[#FAF8F3] rounded-2xl p-2 border border-[#E2DDD1] flex flex-col items-center"
                >
                  <span className="text-[9px] font-bold text-[#8A7E70] mb-1">
                    {sideItem.category === 'outerwear'
                      ? '🧥 外搭層次'
                      : `${CATEGORY_META[sideItem.category].emoji} 隨身搭配`}
                  </span>
                  {renderVisual(
                    sideItem,
                    `w-full ${
                      sideItem.category === 'outerwear' ? 'h-28' : 'h-20'
                    } !rounded-xl bg-[#FAF8F3]`
                  )}
                  <span className="text-[10px] font-bold text-[#2D251E] truncate max-w-full mt-1">
                    {sideItem.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
