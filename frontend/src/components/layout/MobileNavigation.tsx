/**
 * Mobile-responsive collapsible navigation
 * Shows as sidebar on desktop, collapsible drawer on mobile
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Library, 
  Settings, 
  LogOut,
  User,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { useSwipe } from '../../hooks/useSwipe';

export const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Swipe gestures for mobile
  const swipeHandlers = useSwipe({
    onSwipeRight: () => setIsOpen(true),
    onSwipeLeft: () => setIsOpen(false),
  });

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
      // Auto-close on mobile when navigating
      if (window.innerWidth < 1024) {
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    }
  }, [location.pathname, isMobile]);

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/library', label: 'Strategy Library', icon: Library },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Mobile: Collapsed tab trigger
  if (isMobile && !isOpen) {
    return (
      <>
        {/* Small tab trigger */}
        <button
          onClick={() => setIsOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-50 bg-primary-500 text-white p-2 rounded-r-lg shadow-lg hover:bg-primary-600 transition-colors"
          aria-label="Open navigation"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </>
    );
  }

  return (
    <>
      {/* Backdrop overlay (mobile only) */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Navigation sidebar */}
      <nav
        {...(isMobile ? swipeHandlers.swipeProps : {})}
        className={`
          fixed lg:static
          top-0 left-0 h-full
          bg-bg-secondary border-r border-border-default
          w-64 min-h-screen p-4 flex flex-col
          z-50
          transition-transform duration-300 ease-in-out
          ${isMobile ? (isOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
        `}
      >
        {/* Header with close button (mobile) */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gradient">Trading Platform</h1>
          {isMobile && (
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 text-text-muted hover:text-text-primary transition-colors lg:hidden"
              aria-label="Close navigation"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <ul className="space-y-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => isMobile && setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                    touch-manipulation
                    ${isActive(item.path)
                      ? 'bg-gradient-to-r from-primary-500/20 to-indigo-500/20 text-primary-400 border border-primary-500/30'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary active:bg-bg-tertiary'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
        
        <div className="border-t border-border-default pt-4">
          <div className="flex items-center gap-3 px-4 py-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {user?.email || 'User'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start touch-manipulation"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </nav>
    </>
  );
};

