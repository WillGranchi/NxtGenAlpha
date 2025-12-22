/**
 * Dashboard page - Main strategy builder interface
 */

import React from 'react';
import { Dashboard } from '../components/Dashboard';
import ErrorBoundary from '../components/ErrorBoundary';

const DashboardPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
};

export default DashboardPage;

