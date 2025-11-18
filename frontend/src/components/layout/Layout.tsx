/**
 * Main layout wrapper with navigation
 */

import React from 'react';
import { Navigation } from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showNav = true }) => {
  return (
    <div className="min-h-screen bg-bg-primary flex">
      {showNav && <Navigation />}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

