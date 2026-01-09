/**
 * Dashboard page - Main strategy builder interface
 */

import React, { useState } from 'react';
import { Dashboard } from '../components/Dashboard';
import { UnifiedDashboard } from '../components/dashboard/UnifiedDashboard';
import ErrorBoundary from '../components/ErrorBoundary';
import { ToggleLeft } from 'lucide-react';

const DashboardPage: React.FC = () => {
  const [useUnified, setUseUnified] = useState(true); // Default to unified dashboard

  return (
    <ErrorBoundary>
      <div className="relative">
        {/* Toggle between old and new dashboard */}
        <div className="fixed top-20 right-4 z-50 bg-bg-secondary border border-border-default rounded-lg p-2 shadow-lg">
          <button
            onClick={() => setUseUnified(!useUnified)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-tertiary rounded transition-colors"
            title={useUnified ? "Switch to legacy dashboard" : "Switch to unified dashboard"}
          >
            <ToggleLeft className="w-4 h-4" />
            <span>{useUnified ? "Legacy" : "Unified"}</span>
          </button>
        </div>
        
        {useUnified ? <UnifiedDashboard /> : <Dashboard />}
      </div>
    </ErrorBoundary>
  );
};

export default DashboardPage;

