import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Download,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Link2,
  LogOut,
  RefreshCw,
  Smartphone,
  Upload,
  X,
} from 'lucide-react';
import {
  APP_SYNC_VERSION,
  LocalVaultSnapshot,
  listLocalVaultSnapshots,
} from '../services/cloudSync';
import { ClosetVaultState } from '../types/wardrobe';

interface SyncSettingsModalProps {
  hasPasscode: boolean;
  fingerprintBadge: string | null;
  hasUnsyncedChanges: boolean;
  isSyncing?: boolean;
  pairUrl?: string | null;
  shareUrl: string | null;
  lastSyncedText: string;
  onClose: () => void;
  onBindPasscode: (passcode: string) => Promise<void>;
  onForceSyncNow?: () => Promise<void>;
  onDisconnectPasscode: () => void;
  onExportJson: () => void;
  onImportJsonFile: (file: File) => Promise<void>;
  onRestoreSnapshot?: (snapVault: ClosetVaultState) => void;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  hasPasscode,
  fingerprintBadge,
  hasUnsyncedChanges,
  isSyncing = false,
  pairUrl = null,
  shareUrl,
  lastSyncedText,
  onClose,
  onBindPasscode,
  onForceSyncNow,
  onDisconnectPasscode,
  onExportJson,
  onImportJsonFile,
  onRestoreSnapshot,
}) => {
  const [passInput, setPassInput] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [isBinding, setIsBinding] = useState(false);
  const [copiedPair, setCopiedPair] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [snapshots, setSnapshots] = useState<LocalVaultSnapshot[]>([]);
  const importRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let active = true;
    listLocalVaultSnapshots().then((list) => {
      if (active) setSnapshots(list);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput.trim().length < 4) {
      alert('請輸入至少 4 個字元的專屬衣櫥同步通行碼');
      return;
    }
    setIsBinding(true);
    try {
      await onBindPasscode(passInput.trim());
      setPassInput('');
    } finally {
      setIsBinding(false);
    }
  };

  const handleCopyPairLink = async () => {
    if (!pairUrl) return;
    try {
      await navigator.clipboard.writeText(pairUrl);
      setCopiedPair(true);
      setTimeout(() => setCopiedPair(false), 2500);
    } catch {
      alert(pairUrl);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    } catch {
      alert(shareUrl);
    }
  };

  const handleSyncAndReloadBundle = async () => {
    if (onForceSyncNow) {
      await onForceSyncNow();
    }
    const url = new URL(window.location.href);
    url.searchParams.set('v', String(Date.now()));
    window.location.replace(url.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2D251E]/40 backdrop-blur-[2px] p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#FAF8F3] border-t sm:border border-[#DDD7C9] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#C48E63]" />
            <h2 className="text-base sm:text-lg font-bold text-[#2D251E]">
              跨裝置永久雙雲端同步 ＆ 備份
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-[#EFECE4] text-[10px] font-bold text-[#7D7063]">
              {APP_SYNC_VERSION}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[#EFECE4] text-[#5C5044]"
            aria-label="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#EFECE4]/70 border border-[#DDD7C9] space-y-2 text-xs text-[#2D251E]">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="font-bold text-[#2D251E]">
              📱 主畫面 App ↔ Safari / 電腦互通核對：
            </p>
            {fingerprintBadge ? (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FAF8F3] border border-[#DDD7C9] text-[11px] font-extrabold text-[#2D251E]">
                雲端印記 {fingerprintBadge}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-[#FCF0EE] border border-[#EBA39A] text-[11px] font-bold text-[#9E473E]">
                尚未綁定通行碼
              </span>
            )}
          </div>
          <p className="leading-relaxed text-[#5C5044]">
            只要在「iPhone 主畫面 App」與「瀏覽器」輸入<strong>同一組通行碼</strong>（核對兩邊的<strong>雲端印記圖案與末 4 碼相同</strong>），雙邊所有單品、裁剪照片與實穿次數都會無損合併、永久同步！
          </p>
          <div className="text-[11px] font-semibold text-[#7D7063]">
            目前狀態：{lastSyncedText}
          </div>
          {hasUnsyncedChanges && (
            <div className="text-[11px] font-bold text-[#9A5B13]">
              🟠 本機尚有待推送至雲端的最新修改（已安全保存在本機保險箱，點下方即可立即推送！）
            </div>
          )}
        </div>

        {/* Passcode Binding Form */}
        <form onSubmit={handleConnect} className="space-y-2.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-[#5C5044]">
            <KeyRound className="w-3.5 h-3.5 text-[#C48E63]" />
            {hasPasscode
              ? '重新對齊通行碼（自動救援 iPhone 首字大小寫差異並合併雙邊資料）'
              : '設定或輸入你的專屬衣櫥同步通行碼'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showPasscode ? 'text' : 'password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                placeholder="輸入自訂通行碼（至少 4 碼）"
                className="w-full pl-3.5 pr-9 py-2 rounded-xl bg-[#FAF8F3] border border-[#DDD7C9] text-xs text-[#2D251E] focus:outline-none focus:border-[#C48E63]"
              />
              <button
                type="button"
                onClick={() => setShowPasscode((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A7E70] hover:text-[#2D251E]"
                title={showPasscode ? '隱藏通行碼' : '顯示通行碼（確認無大小寫誤差）'}
              >
                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={isBinding}
              className="bobo-btn px-4 py-2 rounded-xl bg-[#C48E63] text-[#FFFDF9] text-xs font-bold shrink-0"
            >
              {isBinding ? '合併對齊中...' : hasPasscode ? '重新對齊' : '啟用雲端同步'}
            </button>
          </div>
          {hasPasscode && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-[11px] font-bold text-[#3F6949]">
                ✅ 已啟用雙雲端保險箱（無損合併保護中）
              </span>
              <button
                type="button"
                onClick={onDisconnectPasscode}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9E473E] hover:underline"
              >
                <LogOut className="w-3 h-3" />
                在此裝置解除綁定
              </button>
            </div>
          )}
        </form>

        {/* Force Sync & Safe App Update Button for iOS Home Screen Standalone */}
        {hasPasscode && (
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {onForceSyncNow && (
                <button
                  type="button"
                  disabled={isSyncing}
                  onClick={() => void onForceSyncNow()}
                  className="bobo-btn-soft flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#F2CA62]/65 text-xs font-bold text-[#2D251E]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>立即強制推送＆拉取雲端</span>
                </button>
              )}
              <button
                type="button"
                disabled={isSyncing}
                onClick={() => void handleSyncAndReloadBundle()}
                className="bobo-btn-soft flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#EFECE4] text-xs font-bold text-[#2D251E]"
                title="適用於 iPhone 主畫面 App（無網址列重整鍵時，先安全同步資料再載入最新網頁程式版本）"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#C48E63]" />
                <span>同步並更新最新程式版</span>
              </button>
            </div>

            {pairUrl && (
              <div className="p-3 rounded-2xl bg-[#FFFDF9] border border-[#E7D6BE] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2D251E]">
                    <Smartphone className="w-3.5 h-3.5 text-[#C48E63]" />
                    免打字！一鍵複製「跨瀏覽器直接互通連結」
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPairLink}
                    className="bobo-btn px-2.5 py-1 rounded-full bg-[#C48E63] text-[#FFFDF9] text-[11px] font-bold shrink-0"
                  >
                    {copiedPair ? '✅ 已複製配對連結' : '📲 複製配對連結'}
                  </button>
                </div>
                <p className="text-[11px] text-[#7D7063] leading-relaxed">
                  在主畫面 App 複製此連結，直接貼到 Safari 或電腦瀏覽器打開，就會<strong>免輸入通行碼自動連上同一個雲端保險箱</strong>並同步全部衣服！
                </p>
              </div>
            )}
          </div>
        )}

        {/* Compact Share Link (< 120 chars) */}
        {shareUrl && (
          <div className="p-3.5 rounded-2xl bg-[#EFECE4]/60 border border-[#DDD7C9] space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#2D251E]">
                <Link2 className="w-3.5 h-3.5 text-[#C48E63]" />
                唯讀衣櫥展示短網址（可傳 LINE 或給朋友看）
              </span>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FAF8F3] border border-[#DDD7C9] text-[11px] font-bold text-[#2D251E]"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-3 h-3 text-[#3F6949]" /> 已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[#C48E63]" /> 複製短網址
                  </>
                )}
              </button>
            </div>
            <div className="text-[11px] text-[#7D7063] break-all bg-[#FAF8F3] px-2.5 py-1.5 rounded-xl border border-[#DDD7C9]">
              {shareUrl}
            </div>
          </div>
        )}

        {/* Local Rolling Snapshots Rescue */}
        {snapshots.length > 0 && onRestoreSnapshot && (
          <div className="pt-2 border-t border-[#DDD7C9] space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5C5044]">
              <History className="w-3.5 h-3.5 text-[#C48E63]" />
              <span>本機自動保護快照（點擊可無損合併救回）</span>
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {snapshots.slice(0, 3).map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-[#EFECE4]/60 border border-[#DDD7C9] text-[11px]"
                >
                  <span className="text-[#5C5044] truncate">
                    {new Date(snap.savedAt).toLocaleString('zh-TW', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    · {snap.itemCount} 件單品 / {snap.outfitCount} 套穿搭
                  </span>
                  <button
                    type="button"
                    onClick={() => onRestoreSnapshot(snap.vault)}
                    className="shrink-0 px-2.5 py-1 rounded-lg bg-[#FAF8F3] border border-[#DDD7C9] font-bold text-[#2D251E] hover:bg-[#F2CA62]/40"
                  >
                    無損救回
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Local JSON Backup Export / Import */}
        <div className="pt-2 border-t border-[#DDD7C9] space-y-2">
          <div className="text-xs font-bold text-[#5C5044]">
            💾 本機永久備份檔（含所有單品照片與 OOTD 紀錄，匯入採無損合併）
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExportJson}
              className="bobo-btn-soft flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#EFECE4]/70 text-xs font-bold text-[#2D251E]"
            >
              <Download className="w-3.5 h-3.5 text-[#C48E63]" />
              <span>下載 .json 備份</span>
            </button>

            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await onImportJsonFile(file);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              className="bobo-btn-soft flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#FAF8F3] text-xs font-bold text-[#2D251E]"
            >
              <Upload className="w-3.5 h-3.5 text-[#C48E63]" />
              <span>匯入 .json 合併</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
