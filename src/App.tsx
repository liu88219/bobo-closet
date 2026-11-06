import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookHeart,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  Shirt,
  Sparkles,
} from 'lucide-react';
import { AddItemModal } from './components/AddItemModal';
import { LookbookJournal } from './components/LookbookJournal';
import { QuokkaBoboAvatar } from './components/MascotIllustrations';
import { OutfitStylist } from './components/OutfitStylist';
import { SyncSettingsModal } from './components/SyncSettingsModal';
import { WardrobeGallery } from './components/WardrobeGallery';
import {
  APP_SYNC_VERSION,
  createInitialVaultState,
  deriveSyncChannels,
  exportVaultJsonFile,
  fetchSharedReadOnlyVault,
  getSavedPasshash,
  loadFullLocalVaultState,
  loadLocalVault,
  mergeVaultStates,
  parseImportedVaultJson,
  recoverPasshashFromIndexedDB,
  requestPersistentStorage,
  resolveBestPasshashOnBind,
  saveLocalVault,
  savePasshash,
  subscribeToVaultLiveUpdates,
  syncVaultWithCloud,
} from './services/cloudSync';
import {
  ClosetVaultState,
  ClothingCategory,
  GeneratedOutfitProposal,
  SavedOutfit,
  StylingContextInput,
  WardrobeItem,
} from './types/wardrobe';

type ActiveTab = 'closet' | 'stylist' | 'lookbook';

export const App: React.FC = () => {
  const [vault, setVault] = useState<ClosetVaultState>(() => {
    return loadLocalVault() || createInitialVaultState();
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>('closet');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [lockedItemIdForStylist, setLockedItemIdForStylist] = useState<string | null>(null);

  const [hasPasscode, setHasPasscode] = useState<boolean>(() => Boolean(getSavedPasshash()));
  const [quickPassInput, setQuickPassInput] = useState('');
  const [showQuickPass, setShowQuickPass] = useState(false);
  const [fingerprintBadge, setFingerprintBadge] = useState<string | null>(null);
  const [hasUnsyncedChanges, setHasUnsyncedChanges] = useState(false);
  const [pairUrl, setPairUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [hasNewerAppBundle, setHasNewerAppBundle] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedText, setLastSyncedText] = useState<string>('本機雙重備份保護中');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isReadOnlyShareView, setIsReadOnlyShareView] = useState(false);

  const vaultRef = useRef(vault);
  vaultRef.current = vault;
  const syncInFlightRef = useRef(false);
  const pendingSyncRef = useRef<{ forcePush: boolean; showFeedback: boolean } | null>(null);
  const bootReadyPromiseRef = useRef<Promise<void> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3400);
  }, []);

  const refreshShareUrl = useCallback(async () => {
    const activeHash = await recoverPasshashFromIndexedDB();
    const channels = await deriveSyncChannels(activeHash);
    if (!channels || !activeHash) {
      setShareUrl(null);
      setPairUrl(null);
      setFingerprintBadge(null);
      return;
    }
    const base = `${window.location.origin}${window.location.pathname}`;
    setShareUrl(`${base}?s=${channels.shareReadKey}`);
    setPairUrl(`${base}?pair=${activeHash}`);
    setFingerprintBadge(channels.fingerprintBadge);
  }, []);

  const checkForNewerAppBundle = useCallback(async () => {
    try {
      const currentScripts = Array.from(document.querySelectorAll('script[src]'))
        .map((s) => s.getAttribute('src') || '')
        .find((src) => src.includes('assets/index-'));
      if (!currentScripts) return;
      const res = await fetch(`${window.location.pathname}?check=${Date.now()}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const html = await res.text();
      const match = html.match(/assets\/index-[A-Za-z0-9_-]+\.js/);
      if (match && !currentScripts.includes(match[0])) {
        setHasNewerAppBundle(true);
      }
    } catch {
      // ignore offline bundle check
    }
  }, []);

  const triggerCloudSync = useCallback(
    async (baseState?: ClosetVaultState, forcePush = false, showFeedback = false) => {
      if (isReadOnlyShareView) return;
      if (bootReadyPromiseRef.current) {
        await bootReadyPromiseRef.current;
      }

      const activePasshash = await recoverPasshashFromIndexedDB();
      if (!activePasshash) {
        if (showFeedback) {
          showToast('🔑 請先輸入與另一台裝置相同的通行碼（或貼上免打字配對連結）即可同步！');
          setIsSyncModalOpen(true);
        }
        return;
      }

      if (syncInFlightRef.current) {
        pendingSyncRef.current = {
          forcePush: Boolean(pendingSyncRef.current?.forcePush || forcePush),
          showFeedback: Boolean(pendingSyncRef.current?.showFeedback || showFeedback),
        };
        return;
      }

      syncInFlightRef.current = true;
      setIsSyncing(true);
      try {
        const target = baseState
          ? mergeVaultStates(vaultRef.current, baseState)
          : vaultRef.current;
        const outcome = await syncVaultWithCloud(target, forcePush);
        if (outcome.fingerprintBadge) {
          setFingerprintBadge(outcome.fingerprintBadge);
        }

        let finalMerged = outcome.vault;
        setVault((prev) => {
          const safeMerged = mergeVaultStates(prev, outcome.vault);
          finalMerged = safeMerged;
          vaultRef.current = safeMerged;
          saveLocalVault(safeMerged);
          return safeMerged;
        });

        if (outcome.errorMessage && !outcome.partialPhotoPending) {
          if (forcePush) setHasUnsyncedChanges(true);
          setLastSyncedText('待自動重試同步（已存本機保險箱）');
          if (showFeedback) {
            showToast(`⚠️ ${outcome.errorMessage}`);
          }
        } else {
          setHasUnsyncedChanges(Boolean(outcome.partialPhotoPending));
          const timeStr = new Date().toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
          });
          setLastSyncedText(`已與雙雲端對齊 (${timeStr})`);
          if (showFeedback) {
            const visibleCount = finalMerged.items.filter(
              (i) => !(finalMerged.hideSamples && i.isSample)
            ).length;
            const customCount = finalMerged.items.filter((i) => !i.isSample).length;
            const badgeText = outcome.fingerprintBadge ? ` ${outcome.fingerprintBadge}` : '';
            showToast(
              `✅ 已同步雙雲端${badgeText}（共 ${visibleCount} 件衣服 · 自訂 ${customCount} 件）`
            );
          }
        }
      } catch {
        if (forcePush) setHasUnsyncedChanges(true);
        if (showFeedback) {
          showToast('⚠️ 網路暫時離線，變更已安全保存在本機雙重資料庫');
        }
      } finally {
        syncInFlightRef.current = false;
        setIsSyncing(false);

        const nextPending = pendingSyncRef.current;
        if (nextPending) {
          pendingSyncRef.current = null;
          void triggerCloudSync(
            vaultRef.current,
            nextPending.forcePush,
            nextPending.showFeedback
          );
        }
      }
    },
    [isReadOnlyShareView, showToast]
  );

  // Boot: persistent storage + IndexedDB full photo recovery + ?pair= 1-click pairing + ?s= share link OR initial cloud pull
  useEffect(() => {
    void requestPersistentStorage();
    void checkForNewerAppBundle();

    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('s');
    if (shareParam) {
      setIsReadOnlyShareView(true);
      fetchSharedReadOnlyVault(shareParam).then((shared) => {
        if (shared) {
          setVault(shared);
          showToast('👀 正在瀏覽唯讀分享的奶油衣櫥');
        }
      });
      return;
    }

    const pairParam = (params.get('pair') || '').trim();
    const validPairHash = /^[a-f0-9]{16,128}$/i.test(pairParam) ? pairParam.toLowerCase() : null;
    if (validPairHash) {
      savePasshash(validPairHash);
      setHasPasscode(true);
      try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('pair');
        window.history.replaceState({}, '', cleanUrl.toString());
      } catch {
        // ignore URL clean error
      }
    }

    let mounted = true;
    let resolveBoot!: () => void;
    bootReadyPromiseRef.current = new Promise<void>((res) => {
      resolveBoot = res;
    });

    const init = async () => {
      let mergedBoot = vaultRef.current;
      let recoveredHash: string | null = validPairHash;
      try {
        const [fullLocal, idbHash] = await Promise.all([
          loadFullLocalVaultState(),
          recoverPasshashFromIndexedDB(),
        ]);
        recoveredHash = validPairHash || idbHash;
        if (mounted) {
          setVault((prev) => {
            mergedBoot = mergeVaultStates(prev, fullLocal);
            vaultRef.current = mergedBoot;
            return mergedBoot;
          });
        }
      } finally {
        resolveBoot();
        bootReadyPromiseRef.current = null;
      }

      if (!mounted) return;
      if (recoveredHash) {
        setHasPasscode(true);
        await refreshShareUrl();
        await triggerCloudSync(
          mergedBoot,
          (mergedBoot.updatedAt || 1000) > 1000 || mergedBoot.items.some((i) => !i.isSample),
          Boolean(validPairHash)
        );
      }
    };
    void init();
    return () => {
      mounted = false;
      resolveBoot();
    };
  }, [checkForNewerAppBundle, refreshShareUrl, showToast, triggerCloudSync]);

  // Foreground wakeup auto-sync (visibilitychange + window focus + online) for iPhone Safari <-> Home Screen PWA
  useEffect(() => {
    if (isReadOnlyShareView) return;

    const onWake = () => {
      if (document.visibilityState === 'visible') {
        void checkForNewerAppBundle();
        void recoverPasshashFromIndexedDB().then((h) => {
          if (h) {
            setHasPasscode(true);
            void triggerCloudSync(undefined, hasUnsyncedChanges, false);
          }
        });
      }
    };

    const onOnline = () => {
      void recoverPasshashFromIndexedDB().then((h) => {
        if (h) {
          setHasPasscode(true);
          void triggerCloudSync(undefined, true, false);
        }
      });
    };

    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('online', onOnline);
    return () => {
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('online', onOnline);
    };
  }, [checkForNewerAppBundle, isReadOnlyShareView, hasUnsyncedChanges, triggerCloudSync]);

  // Automatic background retry when cloud push is pending
  useEffect(() => {
    if (!hasUnsyncedChanges || !hasPasscode || isReadOnlyShareView) return;
    const timer = window.setInterval(() => {
      void triggerCloudSync(vaultRef.current, true, false);
    }, 15000);
    return () => clearInterval(timer);
  }, [hasUnsyncedChanges, hasPasscode, isReadOnlyShareView, triggerCloudSync]);

  // Live SSE wakeup listener + 8s foreground auto-pull fallback (updates open Browser window even if SSE is blocked!)
  useEffect(() => {
    if (!hasPasscode || isReadOnlyShareView) return;
    let unsub: (() => void) | null = null;
    let cancelled = false;

    deriveSyncChannels().then((ch) => {
      if (!cancelled && ch) {
        unsub = subscribeToVaultLiveUpdates(ch.relayTopic, () => {
          void triggerCloudSync(undefined, false, false);
        });
      }
    });

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void triggerCloudSync(undefined, false, false);
      }
    }, 8000);

    return () => {
      cancelled = true;
      unsub?.();
      window.clearInterval(pollTimer);
    };
  }, [hasPasscode, isReadOnlyShareView, triggerCloudSync]);

  // Helper to commit local edits + schedule immediate cloud push
  const commitVaultUpdate = useCallback(
    (updater: (prev: ClosetVaultState) => ClosetVaultState) => {
      if (isReadOnlyShareView) return;
      setVault((prev) => {
        const nextRaw = updater(prev);
        const next: ClosetVaultState = {
          ...nextRaw,
          updatedAt: Date.now(),
        };
        vaultRef.current = next;
        saveLocalVault(next);
        if (hasPasscode || getSavedPasshash()) {
          void triggerCloudSync(next, true, false);
        }
        return next;
      });
    },
    [isReadOnlyShareView, triggerCloudSync]
  );

  // Item CRUD handlers
  const upsertItemInVault = (savedItem: WardrobeItem) => {
    commitVaultUpdate((prev) => {
      const exists = prev.items.some((i) => i.id === savedItem.id);
      const nextItems = exists
        ? prev.items.map((i) => (i.id === savedItem.id ? savedItem : i))
        : [savedItem, ...prev.items];
      const nextDeleted = { ...prev.deletedItemIds };
      delete nextDeleted[savedItem.id];
      return {
        ...prev,
        items: nextItems,
        deletedItemIds: nextDeleted,
      };
    });
  };

  const handleSaveItem = (savedItem: WardrobeItem) => {
    upsertItemInVault(savedItem);
    setIsAddModalOpen(false);
    setEditingItem(null);
    showToast(`🧺 已將「${savedItem.name}」收入奶油衣櫥！`);
  };

  const handleSaveAndContinueSamePhoto = (savedItem: WardrobeItem) => {
    upsertItemInVault(savedItem);
    showToast(`✂️ 已先存入「${savedItem.name}」！請框選同張照片的下一件單品`);
  };

  const handleDeleteItem = (itemId: string) => {
    commitVaultUpdate((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== itemId),
      deletedItemIds: {
        ...prev.deletedItemIds,
        [itemId]: Date.now(),
      },
    }));
    setIsAddModalOpen(false);
    setEditingItem(null);
    showToast('🗑️ 已從衣櫥移除單品');
  };

  const handleToggleFavoriteItem = (itemId: string) => {
    const now = Date.now();
    commitVaultUpdate((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.id === itemId ? { ...i, isFavorite: !i.isFavorite, updatedAt: now } : i
      ),
    }));
  };

  const handleToggleLaundry = (itemId: string) => {
    const now = Date.now();
    let targetName = '';
    let nextLaundry = false;
    commitVaultUpdate((prev) => ({
      ...prev,
      items: prev.items.map((i) => {
        if (i.id !== itemId) return i;
        targetName = i.name;
        nextLaundry = !i.inLaundry;
        return { ...i, inLaundry: nextLaundry, updatedAt: now };
      }),
    }));
    if (targetName) {
      showToast(
        nextLaundry
          ? `🧺「${targetName}」已標記待洗，今日穿搭將自動避開`
          : `✨「${targetName}」洗好回歸衣櫥囉！`
      );
    }
  };

  const handleToggleHideSamples = () => {
    commitVaultUpdate((prev) => ({
      ...prev,
      hideSamples: !prev.hideSamples,
    }));
  };

  const handleAdjustWearCount = (itemId: string, delta: number) => {
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    commitVaultUpdate((prev) => ({
      ...prev,
      items: prev.items.map((i) => {
        if (i.id !== itemId) return i;
        const nextCount = Math.max(0, (i.wearCount || 0) + delta);
        return {
          ...i,
          wearCount: nextCount,
          lastWornDate: delta > 0 ? todayStr : nextCount === 0 ? undefined : i.lastWornDate,
          updatedAt: now,
        };
      }),
    }));
  };

  const handleAddCustomSubCategory = (cat: ClothingCategory, label: string) => {
    const clean = label.trim();
    if (!clean) return;
    commitVaultUpdate((prev) => {
      const existing = prev.customSubCategories?.[cat] || [];
      if (existing.includes(clean)) return prev;
      return {
        ...prev,
        customSubCategories: {
          ...(prev.customSubCategories || {}),
          [cat]: [...existing, clean],
        },
      };
    });
    showToast(`🏷️ 已新增自訂款式版型「${clean}」`);
  };

  const handleRemoveCustomSubCategory = (cat: ClothingCategory, label: string) => {
    commitVaultUpdate((prev) => {
      const existing = prev.customSubCategories?.[cat] || [];
      return {
        ...prev,
        customSubCategories: {
          ...(prev.customSubCategories || {}),
          [cat]: existing.filter((x) => x !== label),
        },
      };
    });
  };

  // Outfit Stylist -> Save to Lookbook / Wear Today
  const handleSaveProposalToLookbook = (
    proposal: GeneratedOutfitProposal,
    ctx: StylingContextInput,
    markWornToday: boolean
  ) => {
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    const outfitRecord: SavedOutfit = {
      id: `outfit-${now}-${Math.random().toString(36).slice(2, 6)}`,
      title: ctx.locationNote.trim()
        ? `${ctx.locationNote.trim()} · 奶油穿搭`
        : proposal.title,
      itemIds: proposal.items.map((i) => i.id),
      occasion: ctx.occasion,
      timeOfDay: ctx.timeOfDay,
      temperature: ctx.temperature,
      weather: ctx.weather,
      locationNote: ctx.locationNote.trim() || '日常外出',
      companions: ctx.companions.trim() || undefined,
      stylistComment: proposal.stylistComment,
      colorFormula: proposal.colorFormula,
      wornDate: markWornToday ? todayStr : undefined,
      isAiCurated: true,
      isFavorite: true,
      isSample: false,
      createdAt: now,
      updatedAt: now,
    };

    const wornSet = new Set(outfitRecord.itemIds);
    commitVaultUpdate((prev) => ({
      ...prev,
      items: markWornToday
        ? prev.items.map((i) =>
            wornSet.has(i.id)
              ? {
                  ...i,
                  wearCount: (i.wearCount || 0) + 1,
                  lastWornDate: todayStr,
                  updatedAt: now,
                }
              : i
          )
        : prev.items,
      outfits: [outfitRecord, ...prev.outfits],
    }));

    showToast(
      markWornToday
        ? '✨ 已記錄今日 OOTD 並為單品累加實穿次數！'
        : '🔖 已收藏至穿搭靈感簿！'
    );
  };

  const handleToggleFavoriteOutfit = (outfitId: string) => {
    const now = Date.now();
    commitVaultUpdate((prev) => ({
      ...prev,
      outfits: prev.outfits.map((o) =>
        o.id === outfitId ? { ...o, isFavorite: !o.isFavorite, updatedAt: now } : o
      ),
    }));
  };

  const handleDeleteOutfit = (outfitId: string) => {
    commitVaultUpdate((prev) => ({
      ...prev,
      outfits: prev.outfits.filter((o) => o.id !== outfitId),
      deletedOutfitIds: {
        ...prev.deletedOutfitIds,
        [outfitId]: Date.now(),
      },
    }));
    showToast('🗑️ 已刪除穿搭紀錄');
  };

  const handleAttachSelfie = (outfitId: string, selfieDataUrl: string) => {
    const now = Date.now();
    commitVaultUpdate((prev) => ({
      ...prev,
      outfits: prev.outfits.map((o) =>
        o.id === outfitId ? { ...o, selfieUrl: selfieDataUrl, updatedAt: now } : o
      ),
    }));
    showToast('📸 已儲存今日對鏡 OOTD 實拍照！');
  };

  const handleWearOutfitToday = (outfitId: string) => {
    const now = Date.now();
    const todayStr = new Date().toISOString().slice(0, 10);
    const target = vault.outfits.find((o) => o.id === outfitId);
    if (!target) return;
    const idSet = new Set(target.itemIds);

    commitVaultUpdate((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        idSet.has(i.id)
          ? {
              ...i,
              wearCount: (i.wearCount || 0) + 1,
              lastWornDate: todayStr,
              updatedAt: now,
            }
          : i
      ),
      outfits: prev.outfits.map((o) =>
        o.id === outfitId ? { ...o, wornDate: todayStr, updatedAt: now } : o
      ),
    }));
    showToast(`✨ 已更新「${target.title}」為今日穿搭！`);
  };

  // Passcode & Backup Handlers
  const handleBindPasscode = async (passcode: string) => {
    const clean = passcode.trim();
    if (!clean) return;
    setIsSyncing(true);
    try {
      const passhash = await resolveBestPasshashOnBind(clean);
      savePasshash(passhash);
      setHasPasscode(true);
      await refreshShareUrl();
      // Critical Rule 4: Pull & merge cloud FIRST before pushing!
      const outcome = await syncVaultWithCloud(vaultRef.current, true);
      setVault((prev) => {
        const safeMerged = mergeVaultStates(prev, outcome.vault);
        vaultRef.current = safeMerged;
        saveLocalVault(safeMerged);
        return safeMerged;
      });
      if (outcome.errorMessage) {
        setHasUnsyncedChanges(true);
        setLastSyncedText('已綁定通行碼 · 待網路重試同步');
        showToast(`⚠️ ${outcome.errorMessage}`);
      } else {
        setHasUnsyncedChanges(false);
        const timeStr = new Date().toLocaleTimeString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setLastSyncedText(`已綁定通行碼並同步雙雲端 (${timeStr})`);
        showToast('🔐 通行碼綁定成功！Safari 與主畫面 App 已互通 ✨');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectPasscode = () => {
    savePasshash(null);
    setHasPasscode(false);
    setPairUrl(null);
    setShareUrl(null);
    setFingerprintBadge(null);
    setHasUnsyncedChanges(false);
    setLastSyncedText('本機雙重備份保護中（未綁定雲端通行碼）');
    showToast('已在此裝置解除雲端通行碼綁定');
  };

  const handleRestoreSnapshot = (snapVault: ClosetVaultState) => {
    commitVaultUpdate((prev) => mergeVaultStates(prev, snapVault));
    showToast('🛟 已無損合併救回本機歷史快照衣櫥！');
  };

  const handleImportJsonFile = async (file: File) => {
    try {
      const raw = await file.text();
      const imported = parseImportedVaultJson(raw);
      const merged = mergeVaultStates(vaultRef.current, imported);
      const stamped = { ...merged, updatedAt: Date.now() };
      setVault(stamped);
      saveLocalVault(stamped);
      if (getSavedPasshash()) {
        await triggerCloudSync(stamped, true, false);
      }
      showToast('✅ 成功匯入並合併奶油衣櫥備份檔！');
      setIsSyncModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : '匯入失敗，請確認檔案格式');
    }
  };

  const activeItemsForStylist = useMemo(
    () => vault.items.filter((i) => !(vault.hideSamples && i.isSample)),
    [vault.items, vault.hideSamples]
  );

  return (
    <div className="min-h-screen flex flex-col pb-24 sm:pb-12">
      {/* Top Cream Header */}
      <header className="sticky top-0 z-30 bg-[#FAF8F3]/92 backdrop-blur-md border-b border-[#DDD7C9]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <QuokkaBoboAvatar className="w-11 h-11 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-extrabold text-[#2D251E] tracking-tight truncate">
                  BoboCloset 奶油衣櫥
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-[#F2CA62]/85 text-[10px] font-bold text-[#2D251E]">
                  Quokka &amp; BOBO OOTD
                </span>
              </div>
              <p className="text-[11px] text-[#7D7063] truncate">
                {isReadOnlyShareView
                  ? '👀 唯讀展示模式 · 點右上可回到自己的衣櫥'
                  : `${activeItemsForStylist.length} 件衣服 · ${lastSyncedText}${
                      fingerprintBadge ? ` · ${fingerprintBadge}` : ' · 未綁定通行碼'
                    } · ${APP_SYNC_VERSION}`}
              </p>
            </div>
          </div>

          {/* Mandatory iOS Standalone Refresh Sync + Passcode Vault Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isReadOnlyShareView ? (
              <a
                href={window.location.pathname}
                className="bobo-btn px-3 py-1.5 rounded-2xl bg-[#C48E63] text-[#FFFDF9] text-xs font-bold"
              >
                開啟我的衣櫥
              </a>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => void triggerCloudSync(undefined, true, true)}
                  disabled={isSyncing}
                  className="bobo-btn-soft inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-[#FAF8F3] text-xs font-bold text-[#2D251E]"
                  title="立即與雲端同步最新衣櫥與穿搭"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-[#C48E63] ${
                      isSyncing ? 'animate-spin' : ''
                    }`}
                  />
                  <span>{hasUnsyncedChanges ? '待同步' : '雲端同步'}</span>
                  {hasPasscode && (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        hasUnsyncedChanges ? 'bg-[#D9822B]' : 'bg-[#5A9E54]'
                      }`}
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(true)}
                  className={`bobo-btn-soft inline-flex items-center gap-1 px-2.5 py-1.5 rounded-2xl text-xs font-bold ${
                    hasPasscode
                      ? 'bg-[#EBF3EC] text-[#3F6949] border-[#C6DEC8]'
                      : 'bg-[#EFECE4] text-[#5C5044]'
                  }`}
                  title="設定跨瀏覽器同步通行碼或下載備份"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {hasPasscode ? fingerprintBadge || '已綁定' : '通行碼 / 備份'}
                  </span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        <div className="hidden sm:block max-w-5xl mx-auto px-4 pb-2.5">
          <div className="inline-flex p-1 rounded-2xl bg-[#EFECE4] border border-[#DDD7C9] gap-1">
            {[
              { id: 'closet' as const, label: '🧺 我的奶油衣櫥', icon: Shirt },
              { id: 'stylist' as const, label: '✨ 今日情境穿搭顧問', icon: Sparkles },
              { id: 'lookbook' as const, label: '📖 穿搭靈感 ＆ OOTD 日記', icon: BookHeart },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
                    active
                      ? 'bg-[#F2CA62] text-[#2D251E] shadow-sm'
                      : 'text-[#6E6155] hover:text-[#2D251E]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#2D251E] text-[#FAF8F3] text-xs font-bold shadow-lg">
          {toastMsg}
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-5 space-y-4">
        {hasNewerAppBundle && (
          <div className="p-3 rounded-2xl bg-[#F2CA62]/45 border border-[#DEC273] flex items-center justify-between gap-2 text-xs font-bold text-[#2D251E]">
            <span>✨ 偵測到最新雲端同步程式版本，點擊右側即可安全同步並載入最新版！</span>
            <button
              type="button"
              onClick={async () => {
                await triggerCloudSync(undefined, true, false);
                const url = new URL(window.location.href);
                url.searchParams.set('v', String(Date.now()));
                window.location.replace(url.toString());
              }}
              className="bobo-btn px-3 py-1.5 rounded-xl bg-[#C48E63] text-[#FFFDF9] text-xs font-bold shrink-0"
            >
              立即無損更新
            </button>
          </div>
        )}
        {!hasPasscode && !isReadOnlyShareView && (
          <div className="p-3.5 rounded-2xl bg-[#FFFDF9] border border-[#E7D6BE] shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#422B1D]">
              <Lock className="w-3.5 h-3.5 text-[#BA7E4D]" />
              <span>設定專屬通行碼：自動同步 Safari ↔ iPhone「加入主畫面」所有衣服與 3 視角照片</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showQuickPass ? 'text' : 'password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  value={quickPassInput}
                  onChange={(e) => setQuickPassInput(e.target.value)}
                  placeholder="輸入自訂通行碼解鎖／建立雙雲端自動同步"
                  className="w-full pl-3 pr-8 py-1.5 rounded-xl border border-[#E7D6BE] bg-[#FAF8F3] text-xs text-[#2D251E]"
                />
                <button
                  type="button"
                  onClick={() => setShowQuickPass((s) => !s)}
                  className="absolute right-2.5 top-1.5 text-[#7D7063]"
                  title={showQuickPass ? '隱藏通行碼' : '顯示通行碼'}
                >
                  {showQuickPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button
                type="button"
                disabled={isSyncing || !quickPassInput.trim()}
                onClick={() => {
                  const val = quickPassInput.trim();
                  if (val) {
                    setQuickPassInput('');
                    void handleBindPasscode(val);
                  }
                }}
                className="bobo-btn px-3.5 py-1.5 rounded-xl bg-[#BA7E4D] text-[#FFFDF9] text-xs font-bold shrink-0"
              >
                啟用同步
              </button>
            </div>
          </div>
        )}

        {activeTab === 'closet' && (
          <WardrobeGallery
            items={vault.items}
            hideSamples={vault.hideSamples}
            onToggleHideSamples={handleToggleHideSamples}
            onOpenAddModal={() => {
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
            onEditItem={(item) => {
              setEditingItem(item);
              setIsAddModalOpen(true);
            }}
            onToggleFavorite={handleToggleFavoriteItem}
            onToggleLaundry={handleToggleLaundry}
            onAdjustWearCount={handleAdjustWearCount}
            onQuickStyleWithItem={(itemId) => {
              setLockedItemIdForStylist(itemId);
              setActiveTab('stylist');
            }}
          />
        )}

        {activeTab === 'stylist' && (
          <OutfitStylist
            items={activeItemsForStylist}
            savedOutfits={vault.outfits}
            initialLockedItemId={lockedItemIdForStylist}
            onClearInitialLock={() => setLockedItemIdForStylist(null)}
            onSaveOutfitToLookbook={handleSaveProposalToLookbook}
          />
        )}

        {activeTab === 'lookbook' && (
          <LookbookJournal
            outfits={vault.outfits}
            items={vault.items}
            hideSamples={vault.hideSamples}
            onToggleFavoriteOutfit={handleToggleFavoriteOutfit}
            onDeleteOutfit={handleDeleteOutfit}
            onAttachSelfie={handleAttachSelfie}
            onWearOutfitToday={handleWearOutfitToday}
          />
        )}
      </main>

      {/* Mobile Bottom Dock Navigation */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-[#FFFDF9]/95 backdrop-blur-md border-t-2 border-[#E7D6BE] px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-4 gap-1 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('closet')}
            className={`flex flex-col items-center py-1 rounded-xl text-[11px] font-bold ${
              activeTab === 'closet' ? 'text-[#422B1D] bg-[#FAF5EC]' : 'text-[#8E6D56]'
            }`}
          >
            <Shirt className="w-4 h-4 mb-0.5 text-[#BA7E4D]" />
            <span>奶油衣櫥</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stylist')}
            className={`flex flex-col items-center py-1 rounded-xl text-[11px] font-bold ${
              activeTab === 'stylist' ? 'text-[#422B1D] bg-[#FAF5EC]' : 'text-[#8E6D56]'
            }`}
          >
            <Sparkles className="w-4 h-4 mb-0.5 text-[#BA7E4D]" />
            <span>穿搭顧問</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lookbook')}
            className={`flex flex-col items-center py-1 rounded-xl text-[11px] font-bold ${
              activeTab === 'lookbook' ? 'text-[#422B1D] bg-[#FAF5EC]' : 'text-[#8E6D56]'
            }`}
          >
            <BookHeart className="w-4 h-4 mb-0.5 text-[#BA7E4D]" />
            <span>OOTD 日記</span>
          </button>

          {!isReadOnlyShareView && (
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="bobo-btn flex flex-col items-center py-1.5 rounded-2xl bg-[#BA7E4D] text-[#FFFDF9] text-[11px] font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>新增衣服</span>
            </button>
          )}
        </div>
      </nav>

      {/* Modals */}
      {isAddModalOpen && !isReadOnlyShareView && (
        <AddItemModal
          initialItem={editingItem}
          customSubCategories={vault.customSubCategories}
          onAddCustomSubCategory={handleAddCustomSubCategory}
          onRemoveCustomSubCategory={handleRemoveCustomSubCategory}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          onSaveAndContinueSamePhoto={handleSaveAndContinueSamePhoto}
          onDelete={editingItem ? handleDeleteItem : undefined}
        />
      )}

      {isSyncModalOpen && (
        <SyncSettingsModal
          hasPasscode={hasPasscode}
          pairUrl={pairUrl}
          shareUrl={shareUrl}
          fingerprintBadge={fingerprintBadge}
          hasUnsyncedChanges={hasUnsyncedChanges}
          isSyncing={isSyncing}
          lastSyncedText={lastSyncedText}
          onClose={() => setIsSyncModalOpen(false)}
          onBindPasscode={handleBindPasscode}
          onForceSyncNow={() => triggerCloudSync(undefined, true, true)}
          onDisconnectPasscode={handleDisconnectPasscode}
          onExportJson={() => exportVaultJsonFile(vault)}
          onImportJsonFile={handleImportJsonFile}
          onRestoreSnapshot={handleRestoreSnapshot}
        />
      )}
    </div>
  );
};

export default App;
