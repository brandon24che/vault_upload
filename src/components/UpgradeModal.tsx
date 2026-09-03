import { Sparkles, Check, X } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileCount?: number;
  maxFiles?: number;
}

export function UpgradeModal({
  isOpen,
  onClose,
  fileCount = 5,
  maxFiles = 5,
}: UpgradeModalProps) {
  if (!isOpen) return null;

  return (
    <div
      id="upgrade-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="upgrade-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Header Accent */}
        <div className="bg-gradient-to-r from-sky-500 via-sky-600 to-indigo-600 p-6 text-white relative">
          <button
            id="upgrade-modal-x-btn"
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-3">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h2 id="upgrade-modal-title" className="text-xl font-bold tracking-tight text-white">
            Upgrade your plan
          </h2>
          <p className="text-sky-100 text-xs mt-1">
            Unlock unlimited vault storage and client sharing capabilities.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6">
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-950 text-xs">
            <div className="font-semibold text-amber-900">Current Plan: Free Plan (Limit Reached)</div>
            <p className="mt-0.5 text-amber-800">
              You are currently using <strong className="text-amber-950">{fileCount}</strong> of{' '}
              <strong className="text-amber-950">{maxFiles}</strong> files allowed on the Free Plan.
            </p>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            Upgrade to <strong className="text-slate-900 font-semibold">ClientVault Pro</strong> to remove the 5-file limit, deliver assets with high-speed download links, and manage unlimited client files securely.
          </p>

          {/* Feature List */}
          <div className="space-y-2.5 mb-5 text-xs text-slate-700">
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span className="font-medium text-slate-900">Unlimited file uploads (no 5-file cap)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Expanded 100 MB per-file upload size</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>Custom client tags & deliverable organizing</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </div>
              <span>End-to-end cloud isolation & encrypted storage</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-5 text-center">
            UI Preview Mode • No real payments required
          </div>

          {/* Close Button */}
          <div className="pt-2 border-t border-slate-100">
            <button
              id="upgrade-modal-close-btn"
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
