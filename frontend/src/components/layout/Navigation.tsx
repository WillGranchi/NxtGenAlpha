/**
 * Navigation component (sidebar or top nav)
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Library, 
  Settings, 
  LogOut,
  User,
  BarChart3,
  TrendingUp
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';

export const Navigation: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, logout, user } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/fullcycle', label: 'Full Cycle', icon: BarChart3 },
    { path: '/indicators', label: 'Indicators', icon: TrendingUp },
    { path: '/valuation', label: 'Valuation', icon: BarChart3 },
    { path: '/library', label: 'My Creations', icon: Library },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-bg-secondary border-r border-border-default w-64 min-h-screen p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gradient">Trading Platform</h1>
      </div>
      
      <ul className="space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300
                  ${isActive(item.path)
                    ? 'bg-gradient-to-r from-primary-500/20 to-indigo-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      
      <div className="border-t border-border-default pt-4">
        <div className="flex items-center gap-3 px-4 py-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-purple-500 flex items-center justify-center">
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
          className="w-full justify-start"
          onClick={logout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </nav>
  );
};

