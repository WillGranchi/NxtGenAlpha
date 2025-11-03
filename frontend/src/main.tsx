/**
 * Main entry point for the React application.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from './contexts/AuthContext';
import IndexPage from './pages/index';
import './index.css';

// Create root and render app
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AuthProvider>
      <IndexPage />
    </AuthProvider>
  </React.StrictMode>
);
