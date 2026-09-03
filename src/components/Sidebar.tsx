import { 
  ShieldCheck, 
  Files, 
  Image as ImageIcon, 
  FileText, 
  Palette, 
  Archive, 
  LogOut, 
  HardDrive, 
  User as UserIcon,
  Upload,
  Layers
} from 'lucide-react';
import { User, StorageStats } from '../types.ts';
import { formatBytes } from '../lib/formatters.ts';

interface SidebarProps {
  user: User;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  onOpenUpload: () => void;
  onSignOut: () => void;
  stats: StorageStats | null;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  user,
  activeCategory,
  onSelectCategory,
  onOpenUpload,
  onSignOut,
  stats,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems = [
    { id: 'all', label: 'All Files', icon: Files },
    { id: 'document', label: 'Documents', icon: FileText },
    { id: 'image', label: 'Images', icon: ImageIcon },
    { id: 'design', label: 'Design Assets', icon: Palette },
    { id: 'archive', label: 'Archives', icon: Archive },
  ];

  const usedBytes = stats?.usedBytes ?? 0;
  const maxBytes = stats?.maxBytes ?? 500 * 1024 * 1024;
  const percentUsed = Math.min(100, Math.round((usedBytes / maxBytes) * 100));

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-30 lg:hidden backdrop-blur-xs"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-[#0B1221] text-slate-100 flex flex-col justify-between transition-transform duration-200 ease-in-out border-r border-slate-800/80 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Header & Brand */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-950/50">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                ClientVault
              </h1>
              <span className="text-[11px] font-medium tracking-wide uppercase text-slate-400">
                Secure File Portal
              </span>
            </div>
          </div>

          {/* Quick Action: Upload */}
          <button
            id="sidebar-upload-btn"
            onClick={() => {
              onOpenUpload();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium text-sm transition-colors shadow-sm cursor-pointer mb-6"
          >
            <Upload className="w-4 h-4" />
            <span>Upload New File</span>
          </button>

          {/* Navigation Section */}
          <div className="space-y-1">
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Vault Folders
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.id;
              const count =
                item.id === 'all'
                  ? stats?.totalFiles
                  : stats?.categoryBreakdown?.[item.id] !== undefined
                  ? Object.keys(stats?.categoryBreakdown || {}).length > 0
                    ? undefined
                    : undefined
                  : undefined;

              return (
                <button
                  key={item.id}
                  id={`nav-category-${item.id}`}
                  onClick={() => {
                    onSelectCategory(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800/90 text-sky-400 font-semibold shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-850/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'all' && stats && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                      {stats.totalFiles}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Security & Access Banner */}
          <div className="mt-8 p-3 rounded-lg bg-slate-900/80 border border-slate-800/90 text-xs">
            <div className="flex items-center gap-2 text-slate-300 font-medium mb-1">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Isolated Client Vault</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Row-level security active. Only your authorized account can view and manage these files.
            </p>
          </div>
        </div>

        {/* Bottom Section: Storage Meter & User Profile */}
        <div className="p-4 border-t border-slate-800/80 bg-[#080d19]">
          {/* Storage Meter */}
          <div className="mb-4 px-2">
            <div className="flex items-center justify-between text-xs mb-1.5 text-slate-300">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                Vault Storage
              </span>
              <span className="text-[11px] text-slate-400">{percentUsed}% used</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  percentUsed > 85 ? 'bg-amber-500' : 'bg-sky-500'
                }`}
                style={{ width: `${Math.max(percentUsed, 3)}%` }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-slate-400">
              <span>{formatBytes(usedBytes)}</span>
              <span>{formatBytes(maxBytes)}</span>
            </div>
          </div>

          {/* User Profile Card & Sign Out */}
          <div className="p-2.5 rounded-lg bg-slate-850/70 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 text-xs font-bold uppercase shrink-0">
                {user.name ? user.name.charAt(0) : <UserIcon className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{user.name}</div>
                <div className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                  <span className="capitalize">{user.role}</span>
                </div>
              </div>
            </div>

            <button
              id="sidebar-sign-out-btn"
              onClick={onSignOut}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
