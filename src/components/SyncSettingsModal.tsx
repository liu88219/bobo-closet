import React, { useRef, useState } from 'react';
import {
  Check,
  Cloud,
  Copy,
  Download,
  KeyRound,
  Link2,
  LogOut,
  Upload,
  X,
} from 'lucide-react';

interface SyncSettingsModalProps {
  hasPasscode: boolean;
  shareUrl: string | null;
  lastSyncedText: string;
  onClose: () => void;
  onBindPasscode: (passcode: string) => Promise<void>;
  onDisconnectPasscode: () => void;
  onExportJson: () => void;
  onImportJsonFile: (file: File) => Promise<void>;
}

export const SyncSettingsModal: React.FC<SyncSettingsModalProps> = ({
  hasPasscode,
  shareUrl,
  lastSyncedText,
  onClose,
  onBindPasscode,
  onDisconnectPasscode,
  onExportJson,
  onImportJsonFile,
}) => {
  const [passInput, setPassInput] = useState('');
  const [isBinding, setIsBinding] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const importRef = useRef<HTMLInputElement | null>(null);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#422B1D]/35 backdrop-blur-[2px] p-0 sm:p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#FFFDF9] border-t-2 sm:border-2 border-[#E7D6BE] rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-[#BA7E4D]" />
            <h2 className="text-base sm:text-lg font-bold text-[#422B1D]">
              跨裝置永久雲端同步 ＆ 備份
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[#FAF5EC] text-[#73533E]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#FAF5EC] border border-[#E7D6BE] space-y-2 text-xs text-[#583D2B]">
          <p className="font-bold text-[#422B1D]">
            📱 iPhone「加入主畫面」↔ Safari ↔ 電腦自動互通說明：
          </p>
          <p className="leading-relaxed text-[#73533E]">
            iOS 的桌面主畫面 App 與 Safari 預設沙盒隔離。只要在兩邊輸入
            <strong>同一組自訂通行碼</strong>，系統會以 SHA-256 衍生專屬雲端保險箱金鑰，連衣服照片都會永久同步不遺失！
          </p>
          <div className="text-[11px] font-semibold text-[#8E6D56]">
            目前狀態：{lastSyncedText}
          </div>
        </div>

        {/* Passcode Binding Form */}
        <form onSubmit={handleConnect} className="space-y-2.5">
          <label className="flex items-center gap-1.5 text-xs font-bold text-[#583D2B]">
            <KeyRound className="w-3.5 h-3.5 text-[#BA7E4D]" />
            {hasPasscode ? '更換或重新綁定衣櫥同步通行碼' : '設定你的專屬衣櫥同步通行碼'}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={passInput}
              onChange={(e) => setPassInput(e.target.value)}
              placeholder="輸入自訂通行碼（至少 4 碼）"
              className="flex-1 px-3.5 py-2 rounded-xl bg-[#FAF5EC] border border-[#E7D6BE] text-xs text-[#422B1D] focus:outline-none focus:border-[#BA7E4D]"
            />
            <button
              type="submit"
              disabled={isBinding}
              className="bobo-btn px-4 py-2 rounded-xl bg-[#BA7E4D] text-[#FFFDF9] text-xs font-bold shrink-0"
            >
              {isBinding ? '同步對齊中...' : hasPasscode ? '重新對齊' : '啟用雲端同步'}
            </button>
          </div>
          {hasPasscode && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-bold text-[#6C8A66]">
                ✅ 已啟用跨瀏覽器永久雲端保險箱
              </span>
              <button
                type="button"
                onClick={onDisconnectPasscode}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#9E473E] hover:underline"
              >
                <LogOut className="w-3 h-3" />
                在此裝置登出通行碼
              </button>
            </div>
          )}
        </form>

        {/* Compact Share Link (< 120 chars) */}
        {shareUrl && (
          <div className="p-3.5 rounded-2xl bg-[#FAF5EC] border border-[#E7D6BE] space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#422B1D]">
                <Link2 className="w-3.5 h-3.5 text-[#BA7E4D]" />
                唯讀衣櫥展示短網址（可傳 LINE 或給朋友看）
              </span>
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFFDF9] border border-[#E7D6BE] text-[11px] font-bold text-[#583D2B]"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-3 h-3 text-[#6C8A66]" /> 已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-[#BA7E4D]" /> 複製短網址
                  </>
                )}
              </button>
            </div>
            <div className="text-[11px] text-[#8E6D56] break-all bg-[#FFFDF9] px-2.5 py-1.5 rounded-xl border border-[#EFE3D0]">
              {shareUrl}
            </div>
          </div>
        )}

        {/* Local JSON Backup Export / Import */}
        <div className="pt-2 border-t border-[#F3E9D8] space-y-2">
          <div className="text-xs font-bold text-[#583D2B]">
            💾 本機永久備份檔（含所有單品照片與 OOTD 紀錄）
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onExportJson}
              className="bobo-btn-soft flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#FAF5EC] text-xs font-bold text-[#422B1D]"
            >
              <Download className="w-3.5 h-3.5 text-[#BA7E4D]" />
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
              className="bobo-btn-soft flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-[#FFFDF9] text-xs font-bold text-[#422B1D]"
            >
              <Upload className="w-3.5 h-3.5 text-[#BA7E4D]" />
              <span>匯入 .json 備份</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
