/**
 * Main layout wrapper with navigation
 */

import React from 'react';
import { MobileNavigation } from './MobileNavigation';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showNav = true }) => {
  return (
    <div className="min-h-screen bg-bg-primary flex">
      {showNav && <MobileNavigation />}
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  );
};

