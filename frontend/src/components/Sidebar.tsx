import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Building2, Users, Receipt } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isContractor } = useAuth();

  const navItems = [
    ...(isContractor
      ? [
          {
            name: 'Overview',
            path: '/dashboard',
            icon: LayoutDashboard,
          },
        ]
      : []),
    {
      name: isContractor ? 'Sites' : 'Assigned Sites',
      path: '/sites',
      icon: Building2,
    },
    ...(isContractor
      ? [
          {
            name: 'Agents',
            path: '/agents',
            icon: Users,
          },
        ]
      : []),
    {
      name: isContractor ? 'All Transactions' : 'Site Ledger',
      path: '/transactions',
      icon: Receipt,
    },
  ];

  return (
    <aside className="w-56 bg-white border-r border-slate-200/80 hidden md:flex flex-col shrink-0">
      <div className="p-3 flex-1 flex flex-col gap-1">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-amber-500/10 text-amber-900 border border-amber-500/20 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`
            }
          >
            <item.icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </div>

      <div className="p-3.5 border-t border-slate-100 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-600">BuildLedger</p>
        <p className="mt-0.5 text-[10px] text-slate-400">Site Ledger MVP</p>
      </div>
    </aside>
  );
};
