import React, { useState, useEffect } from 'react';
import { Site, siteApi } from '../api/siteApi';
import { AgentUser, agentApi } from '../api/agentApi';
import { X, AlertCircle } from 'lucide-react';

interface SiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  siteToEdit?: Site | null;
}

export const SiteModal: React.FC<SiteModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  siteToEdit,
}) => {
  const [name, setName] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [status, setStatus] = useState<'active' | 'completed'>('active');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [availableAgents, setAvailableAgents] = useState<AgentUser[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      agentApi
        .getAgents()
        .then((agents) => setAvailableAgents(agents.filter((a) => a.isActive)))
        .catch((err) => console.error('Failed to load agents', err));

      if (siteToEdit) {
        setName(siteToEdit.name);
        setCode(siteToEdit.code || '');
        setLocation(siteToEdit.location);
        setDescription(siteToEdit.description || '');
        setStatus(siteToEdit.status);
        setSelectedAgentIds(siteToEdit.assignedAgents.map((a) => a._id));
      } else {
        setName('');
        setCode('');
        setLocation('');
        setDescription('');
        setStatus('active');
        setSelectedAgentIds([]);
      }
      setErrorMessage(null);
    }
  }, [isOpen, siteToEdit]);

  const handleToggleAgent = (agentId: string) => {
    setSelectedAgentIds((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim() || !location.trim()) {
      setErrorMessage('Site name and location are required.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        name: name.trim(),
        code: code.trim() ? code.trim().toUpperCase() : undefined,
        location: location.trim(),
        description: description.trim() || undefined,
        status,
        assignedAgents: selectedAgentIds,
      };

      if (siteToEdit) {
        await siteApi.updateSite(siteToEdit._id, payload);
      } else {
        await siteApi.createSite(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to save site.');
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
            {siteToEdit ? 'Edit Construction Site' : 'New Construction Site'}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Site Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Greenfield Heights"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Code</label>
              <input
                type="text"
                placeholder="SITE-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Location <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sarjapur Road, Bengaluru"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="e.g. Residential tower construction"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'completed')}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Assigned Agents */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Assigned Field Agents
            </label>
            <p className="text-[10px] text-slate-400 mb-1.5">
              Each agent can belong to a single site. Assigning an agent moves them to this site.
            </p>
            {availableAgents.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">No active agents found.</p>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                {availableAgents.map((agent) => {
                  const currentSite =
                    agent.assignedSite ||
                    (agent.assignedSites && agent.assignedSites.length > 0
                      ? agent.assignedSites[0]
                      : null);
                  const isAssignedElsewhere =
                    currentSite && siteToEdit && currentSite._id !== siteToEdit._id;
                  return (
                    <label
                      key={agent._id}
                      className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-white cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <input
                          type="checkbox"
                          checked={selectedAgentIds.includes(agent._id)}
                          onChange={() => handleToggleAgent(agent._id)}
                          className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                        />
                        <span className="font-semibold text-slate-800">{agent.name}</span>
                        <span className="text-slate-400 text-[10px]">({agent.email})</span>
                      </div>
                      {isAssignedElsewhere && !selectedAgentIds.includes(agent._id) && (
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
                          (now: {currentSite.name})
                        </span>
                      )}
                    </label>
                  );
                })}
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
              <span>{siteToEdit ? 'Save Changes' : 'Create Site'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
