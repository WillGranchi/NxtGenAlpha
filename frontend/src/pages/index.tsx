/**
 * Main page component.
 */

import React from 'react';
import { UnifiedDashboard } from '../components/dashboard/UnifiedDashboard';
import ErrorBoundary from '../components/ErrorBoundary';

const IndexPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <UnifiedDashboard />
    </ErrorBoundary>
  );
};

export default IndexPage;
