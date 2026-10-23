import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { siteApi, Site } from '../api/siteApi';
import { transactionApi, Transaction } from '../api/transactionApi';
import { reportApi } from '../api/reportApi';
import { useAuth } from '../context/AuthContext';
import { StatCard } from '../components/StatCard';
import { TransactionFormModal } from '../components/TransactionFormModal';
import { TransactionDetailModal } from '../components/TransactionDetailModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatINR, formatDate } from '../utils/formatters';
import {
  MapPin,
  ArrowLeft,
  Plus,
  Download,
  Search,
  Eye,
  Edit2,
  Trash2,
  TrendingUp,
  CreditCard,
  Receipt,
  AlertCircle,
  HardHat,
  Users,
} from 'lucide-react';

export const SiteDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('All');
  const [paymentStatus, setPaymentStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

  const { isContractor } = useAuth();
  const navigate = useNavigate();

  const loadSiteAndLedger = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [siteData, txData] = await Promise.all([
        siteApi.getSiteById(id),
        transactionApi.getTransactions({
          siteId: id,
          search,
          category,
          paymentStatus,
          startDate,
          endDate,
          sortBy,
          sortOrder,
        }),
      ]);

      setSite(siteData);
      setTransactions(txData.transactions);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Access denied or site not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSiteAndLedger();
  }, [id, search, category, paymentStatus, startDate, endDate, sortBy, sortOrder]);

  const handleExportCsv = async () => {
    if (!id) return;
    try {
      await reportApi.downloadTransactionsCsv({
        siteId: id,
        search,
        category,
        paymentStatus,
        startDate,
        endDate,
      });
    } catch (err) {
      console.error('Failed to export CSV', err);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!txToDelete) return;
    try {
      await transactionApi.deleteTransaction(txToDelete._id);
      setTxToDelete(null);
      loadSiteAndLedger();
    } catch (err) {
      console.error('Failed to delete transaction', err);
    }
  };

  const totalAmount = transactions.reduce((acc, t) => acc + (t.totalAmount || 0), 0);
  const totalPaid = transactions.reduce((acc, t) => acc + (t.amountPaid || 0), 0);
  const outstanding = Math.max(0, totalAmount - totalPaid);

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center max-w-md mx-auto mt-10">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3 shrink-0" />
        <h2 className="text-sm font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500 mt-1">{error}</p>
        <button
          onClick={() => navigate('/sites')}
          className="mt-4 px-4 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800"
        >
          Return to My Sites
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/sites')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-1.5 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Sites</span>
          </button>

          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight truncate">
              {site?.name || 'Site Details'}
            </h1>
            {site?.code && (
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 shrink-0">
                {site.code}
              </span>
            )}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize shrink-0 ${
                site?.status === 'active'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {site?.status || 'Active'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
            <span className="flex items-center gap-1 text-slate-500">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{site?.location}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Users className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {site?.assignedAgents && site.assignedAgents.length > 0
                  ? site.assignedAgents.map((a) => a.name).join(', ')
                  : 'No agents'}
              </span>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={() => {
              setTxToEdit(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Record Expense</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={transactions.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <StatCard
          title="Total Spent"
          value={loading ? '...' : formatINR(totalAmount)}
          subtitle="Matching entries"
          icon={TrendingUp}
        />

        <StatCard
          title="Total Paid"
          value={loading ? '...' : formatINR(totalPaid)}
          subtitle="Settled amounts"
          icon={CreditCard}
        />

        <StatCard
          title="Outstanding"
          value={loading ? '...' : formatINR(outstanding)}
          subtitle="Pending balances"
          icon={Receipt}
        />

        <StatCard
          title="Bills Count"
          value={loading ? '...' : transactions.length}
          subtitle="Verified bills"
          icon={HardHat}
        />
      </div>

      {/* Clean Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs space-y-2.5">
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 shrink-0" />
            <input
              type="text"
              placeholder="Search bills, items, suppliers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Categories</option>
              <option value="Materials">Materials</option>
              <option value="Labour">Labour</option>
              <option value="Transport">Transport</option>
              <option value="Equipment">Equipment</option>
              <option value="Miscellaneous">Misc</option>
            </select>

            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="All">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-2 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 shrink-0"
              title="Toggle sort order"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Date Row (Optional) */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          <span>Date:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-0.5 text-xs border border-slate-200 rounded"
          />
          <span>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-0.5 text-xs border border-slate-200 rounded"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
              }}
              className="text-amber-800 hover:text-amber-900 font-semibold ml-1 shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30 shrink-0" />
            <h3 className="text-xs font-bold text-slate-800">No Transactions Found</h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
              No bills match your current filters.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3.5">Date</th>
                    <th className="py-2.5 px-3.5">Description</th>
                    <th className="py-2.5 px-3.5">Category</th>
                    <th className="py-2.5 px-3.5">Rate & Qty</th>
                    <th className="py-2.5 px-3.5 text-right">Total</th>
                    <th className="py-2.5 px-3.5 text-right">Paid</th>
                    <th className="py-2.5 px-3.5 text-right">Due</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                    <th className="py-2.5 px-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => {
                    const due = Math.max(0, tx.totalAmount - tx.amountPaid);
                    return (
                      <tr key={tx._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap">
                          {formatDate(tx.date)}
                        </td>
                        <td className="py-2.5 px-3.5 max-w-[200px]">
                          <span className="font-semibold text-slate-900 block truncate">
                            {tx.title}
                          </span>
                          {tx.supplier && (
                            <span className="text-[10px] text-slate-400 block truncate">
                              {tx.supplier}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                            {tx.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600">
                          {tx.quantity ? (
                            <span>
                              {tx.quantity} {tx.unit || ''}{' '}
                              {tx.unitPrice ? `@ ${formatINR(tx.unitPrice)}` : ''}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap">
                          {formatINR(tx.totalAmount)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                          {formatINR(tx.amountPaid)}
                        </td>
                        <td className="py-2.5 px-3.5 text-right tabular-nums whitespace-nowrap">
                          <span className={due > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>
                            {formatINR(due)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
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
                        </td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedTx(tx);
                                setIsDetailOpen(true);
                              }}
                              title="View details & proof"
                              className="p-1 rounded text-slate-400 hover:text-amber-800 hover:bg-slate-100 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 shrink-0" />
                            </button>
                            <button
                              onClick={() => {
                                setTxToEdit(tx);
                                setIsFormOpen(true);
                              }}
                              title="Edit transaction"
                              className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0"
                            >
                              <Edit2 className="w-3.5 h-3.5 shrink-0" />
                            </button>
                            <button
                              onClick={() => setTxToDelete(tx)}
                              title="Delete transaction"
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {transactions.map((tx) => {
                const due = Math.max(0, tx.totalAmount - tx.amountPaid);
                return (
                  <div key={tx._id} className="p-3 space-y-1.5 hover:bg-slate-50/60 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 block truncate">
                          {formatDate(tx.date)} • {tx.category}
                        </span>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {tx.title}
                        </h4>
                        {tx.supplier && (
                          <span className="text-[11px] text-slate-400 block truncate">
                            {tx.supplier}
                          </span>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 block tabular-nums">
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

                    <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400">Paid: {formatINR(tx.amountPaid)}</span>
                        {due > 0 && (
                          <span className="text-rose-600 font-semibold ml-2">
                            Due: {formatINR(due)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setIsDetailOpen(true);
                          }}
                          className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 rounded"
                        >
                          Proof
                        </button>
                        <button
                          onClick={() => {
                            setTxToEdit(tx);
                            setIsFormOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700"
                        >
                          <Edit2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        <button
                          onClick={() => setTxToDelete(tx)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {site && (
        <TransactionFormModal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={loadSiteAndLedger}
          sites={[site]}
          initialSiteId={site._id}
          transactionToEdit={txToEdit}
        />
      )}

      <TransactionDetailModal
        transaction={selectedTx}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(tx) => {
          setTxToEdit(tx);
          setIsFormOpen(true);
        }}
      />

      <ConfirmDialog
        isOpen={!!txToDelete}
        title="Delete Transaction"
        message={`Delete "${txToDelete?.title}"? The associated proof photo will be permanently removed.`}
        confirmText="Delete"
        onConfirm={handleDeleteTransaction}
        onCancel={() => setTxToDelete(null)}
      />
    </div>
  );
};
