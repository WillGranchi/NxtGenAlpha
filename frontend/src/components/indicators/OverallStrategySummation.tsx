/**
 * Overall Strategy Summation Component
 * Displays combined strategy results at the top of the Indicators page
 */

import React, { useMemo } from 'react';
import EnhancedMetrics from '../results/EnhancedMetrics';
import { MajorityVotingControls } from './MajorityVotingControls';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { BacktestResult } from '../../services/api';

interface OverallStrategySummationProps {
  indicatorIds: string[];
  indicatorNames: Record<string, string>;
  priceData: Array<{
    Date: string;
    Price: number;
    Position: number;
    [key: string]: any;
  }>;
  basePriceData: Array<{
    Date: string;
    Price: number;
    Position: number;
    Portfolio_Value: number;
    Capital: number;
    Shares: number;
  }>;
  combinedResult: BacktestResult | null;
  combinedSignals: number[];
  individualResults: Record<string, BacktestResult>;
  agreementStats: {
    total_points: number;
    agreement_by_point: Array<{
      date: string;
      long_count: number;
      short_count: number;
      total_count: number;
      combined_signal: number;
    }>;
  } | null;
  threshold: number;
  onThresholdChange: (threshold: number) => void;
  isLoading?: boolean;
}

export const OverallStrategySummation: React.FC<OverallStrategySummationProps> = ({
  indicatorIds,
  indicatorNames,
  priceData,
  basePriceData,
  combinedResult,
  combinedSignals,
  individualResults,
  agreementStats,
  threshold,
  onThresholdChange,
  isLoading = false,
}) => {

  // Get current agreement stats
  const currentAgreement = useMemo(() => {
    if (!agreementStats || agreementStats.agreement_by_point.length === 0) return null;
    return agreementStats.agreement_by_point[agreementStats.agreement_by_point.length - 1];
  }, [agreementStats]);

  // Get current signal state
  const currentSignalState = useMemo(() => {
    if (!currentAgreement) return null;
    const signal = currentAgreement.combined_signal;
    return {
      signal,
      label: signal === 1 ? 'LONG' : signal === -1 ? 'SHORT' : 'CASH',
      longCount: currentAgreement.long_count,
      shortCount: currentAgreement.short_count,
      totalCount: currentAgreement.total_count,
    };
  }, [currentAgreement]);

  // Determine if we have combined results
  const hasResults = !!(combinedResult && currentAgreement);

  return (
    <div className="bg-bg-secondary border-2 border-primary-500/30 rounded-lg p-6 space-y-6">
      {/* Header with Current Signal State */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Overall Strategy</h2>
          <p className="text-sm text-text-secondary">
            {hasResults 
              ? 'Combined signals from all indicators using majority voting'
              : 'Select indicators and generate signals to see combined results'}
          </p>
        </div>
        {currentSignalState && (
          <div className="flex items-center gap-4">
            <div className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2">
              <div className="text-xs text-text-muted mb-1">Current Signal</div>
              <div className={`flex items-center gap-2 ${
                currentSignalState.signal === 1 ? 'text-green-400' :
                currentSignalState.signal === -1 ? 'text-red-400' :
                'text-text-secondary'
              }`}>
                {currentSignalState.signal === 1 ? <TrendingUp className="w-5 h-5" /> :
                 currentSignalState.signal === -1 ? <TrendingDown className="w-5 h-5" /> :
                 <Minus className="w-5 h-5" />}
                <span className="text-lg font-bold">{currentSignalState.label}</span>
              </div>
            </div>
            <div className="bg-bg-tertiary border border-border-default rounded-lg px-4 py-2">
              <div className="text-xs text-text-muted mb-1">Agreement</div>
              <div className="text-sm font-semibold text-text-primary">
                {currentSignalState.longCount}/{currentSignalState.totalCount} Long, {currentSignalState.shortCount}/{currentSignalState.totalCount} Short
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Majority Voting Controls - Always Visible */}
      <MajorityVotingControls
        threshold={threshold}
        onThresholdChange={onThresholdChange}
        agreementStats={currentAgreement}
        isLoading={isLoading}
      />


      {/* Combined Metrics - Only when results exist */}
      {hasResults && (
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-4">Combined Performance Metrics</h3>
          <EnhancedMetrics metrics={combinedResult.metrics} />
        </div>
      )}
    </div>
  );
};
