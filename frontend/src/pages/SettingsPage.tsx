/**
 * Settings page - Profile, billing, and settings management
 */

import React from 'react';
import ProfilePage from '../components/auth/ProfilePage';
import ErrorBoundary from '../components/ErrorBoundary';

const SettingsPage: React.FC = () => {
  return (
    <ErrorBoundary>
      <ProfilePage />
    </ErrorBoundary>
  );
};

export default SettingsPage;

