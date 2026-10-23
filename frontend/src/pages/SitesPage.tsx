import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { siteApi, Site } from '../api/siteApi';
import { useAuth } from '../context/AuthContext';
import { SiteModal } from '../components/SiteModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatINR } from '../utils/formatters';
import {
  Building2,
  Plus,
  Search,
  MapPin,
  ArrowRight,
  Edit2,
  Trash2,
  AlertCircle,
  Users,
} from 'lucide-react';

export const SitesPage: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Modal & Dialog state
  const [isSiteModalOpen, setIsSiteModalOpen] = useState<boolean>(false);
  const [siteToEdit, setSiteToEdit] = useState<Site | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { isContractor, isAgent } = useAuth();
  const navigate = useNavigate();

  const loadSites = async () => {
    try {
      setLoading(true);
      const data = await siteApi.getSites();
      setSites(data);
    } catch (err: any) {
      console.error('Failed to load sites', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSites();
  }, []);

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;
    try {
      setActionError(null);
      await siteApi.deleteSite(siteToDelete._id);
      setSiteToDelete(null);
      loadSites();
    } catch (err: any) {
      setActionError(
        err.response?.data?.message || 'Cannot delete site with recorded transactions.'
      );
    }
  };

  const filteredSites = sites.filter((site) => {
    const matchesSearch =
      site.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (site.code && site.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      site.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || site.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {isContractor ? 'Sites' : 'Assigned Site'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isContractor
              ? 'Manage construction job sites and agent allocations.'
              : 'Your assigned construction job site for bill recording and ledger review.'}
          </p>
        </div>

        {isContractor && (
          <button
            onClick={() => {
              setSiteToEdit(null);
              setIsSiteModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors self-start sm:self-auto shrink-0"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>New Site</span>
          </button>
        )}
      </div>

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-lg flex items-start gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search sites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg self-start sm:self-auto shrink-0">
          {(['all', 'active', 'completed'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-all ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Sites Grid */}
      {loading ? (
        <div className="py-12 flex justify-center text-slate-400">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200/80 p-8 text-center">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2 shrink-0" />
          <h3 className="text-xs font-bold text-slate-800">No Sites Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {isAgent
              ? 'No sites are currently assigned to you. Ask the contractor for access.'
              : 'Add a new construction site to start recording expenses.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredSites.map((site) => (
            <div
              key={site._id}
              className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {site.name}
                    </h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{site.location}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {site.code && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {site.code}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                        site.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {site.status}
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50/60 p-2.5 rounded-lg border border-slate-100 text-xs">
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Total Spent
                    </span>
                    <span className="font-bold text-slate-900 tabular-nums truncate block">
                      {formatINR(site.totalExpenses)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                      Outstanding
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

                {/* Assigned Agents */}
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                  <Users className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {site.assignedAgents && site.assignedAgents.length > 0
                      ? site.assignedAgents.map((a) => a.name).join(', ')
                      : 'No agents assigned'}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400">
                  {site.transactionCount} transactions
                </span>

                <div className="flex items-center gap-1">
                  {isContractor && (
                    <>
                      <button
                        onClick={() => {
                          setSiteToEdit(site);
                          setIsSiteModalOpen(true);
                        }}
                        title="Edit site"
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 shrink-0"
                      >
                        <Edit2 className="w-3.5 h-3.5 shrink-0" />
                      </button>
                      <button
                        onClick={() => {
                          setActionError(null);
                          setSiteToDelete(site);
                        }}
                        title="Delete site"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => navigate(`/sites/${site._id}`)}
                    className="ml-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/10 text-amber-900 border border-amber-500/20 hover:bg-amber-500/20 transition-colors shrink-0"
                  >
                    <span>Ledger</span>
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <SiteModal
        isOpen={isSiteModalOpen}
        onClose={() => setIsSiteModalOpen(false)}
        onSuccess={loadSites}
        siteToEdit={siteToEdit}
      />

      <ConfirmDialog
        isOpen={!!siteToDelete}
        title="Delete Construction Site"
        message={`Delete "${siteToDelete?.name}"? Sites with existing transactions cannot be deleted to preserve financial audit history.`}
        confirmText="Delete"
        onConfirm={handleDeleteSite}
        onCancel={() => setSiteToDelete(null)}
      />
    </div>
  );
};
