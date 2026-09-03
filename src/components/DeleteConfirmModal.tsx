import { AlertTriangle, Trash2, X } from 'lucide-react';
import { VaultFile } from '../types.ts';
import { formatBytes } from '../lib/formatters.ts';

interface DeleteConfirmModalProps {
  file: VaultFile | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({
  file,
  isOpen,
  isDeleting,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  if (!isOpen || !file) return null;

  return (
    <div
      id="delete-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="delete-modal-box"
        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              Delete File?
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-3">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-700 font-semibold truncate block max-w-xs">{file.originalName}</strong>{' '}
              ({formatBytes(file.size)})? This will remove the file from your vault and revoke client access.
            </p>
            <p className="text-[11px] text-rose-600 font-medium">
              This action cannot be undone.
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 -mr-1 -mt-1 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            id="cancel-delete-btn"
            className="py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            id="confirm-delete-btn"
            className="inline-flex items-center gap-1.5 py-2 px-4 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <span>Deleting...</span>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete File</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
