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
const LAST_NONEMPTY_VAULT_KEY = 'bobocloset_last_nonempty_v1';
const PASSHASH_STORAGE_KEY = 'bobocloset_owner_passhash_v1';
const LINKED_PASSHASHES_KEY = 'bobocloset_linked_passhashes_v1';

const TEXTDB_UPDATE_URL = 'https://api.textdb.online/update/';
const TEXTDB_READ_URL = 'https://textdb.online';
const TEXTDB_DEV_API_URL = 'https://textdb.dev/api/data';
const RELAY_BASE_URL = 'https://ntfy.sh';

const IDB_NAME = 'BoboClosetDB';
const IDB_VAULT_STORE = 'vault';
const IDB_IMG_STORE = 'images';
const IDB_MAIN_KEY = 'main_vault_v1';
const IDB_PASSHASH_KEY = 'owner_passhash_v1';
const IDB_SNAPSHOTS_KEY = 'history_snapshots_v1';
const IDB_TIMEOUT_MS = 8000;

const CLOUD_IMG_PREFIX = 'cloudimg:';
const LOCAL_IDB_IMG_MARKER = 'localidb:stored';
const CLOUD_CHUNK_PREFIX = 'CLCHUNK1:';
const CLOUD_CHUNK_MAX_CHARS = 40000;

export const APP_SYNC_VERSION = 'v2.3';

const FINGERPRINT_EMOJIS = ['🧸', '🥐', '🍮', '🍪', '🥛', '🍑', '🌼', '🧺'];

export interface DerivedSyncChannels {
  vaultKey: string;
  imgPrefix: string;
  relayTopic: string;
  shareReadKey: string;
  fingerprintBadge: string;
}

export interface LocalVaultSnapshot {
  id: string;
  savedAt: number;
  itemCount: number;
  outfitCount: number;
  vault: ClosetVaultState;
}

export interface SyncVaultOutcome {
  vault: ClosetVaultState;
  synced: boolean;
  pulledFromCloud: boolean;
  pushedToCloud: boolean;
  partialPhotoPending?: boolean;
  fingerprintBadge: string | null;
  errorMessage?: string;
}

// In-memory mirrors so environments with full shared-origin 5MB localStorage or private browsing never fail sync
const memoryImgCache = new Map<string, string>();
let memoryPasshash: string | null = null;
let memoryLinkedHashes: string[] = [];

function sanitizeToken(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function withIdbTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, IDB_TIMEOUT_MS);

    promise
      .then((val) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(val);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
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
 * 由 passhash 產生視覺化「雲端印記徽章」（如 🧸🥐 #A4F2），方便一眼核對主畫面 App 與瀏覽器是否連上同一個保險箱
 */
export function getVaultFingerprintBadge(passhash?: string | null): string | null {
  const h = passhash ?? getSavedPasshash();
  if (!h || h.length < 12) return null;
  const b1 = Number.parseInt(h.slice(0, 2), 16) || 0;
  const b2 = Number.parseInt(h.slice(2, 4), 16) || 0;
  const e1 = FINGERPRINT_EMOJIS[b1 % FINGERPRINT_EMOJIS.length];
  const e2 = FINGERPRINT_EMOJIS[b2 % FINGERPRINT_EMOJIS.length];
  const code = h.slice(-4).toUpperCase();
  return `${e1}${e2} #${code}`;
}

/**
 * 產生 iOS 鍵盤常見自動首字大寫／全半形候選變體
 */
export function getPasscodeFallbackVariants(raw: string): string[] {
  const exact = raw.trim();
  if (!exact) return [];
  const nfkc = exact.normalize('NFKC').trim();
  const upperFirstOnly = nfkc.length > 0 ? nfkc[0].toUpperCase() + nfkc.slice(1) : nfkc;
  const lowerFirstOnly = nfkc.length > 0 ? nfkc[0].toLowerCase() + nfkc.slice(1) : nfkc;
  const lower = nfkc.toLowerCase();
  const capFirstFromLower = lower.length > 0 ? lower[0].toUpperCase() + lower.slice(1) : lower;
  return Array.from(
    new Set(
      [exact, nfkc, upperFirstOnly, lowerFirstOnly, lower, capFirstFromLower].filter(Boolean)
    )
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
  if (memoryPasshash && memoryPasshash.length >= 12) {
    return memoryPasshash;
  }
  try {
    if (typeof localStorage === 'undefined') return null;
    const val = localStorage.getItem(PASSHASH_STORAGE_KEY);
    if (val && val.length >= 12) {
      memoryPasshash = val;
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

export function savePasshash(passhash: string | null): void {
  memoryPasshash = passhash && passhash.length >= 12 ? passhash : null;
  if (!memoryPasshash) {
    memoryLinkedHashes = [];
  }
  try {
    if (typeof localStorage !== 'undefined') {
      if (!memoryPasshash) {
        localStorage.removeItem(PASSHASH_STORAGE_KEY);
        localStorage.removeItem(LINKED_PASSHASHES_KEY);
      } else {
        try {
          localStorage.setItem(PASSHASH_STORAGE_KEY, memoryPasshash);
        } catch {
          // Free bloated legacy Base64 backup key if shared-origin 5MB localStorage is full, then retry
          localStorage.removeItem(LAST_NONEMPTY_VAULT_KEY);
          localStorage.setItem(PASSHASH_STORAGE_KEY, memoryPasshash);
        }
      }
    }
  } catch {
    // Shared-origin localStorage may still be full from sibling apps; memoryPasshash + IndexedDB persist reliably
  }
  void idbPut(IDB_VAULT_STORE, IDB_PASSHASH_KEY, memoryPasshash || '');
}

export async function recoverPasshashFromIndexedDB(): Promise<string | null> {
  const syncVal = getSavedPasshash();
  if (syncVal) return syncVal;
  const idbVal = await idbGet<string>(IDB_VAULT_STORE, IDB_PASSHASH_KEY);
  if (idbVal && idbVal.length >= 12) {
    memoryPasshash = idbVal;
    try {
      localStorage.setItem(PASSHASH_STORAGE_KEY, idbVal);
    } catch {
      // ignore quota error; memoryPasshash is now populated
    }
    return idbVal;
  }
  return null;
}

function getLinkedVariantHashes(): string[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(LINKED_PASSHASHES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((x) => typeof x === 'string' && x.length >= 12);
          memoryLinkedHashes = Array.from(new Set([...memoryLinkedHashes, ...valid]));
        }
      }
    }
  } catch {
    // ignore
  }
  return memoryLinkedHashes;
}

function saveLinkedVariantHashes(hashes: string[]): void {
  const unique = Array.from(new Set(hashes.filter((h) => h && h.length >= 12)));
  memoryLinkedHashes = unique;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LINKED_PASSHASHES_KEY, JSON.stringify(unique));
    }
  } catch {
    // ignore
  }
  void idbPut(IDB_VAULT_STORE, LINKED_PASSHASHES_KEY, unique);
}

export async function deriveSyncChannels(
  passhash?: string | null
): Promise<DerivedSyncChannels | null> {
  const activeHash = passhash ?? (await recoverPasshashFromIndexedDB());
  if (!activeHash || activeHash.length < 12) return null;

  const vaultHex = await sha256Hex(`bobocloset_vault_kv_v1:${activeHash}`);
  const relayHex = await sha256Hex(`bobocloset_live_sse_v1:${activeHash}`);
  const shareHex = await sha256Hex(`bobocloset_readonly_share_v1:${activeHash}`);

  return {
    vaultKey: `bobocloset_v1_${vaultHex.slice(0, 34)}`,
    imgPrefix: `bobocloset_img_v1_${vaultHex.slice(0, 20)}`,
    relayTopic: `bobocloset_sse_v1_${relayHex.slice(0, 30)}`,
    shareReadKey: shareHex.slice(0, 24),
    fingerprintBadge: getVaultFingerprintBadge(activeHash) || '🧸 #SYNC',
  };
}

/**
 * 寫入 textdb.online 單一分片：
 * 1. 強制使用 application/x-www-form-urlencoded + URLSearchParams 防止 '+' 變空白字元
 * 2. 強制檢查回傳 JSON `status === 1`，防止超過 20 萬字元上限時 HTTP 200 `{status: 0}` 假成功！
 * 3. 嚴禁設定 `keepalive: true`！WebKit / Blink Fetch 規範限制同頁面併發 keepalive 總計不得超過 64 KiB，
 *    一旦多張照片或雙雲端分片同時送出 > 64 KiB 會立即拋出 TypeError: Load failed！
 */
async function writeTextDbOnlineSingle(key: string, value: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 15000) : null;
    try {
      const body = new URLSearchParams({ key, value }).toString();
      const res = await fetch(TEXTDB_UPDATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: ctrl?.signal,
      });
      if (!res.ok) {
        if (attempt === 0) continue;
        return false;
      }
      const txt = (await res.text()).trim();
      if (!txt) return true;
      try {
        const parsed = JSON.parse(txt) as { status?: number };
        if (parsed && typeof parsed === 'object' && 'status' in parsed) {
          const ok = Number(parsed.status) === 1;
          if (!ok && attempt === 0) continue;
          return ok;
        }
      } catch {
        // Non-JSON 200 OK fallback
      }
      return true;
    } catch {
      if (attempt === 0) continue;
      return false;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return false;
}

/**
 * 雙雲端備援寫入 (textdb.dev)，當 textdb.online 瞬斷或限流時仍可 100% 跨瀏覽器互通
 */
async function writeTextDbDevSingle(key: string, value: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 15000) : null;
    try {
      const bodyStr = JSON.stringify({ payload: value });
      const res = await fetch(`${TEXTDB_DEV_API_URL}/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        signal: ctrl?.signal,
      });
      if (res.ok) return true;
    } catch {
      // retry once
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return false;
}

async function writeChunkedToProvider(
  baseKey: string,
  fullValue: string,
  writeSingle: (k: string, v: string) => Promise<boolean>
): Promise<boolean> {
  if (fullValue.length <= CLOUD_CHUNK_MAX_CHARS) {
    return writeSingle(baseKey, fullValue);
  }
  const chunks: string[] = [];
  for (let i = 0; i < fullValue.length; i += CLOUD_CHUNK_MAX_CHARS) {
    chunks.push(fullValue.slice(i, i + CLOUD_CHUNK_MAX_CHARS));
  }
  for (let idx = 1; idx < chunks.length; idx++) {
    const ok = await writeSingle(`${baseKey}_p${idx}`, chunks[idx]);
    if (!ok) return false;
  }
  const header = `${CLOUD_CHUNK_PREFIX}${chunks.length}:${chunks[0]}`;
  return writeSingle(baseKey, header);
}

/**
 * 永久雲端雙引擎寫入（自動分片防爆字數 + 嚴格驗證寫入成功）
 */
export async function writeTextDb(key: string, value: string): Promise<boolean> {
  const [okOnline, okDev] = await Promise.all([
    writeChunkedToProvider(key, value, writeTextDbOnlineSingle),
    writeChunkedToProvider(key, value, writeTextDbDevSingle),
  ]);
  return okOnline || okDev;
}

async function readTextDbOnlineSingle(key: string): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7500) : null;
  try {
    const res = await fetch(`${TEXTDB_READ_URL}/${encodeURIComponent(key)}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: ctrl?.signal,
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readTextDbDevSingle(key: string): Promise<string | null> {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 7500) : null;
  try {
    const res = await fetch(`${TEXTDB_DEV_API_URL}/${encodeURIComponent(key)}?t=${Date.now()}`, {
      cache: 'no-store',
      signal: ctrl?.signal,
    });
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    if (!text) return null;
    let parsed: unknown = JSON.parse(text);
    if (typeof parsed === 'string') parsed = JSON.parse(parsed);
    if (parsed && typeof parsed === 'object' && 'payload' in parsed) {
      const p = (parsed as { payload?: unknown }).payload;
      return typeof p === 'string' && p.trim().length > 0 ? p.trim() : null;
    }
    return null;
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function readChunkedFromProvider(
  baseKey: string,
  readSingle: (k: string) => Promise<string | null>
): Promise<string | null> {
  const head = await readSingle(baseKey);
  if (!head) return null;
  const matchedPrefix = head.startsWith(CLOUD_CHUNK_PREFIX)
    ? CLOUD_CHUNK_PREFIX
    : head.startsWith('BCCHUNK1:')
    ? 'BCCHUNK1:'
    : null;
  if (!matchedPrefix) {
    return head;
  }
  const rest = head.slice(matchedPrefix.length);
  const colonIdx = rest.indexOf(':');
  if (colonIdx <= 0) return null;
  const totalChunks = Number.parseInt(rest.slice(0, colonIdx), 10);
  const chunk0 = rest.slice(colonIdx + 1);
  if (!Number.isFinite(totalChunks) || totalChunks < 2 || totalChunks > 60) return null;

  const tailPromises: Array<Promise<string | null>> = [];
  for (let idx = 1; idx < totalChunks; idx++) {
    tailPromises.push(readSingle(`${baseKey}_p${idx}`));
  }
  const tails = await Promise.all(tailPromises);
  if (tails.some((part) => !part)) return null;
  return chunk0 + tails.join('');
}

export async function readTextDb(key: string): Promise<string | null> {
  const [onlineVal, devVal] = await Promise.all([
    readChunkedFromProvider(key, readTextDbOnlineSingle),
    readChunkedFromProvider(key, readTextDbDevSingle),
  ]);
  return onlineVal || devVal || null;
}

async function readAllCloudVaultCandidates(vaultKey: string): Promise<ClosetVaultState[]> {
  const [onlineRaw, devRaw] = await Promise.all([
    readChunkedFromProvider(vaultKey, readTextDbOnlineSingle),
    readChunkedFromProvider(vaultKey, readTextDbDevSingle),
  ]);
  const results: ClosetVaultState[] = [];
  for (const raw of Array.from(new Set([onlineRaw, devRaw].filter(Boolean) as string[]))) {
    try {
      const decompressed = LZString.decompressFromEncodedURIComponent(raw);
      if (!decompressed) continue;
      const parsed = JSON.parse(decompressed) as ClosetVaultState;
      if (parsed && Array.isArray(parsed.items) && Array.isArray(parsed.outfits)) {
        results.push(parsed);
      }
    } catch {
      // ignore malformed candidate
    }
  }
  return results;
}

/**
 * 綁定通行碼時，自動檢查 iOS 首字大小寫候選變體是否已有既有雲端保險箱，
 * 若精確輸入查無資料但變體已有資料，自動對齊既有 passhash 並關聯所有變體，無損互通！
 */
export async function resolveBestPasshashOnBind(rawPasscode: string): Promise<string> {
  const variants = getPasscodeFallbackVariants(rawPasscode);
  if (variants.length === 0) {
    return hashOwnerPasscode(rawPasscode);
  }
  const checks = await Promise.all(
    variants.map(async (v) => {
      const h = await hashOwnerPasscode(v);
      const ch = await deriveSyncChannels(h);
      const vaults = ch ? await readAllCloudVaultCandidates(ch.vaultKey) : [];
      const maxTs = vaults.reduce((m, x) => Math.max(m, x.updatedAt || 0), 0);
      return { h, vaults, maxTs };
    })
  );

  saveLinkedVariantHashes(checks.map((c) => c.h));

  const exactCheck = checks[0];
  if (exactCheck.vaults.length > 0) {
    return exactCheck.h;
  }
  const existing = checks.filter((c) => c.vaults.length > 0).sort((a, b) => b.maxTs - a.maxTs);
  if (existing.length > 0) {
    return existing[0].h;
  }
  return exactCheck.h;
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
      return await Promise.race([
        navigator.storage.persist(),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1500)),
      ]);
    }
  } catch {
    // ignore
  }
  return false;
}

let cachedClosetDbPromise: Promise<IDBDatabase | null> | null = null;

function openBoboClosetDb(): Promise<IDBDatabase | null> {
  if (cachedClosetDbPromise) return cachedClosetDbPromise;
  const rawPromise = new Promise<IDBDatabase | null>((resolve) => {
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
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          cachedClosetDbPromise = null;
        };
        db.onclose = () => {
          cachedClosetDbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        cachedClosetDbPromise = null;
        resolve(null);
      };
      req.onblocked = () => {
        cachedClosetDbPromise = null;
        resolve(null);
      };
    } catch {
      cachedClosetDbPromise = null;
      resolve(null);
    }
  });
  cachedClosetDbPromise = withIdbTimeout(rawPromise, null).then((db) => {
    if (!db) cachedClosetDbPromise = null;
    return db;
  });
  return cachedClosetDbPromise;
}

async function idbPut(storeName: string, key: string, value: unknown): Promise<void> {
  const db = await openBoboClosetDb();
  if (!db) return;
  const op = new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      cachedClosetDbPromise = null;
      resolve();
    }
  });
  await withIdbTimeout(op, undefined);
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openBoboClosetDb();
  if (!db) return null;
  const op = new Promise<T | null>((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => {
        const result = (req.result as T) ?? null;
        resolve(result);
      };
      req.onerror = () => resolve(null);
    } catch {
      cachedClosetDbPromise = null;
      resolve(null);
    }
  });
  return withIdbTimeout(op, null);
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
      const hasCustomUserPhoto = Boolean(
        item.imageUrl?.startsWith('data:image/') ||
          item.imageUrl?.startsWith(CLOUD_IMG_PREFIX) ||
          item.imageUrl === LOCAL_IDB_IMG_MARKER
      );
      itemMap.set(item.id, {
        ...item,
        imageUrl: item.imageUrl || existing?.imageUrl,
        flatlayUrl: hasCustomUserPhoto
          ? item.flatlayUrl
          : item.flatlayUrl || existing?.flatlayUrl,
        realCropUrl: hasCustomUserPhoto
          ? item.realCropUrl
          : item.realCropUrl || existing?.realCropUrl,
        pastelUrl: hasCustomUserPhoto
          ? item.pastelUrl
          : item.pastelUrl || existing?.pastelUrl,
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

function parseVaultStorageJson(raw: string | null): ClosetVaultState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ClosetVaultState;
    if (parsed && Array.isArray(parsed.items) && Array.isArray(parsed.outfits)) {
      return injectRepoManagedCatalog(parsed);
    }
  } catch {
    // ignore parse error
  }
  return null;
}

export function loadLocalVault(): ClosetVaultState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const primary = parseVaultStorageJson(localStorage.getItem(LOCAL_VAULT_KEY));
    const backup = parseVaultStorageJson(localStorage.getItem(LAST_NONEMPTY_VAULT_KEY));
    if (primary && backup) {
      return mergeVaultStates(primary, backup);
    }
    return primary || backup;
  } catch {
    return null;
  }
}

export async function recoverVaultFromIndexedDB(): Promise<ClosetVaultState | null> {
  const saved = await idbGet<ClosetVaultState>(IDB_VAULT_STORE, IDB_MAIN_KEY);
  if (saved && Array.isArray(saved.items) && Array.isArray(saved.outfits)) {
    return injectRepoManagedCatalog(saved);
  }
  return null;
}

export async function listLocalVaultSnapshots(): Promise<LocalVaultSnapshot[]> {
  try {
    const snaps = await idbGet<LocalVaultSnapshot[]>(IDB_VAULT_STORE, IDB_SNAPSHOTS_KEY);
    return Array.isArray(snaps) ? snaps : [];
  } catch {
    return [];
  }
}

/**
 * 完整載入並無損合併 localStorage 與 IndexedDB（防止同網域 5MB localStorage 滿載時遺漏 IndexedDB 最新單品與照片）
 */
export async function loadFullLocalVaultState(): Promise<ClosetVaultState> {
  const lsVault = loadLocalVault();
  const idbVault = await recoverVaultFromIndexedDB();

  let best: ClosetVaultState;
  if (lsVault && idbVault) {
    best = mergeVaultStates(lsVault, idbVault);
  } else {
    best = lsVault || idbVault || createInitialVaultState();
  }

  const hydratedItems = await Promise.all(
    best.items.map(async (item) => {
      const resolveLocalPic = async (
        fieldVal: string | undefined,
        slot: string
      ): Promise<string | undefined> => {
        if (fieldVal && fieldVal.startsWith('data:image/')) return fieldVal;
        const memKey = `local_item_${item.id}_${slot}`;
        const fromMem = memoryImgCache.get(memKey);
        if (fromMem?.startsWith('data:image/')) return fromMem;
        const fromIdb = await idbGet<string>(IDB_IMG_STORE, memKey);
        if (fromIdb?.startsWith('data:image/')) return fromIdb;
        return fieldVal === LOCAL_IDB_IMG_MARKER ? undefined : fieldVal;
      };

      const imageUrl = await resolveLocalPic(item.imageUrl, 'imageUrl');
      const realCropUrl = await resolveLocalPic(item.realCropUrl, 'realCropUrl');
      const flatlayUrl = await resolveLocalPic(item.flatlayUrl, 'flatlayUrl');
      const pastelUrl = await resolveLocalPic(item.pastelUrl, 'pastelUrl');

      return {
        ...item,
        imageUrl,
        realCropUrl,
        flatlayUrl,
        pastelUrl,
      };
    })
  );

  const hydratedOutfits = await Promise.all(
    best.outfits.map(async (outfit) => {
      if (outfit.selfieUrl && outfit.selfieUrl.startsWith('data:image/')) {
        return outfit;
      }
      const memKey = `local_outfit_${outfit.id}`;
      const localSelfie =
        memoryImgCache.get(memKey) || (await idbGet<string>(IDB_IMG_STORE, memKey));
      if (localSelfie && localSelfie.startsWith('data:image/')) {
        return { ...outfit, selfieUrl: localSelfie };
      }
      return {
        ...outfit,
        selfieUrl: outfit.selfieUrl === LOCAL_IDB_IMG_MARKER ? undefined : outfit.selfieUrl,
      };
    })
  );

  return {
    ...best,
    items: hydratedItems,
    outfits: hydratedOutfits,
  };
}

function buildSlimVaultForLocalStorage(vault: ClosetVaultState): string {
  const slim: ClosetVaultState = {
    ...vault,
    items: vault.items.map((i) => ({
      ...i,
      imageUrl: i.imageUrl?.startsWith('data:image/') ? LOCAL_IDB_IMG_MARKER : i.imageUrl,
      realCropUrl: i.realCropUrl?.startsWith('data:image/') ? LOCAL_IDB_IMG_MARKER : i.realCropUrl,
      flatlayUrl: i.flatlayUrl?.startsWith('data:image/') ? LOCAL_IDB_IMG_MARKER : i.flatlayUrl,
      pastelUrl: i.pastelUrl?.startsWith('data:image/') ? LOCAL_IDB_IMG_MARKER : i.pastelUrl,
    })),
    outfits: vault.outfits.map((o) => ({
      ...o,
      selfieUrl: o.selfieUrl?.startsWith('data:image/') ? LOCAL_IDB_IMG_MARKER : o.selfieUrl,
    })),
  };
  return JSON.stringify(slim);
}

/**
 * 將衣櫥寫入本機雙重備份：
 * - localStorage 一律儲存剝離 Base64 大圖後的輕量索引（釋放同網域 https://liu88219.github.io 5MB 配額！）
 * - IndexedDB + 記憶體快取完整保存 100% 原始照片與歷史快照
 */
export function saveLocalVault(vault: ClosetVaultState): void {
  const hasEdits = (vault.updatedAt || 1000) > 1000;

  // Cache data:image/* in memory immediately before async IndexedDB write completes
  for (const item of vault.items) {
    if (item.imageUrl?.startsWith('data:image/')) {
      memoryImgCache.set(`local_item_${item.id}_imageUrl`, item.imageUrl);
    }
    if (item.realCropUrl?.startsWith('data:image/')) {
      memoryImgCache.set(`local_item_${item.id}_realCropUrl`, item.realCropUrl);
    }
    if (item.flatlayUrl?.startsWith('data:image/')) {
      memoryImgCache.set(`local_item_${item.id}_flatlayUrl`, item.flatlayUrl);
    }
    if (item.pastelUrl?.startsWith('data:image/')) {
      memoryImgCache.set(`local_item_${item.id}_pastelUrl`, item.pastelUrl);
    }
  }
  for (const outfit of vault.outfits) {
    if (outfit.selfieUrl?.startsWith('data:image/')) {
      memoryImgCache.set(`local_outfit_${outfit.id}`, outfit.selfieUrl);
    }
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const slimJson = buildSlimVaultForLocalStorage(vault);
      try {
        localStorage.setItem(LOCAL_VAULT_KEY, slimJson);
        if (hasEdits) {
          localStorage.setItem(LAST_NONEMPTY_VAULT_KEY, slimJson);
        }
      } catch {
        // Purge bloated pre-v2.2 Base64 backups first to reclaim localStorage quota, then retry
        localStorage.removeItem(LAST_NONEMPTY_VAULT_KEY);
        localStorage.removeItem(LOCAL_VAULT_KEY);
        localStorage.setItem(LOCAL_VAULT_KEY, slimJson);
        if (hasEdits) {
          localStorage.setItem(LAST_NONEMPTY_VAULT_KEY, slimJson);
        }
      }
    }
  } catch {
    // Shared-origin localStorage temporarily full; IndexedDB below stores 100% of state + photos
  }

  void (async () => {
    await idbPut(IDB_VAULT_STORE, IDB_MAIN_KEY, vault);
    for (const item of vault.items) {
      if (item.imageUrl?.startsWith('data:image/')) {
        await idbPut(IDB_IMG_STORE, `local_item_${item.id}_imageUrl`, item.imageUrl);
      }
      if (item.realCropUrl?.startsWith('data:image/')) {
        await idbPut(IDB_IMG_STORE, `local_item_${item.id}_realCropUrl`, item.realCropUrl);
      }
      if (item.flatlayUrl?.startsWith('data:image/')) {
        await idbPut(IDB_IMG_STORE, `local_item_${item.id}_flatlayUrl`, item.flatlayUrl);
      }
      if (item.pastelUrl?.startsWith('data:image/')) {
        await idbPut(IDB_IMG_STORE, `local_item_${item.id}_pastelUrl`, item.pastelUrl);
      }
    }
    for (const outfit of vault.outfits) {
      if (outfit.selfieUrl?.startsWith('data:image/')) {
        await idbPut(IDB_IMG_STORE, `local_outfit_${outfit.id}`, outfit.selfieUrl);
      }
    }
    if (hasEdits) {
      try {
        const existing = await listLocalVaultSnapshots();
        const now = Date.now();
        if (!existing[0] || now - existing[0].savedAt > 90000) {
          const snap: LocalVaultSnapshot = {
            id: `snap-${now}`,
            savedAt: now,
            itemCount: vault.items.filter((i) => !i.isSample).length || vault.items.length,
            outfitCount: vault.outfits.length,
            vault,
          };
          await idbPut(IDB_VAULT_STORE, IDB_SNAPSHOTS_KEY, [snap, ...existing].slice(0, 6));
        }
      } catch {
        // ignore snapshot error
      }
    }
  })();
}

function pickBestVisualField(
  newerVal: string | undefined,
  olderVal: string | undefined
): string | undefined {
  if (newerVal?.startsWith('data:image/')) return newerVal;
  if (olderVal?.startsWith('data:image/') && (!newerVal || newerVal === LOCAL_IDB_IMG_MARKER || newerVal.startsWith(CLOUD_IMG_PREFIX))) {
    return olderVal;
  }
  if (newerVal && newerVal !== LOCAL_IDB_IMG_MARKER && !newerVal.startsWith(CLOUD_IMG_PREFIX)) {
    return newerVal;
  }
  if (olderVal && olderVal !== LOCAL_IDB_IMG_MARKER && !olderVal.startsWith(CLOUD_IMG_PREFIX)) {
    return olderVal;
  }
  if (newerVal?.startsWith(CLOUD_IMG_PREFIX)) return newerVal;
  if (olderVal?.startsWith(CLOUD_IMG_PREFIX)) return olderVal;
  return newerVal || olderVal;
}

/**
 * 智慧合併兩份衣櫥狀態（比較單品 updatedAt 時間戳 + 尊重 deletedItemIds / deletedOutfitIds 墓碑紀錄，防空白覆蓋、絕不亂刪既有內容！）
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
      if (candTs >= existingTs) {
        itemById.set(cand.id, {
          ...cand,
          imageUrl: pickBestVisualField(cand.imageUrl, existing.imageUrl),
          realCropUrl: pickBestVisualField(cand.realCropUrl, existing.realCropUrl),
          flatlayUrl: pickBestVisualField(cand.flatlayUrl, existing.flatlayUrl),
          pastelUrl: pickBestVisualField(cand.pastelUrl, existing.pastelUrl),
        });
      } else {
        itemById.set(cand.id, {
          ...existing,
          imageUrl: pickBestVisualField(existing.imageUrl, cand.imageUrl),
          realCropUrl: pickBestVisualField(existing.realCropUrl, cand.realCropUrl),
          flatlayUrl: pickBestVisualField(existing.flatlayUrl, cand.flatlayUrl),
          pastelUrl: pickBestVisualField(existing.pastelUrl, cand.pastelUrl),
        });
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
      if (candTs >= existingTs) {
        outfitById.set(cand.id, {
          ...cand,
          selfieUrl: pickBestVisualField(cand.selfieUrl, existing.selfieUrl),
        });
      } else {
        outfitById.set(cand.id, {
          ...existing,
          selfieUrl: pickBestVisualField(existing.selfieUrl, cand.selfieUrl),
        });
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

async function makePhotoShardToken(
  entityKey: string,
  dataUrl: string
): Promise<{
  token: string;
  shardSuffix: string;
}> {
  const hash16 = (await sha256Hex(dataUrl)).slice(0, 16);
  const safeEntity = sanitizeToken(entityKey).slice(0, 36);
  const shardSuffix = `${safeEntity}_${hash16}`;
  return {
    token: `${CLOUD_IMG_PREFIX}${shardSuffix}`,
    shardSuffix,
  };
}

async function uploadDataUrlShard(
  imgPrefix: string,
  shardSuffix: string,
  dataUrl: string,
  forceUpload = false
): Promise<boolean> {
  const shardKey = `${imgPrefix}_${shardSuffix}`;
  if (!forceUpload) {
    const verifiedMarker = await idbGet<string>(IDB_VAULT_STORE, `uploaded_v3:${shardKey}`);
    if (verifiedMarker === '1') {
      return true;
    }
  }
  const compressed = LZString.compressToEncodedURIComponent(dataUrl);
  const ok = await writeTextDb(shardKey, compressed);
  if (ok) {
    memoryImgCache.set(shardKey, dataUrl);
    await idbPut(IDB_IMG_STORE, shardKey, dataUrl);
    await idbPut(IDB_VAULT_STORE, `uploaded_v3:${shardKey}`, '1');
  }
  return ok;
}

async function hydrateCloudImgToken(
  token: string | undefined,
  imgPrefixes: string[],
  legacyEntityPrefix: 'item' | 'outfit'
): Promise<string | undefined> {
  if (!token || !token.startsWith(CLOUD_IMG_PREFIX)) {
    return token;
  }
  const rawSuffix = token.slice(CLOUD_IMG_PREFIX.length);
  for (const prefix of imgPrefixes) {
    const candidateKeys = Array.from(
      new Set([
        `${prefix}_${sanitizeToken(rawSuffix)}`,
        `${prefix}_${legacyEntityPrefix}_${sanitizeToken(rawSuffix)}`,
      ])
    );
    for (const shardKey of candidateKeys) {
      const mem = memoryImgCache.get(shardKey);
      if (mem && mem.startsWith('data:image/')) {
        return mem;
      }
      const cached = await idbGet<string>(IDB_IMG_STORE, shardKey);
      if (cached && cached.startsWith('data:image/')) {
        memoryImgCache.set(shardKey, cached);
        return cached;
      }
      const raw = await readTextDb(shardKey);
      if (!raw) continue;
      const decompressed = LZString.decompressFromEncodedURIComponent(raw);
      if (decompressed && decompressed.startsWith('data:image/')) {
        memoryImgCache.set(shardKey, decompressed);
        await idbPut(IDB_IMG_STORE, shardKey, decompressed);
        return decompressed;
      }
    }
  }
  return undefined;
}

async function hydrateRemoteVaultPhotos(
  remoteVault: ClosetVaultState,
  localVault: ClosetVaultState,
  imgPrefixes: string[]
): Promise<ClosetVaultState> {
  const hydratedItems = await Promise.all(
    remoteVault.items.map(async (item) => {
      const localMatch = localVault.items.find((l) => l.id === item.id);
      const localHasSameOrNewer =
        localMatch && (localMatch.updatedAt || 0) >= (item.updatedAt || 0);

      const resolveField = async (
        remoteField: string | undefined,
        localField: string | undefined
      ): Promise<string | undefined> => {
        if (!remoteField?.startsWith(CLOUD_IMG_PREFIX)) {
          return remoteField;
        }
        if (localHasSameOrNewer && localField?.startsWith('data:image/')) {
          return localField;
        }
        const fetched = await hydrateCloudImgToken(remoteField, imgPrefixes, 'item');
        if (fetched) return fetched;
        if (localField?.startsWith('data:image/')) return localField;
        // Preserve cloudimg: token if network transiently missed so next poll hydrates it without losing photo ref!
        return remoteField;
      };

      const imageUrl = await resolveField(item.imageUrl, localMatch?.imageUrl);
      const realCropUrl = await resolveField(item.realCropUrl, localMatch?.realCropUrl);
      const flatlayUrl = await resolveField(item.flatlayUrl, localMatch?.flatlayUrl);
      const pastelUrl = await resolveField(item.pastelUrl, localMatch?.pastelUrl);

      return {
        ...item,
        imageUrl,
        realCropUrl,
        flatlayUrl,
        pastelUrl,
      };
    })
  );

  const hydratedOutfits = await Promise.all(
    remoteVault.outfits.map(async (outfit) => {
      if (outfit.selfieUrl?.startsWith(CLOUD_IMG_PREFIX)) {
        const localMatch = localVault.outfits.find((l) => l.id === outfit.id);
        if (
          localMatch &&
          (localMatch.updatedAt || 0) >= (outfit.updatedAt || 0) &&
          localMatch.selfieUrl?.startsWith('data:image/')
        ) {
          return { ...outfit, selfieUrl: localMatch.selfieUrl };
        }
        const imgData = await hydrateCloudImgToken(outfit.selfieUrl, imgPrefixes, 'outfit');
        return {
          ...outfit,
          selfieUrl:
            imgData ||
            (localMatch?.selfieUrl?.startsWith('data:image/')
              ? localMatch.selfieUrl
              : outfit.selfieUrl),
        };
      }
      return outfit;
    })
  );

  return {
    ...remoteVault,
    items: hydratedItems,
    outfits: hydratedOutfits,
  };
}

function visualFieldSig(v: string | undefined): string {
  if (!v || v === LOCAL_IDB_IMG_MARKER) return '0';
  if (v.startsWith('data:image/')) return `d:${v.length}`;
  return v.slice(0, 32);
}

function vaultStateDigest(v: ClosetVaultState): string {
  const itemSig = v.items
    .map(
      (i) =>
        `${i.id}:${i.updatedAt || 0}:${i.name}:${i.subCategory}:${i.colorTone}:${
          i.wearCount || 0
        }:${i.inLaundry ? 1 : 0}:${i.isFavorite ? 1 : 0}:${visualFieldSig(
          i.imageUrl
        )}:${visualFieldSig(i.realCropUrl)}:${visualFieldSig(i.flatlayUrl)}:${visualFieldSig(
          i.pastelUrl
        )}`
    )
    .sort()
    .join('|');
  const outfitSig = v.outfits
    .map(
      (o) =>
        `${o.id}:${o.updatedAt || 0}:${o.title}:${o.wornDate || ''}:${visualFieldSig(o.selfieUrl)}`
    )
    .sort()
    .join('|');
  const delItemSig = Object.entries(v.deletedItemIds || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, t]) => `${k}:${t}`)
    .join('|');
  const delOutfitSig = Object.entries(v.deletedOutfitIds || {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, t]) => `${k}:${t}`)
    .join('|');
  const customSubSig = JSON.stringify(v.customSubCategories || {});
  return `${v.hideSamples ? 1 : 0}#${itemSig}#${outfitSig}#${delItemSig}#${delOutfitSig}#${customSubSig}`;
}

async function prepareAndPushCompactVault(
  merged: ClosetVaultState,
  targetChannelsList: DerivedSyncChannels[],
  forceUploadShards = false
): Promise<{ pushedOk: boolean; allShardsUploaded: boolean }> {
  if (targetChannelsList.length === 0) {
    return { pushedOk: false, allShardsUploaded: false };
  }
  const primaryChannels = targetChannelsList[0];

  // Collect & deduplicate every inline data:image/* across ALL 4 garment image fields + outfit selfieUrl
  const pendingUploads = new Map<string, { shardSuffix: string; dataUrl: string }>();

  const tokenizeIfDataUrl = async (
    entityKey: string,
    val: string | undefined
  ): Promise<string | undefined> => {
    if (!val) return undefined;
    if (val === LOCAL_IDB_IMG_MARKER) return undefined;
    if (!val.startsWith('data:image/')) return val;
    const { token, shardSuffix } = await makePhotoShardToken(entityKey, val);
    if (!pendingUploads.has(shardSuffix)) {
      pendingUploads.set(shardSuffix, { shardSuffix, dataUrl: val });
    }
    return token;
  };

  const compactItems: WardrobeItem[] = [];
  for (const item of merged.items) {
    const imageUrl = await tokenizeIfDataUrl(`item_${item.id}`, item.imageUrl);
    const realCropUrl = await tokenizeIfDataUrl(`item_${item.id}`, item.realCropUrl);
    const flatlayUrl = await tokenizeIfDataUrl(`item_${item.id}`, item.flatlayUrl);
    const pastelUrl = await tokenizeIfDataUrl(`item_${item.id}`, item.pastelUrl);
    compactItems.push({
      ...item,
      imageUrl,
      realCropUrl,
      flatlayUrl,
      pastelUrl,
    });
  }

  const compactOutfits: SavedOutfit[] = [];
  for (const outfit of merged.outfits) {
    const selfieUrl = await tokenizeIfDataUrl(`outfit_${outfit.id}`, outfit.selfieUrl);
    compactOutfits.push({
      ...outfit,
      selfieUrl,
    });
  }

  const uploadEntries = Array.from(pendingUploads.values());
  let allShardsUploaded = true;
  const BATCH_SIZE = 2;
  for (let i = 0; i < uploadEntries.length; i += BATCH_SIZE) {
    const batch = uploadEntries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async ({ shardSuffix, dataUrl }) => {
        const resPerCh = await Promise.all(
          targetChannelsList.map((ch) =>
            uploadDataUrlShard(ch.imgPrefix, shardSuffix, dataUrl, forceUploadShards)
          )
        );
        return resPerCh.some(Boolean);
      })
    );
    if (batchResults.some((ok) => !ok)) {
      allShardsUploaded = false;
    }
  }

  // Always push compactVaultForCloud even if one photo shard needs background retry,
  // so item names, wearCounts, categories, outfits & succeeded photos appear in Browser immediately!
  const compactVaultForCloud: ClosetVaultState = {
    ...merged,
    items: compactItems,
    outfits: compactOutfits,
  };

  const encoded = LZString.compressToEncodedURIComponent(JSON.stringify(compactVaultForCloud));

  const pushResults = await Promise.all(
    targetChannelsList.map((ch) => writeTextDb(ch.vaultKey, encoded))
  );
  const pushedOk = pushResults.some(Boolean);

  if (pushedOk) {
    const shareKey = `bobocloset_share_v1_${primaryChannels.shareReadKey}`;
    void writeTextDb(shareKey, encoded);

    for (const ch of targetChannelsList) {
      try {
        await fetch(`${RELAY_BASE_URL}/${ch.relayTopic}`, {
          method: 'POST',
          body: JSON.stringify({ event: 'vault_updated', updatedAt: merged.updatedAt }),
          keepalive: true,
        });
      } catch {
        // ignore live relay network error; permanent KV is source of truth
      }
    }
  }

  return { pushedOk, allShardsUploaded };
}

/**
 * 雙向雲端同步（先 Pull 雙雲端與關聯大小寫通道 -> 無損 Merge -> 自動分片 Push 並嚴格驗證寫入結果！）
 */
export async function syncVaultWithCloud(
  localVault: ClosetVaultState,
  forcePush = false
): Promise<SyncVaultOutcome> {
  const primaryPasshash = await recoverPasshashFromIndexedDB();
  if (!primaryPasshash) {
    return {
      vault: localVault,
      synced: false,
      pulledFromCloud: false,
      pushedToCloud: false,
      fingerprintBadge: null,
      errorMessage: '尚未綁定雲端通行碼',
    };
  }

  const idbLinked = await idbGet<string[]>(IDB_VAULT_STORE, LINKED_PASSHASHES_KEY);
  const candidateHashes = Array.from(
    new Set<string>([
      primaryPasshash,
      ...getLinkedVariantHashes(),
      ...(Array.isArray(idbLinked) ? idbLinked : []),
    ])
  );

  const allChannels: DerivedSyncChannels[] = [];
  for (const h of candidateHashes) {
    const ch = await deriveSyncChannels(h);
    if (ch) allChannels.push(ch);
  }
  const primaryChannels = allChannels[0];
  if (!primaryChannels) {
    return {
      vault: localVault,
      synced: false,
      pulledFromCloud: false,
      pushedToCloud: false,
      fingerprintBadge: null,
      errorMessage: '通行碼通道初始化失敗',
    };
  }

  const allImgPrefixes = allChannels.map((c) => c.imgPrefix);

  // Step 1: Pull from ALL candidate channels (both textdb.online & textdb.dev) in parallel
  const pulledPerChannel = await Promise.all(
    allChannels.map(async (ch) => ({
      ch,
      vaults: await readAllCloudVaultCandidates(ch.vaultKey),
    }))
  );

  let combinedRemote: ClosetVaultState | null = null;
  const activeRemoteChannels: DerivedSyncChannels[] = [primaryChannels];

  for (const { ch, vaults } of pulledPerChannel) {
    if (vaults.length > 0 && ch.vaultKey !== primaryChannels.vaultKey) {
      activeRemoteChannels.push(ch);
    }
    for (const rawRemoteVault of vaults) {
      const hydrated = await hydrateRemoteVaultPhotos(rawRemoteVault, localVault, allImgPrefixes);
      combinedRemote = combinedRemote ? mergeVaultStates(combinedRemote, hydrated) : hydrated;
    }
  }

  // Step 2: Merge local + remote safely
  const merged = combinedRemote ? mergeVaultStates(localVault, combinedRemote) : localVault;

  // Step 3: Determine if cloud needs to be updated
  const hasRealEdits =
    (merged.updatedAt || 1000) > 1000 ||
    merged.items.some((i) => !i.isSample) ||
    merged.outfits.some((o) => !o.isSample) ||
    Object.keys(merged.deletedItemIds || {}).length > 0 ||
    Object.keys(merged.deletedOutfitIds || {}).length > 0 ||
    Object.keys(merged.customSubCategories || {}).length > 0;

  const differsFromRemote =
    !combinedRemote ||
    (merged.updatedAt || 1000) > (combinedRemote.updatedAt || 1000) ||
    vaultStateDigest(merged) !== vaultStateDigest(combinedRemote);

  const shouldPush = hasRealEdits && (forcePush || differsFromRemote);

  let pushedToCloud = false;
  let allShardsUploaded = true;
  if (shouldPush) {
    const pushRes = await prepareAndPushCompactVault(merged, activeRemoteChannels, forcePush);
    pushedToCloud = pushRes.pushedOk;
    allShardsUploaded = pushRes.allShardsUploaded;
  }

  saveLocalVault(merged);

  if (shouldPush && !pushedToCloud) {
    return {
      vault: merged,
      synced: false,
      pulledFromCloud: Boolean(combinedRemote),
      pushedToCloud: false,
      fingerprintBadge: primaryChannels.fingerprintBadge,
      errorMessage: '雲端網路暫時忙碌，修改已安全保存在本機雙重資料庫，稍後將自動重試同步！',
    };
  }

  if (shouldPush && !allShardsUploaded) {
    return {
      vault: merged,
      synced: true,
      pulledFromCloud: Boolean(combinedRemote),
      pushedToCloud: true,
      partialPhotoPending: true,
      fingerprintBadge: primaryChannels.fingerprintBadge,
      errorMessage: '單品資料已同步至雲端，部分高畫質照片正在背景續傳中…',
    };
  }

  return {
    vault: merged,
    synced: Boolean(pushedToCloud || combinedRemote),
    pulledFromCloud: Boolean(combinedRemote),
    pushedToCloud,
    fingerprintBadge: primaryChannels.fingerprintBadge,
  };
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
