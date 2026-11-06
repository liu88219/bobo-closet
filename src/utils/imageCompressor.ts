import { COLOR_TONE_META, ColorTone } from '../types/wardrobe';

export interface ProcessedWardrobePhoto {
  dataUrl: string;
  suggestedColorTone: ColorTone;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

/**
 * 從衣服中央區域取樣像素，自動推測最接近的奶油衣櫥色系標籤
 */
export function detectClosestColorTone(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): ColorTone {
  try {
    const startX = Math.floor(width * 0.25);
    const startY = Math.floor(height * 0.22);
    const sampleW = Math.max(1, Math.floor(width * 0.5));
    const sampleH = Math.max(1, Math.floor(height * 0.55));
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
      // Weighted perceptual RGB distance
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

/**
 * 將手機拍攝或相簿上傳的衣服高解析照片壓縮為輕量清晰 WebP / JPEG (約 18~30KB)，
 * 確保跨瀏覽器雲端同步 (iPhone 主畫面 App ↔ Safari) 快速秒傳不爆容量！
 */
export function compressClothingImage(
  file: File,
  maxDimension = 560,
  quality = 0.76
): Promise<ProcessedWardrobePhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('無法讀取照片檔案'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('照片格式無法解析'));
      img.onload = () => {
        let targetW = img.width;
        let targetH = img.height;

        if (targetW > maxDimension || targetH > maxDimension) {
          if (targetW >= targetH) {
            targetH = Math.round((targetH * maxDimension) / targetW);
            targetW = maxDimension;
          } else {
            targetW = Math.round((targetW * maxDimension) / targetH);
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

        // Fill warm cream background for transparent PNGs so all items look unified!
        ctx.fillStyle = '#FFFDF9';
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const suggestedColorTone = detectClosestColorTone(ctx, targetW, targetH);

        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve({ dataUrl, suggestedColorTone });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
