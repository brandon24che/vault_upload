import { useState, useEffect } from 'react';
import { X, Download, FileText, Calendar, HardDrive, Tag, ShieldCheck, ExternalLink } from 'lucide-react';
import { VaultFile } from '../types.ts';
import { formatBytes, formatDateTime } from '../lib/formatters.ts';
import { getStoredToken } from '../lib/api.ts';

interface FilePreviewModalProps {
  file: VaultFile | null;
  onClose: () => void;
  onDownload: (file: VaultFile) => void;
}

export function FilePreviewModal({ file, onClose, onDownload }: FilePreviewModalProps) {
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreviewBlobUrl(null);
      setTextContent(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(false);

    const token = getStoredToken();
    const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/files/${file.id}/preview`, { headers })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load preview');
        return res.blob();
      })
      .then(async (blob) => {
        if (!isMounted) return;

        if (file.category === 'image' || file.mimeType.startsWith('image/')) {
          const url = URL.createObjectURL(blob);
          setPreviewBlobUrl(url);
        } else if (
          file.mimeType.includes('text') ||
          file.mimeType.includes('json') ||
          file.originalName.endsWith('.txt') ||
          file.originalName.endsWith('.md')
        ) {
          const text = await blob.text();
          setTextContent(text.slice(0, 5000)); // up to 5000 chars preview
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Preview error:', err);
        if (isMounted) {
          setLoadError(true);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [file]);

  if (!file) return null;

  return (
    <div
      id="file-preview-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        id="file-preview-modal-content"
        className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="min-w-0 pr-4">
            <h3 className="font-semibold text-slate-900 text-base truncate" title={file.originalName}>
              {file.originalName}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="capitalize">{file.category}</span>
              <span>•</span>
              <span>{formatBytes(file.size)}</span>
              {file.clientTag && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <Tag className="w-3 h-3 text-slate-400" />
                    {file.clientTag}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onDownload(file)}
              id="preview-download-btn"
              className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={onClose}
              id="close-preview-btn"
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Preview Zone */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[300px] bg-slate-50/30">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="animate-spin w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full mb-3" />
              <span className="text-xs font-medium">Generating secure preview...</span>
            </div>
          ) : previewBlobUrl ? (
            <div className="max-w-full max-h-[500px] flex items-center justify-center p-2">
              <img
                src={previewBlobUrl}
                alt={file.originalName}
                className="max-h-[460px] max-w-full rounded-lg shadow-xs object-contain border border-slate-200"
              />
            </div>
          ) : textContent ? (
            <div className="w-full bg-slate-900 text-slate-100 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-[400px] leading-relaxed">
              <pre>{textContent}</pre>
            </div>
          ) : (
            <div className="text-center py-8 max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-3 border border-sky-100">
                <FileText className="w-8 h-8" />
              </div>
              <h4 className="font-semibold text-slate-900 text-sm mb-1">{file.originalName}</h4>
              <p className="text-xs text-slate-500 mb-5">
                {loadError
                  ? 'Inline preview unavailable for this file format.'
                  : 'Direct preview is formatted for download and local viewer application.'}
              </p>
              <button
                onClick={() => onDownload(file)}
                className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download {formatBytes(file.size)}</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer: Detailed Security & Metadata */}
        <div className="p-4 bg-white border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Uploaded {formatDateTime(file.uploadDate)}
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              {file.mimeType}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Encrypted at Rest</span>
          </div>
        </div>
      </div>
    </div>
  );
}
