import React, { useState } from 'react';
import { LayoutGrid, UserRound } from 'lucide-react';
import { CATEGORY_META, WardrobeItem } from '../types/wardrobe';
import { WardrobeItemVisual } from './MascotIllustrations';

interface FullBodyOutfitCollageProps {
  items: WardrobeItem[];
  compact?: boolean;
}

/**
 * 模擬試衣間「全身上下比例直向拼圖」：
 * - 左側人體中軸（由上而下對齊）：帽飾 ➔ 上衣 ➔ 正下方緊接褲子/裙子（或連身洋裝） ➔ 最下方接鞋子
 * - 右側層次外搭軸：外套/開襟衫 ＋ 包款 ＋ 其他配件
 * 支援一鍵切換「🪞 全貌上下拼圖」與「田 平鋪方格」，讓上下身配色銜接與全身全貌一目了然！
 */
export const FullBodyOutfitCollage: React.FC<FullBodyOutfitCollageProps> = ({
  items,
  compact = false,
}) => {
  const [viewMode, setViewMode] = useState<'silhouette' | 'grid'>('silhouette');

  const hats = items.filter((i) => i.category === 'accessories');
  const tops = items.filter((i) => i.category === 'tops');
  const bottoms = items.filter((i) => i.category === 'bottoms');
  const dresses = items.filter((i) => i.category === 'dresses');
  const outerwear = items.filter((i) => i.category === 'outerwear');
  const shoes = items.filter((i) => i.category === 'shoes');
  const bags = items.filter((i) => i.category === 'bags');

  const sideColumnItems = [...outerwear, ...bags, ...hats.slice(1)];
  const topHat = hats[0];

  return (
    <div className="rounded-2xl bg-[#EFECE4]/75 border border-[#DDD7C9] p-2.5 space-y-2">
      {/* Header Mode Switcher */}
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold text-[#8A7E70]">
          {viewMode === 'silhouette' ? '🪞 全身上下比例全貌' : '田 單品平鋪一覽'}
        </span>
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
              <WardrobeItemVisual
                imageUrl={item.imageUrl}
                silhouette={item.silhouette}
                colorTone={item.colorTone}
                name={item.name}
                className="w-full aspect-square !rounded-xl bg-[#FAF8F3]"
              />
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

            {/* Optional Crown Accessory */}
            {topHat && (
              <div className="w-16 flex flex-col items-center">
                <WardrobeItemVisual
                  imageUrl={topHat.imageUrl}
                  silhouette={topHat.silhouette}
                  colorTone={topHat.colorTone}
                  name={topHat.name}
                  className="w-14 h-12 !rounded-xl bg-[#FAF8F3]"
                />
                <span className="text-[9px] font-bold text-[#5C5044] truncate max-w-full mt-0.5">
                  {topHat.name}
                </span>
              </div>
            )}

            {/* Dress OR (Top stacked directly over Bottom!) */}
            {dresses.length > 0 ? (
              dresses.map((dress) => (
                <div key={dress.id} className="w-full flex flex-col items-center">
                  <WardrobeItemVisual
                    imageUrl={dress.imageUrl}
                    silhouette={dress.silhouette}
                    colorTone={dress.colorTone}
                    name={dress.name}
                    className={`w-full ${
                      compact ? 'h-32' : 'h-36'
                    } !rounded-xl bg-[#FAF8F3]`}
                  />
                  <span className="text-[10px] font-bold text-[#2D251E] truncate max-w-full mt-0.5">
                    {dress.name}
                  </span>
                </div>
              ))
            ) : (
              <div className="w-full flex flex-col items-center space-y-1">
                {tops.map((top) => (
                  <div key={top.id} className="w-full flex flex-col items-center">
                    <WardrobeItemVisual
                      imageUrl={top.imageUrl}
                      silhouette={top.silhouette}
                      colorTone={top.colorTone}
                      name={top.name}
                      className={`w-full ${
                        compact ? 'h-24' : 'h-28'
                      } !rounded-t-xl !rounded-b-md bg-[#FAF8F3]`}
                    />
                    <span className="text-[10px] font-bold text-[#2D251E] truncate max-w-full mt-0.5">
                      {top.name}
                    </span>
                  </div>
                ))}

                {bottoms.map((btm) => (
                  <div key={btm.id} className="w-full flex flex-col items-center">
                    <WardrobeItemVisual
                      imageUrl={btm.imageUrl}
                      silhouette={btm.silhouette}
                      colorTone={btm.colorTone}
                      name={btm.name}
                      className={`w-full ${
                        compact ? 'h-28' : 'h-32'
                      } !rounded-t-md !rounded-b-xl bg-[#FAF8F3]`}
                    />
                    <span className="text-[10px] font-bold text-[#2D251E] truncate max-w-full mt-0.5">
                      {btm.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Shoes right underneath hem */}
            {shoes.map((shoe) => (
              <div key={shoe.id} className="w-24 flex flex-col items-center pt-0.5">
                <WardrobeItemVisual
                  imageUrl={shoe.imageUrl}
                  silhouette={shoe.silhouette}
                  colorTone={shoe.colorTone}
                  name={shoe.name}
                  className="w-20 h-14 !rounded-xl bg-[#FAF8F3]"
                />
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
                  <WardrobeItemVisual
                    imageUrl={sideItem.imageUrl}
                    silhouette={sideItem.silhouette}
                    colorTone={sideItem.colorTone}
                    name={sideItem.name}
                    className={`w-full ${
                      sideItem.category === 'outerwear' ? 'h-28' : 'h-20'
                    } !rounded-xl bg-[#FAF8F3]`}
                  />
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
