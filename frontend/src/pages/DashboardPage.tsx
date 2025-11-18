/**
 * Dashboard page - Main strategy builder interface
 */

import React from 'react';
import { Dashboard } from '../components/Dashboard';
import ErrorBoundary from '../components/ErrorBoundary';

const DashboardPage: React.FC = () => {
  return (
    <div className="p-6">
      <ErrorBoundary>
        <Dashboard />
      </ErrorBoundary>
    </div>
  );
};

export default DashboardPage;

