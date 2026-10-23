import React from 'react';
import { useAuth } from '../context/AuthContext';
import { HardHat, LogOut, ShieldCheck, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isContractor } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shadow-xs shrink-0">
              <HardHat className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2] shrink-0" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base sm:text-lg tracking-tight text-slate-900 truncate">
                  BuildLedger
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 hidden sm:inline-block">
                  MVP
                </span>
              </div>
            </div>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* User Name on Desktop */}
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs sm:text-sm font-semibold text-slate-800 truncate max-w-[140px]">
                {user?.name}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[140px]">
                {user?.email}
              </span>
            </div>

            {/* Role Badge */}
            <div
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] sm:text-xs font-medium ${
                isContractor
                  ? 'bg-amber-50 text-amber-900 border border-amber-200/70'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200/70'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isContractor ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              <span className="font-semibold">
                {isContractor ? 'Contractor' : 'Site Agent'}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={() => logout()}
              title="Sign out"
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4 shrink-0" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
