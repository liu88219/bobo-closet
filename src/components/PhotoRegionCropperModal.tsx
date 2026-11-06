import React, { useRef, useState } from 'react';
import { Check, Crop, Maximize2, ShieldCheck, X } from 'lucide-react';
import { ClothingCategory } from '../types/wardrobe';
import { NormalizedCropRect } from '../utils/imageCompressor';

interface PhotoRegionCropperModalProps {
  sourceDataUrl: string;
  initialCategory?: ClothingCategory;
  onCancel: () => void;
  onConfirmCrop: (rect: NormalizedCropRect, suggestedCategory?: ClothingCategory) => void;
}

interface CropPreset {
  id: string;
  label: string;
  category?: ClothingCategory;
  rect: NormalizedCropRect;
  hint: string;
}

const BODY_CROP_PRESETS: CropPreset[] = [
  {
    id: 'upper_body',
    label: '👚 框上衣/外套 (自動避臉)',
    category: 'tops',
    rect: { x: 0.14, y: 0.19, width: 0.72, height: 0.36 },
    hint: '自動從鎖骨以下框到腰臀，保護臉部隱私不入鏡',
  },
  {
    id: 'lower_body',
    label: '👖 框褲子/長裙',
    category: 'bottoms',
    rect: { x: 0.18, y: 0.46, width: 0.64, height: 0.43 },
    hint: '聚焦高腰頭到褲管／裙擺垂墜比例',
  },
  {
    id: 'full_dress',
    label: '👗 框連身洋裝 (避臉)',
    category: 'dresses',
    rect: { x: 0.14, y: 0.19, width: 0.72, height: 0.68 },
    hint: '保留領口到裙襬完整連身線條',
  },
  {
    id: 'bag_focus',
    label: '👜 框隨身包款',
    category: 'bags',
    rect: { x: 0.24, y: 0.32, width: 0.52, height: 0.36 },
    hint: '拖曳方框對準肩膀或手提的包包位置',
  },
  {
    id: 'shoes_focus',
    label: '👞 框鞋履特寫',
    category: 'shoes',
    rect: { x: 0.22, y: 0.74, width: 0.56, height: 0.24 },
    hint: '聚焦鞋頭版型與襪子搭配細節',
  },
  {
    id: 'full_flatlay',
    label: '🖼️ 整張平拍單品',
    rect: { x: 0.02, y: 0.02, width: 0.96, height: 0.96 },
    hint: '適合已經是單件衣服平拍或網拍商品圖',
  },
];

function defaultRectForCategory(cat?: ClothingCategory): NormalizedCropRect {
  switch (cat) {
    case 'tops':
    case 'outerwear':
      return BODY_CROP_PRESETS[0].rect;
    case 'bottoms':
      return BODY_CROP_PRESETS[1].rect;
    case 'dresses':
      return BODY_CROP_PRESETS[2].rect;
    case 'bags':
      return BODY_CROP_PRESETS[3].rect;
    case 'shoes':
      return BODY_CROP_PRESETS[4].rect;
    default:
      return { x: 0.08, y: 0.08, width: 0.84, height: 0.84 };
  }
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null;

export const PhotoRegionCropperModal: React.FC<PhotoRegionCropperModalProps> = ({
  sourceDataUrl,
  initialCategory,
  onCancel,
  onConfirmCrop,
}) => {
  const [rect, setRect] = useState<NormalizedCropRect>(() =>
    defaultRectForCategory(initialCategory)
  );
  const [selectedPresetCat, setSelectedPresetCat] = useState<ClothingCategory | undefined>(
    initialCategory
  );
  const [activeHint, setActiveHint] = useState<string>(
    '直接拖曳黃色框移動位置，或拉動四角圓點調整你要留下的衣服大小'
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    mode: DragMode;
    startClientX: number;
    startClientY: number;
    startRect: NormalizedCropRect;
  } | null>(null);

  const beginDrag = (mode: DragMode, e: React.PointerEvent) => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      mode,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startRect: { ...rect },
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const st = dragStateRef.current;
    const box = containerRef.current?.getBoundingClientRect();
    if (!st || !st.mode || !box || box.width === 0 || box.height === 0) return;

    const dx = (e.clientX - st.startClientX) / box.width;
    const dy = (e.clientY - st.startClientY) / box.height;
    const minSize = 0.12;
    const s = st.startRect;

    if (st.mode === 'move') {
      const nx = Math.max(0, Math.min(1 - s.width, s.x + dx));
      const ny = Math.max(0, Math.min(1 - s.height, s.y + dy));
      setRect({ x: nx, y: ny, width: s.width, height: s.height });
      return;
    }

    let left = s.x;
    let top = s.y;
    let right = s.x + s.width;
    let bottom = s.y + s.height;

    if (st.mode === 'nw') {
      left = Math.max(0, Math.min(right - minSize, s.x + dx));
      top = Math.max(0, Math.min(bottom - minSize, s.y + dy));
    } else if (st.mode === 'ne') {
      right = Math.min(1, Math.max(left + minSize, s.x + s.width + dx));
      top = Math.max(0, Math.min(bottom - minSize, s.y + dy));
    } else if (st.mode === 'sw') {
      left = Math.max(0, Math.min(right - minSize, s.x + dx));
      bottom = Math.min(1, Math.max(top + minSize, s.y + s.height + dy));
    } else if (st.mode === 'se') {
      right = Math.min(1, Math.max(left + minSize, s.x + s.width + dx));
      bottom = Math.min(1, Math.max(top + minSize, s.y + s.height + dy));
    }

    setRect({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    });
  };

  const endDrag = () => {
    dragStateRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#2D251E]/55 backdrop-blur-xs p-3 sm:p-5">
      <div className="w-full max-w-md bg-[#FAF8F3] border border-[#DDD7C9] rounded-3xl shadow-2xl p-4 sm:p-5 space-y-3.5 max-h-[94vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-[#2D251E] flex items-center gap-1.5">
              <Crop className="w-4 h-4 text-[#C48E63]" />
              框出要留下的衣服部位
            </h3>
            <p className="text-[11px] text-[#5C5044] mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6C8A66] shrink-0" />
              含人物實穿照可直接框選衣服範圍，保護臉部隱私且搭配更清楚！
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-full bg-[#EFECE4] text-[#5C5044]"
            aria-label="取消裁切"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* One-Tap Body Part Presets */}
        <div className="flex flex-wrap gap-1.5">
          {BODY_CROP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setRect(preset.rect);
                if (preset.category) setSelectedPresetCat(preset.category);
                setActiveHint(preset.hint);
              }}
              className="px-2.5 py-1 rounded-full bg-[#EFECE4] hover:bg-[#F2CA62]/40 border border-[#DDD7C9] text-[11px] font-bold text-[#2D251E] transition"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Interactive Image Stage */}
        <div className="flex justify-center bg-[#ECE8DF] rounded-2xl p-2 border border-[#DDD7C9]">
          <div
            ref={containerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="relative inline-block max-h-[50vh] select-none touch-none overflow-hidden rounded-xl"
          >
            <img
              src={sourceDataUrl}
              alt="待裁切穿搭原圖"
              draggable={false}
              className="block max-h-[50vh] w-auto max-w-full object-contain pointer-events-none"
            />

            {/* Dimmed outer mask achieved via huge box-shadow on the selection box */}
            <div
              onPointerDown={(e) => beginDrag('move', e)}
              style={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.width * 100}%`,
                height: `${rect.height * 100}%`,
                boxShadow: '0 0 0 9999px rgba(34, 27, 22, 0.48)',
              }}
              className="absolute border-2 border-[#F2CA62] rounded-lg cursor-move"
            >
              {/* Rule-of-thirds subtle guide lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-45">
                <div className="border-r border-b border-[#FAF8F3]/60" />
                <div className="border-r border-b border-[#FAF8F3]/60" />
                <div className="border-b border-[#FAF8F3]/60" />
                <div className="border-r border-b border-[#FAF8F3]/60" />
                <div className="border-r border-b border-[#FAF8F3]/60" />
                <div className="border-b border-[#FAF8F3]/60" />
                <div className="border-r border-[#FAF8F3]/60" />
                <div className="border-r border-[#FAF8F3]/60" />
                <div />
              </div>

              {/* 4 Corner Drag Handles */}
              {(
                [
                  { mode: 'nw', pos: '-top-2.5 -left-2.5 cursor-nwse-resize' },
                  { mode: 'ne', pos: '-top-2.5 -right-2.5 cursor-nesw-resize' },
                  { mode: 'sw', pos: '-bottom-2.5 -left-2.5 cursor-nesw-resize' },
                  { mode: 'se', pos: '-bottom-2.5 -right-2.5 cursor-nwse-resize' },
                ] as const
              ).map((h) => (
                <div
                  key={h.mode}
                  onPointerDown={(e) => beginDrag(h.mode, e)}
                  className={`absolute ${h.pos} w-5 h-5 rounded-full bg-[#F2CA62] border-2 border-[#2D251E] shadow-md`}
                />
              ))}

              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full bg-[#2D251E]/80 text-[#FAF8F3] text-[10px] font-bold pointer-events-none inline-flex items-center gap-1">
                <Maximize2 className="w-2.5 h-2.5 text-[#F2CA62]" />
                保留範圍
              </span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[#8A7E70] text-center">{activeHint}</p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-2xl bg-[#EFECE4] text-xs font-bold text-[#5C5044]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onConfirmCrop(rect, selectedPresetCat)}
            className="bobo-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-[#F2CA62] text-[#2D251E] text-xs font-bold"
          >
            <Check className="w-4 h-4" />
            <span>擷取這個範圍 ✨</span>
          </button>
        </div>
      </div>
    </div>
  );
};
