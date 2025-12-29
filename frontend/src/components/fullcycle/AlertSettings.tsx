/**
 * Alert Settings Component
 * Configure alerts for Full Cycle Model thresholds
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Mail, CheckCircle } from 'lucide-react';
import { Input } from '../ui/Input';

interface AlertSettingsProps {
  averageZScore: number | null;
  sdcaIn: number;
  sdcaOut: number;
  onSdcaInChange: (value: number) => void;
  onSdcaOutChange: (value: number) => void;
}

export const AlertSettings: React.FC<AlertSettingsProps> = ({
  averageZScore,
  sdcaIn,
  sdcaOut,
  onSdcaInChange,
  onSdcaOutChange,
}) => {
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('fullCycle_alertsEnabled');
    return saved === 'true';
  });
  const [emailAlerts, setEmailAlerts] = useState<boolean>(false);
  const [lastAlert, setLastAlert] = useState<string | null>(null);

  // Request notification permission
  useEffect(() => {
    if (alertsEnabled && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [alertsEnabled]);

  // Check for threshold crossings
  useEffect(() => {
    if (!alertsEnabled || averageZScore === null) return;

    let alertMessage: string | null = null;

    if (averageZScore < sdcaIn) {
      alertMessage = `Oversold Alert: Average Z-Score (${averageZScore.toFixed(2)}) crossed SDCA In threshold (${sdcaIn})`;
    } else if (averageZScore > sdcaOut) {
      alertMessage = `Overbought Alert: Average Z-Score (${averageZScore.toFixed(2)}) crossed SDCA Out threshold (${sdcaOut})`;
    }

    if (alertMessage && alertMessage !== lastAlert) {
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Full Cycle Model Alert', {
          body: alertMessage,
          icon: '/favicon.ico',
          tag: 'fullcycle-alert',
        });
      }

      // Email alert (would require backend)
      if (emailAlerts) {
        // TODO: Call backend API to send email
        console.log('Email alert would be sent:', alertMessage);
      }

      setLastAlert(alertMessage);
    }
  }, [averageZScore, sdcaIn, sdcaOut, alertsEnabled, emailAlerts, lastAlert]);

  const handleToggleAlerts = () => {
    const newValue = !alertsEnabled;
    setAlertsEnabled(newValue);
    localStorage.setItem('fullCycle_alertsEnabled', String(newValue));

    if (newValue && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">Alert Settings</h3>
          <p className="text-xs text-text-muted">Configure notifications for threshold crossings</p>
        </div>
        <button
          onClick={handleToggleAlerts}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
            alertsEnabled
              ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
              : 'bg-bg-tertiary text-text-secondary border border-border-default hover:bg-bg-tertiary/80'
          }`}
        >
          {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          <span>{alertsEnabled ? 'Enabled' : 'Disabled'}</span>
        </button>
      </div>

      {alertsEnabled && (
        <div className="space-y-6">
          {/* SDCA Thresholds - Prominent Position */}
          <div>
            <h4 className="text-sm font-semibold text-text-primary mb-4">SDCA Thresholds</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
                  SDCA In (Oversold)
                </label>
                <Input
                  type="number"
                  value={sdcaIn}
                  onChange={(e) => onSdcaInChange(parseFloat(e.target.value) || -2.0)}
                  step="0.1"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
                  SDCA Out (Overbought)
                </label>
                <Input
                  type="number"
                  value={sdcaOut}
                  onChange={(e) => onSdcaOutChange(parseFloat(e.target.value) || 2.0)}
                  step="0.1"
                  className="w-full"
                />
              </div>
            </div>
            <p className="text-xs text-text-muted mt-3">
              Alerts trigger when average z-score crosses these thresholds
            </p>
          </div>

          {/* Email Alerts */}
          <div className="pt-4 border-t border-border-default">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                id="email-alerts"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500 focus:ring-2"
              />
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-text-muted group-hover:text-text-secondary transition-colors" />
                <div>
                  <span className="text-sm font-medium text-text-primary block">Email Alerts</span>
                  <span className="text-xs text-text-muted">Requires backend setup</span>
                </div>
              </div>
            </label>
          </div>

          {/* Last Alert - Subtle Display */}
          {lastAlert && (
            <div className="pt-4 border-t border-border-default">
              <div className="flex items-start gap-3 text-xs">
                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-text-muted block mb-1">Last Alert</span>
                  <span className="text-text-secondary">{lastAlert}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notification Permission Warning */}
          {'Notification' in window && Notification.permission === 'denied' && (
            <div className="pt-4 border-t border-border-default">
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                Browser notifications are blocked. Please enable them in your browser settings.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

