import LZString from 'lz-string';
import {
  OFFICIAL_CURATED_OUTFITS,
  OFFICIAL_WARDROBE_ITEMS,
  STARTER_SAMPLE_ITEMS,
  STARTER_SAMPLE_OUTFITS,
} from '../data/defaultWardrobe';
import {
  ClosetVaultState,
  ClothingCategory,
  SavedOutfit,
  WardrobeItem,
} from '../types/wardrobe';

const LOCAL_VAULT_KEY = 'bobocloset_vault_state_v1';
const PASSHASH_STORAGE_KEY = 'bobocloset_owner_passhash_v1';
const TEXTDB_UPDATE_URL = 'https://api.textdb.online/update/';
const TEXTDB_READ_URL = 'https://textdb.online';
const RELAY_BASE_URL = 'https://ntfy.sh';

const IDB_NAME = 'BoboClosetDB';
const IDB_VAULT_STORE = 'vault';
const IDB_IMG_STORE = 'images';
const IDB_MAIN_KEY = 'main_vault_v1';

const CLOUD_IMG_PREFIX = 'cloudimg:';

export interface DerivedSyncChannels {
  vaultKey: string;
  imgPrefix: string;
  relayTopic: string;
  shareReadKey: string;
}

function sanitizeToken(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Deterministic fallback for non-subtle test environments
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0') +
    sanitizeToken(input).slice(0, 20)
  );
}

/**
 * 將使用者輸入的通行碼轉為不可逆 SHA-256 雜湊（公開程式碼零機密，跨瀏覽器輸入相同通行碼必定對齊同一金鑰）
 */
export async function hashOwnerPasscode(passcode: string): Promise<string> {
  const normalized = passcode.trim();
  return sha256Hex(`bobocloset_passcode_v1:${normalized}`);
}

export function getSavedPasshash(): string | null {
  try {
    const val = localStorage.getItem(PASSHASH_STORAGE_KEY);
    return val && val.length >= 12 ? val : null;
  } catch {
    return null;
  }
}

export function savePasshash(passhash: string | null): void {
  try {
    if (!passhash) {
      localStorage.removeItem(PASSHASH_STORAGE_KEY);
    } else {
      localStorage.setItem(PASSHASH_STORAGE_KEY, passhash);
    }
  } catch {
    // ignore storage quota errors
  }
}

export async function deriveSyncChannels(
  passhash?: string | null
): Promise<DerivedSyncChannels | null> {
  const activeHash = passhash ?? getSavedPasshash();
  if (!activeHash || activeHash.length < 12) return null;

  const vaultHex = await sha256Hex(`bobocloset_vault_kv_v1:${activeHash}`);
  const relayHex = await sha256Hex(`bobocloset_live_sse_v1:${activeHash}`);
  const shareHex = await sha256Hex(`bobocloset_readonly_share_v1:${activeHash}`);

  return {
    vaultKey: `bobocloset_v1_${vaultHex.slice(0, 34)}`,
    imgPrefix: `bobocloset_img_v1_${vaultHex.slice(0, 20)}`,
    relayTopic: `bobocloset_sse_v1_${relayHex.slice(0, 30)}`,
    shareReadKey: shareHex.slice(0, 24),
  };
}

/**
 * 永久雲端 KV 寫入 (強制使用 application/x-www-form-urlencoded + URLSearchParams 防止 '+' 變空白字元)
 */
export async function writeTextDb(key: string, value: string): Promise<boolean> {
  try {
    const body = new URLSearchParams({ key, value }).toString();
    const res = await fetch(TEXTDB_UPDATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function readTextDb(key: string): Promise<string | null> {
  try {
    const res = await fetch(`${TEXTDB_READ_URL}/${encodeURIComponent(key)}?t=${Date.now()}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * 申請瀏覽器永久儲存權限，避免手機久未開啟自動回收快取
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (
      typeof navigator !== 'undefined' &&
      navigator.storage &&
      typeof navigator.storage.persist === 'function'
    ) {
      const persisted =
        typeof navigator.storage.persisted === 'function'
          ? await navigator.storage.persisted()
          : false;
      if (persisted) return true;
      return await navigator.storage.persist();
    }
  } catch {
    // ignore
  }
  return false;
}

function openBoboClosetDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_VAULT_STORE)) {
          db.createObjectStore(IDB_VAULT_STORE);
        }
        if (!db.objectStoreNames.contains(IDB_IMG_STORE)) {
          db.createObjectStore(IDB_IMG_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openBoboClosetDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openBoboClosetDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => {
        const result = (req.result as T) ?? null;
        db.close();
        resolve(result);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

/**
 * 建立初始預設衣櫥狀態（updatedAt 設為 1000，確保防空白覆蓋保護）
 */
export function createInitialVaultState(): ClosetVaultState {
  const baseItems = [...OFFICIAL_WARDROBE_ITEMS, ...STARTER_SAMPLE_ITEMS];
  const baseOutfits = [...OFFICIAL_CURATED_OUTFITS, ...STARTER_SAMPLE_OUTFITS];
  return {
    items: baseItems,
    outfits: baseOutfits,
    deletedItemIds: {},
    deletedOutfitIds: {},
    hideSamples: OFFICIAL_WARDROBE_ITEMS.length > 0,
    updatedAt: 1000,
  };
}

/**
 * 將 GitHub Repo 最新內建單品 (AI 助手新增) 與本機/雲端資料無損融合
 */
export function injectRepoManagedCatalog(vault: ClosetVaultState): ClosetVaultState {
  const deletedItems = vault.deletedItemIds || {};
  const deletedOutfits = vault.deletedOutfitIds || {};

  const itemMap = new Map<string, WardrobeItem>();
  for (const item of [...STARTER_SAMPLE_ITEMS, ...OFFICIAL_WARDROBE_ITEMS]) {
    if ((deletedItems[item.id] || 0) <= (item.updatedAt || 1000)) {
      itemMap.set(item.id, item);
    }
  }
  for (const item of vault.items) {
    if ((deletedItems[item.id] || 0) > (item.updatedAt || 1000)) continue;
    const existing = itemMap.get(item.id);
    if (!existing || (item.updatedAt || 1000) >= (existing.updatedAt || 1000)) {
      itemMap.set(item.id, {
        ...item,
        imageUrl: item.imageUrl || existing?.imageUrl,
        flatlayUrl: item.flatlayUrl || existing?.flatlayUrl,
        realCropUrl: item.realCropUrl || existing?.realCropUrl,
        pastelUrl: item.pastelUrl || existing?.pastelUrl,
      });
    }
  }

  const outfitMap = new Map<string, SavedOutfit>();
  for (const outfit of [...STARTER_SAMPLE_OUTFITS, ...OFFICIAL_CURATED_OUTFITS]) {
    if ((deletedOutfits[outfit.id] || 0) <= (outfit.updatedAt || 1000)) {
      outfitMap.set(outfit.id, outfit);
    }
  }
  for (const outfit of vault.outfits) {
    if ((deletedOutfits[outfit.id] || 0) > (outfit.updatedAt || 1000)) continue;
    const existing = outfitMap.get(outfit.id);
    if (!existing || (outfit.updatedAt || 1000) >= (existing.updatedAt || 1000)) {
      outfitMap.set(outfit.id, {
        ...outfit,
        selfieUrl: outfit.selfieUrl || existing?.selfieUrl,
      });
    }
  }

  return {
    ...vault,
    items: Array.from(itemMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    outfits: Array.from(outfitMap.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
  };
}

export function loadLocalVault(): ClosetVaultState | null {
  try {
    const raw = localStorage.getItem(LOCAL_VAULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClosetVaultState;
    if (parsed && Array.isArray(parsed.items) && Array.isArray(parsed.outfits)) {
      return injectRepoManagedCatalog(parsed);
    }
  } catch {
    // ignore parse error
  }
  return null;
}

export async function recoverVaultFromIndexedDB(): Promise<ClosetVaultState | null> {
  const saved = await idbGet<ClosetVaultState>(IDB_VAULT_STORE, IDB_MAIN_KEY);
  if (saved && Array.isArray(saved.items) && Array.isArray(saved.outfits)) {
    return injectRepoManagedCatalog(saved);
  }
  return null;
}

export function saveLocalVault(vault: ClosetVaultState): void {
  try {
    // Try saving full vault to localStorage; if images exceed ~4.5MB localStorage quota, save slimmed copy to localStorage & full copy to IndexedDB
    const json = JSON.stringify(vault);
    try {
      localStorage.setItem(LOCAL_VAULT_KEY, json);
    } catch {
      const slim: ClosetVaultState = {
        ...vault,
        items: vault.items.map((i) =>
          i.imageUrl?.startsWith('data:image/') ? { ...i, imageUrl: undefined } : i
        ),
        outfits: vault.outfits.map((o) =>
          o.selfieUrl?.startsWith('data:image/') ? { ...o, selfieUrl: undefined } : o
        ),
      };
      localStorage.setItem(LOCAL_VAULT_KEY, JSON.stringify(slim));
    }
  } catch {
    // ignore
  }
  void idbPut(IDB_VAULT_STORE, IDB_MAIN_KEY, vault);
}

/**
 * 智慧合併兩份衣櫥狀態（比較單品 updatedAt 時間戳 + 尊重 deletedItemIds / deletedOutfitIds 墓碑紀錄，防空白覆蓋！）
 */
export function mergeVaultStates(
  local: ClosetVaultState,
  remote: ClosetVaultState
): ClosetVaultState {
  const mergedDeletedItems: Record<string, number> = { ...(remote.deletedItemIds || {}) };
  for (const [id, ts] of Object.entries(local.deletedItemIds || {})) {
    mergedDeletedItems[id] = Math.max(mergedDeletedItems[id] || 0, ts);
  }

  const mergedDeletedOutfits: Record<string, number> = { ...(remote.deletedOutfitIds || {}) };
  for (const [id, ts] of Object.entries(local.deletedOutfitIds || {})) {
    mergedDeletedOutfits[id] = Math.max(mergedDeletedOutfits[id] || 0, ts);
  }

  const itemById = new Map<string, WardrobeItem>();
  for (const cand of [...remote.items, ...local.items]) {
    if (!cand || !cand.id) continue;
    const deletedAt = mergedDeletedItems[cand.id] || 0;
    if (deletedAt > (cand.updatedAt || 1000)) continue;

    const existing = itemById.get(cand.id);
    if (!existing) {
      itemById.set(cand.id, cand);
    } else {
      const existingTs = existing.updatedAt || 1000;
      const candTs = cand.updatedAt || 1000;
      if (candTs > existingTs) {
        itemById.set(cand.id, {
          ...cand,
          imageUrl:
            cand.imageUrl && !cand.imageUrl.startsWith(CLOUD_IMG_PREFIX)
              ? cand.imageUrl
              : existing.imageUrl || cand.imageUrl,
        });
      } else if (
        (!existing.imageUrl || existing.imageUrl.startsWith(CLOUD_IMG_PREFIX)) &&
        cand.imageUrl &&
        !cand.imageUrl.startsWith(CLOUD_IMG_PREFIX)
      ) {
        itemById.set(cand.id, { ...existing, imageUrl: cand.imageUrl });
      }
    }
  }

  const outfitById = new Map<string, SavedOutfit>();
  for (const cand of [...remote.outfits, ...local.outfits]) {
    if (!cand || !cand.id) continue;
    const deletedAt = mergedDeletedOutfits[cand.id] || 0;
    if (deletedAt > (cand.updatedAt || 1000)) continue;

    const existing = outfitById.get(cand.id);
    if (!existing) {
      outfitById.set(cand.id, cand);
    } else {
      const existingTs = existing.updatedAt || 1000;
      const candTs = cand.updatedAt || 1000;
      if (candTs > existingTs) {
        outfitById.set(cand.id, {
          ...cand,
          selfieUrl:
            cand.selfieUrl && !cand.selfieUrl.startsWith(CLOUD_IMG_PREFIX)
              ? cand.selfieUrl
              : existing.selfieUrl || cand.selfieUrl,
        });
      } else if (
        (!existing.selfieUrl || existing.selfieUrl.startsWith(CLOUD_IMG_PREFIX)) &&
        cand.selfieUrl &&
        !cand.selfieUrl.startsWith(CLOUD_IMG_PREFIX)
      ) {
        outfitById.set(cand.id, { ...existing, selfieUrl: cand.selfieUrl });
      }
    }
  }

  const localIsEdited = (local.updatedAt || 1000) > 1000;
  const remoteIsEdited = (remote.updatedAt || 1000) > 1000;
  let hideSamples = local.hideSamples;
  if (!localIsEdited && remoteIsEdited) {
    hideSamples = remote.hideSamples;
  } else if (localIsEdited && remoteIsEdited) {
    hideSamples =
      (local.updatedAt || 1000) >= (remote.updatedAt || 1000)
        ? local.hideSamples
        : remote.hideSamples;
  }

  // Merge user-created custom subcategory presets across browsers
  const mergedCustomSubs: Partial<Record<ClothingCategory, string[]>> = {};
  const allCats = new Set<ClothingCategory>([
    ...(Object.keys(remote.customSubCategories || {}) as ClothingCategory[]),
    ...(Object.keys(local.customSubCategories || {}) as ClothingCategory[]),
  ]);
  for (const cat of allCats) {
    const combined = Array.from(
      new Set([
        ...(remote.customSubCategories?.[cat] || []),
        ...(local.customSubCategories?.[cat] || []),
      ])
    ).filter((s) => s.trim().length > 0);
    if (combined.length > 0) {
      mergedCustomSubs[cat] = combined;
    }
  }

  return injectRepoManagedCatalog({
    items: Array.from(itemById.values()),
    outfits: Array.from(outfitById.values()),
    deletedItemIds: mergedDeletedItems,
    deletedOutfitIds: mergedDeletedOutfits,
    customSubCategories: mergedCustomSubs,
    hideSamples,
    updatedAt: Math.max(local.updatedAt || 1000, remote.updatedAt || 1000),
  });
}

async function uploadDataUrlShard(
  imgPrefix: string,
  entityId: string,
  dataUrl: string
): Promise<void> {
  const shardKey = `${imgPrefix}_${sanitizeToken(entityId)}`;
  const cached = await idbGet<string>(IDB_IMG_STORE, shardKey);
  if (cached === dataUrl) {
    return;
  }
  const compressed = LZString.compressToEncodedURIComponent(dataUrl);
  const ok = await writeTextDb(shardKey, compressed);
  if (ok) {
    await idbPut(IDB_IMG_STORE, shardKey, dataUrl);
  }
}

async function hydrateDataUrlShard(
  imgPrefix: string,
  entityId: string
): Promise<string | undefined> {
  const shardKey = `${imgPrefix}_${sanitizeToken(entityId)}`;
  const cached = await idbGet<string>(IDB_IMG_STORE, shardKey);
  if (cached && cached.startsWith('data:image/')) {
    return cached;
  }
  const raw = await readTextDb(shardKey);
  if (!raw) return undefined;
  const decompressed = LZString.decompressFromEncodedURIComponent(raw);
  if (decompressed && decompressed.startsWith('data:image/')) {
    await idbPut(IDB_IMG_STORE, shardKey, decompressed);
    return decompressed;
  }
  return undefined;
}

/**
 * 雙向雲端同步（先 Pull 後 Merge 再視條件 Push，嚴格遵守防空白覆蓋鐵則！）
 */
export async function syncVaultWithCloud(
  localVault: ClosetVaultState,
  forcePush = false
): Promise<{ vault: ClosetVaultState; synced: boolean }> {
  const channels = await deriveSyncChannels();
  if (!channels) {
    return { vault: localVault, synced: false };
  }

  // Step 1: ALWAYS Pull remote vault first!
  let remoteVault: ClosetVaultState | null = null;
  const rawRemote = await readTextDb(channels.vaultKey);
  if (rawRemote) {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(rawRemote);
      if (decompressed) {
        const parsed = JSON.parse(decompressed) as ClosetVaultState;
        if (parsed && Array.isArray(parsed.items) && Array.isArray(parsed.outfits)) {
          remoteVault = parsed;
        }
      }
    } catch {
      // ignore malformed remote payload
    }
  }

  // Step 2: Hydrate any sharded cloud images from remoteVault
  if (remoteVault) {
    const hydratedItems = await Promise.all(
      remoteVault.items.map(async (item) => {
        if (item.imageUrl?.startsWith(CLOUD_IMG_PREFIX)) {
          const localMatch = localVault.items.find(
            (l) => l.id === item.id && l.imageUrl?.startsWith('data:image/')
          );
          if (localMatch && (localMatch.updatedAt || 0) >= (item.updatedAt || 0)) {
            return { ...item, imageUrl: localMatch.imageUrl };
          }
          const imgData = await hydrateDataUrlShard(channels.imgPrefix, `item_${item.id}`);
          return { ...item, imageUrl: imgData || localMatch?.imageUrl };
        }
        return item;
      })
    );

    const hydratedOutfits = await Promise.all(
      remoteVault.outfits.map(async (outfit) => {
        if (outfit.selfieUrl?.startsWith(CLOUD_IMG_PREFIX)) {
          const localMatch = localVault.outfits.find(
            (l) => l.id === outfit.id && l.selfieUrl?.startsWith('data:image/')
          );
          if (localMatch && (localMatch.updatedAt || 0) >= (outfit.updatedAt || 0)) {
            return { ...outfit, selfieUrl: localMatch.selfieUrl };
          }
          const imgData = await hydrateDataUrlShard(channels.imgPrefix, `outfit_${outfit.id}`);
          return { ...outfit, selfieUrl: imgData || localMatch?.selfieUrl };
        }
        return outfit;
      })
    );

    remoteVault = {
      ...remoteVault,
      items: hydratedItems,
      outfits: hydratedOutfits,
    };
  }

  // Step 3: Merge local + remote safely
  const merged = remoteVault ? mergeVaultStates(localVault, remoteVault) : localVault;

  // Step 4: Only push to cloud if merged state actually has user edits (> 1000)
  const hasRealEdits =
    (merged.updatedAt || 1000) > 1000 ||
    Object.keys(merged.deletedItemIds || {}).length > 0 ||
    Object.keys(merged.deletedOutfitIds || {}).length > 0;

  let pushedOk = false;
  const shouldPush =
    hasRealEdits &&
    (forcePush || !remoteVault || (localVault.updatedAt || 1000) > (remoteVault.updatedAt || 1000));

  if (shouldPush) {
    // Upload each inline DataURL photo as its own shard so KV never overflows
    await Promise.all(
      merged.items
        .filter((i) => i.imageUrl?.startsWith('data:image/'))
        .map((i) => uploadDataUrlShard(channels.imgPrefix, `item_${i.id}`, i.imageUrl!))
    );
    await Promise.all(
      merged.outfits
        .filter((o) => o.selfieUrl?.startsWith('data:image/'))
        .map((o) => uploadDataUrlShard(channels.imgPrefix, `outfit_${o.id}`, o.selfieUrl!))
    );

    const compactVaultForCloud: ClosetVaultState = {
      ...merged,
      items: merged.items.map((i) =>
        i.imageUrl?.startsWith('data:image/')
          ? { ...i, imageUrl: `${CLOUD_IMG_PREFIX}${i.id}` }
          : i
      ),
      outfits: merged.outfits.map((o) =>
        o.selfieUrl?.startsWith('data:image/')
          ? { ...o, selfieUrl: `${CLOUD_IMG_PREFIX}${o.id}` }
          : o
      ),
    };

    const encoded = LZString.compressToEncodedURIComponent(
      JSON.stringify(compactVaultForCloud)
    );
    pushedOk = await writeTextDb(channels.vaultKey, encoded);

    // Also update compact read-only showcase snapshot (for < 120 char share link)
    const shareKey = `bobocloset_share_v1_${channels.shareReadKey}`;
    void writeTextDb(shareKey, encoded);

    // Broadcast lightweight wakeup ping via ntfy.sh SSE (< 1s live refresh across tabs)
    try {
      await fetch(`${RELAY_BASE_URL}/${channels.relayTopic}`, {
        method: 'POST',
        body: JSON.stringify({ event: 'vault_updated', updatedAt: merged.updatedAt }),
      });
    } catch {
      // ignore live relay network error; permanent KV is source of truth
    }
  }

  saveLocalVault(merged);
  return { vault: merged, synced: Boolean(remoteVault || pushedOk) };
}

/**
 * 讀取精簡分享連結 (?s=<shareReadKey>) 的唯讀展示衣櫥
 */
export async function fetchSharedReadOnlyVault(
  shareReadKey: string
): Promise<ClosetVaultState | null> {
  const safe = sanitizeToken(shareReadKey);
  if (safe.length < 12) return null;
  const raw = await readTextDb(`bobocloset_share_v1_${safe}`);
  if (!raw) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(raw);
    if (!json) return null;
    const parsed = JSON.parse(json) as ClosetVaultState;
    if (parsed && Array.isArray(parsed.items)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * 訂閱即時 SSE 喚醒通知，當另一視窗更新衣櫥時立即自動拉取永久雲端 KV
 */
export function subscribeToVaultLiveUpdates(
  relayTopic: string,
  onPing: () => void
): () => void {
  const cleanups: Array<() => void> = [];

  if (typeof EventSource !== 'undefined') {
    try {
      const es = new EventSource(`${RELAY_BASE_URL}/${relayTopic}/sse`);
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          if (data && data.event === 'message') {
            onPing();
          }
        } catch {
          // ignore
        }
      };
      cleanups.push(() => es.close());
    } catch {
      // ignore
    }
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

/**
 * 一鍵下載完整衣櫥 .json 備份檔（含所有壓縮單品照片與穿搭紀錄）
 */
export function exportVaultJsonFile(vault: ClosetVaultState): void {
  const payload = {
    app: 'BoboCloset',
    version: 1,
    exportedAt: new Date().toISOString(),
    vault,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `BoboCloset_奶油衣櫥備份_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportedVaultJson(rawText: string): ClosetVaultState {
  const parsed = JSON.parse(rawText);
  const candidate: ClosetVaultState | null =
    parsed && parsed.vault && Array.isArray(parsed.vault.items)
      ? parsed.vault
      : parsed && Array.isArray(parsed.items)
      ? parsed
      : null;

  if (!candidate) {
    throw new Error('備份檔格式不正確，找不到衣櫥單品清單');
  }

  return {
    items: candidate.items,
    outfits: Array.isArray(candidate.outfits) ? candidate.outfits : [],
    deletedItemIds: candidate.deletedItemIds || {},
    deletedOutfitIds: candidate.deletedOutfitIds || {},
    customSubCategories: candidate.customSubCategories || {},
    hideSamples: Boolean(candidate.hideSamples),
    updatedAt: Date.now(),
  };
}
