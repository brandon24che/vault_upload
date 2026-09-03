import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileUp, CheckCircle, Tag, AlertCircle, AlertTriangle, Sparkles, Plus } from 'lucide-react';
import { uploadFile } from '../lib/api.ts';
import { VaultFile } from '../types.ts';
import { formatBytes } from '../lib/formatters.ts';

interface UploadAreaProps {
  onFileUploaded: (file: VaultFile) => void;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
  isLimitReached?: boolean;
  fileCount?: number;
  maxFiles?: number;
  onOpenUpgrade?: () => void;
}

export function UploadArea({
  onFileUploaded,
  onToast,
  isLimitReached = false,
  fileCount = 0,
  maxFiles = 5,
  onOpenUpgrade,
}: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [clientTag, setClientTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLimitReached) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isLimitReached) {
      onToast('error', "You’ve reached the free plan limit.");
      if (onOpenUpgrade) onOpenUpgrade();
      return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFileUpload(files[0]);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (isLimitReached) {
      onToast('error', "You’ve reached the free plan limit.");
      if (onOpenUpgrade) onOpenUpgrade();
      return;
    }

    const files = e.target.files;
    if (files && files.length > 0) {
      await processFileUpload(files[0]);
    }
    // reset input so same file can be uploaded again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const processFileUpload = async (file: File) => {
    if (isLimitReached) {
      onToast('error', "You’ve reached the free plan limit.");
      if (onOpenUpgrade) onOpenUpgrade();
      return;
    }

    // 100 MB client-side limit check
    if (file.size > 100 * 1024 * 1024) {
      onToast('error', 'File size exceeds the 100 MB limit.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentFileName(file.name);

    try {
      const uploadedFile = await uploadFile(file, clientTag.trim() || undefined, (percent) => {
        setUploadProgress(percent);
      });

      onToast('success', `"${file.name}" uploaded successfully!`);
      onFileUploaded(uploadedFile);
      setClientTag('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      onToast('error', msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setCurrentFileName('');
    }
  };

  return (
    <div id="file-upload-section" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 sm:p-6 mb-8">
      {/* Free Plan Limit Notice Banner */}
      {isLimitReached && (
        <div
          id="free-plan-limit-alert"
          className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950">
                You’ve reached the free plan limit.
              </div>
              <p className="text-[11px] text-amber-800 mt-0.5">
                The Free Plan includes up to {maxFiles} files ({fileCount} of {maxFiles} used). Upgrade your plan to upload unlimited files.
              </p>
            </div>
          </div>
          {onOpenUpgrade && (
            <button
              id="upgrade-plan-btn"
              type="button"
              onClick={onOpenUpgrade}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upgrade</span>
            </button>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-sky-600" />
            Upload to Vault
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Deliver documents, prototypes, brand assets, and archives safely.
          </p>
        </div>

        {/* Action button and Optional Project / Client Tag Input */}
        <div className="flex items-center gap-2.5 max-w-md w-full sm:w-auto">
          {/* Add File Button */}
          <button
            id="add-file-btn"
            type="button"
            disabled={isLimitReached || isUploading}
            onClick={() => {
              if (isLimitReached) {
                if (onOpenUpgrade) onOpenUpgrade();
              } else if (!isUploading) {
                fileInputRef.current?.click();
              }
            }}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              isLimitReached
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-xs'
            }`}
            title={isLimitReached ? "You’ve reached the free plan limit." : "Add File"}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add File</span>
          </button>

          <div className="relative w-full sm:w-56">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              id="upload-client-tag-input"
              value={clientTag}
              disabled={isLimitReached || isUploading}
              onChange={(e) => setClientTag(e.target.value)}
              placeholder="Tag (e.g. Acme Deliverables)"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Drag and drop interactive area */}
      <div
        id="drop-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (isLimitReached) {
            if (onOpenUpgrade) onOpenUpgrade();
          } else if (!isUploading) {
            fileInputRef.current?.click();
          }
        }}
        className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
          isLimitReached
            ? 'border-amber-300 bg-amber-50/30 cursor-not-allowed'
            : isDragging
            ? 'border-sky-500 bg-sky-50/60 scale-[1.005] cursor-pointer'
            : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/70 bg-slate-50/30 cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading || isLimitReached}
        />

        {isUploading ? (
          <div className="max-w-md mx-auto py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
              <span className="truncate max-w-xs">{currentFileName}</span>
              <span className="text-sky-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-sky-500 h-full transition-all duration-150 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 animate-pulse">
              Encrypting and saving file to your secure vault...
            </p>
          </div>
        ) : isLimitReached ? (
          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-11 h-11 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-2.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-sm font-semibold text-slate-900 mb-1">
              You’ve reached the free plan limit.
            </div>
            <p className="text-xs text-slate-500 max-w-sm mb-3">
              Free plan is capped at {maxFiles} files ({fileCount} stored). Delete existing files or upgrade to ClientVault Pro to add more files.
            </p>
            {onOpenUpgrade && (
              <button
                id="upgrade-plan-dropzone-btn"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenUpgrade();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade Plan</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
              <FileUp className="w-6 h-6" />
            </div>
            <div className="text-sm font-semibold text-slate-900 mb-1">
              Drag and drop your files here, or <span className="text-sky-600 underline">browse</span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm mb-3">
              Supports design files, PDFs, high-res images, spreadsheets, code, and zip archives (up to 100 MB).
            </p>
            <div className="flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">.pdf</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">.png / .jpg</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">.fig / .psd</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">.zip</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">.docx</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

