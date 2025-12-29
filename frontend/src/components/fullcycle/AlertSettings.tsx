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
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">Alert Settings</h3>
        <button
          onClick={handleToggleAlerts}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors ${
            alertsEnabled
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-bg-tertiary text-text-secondary border border-border-default'
          }`}
        >
          {alertsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          <span className="text-sm">{alertsEnabled ? 'Enabled' : 'Disabled'}</span>
        </button>
      </div>

      {alertsEnabled && (
        <div className="space-y-4">
          <div className="text-sm text-text-secondary">
            Alerts will trigger when the average z-score crosses the SDCA thresholds.
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                SDCA In Threshold (Oversold)
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
              <label className="block text-sm font-medium text-text-secondary mb-2">
                SDCA Out Threshold (Overbought)
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="email-alerts"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
            />
            <label htmlFor="email-alerts" className="text-sm text-text-secondary flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email alerts (requires backend setup)
            </label>
          </div>

          {lastAlert && (
            <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded p-2">
              <CheckCircle className="w-4 h-4" />
              <span>Last alert: {lastAlert}</span>
            </div>
          )}

          {'Notification' in window && Notification.permission === 'denied' && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
              Browser notifications are blocked. Please enable them in your browser settings.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

