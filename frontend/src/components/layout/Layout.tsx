/**
 * Main layout wrapper with navigation
 */

import React from 'react';
import { MobileNavigation } from './MobileNavigation';
import { NavigationProvider } from '../../contexts/NavigationContext';

interface LayoutProps {
  children: React.ReactNode;
  showNav?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ children, showNav = true }) => {
  return (
    <NavigationProvider>
      <div className="min-h-screen bg-bg-primary flex">
        {showNav && <MobileNavigation />}
        <main className="flex-1 overflow-auto min-w-0 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </NavigationProvider>
  );
};

