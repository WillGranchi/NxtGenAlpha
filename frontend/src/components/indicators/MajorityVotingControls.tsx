/**
 * Majority Voting Controls Component
 * Configure threshold for combining indicator signals
 */

import React from 'react';
import { Input } from '../ui/Input';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MajorityVotingControlsProps {
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  agreementStats?: {
    long_count: number;
    short_count: number;
    total_count: number;
    combined_signal: number;
  } | null;
  isLoading?: boolean;
}

export const MajorityVotingControls: React.FC<MajorityVotingControlsProps> = ({
  threshold,
  onThresholdChange,
  agreementStats,
  isLoading = false,
}) => {
  const getSignalLabel = (signal: number): string => {
    if (signal === 1) return 'LONG';
    if (signal === -1) return 'SHORT';
    return 'CASH';
  };

  const getSignalColor = (signal: number): string => {
    if (signal === 1) return 'text-green-400';
    if (signal === -1) return 'text-red-400';
    return 'text-text-secondary';
  };

  const getSignalIcon = (signal: number) => {
    if (signal === 1) return <TrendingUp className="w-4 h-4" />;
    if (signal === -1) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-4 space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-text-primary mb-2">
          Majority Voting Threshold
        </h4>
        <p className="text-xs text-text-muted mb-4">
          Set the percentage of indicators that must agree to generate a signal
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            type="number"
            label="Threshold (%)"
            value={threshold * 100}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 50;
              onThresholdChange(Math.max(0, Math.min(100, value)) / 100);
            }}
            min={0}
            max={100}
            step={5}
            helperText={`${(threshold * 100).toFixed(0)}% of indicators must agree`}
            disabled={isLoading}
          />
        </div>

        {agreementStats && (
          <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
            <div className="text-xs font-medium text-text-secondary mb-2">
              Current Agreement
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Long:</span>
                <span className="text-sm font-medium text-green-400">
                  {agreementStats.long_count}/{agreementStats.total_count}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Short:</span>
                <span className="text-sm font-medium text-red-400">
                  {agreementStats.short_count}/{agreementStats.total_count}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border-default">
                <span className="text-sm font-medium text-text-primary">Combined:</span>
                <div className={`flex items-center gap-1 ${getSignalColor(agreementStats.combined_signal)}`}>
                  {getSignalIcon(agreementStats.combined_signal)}
                  <span className="text-sm font-semibold">
                    {getSignalLabel(agreementStats.combined_signal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
