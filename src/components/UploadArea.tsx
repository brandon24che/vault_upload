import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { UploadCloud, FileUp, CheckCircle, Tag, AlertCircle } from 'lucide-react';
import { uploadFile } from '../lib/api.ts';
import { VaultFile } from '../types.ts';
import { formatBytes } from '../lib/formatters.ts';

interface UploadAreaProps {
  onFileUploaded: (file: VaultFile) => void;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function UploadArea({ onFileUploaded, onToast }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [clientTag, setClientTag] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
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

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFileUpload(files[0]);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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

        {/* Optional Project / Client Tag Input */}
        <div className="flex items-center gap-2 max-w-xs w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <input
              type="text"
              id="upload-client-tag-input"
              value={clientTag}
              onChange={(e) => setClientTag(e.target.value)}
              placeholder="Tag (e.g. Acme Q3 Deliverables)"
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-slate-800 placeholder:text-slate-400"
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
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-sky-500 bg-sky-50/60 scale-[1.005]'
            : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/70 bg-slate-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          id="file-input"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
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
