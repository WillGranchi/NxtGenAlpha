import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../Toast';
import { Edit2, Save, X, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

const ProfilePage: React.FC = () => {
  const { user, updateTheme, updateProfile, changePassword, logout } = useAuth();
  const { showToast, success, error, ToastComponent } = useToast();
  
  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  
  // Form states
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [emailValue, setEmailValue] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password visibility
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Loading states
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isTogglingTheme, setIsTogglingTheme] = useState(false);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-800 dark:text-yellow-200">Please log in to view your profile.</p>
        </div>
      </div>
    );
  }

  const handleSaveName = async () => {
    if (!nameValue.trim()) {
      error('Name cannot be empty');
      return;
    }
    
    try {
      setIsUpdatingName(true);
      await updateProfile(nameValue.trim(), undefined);
      setIsEditingName(false);
      success('Name updated successfully');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleSaveEmail = async () => {
    if (!emailValue.trim()) {
      error('Email cannot be empty');
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValue.trim())) {
      error('Please enter a valid email address');
      return;
    }
    
    try {
      setIsUpdatingEmail(true);
      await updateProfile(undefined, emailValue.trim());
      setIsEditingEmail(false);
      success('Email updated successfully');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      error('Please fill in all password fields');
      return;
    }
    
    if (newPassword.length < 8) {
      error('New password must be at least 8 characters long');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      error('New passwords do not match');
      return;
    }
    
    if (currentPassword === newPassword) {
      error('New password must be different from current password');
      return;
    }
    
    try {
      setIsChangingPassword(true);
      await changePassword(currentPassword, newPassword);
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      success('Password changed successfully');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = user.theme === 'light' ? 'dark' : 'light';
    try {
      setIsTogglingTheme(true);
      await updateTheme(newTheme);
      success(`Theme changed to ${newTheme} mode`);
    } catch (err) {
      error('Failed to update theme');
    } finally {
      setIsTogglingTheme(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const cancelEditName = () => {
    setNameValue(user.name || '');
    setIsEditingName(false);
  };

  const cancelEditEmail = () => {
    setEmailValue(user.email || '');
    setIsEditingEmail(false);
  };

  const cancelPasswordForm = () => {
    setShowPasswordForm(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <ToastComponent />
      <h1 className="text-3xl font-bold mb-6 text-text-primary">Profile & Settings</h1>

      <div className="bg-bg-secondary border border-border-default rounded-lg shadow-lg p-6 space-y-6">
        {/* User Info Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Account Information</h2>
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Name</label>
              {isEditingName ? (
                <div className="flex gap-2 items-start">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="flex-1"
                    placeholder="Enter your name"
                    autoFocus
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveName}
                    isLoading={isUpdatingName}
                    className="mt-0"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditName}
                    disabled={isUpdatingName}
                    className="mt-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-bg-tertiary rounded-lg p-3 border border-border-default">
                  <p className="text-text-primary">{user.name || 'Not provided'}</p>
                  <button
                    onClick={() => {
                      setNameValue(user.name || '');
                      setIsEditingName(true);
                    }}
                    className="p-2 text-text-secondary hover:text-primary-400 hover:bg-bg-elevated rounded-lg transition-colors"
                    title="Edit name"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">Email</label>
              {isEditingEmail ? (
                <div className="flex gap-2 items-start">
                  <Input
                    type="email"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    className="flex-1"
                    placeholder="Enter your email"
                    autoFocus
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveEmail}
                    isLoading={isUpdatingEmail}
                    className="mt-0"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditEmail}
                    disabled={isUpdatingEmail}
                    className="mt-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-bg-tertiary rounded-lg p-3 border border-border-default">
                  <p className="text-text-primary">{user.email}</p>
                  <button
                    onClick={() => {
                      setEmailValue(user.email || '');
                      setIsEditingEmail(true);
                    }}
                    className="p-2 text-text-secondary hover:text-primary-400 hover:bg-bg-elevated rounded-lg transition-colors"
                    title="Edit email"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Member Since */}
            {user.created_at && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">Member since</label>
                <div className="bg-bg-tertiary rounded-lg p-3 border border-border-default">
                  <p className="text-text-primary">
                    {new Date(user.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Section */}
        <div className="border-t border-border-default pt-6">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Security</h2>
          {!showPasswordForm ? (
            <Button
              variant="secondary"
              onClick={() => setShowPasswordForm(true)}
            >
              Change Password
            </Button>
          ) : (
            <div className="space-y-4 bg-bg-tertiary rounded-lg p-4 border border-border-default">
              <div className="relative">
                <Input
                  type={showCurrentPassword ? 'text' : 'password'}
                  label="Current Password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-9 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 8 characters)"
                  helperText={newPassword.length > 0 && newPassword.length < 8 ? 'Password must be at least 8 characters' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-9 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : ''}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  onClick={handleChangePassword}
                  isLoading={isChangingPassword}
                >
                  Change Password
                </Button>
                <Button
                  variant="ghost"
                  onClick={cancelPasswordForm}
                  disabled={isChangingPassword}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Theme Settings */}
        <div className="border-t border-border-default pt-6">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Appearance</h2>
          <div className="flex items-center justify-between bg-bg-tertiary rounded-lg p-4 border border-border-default">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Theme</label>
              <p className="text-sm text-text-muted">
                Switch between light and dark mode
              </p>
              <p className="mt-2 text-xs text-text-muted">
                Current theme: <span className="font-semibold capitalize text-text-secondary">{user.theme}</span>
              </p>
            </div>
            <button
              onClick={handleThemeToggle}
              disabled={isTogglingTheme}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                user.theme === 'dark' ? 'bg-primary-500' : 'bg-gray-400'
              } ${isTogglingTheme ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 ${
                  user.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Logout Section */}
        <div className="border-t border-border-default pt-6">
          <h2 className="text-xl font-semibold mb-4 text-text-primary">Account Actions</h2>
          <Button
            variant="danger"
            onClick={handleLogout}
          >
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
