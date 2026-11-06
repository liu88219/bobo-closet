import React from 'react';
import { COLOR_TONE_META, ColorTone, GarmentSilhouette } from '../types/wardrobe';

/**
 * Header 小頭像：戴奶油貝雷帽的 Quokka 與棉花糖 Bobo
 */
export const QuokkaBoboAvatar: React.FC<{ className?: string }> = ({
  className = 'w-11 h-11',
}) => (
  <svg viewBox="0 0 128 128" className={className} aria-hidden="true">
    <rect width="128" height="128" rx="30" fill="#FAF5EC" />
    <rect
      x="5"
      y="5"
      width="118"
      height="118"
      rx="26"
      fill="#FFFDF9"
      stroke="#E7D6BE"
      strokeWidth="3"
    />
    {/* Bobo peeking on right */}
    <circle cx="86" cy="54" r="8.5" fill="#FFFDF9" stroke="#422B1D" strokeWidth="3.2" />
    <circle cx="105" cy="56" r="8.5" fill="#FFFDF9" stroke="#422B1D" strokeWidth="3.2" />
    <ellipse cx="94" cy="79" rx="20" ry="22" fill="#FFFDF9" stroke="#422B1D" strokeWidth="3.2" />
    <circle cx="88" cy="73" r="2.4" fill="#422B1D" />
    <circle cx="100" cy="74" r="2.4" fill="#422B1D" />
    <ellipse cx="83" cy="78" rx="4" ry="2.4" fill="#F4A49B" opacity="0.85" />
    <ellipse cx="104" cy="79" rx="4" ry="2.4" fill="#F4A49B" opacity="0.85" />
    <path
      d="M92 78 Q94 81 96.5 78"
      fill="none"
      stroke="#422B1D"
      strokeWidth="2.4"
      strokeLinecap="round"
    />

    {/* Quokka with cream beret */}
    <circle cx="29" cy="48" r="10" fill="#BA7E4D" stroke="#422B1D" strokeWidth="3.4" />
    <circle cx="29" cy="48" r="4.8" fill="#DFB089" />
    <circle cx="65" cy="48" r="10" fill="#BA7E4D" stroke="#422B1D" strokeWidth="3.4" />
    <circle cx="65" cy="48" r="4.8" fill="#DFB089" />
    <ellipse cx="47" cy="78" rx="27" ry="25" fill="#BA7E4D" stroke="#422B1D" strokeWidth="3.4" />
    <path
      d="M23 52 C24 36 70 35 71 51 C60 47 34 47 23 52 Z"
      fill="#F3E9D8"
      stroke="#422B1D"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    <path d="M46 36 L48 32" stroke="#422B1D" strokeWidth="3" strokeLinecap="round" />
    <circle cx="37" cy="73" r="3" fill="#422B1D" />
    <circle cx="57" cy="73" r="3" fill="#422B1D" />
    <ellipse cx="29" cy="80" rx="5.5" ry="3.4" fill="#F4978E" opacity="0.85" />
    <ellipse cx="65" cy="80" rx="5.5" ry="3.4" fill="#F4978E" opacity="0.85" />
    <ellipse cx="47" cy="77" rx="4" ry="3" fill="#422B1D" />
    <path
      d="M40.5 82 Q43.8 86.5 47 81.5 Q50.2 86.5 53.5 82"
      fill="none"
      stroke="#422B1D"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 穿搭顧問橫幅插畫：Quokka 拿著木頭衣架與奶油針織衫，Bobo 從帆布包探頭比讚
 */
export const StylistStudioIllustration: React.FC<{ className?: string }> = ({
  className = 'w-36 h-24',
}) => (
  <svg viewBox="0 0 220 140" className={className} aria-hidden="true">
    {/* Soft ground shadow */}
    <ellipse cx="110" cy="126" rx="84" ry="9" fill="#EADAC3" opacity="0.65" />

    {/* Mini cream dressing mirror on left */}
    <rect
      x="16"
      y="20"
      width="46"
      height="98"
      rx="23"
      fill="#FAF5EC"
      stroke="#422B1D"
      strokeWidth="2.8"
    />
    <rect x="22" y="26" width="34" height="86" rx="17" fill="#FFFDF9" stroke="#E7D6BE" strokeWidth="2" />
    <path d="M30 46 L44 32" stroke="#F3E9D8" strokeWidth="3" strokeLinecap="round" />
    <path d="M33 56 L48 41" stroke="#F3E9D8" strokeWidth="2" strokeLinecap="round" />

    {/* Quokka Stylist in center */}
    <g className="anim-quokka-float">
      <circle cx="84" cy="40" r="9.5" fill="#BA7E4D" stroke="#422B1D" strokeWidth="2.8" />
      <circle cx="84" cy="40" r="4.5" fill="#DFB089" />
      <circle cx="118" cy="40" r="9.5" fill="#BA7E4D" stroke="#422B1D" strokeWidth="2.8" />
      <circle cx="118" cy="40" r="4.5" fill="#DFB089" />
      {/* Body */}
      <path
        d="M78 82 C76 62 126 62 124 82 L126 116 Q101 122 76 116 Z"
        fill="#BA7E4D"
        stroke="#422B1D"
        strokeWidth="2.8"
      />
      {/* Cream knit vest on Quokka */}
      <path
        d="M80 86 Q101 94 122 86 L124 115 Q101 121 78 115 Z"
        fill="#FFFDF9"
        stroke="#422B1D"
        strokeWidth="2.6"
      />
      <path d="M93 87 L101 97 L109 87" fill="none" stroke="#D6BEA0" strokeWidth="2.4" />
      {/* Head */}
      <ellipse cx="101" cy="64" rx="25" ry="22" fill="#BA7E4D" stroke="#422B1D" strokeWidth="2.8" />
      {/* Beret */}
      <path
        d="M79 45 C82 31 122 31 123 44 C112 40 89 40 79 45 Z"
        fill="#F3E9D8"
        stroke="#422B1D"
        strokeWidth="2.6"
      />
      {/* Eyes & Smile */}
      <circle cx="92" cy="61" r="2.6" fill="#422B1D" />
      <circle cx="110" cy="61" r="2.6" fill="#422B1D" />
      <ellipse cx="85" cy="67" rx="4.8" ry="3" fill="#F4978E" opacity="0.85" />
      <ellipse cx="117" cy="67" rx="4.8" ry="3" fill="#F4978E" opacity="0.85" />
      <ellipse cx="101" cy="64.5" rx="3.5" ry="2.5" fill="#422B1D" />
      <path
        d="M95.5 69 Q98.2 73 101 68.5 Q103.8 73 106.5 69"
        fill="none"
        stroke="#422B1D"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </g>

    {/* Bobo popping out of a cream tote bag on right */}
    <g className="anim-bobo-pop">
      <circle cx="160" cy="54" r="7" fill="#FFFDF9" stroke="#422B1D" strokeWidth="2.6" />
      <circle cx="178" cy="55" r="7" fill="#FFFDF9" stroke="#422B1D" strokeWidth="2.6" />
      <ellipse cx="169" cy="73" rx="17" ry="18" fill="#FFFDF9" stroke="#422B1D" strokeWidth="2.6" />
      <circle cx="163" cy="68" r="2.2" fill="#422B1D" />
      <circle cx="175" cy="68" r="2.2" fill="#422B1D" />
      <ellipse cx="159" cy="72" rx="3.6" ry="2.1" fill="#F4A49B" opacity="0.85" />
      <ellipse cx="179" cy="72" rx="3.6" ry="2.1" fill="#F4A49B" opacity="0.85" />
      <path
        d="M166.5 72 Q169 75 171.5 72"
        fill="none"
        stroke="#422B1D"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Cream Canvas Tote */}
      <path
        d="M159 84 C159 74 179 74 179 84"
        fill="none"
        stroke="#8E6D56"
        strokeWidth="2.6"
      />
      <path
        d="M148 83 L190 83 L186 118 Q169 121 152 118 Z"
        fill="#F3E9D8"
        stroke="#422B1D"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      {/* Little heart on tote */}
      <path
        d="M169 104 C165 100 162 96 165 94 C167 92.5 169 95 169 96 C169 95 171 92.5 173 94 C176 96 173 100 169 104 Z"
        fill="#EBA39A"
      />
    </g>

    {/* Sparkles */}
    <path d="M142 26 L144 31 L149 33 L144 35 L142 40 L140 35 L135 33 L140 31 Z" fill="#EDC17E" />
    <circle cx="67" cy="24" r="3" fill="#EBA39A" opacity="0.7" />
  </svg>
);

/**
 * 簡約奶油手繪風服飾單品版型插畫（當尚未拍照或作為版型預覽時，自動依單品色系染色！）
 */
export const GarmentVectorIllustration: React.FC<{
  silhouette: GarmentSilhouette;
  colorTone: ColorTone;
  className?: string;
}> = ({ silhouette, colorTone, className = 'w-full h-full' }) => {
  const toneMeta = COLOR_TONE_META[colorTone] || COLOR_TONE_META.cream;
  const fill = toneMeta.hex;
  const trim = toneMeta.borderHex;
  const stroke = '#422B1D';

  const showHanger = ['tee', 'shirt', 'knit', 'cardigan', 'coat', 'blazer', 'dress'].includes(
    silhouette
  );

  return (
    <svg viewBox="0 0 140 140" className={className} aria-hidden="true">
      {/* Subtle cream studio backdrop */}
      <rect width="140" height="140" rx="22" fill="#FAF5EC" />
      <circle cx="70" cy="74" r="46" fill="#FFFDF9" opacity="0.85" />

      {/* Wooden hanger */}
      {showHanger && (
        <g>
          <path
            d="M70 15 C70 10 76 10 76 14 C76 17 70 18 70 22"
            fill="none"
            stroke="#8E6D56"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M48 33 L70 22 L92 33"
            fill="none"
            stroke="#8E6D56"
            strokeWidth="3"
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
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M56 36 Q70 46 84 36" fill="none" stroke={trim} strokeWidth="2.5" />
        </g>
      )}

      {silhouette === 'shirt' && (
        <g>
          <path
            d="M47 33 L93 33 L112 88 L98 92 L89 56 L89 110 Q70 113 51 110 L51 56 L42 92 L28 88 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Shirt collar & buttons */}
          <path
            d="M56 33 L70 46 L84 33"
            fill="#FFFDF9"
            stroke={stroke}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <line x1="70" y1="46" x2="70" y2="110" stroke={trim} strokeWidth="2" />
          <circle cx="70" cy="58" r="1.8" fill={stroke} />
          <circle cx="70" cy="72" r="1.8" fill={stroke} />
          <circle cx="70" cy="86" r="1.8" fill={stroke} />
        </g>
      )}

      {silhouette === 'knit' && (
        <g>
          <path
            d="M45 35 Q70 41 95 35 L113 92 L97 96 L89 60 L89 108 Q70 111 51 108 L51 60 L43 96 L27 92 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Cable knit texture lines */}
          <path
            d="M62 46 Q65 56 62 66 Q59 76 62 86 Q65 96 62 104"
            fill="none"
            stroke={trim}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path
            d="M78 46 Q75 56 78 66 Q81 76 78 86 Q75 96 78 104"
            fill="none"
            stroke={trim}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <line x1="52" y1="103" x2="88" y2="103" stroke={trim} strokeWidth="2.5" />
        </g>
      )}

      {silhouette === 'cardigan' && (
        <g>
          <path
            d="M46 34 L60 34 L70 52 L80 34 L94 34 L113 94 L97 98 L89 60 L89 110 L51 110 L51 60 L43 98 L27 94 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <line x1="70" y1="52" x2="70" y2="110" stroke={stroke} strokeWidth="2.6" />
          {/* Cute wooden buttons */}
          <circle cx="70" cy="64" r="2.8" fill="#BA7E4D" stroke={stroke} strokeWidth="1.6" />
          <circle cx="70" cy="79" r="2.8" fill="#BA7E4D" stroke={stroke} strokeWidth="1.6" />
          <circle cx="70" cy="94" r="2.8" fill="#BA7E4D" stroke={stroke} strokeWidth="1.6" />
        </g>
      )}

      {(silhouette === 'blazer' || silhouette === 'coat') && (
        <g>
          <path
            d="M44 33 L96 33 L113 96 L98 100 L90 58 L92 116 L48 116 L50 58 L42 100 L27 96 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Lapels */}
          <path
            d="M57 33 L70 64 L83 33"
            fill="none"
            stroke={stroke}
            strokeWidth="2.6"
            strokeLinejoin="round"
          />
          <line x1="70" y1="64" x2="70" y2="116" stroke={stroke} strokeWidth="2.2" />
          <circle cx="65" cy="78" r="2.3" fill={stroke} />
          <circle cx="65" cy="92" r="2.3" fill={stroke} />
        </g>
      )}

      {silhouette === 'jeans' && (
        <g>
          <path
            d="M46 28 L94 28 L100 114 L76 114 L70 58 L64 114 L40 114 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <line x1="46" y1="37" x2="94" y2="37" stroke={stroke} strokeWidth="2.4" />
          <circle cx="70" cy="32.5" r="2" fill={stroke} />
          <path d="M47 46 Q55 46 57 38" fill="none" stroke={trim} strokeWidth="2.2" />
          <path d="M93 46 Q85 46 83 38" fill="none" stroke={trim} strokeWidth="2.2" />
        </g>
      )}

      {silhouette === 'slacks' && (
        <g>
          <path
            d="M45 28 L95 28 L103 114 L75 114 L70 56 L65 114 L37 114 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <line x1="45" y1="36" x2="95" y2="36" stroke={stroke} strokeWidth="2.4" />
          {/* Tailored center pleats */}
          <line x1="56" y1="42" x2="52" y2="108" stroke={trim} strokeWidth="1.8" />
          <line x1="84" y1="42" x2="88" y2="108" stroke={trim} strokeWidth="1.8" />
        </g>
      )}

      {silhouette === 'skirt' && (
        <g>
          <path
            d="M50 32 L90 32 L108 110 Q70 117 32 110 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <line x1="49" y1="41" x2="91" y2="41" stroke={stroke} strokeWidth="2.4" />
          <path d="M60 46 L52 106" stroke={trim} strokeWidth="2" strokeLinecap="round" />
          <path d="M80 46 L88 106" stroke={trim} strokeWidth="2" strokeLinecap="round" />
        </g>
      )}

      {silhouette === 'dress' && (
        <g>
          <path
            d="M50 34 L62 34 Q70 43 78 34 L90 34 L96 54 L86 58 L84 64 L106 114 Q70 120 34 114 L56 64 L54 58 L44 54 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M56 64 Q70 68 84 64" fill="none" stroke={trim} strokeWidth="2.4" />
        </g>
      )}

      {silhouette === 'sneakers' && (
        <g>
          <path
            d="M28 88 L34 58 L56 58 L74 74 L106 76 Q116 78 114 92 L26 92 Z"
            fill={fill}
            stroke={stroke}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Gum sole */}
          <rect
            x="25"
            y="90"
            width="90"
            height="10"
            rx="5"
            fill="#CFA072"
            stroke={stroke}
            strokeWidth="2.8"
          />
          <line x1="60" y1="64" x2="68" y2="59" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
          <line x1="67" y1="70" x2="75" y2="65" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
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
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <rect
            x="28"
            y="92"
            width="85"
            height="8"
            rx="3"
            fill="#422B1D"
          />
          {/* Mary-Jane / Loafer strap */}
          <path d="M66 68 L62 84" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
          <circle cx="64" cy="75" r="2.5" fill="#EDC17E" />
        </g>
      )}

      {(silhouette === 'tote' || silhouette === 'crossbody') && (
        <g>
          <path
            d="M52 54 C52 30 88 30 88 54"
            fill="none"
            stroke={stroke}
            strokeWidth="3.2"
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
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* Cute little Bobo charm tag */}
          <circle cx="88" cy="70" r="6.5" fill="#FFFDF9" stroke={stroke} strokeWidth="2.2" />
          <circle cx="86" cy="69" r="1.1" fill={stroke} />
          <circle cx="90" cy="69" r="1.1" fill={stroke} />
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
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <ellipse
                cx="70"
                cy="83"
                rx="38"
                ry="8"
                fill={fill}
                stroke={stroke}
                strokeWidth="2.8"
              />
              <path d="M69 53 L72 46" stroke={stroke} strokeWidth="3.2" strokeLinecap="round" />
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
                strokeWidth="3"
              />
              <path
                d="M68 68 L62 108 L84 108 L80 68 Z"
                fill={fill}
                stroke={stroke}
                strokeWidth="3"
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
 * 統一單品視覺卡（有真實照片時以奶油拍立得邊框呈現，無照片時顯示同色系奶油手繪插畫）
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
      className={`relative overflow-hidden rounded-2xl bg-[#FAF5EC] border border-[#EADBC6] ${className}`}
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
