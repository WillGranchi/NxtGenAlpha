/**
 * Individual Indicator Tab Component
 * Displays chart and backtest results for a single indicator
 */

import React, { useMemo } from 'react';
import { PriceChart } from '../charts/PriceChart';
import { EquityChart } from '../charts/EquityChart';
import EnhancedMetrics from '../results/EnhancedMetrics';
import type { BacktestResult } from '../../services/api';

interface IndividualIndicatorTabProps {
  indicatorId: string;
  indicatorName: string;
  priceData: Array<{
    Date: string;
    Price: number;
    Position: number;
    [key: string]: any;
  }>;
  result: BacktestResult | null;
  isLoading?: boolean;
}

export const IndividualIndicatorTab: React.FC<IndividualIndicatorTabProps> = ({
  indicatorId,
  indicatorName,
  priceData,
  result,
  isLoading = false,
}) => {
  // Prepare chart data with signals
  const chartData = useMemo(() => {
    if (!priceData || priceData.length === 0) return [];

    return priceData.map((point) => ({
      Date: point.Date,
      Price: point.Price,
      Position: point[`${indicatorId}_Position`] ?? point.Position ?? 0,
      Portfolio_Value: point.Price, // Use price as placeholder
      Capital: 0, // Not used by PriceChart
      Shares: 0, // Not used by PriceChart
    }));
  }, [priceData, indicatorId]);

  // Generate overlay signals for this indicator
  const overlaySignals = useMemo(() => {
    if (!chartData || chartData.length === 0) return {};

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
      [indicatorId]: { buy: buySignals, sell: sellSignals },
    };
  }, [chartData, indicatorId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center text-text-muted">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-4"></div>
          <p>Generating signals and running backtest...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">No results available for {indicatorName}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Price Chart with Signals */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          {indicatorName} - Price Chart with Signals
        </h3>
        <PriceChart
          data={chartData}
          title={`${indicatorName} Trading Signals`}
          height={500}
          overlaySignals={overlaySignals}
          showOverlayLegend={true}
        />
      </div>

      {/* Metrics */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-4">Performance Metrics</h3>
        <EnhancedMetrics metrics={result.metrics} />
      </div>

      {/* Equity Curve */}
      {result.equity_curve && result.equity_curve.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-4">Equity Curve</h3>
          <EquityChart
            data={result.equity_curve}
            title={`${indicatorName} Equity Curve`}
            height={400}
          />
        </div>
      )}
    </div>
  );
};
