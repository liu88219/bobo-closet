import { COLOR_TONE_META, ColorTone } from '../types/wardrobe';

export interface ProcessedWardrobePhoto {
  dataUrl: string;
  suggestedColorTone: ColorTone;
}

/** Normalized crop rectangle (0..1 relative to source image width & height) */
export interface NormalizedCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * 從裁切後的單品中央區域取樣像素，自動推測最接近的奶油衣櫥色系標籤
 */
export function detectClosestColorTone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): ColorTone {
  try {
    const startX = Math.floor(width * 0.22);
    const startY = Math.floor(height * 0.2);
    const sampleW = Math.max(1, Math.floor(width * 0.56));
    const sampleH = Math.max(1, Math.floor(height * 0.6));
    const data = ctx.getImageData(startX, startY, sampleW, sampleH).data;

    let rSum = 0;
    let gSum = 0;
    let bSum = 0;
    let count = 0;

    for (let i = 0; i < data.length; i += 16) {
      const alpha = data[i + 3];
      if (alpha < 128) continue;
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      count++;
    }

    if (count === 0) return 'cream';
    const avgR = rSum / count;
    const avgG = gSum / count;
    const avgB = bSum / count;

    let bestTone: ColorTone = 'cream';
    let bestDist = Number.POSITIVE_INFINITY;

    (Object.keys(COLOR_TONE_META) as ColorTone[]).forEach((tone) => {
      const [tr, tg, tb] = hexToRgb(COLOR_TONE_META[tone].hex);
      const dr = avgR - tr;
      const dg = avgG - tg;
      const db = avgB - tb;
      const dist = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (dist < bestDist) {
        bestDist = dist;
        bestTone = tone;
      }
    });

    return bestTone;
  } catch {
    return 'cream';
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('無法讀取照片檔案'));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

/**
 * 依據使用者框選的局部區域 (NormalizedCropRect) 進行精準裁切、壓縮與單品色系辨識
 */
export function cropAndCompressDataUrl(
  sourceDataUrl: string,
  cropRect: NormalizedCropRect = { x: 0, y: 0, width: 1, height: 1 },
  maxDimension = 560,
  quality = 0.78
): Promise<ProcessedWardrobePhoto> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error('照片格式無法解析'));
    img.onload = () => {
      const clampedX = Math.max(0, Math.min(0.95, cropRect.x));
      const clampedY = Math.max(0, Math.min(0.95, cropRect.y));
      const clampedW = Math.max(0.05, Math.min(1 - clampedX, cropRect.width));
      const clampedH = Math.max(0.05, Math.min(1 - clampedY, cropRect.height));

      const srcX = Math.round(clampedX * img.width);
      const srcY = Math.round(clampedY * img.height);
      const srcW = Math.max(1, Math.round(clampedW * img.width));
      const srcH = Math.max(1, Math.round(clampedH * img.height));

      let targetW = srcW;
      let targetH = srcH;

      if (targetW > maxDimension || targetH > maxDimension) {
        if (targetW >= targetH) {
          targetH = Math.max(1, Math.round((targetH * maxDimension) / targetW));
          targetW = maxDimension;
        } else {
          targetW = Math.max(1, Math.round((targetW * maxDimension) / targetH));
          targetH = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('無法初始化畫布'));
        return;
      }

      // Warm matte cream backdrop for transparent PNGs
      ctx.fillStyle = '#FAF8F3';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

      const suggestedColorTone = detectClosestColorTone(ctx, targetW, targetH);

      let dataUrl = canvas.toDataURL('image/webp', quality);
      if (!dataUrl.startsWith('data:image/webp')) {
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      resolve({ dataUrl, suggestedColorTone });
    };
    img.src = sourceDataUrl;
  });
}

/**
 * 將整張照片直接壓縮為輕量清晰 WebP / JPEG (保留向後相容與 OOTD 自拍照使用)
 */
export async function compressClothingImage(
  file: File,
  maxDimension = 560,
  quality = 0.76
): Promise<ProcessedWardrobePhoto> {
  const rawDataUrl = await readFileAsDataUrl(file);
  return cropAndCompressDataUrl(
    rawDataUrl,
    { x: 0, y: 0, width: 1, height: 1 },
    maxDimension,
    quality
  );
}
