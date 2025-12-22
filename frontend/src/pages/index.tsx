/**
 * Main page component.
 */

import React from 'react';
import { Dashboard } from '../components/Dashboard';
import ErrorBoundary from '../components/ErrorBoundary';

const IndexPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <Dashboard />
    </ErrorBoundary>
  );
};

export default IndexPage;
