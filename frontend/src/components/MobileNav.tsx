import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Building2, Users, Receipt } from 'lucide-react';

export const MobileNav: React.FC = () => {
  const { isContractor } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-30 px-3 h-14 flex items-center justify-around">
      {isContractor && (
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-amber-800' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4 mb-0.5 shrink-0" />
          <span>Overview</span>
        </NavLink>
      )}

      <NavLink
        to="/sites"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center py-1 px-2.5 text-[10px] font-semibold transition-colors ${
            isActive ? 'text-amber-800' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        <Building2 className="w-4 h-4 mb-0.5 shrink-0" />
        <span>Sites</span>
      </NavLink>

      {isContractor && (
        <NavLink
          to="/agents"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-amber-800' : 'text-slate-400 hover:text-slate-600'
            }`
          }
        >
          <Users className="w-4 h-4 mb-0.5 shrink-0" />
          <span>Agents</span>
        </NavLink>
      )}

      <NavLink
        to="/transactions"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center py-1 px-2.5 text-[10px] font-semibold transition-colors ${
            isActive ? 'text-amber-800' : 'text-slate-400 hover:text-slate-600'
          }`
        }
      >
        <Receipt className="w-4 h-4 mb-0.5 shrink-0" />
        <span>Ledger</span>
      </NavLink>
    </nav>
  );
};
