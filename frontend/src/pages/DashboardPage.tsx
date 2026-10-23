import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, DashboardStats } from '../api/dashboardApi';
import { Transaction } from '../api/transactionApi';
import { siteApi, Site } from '../api/siteApi';
import { StatCard } from '../components/StatCard';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { TransactionFormModal } from '../components/TransactionFormModal';
import { SiteModal } from '../components/SiteModal';
import { AgentModal } from '../components/AgentModal';
import { formatINR, formatDate } from '../utils/formatters';
import {
  Building2,
  Receipt,
  Plus,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Search,
  UserPlus,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [period, setPeriod] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchSite, setSearchSite] = useState<string>('');

  // Modals state
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isTxDetailOpen, setIsTxDetailOpen] = useState<boolean>(false);
  const [isAddTxOpen, setIsAddTxOpen] = useState<boolean>(false);
  const [isAddSiteOpen, setIsAddSiteOpen] = useState<boolean>(false);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState<boolean>(false);

  const navigate = useNavigate();

  const loadData = async (selectedPeriod: string) => {
    try {
      setLoading(true);
      const [statsData, sitesData] = await Promise.all([
        dashboardApi.getStats(selectedPeriod),
        siteApi.getSites(),
      ]);
      setStats(statsData);
      setSites(sitesData);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(period);
  }, [period]);

  const filteredSiteSummaries = (stats?.siteSummaries || []).filter(
    (s) =>
      s.name.toLowerCase().includes(searchSite.toLowerCase()) ||
      (s.code && s.code.toLowerCase().includes(searchSite.toLowerCase())) ||
      s.location.toLowerCase().includes(searchSite.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time financial overview across all active construction sites.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start sm:self-auto shrink-0">
          {[
            { id: 'all', label: 'All Time' },
            { id: 'this_month', label: 'This Month' },
            { id: 'last_30_days', label: '30 Days' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                period === p.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setIsAddTxOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Record Expense</span>
        </button>

        <button
          onClick={() => setIsAddSiteOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>New Site</span>
        </button>

        <button
          onClick={() => setIsAddAgentOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>New Agent</span>
        </button>

        <button
          onClick={() => navigate('/transactions')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 ml-auto shrink-0"
        >
          <span>View All Transactions</span>
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <StatCard
          title="Active Sites"
          value={loading ? '...' : `${stats?.activeSitesCount || 0} / ${stats?.totalSitesCount || 0}`}
          subtitle="Sites under construction"
          icon={Building2}
        />

        <StatCard
          title="Total Expenses"
          value={loading ? '...' : formatINR(stats?.totalExpenses)}
          subtitle="Recorded in period"
          icon={TrendingUp}
        />

        <StatCard
          title="Amount Paid"
          value={loading ? '...' : formatINR(stats?.totalPaid)}
          subtitle="Cleared payments"
          icon={CreditCard}
        />

        <StatCard
          title="Outstanding"
          value={loading ? '...' : formatINR(stats?.totalOutstanding)}
          subtitle={`${stats?.transactionCount || 0} bills total`}
          icon={Receipt}
        />
      </div>

      {/* Construction Sites Overview */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Construction Sites
            </h2>
            <p className="text-xs text-slate-400">
              Expenses and pending balances by job site.
            </p>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search site..."
              value={searchSite}
              onChange={(e) => setSearchSite(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex justify-center text-slate-400">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
          </div>
        ) : filteredSiteSummaries.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">
            No construction sites matched your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSiteSummaries.map((site) => (
              <div
                key={site._id}
                className="p-3.5 rounded-lg border border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                        {site.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">
                        {site.location}
                      </p>
                    </div>
                    {site.code && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                        {site.code}
                      </span>
                    )}
                  </div>

                  {/* Clean financial 2-column metrics */}
                  <div className="mt-3 grid grid-cols-2 gap-2 bg-white p-2 rounded-md border border-slate-100 text-xs">
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Spent
                      </span>
                      <span className="font-bold text-slate-900 tabular-nums truncate block">
                        {formatINR(site.totalExpenses)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                        Due
                      </span>
                      <span
                        className={`font-semibold tabular-nums truncate block ${
                          site.outstandingAmount > 0 ? 'text-rose-600' : 'text-slate-600'
                        }`}
                      >
                        {formatINR(site.outstandingAmount)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {site.transactionCount} transactions
                  </span>
                  <button
                    onClick={() => navigate(`/sites/${site._id}`)}
                    className="font-semibold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Ledger</span>
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Transactions Feed */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Recent Transactions
            </h2>
            <p className="text-xs text-slate-400">
              Latest expenses entered by site agents.
            </p>
          </div>
          <button
            onClick={() => navigate('/transactions')}
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1 shrink-0"
          >
            <span>All</span>
            <ArrowRight className="w-3 h-3 shrink-0" />
          </button>
        </div>

        {loading ? (
          <div className="py-6 flex justify-center text-slate-400">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
          </div>
        ) : !stats?.recentTransactions || stats.recentTransactions.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            No transactions recorded yet in this period.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.recentTransactions.map((tx) => (
              <div
                key={tx._id}
                onClick={() => {
                  setSelectedTx(tx);
                  setIsTxDetailOpen(true);
                }}
                className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50/80 rounded-lg cursor-pointer transition-colors min-w-0"
              >
                <div className="min-w-0 pr-3">
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 block truncate">
                    {tx.title}
                  </span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 truncate">
                    <span className="font-medium text-slate-600 truncate">{tx.site?.name}</span>
                    <span>•</span>
                    <span className="shrink-0">{formatDate(tx.date)}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 block tabular-nums">
                    {formatINR(tx.totalAmount)}
                  </span>
                  <span
                    className={`inline-block text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                      tx.paymentStatus === 'Paid'
                        ? 'bg-emerald-50 text-emerald-800'
                        : tx.paymentStatus === 'Partially Paid'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-rose-50 text-rose-800'
                    }`}
                  >
                    {tx.paymentStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionDetailModal
        transaction={selectedTx}
        isOpen={isTxDetailOpen}
        onClose={() => setIsTxDetailOpen(false)}
      />

      <TransactionFormModal
        isOpen={isAddTxOpen}
        onClose={() => setIsAddTxOpen(false)}
        onSuccess={() => loadData(period)}
        sites={sites}
      />

      <SiteModal
        isOpen={isAddSiteOpen}
        onClose={() => setIsAddSiteOpen(false)}
        onSuccess={() => loadData(period)}
      />

      <AgentModal
        isOpen={isAddAgentOpen}
        onClose={() => setIsAddAgentOpen(false)}
        onSuccess={() => loadData(period)}
      />
    </div>
  );
};
