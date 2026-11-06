import { describe, expect, it } from 'vitest';
import {
  createInitialVaultState,
  deriveSyncChannels,
  hashOwnerPasscode,
  mergeVaultStates,
} from '../services/cloudSync';
import { ClosetVaultState, WardrobeItem } from '../types/wardrobe';

describe('cloudSync safety & deterministic keys', () => {
  it('derives identical deterministic vault keys from the same passcode', async () => {
    const h1 = await hashOwnerPasscode('my-cream-closet');
    const h2 = await hashOwnerPasscode('  my-cream-closet  ');
    expect(h1).toBe(h2);

    const ch1 = await deriveSyncChannels(h1);
    const ch2 = await deriveSyncChannels(h2);
    expect(ch1?.vaultKey).toBe(ch2?.vaultKey);
    expect(ch1?.imgPrefix).toBe(ch2?.imgPrefix);
  });

  it('never overwrites edited remote cloud items with unedited default state and respects tombstones', () => {
    const freshBrowserDefault = createInitialVaultState(); // updatedAt = 1000

    const customSweater: WardrobeItem = {
      id: 'real-sweater-01',
      name: '新買的奶油麻花毛衣',
      category: 'tops',
      subCategory: '針織毛衣',
      colorTone: 'cream',
      colorHex: '#FFFDF7',
      seasons: ['autumn', 'winter'],
      occasions: ['cafe', 'dinner'],
      warmth: 4,
      silhouette: 'knit',
      wearCount: 1,
      createdAt: 50000,
      updatedAt: 50000,
    };

    const cloudEdited: ClosetVaultState = {
      items: [customSweater],
      outfits: [],
      deletedItemIds: { 'sample-top-cream-tee': 60000 },
      deletedOutfitIds: {},
      hideSamples: true,
      updatedAt: 60000,
    };

    const merged = mergeVaultStates(freshBrowserDefault, cloudEdited);
    expect(merged.hideSamples).toBe(true);
    expect(merged.items.some((i) => i.id === 'real-sweater-01')).toBe(true);
    expect(merged.items.some((i) => i.id === 'sample-top-cream-tee')).toBe(false);
  });

  it('merges customSubCategories across browsers without losing custom styles', () => {
    const stateA: ClosetVaultState = {
      ...createInitialVaultState(),
      customSubCategories: { tops: ['泡泡袖襯衫'], bottoms: ['繭型褲'] },
      updatedAt: 20000,
    };
    const stateB: ClosetVaultState = {
      ...createInitialVaultState(),
      customSubCategories: { tops: ['polo領針織', '泡泡袖襯衫'], dresses: ['魚尾長裙'] },
      updatedAt: 30000,
    };

    const merged = mergeVaultStates(stateA, stateB);
    expect(merged.customSubCategories?.tops).toHaveLength(2);
    expect(merged.customSubCategories?.tops).toEqual(
      expect.arrayContaining(['泡泡袖襯衫', 'polo領針織'])
    );
    expect(merged.customSubCategories?.bottoms).toEqual(['繭型褲']);
    expect(merged.customSubCategories?.dresses).toEqual(['魚尾長裙']);
  });
});
