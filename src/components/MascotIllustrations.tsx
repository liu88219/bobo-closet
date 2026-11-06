import React from 'react';
import { COLOR_TONE_META, ColorTone, GarmentSilhouette } from '../types/wardrobe';

const FUR = '#C99661';
const INK = '#171210';
const BOBO_WHITE = '#FFFFFF';
const BUTTER = '#F7CE6A';

/**
 * Header 小頭像：正宗韓系 Dinotaeng V2 油性粉彩質感 — 橄欖綠針織背心 Quokka 拿條紋衫衣架 ＋ 提復古紅小包照木框全身鏡的 BOBO
 */
export const QuokkaBoboAvatar: React.FC<{ className?: string }> = ({
  className = 'w-11 h-11',
}) => {
  const src = './icon-192.png?v=4';
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#DDD7C9] bg-[#E2DED2] shadow-sm select-none ${className}`}
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
};

/**
 * 穿搭顧問橫幅插畫：木框全身鏡試穿照鏡子 ＋ 原木衣桿大衣條紋衫 ＋ 提紅小包散步的 BOBO
 */
export const StylistStudioIllustration: React.FC<{ className?: string }> = ({
  className = 'w-44 h-24',
}) => {
  const src = './assets/hero-bobo-closet.webp?v=4';
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#DDD7C9] bg-[#E6E2D6] shadow-sm select-none ${className}`}
      aria-hidden="true"
    >
      <img
        src={src}
        alt=""
        loading="eager"
        decoding="async"
        className="w-full h-full object-cover object-center"
      />
    </div>
  );
};

/**
 * 簡約奶油霧面服飾單品版型插畫（柔和霧面線條，無粗重黑邊框）
 */
export const GarmentVectorIllustration: React.FC<{
  silhouette: GarmentSilhouette;
  colorTone: ColorTone;
  className?: string;
}> = ({ silhouette, colorTone, className = 'w-full h-full' }) => {
  const toneMeta = COLOR_TONE_META[colorTone] || COLOR_TONE_META.cream;
  const fill = toneMeta.hex;
  const trim = toneMeta.borderHex;
  const stroke = '#6E5E50';

  const showHanger = ['tee', 'shirt', 'knit', 'cardigan', 'coat', 'blazer', 'dress'].includes(
    silhouette
  );

  return (
    <svg viewBox="0 0 140 140" className={className} aria-hidden="true">
      {/* Subtle oatmeal cream studio backdrop */}
      <rect width="140" height="140" rx="22" fill="#EFECE4" />
      <circle cx="70" cy="74" r="46" fill="#FAF8F3" opacity="0.9" />

      {/* Wooden hanger */}
      {showHanger && (
        <g>
          <path
            d="M70 15 C70 10 76 10 76 14 C76 17 70 18 70 22"
            fill="none"
            stroke="#9C846E"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M48 33 L70 22 L92 33"
            fill="none"
            stroke="#9C846E"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
        </g>
      )}

      {silhouette === 'tee' && (
        <g>
          <path
            d="M46 34 Q70 42 94 34 L112 52 L100 66 L90 58 L90 108 Q70 111 50 108 L50 58 L40 66 L28 52 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M56 36 Q70 46 84 36" fill="none" stroke={trim} strokeWidth="2.2" />
        </g>
      )}

      {silhouette === 'shirt' && (
        <g>
          <path
            d="M47 33 L93 33 L112 88 L98 92 L89 56 L89 110 Q70 113 51 110 L51 56 L42 92 L28 88 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M56 33 L70 46 L84 33"
            fill="#FAF8F3"
            stroke={stroke}
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <line x1="70" y1="46" x2="70" y2="110" stroke={trim} strokeWidth="1.8" />
          <circle cx="70" cy="58" r="1.6" fill={stroke} />
          <circle cx="70" cy="72" r="1.6" fill={stroke} />
          <circle cx="70" cy="86" r="1.6" fill={stroke} />
        </g>
      )}

      {silhouette === 'knit' && (
        <g>
          <path
            d="M45 35 Q70 41 95 35 L113 92 L97 96 L89 60 L89 108 Q70 111 51 108 L51 60 L43 96 L27 92 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M62 46 Q65 56 62 66 Q59 76 62 86 Q65 96 62 104"
            fill="none"
            stroke={trim}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M78 46 Q75 56 78 66 Q81 76 78 86 Q75 96 78 104"
            fill="none"
            stroke={trim}
            strokeWidth="2"
            strokeLinecap="round"
          />
          <line x1="52" y1="103" x2="88" y2="103" stroke={trim} strokeWidth="2.2" />
        </g>
      )}

      {silhouette === 'cardigan' && (
        <g>
          <path
            d="M46 34 L60 34 L70 52 L80 34 L94 34 L113 94 L97 98 L89 60 L89 110 L51 110 L51 60 L43 98 L27 94 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="70" y1="52" x2="70" y2="110" stroke={stroke} strokeWidth="2" />
          <circle cx="70" cy="64" r="2.6" fill={FUR} />
          <circle cx="70" cy="79" r="2.6" fill={FUR} />
          <circle cx="70" cy="94" r="2.6" fill={FUR} />
        </g>
      )}

      {(silhouette === 'blazer' || silhouette === 'coat') && (
        <g>
          <path
            d="M44 33 L96 33 L113 96 L98 100 L90 58 L92 116 L48 116 L50 58 L42 100 L27 96 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d="M57 33 L70 64 L83 33"
            fill="none"
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="70" y1="64" x2="70" y2="116" stroke={stroke} strokeWidth="1.8" />
          <circle cx="65" cy="78" r="2.1" fill={stroke} />
          <circle cx="65" cy="92" r="2.1" fill={stroke} />
        </g>
      )}

      {silhouette === 'jeans' && (
        <g>
          <path
            d="M46 28 L94 28 L100 114 L76 114 L70 58 L64 114 L40 114 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="46" y1="37" x2="94" y2="37" stroke={stroke} strokeWidth="1.8" />
          <circle cx="70" cy="32.5" r="1.8" fill={stroke} />
          <path d="M47 46 Q55 46 57 38" fill="none" stroke={trim} strokeWidth="1.8" />
          <path d="M93 46 Q85 46 83 38" fill="none" stroke={trim} strokeWidth="1.8" />
        </g>
      )}

      {silhouette === 'slacks' && (
        <g>
          <path
            d="M45 28 L95 28 L103 114 L75 114 L70 56 L65 114 L37 114 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="45" y1="36" x2="95" y2="36" stroke={stroke} strokeWidth="1.8" />
          <line x1="56" y1="42" x2="52" y2="108" stroke={trim} strokeWidth="1.6" />
          <line x1="84" y1="42" x2="88" y2="108" stroke={trim} strokeWidth="1.6" />
        </g>
      )}

      {silhouette === 'skirt' && (
        <g>
          <path
            d="M50 32 L90 32 L108 110 Q70 117 32 110 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <line x1="49" y1="41" x2="91" y2="41" stroke={stroke} strokeWidth="1.8" />
          <path d="M60 46 L52 106" stroke={trim} strokeWidth="1.8" strokeLinecap="round" />
          <path d="M80 46 L88 106" stroke={trim} strokeWidth="1.8" strokeLinecap="round" />
        </g>
      )}

      {silhouette === 'dress' && (
        <g>
          <path
            d="M50 34 L62 34 Q70 43 78 34 L90 34 L96 54 L86 58 L84 64 L106 114 Q70 120 34 114 L56 64 L54 58 L44 54 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M56 64 Q70 68 84 64" fill="none" stroke={trim} strokeWidth="2" />
        </g>
      )}

      {silhouette === 'sneakers' && (
        <g>
          <path
            d="M28 88 L34 58 L56 58 L74 74 L106 76 Q116 78 114 92 L26 92 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect
            x="25"
            y="90"
            width="90"
            height="10"
            rx="5"
            fill="#C99E74"
            stroke={stroke}
            strokeWidth="1.8"
          />
          <line x1="60" y1="64" x2="68" y2="59" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <line x1="67" y1="70" x2="75" y2="65" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {(silhouette === 'loafers' || silhouette === 'boots') && (
        <g>
          <path
            d={
              silhouette === 'boots'
                ? 'M36 42 L64 42 L68 72 L106 78 Q114 82 112 94 L32 94 Z'
                : 'M28 84 L36 64 L60 66 L74 74 L108 76 Q115 80 112 94 L28 94 Z'
            }
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <rect x="28" y="92" width="85" height="8" rx="3" fill="#2D251E" />
          <path d="M66 68 L62 84" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="64" cy="75" r="2.3" fill={BUTTER} />
        </g>
      )}

      {(silhouette === 'tote' || silhouette === 'crossbody') && (
        <g>
          <path
            d="M52 54 C52 30 88 30 88 54"
            fill="none"
            stroke={stroke}
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d={
              silhouette === 'crossbody'
                ? 'M34 62 Q70 54 106 62 Q112 84 102 98 Q70 105 38 98 Q28 84 34 62 Z'
                : 'M38 54 L102 54 L96 106 Q70 110 44 106 Z'
            }
            fill={fill}
            stroke={stroke}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Lineless snow-white BOBO charm tag */}
          <circle cx="84.5" cy="65.5" r="2.6" fill={BOBO_WHITE} />
          <circle cx="91.5" cy="65.5" r="2.6" fill={BOBO_WHITE} />
          <circle cx="88" cy="70" r="6.2" fill={BOBO_WHITE} />
          <circle cx="86.2" cy="69" r="0.9" fill={INK} />
          <circle cx="89.8" cy="69" r="0.9" fill={INK} />
          <circle cx="88" cy="70.8" r="1" fill={INK} />
        </g>
      )}

      {(silhouette === 'hat' || silhouette === 'scarf') && (
        <g>
          {silhouette === 'hat' ? (
            <>
              <path
                d="M32 82 C30 52 110 52 108 82 C90 76 50 76 32 82 Z"
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <ellipse
                cx="70"
                cy="83"
                rx="38"
                ry="8"
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
              />
              <path d="M69 53 L72 46" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
            </>
          ) : (
            <>
              <rect
                x="34"
                y="46"
                width="72"
                height="24"
                rx="12"
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
              />
              <path
                d="M68 68 L62 108 L84 108 L80 68 Z"
                fill={fill}
                stroke={stroke}
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </>
          )}
        </g>
      )}
    </svg>
  );
};

/**
 * 統一單品視覺卡（有真實照片時以奶油霧面邊框呈現，無照片時顯示同色系簡約奶油插畫）
 */
export const WardrobeItemVisual: React.FC<{
  imageUrl?: string;
  silhouette: GarmentSilhouette;
  colorTone: ColorTone;
  name: string;
  className?: string;
}> = ({ imageUrl, silhouette, colorTone, name, className = 'w-full aspect-square' }) => {
  const validPhoto =
    imageUrl && (imageUrl.startsWith('data:image/') || imageUrl.startsWith('./') || imageUrl.startsWith('http'));

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#EFECE4] border border-[#DDD7C9] ${className}`}
    >
      {validPhoto ? (
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="w-full h-full object-cover"
        />
      ) : (
        <GarmentVectorIllustration
          silhouette={silhouette}
          colorTone={colorTone}
          className="w-full h-full"
        />
      )}
    </div>
  );
};
