/**
 * Performance metrics display for combined and individual strategies.
 */

import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target } from 'lucide-react';

interface PerformanceMetricsProps {
  metrics?: {
    total_return?: number;
    sharpe_ratio?: number;
    max_drawdown?: number;
    win_rate?: number;
    total_trades?: number;
  };
  strategyName?: string;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  metrics,
  strategyName = "Combined Strategy"
}) => {
  if (!metrics) {
    return (
      <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Performance Metrics</h3>
        <p className="text-text-muted">Run a backtest to see performance metrics.</p>
      </div>
    );
  }

  const formatPercent = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatNumber = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'N/A';
    return value.toFixed(2);
  };

  const getReturnColor = (value: number | undefined) => {
    if (value === undefined || isNaN(value)) return 'text-text-muted';
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="bg-bg-secondary border border-border-default rounded-lg p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        {strategyName} Performance
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            <span className="text-xs text-text-muted">Total Return</span>
          </div>
          <div className={`text-2xl font-bold ${getReturnColor(metrics.total_return)}`}>
            {formatPercent(metrics.total_return)}
          </div>
        </div>
        
        <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-5 h-5 text-primary-400" />
            <span className="text-xs text-text-muted">Sharpe Ratio</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {formatNumber(metrics.sharpe_ratio)}
          </div>
        </div>
        
        <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-5 h-5 text-red-400" />
            <span className="text-xs text-text-muted">Max Drawdown</span>
          </div>
          <div className="text-2xl font-bold text-red-400">
            {formatPercent(metrics.max_drawdown)}
          </div>
        </div>
        
        <div className="bg-bg-tertiary border border-border-default rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-primary-400" />
            <span className="text-xs text-text-muted">Win Rate</span>
          </div>
          <div className="text-2xl font-bold text-text-primary">
            {formatPercent(metrics.win_rate)}
          </div>
          {metrics.total_trades !== undefined && (
            <div className="text-xs text-text-muted mt-1">
              {metrics.total_trades} trades
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

