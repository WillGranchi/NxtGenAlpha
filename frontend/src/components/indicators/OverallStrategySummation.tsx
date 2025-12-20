/**
 * Overall Strategy Summation Component
 * Displays combined strategy results at the top of the Indicators page
 */

import React, { useMemo } from 'react';
import { PriceChart } from '../charts/PriceChart';
import { EquityChart } from '../charts/EquityChart';
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
  combinedResult: BacktestResult | null;
  combinedSignals: number[];
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
  combinedResult,
  combinedSignals,
  agreementStats,
  threshold,
  onThresholdChange,
  isLoading = false,
}) => {
  // Prepare chart data with combined signals
  const chartData = useMemo(() => {
    if (!priceData || priceData.length === 0 || combinedSignals.length === 0) return [];

    return priceData.map((point, index) => ({
      Date: point.Date,
      Price: point.Price,
      Position: index < combinedSignals.length ? combinedSignals[index] : 0,
      Portfolio_Value: point.Price,
      Capital: 0,
      Shares: 0,
    }));
  }, [priceData, combinedSignals]);

  // Generate overlay signals for all indicators
  const overlaySignals = useMemo(() => {
    if (!priceData || priceData.length === 0) return {};

    const signals: Record<string, { buy: { x: string[]; y: number[] }; sell: { x: string[]; y: number[] } }> = {};

    indicatorIds.forEach((indicatorId) => {
      const buySignals: { x: string[]; y: number[] } = { x: [], y: [] };
      const sellSignals: { x: string[]; y: number[] } = { x: [], y: [] };

      for (let i = 1; i < priceData.length; i++) {
        const prevPosition = priceData[i - 1][`${indicatorId}_Position`] ?? 0;
        const currentPosition = priceData[i][`${indicatorId}_Position`] ?? 0;

        if (prevPosition === 0 && currentPosition === 1) {
          buySignals.x.push(priceData[i].Date);
          buySignals.y.push(priceData[i].Price);
        } else if (prevPosition === 1 && currentPosition === 0) {
          sellSignals.x.push(priceData[i].Date);
          sellSignals.y.push(priceData[i].Price);
        }
      }

      signals[indicatorId] = { buy: buySignals, sell: sellSignals };
    });

    return signals;
  }, [priceData, indicatorIds]);

  // Generate combined buy/sell signals
  const combinedOverlaySignals = useMemo((): Record<string, { buy: { x: string[]; y: number[] }; sell: { x: string[]; y: number[] } }> => {
    if (!chartData || chartData.length === 0) {
      return {};
    }

    const buySignals: { x: string[]; y: number[] } = { x: [], y: [] };
    const sellSignals: { x: string[]; y: number[] } = { x: [], y: [] };

    for (let i = 1; i < chartData.length; i++) {
      const prevPosition = chartData[i - 1].Position;
      const currentPosition = chartData[i].Position;

      if (prevPosition === 0 && currentPosition === 1) {
        buySignals.x.push(chartData[i].Date);
        buySignals.y.push(chartData[i].Price);
      } else if (prevPosition === 1 && currentPosition === 0) {
        sellSignals.x.push(chartData[i].Date);
        sellSignals.y.push(chartData[i].Price);
      }
    }

    return {
      Combined: { buy: buySignals, sell: sellSignals },
    };
  }, [chartData]);

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

  // Show even without results if indicators are selected (show placeholder)
  const hasResults = combinedResult && currentAgreement;
  
  if (!hasResults && indicatorIds.length === 0) {
    return null;
  }

  return (
    <div className="bg-bg-secondary border-2 border-primary-500/30 rounded-lg p-6 space-y-6">
      {/* Header with Current Signal State */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Overall Strategy</h2>
          <p className="text-sm text-text-secondary">
            Combined signals from all indicators using majority voting
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

      {/* Combined Price Chart */}
      {hasResults && (
        <>
          <div>
            <PriceChart
              data={chartData}
              title="Overall Strategy - Combined Trading Signals"
              height={600}
              overlaySignals={{ ...overlaySignals, ...combinedOverlaySignals }}
              showOverlayLegend={true}
            />
          </div>

          {/* Combined Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Combined Performance Metrics</h3>
            <EnhancedMetrics metrics={combinedResult.metrics} />
          </div>

          {/* Combined Equity Curve */}
          {combinedResult.equity_curve && combinedResult.equity_curve.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-text-primary mb-4">Combined Equity Curve</h3>
              <EquityChart
                data={combinedResult.equity_curve}
                title="Overall Strategy Equity Curve"
                height={400}
              />
            </div>
          )}
        </>
      )}

      {/* Placeholder when no results */}
      {!hasResults && indicatorIds.length > 0 && (
        <div className="text-center py-8 text-text-muted">
          <p>Select indicators and generate signals to see overall strategy results</p>
        </div>
      )}
    </div>
  );
};
