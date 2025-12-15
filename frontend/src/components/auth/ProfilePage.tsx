import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../Toast';
import { Edit2, Save, X, Eye, EyeOff, User, CreditCard, Settings as SettingsIcon, Camera, CheckCircle2 } from 'lucide-react';
import { useMobile } from '../../hooks/useMobile';

type TabType = 'profile' | 'billing' | 'settings';

const ProfilePage: React.FC = () => {
  const { user, updateTheme, updateProfile, changePassword, logout } = useAuth();
  const { toasts, success, error, removeToast } = useToast();
  const isMobile = useMobile();
  
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  
  // Edit states
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isEditingProfilePicture, setIsEditingProfilePicture] = useState(false);
  
  // Form states
  const [nameValue, setNameValue] = useState(user?.name || '');
  const [emailValue, setEmailValue] = useState(user?.email || '');
  const [profilePictureUrl, setProfilePictureUrl] = useState(user?.profile_picture_url || '');
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState<'avataaars' | 'personas'>('avataaars');
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
  const [isUpdatingProfilePicture, setIsUpdatingProfilePicture] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isTogglingTheme, setIsTogglingTheme] = useState(false);

  // Generate DiceBear avatar URL (using DiceBear API v7)
  const generateAvatarUrl = (style: 'avataaars' | 'personas', seed?: string): string => {
    const name = user?.name || user?.email || 'User';
    const seedParam = seed || encodeURIComponent(name);
    // DiceBear v7 API - using seed parameter for consistent avatars
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seedParam}`;
  };

  // Get current profile picture or generate default
  const getProfilePictureUrl = (): string => {
    if (user?.profile_picture_url) {
      return user.profile_picture_url;
    }
    return generateAvatarUrl('avataaars');
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
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

  const handleSaveProfilePicture = async () => {
    try {
      setIsUpdatingProfilePicture(true);
      const url = profilePictureUrl.trim() || generateAvatarUrl(selectedAvatarStyle);
      await updateProfile(undefined, undefined, url);
      setIsEditingProfilePicture(false);
      setProfilePictureUrl('');
      success('Profile picture updated successfully');
    } catch (err: any) {
      error(err.response?.data?.detail || 'Failed to update profile picture');
    } finally {
      setIsUpdatingProfilePicture(false);
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

  const cancelProfilePictureEdit = () => {
    setIsEditingProfilePicture(false);
    setProfilePictureUrl('');
    setSelectedAvatarStyle('avataaars');
  };

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'billing' as TabType, label: 'Billing', icon: CreditCard },
    { id: 'settings' as TabType, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-text-primary">Profile & Settings</h1>

      {/* Tabs */}
      <div className="border-b border-border-default mb-6">
        <div className={`flex ${isMobile ? 'overflow-x-auto' : 'flex-wrap'} gap-2`}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 md:py-3 text-sm md:text-base font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-500'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-default'
                }`}
              >
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-bg-secondary border border-border-default rounded-lg shadow-lg p-4 md:p-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Profile Picture Section */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-text-primary">Profile Picture</h2>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
                <div className="relative">
                  <img
                    src={getProfilePictureUrl()}
                    alt="Profile"
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-border-default object-cover"
                  />
                  {!isEditingProfilePicture && (
                    <button
                      onClick={() => setIsEditingProfilePicture(true)}
                      className="absolute bottom-0 right-0 md:bottom-2 md:right-2 bg-primary-500 text-white rounded-full p-2 hover:bg-primary-600 transition-colors shadow-lg"
                      title="Change profile picture"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {isEditingProfilePicture ? (
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Avatar Style
                      </label>
                      <div className="flex gap-4 mb-4">
                        <button
                          onClick={() => setSelectedAvatarStyle('avataaars')}
                          className={`flex-1 p-3 border-2 rounded-lg transition-colors ${
                            selectedAvatarStyle === 'avataaars'
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-border-default hover:border-primary-300'
                          }`}
                        >
                          <img
                            src={generateAvatarUrl('avataaars', 'style1')}
                            alt="Avataaars"
                            className="w-full h-16 object-contain"
                          />
                          <p className="text-xs mt-2 text-center text-text-secondary">Avataaars</p>
                        </button>
                        <button
                          onClick={() => setSelectedAvatarStyle('personas')}
                          className={`flex-1 p-3 border-2 rounded-lg transition-colors ${
                            selectedAvatarStyle === 'personas'
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-border-default hover:border-primary-300'
                          }`}
                        >
                          <img
                            src={generateAvatarUrl('personas', 'style2')}
                            alt="Personas"
                            className="w-full h-16 object-contain"
                          />
                          <p className="text-xs mt-2 text-center text-text-secondary">Personas</p>
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSaveProfilePicture}
                          isLoading={isUpdatingProfilePicture}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          Save Avatar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={cancelProfilePictureEdit}
                          disabled={isUpdatingProfilePicture}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-text-muted">
                      Preview: <img src={generateAvatarUrl(selectedAvatarStyle)} alt="Preview" className="inline-block w-8 h-8 rounded-full ml-2" />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <p className="text-sm text-text-muted mb-2">
                      Click the camera icon to change your profile picture. You can choose from different avatar styles.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* User Info Section */}
            <div className="border-t border-border-default pt-6">
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
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="text-center py-8 md:py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
                <CheckCircle2 className="w-8 h-8 md:w-10 md:h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 text-text-primary">100% Free For Now!</h2>
              <p className="text-text-muted mb-8 max-w-md mx-auto">
                Enjoy unlimited access to all features. We'll notify you before any billing changes.
              </p>
            </div>

            {/* Current Plan */}
            <div className="bg-bg-tertiary rounded-lg p-6 border border-border-default">
              <h3 className="text-lg font-semibold mb-4 text-text-primary">Current Plan</h3>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold text-text-primary">Free Plan</p>
                  <p className="text-sm text-text-muted">Unlimited access</p>
                </div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
            </div>

            {/* Plan Features */}
            <div className="bg-bg-tertiary rounded-lg p-6 border border-border-default">
              <h3 className="text-lg font-semibold mb-4 text-text-primary">What's Included</h3>
              <ul className="space-y-3">
                {[
                  'Unlimited strategy backtests',
                  'Unlimited custom indicators',
                  'Full access to all technical indicators',
                  'Strategy library storage',
                  'Export and share strategies',
                  'Priority support',
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-text-secondary">
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Upgrade Options (Placeholder for future) */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-bg-tertiary rounded-lg p-6 border-2 border-border-default hover:border-primary-300 transition-colors">
                <h3 className="text-lg font-semibold mb-2 text-text-primary">Pro Plan</h3>
                <p className="text-3xl font-bold mb-1 text-text-primary">$29<span className="text-lg text-text-muted">/month</span></p>
                <p className="text-sm text-text-muted mb-4">Coming soon</p>
                <Button variant="secondary" disabled className="w-full">
                  Coming Soon
                </Button>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-6 border-2 border-border-default hover:border-primary-300 transition-colors">
                <h3 className="text-lg font-semibold mb-2 text-text-primary">Enterprise</h3>
                <p className="text-3xl font-bold mb-1 text-text-primary">Custom</p>
                <p className="text-sm text-text-muted mb-4">Contact us</p>
                <Button variant="secondary" disabled className="w-full">
                  Contact Sales
                </Button>
              </div>
            </div>

            {/* Payment Method (Placeholder) */}
            <div className="bg-bg-tertiary rounded-lg p-6 border border-border-default">
              <h3 className="text-lg font-semibold mb-4 text-text-primary">Payment Method</h3>
              <p className="text-text-muted mb-4">No payment method on file. Billing will be available soon.</p>
              <Button variant="secondary" disabled>
                Add Payment Method (Coming Soon)
              </Button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Change Password Section */}
            <div>
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
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
