import { describe, expect, it } from 'vitest';
import { STARTER_SAMPLE_ITEMS, STARTER_SAMPLE_OUTFITS } from '../data/defaultWardrobe';
import { StylingContextInput } from '../types/wardrobe';
import { generateOutfitProposals } from '../utils/outfitEngine';

describe('outfitEngine', () => {
  const defaultCtx: StylingContextInput = {
    timeOfDay: 'afternoon',
    temperature: 22,
    weather: 'sunny',
    occasion: 'cafe',
    locationNote: '中山赤峰街咖啡廳',
    companions: '',
    moodPalette: 'any',
    lockedItemIds: [],
  };

  it('generates up to 3 cohesive outfit proposals for cafe afternoon', () => {
    const proposals = generateOutfitProposals(
      STARTER_SAMPLE_ITEMS,
      defaultCtx,
      STARTER_SAMPLE_OUTFITS
    );
    expect(proposals.length).toBeGreaterThanOrEqual(2);
    expect(proposals.length).toBeLessThanOrEqual(3);
    expect(proposals[0].stylistComment).toContain('中山赤峰街咖啡廳');
  });

  it('excludes items marked as inLaundry unless explicitly locked', () => {
    const modified = STARTER_SAMPLE_ITEMS.map((item) =>
      item.id === 'sample-top-cream-tee' ? { ...item, inLaundry: true } : item
    );
    const proposals = generateOutfitProposals(modified, defaultCtx, []);
    for (const p of proposals) {
      expect(p.items.some((i) => i.id === 'sample-top-cream-tee')).toBe(false);
    }
  });

  it('honors lockedItemIds in every returned proposal', () => {
    const lockedCtx: StylingContextInput = {
      ...defaultCtx,
      lockedItemIds: ['sample-top-sky-shirt'],
    };
    const proposals = generateOutfitProposals(STARTER_SAMPLE_ITEMS, lockedCtx, []);
    expect(proposals.length).toBeGreaterThan(0);
    for (const p of proposals) {
      expect(p.items.some((i) => i.id === 'sample-top-sky-shirt')).toBe(true);
    }
  });
});
