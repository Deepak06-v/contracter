import React, { useState, useEffect } from 'react';
import { AgentUser, agentApi } from '../api/agentApi';
import { Site, siteApi } from '../api/siteApi';
import { X, AlertCircle } from 'lucide-react';

interface AgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agentToEdit?: AgentUser | null;
}

export const AgentModal: React.FC<AgentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  agentToEdit,
}) => {
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([]);
  const [availableSites, setAvailableSites] = useState<Site[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      siteApi
        .getSites()
        .then((sites) => setAvailableSites(sites))
        .catch((err) => console.error('Failed to load sites', err));

      if (agentToEdit) {
        setName(agentToEdit.name);
        setEmail(agentToEdit.email);
        setPassword('');
        setIsActive(agentToEdit.isActive);
        setSelectedSiteIds(agentToEdit.assignedSites.map((s) => s._id));
      } else {
        setName('');
        setEmail('');
        setPassword('');
        setIsActive(true);
        setSelectedSiteIds([]);
      }
      setErrorMessage(null);
    }
  }, [isOpen, agentToEdit]);

  const handleToggleSite = (siteId: string) => {
    setSelectedSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !email.trim()) {
      setErrorMessage('Name and email are required.');
      return;
    }

    if (!agentToEdit && (!password || password.length < 6)) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);
      if (agentToEdit) {
        await agentApi.updateAgent(agentToEdit._id, {
          name: name.trim(),
          email: email.trim(),
          isActive,
          assignedSiteIds: selectedSiteIds,
        });
      } else {
        await agentApi.createAgent({
          name: name.trim(),
          email: email.trim(),
          password,
          assignedSiteIds: selectedSiteIds,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to save agent.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm sm:text-base font-bold text-slate-900">
            {agentToEdit ? 'Edit Site Agent' : 'New Site Agent'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0"
          >
            <X className="w-4 h-4 shrink-0" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-2.5 bg-rose-50 border border-rose-200/80 rounded-lg flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Kumar"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              placeholder="agent@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {!agentToEdit && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Initial Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                placeholder="Min 6 characters"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}

          {agentToEdit && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="agentActiveStatus"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
              />
              <label htmlFor="agentActiveStatus" className="text-xs font-semibold text-slate-700 cursor-pointer">
                Account Active
              </label>
            </div>
          )}

          {/* Assigned Sites */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Assigned Sites
            </label>
            <p className="text-[10px] text-slate-400 mb-1.5">
              Only checked sites will be visible to this agent.
            </p>
            {availableSites.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No construction sites available.</p>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                {availableSites.map((s) => (
                  <label
                    key={s._id}
                    className="flex items-center gap-2 p-1 rounded hover:bg-white cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSiteIds.includes(s._id)}
                      onChange={() => handleToggleSite(s._id)}
                      className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                    />
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    {s.code && <span className="text-slate-400 text-[10px]">({s.code})</span>}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-amber-500 hover:bg-amber-600 rounded-lg shadow-xs disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {loading && (
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
              <span>{agentToEdit ? 'Save Changes' : 'Create Agent'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
