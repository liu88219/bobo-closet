import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createInitialVaultState,
  deriveSyncChannels,
  hashOwnerPasscode,
  mergeVaultStates,
  readTextDb,
  resolveBestPasshashOnBind,
  saveLocalVault,
  savePasshash,
  syncVaultWithCloud,
  writeTextDb,
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

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('shards all 4 garment image fields (imageUrl/flatlayUrl/realCropUrl/pastelUrl), frees localStorage quota, chunks >40KB, and rescues iOS case-shifted passcodes', async () => {
    const cloudKv = new Map<string, string>();
    let browserStorage = new Map<string, string>();

    vi.stubGlobal('localStorage', {
      getItem: (k: string) => browserStorage.get(k) ?? null,
      setItem: (k: string, v: string) => browserStorage.set(k, v),
      removeItem: (k: string) => browserStorage.delete(k),
    });

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes('api.textdb.online/update/')) {
          const params = new URLSearchParams(String(init?.body || ''));
          const k = params.get('key') || '';
          const v = params.get('value') || '';
          if (v.length > 200000) {
            return new Response(JSON.stringify({ status: 0, error: '内容最多20万字符' }), {
              status: 200,
            });
          }
          cloudKv.set(`online:${k}`, v);
          return new Response(JSON.stringify({ status: 1 }), { status: 200 });
        }
        if (url.includes('textdb.online/')) {
          const keyPart = decodeURIComponent(url.split('textdb.online/')[1].split('?')[0]);
          return new Response(cloudKv.get(`online:${keyPart}`) || '', { status: 200 });
        }
        if (url.includes('textdb.dev/api/data/')) {
          const keyPart = decodeURIComponent(url.split('textdb.dev/api/data/')[1].split('?')[0]);
          if (init?.method === 'POST') {
            const parsed = JSON.parse(String(init.body || '{}'));
            cloudKv.set(`dev:${keyPart}`, parsed.payload || '');
            return new Response(JSON.stringify(parsed), { status: 200 });
          }
          const saved = cloudKv.get(`dev:${keyPart}`);
          return new Response(saved ? JSON.stringify({ payload: saved }) : '', { status: 200 });
        }
        return new Response('', { status: 200 });
      })
    );

    // 1. Test >90KB chunked write & read
    const bigText = 'Z'.repeat(92000);
    expect(await writeTextDb('closet_chunk_test', bigText)).toBe(true);
    expect(cloudKv.get('online:closet_chunk_test')?.startsWith('CLCHUNK1:3:')).toBe(true);
    expect(await readTextDb('closet_chunk_test')).toBe(bigText);

    // 2. Test Safari pushes 3-view cropped garment + OOTD selfie and strips Base64 from localStorage
    const safariHash = await hashOwnerPasscode('ClosetPass99');
    savePasshash(safariHash);

    const imgMain = `data:image/webp;base64,${'A'.repeat(12000)}`;
    const imgFlat = `data:image/webp;base64,${'B'.repeat(10000)}`;
    const imgPastel = `data:image/webp;base64,${'C'.repeat(9000)}`;
    const selfieImg = `data:image/webp;base64,${'D'.repeat(11000)}`;

    const threeViewItem: WardrobeItem = {
      id: 'user-crop-jacket-1',
      name: '奶油牛角扣外套',
      category: 'outerwear',
      subCategory: '長版風衣/大衣',
      colorTone: 'oat',
      colorHex: '#E8DFD1',
      seasons: ['winter'],
      occasions: ['cafe'],
      warmth: 4,
      silhouette: 'coat',
      imageUrl: imgMain,
      realCropUrl: imgMain, // Identical to imageUrl -> deduplicated to 1 content-hash shard!
      flatlayUrl: imgFlat,
      pastelUrl: imgPastel,
      wearCount: 3,
      createdAt: 70000,
      updatedAt: 70000,
    };

    const safariVault: ClosetVaultState = {
      ...createInitialVaultState(),
      items: [threeViewItem],
      outfits: [
        {
          id: 'ootd-1',
          title: '冬日咖啡廳穿搭',
          itemIds: ['user-crop-jacket-1'],
          occasion: 'cafe',
          timeOfDay: 'afternoon',
          temperature: 16,
          weather: 'sunny',
          locationNote: '中山站',
          stylistComment: '溫暖療癒',
          colorFormula: '燕麥＋奶油',
          selfieUrl: selfieImg,
          isFavorite: true,
          createdAt: 70000,
          updatedAt: 70000,
        },
      ],
      updatedAt: 70000,
    };

    saveLocalVault(safariVault);
    const savedLsJson = browserStorage.get('bobocloset_vault_state_v1') || '';
    expect(savedLsJson).not.toContain('data:image/webp;base64');

    const pushRes = await syncVaultWithCloud(safariVault, true);
    expect(pushRes.synced).toBe(true);
    expect(pushRes.pushedToCloud).toBe(true);
    expect(pushRes.errorMessage).toBeUndefined();

    // 3. Simulate isolated iPhone Home Screen standalone sandbox with lowercase 'closetPass99'
    browserStorage = new Map<string, string>();
    const rescuedHash = await resolveBestPasshashOnBind('closetPass99');
    expect(rescuedHash).toBe(safariHash);
    savePasshash(rescuedHash);

    const homePull = await syncVaultWithCloud(createInitialVaultState(), false);
    expect(homePull.pulledFromCloud).toBe(true);
    const syncedJacket = homePull.vault.items.find((i) => i.id === 'user-crop-jacket-1');
    expect(syncedJacket?.imageUrl).toBe(imgMain);
    expect(syncedJacket?.realCropUrl).toBe(imgMain);
    expect(syncedJacket?.flatlayUrl).toBe(imgFlat);
    expect(syncedJacket?.pastelUrl).toBe(imgPastel);
    expect(syncedJacket?.wearCount).toBe(3);

    const syncedOotd = homePull.vault.outfits.find((o) => o.id === 'ootd-1');
    expect(syncedOotd?.selfieUrl).toBe(selfieImg);
  });
});
