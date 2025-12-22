/**
 * Combined Signals Tab Component
 * Displays combined signals using majority voting
 */

import React, { useMemo } from 'react';
import { PriceChart } from '../charts/PriceChart';
import { EquityChart } from '../charts/EquityChart';
import EnhancedMetrics from '../results/EnhancedMetrics';
import { MajorityVotingControls } from './MajorityVotingControls';
import type { BacktestResult } from '../../services/api';

interface CombinedSignalsTabProps {
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

export const CombinedSignalsTab: React.FC<CombinedSignalsTabProps> = ({
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
      Portfolio_Value: point.Price, // Use price as placeholder
      Capital: 0, // Not used by PriceChart
      Shares: 0, // Not used by PriceChart
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-text-muted">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
          <p>Generating combined signals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Majority Voting Controls */}
      <MajorityVotingControls
        threshold={threshold}
        onThresholdChange={onThresholdChange}
        agreementStats={currentAgreement}
        isLoading={isLoading}
      />

      {/* Combined Price Chart */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Combined Signals - All Indicators
        </h3>
        <PriceChart
          data={chartData}
          title="Combined Trading Signals (Majority Voting)"
          height={500}
          overlaySignals={{ ...overlaySignals, ...combinedOverlaySignals }}
          showOverlayLegend={true}
        />
      </div>

      {/* Combined Metrics */}
      {combinedResult && (
        <>
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
                title="Combined Strategy Equity Curve"
                height={400}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};
