import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SitesPage } from './pages/SitesPage';
import { SiteDetailPage } from './pages/SiteDetailPage';
import { AgentsPage } from './pages/AgentsPage';
import { TransactionsPage } from './pages/TransactionsPage';

const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50/70">
      <Navbar />
      <div className="flex-1 flex max-w-7xl w-full mx-auto min-w-0">
        <Sidebar />
        <main className="flex-1 min-w-0 p-3 sm:p-6 lg:p-8 pb-20 md:pb-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated, isContractor, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return isContractor ? <Navigate to="/dashboard" replace /> : <Navigate to="/sites" replace />;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public login route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Application Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Contractor Only */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['contractor']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/agents"
              element={
                <ProtectedRoute allowedRoles={['contractor']}>
                  <AgentsPage />
                </ProtectedRoute>
              }
            />

            {/* Sites Management & Details (accessible to both contractor and assigned agents) */}
            <Route path="/sites" element={<SitesPage />} />
            <Route path="/sites/:id" element={<SiteDetailPage />} />

            {/* Transactions Ledger */}
            <Route path="/transactions" element={<TransactionsPage />} />
          </Route>

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
