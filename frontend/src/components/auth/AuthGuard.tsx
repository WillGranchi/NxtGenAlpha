import React, { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean; // If false, allows both authenticated and guest users
}

/**
 * Optional auth guard component.
 * By default, allows both authenticated and guest users.
 * Set requireAuth={true} to require authentication.
 */
const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  fallback,
  requireAuth = false,
}) => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return (
      fallback || (
        <div className="max-w-md mx-auto p-6 mt-8">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 mb-4">
              Please log in to access this feature.
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
};

export default AuthGuard;

