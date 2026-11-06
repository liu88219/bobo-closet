import {
  COLOR_TONE_META,
  ColorTone,
  GeneratedOutfitProposal,
  OCCASION_META,
  SavedOutfit,
  SeasonTag,
  StylingContextInput,
  TIME_META,
  WEATHER_META,
  WardrobeItem,
  WarmthLevel,
} from '../types/wardrobe';

function targetWarmthForTemp(temp: number, weather: StylingContextInput['weather']): WarmthLevel {
  const effectiveTemp = weather === 'ac_cold' ? temp - 3 : temp;
  if (effectiveTemp >= 28) return 1;
  if (effectiveTemp >= 23) return 2;
  if (effectiveTemp >= 18) return 3;
  if (effectiveTemp >= 14) return 4;
  return 5;
}

function targetSeasonsForTemp(temp: number): SeasonTag[] {
  if (temp >= 27) return ['summer', 'spring'];
  if (temp >= 21) return ['spring', 'autumn', 'summer'];
  if (temp >= 16) return ['autumn', 'spring', 'winter'];
  return ['winter', 'autumn'];
}

function scoreColorHarmony(
  tones: ColorTone[],
  mood: StylingContextInput['moodPalette']
): { bonus: number; formulaLabel: string } {
  const uniqueTones = Array.from(new Set(tones));
  const nonNeutrals = uniqueTones.filter((t) => !COLOR_TONE_META[t].isNeutral);
  let bonus = 0;

  // Korean minimalist cream rule: <= 1 pastel accent color + warm neutrals looks super cohesive
  if (nonNeutrals.length === 0) {
    bonus += 16;
  } else if (nonNeutrals.length === 1) {
    bonus += 20;
  } else if (nonNeutrals.length >= 3) {
    bonus -= 18;
  }

  const hasCreamOrOat = tones.includes('cream') || tones.includes('oat');
  const hasCamelOrCocoa = tones.includes('camel') || tones.includes('cocoa');
  const hasDenimOrSky = tones.includes('denim') || tones.includes('sky');

  if (hasCreamOrOat) bonus += 10;

  if (mood === 'cream_tonal') {
    const allCreamFamily = uniqueTones.every((t) =>
      ['cream', 'oat', 'camel', 'butter', 'cocoa'].includes(t)
    );
    if (allCreamFamily) bonus += 26;
  } else if (mood === 'clean_denim') {
    if (hasCreamOrOat && hasDenimOrSky) bonus += 26;
  } else if (mood === 'latte_earth') {
    if (hasCamelOrCocoa && hasCreamOrOat) bonus += 26;
  } else if (mood === 'pastel_point') {
    if (nonNeutrals.length === 1 && hasCreamOrOat) bonus += 26;
  }

  const labels = uniqueTones.slice(0, 3).map((t) => COLOR_TONE_META[t].label);
  let vibeTag = '溫柔低飽和平衡';
  if (hasCreamOrOat && hasDenimOrSky) {
    vibeTag = '韓系清爽鹽奶油配色';
  } else if (hasCreamOrOat && hasCamelOrCocoa && nonNeutrals.length === 0) {
    vibeTag = '燕麥拿鐵漸層同色系';
  } else if (nonNeutrals.length === 1 && hasCreamOrOat) {
    vibeTag = '奶油底色 × 柔和單點亮色';
  }

  return {
    bonus,
    formulaLabel: `${labels.join(' × ')}（${vibeTag}）`,
  };
}

function scoreSingleItemForContext(
  item: WardrobeItem,
  ctx: StylingContextInput,
  targetWarmth: WarmthLevel,
  seasons: SeasonTag[]
): number {
  let score = 50;

  if (item.occasions.includes(ctx.occasion)) {
    score += 24;
  } else {
    score -= 8;
  }

  if (item.seasons.some((s) => seasons.includes(s))) {
    score += 12;
  }

  // Warmth distance (accessories & bags don't penalize warmth)
  if (item.category !== 'bags' && item.category !== 'accessories' && item.category !== 'shoes') {
    const diff = Math.abs(item.warmth - targetWarmth);
    score += Math.max(0, 18 - diff * 8);
  }

  // Rainy day protection: avoid floor-dragging or delicate suede/canvas non-rainFriendly bottoms & shoes
  if (ctx.weather === 'rainy') {
    if (item.rainFriendly) {
      score += 16;
    } else if (item.category === 'shoes' || item.category === 'bottoms' || item.category === 'dresses') {
      score -= 20;
    }
  }

  // Favor beloved items slightly while also giving neglected wardrobe pieces a chance to shine
  if (item.isFavorite) score += 6;
  if (item.wearCount === 0) score += 7;
  else if (item.wearCount <= 3) score += 4;

  return score;
}

/**
 * 依據時間、地點、氣溫、天氣、場合、鎖定單品與同行友人，從現有衣櫥挑出 Top 3 套完整穿搭提案
 */
export function generateOutfitProposals(
  allItems: WardrobeItem[],
  ctx: StylingContextInput,
  savedOutfits: SavedOutfit[] = []
): GeneratedOutfitProposal[] {
  // Exclude items currently in the laundry basket unless explicitly locked by user
  const lockedSet = new Set(ctx.lockedItemIds);
  const available = allItems.filter((item) => !item.inLaundry || lockedSet.has(item.id));

  const tops = available.filter((i) => i.category === 'tops');
  const bottoms = available.filter((i) => i.category === 'bottoms');
  const dresses = available.filter((i) => i.category === 'dresses');
  const outerwears = available.filter((i) => i.category === 'outerwear');
  const shoesList = available.filter((i) => i.category === 'shoes');
  const bags = available.filter((i) => i.category === 'bags');
  const accessories = available.filter((i) => i.category === 'accessories');

  const targetWarmth = targetWarmthForTemp(ctx.temperature, ctx.weather);
  const targetSeasons = targetSeasonsForTemp(ctx.temperature);

  const needsOuterwear =
    ctx.temperature <= 23 ||
    ctx.weather === 'ac_cold' ||
    ctx.weather === 'rainy' ||
    ctx.timeOfDay === 'morning' ||
    ctx.timeOfDay === 'evening' ||
    ctx.timeOfDay === 'night' ||
    available.some((i) => lockedSet.has(i.id) && i.category === 'outerwear');

  // Build core silhouettes: (Top + Bottom) or (Dress)
  const coreCombos: WardrobeItem[][] = [];

  for (const top of tops) {
    for (const btm of bottoms) {
      coreCombos.push([top, btm]);
    }
  }
  for (const dress of dresses) {
    coreCombos.push([dress]);
  }
  // Fallback if user has only entered tops OR only bottoms so far
  if (coreCombos.length === 0) {
    for (const top of tops) coreCombos.push([top]);
    for (const btm of bottoms) coreCombos.push([btm]);
  }

  if (coreCombos.length === 0) {
    return [];
  }

  // Check past outfits worn with the same companion to avoid awkward exact repeats!
  const cleanCompanion = ctx.companions.trim().toLowerCase();
  const companionPastItemSets = cleanCompanion
    ? savedOutfits
        .filter(
          (o) =>
            o.companions &&
            o.companions.toLowerCase().includes(cleanCompanion)
        )
        .map((o) => ({ title: o.title, wornDate: o.wornDate, ids: new Set(o.itemIds) }))
    : [];

  interface ScoredCandidate {
    items: WardrobeItem[];
    score: number;
    colorFormula: string;
    companionWarning?: string;
  }

  const candidates: ScoredCandidate[] = [];

  const outerOptions: Array<WardrobeItem | null> = needsOuterwear
    ? outerwears.length > 0
      ? [...outerwears, ...(ctx.temperature >= 21 ? [null] : [])]
      : [null]
    : [null, ...outerwears.slice(0, 2)];

  const shoeOptions: Array<WardrobeItem | null> =
    shoesList.length > 0 ? shoesList : [null];
  const bagOptions: Array<WardrobeItem | null> =
    bags.length > 0 ? bags : [null];

  for (const core of coreCombos) {
    for (const outer of outerOptions) {
      for (const shoe of shoeOptions) {
        const chosenBag =
          bagOptions
            .filter((b): b is WardrobeItem => b !== null)
            .sort(
              (a, b) =>
                scoreSingleItemForContext(b, ctx, targetWarmth, targetSeasons) -
                scoreSingleItemForContext(a, ctx, targetWarmth, targetSeasons)
            )[0] || null;

        const baseItems: WardrobeItem[] = [
          ...core,
          ...(outer ? [outer] : []),
          ...(shoe ? [shoe] : []),
          ...(chosenBag ? [chosenBag] : []),
        ];

        // Optionally pair 1 matching accessory for cafe/travel/dinner or locked accessory
        const lockedAcc = accessories.find((a) => lockedSet.has(a.id));
        const bestAcc =
          lockedAcc ||
          (['cafe', 'travel', 'dinner'].includes(ctx.occasion) && accessories.length > 0
            ? accessories[0]
            : null);

        const fullItems = bestAcc ? [...baseItems, bestAcc] : baseItems;
        const fullIds = new Set(fullItems.map((i) => i.id));

        // Must include all locked items!
        let satisfiesLocks = true;
        for (const reqId of lockedSet) {
          if (!fullIds.has(reqId)) {
            satisfiesLocks = false;
            break;
          }
        }
        if (!satisfiesLocks) continue;

        let totalScore = 0;
        for (const item of fullItems) {
          totalScore += scoreSingleItemForContext(item, ctx, targetWarmth, targetSeasons);
        }
        totalScore = totalScore / fullItems.length;

        if (needsOuterwear && outer) {
          totalScore += 12;
        } else if (!needsOuterwear && outer && ctx.temperature >= 27 && ctx.weather !== 'ac_cold') {
          totalScore -= 16;
        }

        const harmony = scoreColorHarmony(
          fullItems.map((i) => i.colorTone),
          ctx.moodPalette
        );
        totalScore += harmony.bonus;

        // Check if this exact core outfit was already worn with the same friend
        let companionWarning: string | undefined;
        for (const past of companionPastItemSets) {
          const overlapCount = core.filter((c) => past.ids.has(c.id)).length;
          if (overlapCount === core.length && core.length > 0) {
            totalScore -= 22;
            companionWarning = `小提醒：這組主穿搭曾與「${ctx.companions.trim()}」見面時穿過${
              past.wornDate ? `（${past.wornDate}）` : ''
            }`;
          }
        }

        candidates.push({
          items: fullItems,
          score: Math.round(totalScore),
          colorFormula: harmony.formulaLabel,
          companionWarning,
        });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  // Pick up to 3 visually distinct proposals (avoiding identical core top+bottom repeats)
  const selected: ScoredCandidate[] = [];
  const usedCoreSignatures = new Set<string>();

  for (const cand of candidates) {
    const coreSig = cand.items
      .filter((i) => i.category === 'tops' || i.category === 'bottoms' || i.category === 'dresses')
      .map((i) => i.id)
      .sort()
      .join('+');

    if (usedCoreSignatures.has(coreSig) && candidates.length > 3) {
      continue;
    }
    usedCoreSignatures.add(coreSig);
    selected.push(cand);
    if (selected.length >= 3) break;
  }

  // Fallback if fewer than 3 unique core signatures existed
  if (selected.length < 3) {
    for (const cand of candidates) {
      if (!selected.includes(cand)) {
        selected.push(cand);
        if (selected.length >= 3) break;
      }
    }
  }

  const occasionInfo = OCCASION_META[ctx.occasion];
  const timeInfo = TIME_META[ctx.timeOfDay];
  const weatherInfo = WEATHER_META[ctx.weather];

  const styleBadges = ['Quokka 首選奶油提案', 'Bobo 輕盈層次提案', '溫柔日常零失誤提案'];

  return selected.map((cand, idx) => {
    const outer = cand.items.find((i) => i.category === 'outerwear');
    const mainPieces = cand.items
      .filter((i) => ['tops', 'bottoms', 'dresses'].includes(i.category))
      .map((i) => `「${i.name}」`)
      .join('搭配');
    const shoe = cand.items.find((i) => i.category === 'shoes');

    const placeStr = ctx.locationNote.trim()
      ? `前往「${ctx.locationNote.trim()}」的`
      : '';

    let weatherTip = `${timeInfo.label}約 ${ctx.temperature}°C（${weatherInfo.label}）：${timeInfo.tempHint}。`;
    if (ctx.weather === 'rainy') {
      weatherTip = `🌧️ 雨天約 ${ctx.temperature}°C：已優先挑選防潑水／不易濺濕褲腳的單品，出門記得帶把奶油色摺疊傘喔！`;
    } else if (ctx.weather === 'ac_cold') {
      weatherTip = `❄️ 室內冷氣偏強（戶外約 ${ctx.temperature}°C）：${
        outer
          ? `隨身帶上「${outer.name}」進室內穿、戶外可披肩造型`
          : '建議包裡多備一件薄針織披肩防著涼'
      }！`;
    }

    const stylistComment = `針對${placeStr}${occasionInfo.label}（${occasionInfo.desc}），以${mainPieces}作為視覺主角${
      outer ? `，外層疊穿「${outer.name}」增添韓系鬆弛層次感` : ''
    }${shoe ? `，腳踩「${shoe.name}」兼顧比例與舒適度` : ''}。整體呈現${cand.colorFormula}，拍照與實穿都溫柔耐看！`;

    return {
      id: `proposal-${idx + 1}-${Date.now()}`,
      title: `${styleBadges[idx] || '穿搭提案'} · ${occasionInfo.label}`,
      items: cand.items,
      score: Math.min(99, Math.max(76, cand.score)),
      colorFormula: cand.colorFormula,
      stylistComment,
      weatherTip,
      companionWarning: cand.companionWarning,
    };
  });
}

/**
 * 產生可一鍵複製貼給 AI 助手對話框的衣櫥與情境摘要 Prompt
 */
export function buildAiPromptFromContext(
  items: WardrobeItem[],
  ctx: StylingContextInput
): string {
  const cleanItems = items.filter((i) => !i.inLaundry);
  const grouped = cleanItems
    .map(
      (i) =>
        `- [${i.category}] ${i.name}（${COLOR_TONE_META[i.colorTone].label} / 厚度Lv.${i.warmth}${
          i.fitNote ? ` / ${i.fitNote}` : ''
        }）`
    )
    .join('\n');

  const lockedNames = items
    .filter((i) => ctx.lockedItemIds.includes(i.id))
    .map((i) => i.name)
    .join('、');

  return [
    `請幫我用 BoboCloset 奶油衣櫥裡的衣服搭配今日穿搭 ✨`,
    `・時間時段：${TIME_META[ctx.timeOfDay].label} (${TIME_META[ctx.timeOfDay].badge})`,
    `・地點場合：${ctx.locationNote.trim() || '日常外出'} / ${OCCASION_META[ctx.occasion].label}`,
    `・天氣氣溫：約 ${ctx.temperature}°C，${WEATHER_META[ctx.weather].label}`,
    ctx.companions.trim() ? `・同行見面對象：${ctx.companions.trim()}` : '',
    lockedNames ? `・今天特別想穿的單品：${lockedNames}` : '',
    ``,
    `目前乾淨可穿的衣櫥單品清單（共 ${cleanItems.length} 件）：`,
    grouped,
  ]
    .filter(Boolean)
    .join('\n');
}
