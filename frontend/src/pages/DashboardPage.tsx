/**
 * Dashboard page - Unified strategy dashboard
 */

import React from 'react';
import { UnifiedDashboard } from '../components/dashboard/UnifiedDashboard';
import ErrorBoundary from '../components/ErrorBoundary';

const DashboardPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <UnifiedDashboard />
    </ErrorBoundary>
  );
};

export default DashboardPage;

