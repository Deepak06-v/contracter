import React, { useState, useEffect } from 'react';
import { agentApi, AgentUser } from '../api/agentApi';
import { AgentModal } from '../components/AgentModal';
import { formatDate } from '../utils/formatters';
import { Users, Plus, Edit2, ShieldAlert, CheckCircle, Search, Building2 } from 'lucide-react';

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<AgentUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [agentToEdit, setAgentToEdit] = useState<AgentUser | null>(null);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await agentApi.getAgents();
      setAgents(data);
    } catch (err) {
      console.error('Failed to load agents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const handleToggleStatus = async (agent: AgentUser) => {
    try {
      await agentApi.toggleStatus(agent._id);
      loadAgents();
    } catch (err) {
      console.error('Failed to toggle status', err);
    }
  };

  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 max-w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Site Agents
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage field agent accounts and site assignments.
          </p>
        </div>

        <button
          onClick={() => {
            setAgentToEdit(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-xs transition-colors self-start sm:self-auto shrink-0"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>New Agent</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 shrink-0" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:block shrink-0">
          Total: <strong className="text-slate-700">{agents.length}</strong> agents
        </span>
      </div>

      {/* Agents Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="p-10 text-center text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30 shrink-0" />
            <h3 className="text-xs font-bold text-slate-800">No Site Agents Found</h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto">
              Add your first site agent to enable mobile transaction logging.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-2.5 px-3.5">Name</th>
                  <th className="py-2.5 px-3.5">Email</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5">Assigned Sites</th>
                  <th className="py-2.5 px-3.5">Added Date</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAgents.map((agent) => (
                  <tr key={agent._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                      {agent.name}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-500 whitespace-nowrap">
                      {agent.email}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          agent.isActive
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            agent.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span>{agent.isActive ? 'Active' : 'Disabled'}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5">
                      {agent.assignedSites && agent.assignedSites.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {agent.assignedSites.map((s) => (
                            <span
                              key={s._id}
                              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-700"
                            >
                              <Building2 className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                              <span className="truncate max-w-[120px]">{s.name}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-amber-800 italic text-[11px]">No sites</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-slate-400 whitespace-nowrap text-[11px]">
                      {formatDate(agent.createdAt)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setAgentToEdit(agent);
                            setIsModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0"
                          title="Edit agent"
                        >
                          <Edit2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(agent)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors shrink-0 ${
                            agent.isActive
                              ? 'border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          {agent.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <AgentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadAgents}
        agentToEdit={agentToEdit}
      />
    </div>
  );
};
