import { HardDrive, FileText, Image as ImageIcon, Palette, Archive, Layers } from 'lucide-react';
import { StorageStats } from '../types.ts';
import { formatBytes } from '../lib/formatters.ts';

interface StorageStatsCardProps {
  stats: StorageStats | null;
}

export function StorageStatsCard({ stats }: StorageStatsCardProps) {
  if (!stats) return null;

  const used = stats.usedBytes || 0;
  const max = stats.maxBytes || 500 * 1024 * 1024;
  const percentage = Math.min(100, Math.round((used / max) * 100));

  return (
    <div id="storage-metrics-overview" className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <HardDrive className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Vault Capacity & Usage</h3>
            <p className="text-xs text-slate-500">
              {stats.totalFiles} {stats.totalFiles === 1 ? 'file' : 'files'} stored with row-level security
            </p>
          </div>
        </div>

        <div className="text-right sm:text-right flex items-baseline gap-1.5 sm:block">
          <span className="text-sm font-bold text-slate-900">{formatBytes(used)}</span>
          <span className="text-xs text-slate-500"> of {formatBytes(max)} ({percentage}%)</span>
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
