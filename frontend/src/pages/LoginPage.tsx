import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HardHat, LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'contractor') {
        navigate('/dashboard');
      } else {
        navigate('/sites');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Invalid email or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
    setLoading(true);

    try {
      const user = await login(demoEmail, demoPass);
      if (user.role === 'contractor') {
        navigate('/dashboard');
      } else {
        navigate('/sites');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Demo sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex w-11 h-11 rounded-xl bg-amber-500 items-center justify-center text-slate-950 shadow-xs mb-2.5">
            <HardHat className="w-6 h-6 stroke-[2.2] shrink-0" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            BuildLedger
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Construction Site Transaction Management
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200/80 flex items-start gap-2 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
              ) : (
                <LogIn className="w-4 h-4 shrink-0" />
              )}
              <span>Sign In</span>
            </button>
          </form>

          {/* Clean One-Click Demo Access */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="block text-[11px] font-medium text-slate-400 text-center mb-2.5">
              1-Click Demo Login:
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleDemoSelect('contractor@example.com', 'Contractor@123')}
                disabled={loading}
                className="py-1.5 px-2 text-[11px] font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-center truncate"
                title="Login as Contractor (Full Admin)"
              >
                Contractor
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('agent@example.com', 'Agent@123')}
                disabled={loading}
                className="py-1.5 px-2 text-[11px] font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-center truncate"
                title="Login as Agent 1 (Ramesh)"
              >
                Agent 1
              </button>
              <button
                type="button"
                onClick={() => handleDemoSelect('agent2@example.com', 'Agent2@123')}
                disabled={loading}
                className="py-1.5 px-2 text-[11px] font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors text-center truncate"
                title="Login as Agent 2 (Suresh)"
              >
                Agent 2
              </button>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          Strict role-based access control enabled.
        </p>
      </div>
    </div>
  );
};
