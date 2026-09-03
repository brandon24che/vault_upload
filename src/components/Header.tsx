import { Menu, Upload, LogOut, Shield, Sparkles } from 'lucide-react';
import { User } from '../types.ts';

interface HeaderProps {
  user: User;
  onOpenMobileMenu: () => void;
  onOpenUpload: () => void;
  onSignOut: () => void;
  categoryTitle: string;
  isLimitReached?: boolean;
  onOpenUpgrade?: () => void;
}

export function Header({
  user,
  onOpenMobileMenu,
  onOpenUpload,
  onSignOut,
  categoryTitle,
  isLimitReached = false,
  onOpenUpgrade,
}: HeaderProps) {
  return (
    <header
      id="dashboard-header"
      className="bg-white border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-8 py-3.5 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          id="mobile-menu-trigger"
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              {categoryTitle}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 text-sky-700 border border-sky-200/60">
              <Shield className="w-3 h-3 text-sky-600" />
              Isolated
            </span>
          </div>
          <p className="text-xs text-slate-500 hidden sm:block">
            Signed in as <span className="font-medium text-slate-700">{user.name}</span> ({user.email})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {isLimitReached ? (
          <>
            <button
              disabled
              id="header-upload-btn"
              title="You’ve reached the free plan limit."
              className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg bg-slate-100 text-slate-400 border border-slate-200 text-xs font-semibold cursor-not-allowed"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Add File</span>
            </button>
            {onOpenUpgrade && (
              <button
                type="button"
                onClick={onOpenUpgrade}
                id="header-upgrade-btn"
                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Upgrade (5/5)</span>
              </button>
            )}
          </>
        ) : (
          <button
            onClick={onOpenUpload}
            id="header-upload-btn"
            className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add File</span>
          </button>
        )}

        <button
          onClick={onSignOut}
          id="header-sign-out-btn"
          title="Sign Out"
          aria-label="Log out of account"
          className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 text-xs font-medium transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
