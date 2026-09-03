import { HardDrive, Sparkles, AlertTriangle } from 'lucide-react';
import { StorageStats } from '../types.ts';
import { formatBytes } from '../lib/formatters.ts';

interface StorageStatsCardProps {
  stats: StorageStats | null;
  fileCount?: number;
  maxFiles?: number;
  isLimitReached?: boolean;
  onOpenUpgrade?: () => void;
}

export function StorageStatsCard({
  stats,
  fileCount,
  maxFiles = 5,
  isLimitReached = false,
  onOpenUpgrade,
}: StorageStatsCardProps) {
  if (!stats) return null;

  const used = stats.usedBytes || 0;
  const max = stats.maxBytes || 500 * 1024 * 1024;
  const percentage = Math.min(100, Math.round((used / max) * 100));
  const currentFileCount = fileCount ?? stats.totalFiles;

  return (
    <div id="storage-metrics-overview" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Vault Capacity & Usage</h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Free Plan: {currentFileCount}/{maxFiles} files
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.totalFiles} {stats.totalFiles === 1 ? 'file' : 'files'} stored with row-level security
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-1">
          <div className="text-right sm:text-right flex items-baseline gap-1.5 sm:block">
            <span className="text-sm font-bold text-slate-900">{formatBytes(used)}</span>
            <span className="text-xs text-slate-500"> of {formatBytes(max)} ({percentage}%)</span>
          </div>
          {isLimitReached && onOpenUpgrade && (
            <button
              id="stats-upgrade-btn"
              type="button"
              onClick={onOpenUpgrade}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Limit Reached • Upgrade Plan</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            percentage > 85 ? 'bg-amber-500' : 'bg-sky-500'
          }`}
          style={{ width: `${Math.max(percentage, 2)}%` }}
        />
      </div>

      {/* Breakdown chips */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-500" />
          <span>Documents: {formatBytes(stats.categoryBreakdown?.document || 0)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Images: {formatBytes(stats.categoryBreakdown?.image || 0)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-500" />
          <span>Design Assets: {formatBytes(stats.categoryBreakdown?.design || 0)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Archives: {formatBytes(stats.categoryBreakdown?.archive || 0)}</span>
        </div>
      </div>
    </div>
  );
}
