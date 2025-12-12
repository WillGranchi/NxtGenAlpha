/**
 * Simplified mobile-friendly metrics display
 * Shows key metrics with expand option to see more
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import type { BacktestMetrics } from '../../services/api';

interface MobileMetricsProps {
  metrics: BacktestMetrics;
  className?: string;
}

export const MobileMetrics: React.FC<MobileMetricsProps> = ({
  metrics,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Key metrics to show by default
  const keyMetrics = [
    { label: 'Total Return', value: metrics.total_return, format: (v: number) => `${(v * 100).toFixed(2)}%`, icon: TrendingUp },
    { label: 'Final Value', value: metrics.final_portfolio_value, format: (v: number) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign },
    { label: 'Sharpe Ratio', value: metrics.sharpe_ratio, format: (v: number) => v.toFixed(2), icon: BarChart3 },
    { label: 'Max Drawdown', value: metrics.max_drawdown, format: (v: number) => `${(v * 100).toFixed(2)}%`, icon: TrendingDown },
  ];

  // Additional metrics
  const additionalMetrics = [
    { label: 'CAGR', value: metrics.cagr, format: (v: number) => `${(v * 100).toFixed(2)}%` },
    { label: 'Win Rate', value: metrics.win_rate, format: (v: number) => `${(v * 100).toFixed(1)}%` },
    { label: 'Profit Factor', value: metrics.profit_factor, format: (v: number) => v.toFixed(2) },
    { label: 'Sortino Ratio', value: metrics.sortino_ratio, format: (v: number) => v.toFixed(2) },
    { label: 'Calmar Ratio', value: metrics.calmar_ratio, format: (v: number) => v.toFixed(2) },
    { label: 'Total Trades', value: metrics.total_trades, format: (v: number) => v.toString() },
    { label: 'Average Trade', value: metrics.avg_trade_return, format: (v: number) => `${(v * 100).toFixed(2)}%` },
  ];

  return (
    <div className={`bg-bg-secondary rounded-lg border border-border-default ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border-default">
        <h3 className="text-lg font-semibold text-text-primary">Performance Metrics</h3>
      </div>

      {/* Key Metrics Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {keyMetrics.map((metric, index) => {
            const Icon = metric.icon;
            const isPositive = metric.value >= 0;
            return (
              <div
                key={index}
                className="bg-bg-tertiary rounded-lg p-3 border border-border-default"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${isPositive ? 'text-success-500' : 'text-danger-500'}`} />
                  <span className="text-xs text-text-muted">{metric.label}</span>
                </div>
                <div className={`text-lg font-bold ${isPositive ? 'text-success-500' : 'text-danger-500'}`}>
                  {metric.format(metric.value)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Expandable Additional Metrics */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border-default pt-4">
          <div className="grid grid-cols-2 gap-3">
            {additionalMetrics
              .filter(metric => metric.value !== undefined && metric.value !== null)
              .map((metric, index) => (
                <div
                  key={index}
                  className="bg-bg-tertiary rounded-lg p-3 border border-border-default"
                >
                  <div className="text-xs text-text-muted mb-1">{metric.label}</div>
                  <div className="text-base font-semibold text-text-primary">
                    {metric.format(metric.value as number)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Expand/Collapse Button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary transition-colors touch-manipulation"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-5 h-5" />
              <span className="text-sm font-medium">Show Less</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-5 h-5" />
              <span className="text-sm font-medium">Show More Metrics</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

