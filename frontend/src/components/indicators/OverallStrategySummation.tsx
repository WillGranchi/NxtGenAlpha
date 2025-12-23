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
  const [showIndividualIndicators, setShowIndividualIndicators] = React.useState<boolean>(false);
  // Prepare chart data - use combined signals if available, otherwise use base price data
  const chartData = useMemo(() => {
    const hasCombinedSignals = priceData.length > 0 && combinedSignals.length > 0;
    
    if (hasCombinedSignals) {
      return priceData.map((point, index) => ({
        Date: point.Date,
        Price: point.Price,
        Position: index < combinedSignals.length ? combinedSignals[index] : 0,
        Portfolio_Value: point.Price,
        Capital: 0,
        Shares: 0,
      }));
    }
    
    // Use base price data when no indicators selected
    return basePriceData || [];
  }, [priceData, combinedSignals, basePriceData]);

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

  // Determine if we have combined results
  const hasResults = !!(combinedResult && currentAgreement);
  const hasPriceData = chartData.length > 0;

  return (
    <div className="bg-bg-secondary border-2 border-primary-500/30 rounded-lg p-6 space-y-6">
      {/* Header with Current Signal State */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">Overall Strategy</h2>
          <p className="text-sm text-text-secondary">
            {hasResults 
              ? 'Combined signals from all indicators using majority voting'
              : 'BTC Price Chart - Select indicators to see combined signals'}
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

      {/* Price Chart - Always Visible */}
      {hasPriceData && (
        <div>
          <PriceChart
            data={chartData}
            title={hasResults ? "Overall Strategy - Combined Trading Signals" : "BTC Price Chart"}
            height={600}
            overlaySignals={hasResults ? { ...overlaySignals, ...combinedOverlaySignals } : {}}
            showOverlayLegend={hasResults}
          />
        </div>
      )}

      {/* Equity Curve - Always Visible */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
          {hasResults ? 'Combined Equity Curve' : 'Equity Curve'}
        </h3>
          {hasResults && Object.keys(individualResults).length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showIndividualIndicators}
                onChange={(e) => setShowIndividualIndicators(e.target.checked)}
                className="w-4 h-4 text-primary-500 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-text-secondary">Show Individual Indicators</span>
            </label>
          )}
        </div>
        {hasResults && combinedResult.equity_curve && combinedResult.equity_curve.length > 0 ? (
          <EquityChart
            data={combinedResult.equity_curve}
            title="Overall Strategy Equity Curve"
            height={400}
            individualEquityData={showIndividualIndicators ? Object.fromEntries(
              Object.entries(individualResults)
                .filter(([id]) => indicatorIds.includes(id))
                .map(([id, result]) => [
                  indicatorNames[id] || id,
                  result.equity_curve || []
                ])
            ) : {}}
            showIndividualLegend={showIndividualIndicators}
          />
        ) : (
          <div className="bg-bg-tertiary border border-border-default rounded-lg p-12">
            <div className="text-center text-text-muted">
              <p>Equity curve will appear here once indicators are selected and signals are generated</p>
            </div>
          </div>
        )}
      </div>

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
